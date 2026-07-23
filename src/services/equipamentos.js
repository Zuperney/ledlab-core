// services/equipamentos.js — CATÁLOGO CERTIFICADO de controladoras (all-in-one e
// sending cards) e a ligação com as Screens.
//
// FILOSOFIA (cravada): o catálogo é CERTIFICADO POR NÓS e READ-ONLY — o técnico
// SELECIONA de uma lista curada, NÃO cadastra (diferente dos gabinetes). Dado errado
// de controladora vira info errada no circuito elétrico; por isso a gente revisa antes
// de soltar. Cada Screen aponta pra um `screen.equipamentoId` do catálogo; sem
// equipamento, a Screen segue a régua manual (como na v1.4.0).
//
// O equipamento guarda só CAPACIDADE (portas, px/porta, resolução máx, bits, entradas).
// NÃO tem Free Topology: ele é combinação controladora × receiving card (a RC mora no
// gabinete) — território de especialista; a régua área/pixels segue decisão do técnico.
import { screenPorts } from "./screenCabling.js";
import { screenSize } from "./screens.js";

// px por porta Gigabit @8-bit/60Hz — constante da NovaStar (o total = portas × isto).
export const PX_PORTA_PADRAO = 655360;

// equipamento: identidade + capacidade. `categoria`: "all-in-one" | "sending-card".
export function makeEquip(id, patch = {}) {
  return {
    id,
    marca: patch.marca || "NovaStar",
    modelo: patch.modelo || "",
    categoria: patch.categoria || "all-in-one",
    portas: patch.portas ?? 4,
    pxPorta: patch.pxPorta ?? PX_PORTA_PADRAO, // @8-bit 60Hz
    maxW: patch.maxW ?? 0, maxH: patch.maxH ?? 0, // 0 = sem limite conhecido
    bits: patch.bits || [8, 10, 12],
    entradas: patch.entradas || [],
    status: patch.status || "ativo", // "ativo" | "descontinuado"
    obs: patch.obs || "",
  };
}

// CATÁLOGO CERTIFICADO (confrontado com os datasheets NovaStar). Só o que está em voga
// + a VX1000 (descontinuada, mas a "queridinha do momento"). A frota real cresce depois
// de consolidar interface e funcionamento. H9 fica pra categoria modular/processador.
export const CATALOGO = [
  makeEquip("nova-vx1000", { modelo: "VX1000", categoria: "all-in-one", portas: 10, maxW: 10240, maxH: 8192, bits: [8, 10, 12], entradas: ["HDMI", "DVI", "3G-SDI", "OPT"], status: "descontinuado", obs: "Descontinuada, mas ainda a queridinha do mercado de rental." }),
  makeEquip("nova-vx2000pro", { modelo: "VX2000 Pro", categoria: "all-in-one", portas: 20, maxW: 16384, maxH: 8192, bits: [8, 10, 12], entradas: ["HDMI", "12G-SDI", "DP", "OPT"], status: "ativo" }),
  makeEquip("nova-vx400pro", { modelo: "VX400 Pro", categoria: "all-in-one", portas: 4, maxW: 10240, maxH: 8192, bits: [8, 10, 12], entradas: ["HDMI", "3G-SDI", "OPT"], status: "ativo" }),
];

export const equipById = (id) => CATALOGO.find((e) => e.id === id) || null;
export const equipOf = (screen) => equipById(screen?.equipamentoId);

// capacidade total do equipamento em pixels (portas × px/porta @8-bit 60Hz)
export const cargaTotal = (equip) => (equip ? equip.portas * equip.pxPorta : 0);

// injeta a capacidade por porta da controladora na config de sinal da Screen (o
// cableMeta escala por bits/refresh). NÃO força a régua — Free Topology saiu.
export function effectiveSinalCfg(sinalCfg, equip) {
  const s = sinalCfg || {};
  return equip ? { ...s, pxPortaBase: equip.pxPorta } : s;
}
export function withEquip(screen, equip) {
  return { ...screen, sinal: effectiveSinalCfg(screen?.sinal, equip) };
}
export function effectiveProject(project) {
  return { ...project, screens: (project?.screens || []).map((s) => withEquip(s, equipOf(s))) };
}

// se uma Screen estoura a resolução máxima da controladora (0 = sem limite conhecido)
const resOver = (equip, size) => !!(equip && (equip.maxW && size.w > equip.maxW || equip.maxH && size.h > equip.maxH));

// RELATÓRIO DE CAPACIDADE: por controladora EM USO, quantas portas as Screens dela
// pedem × quantas ela tem (+ estouro de resolução). Screens sem controladora à parte
// (não bloqueia — a régua segue manual).
export function equipReport(project, telas, numbering = "row-tb-lr") {
  const screens = project?.screens || [];
  const usados = [...new Set(screens.map((s) => s.equipamentoId).filter(Boolean))];
  const rows = usados.map((id) => {
    const equip = equipById(id);
    const suas = screens.filter((s) => s.equipamentoId === id && (s.telaIds || []).length);
    const porScreen = suas.map((s) => {
      const size = screenSize(s, telas);
      return { screen: s, size, portas: screenPorts(withEquip(s, equip), telas, "sinal", numbering).length, resOver: resOver(equip, size) };
    });
    const usadas = porScreen.reduce((n, x) => n + x.portas, 0);
    const disp = equip?.portas || 0;
    return { equip, screens: porScreen, portasUsadas: usadas, portasDisp: disp, over: usadas > disp, folga: disp - usadas, algumResOver: porScreen.some((x) => x.resOver) };
  });
  const semEquip = screens.filter((s) => !s.equipamentoId && (s.telaIds || []).length);
  return { rows, semEquip };
}

// Hz como lever: se a controladora estourou as portas, qual refresh faria caber? (mais
// px/porta em refresh menor → menos portas). Testa 50 e 30 Hz sem persistir nada.
export function hzQueCabe(equip, screens, telas, numbering = "row-tb-lr") {
  if (!equip) return null;
  for (const hz of [50, 30]) {
    const portas = screens.reduce((n, s) => {
      const eff = withEquip(s, equip);
      eff.sinal = { ...eff.sinal, hz };
      return n + screenPorts(eff, telas, "sinal", numbering).length;
    }, 0);
    if (portas <= equip.portas) return { hz, portas };
  }
  return null;
}
