// electricalCalc.test.js — motor elétrico (corrente, divisores, consumo).
// Trava o modelo validado contra datasheets/normas (auditoria 30/07/2026: fórmulas
// confirmadas com fontes; o app NÃO sugere disjuntor — decisão do dono).
import { describe, it, expect } from "vitest";
import { calcScreen, typicalPerTile, pitch, VOLT, acTone, voltFull, phaseOf, phaseBalance } from "./electricalCalc.js";

const SQRT3 = Math.sqrt(3);

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

  it("voltFull imprime a tensão + condutores (o label sozinho não carrega a tensão)", () => {
    expect(voltFull(VOLT["220_tri"])).toBe("220 V · Trifásico (F+F+F)");
    expect(voltFull(VOLT["380_tri"])).toBe("380 V · Trifásico (F+F+F+N)");
    expect(voltFull(VOLT["220_bi"])).toBe("220 V · Bifásico (F+F)");
  });
});

describe("phaseOf — rodízio de fases dos cabos AC", () => {
  it("380 tri (F+N): R, S, T, R…", () => {
    const vc = VOLT["380_tri"];
    expect([1, 2, 3, 4, 5, 6].map((n) => phaseOf(n, vc))).toEqual(["R", "S", "T", "R", "S", "T"]);
  });
  it("220 tri: circuito é F+F → rodízio de PARES RS, ST, TR", () => {
    const vc = VOLT["220_tri"];
    expect([1, 2, 3, 4].map((n) => phaseOf(n, vc))).toEqual(["RS", "ST", "TR", "RS"]);
  });
  it("380 bi alterna R, S; mono e 220 bi NÃO têm rodízio", () => {
    expect([1, 2, 3].map((n) => phaseOf(n, VOLT["380_bi"]))).toEqual(["R", "S", "R"]);
    expect(phaseOf(1, VOLT["380_mono"])).toBeNull();
    expect(phaseOf(1, VOLT["220_bi"])).toBeNull();
  });
  it("entrada inválida não explode", () => {
    expect(phaseOf(0, VOLT["380_tri"])).toBeNull();
    expect(phaseOf(1, undefined)).toBeNull();
  });
});

describe("phaseBalance — soma aritmética por fase", () => {
  const cabos = [{ n: 1, load: 10 }, { n: 2, load: 12 }, { n: 3, load: 8 }, { n: 4, load: 10 }];

  it("380 tri: cada cabo numa fase; a 4ª volta pra R", () => {
    const b = phaseBalance(cabos, VOLT["380_tri"]);
    expect(b.temRodizio).toBe(true);
    expect(b.fases).toEqual([
      { fase: "R", cabos: 2, A: 20 },
      { fase: "S", cabos: 1, A: 12 },
      { fase: "T", cabos: 1, A: 8 },
    ]);
  });

  it("220 tri: o PAR conta a corrente nas DUAS fases (leitura conservadora)", () => {
    const b = phaseBalance([{ n: 1, load: 10 }, { n: 2, load: 12 }, { n: 3, load: 8 }], VOLT["220_tri"]);
    // RS=10 · ST=12 · TR=8 → R: 10+8 · S: 10+12 · T: 12+8
    expect(b.fases).toEqual([
      { fase: "R", cabos: 2, A: 18 },
      { fase: "S", cabos: 2, A: 22 },
      { fase: "T", cabos: 2, A: 20 },
    ]);
  });

  it("sem rodízio (mono/220 bi) devolve vazio e temRodizio false", () => {
    expect(phaseBalance(cabos, VOLT["380_mono"])).toEqual({ temRodizio: false, fases: [] });
    expect(phaseBalance(cabos, VOLT["220_bi"])).toEqual({ temRodizio: false, fases: [] });
  });
});

describe("calcScreen — W → S → I", () => {
  it("100 tiles × 200W, fp 1, 380 bifásico → 45,5 A (sem sugestão de disjuntor)", () => {
    const r = calcScreen({ tiles: 100, pwrPerTile: 200, pf: 1, vk: "380_bi" });
    expect(r.W).toBe(20000);
    expect(r.S).toBe(20000);
    expect(r.kVA).toBe("20.00");
    expect(r.I).toBe(45.5); // 20000 / 440
    expect(r.breaker).toBeUndefined(); // app não sugere disjuntor (auditoria 30/07/2026)
    expect(r.steps).toHaveLength(2);
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

describe("acTone — regra dos 80% (carga contínua)", () => {
  it("até 80% ok · 80–100% atenção · acima de 100% estouro", () => {
    expect(acTone(50)).toBe("ok");
    expect(acTone(80)).toBe("ok");
    expect(acTone(81)).toBe("warn");
    expect(acTone(100)).toBe("warn");
    expect(acTone(101)).toBe("over");
  });
});

