// equipamentos.test.js — controladoras (biblioteca global) e a ligação com Screens.
import { describe, it, expect } from "vitest";
import { makeController, effectiveSinalCfg, effectiveProject, controllerOf, screenAllowsPx, equipReport, hzQueCabe } from "./equipamentos.js";
import { cableMeta } from "./cabling.js";

const gabTira = { resX: "128", resY: "256", pwrMax: "200", fp: "0.9", conector: "PowerCON Azul/Branco" };
const mk = (id, cols, rows) => ({ id, gabinete: gabTira, cols, rows, nome: id });
const telas = [mk("t1", 1, 3), mk("t2", 1, 3), mk("central", 10, 3)];
const scr = (id, telaIds, equipamentoId, sinal) => ({ id, nome: id, telaIds, pos: Object.fromEntries(telaIds.map((t, i) => [t, { x: i * 128, y: 0 }])), sinal: sinal || {}, equipamentoId });

const vxProFT = makeController("pro", { nome: "VX Pro", portas: 8, pxPorta: 655360, freeTopology: true });
const vxNoFT = makeController("vx1000", { nome: "VX1000", portas: 1, pxPorta: 655360, freeTopology: false }); // 1 porta no fixture p/ forçar o estouro

describe("makeController", () => {
  it("aplica defaults sensatos", () => {
    expect(makeController("c1")).toMatchObject({ id: "c1", portas: 4, pxPorta: 655360, freeTopology: false });
  });
});

describe("effectiveSinalCfg — a controladora manda na régua", () => {
  it("sem controladora: config intacta", () => {
    expect(effectiveSinalCfg({ rule: "px", strategy: "auto" }, null)).toEqual({ rule: "px", strategy: "auto" });
  });
  it("controladora COM Free Topology: mantém a régua e injeta a capacidade por porta", () => {
    const eff = effectiveSinalCfg({ rule: "px", strategy: "auto" }, vxProFT);
    expect(eff.rule).toBe("px");
    expect(eff.pxPortaBase).toBe(655360);
  });
  it("controladora SEM Free Topology: FORÇA área e desmancha o 'auto' (que é de px)", () => {
    const eff = effectiveSinalCfg({ rule: "px", strategy: "auto" }, vxNoFT);
    expect(eff.rule).toBe("area");
    expect(eff.strategy).toBe("area");
    expect(eff.pxPortaBase).toBe(655360);
  });
  it("SEM Free Topology mas com estratégia de área válida: preserva a estratégia", () => {
    expect(effectiveSinalCfg({ rule: "px", strategy: "coluna" }, vxNoFT).strategy).toBe("coluna");
  });
});

describe("cableMeta com capacidade da controladora (pxPortaBase)", () => {
  it("orçamento reflete a capacidade por porta da controladora", () => {
    const cheia = cableMeta(telas[0], { pxPortaBase: 655360 }).sinalBudget; // 655360/32768 = 20
    const meia = cableMeta(telas[0], { pxPortaBase: 327680 }).sinalBudget;   // metade
    expect(cheia).toBe(20);
    expect(meia).toBe(10);
  });
  it("10-bit corta a capacidade da controladora pela metade", () => {
    expect(cableMeta(telas[0], { pxPortaBase: 655360, bits: 10 }).sinalBudget).toBe(10);
  });
});

describe("screenAllowsPx", () => {
  it("libera px só se a controladora tem Free Topology (ou não há controladora)", () => {
    const ctrls = [vxProFT, vxNoFT];
    expect(screenAllowsPx(scr("s", ["t1"], "pro"), ctrls)).toBe(true);
    expect(screenAllowsPx(scr("s", ["t1"], "vx1000"), ctrls)).toBe(false);
    expect(screenAllowsPx(scr("s", ["t1"], null), ctrls)).toBe(true); // sem controladora, o usuário escolhe
  });
});

describe("equipReport — capacidade de porta por controladora", () => {
  it("soma as portas das Screens da controladora e marca estouro", () => {
    const project = { screens: [scr("A", ["t1", "t2", "central"], "vx1000"), scr("B", ["t1"], "pro")] };
    const { rows, semControlador } = equipReport(project, [vxProFT, vxNoFT], telas);
    const vx = rows.find((r) => r.controller.id === "vx1000");
    // 36 gab de 128×256 (budget 20) em área → 2 portas → estoura a controladora de 1 porta
    expect(vx.portasDisp).toBe(1);
    expect(vx.portasUsadas).toBeGreaterThan(1);
    expect(vx.over).toBe(true);
    expect(semControlador).toEqual([]);
  });
  it("Screen sem controladora entra em 'semControlador', não bloqueia", () => {
    const project = { screens: [scr("A", ["t1"], null)] };
    const { rows, semControlador } = equipReport(project, [vxProFT], telas);
    expect(rows).toEqual([]);
    expect(semControlador.map((s) => s.id)).toEqual(["A"]);
  });
});

describe("hzQueCabe — Hz como lever quando estoura", () => {
  it("baixar o refresh dá mais px por porta → menos portas; sugere o Hz que cabe", () => {
    const screens = [scr("A", ["t1", "t2", "central"], "vx1000")];
    const r = hzQueCabe(vxNoFT, screens, telas); // 1 porta; a 30Hz o budget dobra → 36 gab cabem em 1
    expect(r).not.toBe(null);
    expect([50, 30]).toContain(r.hz);
    expect(r.portas).toBeLessThanOrEqual(1);
  });
});

describe("effectiveProject", () => {
  it("resolve a controladora de cada Screen nas configs de sinal", () => {
    const project = { telas, screens: [scr("A", ["t1"], "vx1000"), scr("B", ["t2"], "pro")] };
    const eff = effectiveProject(project, [vxProFT, vxNoFT]);
    expect(eff.screens[0].sinal.rule).toBe("area"); // vx1000 força área
    expect(eff.screens[0].sinal.pxPortaBase).toBe(655360);
    expect(controllerOf([vxProFT, vxNoFT], project.screens[1]).id).toBe("pro");
  });
});
