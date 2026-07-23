import { describe, it, expect } from "vitest";
import { CATALOGO, makeEquip, equipById, equipOf, cargaTotal, effectiveSinalCfg, PX_PORTA_PADRAO } from "./equipamentos.js";

describe("catálogo de equipamentos (certificado)", () => {
  it("tem as séries VX e MX, todas NovaStar all-in-one", () => {
    expect(CATALOGO.map((e) => e.modelo)).toEqual([
      "VX400", "VX600", "VX1000", "VX400 Pro", "VX600 Pro", "VX1000 Pro", "VX2000 Pro",
      "MX20", "MX30", "MX40 Pro",
    ]);
    expect(CATALOGO.every((e) => e.marca === "NovaStar" && e.categoria === "all-in-one")).toBe(true);
    expect(CATALOGO.every((e) => e.serie === "VX" || e.serie === "MX")).toBe(true);
  });

  it("VX1000 = 10 portas, descontinuada; VX2000 Pro = 20 portas, ativa", () => {
    expect(equipById("nova-vx1000")).toMatchObject({ portas: 10, status: "descontinuado", maxW: 10240 });
    expect(equipById("nova-vx2000pro")).toMatchObject({ portas: 20, status: "ativo", maxW: 16384 });
  });

  it("legacy VX400/VX600 só 8-bit (datasheet: 10/12-bit not supported); Pro tem 8/10/12", () => {
    expect(equipById("nova-vx400").bits).toEqual([8]);
    expect(equipById("nova-vx600").bits).toEqual([8]);
    expect(equipById("nova-vx600pro").bits).toEqual([8, 10, 12]);
  });

  it("série VX = 650.000 px/porta; MX (COEX) = 659.722 (fórmula do gigabit)", () => {
    expect(equipById("nova-vx1000").pxPorta).toBe(650000);
    expect(equipById("nova-mx30").pxPorta).toBe(659722);
  });

  it("MX sem limite de tela declarado no spec → maxW/maxH = 0 (sem limite conhecido)", () => {
    expect(equipById("nova-mx40pro")).toMatchObject({ maxW: 0, maxH: 0 });
  });

  it("equipById/equipOf resolvem e caem em null", () => {
    expect(equipById("xxx")).toBeNull();
    expect(equipOf({ equipamentoId: "nova-vx400pro" }).modelo).toBe("VX400 Pro");
    expect(equipOf({})).toBeNull();
  });

  it("cargaTotal = teto do DISPOSITIVO: portas × px/porta na VX, cargaMax explícita na MX", () => {
    expect(cargaTotal(equipById("nova-vx1000"))).toBe(6500000); // 10 × 650k
    expect(cargaTotal(equipById("nova-vx2000pro"))).toBe(13000000); // 20 × 650k
    expect(cargaTotal(equipById("nova-mx40pro"))).toBe(9000000); // 20 portas, mas o box processa 9M
    expect(cargaTotal(null)).toBe(0);
  });

  it("effectiveSinalCfg injeta pxPortaBase mas NÃO força a régua (Free Topology saiu)", () => {
    const eff = effectiveSinalCfg({ rule: "px", strategy: "livre" }, equipById("nova-vx1000"));
    expect(eff.pxPortaBase).toBe(650000);
    expect(eff.rule).toBe("px");
    expect(effectiveSinalCfg({ rule: "px" }, null)).toEqual({ rule: "px" });
  });

  it("makeEquip tem defaults sãos e sem freeTopology", () => {
    const e = makeEquip("x", {});
    expect(e).toMatchObject({ marca: "NovaStar", categoria: "all-in-one", portas: 4, pxPorta: PX_PORTA_PADRAO, status: "ativo" });
    expect(e.cargaMax).toBe(4 * PX_PORTA_PADRAO);
    expect(e.bits).toEqual([8, 10, 12]);
    expect("freeTopology" in e).toBe(false);
  });
});
