// services/cabling.test.js — roteamento de cabos: disposição "Área" e
// balanceamento de fase do AC atrelado ao sinal.
import { describe, it, expect } from "vitest";
import { buildAuto, balancedChunks, cableMeta, setAcMargin } from "./cabling.js";

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
