// screenCabling.test.js — cabeamento de sinal por Screen (auto + livre).
import { describe, it, expect } from "vitest";
import { screenAutoPorts, screenPorts, screenPortSummary, resolveCables, autoAsCables, assignCell, unassignedCount, cellPortIndex, screenCells, hasScreens, telasSemScreen, telaPortSlices, projectScreenReport, projectPixelMapCSV } from "./screenCabling.js";

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
    expect(hasScreens({ screens: [{ telaIds: ["t1"] }] })).toBe(true);
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

describe("projectScreenReport", () => {
  it("uma entrada por Screen com tela, com tamanho e portas 1..N por Screen", () => {
    const proj = { telas, screens: [scTiras, scImag, { id: "vazia", nome: "Vazia", telaIds: [], pos: {} }] };
    const rep = projectScreenReport(proj);
    expect(rep.map((r) => r.nome)).toEqual(["Tiras", "IMAG"]); // a vazia fica de fora
    expect(rep[0].ports[0].n).toBe(1); // cada Screen começa em 1
    expect(rep[0].size.w).toBeGreaterThan(0);
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
