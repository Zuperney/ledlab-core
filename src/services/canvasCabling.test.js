// canvasCabling.test.js — a corrente atravessando telas no canvas do processador.
import { describe, it, expect } from "vitest";
import { canvasCells, snakeCells, canvasPorts, portBboxPx } from "./canvasCabling.js";
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
