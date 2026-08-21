// screenCabling.test.js — cabeamento de sinal por Screen (auto + livre).
import { describe, it, expect } from "vitest";
import { screenAutoPorts, screenPorts, screenPortSummary, resolveCables, autoAsCables, assignCell, unassignedCount, cellPortIndex, screenCells, hasScreens, telasSemScreen, telaPortSlices, projectScreenReport, projectPixelMapCSV, projectAcCabos, neighborCell, screenGrid, screenPixelMapRows, linhasDeCorte } from "./screenCabling.js";

const gabTira = { resX: "128", resY: "256", pwrMax: "200", fp: "0.9", conector: "PowerCON Azul/Branco" };
const gabImag = { resX: "192", resY: "192", pwrMax: "150", fp: "0.9", conector: "PowerCON Azul/Branco" };
const mk = (id, gab, cols, rows, nome) => ({ id, gabinete: gab, cols, rows, nome: nome || id });
const telas = [
  mk("t1", gabTira, 1, 3, "Tira 1"), mk("t2", gabTira, 1, 3, "Tira 2"),
  mk("central", gabTira, 10, 3, "Central"), mk("imag", gabImag, 6, 3, "IMAG"),
];

// Screen do "sistema tiras": 2 tiras + Central, encostadas (14 col × 3 lin de 128×256)
const scTiras = { id: "s1", nome: "Tiras", telaIds: ["t1", "t2", "central"],
  pos: { t1: { x: 0, y: 0 }, t2: { x: 128, y: 0 }, central: { x: 256, y: 0 } }, sinal: { rule: "px", strategy: "auto" } };
// Screen de 1 IMAG (18 gab de 192×192)
const scImag = { id: "s2", nome: "IMAG", telaIds: ["imag"], pos: { imag: { x: 0, y: 0 } }, sinal: { rule: "px", strategy: "auto" } };

describe("screenAutoPorts — a corrente atravessa as telas da Screen", () => {
  it("as 2 tiras + Central viram portas que cruzam telas (mesmo modelo)", () => {
    const ports = screenAutoPorts(scTiras, telas);
    const total = ports.reduce((n, p) => n + p.length, 0);
    expect(total).toBe(36); // 2×3 + 30
    // budget 128×256=32.768 px → 655.360/32.768 = 20 gab/porta → 36 em 2 portas de 18
    expect(ports.map((p) => p.length)).toEqual([18, 18]);
    expect(ports.some((p) => new Set(p.map((c) => c.telaId)).size > 1)).toBe(true); // cruza
  });

  it("cada porta só encadeia gabinetes do mesmo modelo", () => {
    const ports = screenAutoPorts({ ...scTiras, telaIds: ["t1", "imag"], pos: { t1: { x: 0, y: 0 }, imag: { x: 0, y: 768 } } }, telas);
    for (const p of ports) expect(new Set(p.map((c) => c.model)).size).toBe(1);
  });

  it("routing/corner da Screen mudam o início da serpentina", () => {
    const bl = screenAutoPorts({ ...scImag, sinal: { rule: "px", strategy: "auto", corner: "bl" } }, telas)[0][0];
    const tr = screenAutoPorts({ ...scImag, sinal: { rule: "px", strategy: "auto", corner: "tr" } }, telas)[0][0];
    expect(bl).not.toEqual({ c: tr.c, r: tr.r }); // canto diferente, início diferente
  });
});

describe("screenPortSummary — capacidade e telas percorridas", () => {
  it("IMAG de 18 gab estoura a porta (663.552 > 655.360) — mostra, não bloqueia", () => {
    // 1 porta livre com os 18 gab (a gambiarra)
    const cables = autoAsCables(scImag, telas).flat(); // 18 refs num cabo só? autoAsCables dá 1 porta (18<=20... na verdade budget imag)
    // budget IMAG: 192×192=36.864 → 655.360/36.864 = 17 → auto daria 18 em 2 portas
    const livre = { ...scImag, sinal: { strategy: "livre", cables: [cables.map((c) => ({ telaId: c.telaId, c: c.c, r: c.r }))] } };
    const [p] = screenPortSummary(livre, telas);
    expect(p.count).toBe(18);
    expect(p.pct).toBe(101); // 663.552 / 655.360
    expect(p.over).toBe(true);
  });

  it("marca a porta que cruza telas", () => {
    const s = screenPortSummary(scTiras, telas);
    expect(s.some((p) => p.cruza)).toBe(true);
  });

  // OVERCLOCK: o excedente esperado do ceil sai como `oc` (laranja, escolha),
  // nunca como `over` (vermelho, estouro) — e o % real continua visível.
  it("overclock no auto: IMAG de 18 fecha em 1 porta, marcada oc (não over)", () => {
    // budget IMAG 192×192: floor(17,77) = 17 → 2 portas; ceil = 18 → 1 porta
    const s = { ...scImag, sinal: { ...scImag.sinal, overclock: true } };
    expect(screenAutoPorts(scImag, telas).length).toBe(2);
    expect(screenAutoPorts(s, telas).length).toBe(1);
    const [p] = screenPortSummary(s, telas);
    expect(p).toMatchObject({ count: 18, pct: 101, oc: true, over: false });
  });

  it("sem o toggle, a mesma porta cheia continua estouro vermelho (teste acima)", () => {
    const cables = autoAsCables(scImag, telas).flat();
    const livre = { ...scImag, sinal: { strategy: "livre", cables: [cables.map((c) => ({ telaId: c.telaId, c: c.c, r: c.r }))] } };
    const [p] = screenPortSummary(livre, telas);
    expect(p.over).toBe(true);
    expect(p.oc).toBeFalsy();
  });

  it("modo livre além do orçamento overclocado continua over", () => {
    // IMAG maior (6×4 = 24 gab): orçamento overclocado = 18 → cabo de 19 estoura de verdade
    const imag2 = mk("imag2", gabImag, 6, 4, "IMAG 2");
    const sc = { id: "s3", nome: "X", telaIds: ["imag2"], pos: { imag2: { x: 0, y: 0 } },
      sinal: { strategy: "livre", overclock: true, cables: [Array.from({ length: 19 }, (_, i) => ({ telaId: "imag2", c: i % 6, r: Math.floor(i / 6) }))] } };
    const [p] = screenPortSummary(sc, [...telas, imag2]);
    expect(p.count).toBe(19);
    expect(p.over).toBe(true);
    expect(p.oc).toBe(false);
  });
});

describe("link único entre telas (serpentina tela-a-tela)", () => {
  it("no sistema tiras, no máximo 1 porta cruza entre telas", () => {
    const s = screenPortSummary(scTiras, telas);
    expect(s.filter((p) => p.cruza).length).toBeLessThanOrEqual(1);
  });

  it("régua de ÁREA: bloco nunca atravessa o vão — nem cabo cruzando, nem % engolindo o vão", () => {
    // 2 telas 4×6 do mesmo modelo, empilhadas com VÃO vertical (o caso do print:
    // portas cruzavam "Tela 7 → SIDE RIGHT 01" e 18 gab marcava % MAIOR que 24 gab)
    const tA = mk("a", gabTira, 4, 6, "A"), tB = mk("b", gabTira, 4, 6, "B");
    const sc = { id: "sv", nome: "V", telaIds: ["a", "b"], pos: { a: { x: 0, y: 0 }, b: { x: 0, y: 3000 } },
      sinal: { rule: "area", strategy: "coluna" } }; // coluna = pior caso (bloco varava as duas telas)
    const s = screenPortSummary(sc, [tA, tB]);
    expect(s.some((p) => p.cruza)).toBe(false); // nenhum cabo cruza o vão
    // mesma contagem de gabinetes → mesmo % (o vão não é cobrado em porta nenhuma)
    const porCount = new Map();
    for (const p of s) {
      if (porCount.has(p.count)) expect(p.pct).toBe(porCount.get(p.count));
      porCount.set(p.count, p.pct);
    }
    expect(s.reduce((n, p) => n + p.count, 0)).toBe(48); // cobertura total
  });

  it("régua de ÁREA: telas ENCOSTADAS continuam um painel só (blocos podem dividir)", () => {
    const tA = mk("a", gabTira, 4, 6, "A"), tB = mk("b", gabTira, 4, 6, "B");
    const enc = { id: "se", nome: "E", telaIds: ["a", "b"], pos: { a: { x: 0, y: 0 }, b: { x: 512, y: 0 } },
      sinal: { rule: "area", strategy: "linha" } };
    const s = screenPortSummary(enc, [tA, tB]);
    expect(s.reduce((n, p) => n + p.count, 0)).toBe(48);
    expect(s.some((p) => p.cruza)).toBe(true); // linha atravessa as duas — sem vão, sem custo
  });

  it("telas afastadas: a corrente completa uma tela e cruza o vão UMA vez", () => {
    const tA = mk("a", gabTira, 5, 2, "A"), tB = mk("b", gabTira, 5, 2, "B");
    const sc = { id: "sx", nome: "X", telaIds: ["a", "b"], pos: { a: { x: 0, y: 0 }, b: { x: 5000, y: 0 } }, sinal: { rule: "px", strategy: "auto" } };
    const seqIds = screenAutoPorts(sc, [tA, tB]).flat().map((c) => c.telaId);
    expect(seqIds.length).toBe(20);
    // a→a…a→b…b: exatamente 1 transição de tela na corrente inteira
    expect(seqIds.filter((id, i) => i && id !== seqIds[i - 1]).length).toBe(1);
    expect(seqIds[0]).toBe("a"); // começa na tela mais à esquerda (corner bl)
  });
});

describe("modo LIVRE", () => {
  it("resolveCables ignora referência de tela que saiu da Screen", () => {
    const s = { ...scImag, sinal: { strategy: "livre", cables: [[{ telaId: "imag", c: 0, r: 0 }, { telaId: "sumiu", c: 9, r: 9 }]] } };
    expect(resolveCables(s, telas)[0].length).toBe(1); // só o que existe
  });

  it("screenPorts segue o modo: livre usa os cabos desenhados", () => {
    const s = { ...scImag, sinal: { strategy: "livre", cables: [[{ telaId: "imag", c: 0, r: 0 }]] } };
    expect(screenPorts(s, telas).length).toBe(1);
    expect(screenPorts(s, telas)[0].length).toBe(1);
  });

  it("assignCell: põe no cabo ativo e tira dos outros (1 gab = 1 cabo)", () => {
    let cables = [[], []];
    const cell = { telaId: "imag", c: 2, r: 1 };
    cables = assignCell(cables, 0, cell);
    expect(cables[0]).toEqual([{ telaId: "imag", c: 2, r: 1 }]);
    cables = assignCell(cables, 1, cell); // move pro cabo 1
    expect(cables[0]).toEqual([]);
    expect(cables[1]).toEqual([{ telaId: "imag", c: 2, r: 1 }]);
  });

  it("assignCell: clicar de novo no cabo ativo REMOVE (toggle)", () => {
    let cables = [[{ telaId: "imag", c: 0, r: 0 }]];
    cables = assignCell(cables, 0, { telaId: "imag", c: 0, r: 0 });
    expect(cables[0]).toEqual([]);
  });

  it("unassignedCount: quantos gabinetes ainda não têm cabo", () => {
    const s = { ...scImag, sinal: { strategy: "livre", cables: [[{ telaId: "imag", c: 0, r: 0 }]] } };
    expect(unassignedCount(s, telas)).toBe(17); // 18 - 1
  });
});

describe("cellPortIndex", () => {
  it("mapeia cada gabinete pro índice da sua porta", () => {
    const ports = screenAutoPorts(scTiras, telas);
    const idx = cellPortIndex(ports);
    const cells = screenCells(scTiras, telas);
    for (const c of cells) expect(idx[`${c.telaId}:${c.c},${c.r}`]).toBeGreaterThanOrEqual(0);
    expect(Object.keys(idx).length).toBe(36);
  });
});

// ── nível de projeto (Relatório / Test Card / CSV) ──
describe("hasScreens / telasSemScreen", () => {
  it("hasScreens só é true com Screen que tem tela", () => {
    expect(hasScreens({ screens: [] })).toBe(false);
    expect(hasScreens({ screens: [{ telaIds: [] }] })).toBe(false);
    expect(hasScreens({ telas, screens: [{ telaIds: ["t1"] }] })).toBe(true); // precisa da tela EXISTIR (LLC-11)
  });
  it("telasSemScreen lista as telas fora de qualquer Screen", () => {
    const proj = { telas, screens: [{ id: "s1", telaIds: ["t1"], pos: {} }] };
    expect(telasSemScreen(proj).map((t) => t.id)).toEqual(["t2", "central", "imag"]);
  });
});

describe("telaPortSlices — número real por Screen, com fallback legado", () => {
  it("tela numa Screen: número da porta é o da Screen (1..N por Screen)", () => {
    const proj = { telas, screens: [scTiras] };
    const slices = telaPortSlices(proj, "central");
    expect(slices.length).toBeGreaterThan(0);
    for (const s of slices) { expect(s.n).toBeGreaterThanOrEqual(1); expect(s.cells.every((c) => c.telaId === "central")).toBe(true); }
  });
  it("tela fora de Screen: cai no legado por tela (numeração local)", () => {
    const proj = { telas, screens: [] };
    const slices = telaPortSlices(proj, "central");
    expect(slices[0].n).toBe(1); // reinicia local
    expect(slices.flatMap((s) => s.cells).length).toBe(30); // cobre a tela toda
  });
  it("tela inexistente → vazio", () => {
    expect(telaPortSlices({ telas, screens: [] }, "sumiu")).toEqual([]);
  });
});

describe("cota da porta na régua de ÁREA — o vão fora, salvo declarado", () => {
  // Screen de área com as 2 tiras afastadas 1.024 px e UM cabo desenhado cobrindo
  // as duas: é o caso do palco com painéis separados no mesmo sistema.
  const cabo = [
    ...Array.from({ length: 3 }, (_, r) => ({ telaId: "t1", c: 0, r })),
    ...Array.from({ length: 3 }, (_, r) => ({ telaId: "t2", c: 0, r })),
  ];
  const base = { id: "s9", nome: "Palco", telaIds: ["t1", "t2"], pos: { t1: { x: 0, y: 0 }, t2: { x: 1152, y: 0 } } };
  const semDeclarar = { ...base, sinal: { rule: "area", strategy: "livre", cables: [cabo] } };
  const declarado = { ...base, sinal: { rule: "area", strategy: "livre", vaoConta: true, cables: [cabo] } };

  it("padrão: a % é a dos painéis reais — o vão não come cota", () => {
    const [p] = screenPortSummary(semDeclarar, telas);
    expect(p.count).toBe(6);
    // 6 gab × 32.768 px = 196.608 de 655.360 → 30%
    expect(p.pct).toBe(30);
    expect(p.over).toBe(false);
  });

  it("declarado: o retângulo único cobra o vão e a porta estoura", () => {
    const [p] = screenPortSummary(declarado, telas);
    expect(p.count).toBe(6); // os mesmos 6 gabinetes
    expect(p.pct).toBe(150); // 1.280 × 768 = 983.040 px de retângulo
    expect(p.over).toBe(true);
  });

  it("cruzaVao marca só a porta em que a escolha muda o número", () => {
    expect(screenPortSummary(semDeclarar, telas)[0].cruzaVao).toBe(true);
    // porta dentro de UM painel: a escolha não muda nada
    const soT1 = { ...base, sinal: { rule: "area", strategy: "livre", cables: [cabo.slice(0, 3)] } };
    expect(screenPortSummary(soT1, telas)[0].cruzaVao).toBe(false);
  });

  it("régua de PIXELS ignora a discussão: gabinete real é gabinete real", () => {
    const px = { ...base, sinal: { rule: "px", strategy: "livre", cables: [cabo] } };
    const pxDecl = { ...base, sinal: { rule: "px", strategy: "livre", vaoConta: true, cables: [cabo] } };
    expect(screenPortSummary(px, telas)[0].pct).toBe(30);
    expect(screenPortSummary(pxDecl, telas)[0].pct).toBe(30);
    expect(screenPortSummary(px, telas)[0].cruzaVao).toBe(false);
  });
});

describe("screenGrid — contagem real de gabinetes (o vão não conta)", () => {
  it("Screen encostada de um modelo: grade exata, gabs = soma das telas", () => {
    // 12 col × 3 lin de 128×256 = 36 gabinetes, retângulo cheio
    expect(screenGrid(scTiras, telas)).toEqual({ gabs: 36, cols: 12, rows: 3, partes: 0, exato: true });
  });

  it("VÃO entre telas: gabs continua o real e a grade sai de cena", () => {
    // Central afastada 1.280 px da tira: a bbox vira 2.560 px = 20 colunas (60
    // gabinetes), mas existem 33. Sem `exato`, o caderno não imprime a grade.
    const comVao = { ...scTiras, telaIds: ["t1", "central"], pos: { t1: { x: 0, y: 0 }, central: { x: 1280, y: 0 } } };
    const g = screenGrid(comVao, telas);
    expect(g.gabs).toBe(33); // 1×3 + 10×3 — os gabinetes que existem
    expect(g.cols * g.rows).toBe(60); // o que a bbox sugeriria (o bug antigo)
    expect(g.exato).toBe(false);
  });

  it("modelos diferentes: nunca exato (a grade não tem um gabinete só)", () => {
    const mista = { id: "m", nome: "Mista", telaIds: ["t1", "imag"], pos: { t1: { x: 0, y: 0 }, imag: { x: 128, y: 0 } }, sinal: {} };
    const g = screenGrid(mista, telas);
    expect(g.gabs).toBe(21); // 3 + 18
    expect(g.exato).toBe(false);
  });

  it("Screen sem tela: 0 gabinetes, sem grade", () => {
    expect(screenGrid({ id: "v", telaIds: [], pos: {} }, telas)).toEqual({ gabs: 0, cols: 0, rows: 0, partes: 0, exato: false });
  });
});

// ⚠️ MESMA RÉGUA DA GRADE, agora no número mais visível do caderno: o vão que o
// técnico deixa no canvas é referência de montagem, não pixel. Contá-lo fazia a
// "Resolução da Screen" anunciar processamento que não existe.
describe("projectScreenReport — resolução SEM o vão, disposição à parte", () => {
  const comVao = { ...scTiras, telaIds: ["t1", "central"], pos: { t1: { x: 0, y: 0 }, central: { x: 1280, y: 0 } } };

  it("a resolução conta só o que é LED; a caixa continua disponível, com outro nome", () => {
    const [r] = projectScreenReport({ telas, screens: [comVao] });
    expect(r.res).toMatchObject({ w: 1408, h: 768, temVao: true }); // 128 + 1280
    expect(r.size).toEqual({ w: 2560, h: 768 }); // a bbox — o número antigo
  });

  it("Screen encostada: resolução e disposição batem, e não há vão pra declarar", () => {
    const [r] = projectScreenReport({ telas, screens: [scTiras] });
    expect(r.res.temVao).toBe(false);
    expect([r.res.w, r.res.h]).toEqual([r.size.w, r.size.h]);
  });
});

describe("projectScreenReport", () => {
  it("uma entrada por Screen com tela, com tamanho e portas 1..N por Screen", () => {
    const proj = { telas, screens: [scTiras, scImag, { id: "vazia", nome: "Vazia", telaIds: [], pos: {} }] };
    const rep = projectScreenReport(proj);
    expect(rep.map((r) => r.nome)).toEqual(["Tiras", "IMAG"]); // a vazia fica de fora
    expect(rep[0].ports[0].n).toBe(1); // cada Screen começa em 1
    expect(rep[0].size.w).toBeGreaterThan(0);
    // a contagem de gabinetes vem pronta pros dois renderizadores do caderno
    expect(rep[0].grid.gabs).toBe(36);
    expect(rep[0].grid.gabs).toBe(rep[0].ports.reduce((n, p) => n + p.count, 0));
  });
});

describe("projectPixelMapCSV", () => {
  const proj = { name: "P", telas, screens: [scTiras, scImag] };
  it("cabeçalho pt-BR com coluna Screen; Porta reinicia por Screen", () => {
    const csv = projectPixelMapCSV(proj);
    const linhas = csv.split("\r\n");
    expect(linhas[0]).toBe("Screen;Porta;Ordem;Tela;Coluna;Linha;X (px);Y (px);Largura;Altura");
    expect(linhas.length).toBe(1 + 36 + 18); // 2 tiras+central (36) + imag (18)
    const screens = new Set(linhas.slice(1).map((l) => l.split(";")[0]));
    expect(screens.has("Tiras") && screens.has("IMAG")).toBe(true);
  });
  it("`only` limita a uma Screen", () => {
    const csv = projectPixelMapCSV(proj, "row-tb-lr", scImag.id);
    expect(csv.split("\r\n").length).toBe(1 + 18);
  });
});

// ── AC por Screen (mesma mecânica do sinal, orçamento por corrente) ──
describe("AC por Screen", () => {
  it("screenPorts kind=ac cobre todos os gabinetes da Screen", () => {
    const seen = new Set();
    for (const p of screenPorts(scTiras, telas, "ac")) for (const c of p) seen.add(`${c.telaId}:${c.c},${c.r}`);
    expect(seen.size).toBe(36);
  });

  it("screenPortSummary kind=ac traz carga em A, % e flag over", () => {
    const s = screenPortSummary(scTiras, telas, "ac");
    expect(s.length).toBeGreaterThan(0);
    for (const p of s) {
      expect(typeof p.load).toBe("number");
      expect(p.load).toBeGreaterThan(0);
      expect(typeof p.pct).toBe("number");
      expect(typeof p.over).toBe("boolean");
    }
  });

  it("projectAcCabos traz loadTip (típico) ao lado do load (pico), sem mudar o load", () => {
    // brilho 100% + conteúdo 100% → típico = pico → loadTip = load (extremo que fecha a fórmula)
    const proj = { telas, screens: [scTiras, scImag], config: { vk: "380_tri", brilho: 1, conteudo: 1 } };
    const cabos = projectAcCabos(proj);
    expect(cabos.length).toBeGreaterThan(0);
    for (const c of cabos) expect(c.loadTip).toBeCloseTo(c.load, 6);
    // brilho menor → típico estritamente menor que o pico
    const menor = projectAcCabos({ ...proj, config: { vk: "380_tri", brilho: 0.5, conteudo: 0.33 } });
    for (const c of menor) expect(c.loadTip).toBeLessThan(c.load);
  });

  it("projectAcCabos legado (sem Screens) também traz loadTip com numeração global", () => {
    const proj = { telas, config: { brilho: 0.5, conteudo: 0.33 } };
    const cabos = projectAcCabos(proj);
    expect(cabos.length).toBeGreaterThan(0);
    expect(cabos.map((c) => c.n)).toEqual(cabos.map((_, i) => i + 1)); // 1..N global
    for (const c of cabos) {
      expect(c.loadTip).toBeGreaterThan(0);
      expect(c.loadTip).toBeLessThan(c.load);
    }
  });

  it("AC e SINAL podem dar contagens diferentes (orçamentos diferentes)", () => {
    const ac = screenPorts(scTiras, telas, "ac").length;
    const sig = screenPorts(scTiras, telas, "sinal").length;
    expect(ac).toBeGreaterThanOrEqual(1);
    expect(sig).toBeGreaterThanOrEqual(1);
  });

  it("'Atrelar ao sinal': cada cabo de AC cabe dentro de uma porta de sinal", () => {
    const scAtrel = { ...scTiras, ac: { strategy: "sinal" } };
    const sigKeys = screenPorts(scTiras, telas, "sinal").map((p) => new Set(p.map((c) => `${c.telaId}:${c.c},${c.r}`)));
    const acPorts = screenPorts(scAtrel, telas, "ac");
    for (const cab of acPorts) {
      const ks = cab.map((c) => `${c.telaId}:${c.c},${c.r}`);
      expect(sigKeys.some((set) => ks.every((k) => set.has(k)))).toBe(true); // subconjunto de alguma porta de sinal
    }
    // cobre tudo
    const seen = new Set(acPorts.flat().map((c) => `${c.telaId}:${c.c},${c.r}`));
    expect(seen.size).toBe(36);
  });

  it("livre de AC é independente do livre de sinal (screen.ac.cables ≠ screen.sinal.cables)", () => {
    const s = { ...scImag, sinal: { strategy: "livre", cables: [[{ telaId: "imag", c: 0, r: 0 }]] }, ac: { strategy: "livre", cables: [[{ telaId: "imag", c: 5, r: 2 }]] } };
    expect(screenPorts(s, telas, "sinal")[0][0]).toMatchObject({ c: 0, r: 0 });
    expect(screenPorts(s, telas, "ac")[0][0]).toMatchObject({ c: 5, r: 2 });
  });

  it("telaPortSlices kind=ac usa as portas de AC da Screen", () => {
    const proj = { telas, screens: [scTiras] };
    const slices = telaPortSlices(proj, "central", "ac");
    expect(slices.length).toBeGreaterThan(0);
    for (const s of slices) expect(s.cells.every((c) => c.telaId === "central")).toBe(true);
  });
});

// ── régua (px × área/retângulo) + estratégias (linha/coluna/área) ──
describe("régua e estratégia de sinal", () => {
  it("régua padrão (sem campo) é ÁREA/retângulo, não px", () => {
    // scTiras é px; um clone sem cfg cai no padrão área
    const s = { ...scTiras, sinal: {} };
    // área ainda cobre todos os 36, em blocos ≤ budget
    const ports = screenAutoPorts(s, telas);
    const seen = new Set(ports.flat().map((c) => `${c.telaId}:${c.c},${c.r}`));
    expect(seen.size).toBe(36);
  });

  it("estratégia área/linha/coluna cobrem tudo, sem repetir, respeitando o budget", () => {
    for (const strategy of ["area", "linha", "coluna"]) {
      const s = { ...scTiras, sinal: { rule: "area", strategy } };
      const ports = screenAutoPorts(s, telas);
      const seen = new Set();
      for (const p of ports) { expect(p.length).toBeLessThanOrEqual(20); for (const c of p) seen.add(`${c.telaId}:${c.c},${c.r}`); }
      expect(seen.size).toBe(36);
    }
  });

  it("px conta gabinete real; área cobra o retângulo (buraco pago) — L de 3 telas", () => {
    // duas tiras nas pontas + uma no meio DESLOCADA pra baixo: cria um buraco no topo
    const s = {
      id: "L", nome: "L", telaIds: ["t1", "t2", "central"],
      pos: { t1: { x: 0, y: 0 }, central: { x: 128, y: 512 }, t2: { x: 1408, y: 0 } },
    };
    const px = screenPortSummary({ ...s, sinal: { rule: "px", strategy: "auto" } }, telas);
    const area = screenPortSummary({ ...s, sinal: { rule: "area", strategy: "area" } }, telas);
    // a régua px nunca passa de 100% aqui (poucos gabinetes); a de área pode inflar
    // por causa do retângulo que engole o vão — o pico dela é >= o pico do px
    expect(Math.max(...area.map((p) => p.pct))).toBeGreaterThanOrEqual(Math.max(...px.map((p) => p.pct)));
  });

  it("bits: 10-bit corta o orçamento pela metade (mais portas)", () => {
    const p8 = screenAutoPorts({ ...scTiras, sinal: { rule: "px", strategy: "auto", bits: 8 } }, telas).length;
    const p10 = screenAutoPorts({ ...scTiras, sinal: { rule: "px", strategy: "auto", bits: 10 } }, telas).length;
    expect(p10).toBeGreaterThanOrEqual(p8);
  });
});

describe("telaIds órfãos (tela excluída sem limpar a Screen) — LLC-11", () => {
  // cenário do caderno real: Screen só com ids de telas que não existem mais,
  // e as telas do projeto todas fora de qualquer Screen
  const scOrfa = { id: "sx", nome: "Screen 2", telaIds: ["morta1", "morta2"], pos: {}, sinal: {} };
  const project = { telas, screens: [scOrfa] };

  it("hasScreens ignora Screen sem tela existente → cai no modo legado", () => {
    expect(hasScreens(project)).toBe(false);
  });

  it("projectScreenReport não lista a Screen 0×0", () => {
    expect(projectScreenReport(project, "sinal")).toEqual([]);
  });

  it("Screen com MISTURA de vivo e órfão continua valendo (só os vivos contam)", () => {
    const scMista = { id: "sm", nome: "Mista", telaIds: ["morta1", "imag"], pos: { imag: { x: 0, y: 0 } }, sinal: {} };
    const p2 = { telas, screens: [scMista] };
    expect(hasScreens(p2)).toBe(true);
    const rep = projectScreenReport(p2, "sinal");
    expect(rep.length).toBe(1);
    expect(rep[0].size).toEqual({ w: 6 * 192, h: 3 * 192 });
  });
});


describe("neighborCell — as setas do teclado no modo livre", () => {
  const cells = screenCells(scTiras, telas);

  it("anda dentro da tela (linha seguinte na vertical)", () => {
    const n = neighborCell(cells, { telaId: "t1", c: 0, r: 0 }, "down");
    expect(n).toMatchObject({ telaId: "t1", c: 0, r: 1 });
  });

  it("atravessa pra tela ENCOSTADA à direita (t1 → t2, geometria e não c/r)", () => {
    const n = neighborCell(cells, { telaId: "t1", c: 0, r: 0 }, "right");
    expect(n).toMatchObject({ telaId: "t2", c: 0, r: 0 });
  });

  it("borda do painel → null (não dá a volta)", () => {
    expect(neighborCell(cells, { telaId: "t1", c: 0, r: 0 }, "left")).toBeNull();
  });

  it("célula que não existe na Screen → null", () => {
    expect(neighborCell(cells, { telaId: "zz", c: 0, r: 0 }, "down")).toBeNull();
  });
});

// ══ PARTIR A TELA DENTRO DA SCREEN ═══════════════════════════
// Às vezes a tela é dividida DENTRO DO PROCESSAMENTO: a parede é uma só no palco,
// mas o sinal entra por dois caminhos. O corte declara onde está o limite — e a
// promessa é uma só: nenhuma porta atravessa o corte.
describe("o corte parte a tela dentro da Screen", () => {
  // Central sozinha: 10 col × 3 lin de 128×256. Budget = 20 gab/porta, então
  // sem corte os 30 gabinetes saem em 2 portas (15 + 15) e a serpentina passeia
  // pela tela inteira.
  const so = { id: "sc", nome: "Central", telaIds: ["central"], pos: { central: { x: 0, y: 0 } }, sinal: { rule: "px", strategy: "auto" } };
  const cortada = (x = [4]) => ({ ...so, cortes: { central: { x, y: [] } } });
  const ladoDe = (cell, corte) => (cell.c < corte ? "esq" : "dir");

  it("NENHUMA porta atravessa o corte — régua de px", () => {
    const ports = screenAutoPorts(cortada(), telas);
    expect(ports.reduce((n, p) => n + p.length, 0)).toBe(30); // não perde gabinete
    for (const p of ports) expect(new Set(p.map((c) => ladoDe(c, 4))).size).toBe(1);
  });

  it("NENHUMA porta atravessa o corte — régua de área", () => {
    const area = { ...cortada(), sinal: { rule: "area", strategy: "area" } };
    const ports = screenAutoPorts(area, telas);
    expect(ports.reduce((n, p) => n + p.length, 0)).toBe(30);
    for (const p of ports) expect(new Set(p.map((c) => ladoDe(c, 4))).size).toBe(1);
  });

  // é o caso real: a parede não se divide ao meio, se divide onde a porta acaba
  it("corte desigual devolve as duas partes com as contagens certas", () => {
    const cells = screenCells(cortada([7]), telas);
    const porParte = new Map();
    for (const c of cells) porParte.set(c.parteN, (porParte.get(c.parteN) || 0) + 1);
    expect([...porParte.entries()].sort()).toEqual([[1, 21], [2, 9]]); // 7×3 e 3×3
  });

  it("corte na horizontal também parte, e a numeração é em ordem de leitura", () => {
    const emCruz = { ...so, cortes: { central: { x: [5], y: [1] } } };
    const cells = screenCells(emCruz, telas);
    const parteEm = (c, r) => cells.find((x) => x.c === c && x.r === r).parteN;
    expect([parteEm(0, 0), parteEm(9, 0), parteEm(0, 2), parteEm(9, 2)]).toEqual([1, 2, 3, 4]);
  });

  // ⚠️ decisão do dono: energia não respeita limite de processador
  it("o AC IGNORA o corte — os circuitos continuam como antes", () => {
    const comAc = { ...so, ac: { strategy: "area" } };
    const antes = screenAutoPorts(comAc, telas, "ac");
    const depois = screenAutoPorts({ ...comAc, cortes: { central: { x: [4], y: [] } } }, telas, "ac");
    const forma = (ps) => ps.map((p) => p.map((c) => `${c.c},${c.r}`).join("|"));
    expect(forma(depois)).toEqual(forma(antes));
  });

  // o teste que garante que nada mudou pra quem não usa a feature
  it("Screen SEM corte devolve exatamente as portas de sempre", () => {
    const forma = (ps) => ps.map((p) => p.map((c) => `${c.telaId}:${c.c},${c.r}`).join("|"));
    expect(forma(screenAutoPorts({ ...scTiras, cortes: {} }, telas))).toEqual(forma(screenAutoPorts(scTiras, telas)));
    expect(screenCells(scTiras, telas).every((c) => c.parteN === 0)).toBe(true);
  });

  it("a porta é nomeada pela PARTE, não pela tela", () => {
    const [p1] = screenPortSummary(cortada(), telas);
    expect(p1.telas[0]).toMatch(/^Central · P[12]$/);
    // sem corte, o nome puro — nenhuma folha muda em projeto que não parte tela
    expect(screenPortSummary(so, telas)[0].telas).toEqual(["Central"]);
  });

  it("o mapa de pixels nomeia a parte na coluna Tela", () => {
    expect(new Set(screenPixelMapRows(cortada(), telas).map((r) => r.tela)))
      .toEqual(new Set(["Central · P1", "Central · P2"]));
    expect(new Set(screenPixelMapRows(so, telas).map((r) => r.tela))).toEqual(new Set(["Central"]));
  });

  it("o caderno sabe em quantas partes a Screen está dividida", () => {
    expect(screenGrid(cortada(), telas).partes).toBe(2);
    expect(screenGrid(so, telas).partes).toBe(0); // sem corte, nem menciona
  });

  // avisa, não bloqueia — mesma postura do vão e da peça sobreposta da Estrutura
  it("cabo do modo LIVRE atravessando o corte é MARCADO, não apagado", () => {
    const cabo = [{ telaId: "central", c: 3, r: 0 }, { telaId: "central", c: 4, r: 0 }];
    const livre = { ...cortada(), sinal: { rule: "px", strategy: "livre", cables: [cabo] } };
    const [p] = screenPortSummary(livre, telas);
    expect(p.count).toBe(2); // continua existindo
    expect(p.cruzaParte).toBe(true);
    expect(p.cruza).toBe(false); // não cruza TELA — cruza parte, que é outra coisa
  });

  it("as linhas de corte saem em coordenada de canvas, pro desenho", () => {
    expect(linhasDeCorte(cortada(), telas)).toEqual([
      { x1: 512, y1: 0, x2: 512, y2: 768 }, // 4 col × 128 px, altura da tela
    ]);
    expect(linhasDeCorte(so, telas)).toEqual([]);
  });
});
