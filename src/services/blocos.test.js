// blocos.test.js — a tela feita de blocos (gabinetes mistos) e a tela deitada.
import { describe, it, expect } from "vitest";
import { blocosDe, temBlocos, ehMista, celulasDaTela, dimTela, medidaFisica, contagemPorModelo, modelKeyGab } from "./blocos.js";
import { screenRollup, aggregateElectrical } from "./projectCalc.js";
import { canvasCells, dimOf, modelKey } from "./canvasCabling.js";
import { screenAutoPorts, screenPortSummary, resolveCables, assignCell, unassignedCount, screenCells } from "./screenCabling.js";
import { cortesDe } from "./screens.js";

// os dois gabinetes do caso real: 50×100 e 50×50, mesmo pitch
const g50x100 = { nome: "50x100", resX: "128", resY: "256", dimW: "500", dimH: "1000", peso: "12", pwrMax: "200", fp: "0.9", conector: "PowerCON Azul/Branco" };
const g50x50 = { nome: "50x50", resX: "128", resY: "128", dimW: "500", dimH: "500", peso: "7", pwrMax: "100", fp: "0.9", conector: "PowerCON Azul/Branco" };

// 4 × 50×100 em cima, 4 × 50×50 embaixo (a 1000 mm do topo)
const mista = {
  id: "m", nome: "Mista",
  blocos: [
    { id: "a", gabinete: g50x100, cols: 4, rows: 1, x: 0, y: 0 },
    { id: "b", gabinete: g50x50, cols: 4, rows: 1, x: 0, y: 1000 },
  ],
};
const legada = { id: "l", nome: "Legada", gabinete: g50x100, cols: 3, rows: 2 };

describe("blocosDe — tela legada é um bloco só", () => {
  it("monta o bloco a partir de gabinete/cols/rows, na origem", () => {
    expect(temBlocos(legada)).toBe(false);
    expect(blocosDe(legada)).toEqual([{ id: "b0", gabinete: g50x100, cols: 3, rows: 2, x: 0, y: 0 }]);
  });

  it("as células da legada são a grade de sempre (sem campo de bloco no canvas)", () => {
    const cells = canvasCells([legada], { l: { x: 10, y: 20 } });
    expect(cells).toHaveLength(6);
    expect(cells[0]).toMatchObject({ telaId: "l", c: 0, r: 0, x: 10, y: 20, w: 128, h: 256, model: "128x256" });
    expect(cells[0]).not.toHaveProperty("bloco");
    expect(dimOf(legada)).toEqual({ w: 384, h: 512 });
  });
});

describe("tela de blocos mistos", () => {
  it("reconhece a mistura e o modelo da tela junta os dois", () => {
    expect(temBlocos(mista)).toBe(true);
    expect(ehMista(mista)).toBe(true);
    expect(modelKey(mista)).toBe("128x256+128x128");
  });

  it("posição em mm vira px pelo pitch do gabinete (1000 mm = 256 px)", () => {
    const cells = celulasDaTela(mista);
    expect(cells).toHaveLength(8);
    const baixo = cells.filter((c) => c.bloco === 1);
    expect(baixo[0]).toMatchObject({ c: 0, r: 0, x: 0, y: 256, w: 128, h: 128, model: "128x128" });
    expect(dimTela(mista)).toEqual({ w: 512, h: 384 });
  });

  it("medida física e área somam os blocos", () => {
    expect(medidaFisica(mista)).toEqual({ w: 2000, h: 1500, area_mm2: 4 * 500 * 1000 + 4 * 500 * 500 });
    expect(contagemPorModelo(mista).map((m) => [m.model, m.gab])).toEqual([["128x256", 4], ["128x128", 4]]);
  });

  it("roll-up soma gabinete, peso, potência e px reais bloco a bloco", () => {
    const r = screenRollup(mista);
    expect(r.gab).toBe(8);
    expect(r.peso_kg).toBe(4 * 12 + 4 * 7);
    expect(r.pwrMax_w).toBe(4 * 200 + 4 * 100);
    expect(r.pixels).toEqual({ largura: 512, altura: 384, total: 4 * 128 * 256 + 4 * 128 * 128 });
    expect(r.dim.largura_m).toBe(2);
    expect(r.dim.altura_m).toBe(1.5);
    expect(r.dim.area_m2).toBeCloseTo(3);
  });

  it("a elétrica soma os blocos com a potência de cada gabinete", () => {
    const el = aggregateElectrical({ telas: [mista] }, { vk: "220_tri", brilho: 0.7, conteudo: 0.33 });
    expect(el.W).toBe(4 * 200 + 4 * 100);
    expect(el.perTela[0].gab).toBe(8);
  });

  it("um bloco só na lista usa o bloco, não os campos legados", () => {
    const um = { id: "u", blocos: [{ gabinete: g50x50, cols: 2, rows: 2, x: 0, y: 0 }] };
    expect(dimTela(um)).toEqual({ w: 256, h: 256 });
    expect(screenRollup(um).gab).toBe(4);
  });
});

describe("tela deitada (montagem girada 90° anti-horário)", () => {
  // tira da Boticário: 1 × 5 de 50×100 de pé = 0,5 m × 5 m; deitada = 5 m × 0,5 m
  const tira = { id: "t", nome: "Tira", gabinete: g50x100, cols: 1, rows: 5, deitada: true };

  it("a medida física gira", () => {
    const r = screenRollup(tira);
    expect(r.dim.largura_m).toBe(5);
    expect(r.dim.altura_m).toBe(0.5);
    expect(medidaFisica(tira)).toMatchObject({ w: 5000, h: 500 });
  });

  it("o pixel NÃO gira: o processador vê a tira de pé", () => {
    expect(screenRollup(tira).pixels).toMatchObject({ largura: 128, altura: 1280 });
    expect(dimOf(tira)).toEqual({ w: 128, h: 1280 });
  });
});

describe("cabeamento de Screen com tela mista", () => {
  const screen = { id: "s", nome: "S", telaIds: ["m"], pos: { m: { x: 0, y: 0 } }, sinal: { rule: "px", strategy: "auto" } };

  it("nenhuma porta mistura modelos e todo gabinete entra", () => {
    const ports = screenAutoPorts(screen, [mista]);
    expect(ports.every((p) => new Set(p.map((c) => c.model)).size === 1)).toBe(true);
    expect(ports.reduce((n, p) => n + p.length, 0)).toBe(8);
  });

  it("o orçamento da porta é o do gabinete do bloco (px reais)", () => {
    const sum = screenPortSummary(screen, [mista]);
    // 4 × 128×256 = 131.072 px de 655.360 = 20%; 4 × 128×128 = 65.536 = 10%
    expect(sum.map((p) => p.pct).sort((a, b) => a - b)).toEqual([10, 20]);
    expect(sum.every((p) => !p.over)).toBe(true);
  });

  it("no modo livre o bloco faz parte da referência do gabinete", () => {
    const cells = screenCells(screen, [mista]);
    const cima = cells.find((c) => c.bloco === 0 && c.c === 0);
    const baixo = cells.find((c) => c.bloco === 1 && c.c === 0);
    let cables = assignCell([[]], 0, cima);
    cables = assignCell(cables, 0, baixo);
    expect(cables[0]).toEqual([{ telaId: "m", c: 0, r: 0 }, { telaId: "m", c: 0, r: 0, bloco: 1 }]);
    const livre = { ...screen, sinal: { strategy: "livre", cables } };
    expect(resolveCables(livre, [mista])[0].map((c) => c.model)).toEqual(["128x256", "128x128"]);
    expect(unassignedCount(livre, [mista])).toBe(6);
  });

  it("corte por coluna não vale em tela de vários blocos (o Split novo substitui)", () => {
    expect(cortesDe({ cortes: { m: { x: [2], y: [] } } }, mista)).toBeNull();
    expect(cortesDe({ cortes: { l: { x: [1], y: [] } } }, legada)).toEqual({ x: [1], y: [] });
  });
});

it("modelKeyGab usa 128 quando falta resolução (mesma regra do desenho)", () => {
  expect(modelKeyGab({})).toBe("128x128");
});
