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

// px por porta Gigabit @8-bit/60Hz — padrão da régua quando não há controladora.
export const PX_PORTA_PADRAO = 655360;
// por datasheet: a série VX declara 650.000 px/porta; a COEX (MX) declara 659.722
// (fórmula do gigabit: 1G × 0,95 ÷ 24 bits ÷ 60 Hz).
const PX_PORTA_VX = 650000;
const PX_PORTA_MX = 659722;

// equipamento: identidade + capacidade. `categoria`: "all-in-one" | "sending-card".
// `cargaMax` = teto de pixels do DISPOSITIVO — nem sempre é portas × px/porta (a
// MX40 Pro tem 20 portas mas processa no máx. 9M px).
export function makeEquip(id, patch = {}) {
  const portas = patch.portas ?? 4;
  const pxPorta = patch.pxPorta ?? PX_PORTA_PADRAO; // @8-bit 60Hz
  return {
    id,
    marca: patch.marca || "NovaStar",
    modelo: patch.modelo || "",
    serie: patch.serie || "",
    categoria: patch.categoria || "all-in-one",
    portas,
    pxPorta,
    cargaMax: patch.cargaMax ?? portas * pxPorta,
    maxW: patch.maxW ?? 0, maxH: patch.maxH ?? 0, // 0 = sem limite conhecido
    bits: patch.bits || [8, 10, 12],
    entradas: patch.entradas || [],
    status: patch.status || "ativo", // "ativo" | "descontinuado"
    obs: patch.obs || "",
  };
}

// CATÁLOGO CERTIFICADO (confrontado com os datasheets NovaStar do acervo). Séries VX
// e MX (COEX) all-in-one; modulares (H9, MX2000/6000 Pro) ficam pra categoria própria.
export const CATALOGO = [
  // ── Série VX ──
  makeEquip("nova-vx400", { modelo: "VX400", serie: "VX", portas: 4, pxPorta: PX_PORTA_VX, maxW: 10240, maxH: 8192, bits: [8], entradas: ["HDMI", "3G-SDI", "OPT"], status: "descontinuado", obs: "Entrada HDMI 1.3, só 8-bit — substituída pela VX400 Pro." }),
  makeEquip("nova-vx600", { modelo: "VX600", serie: "VX", portas: 6, pxPorta: PX_PORTA_VX, maxW: 10240, maxH: 8192, bits: [8], entradas: ["HDMI", "3G-SDI", "OPT"], status: "descontinuado", obs: "Entrada HDMI 1.3, só 8-bit — substituída pela VX600 Pro." }),
  makeEquip("nova-vx1000", { modelo: "VX1000", serie: "VX", portas: 10, pxPorta: PX_PORTA_VX, maxW: 10240, maxH: 8192, bits: [8, 10, 12], entradas: ["HDMI", "DVI", "3G-SDI", "OPT"], status: "descontinuado", obs: "Descontinuada, mas ainda a queridinha do mercado de rental." }),
  makeEquip("nova-vx400pro", { modelo: "VX400 Pro", serie: "VX", portas: 4, pxPorta: PX_PORTA_VX, maxW: 10240, maxH: 8192, bits: [8, 10, 12], entradas: ["HDMI", "3G-SDI", "OPT"], status: "ativo" }),
  makeEquip("nova-vx600pro", { modelo: "VX600 Pro", serie: "VX", portas: 6, pxPorta: PX_PORTA_VX, maxW: 10240, maxH: 8192, bits: [8, 10, 12], entradas: ["HDMI", "3G-SDI", "OPT"], status: "ativo" }),
  makeEquip("nova-vx1000pro", { modelo: "VX1000 Pro", serie: "VX", portas: 10, pxPorta: PX_PORTA_VX, maxW: 10240, maxH: 8192, bits: [8, 10, 12], entradas: ["HDMI", "3G-SDI", "OPT"], status: "ativo" }),
  makeEquip("nova-vx2000pro", { modelo: "VX2000 Pro", serie: "VX", portas: 20, pxPorta: PX_PORTA_VX, maxW: 16384, maxH: 8192, bits: [8, 10, 12], entradas: ["HDMI", "12G-SDI", "DP", "OPT"], status: "ativo" }),
  // ── Série MX (COEX) — sem limite de tela declarado no spec (maxW/H = 0) ──
  makeEquip("nova-mx20", { modelo: "MX20", serie: "MX", portas: 6, pxPorta: PX_PORTA_MX, cargaMax: 3900000, bits: [8, 10], entradas: ["HDMI", "3G-SDI", "OPT"], status: "ativo", obs: "Ecossistema COEX (VMP)." }),
  makeEquip("nova-mx30", { modelo: "MX30", serie: "MX", portas: 10, pxPorta: PX_PORTA_MX, cargaMax: 6500000, bits: [8, 10], entradas: ["HDMI", "DP", "3G-SDI", "OPT"], status: "ativo", obs: "Ecossistema COEX (VMP)." }),
  makeEquip("nova-mx40pro", { modelo: "MX40 Pro", serie: "MX", portas: 20, pxPorta: PX_PORTA_MX, cargaMax: 9000000, bits: [8, 10, 12], entradas: ["HDMI", "DP", "12G-SDI", "OPT"], status: "ativo", obs: "Carro-chefe COEX (VMP) — o dispositivo processa no máx. 9M px, menos que portas × px/porta." }),
];

export const equipById = (id) => CATALOGO.find((e) => e.id === id) || null;
export const equipOf = (screen) => equipById(screen?.equipamentoId);

// capacidade total do equipamento em pixels — o teto do DISPOSITIVO (cargaMax),
// que pode ser menor que portas × px/porta (ex.: MX40 Pro)
export const cargaTotal = (equip) => (equip ? equip.cargaMax ?? equip.portas * equip.pxPorta : 0);

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
      return { screen: s, size, px: size.w * size.h, portas: screenPorts(withEquip(s, equip), telas, "sinal", numbering).length, resOver: resOver(equip, size) };
    });
    const usadas = porScreen.reduce((n, x) => n + x.portas, 0);
    const disp = equip?.portas || 0;
    // teto do DISPOSITIVO: soma dos pixels das Screens × cargaMax (a MX40 Pro estoura
    // em px antes de estourar em portas)
    const pxUsados = porScreen.reduce((n, x) => n + x.px, 0);
    const carga = cargaTotal(equip);
    return { equip, screens: porScreen, portasUsadas: usadas, portasDisp: disp, over: usadas > disp, folga: disp - usadas, pxUsados, carga, cargaOver: !!carga && pxUsados > carga, algumResOver: porScreen.some((x) => x.resOver) };
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
