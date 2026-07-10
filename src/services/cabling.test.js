// services/cabling.test.js — roteamento de cabos, foco na disposição "Área".
import { describe, it, expect } from "vitest";
import { buildAuto } from "./cabling.js";

const NB = "row-tb-lr";

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
