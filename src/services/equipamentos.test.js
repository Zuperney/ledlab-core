import { describe, it, expect } from "vitest";
import { CATALOGO, makeEquip, equipById, equipOf, cargaTotal, effectiveSinalCfg, PX_PORTA_PADRAO } from "./equipamentos.js";

describe("catálogo de equipamentos (certificado)", () => {
  it("tem os 3 certificados, todos NovaStar all-in-one", () => {
    expect(CATALOGO.map((e) => e.modelo)).toEqual(["VX1000", "VX2000 Pro", "VX400 Pro"]);
    expect(CATALOGO.every((e) => e.marca === "NovaStar" && e.categoria === "all-in-one")).toBe(true);
  });

  it("VX1000 = 10 portas, descontinuada; VX2000 Pro = 20 portas, ativa", () => {
    expect(equipById("nova-vx1000")).toMatchObject({ portas: 10, status: "descontinuado", maxW: 10240 });
    expect(equipById("nova-vx2000pro")).toMatchObject({ portas: 20, status: "ativo", maxW: 16384 });
  });

  it("equipById/equipOf resolvem e caem em null", () => {
    expect(equipById("xxx")).toBeNull();
    expect(equipOf({ equipamentoId: "nova-vx400pro" }).modelo).toBe("VX400 Pro");
    expect(equipOf({})).toBeNull();
  });

  it("cargaTotal = portas × px/porta (655.360)", () => {
    expect(cargaTotal(equipById("nova-vx1000"))).toBe(10 * PX_PORTA_PADRAO); // ~6,5M
    expect(cargaTotal(equipById("nova-vx2000pro"))).toBe(20 * PX_PORTA_PADRAO); // ~13M
    expect(cargaTotal(null)).toBe(0);
  });

  it("effectiveSinalCfg injeta pxPortaBase mas NÃO força a régua (Free Topology saiu)", () => {
    const eff = effectiveSinalCfg({ rule: "px", strategy: "livre" }, equipById("nova-vx1000"));
    expect(eff.pxPortaBase).toBe(PX_PORTA_PADRAO);
    expect(eff.rule).toBe("px");
    expect(effectiveSinalCfg({ rule: "px" }, null)).toEqual({ rule: "px" });
  });

  it("makeEquip tem defaults sãos e sem freeTopology", () => {
    const e = makeEquip("x", {});
    expect(e).toMatchObject({ marca: "NovaStar", categoria: "all-in-one", portas: 4, pxPorta: PX_PORTA_PADRAO, status: "ativo" });
    expect(e.bits).toEqual([8, 10, 12]);
    expect("freeTopology" in e).toBe(false);
  });
});
