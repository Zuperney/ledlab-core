// projectCalc.test.js — status por data, roll-ups físicos e agregação elétrica.
import { describe, it, expect } from "vitest";
import { recomputeStatus, groupByMonth, screenRollup, projectRollup, aggregateElectrical, isoDate } from "./projectCalc.js";

const GAB = { resX: "128", resY: "128", dimW: "500", dimH: "500", peso: "8", pwrMax: "200", fp: "1", pwrBlack: "40" };
const tela = (over = {}) => ({ cols: 5, rows: 5, gabinete: GAB, ...over });

describe("recomputeStatus — status a partir das datas", () => {
  const hoje = "2026-07-10";
  it("cancelado sempre vence", () => {
    expect(recomputeStatus({ cancelled: true, dataInicio: "2026-07-05" }, hoje)).toBe("cancelled");
  });
  it("status manual é respeitado", () => {
    expect(recomputeStatus({ statusManual: true, status: "active" }, hoje)).toBe("active");
  });
  it("terminou no passado → done", () => {
    expect(recomputeStatus({ dataInicio: "2026-07-01", dataFim: "2026-07-05" }, hoje)).toBe("done");
  });
  it("em curso (início ≤ hoje ≤ fim) → active", () => {
    expect(recomputeStatus({ dataInicio: "2026-07-05", dataFim: "2026-07-15" }, hoje)).toBe("active");
  });
  it("futuro / sem datas → planned", () => {
    expect(recomputeStatus({ dataInicio: "2026-07-20", dataFim: "2026-07-25" }, hoje)).toBe("planned");
    expect(recomputeStatus({}, hoje)).toBe("planned");
  });
});

describe("groupByMonth — agrupa por AAAA-MM, cronológico", () => {
  it("agrupa e ordena; ignora projeto sem data de início", () => {
    const grupos = groupByMonth([
      { id: 1, dataInicio: "2026-08-01" },
      { id: 2, dataInicio: "2026-07-20" },
      { id: 3, dataInicio: "2026-07-05" },
      { id: 4 }, // sem data → fora
    ]);
    expect(grupos.map((g) => g.key)).toEqual(["2026-07", "2026-08"]);
    expect(grupos[0].projects.map((p) => p.id)).toEqual([3, 2]); // dentro do mês, por data
    expect(grupos[1].projects).toHaveLength(1);
  });
});

describe("screenRollup / projectRollup — roll-up físico", () => {
  it("uma tela 5×5 de gabinetes 128px/500mm/8kg/200W", () => {
    const r = screenRollup(tela());
    expect(r.gab).toBe(25);
    expect(r.pixels).toMatchObject({ largura: 640, altura: 640, total: 409600 });
    expect(r.dim.area_m2).toBeCloseTo(6.25, 5); // 2,5m × 2,5m
    expect(r.peso_kg).toBe(200); // 25 × 8
    expect(r.pwrMax_w).toBe(5000); // 25 × 200
  });

  it("projeto soma as telas", () => {
    const r = projectRollup({ telas: [tela(), tela()] });
    expect(r).toMatchObject({ gab: 50, peso_kg: 400, pwrMax_w: 10000, telas: 2 });
    expect(r.area_m2).toBeCloseTo(12.5, 5);
  });

  it("projeto vazio → zeros", () => {
    expect(projectRollup({})).toMatchObject({ gab: 0, peso_kg: 0, pwrMax_w: 0, telas: 0 });
  });
});

describe("aggregateElectrical — pico + típico do projeto inteiro", () => {
  it("1 tela 5×5, 200W, fp 1, 380 bifásico", () => {
    const agg = aggregateElectrical({ telas: [tela()] }, { vk: "380_bi", brilho: 0.7, conteudo: 0.33 });
    expect(agg.perTela).toHaveLength(1);
    expect(agg.W).toBe(5000); // 25 × 200
    expect(agg.S).toBe(5000); // fp 1
    expect(agg.kVA).toBe("5.00");
    expect(agg.I).toBe(11.4); // 5000 / 440
    expect(agg.breaker).toBe(16); // 11,4 × 1,25 = 14,25 → 16
    // típico (Barco): 40 + (200−40)×0,7×0,33 = 76,96 W/tile × 25 = 1924 W
    expect(agg.typW).toBeCloseTo(1924, 0);
  });

  it("vk inválido cai no padrão 220 trifásico", () => {
    const agg = aggregateElectrical({ telas: [tela()] }, { vk: "xxx", brilho: 0.7, conteudo: 0.33 });
    expect(agg.vc.ph).toBe(3); // fallback = 220 trifásico
    expect(agg.vc.div).toBeCloseTo(220 * Math.sqrt(3), 5);
    expect(agg.I).toBeGreaterThan(0);
  });
});

describe("isoDate — data LOCAL sem flip de fuso", () => {
  it("23h30 continua no mesmo dia (não vira o dia seguinte em UTC-3)", () => {
    expect(isoDate(new Date(2026, 6, 10, 23, 30, 0))).toBe("2026-07-10");
  });
  it("formata com zero à esquerda", () => {
    expect(isoDate(new Date(2026, 0, 3, 8, 0, 0))).toBe("2026-01-03");
  });
});
