// canvasCabling.test.js — a corrente atravessando telas no canvas do processador.
import { describe, it, expect } from "vitest";
import { canvasCells, snakeCells, snakeCellsPorTela, clusterTelas, canvasPorts, portBboxPx, portAreaPx, telaRects, panelIds, orderCanvasPorts } from "./canvasCabling.js";
import { packByModel } from "./layout.js";

const gabTira = { resX: "128", resY: "256", pwrMax: "200", fp: "0.9", conector: "PowerCON Azul/Branco" };
const gabImag = { resX: "192", resY: "192", pwrMax: "150", fp: "0.9", conector: "PowerCON Azul/Branco" };
const mk = (id, gabinete, cols, rows) => ({ id, gabinete, cols, rows, cabling: { sinal: { rule: "px" } } });

// projeto real "Colação de Grau" (VX1000, 10 portas físicas), na ordem da lista dele
const colacao = [
  mk("imagD", gabImag, 6, 3), mk("imagE", gabImag, 6, 3),
  mk("t4", gabTira, 1, 3), mk("t3", gabTira, 1, 3), mk("t2", gabTira, 1, 3), mk("t1", gabTira, 1, 3),
  mk("central", gabTira, 10, 3),
];
const dimOf = (t) => ({ w: t.cols * parseFloat(t.gabinete.resX), h: t.rows * parseFloat(t.gabinete.resY) });
const posColacao = packByModel(colacao.map((t) => ({ id: t.id, ...dimOf(t), model: `${t.gabinete.resX}x${t.gabinete.resY}` }))).pos;

describe("canvasCells", () => {
  it("põe cada gabinete na coordenada do canvas, não da tela", () => {
    const cells = canvasCells(colacao, posColacao);
    expect(cells.length).toBe(2 * 18 + 4 * 3 + 30); // 78 gabinetes
    // a Central começa em x=512 (depois das 4 tiras) e y=576 (faixa 2)
    const c0 = cells.find((c) => c.telaId === "central" && c.c === 0 && c.r === 0);
    expect(c0).toMatchObject({ x: 512, y: 576, w: 128, h: 256 });
  });

  it("tela sem posição no canvas fica de fora (canvas é opcional)", () => {
    expect(canvasCells(colacao, {}).length).toBe(0);
    expect(canvasCells(colacao, { t1: { x: 0, y: 0 } }).length).toBe(3);
  });
});

describe("snakeCells — serpentina atravessando telas", () => {
  // grade 2×2 de células de 100×100, em (0,0)
  const grid = [
    { x: 0, y: 0 }, { x: 100, y: 0 },
    { x: 0, y: 100 }, { x: 100, y: 100 },
  ].map((c, i) => ({ ...c, w: 100, h: 100, id: i }));

  it("bl + updown: começa embaixo-esquerda, sobe a 1ª coluna e desce a 2ª", () => {
    expect(snakeCells(grid, "updown", "bl").map((c) => [c.x, c.y]))
      .toEqual([[0, 100], [0, 0], [100, 0], [100, 100]]);
  });

  it("tr + updown: começa em cima-direita", () => {
    expect(snakeCells(grid, "updown", "tr")[0]).toMatchObject({ x: 100, y: 0 });
  });

  it("zigzag varre linha a linha", () => {
    expect(snakeCells(grid, "zigzag", "bl").map((c) => [c.x, c.y]))
      .toEqual([[0, 100], [100, 100], [100, 0], [0, 0]]);
  });

  it("cobre tudo sem repetir, em qualquer canto/roteamento", () => {
    for (const routing of ["updown", "zigzag"])
      for (const corner of ["bl", "br", "tl", "tr"]) {
        const out = snakeCells(canvasCells(colacao, posColacao), routing, corner);
        expect(out.length).toBe(78);
        expect(new Set(out.map((c) => `${c.telaId}:${c.c},${c.r}`)).size).toBe(78);
      }
  });

  it("a corrente ATRAVESSA telas: as 4 tiras + Central viram uma cadeia só", () => {
    const tiras = canvasCells(colacao, posColacao).filter((c) => c.model === "128x256");
    const chain = snakeCells(tiras, "updown", "bl");
    expect(chain.length).toBe(42); // 4 tiras (12) + Central (30)
    // 14 colunas contíguas de x=0 a x=1664, sem pular
    const xs = [...new Set(chain.map((c) => c.x))].sort((a, b) => a - b);
    expect(xs.length).toBe(14);
    expect(xs).toEqual(Array.from({ length: 14 }, (_, i) => i * 128));
    // e a cadeia passa por mais de uma tela
    expect(new Set(chain.slice(0, 6).map((c) => c.telaId)).size).toBeGreaterThan(1);
  });
});

describe("snakeCellsPorTela — o link entre telas é no máximo 1", () => {
  // 2 telas 2×2 (células de 100px) afastadas 1000px no x
  const telaCells = (telaId, x0) => [
    { x: x0, y: 0 }, { x: x0 + 100, y: 0 }, { x: x0, y: 100 }, { x: x0 + 100, y: 100 },
  ].map((c, i) => ({ ...c, w: 100, h: 100, telaId, c: i % 2, r: Math.floor(i / 2) }));
  const duas = [...telaCells("a", 0), ...telaCells("b", 1000)];

  it("completa uma tela inteira antes de pular pra próxima (1 transição)", () => {
    const seq = snakeCellsPorTela(duas, "updown", "bl").map((c) => c.telaId);
    expect(seq).toEqual(["a", "a", "a", "a", "b", "b", "b", "b"]);
    // a varredura por faixas (snakeCells puro) alternaria — é o que a regra corrige
  });

  it("a ordem das telas segue o canto de início (tr começa pela direita)", () => {
    expect(snakeCellsPorTela(duas, "updown", "tr")[0].telaId).toBe("b");
  });

  it("dentro de cada tela, a serpentina é a de sempre", () => {
    const a = snakeCellsPorTela(duas, "updown", "bl").slice(0, 4);
    expect(a.map((c) => [c.x, c.y])).toEqual(snakeCells(telaCells("a", 0), "updown", "bl").map((c) => [c.x, c.y]));
  });

  it("zigzag ordena telas pelo eixo Y (empilhadas na vertical)", () => {
    const cima = telaCells("cima", 0);
    const baixo = telaCells("baixo", 0).map((c) => ({ ...c, y: c.y + 2000 }));
    const seq = snakeCellsPorTela([...cima, ...baixo], "zigzag", "tl").map((c) => c.telaId);
    expect(seq).toEqual(["cima", "cima", "cima", "cima", "baixo", "baixo", "baixo", "baixo"]);
    expect(snakeCellsPorTela([...cima, ...baixo], "zigzag", "bl")[0].telaId).toBe("baixo");
  });

  it("tela única cai na serpentina normal", () => {
    const uma = telaCells("a", 0);
    expect(snakeCellsPorTela(uma, "updown", "bl")).toEqual(snakeCells(uma, "updown", "bl"));
  });
});

describe("clusterTelas — telas encostadas são um painel; vão separa", () => {
  const telaCells = (telaId, x0, y0 = 0) => [
    { x: x0, y: y0 }, { x: x0 + 100, y: y0 }, { x: x0, y: y0 + 100 }, { x: x0 + 100, y: y0 + 100 },
  ].map((c) => ({ ...c, w: 100, h: 100, telaId }));

  it("telas encostadas (vão zero) viram um aglomerado só", () => {
    const clusters = clusterTelas([...telaCells("a", 0), ...telaCells("b", 200)]);
    expect(clusters.length).toBe(1);
    expect(clusters[0].length).toBe(8);
  });

  it("vão entre telas separa os aglomerados", () => {
    const clusters = clusterTelas([...telaCells("a", 0), ...telaCells("b", 1000)]);
    expect(clusters.length).toBe(2);
    for (const c of clusters) expect(new Set(c.map((x) => x.telaId)).size).toBe(1);
  });

  it("encadeia por transitividade: a encosta em b, b encosta em c → um painel", () => {
    const cells = [...telaCells("a", 0), ...telaCells("b", 200), ...telaCells("c", 400), ...telaCells("longe", 5000)];
    const clusters = clusterTelas(cells).map((c) => new Set(c.map((x) => x.telaId)));
    expect(clusters.length).toBe(2);
    expect(clusters.find((s) => s.size === 3)).toBeTruthy(); // a+b+c
  });

  it("vão vertical também separa (telas empilhadas afastadas)", () => {
    expect(clusterTelas([...telaCells("cima", 0, 0), ...telaCells("baixo", 0, 2000)]).length).toBe(2);
    expect(clusterTelas([...telaCells("cima", 0, 0), ...telaCells("baixo", 0, 200)]).length).toBe(1);
  });
});

describe("canvasPorts — o ganho real da Colação de Grau", () => {
  it("cada porta só encadeia gabinetes do MESMO modelo", () => {
    for (const port of canvasPorts(colacao, posColacao))
      expect(new Set(port.map((c) => c.model)).size).toBe(1);
  });

  it("cobre todos os 78 gabinetes, sem repetir e sem passar do budget", () => {
    const ports = canvasPorts(colacao, posColacao);
    const seen = new Set();
    for (const p of ports) {
      expect(p.length).toBeLessThanOrEqual(20); // maior budget dos dois modelos
      for (const c of p) seen.add(`${c.telaId}:${c.c},${c.r}`);
    }
    expect(seen.size).toBe(78);
  });

  it("a corrente cruzando telas fecha a Colação em 6 portas", () => {
    // IMAGs 36/17=3 · tiras+Central 42/20=3 → 6 (isoladas seriam 10)
    expect(canvasPorts(colacao, posColacao).length).toBe(6);
  });

  it("as tiras deixam de comer uma porta cada: 42 gab do modelo em 3 portas de 14", () => {
    const tiraPorts = canvasPorts(colacao, posColacao).filter((p) => p[0].model === "128x256");
    expect(tiraPorts.map((p) => p.length)).toEqual([14, 14, 14]); // balanceado
  });

  it("sem canvas não inventa porta nenhuma", () => {
    expect(canvasPorts(colacao, {})).toEqual([]);
    expect(canvasPorts([], {})).toEqual([]);
  });
});

describe("orderCanvasPorts — numeração zigzag vs serpente no canvas", () => {
  // 9 "portas" de 1 gabinete numa grade 3×3 de 100px (ordem embaralhada de propósito)
  const ports = [];
  for (let r = 2; r >= 0; r--) for (let c = 2; c >= 0; c--) ports.push([{ x: c * 100, y: r * 100 }]);
  const order = (scheme) => orderCanvasPorts(ports, scheme).map((p) => [p[0].x / 100, p[0].y / 100]);

  it("zigzag numera toda linha no mesmo sentido", () => {
    expect(order("row-tb-lr")).toEqual([
      [0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2],
    ]);
  });

  it("serpente inverte a cada linha (contínuo)", () => {
    expect(order("row-tb-lr-serp")).toEqual([
      [0, 0], [1, 0], [2, 0], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2],
    ]);
  });
});

describe("portBboxPx — a régua de área medida no canvas", () => {
  it("faixa cheia: retângulo = pixels reais (é sólida, não tem buraco)", () => {
    const tiras = canvasCells(colacao, posColacao).filter((c) => c.model === "128x256");
    expect(portBboxPx(tiras)).toBe(1792 * 768); // 14 col × 128 por 3 lin × 256
    expect(portBboxPx(tiras)).toBe(42 * 128 * 256); // = pixels reais
  });

  it("o buraco é cobrado: duas tiras separadas pela Central engolem o meio", () => {
    const cells = canvasCells(colacao, posColacao);
    const t4 = cells.filter((c) => c.telaId === "t4"); // x=0
    const central = cells.filter((c) => c.telaId === "central"); // x=512..1664
    const bbox = portBboxPx([...t4, ...central.slice(-3)]); // t4 + última coluna da Central
    expect(bbox).toBe(1792 * 768); // engoliu tudo entre elas
    expect(bbox).toBeGreaterThan(6 * 128 * 256); // muito acima dos 6 gabinetes reais
  });
});

describe("panelIds — o painel físico (encostadas, direta ou indiretamente)", () => {
  const box = (x, w) => ({ x1: x, y1: 0, x2: x + w, y2: 768 });

  it("A—B—C encostadas são UM painel, mesmo A e C não se tocando", () => {
    const p = panelIds(new Map([["a", box(0, 128)], ["b", box(128, 1024)], ["c", box(1152, 128)]]));
    expect(p.get("a")).toBe(p.get("c"));
    expect(p.get("a")).toBe(p.get("b"));
  });

  it("vão no meio parte em dois painéis", () => {
    const p = panelIds(new Map([["a", box(0, 128)], ["b", box(1152, 128)]]));
    expect(p.get("a")).not.toBe(p.get("b"));
  });

  it("mapa vazio não quebra", () => {
    expect(panelIds(new Map()).size).toBe(0);
    expect(panelIds(null).size).toBe(0);
  });
});

describe("portAreaPx — o VÃO só entra na cota se a Screen declarar", () => {
  // duas telas 128×256 (1×3) afastadas 1.024 px: painéis separados, não um painel
  const gab = { resX: "128", resY: "256" };
  const tiraA = { id: "a", cols: 1, rows: 3, gabinete: gab };
  const tiraB = { id: "b", cols: 1, rows: 3, gabinete: gab };
  const comVao = canvasCells([tiraA, tiraB], { a: { x: 0, y: 0 }, b: { x: 1152, y: 0 } });
  const reais = 6 * 128 * 256;

  it("padrão: um retângulo por painel encostado — o vazio do palco não paga", () => {
    expect(portAreaPx(comVao)).toBe(reais); // 2 tiras sólidas, nada além delas
    expect(portBboxPx(comVao)).toBe(1280 * 768); // o retângulo único cobraria o vão
    expect(portAreaPx(comVao)).toBeLessThan(portBboxPx(comVao));
  });

  it("declarado (retângulo único da controladora): o vão volta pra cota", () => {
    expect(portAreaPx(comVao, true)).toBe(portBboxPx(comVao));
  });

  it("painel contínuo não muda: buraco dentro do retângulo continua pago nos dois modos", () => {
    // com as caixas REAIS da Screen (é o que screenPortSummary passa): t4 e Central
    // se encostam, então é UM painel — o miolo que o cabo pulou é buraco, não vão
    const cells = canvasCells(colacao, posColacao);
    const paineis = panelIds(telaRects(cells));
    const t4 = cells.filter((c) => c.telaId === "t4");
    const central = cells.filter((c) => c.telaId === "central"); // encostada na t4
    const porta = [...t4, ...central.slice(-3)];
    expect(portAreaPx(porta, false, paineis)).toBe(portBboxPx(porta)); // regra do retângulo, não vão
    expect(portAreaPx(porta, true, paineis)).toBe(portBboxPx(porta));
  });

  it("sem o mapa de painéis, cada tela responde por si (o fallback)", () => {
    const cells = canvasCells(colacao, posColacao);
    const t4 = cells.filter((c) => c.telaId === "t4");
    const central = cells.filter((c) => c.telaId === "central");
    const porta = [...t4, ...central.slice(-3)];
    // cada tela vira seu próprio retângulo — por isso quem mede vão passa os painéis
    expect(portAreaPx(porta)).toBeLessThan(portBboxPx(porta));
  });

  it("porta vazia = 0 nos dois modos", () => {
    expect(portAreaPx([])).toBe(0);
    expect(portAreaPx(undefined, true)).toBe(0);
  });
});
