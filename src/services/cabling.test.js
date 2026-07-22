// services/cabling.test.js — roteamento de cabos: réguas de porta (pixels/área),
// disposição "Área" e balanceamento de fase do AC atrelado ao sinal.
import { describe, it, expect } from "vitest";
import { buildAuto, balancedChunks, cableMeta, cablePorts, portOffset, bboxArea, serpentine, setAcMargin } from "./cabling.js";

const NB = "row-tb-lr";
const seq = (n) => Array.from({ length: n }, (_, i) => i);

describe("cabling — disposição Área", () => {
  it("painel estreito 3×6 com budget 26 → 1 bloco de 18 (não 15+3)", () => {
    const ports = buildAuto(3, 6, "area", 26, "updown", NB);
    expect(ports.length).toBe(1);
    expect(ports[0].length).toBe(18);
  });

  it("painel largo 6×3 com budget 26 → 1 bloco de 18", () => {
    const ports = buildAuto(6, 3, "area", 26, "updown", NB);
    expect(ports.length).toBe(1);
    expect(ports[0].length).toBe(18);
  });

  it("cobre todos os gabinetes, sem repetir, respeitando o budget", () => {
    for (const [cols, rows, budget] of [[3, 6, 26], [10, 10, 26], [6, 3, 26], [8, 8, 17], [5, 5, 26], [12, 9, 26]]) {
      const ports = buildAuto(cols, rows, "area", budget, "updown", NB);
      const seen = new Set();
      for (const p of ports) {
        expect(p.length).toBeLessThanOrEqual(budget);
        for (const cell of p) seen.add(`${cell.c},${cell.r}`);
      }
      expect(seen.size).toBe(cols * rows);
    }
  });
});

describe("cabling — numeração serpente (boustrophedon)", () => {
  // 9 portas de 1 gabinete (budget 1) → a ordem de numeração = ordem das células
  const order = (scheme) => buildAuto(3, 3, "linha", 1, "updown", scheme).map((p) => [p[0].c, p[0].r]);

  it("zigzag (padrão): toda linha vai no mesmo sentido (esq→dir)", () => {
    expect(order("row-tb-lr")).toEqual([
      [0, 0], [1, 0], [2, 0],
      [0, 1], [1, 1], [2, 1],
      [0, 2], [1, 2], [2, 2],
    ]);
  });

  it("serpente por linha: inverte o sentido a cada faixa (sem salto)", () => {
    expect(order("row-tb-lr-serp")).toEqual([
      [0, 0], [1, 0], [2, 0],
      [2, 1], [1, 1], [0, 1],
      [0, 2], [1, 2], [2, 2],
    ]);
  });

  it("serpente por coluna: inverte a cada coluna", () => {
    expect(order("col-lr-tb-serp")).toEqual([
      [0, 0], [0, 1], [0, 2],
      [1, 2], [1, 1], [1, 0],
      [2, 0], [2, 1], [2, 2],
    ]);
  });

  it("respeita o canto: row-bt-rl-serp começa embaixo-direita e sobe em U contínuo", () => {
    expect(order("row-bt-rl-serp")).toEqual([
      [2, 2], [1, 2], [0, 2], // base: dir→esq
      [0, 1], [1, 1], [2, 1], // meio: esq→dir (inverteu)
      [2, 0], [1, 0], [0, 0], // topo: dir→esq
    ]);
  });

  it("serpente só REORDENA — mesmo conjunto de portas do zigzag", () => {
    const z = order("row-tb-lr").map(String).sort();
    const s = order("row-tb-lr-serp").map(String).sort();
    expect(s).toEqual(z);
  });

  it("as 8 combinações (× zigzag/serpente) cobrem a grade inteira sem repetir", () => {
    const SCHEMES = ["col-lr-bt", "col-lr-tb", "col-rl-bt", "col-rl-tb", "row-bt-lr", "row-tb-lr", "row-bt-rl", "row-tb-rl"];
    for (const s of SCHEMES)
      for (const suf of ["", "-serp"]) {
        const o = order(s + suf).map(String);
        expect(o.length).toBe(9);
        expect(new Set(o).size).toBe(9); // 9 gabinetes, cobertura total, sem repetição
      }
  });
});

describe("cabling — régua de PIXELS (portas de dados reais)", () => {
  // gabinete 128×128 = 16.384 px → 8-bit: 655.360/16.384 = 40 gab; 10-bit: 327.680/16.384 = 20
  const gab128 = { resX: 128, resY: 128 };
  const telaPx = (sinal = {}) => ({ cols: 8, rows: 6, gabinete: gab128, cabling: { sinal: { rule: "px", ...sinal } } });

  it("10-bit corta a capacidade pela metade", () => {
    expect(cableMeta(telaPx()).sinalBudget).toBe(40);
    expect(cableMeta(telaPx({ bits: 10 })).sinalBudget).toBe(20);
  });

  it("escala com o refresh também em 10-bit (30 Hz dobra)", () => {
    expect(cableMeta(telaPx({ bits: 10, hz: 30 })).sinalBudget).toBe(40);
    expect(cableMeta(telaPx({ hz: 120 })).sinalBudget).toBe(20); // 8-bit @120Hz = metade
  });

  it("tela SEM o campo rule continua na régua de área (legado preservado)", () => {
    const legada = { cols: 2, rows: 2, gabinete: gab128, cabling: { sinal: { hz: 60 } } };
    expect(cableMeta(legada).sinalRule).toBe("area");
    expect(cableMeta(telaPx()).sinalRule).toBe("px");
  });

  it("px: corta por CONTAGEM balanceada, cobre a grade toda e ignora o bounding box", () => {
    // gab 196×196 = 38.416 px → budget floor(655.360/38.416) = 17; 8×6 = 48 gab → 3 cabos de 16
    const tela = { cols: 8, rows: 6, gabinete: { resX: 196, resY: 196 }, cabling: { sinal: { rule: "px" } } };
    expect(cableMeta(tela).sinalBudget).toBe(17);
    const ports = cablePorts(tela, "sinal", NB);
    expect(ports.map((p) => p.length)).toEqual([16, 16, 16]); // balanceado, ≤ budget
    const seen = new Set();
    ports.flat().forEach((cell) => seen.add(`${cell.c},${cell.r}`));
    expect(seen.size).toBe(48); // cobertura total, sem repetição
    // o retângulo envolvente PODE passar do budget (16 gab em serpentina → bbox 3×6 = 18 > 17):
    // é exatamente o que muda vs. a régua de área — a porta gasta os px reais, não o retângulo.
    expect(ports.some((p) => bboxArea(p) > 17)).toBe(true);
  });

  it("na régua de área o mesmo painel gasta MAIS portas (bbox super-dimensiona)", () => {
    const base = { cols: 8, rows: 6, gabinete: { resX: 196, resY: 196 } };
    const px = cablePorts({ ...base, cabling: { sinal: { rule: "px" } } }, "sinal", NB);
    const area = cablePorts({ ...base, cabling: { sinal: {} } }, "sinal", NB);
    expect(px.length).toBeLessThanOrEqual(area.length);
    expect(px.length).toBe(3);
  });
});

describe("cabling — canto de início da serpentina (Quick Connection do NovaLCT)", () => {
  // grade 3×3: r=0 é o topo (y cresce pra baixo), então r=2 é a base
  const start = (corner, routing = "updown") => serpentine(0, 0, 3, 3, routing, corner)[0];

  it("cada canto começa no gabinete certo (vertical/updown)", () => {
    expect(start("bl")).toEqual({ c: 0, r: 2 }); // inferior-esquerdo
    expect(start("br")).toEqual({ c: 2, r: 2 }); // inferior-direito
    expect(start("tl")).toEqual({ c: 0, r: 0 }); // superior-esquerdo
    expect(start("tr")).toEqual({ c: 2, r: 0 }); // superior-direito
  });

  it("o canto de início vale também no zigzag (horizontal primeiro)", () => {
    expect(start("tr", "zigzag")).toEqual({ c: 2, r: 0 });
    expect(start("bl", "zigzag")).toEqual({ c: 0, r: 2 });
  });

  it("qualquer canto cobre a grade toda, sem repetir", () => {
    for (const corner of ["bl", "br", "tl", "tr"]) {
      const cells = serpentine(0, 0, 4, 3, "updown", corner);
      expect(cells.length).toBe(12);
      expect(new Set(cells.map((c) => `${c.c},${c.r}`)).size).toBe(12);
    }
  });

  it("default 'bl' preserva o comportamento histórico (retrocompatível)", () => {
    expect(serpentine(0, 0, 3, 3, "updown")).toEqual(serpentine(0, 0, 3, 3, "updown", "bl"));
  });

  it("buildAuto propaga o canto: 'tr' começa no topo-direito", () => {
    const ports = buildAuto(3, 3, "area", 999, "updown", NB, "area", "tr");
    expect(ports[0][0]).toEqual({ c: 2, r: 0 });
  });
});

describe("cabling — AC atrelado ao sinal: balanceamento de fase", () => {
  it("25 placas num cabo AC de 22 → 13+12 (não 22+3)", () => {
    expect(balancedChunks(seq(25), 22).map((c) => c.length)).toEqual([13, 12]);
  });

  it("sobra pequena não vira cabo minúsculo: 23/22 → 12+11", () => {
    expect(balancedChunks(seq(23), 22).map((c) => c.length)).toEqual([12, 11]);
  });

  it("cabe em um cabo → 1 segmento só (3/22 → [3], 22/22 → [22])", () => {
    expect(balancedChunks(seq(3), 22).map((c) => c.length)).toEqual([3]);
    expect(balancedChunks(seq(22), 22).map((c) => c.length)).toEqual([22]);
  });

  it("vários cabos ficam equilibrados: 45/22 → 15+15+15, 44/22 → 22+22", () => {
    expect(balancedChunks(seq(45), 22).map((c) => c.length)).toEqual([15, 15, 15]);
    expect(balancedChunks(seq(44), 22).map((c) => c.length)).toEqual([22, 22]);
  });

  it("mantém a ordem, usa o nº mínimo de cabos, equilibra e respeita o budget", () => {
    for (const [L, B] of [[25, 22], [50, 22], [70, 22], [100, 26], [7, 3], [1, 22], [26, 26]]) {
      const chunks = balancedChunks(seq(L), B);
      expect(chunks.length).toBe(Math.ceil(L / B)); // nº mínimo de cabos (igual ao guloso)
      expect(chunks.flat()).toEqual(seq(L)); // ordem preservada, cobertura total, sem repetição
      const sizes = chunks.map((c) => c.length);
      for (const s of sizes) expect(s).toBeLessThanOrEqual(B); // nunca passa do máximo do cabo
      expect(Math.max(...sizes) - Math.min(...sizes)).toBeLessThanOrEqual(1); // equilibrado
    }
  });
});

describe("cabling — margem de segurança do cabo AC (acBudget)", () => {
  // ampCab = 144 / (220 × 0,9) = 0,727 A/gab; conector powerCON 20 A
  const tela = { cols: 1, rows: 1, gabinete: { pwrMax: 144, fp: 0.9, conector: "PowerCON Azul/Branco" } };

  it("sem margem (1) = padrão histórico: floor(20 / 0,727) = 27", () => {
    setAcMargin(1);
    expect(cableMeta(tela).acBudget).toBe(27);
  });

  it("margem 80% reduz o acBudget: floor(16 / 0,727) = 22", () => {
    setAcMargin(0.8);
    expect(cableMeta(tela).acBudget).toBe(22);
    setAcMargin(1); // reset p/ não vazar entre testes
  });

  it("valor fora da faixa volta a 1 (sem margem)", () => {
    setAcMargin(2);
    expect(cableMeta(tela).acBudget).toBe(27);
    setAcMargin(1);
  });
});

// Recorte do projeto real "Colação de Grau" (7 telas, 1 VX1000): 2 IMAGs de
// 192×192 e as tiras/Central de 128×256. Cada tela vira uma ilha que reinicia no
// "cabo 1" — mas na vida real é UMA controladora com portas 1..N.
describe("cabling — numeração global de portas (portOffset)", () => {
  const gabTira = { resX: "128", resY: "256", pwrMax: "200", fp: "0.9", conector: "PowerCON Azul/Branco" };
  const gabImag = { resX: "192", resY: "192", pwrMax: "150", fp: "0.9", conector: "PowerCON Azul/Branco" };
  const mk = (id, gabinete, cols, rows) => ({ id, gabinete, cols, rows, cabling: { sinal: { rule: "px" } } });
  const telas = [
    mk("imagD", gabImag, 6, 3),   // 18 gab · budget 17 → 2 portas
    mk("t1", gabTira, 1, 3),      //  3 gab · budget 20 → 1 porta
    mk("t2", gabTira, 1, 3),      //                    → 1 porta
    mk("central", gabTira, 10, 3), // 30 gab · budget 20 → 2 portas
  ];

  it("cada tela começa onde a anterior parou — sem buraco, sem repetir", () => {
    let n = 0;
    for (const t of telas) {
      expect(portOffset(telas, t.id, "sinal", NB)).toBe(n);
      n += cablePorts(t, "sinal", NB).length;
    }
    expect(n).toBe(6); // o projeto inteiro come 6 portas da VX1000
  });

  it("o IMAG de 18 gab não cabe em 1 porta (655.360 px ÷ 36.864 = 17)", () => {
    expect(cableMeta(telas[0]).sinalBudget).toBe(17);
    expect(cablePorts(telas[0], "sinal", NB).length).toBe(2);
    expect(portOffset(telas, "t1", "sinal", NB)).toBe(2); // logo a Tira 1 é a porta 3
  });

  it("o AC tem numeração própria — circuito não é porta de dados", () => {
    let n = 0;
    for (const t of telas) {
      expect(portOffset(telas, t.id, "ac", NB)).toBe(n);
      n += cablePorts(t, "ac", NB).length;
    }
  });

  it("tela avulsa (Diagramação/Test Card fora de projeto) volta a começar em 1", () => {
    expect(portOffset(telas, "inexistente", "sinal", NB)).toBe(0);
    expect(portOffset([], "t1", "sinal", NB)).toBe(0);
    expect(portOffset(undefined, "t1", "sinal", NB)).toBe(0);
  });
});
