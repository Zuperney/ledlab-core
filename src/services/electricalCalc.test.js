// electricalCalc.test.js — motor elétrico (disjuntor, corrente, divisores, consumo).
// Trava o modelo validado contra datasheets/normas (ver docs + memória de validação).
import { describe, it, expect } from "vitest";
import { calcScreen, pickBreaker, typicalPerTile, pitch, VOLT } from "./electricalCalc.js";

const SQRT3 = Math.sqrt(3);

describe("pickBreaker — 1º padrão IEC ≥ corrente × 1,25", () => {
  it.each([
    [0, 10], [8, 10], [10, 16], [12, 16], [16, 20], [20, 25], [50, 63], [100, 125],
  ])("%i A → disjuntor %i A", (corrente, disj) => {
    expect(pickBreaker(corrente)).toBe(disj);
  });

  it("acima do topo da escada (125 A) cai no fallback 160", () => {
    expect(pickBreaker(101)).toBe(160); // 101 × 1,25 = 126,25 > 125
  });
});

describe("VOLT — divisores de tensão (valores validados; NÃO alterar sem revisão elétrica)", () => {
  it("220: bifásico ÷220, trifásico ÷220√3", () => {
    expect(VOLT["220_bi"].div).toBe(220);
    expect(VOLT["220_tri"].div).toBeCloseTo(220 * SQRT3, 5);
  });

  it("380: mono ÷220, TRI ÷380√3", () => {
    expect(VOLT["380_mono"].div).toBe(220);
    expect(VOLT["380_tri"].div).toBeCloseTo(380 * SQRT3, 5);
  });

  it("380 bifásico ÷440 — painéis 220V F-N balanceados entre 2 fases (S/(2×220)), NÃO carga F-F", () => {
    // ÷440 = 2×220 (distribuição F-N entre 2 fases), coerente com o trifásico
    // ÷380√3 ≈ 3×220. Uma carga fase-fase de 380V daria ÷380 — não é o caso de LED.
    expect(VOLT["380_bi"].div).toBe(440);
    expect(VOLT["380_tri"].div).toBeLessThan(3 * 220); // 658 < 660, mesma família
  });

  it("nº de fases por configuração", () => {
    expect(VOLT["380_mono"].ph).toBe(1);
    expect(VOLT["220_bi"].ph).toBe(2);
    expect(VOLT["380_tri"].ph).toBe(3);
  });
});

describe("calcScreen — W → S → I → disjuntor", () => {
  it("100 tiles × 200W, fp 1, 380 bifásico → 45,5 A, disjuntor 63 A", () => {
    const r = calcScreen({ tiles: 100, pwrPerTile: 200, pf: 1, vk: "380_bi" });
    expect(r.W).toBe(20000);
    expect(r.S).toBe(20000);
    expect(r.kVA).toBe("20.00");
    expect(r.I).toBe(45.5); // 20000 / 440
    expect(r.breaker).toBe(63); // 45,5 × 1,25 = 56,9 → 63
    expect(r.steps).toHaveLength(3);
  });

  it("fator de potência aumenta a corrente aparente (S = W/fp)", () => {
    const r = calcScreen({ tiles: 10, pwrPerTile: 200, pf: 0.8, vk: "220_bi" });
    expect(r.W).toBe(2000);
    expect(r.S).toBe(2500); // 2000 / 0,8
    expect(r.I).toBe(11.4); // 2500 / 220 = 11,36 → 11,4
  });
});

describe("typicalPerTile — modelo Barco (black + (máx−black)×brilho×conteúdo)", () => {
  it("com black informado", () => {
    expect(typicalPerTile(300, 45, 0.7, 0.33)).toBeCloseTo(45 + 255 * 0.7 * 0.33, 3);
  });

  it("sem black → assume 15% do máximo", () => {
    expect(typicalPerTile(300, 0, 0.7, 0.33)).toBeCloseTo(45 + 255 * 0.7 * 0.33, 3);
  });

  it("black inválido (≥ máx) também cai nos 15%", () => {
    expect(typicalPerTile(300, 400, 0.7, 0.33)).toBeCloseTo(45 + 255 * 0.7 * 0.33, 3);
  });

  it("brilho/conteúdo saturam em [0,1]", () => {
    expect(typicalPerTile(300, 45, 2, 0.33)).toBeCloseTo(45 + 255 * 1 * 0.33, 3);
  });

  it("máximo zero/ausente → 0", () => {
    expect(typicalPerTile(0, 50, 0.7, 0.33)).toBe(0);
  });
});

describe("pitch — dimW / resX", () => {
  it("128px em 500mm → 3.91 mm", () => {
    expect(pitch({ resX: "128", dimW: "500" })).toBe("3.91 mm");
  });
  it("dados ausentes → —", () => {
    expect(pitch({ resX: "", dimW: "500" })).toBe("—");
    expect(pitch({})).toBe("—");
  });
});
