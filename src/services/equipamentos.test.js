// equipamentos.test.js — biblioteca editável de equipamentos de vídeo.
import { describe, it, expect } from "vitest";
import { makeEquip, makePorta, equipSnapshot, dataOuts, screenEquipStatus, effectiveSinalCfg, withEquip, CATEGORIAS, categoriaLabel } from "./equipamentos.js";
import { SEED_EQUIPS } from "../data/seedEquips.js";

// fixture mínima no molde de screenCabling.test.js
const gabImag = { resX: "192", resY: "192", pwrMax: "150", fp: "0.9" };
const telas = [{ id: "imag", gabinete: gabImag, cols: 6, rows: 3, nome: "IMAG" }];
// 18 gab de 192×192 → budget 655.360/36.864 = 17/porta → 2 portas de dados
const scImag = { id: "s2", nome: "IMAG", telaIds: ["imag"], pos: { imag: { x: 0, y: 0 } }, sinal: { rule: "px", strategy: "auto" } };

const vx400 = SEED_EQUIPS.find((e) => e.id === "nova-vx400");
const mx30 = SEED_EQUIPS.find((e) => e.id === "nova-mx30");

describe("seed herdado do catálogo v1.18.0", () => {
  it("preserva os ids nova-* (screens antigas seguem resolvendo o link vivo)", () => {
    expect(SEED_EQUIPS.map((e) => e.id)).toContain("nova-vx1000");
    expect(SEED_EQUIPS.every((e) => e.marca === "NovaStar" && e.categoria === "controladora")).toBe(true);
  });

  it("portas viraram lista nomeada: VX400 = 2 in de vídeo + 4 saídas ethernet + OPT fibra", () => {
    expect(vx400.portas.filter((p) => p.dir === "in").map((p) => p.sinal)).toEqual(["hdmi", "sdi"]);
    expect(vx400.portas.filter((p) => p.dir === "out" && p.sinal === "ethernet")).toHaveLength(4);
    expect(vx400.portas.filter((p) => p.sinal === "fibra")).toHaveLength(1);
  });

  it("px/porta por datasheet: VX 650.000, MX 659.722", () => {
    expect(vx400.pxPorta).toBe(650000);
    expect(mx30.pxPorta).toBe(659722);
  });
});

describe("makeEquip / makePorta / categorias", () => {
  it("defaults sãos", () => {
    const e = makeEquip();
    expect(e).toMatchObject({ marca: "", categoria: "controladora", portas: [], largura: 0, pxPorta: 0 });
    expect(typeof e.id).toBe("string");
    expect(e.id.length).toBeGreaterThan(6);
    expect(makePorta().dir).toBe("in");
  });

  it("categoriaLabel resolve e cai no id cru pra categoria desconhecida", () => {
    expect(categoriaLabel("controladora")).toBe("Controladora");
    expect(CATEGORIAS.length).toBeGreaterThan(3);
    expect(categoriaLabel("zzz")).toBe("zzz");
  });
});

describe("equipSnapshot — congelado, portas sem id (formato template)", () => {
  it("copia identidade e portas, descartando os ids das portas", () => {
    const snap = equipSnapshot(vx400);
    expect(snap.nome).toBe("VX400");
    expect(snap.portas.every((p) => !("id" in p))).toBe(true);
    expect(snap.portas).toHaveLength(vx400.portas.length);
  });

  it("null → undefined (screen sem vínculo não ganha campo)", () => {
    expect(equipSnapshot(null)).toBeUndefined();
  });

  it("dir inválida normaliza pra in; sinal ausente vira custom", () => {
    const snap = equipSnapshot(makeEquip({ portas: [{ nome: "X", dir: "sideways", sinal: "" }] }));
    expect(snap.portas[0]).toEqual({ nome: "X", dir: "in", sinal: "custom" });
  });
});

describe("dataOuts — a fila de saídas que alimenta LED", () => {
  it("prefere ethernet; OPT fica de fora quando há ethernet", () => {
    const outs = dataOuts(equipSnapshot(vx400));
    expect(outs).toHaveLength(4);
    expect(outs.every((p) => p.sinal === "ethernet")).toBe(true);
  });

  it("cai pra fibra quando o equipamento só transmite por óptica", () => {
    const optico = equipSnapshot(makeEquip({ portas: [
      { nome: "HDMI In", dir: "in", sinal: "hdmi" },
      { nome: "OPT 1", dir: "out", sinal: "fibra" },
      { nome: "OPT 2", dir: "out", sinal: "fibra" },
    ] }));
    expect(dataOuts(optico).map((p) => p.sinal)).toEqual(["fibra", "fibra"]);
  });

  it("sem saídas de dados → fila vazia (saída HDMI não alimenta LED)", () => {
    const player = equipSnapshot(makeEquip({ portas: [{ nome: "HDMI Out", dir: "out", sinal: "hdmi" }] }));
    expect(dataOuts(player)).toEqual([]);
  });
});

describe("screenEquipStatus — precisa N × tem M", () => {
  it("sem snapshot → null (feedback cinza, régua manual)", () => {
    expect(screenEquipStatus(scImag, telas)).toBeNull();
  });

  it("IMAG pede 2 portas; VX400 tem 4 → ok", () => {
    const s = { ...scImag, equipamentoId: vx400.id, equipamento: equipSnapshot(vx400) };
    expect(screenEquipStatus(s, telas)).toEqual({ necessarias: 2, disponiveis: 4, ok: true });
  });

  it("equipamento com 1 saída só → não ok (informa, não bloqueia)", () => {
    const um = makeEquip({ portas: [{ nome: "Porta 1", dir: "out", sinal: "ethernet" }] });
    const s = { ...scImag, equipamento: equipSnapshot(um) };
    expect(screenEquipStatus(s, telas)).toEqual({ necessarias: 2, disponiveis: 1, ok: false });
  });
});

describe("effectiveSinalCfg / withEquip — capacidade por porta do snapshot", () => {
  it("injeta pxPortaBase quando o snapshot declara, sem forçar a régua", () => {
    const s = { ...scImag, equipamento: equipSnapshot(vx400) };
    expect(withEquip(s).sinal).toMatchObject({ rule: "px", pxPortaBase: 650000 });
  });

  it("pxPorta 0/ausente não polui a config", () => {
    expect(effectiveSinalCfg({ rule: "px" }, { pxPorta: 0 })).toEqual({ rule: "px" });
    expect(effectiveSinalCfg({ rule: "px" }, undefined)).toEqual({ rule: "px" });
  });
});
