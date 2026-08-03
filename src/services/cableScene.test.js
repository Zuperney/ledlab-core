import { describe, it, expect } from "vitest";
import { tint, routePoints, arrowPath, ROUTE, ENTRY, END, TINT_K } from "./cableScene.js";

describe("tint — pastel pdfmake-safe", () => {
  it("mistura com branco por componente (valor exato)", () => {
    expect(tint("#000000", 0.75)).toBe("#bfbfbf"); // 0 + 255×0,75 = 191,25 → 191
    expect(tint("#0f766e")).toBe("#c3dddb"); // teal da PALETTE com k padrão
  });

  it("saída SEMPRE hex de 6 dígitos — o motor do pdfmake não aceita #rrggbbaa", () => {
    for (const c of ["#000", "#ffffff", "#0f766e", "#EA580C", "nonsense", "", null]) {
      expect(tint(c)).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it("aceita hex curto e maiúsculo", () => {
    expect(tint("#000")).toBe(tint("#000000"));
    expect(tint("#EA580C")).toBe(tint("#ea580c"));
  });

  it("cor base CLARA mistura menos — a região não pode sumir no papel", () => {
    // amarelo claro (luma > 180): k cai pra 0,45 → fe/f7/bf, não quase-branco
    expect(tint("#fef08a")).toBe("#fef7bf");
  });

  it("hex inválido cai em cinza neutro, nunca propaga lixo pro SVG", () => {
    expect(tint("banana")).toBe("#d4d4d8");
    expect(tint(undefined)).toBe("#d4d4d8");
  });

  it("cores da cena são hex de 6 dígitos", () => {
    for (const c of [ROUTE, ENTRY, END]) expect(c).toMatch(/^#[0-9a-f]{6}$/);
    expect(TINT_K).toBeGreaterThan(0);
    expect(TINT_K).toBeLessThan(1);
  });
});

describe("routePoints — serpentina na ordem elétrica", () => {
  it("centros das células, ordem preservada (port[0] = entrada)", () => {
    const port = [
      { x: 0, y: 40, w: 40, h: 40 },
      { x: 40, y: 40, w: 40, h: 40 },
      { x: 40, y: 0, w: 40, h: 40 },
    ];
    expect(routePoints(port)).toEqual([[20, 60], [60, 60], [60, 20]]);
  });

  it("cabo vazio → sem pontos", () => {
    expect(routePoints([])).toEqual([]);
  });
});

describe("arrowPath — seta absoluta no ponto médio (sem transform/rotate)", () => {
  it("apontando pra direita", () => {
    expect(arrowPath([0, 0], [10, 0], 5)).toBe("M10 0 L1.5 3.1 L1.5 -3.1 Z");
  });

  it("apontando pra esquerda", () => {
    expect(arrowPath([10, 0], [0, 0], 5)).toBe("M0 0 L8.5 -3.1 L8.5 3.1 Z");
  });

  it("apontando pra baixo", () => {
    expect(arrowPath([0, 0], [0, 10], 5)).toBe("M0 10 L-3.1 1.5 L3.1 1.5 Z");
  });

  it("apontando pra cima", () => {
    expect(arrowPath([0, 10], [0, 0], 5)).toBe("M0 0 L3.1 8.5 L-3.1 8.5 Z");
  });

  it("segmento degenerado (a === b) → vazio, não NaN", () => {
    expect(arrowPath([5, 5], [5, 5], 4)).toBe("");
  });
});
