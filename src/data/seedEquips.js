// data/seedEquips.js — seed da biblioteca de equipamentos de vídeo.
// Herdado do antigo CATÁLOGO certificado de controladoras (v1.18.0): os ids
// "nova-*" são PRESERVADOS pra que Screens antigas com `equipamentoId` continuem
// resolvendo o link vivo. A partir daqui a biblioteca é EDITÁVEL — o técnico
// ajusta portas, apaga e cria do zero (decisão do dono; a filosofia read-only
// do catálogo foi absorvida como "seed de fábrica").
//
// Portas usam os ids de sinal do Loomex (SINAIS em services/loomex.js) — é o que
// deixa o export .loomex.json sem perdas. OPT vira saída de fibra: nas VX/MX ela
// espelha as saídas de dados pra transmissão óptica.

// px/porta Gigabit por datasheet: série VX declara 650.000; COEX (MX) 659.722.
const PX_VX = 650000;
const PX_MX = 659722;

const P = (id, nome, dir, sinal) => ({ id, nome, dir, sinal });

// controladora típica: entradas de vídeo + N saídas de dados ethernet + OPT
function ctrl(id, nome, { dataPorts, pxPorta, ins, opt = 1, obs = "" }) {
  const portas = ins.map(([nomeIn, sinal], i) => P(`in${i + 1}`, nomeIn, "in", sinal));
  for (let n = 1; n <= dataPorts; n++) portas.push(P(`out${n}`, `Porta ${n}`, "out", "ethernet"));
  for (let n = 1; n <= opt; n++) portas.push(P(`opt${n}`, opt > 1 ? `OPT ${n}` : "OPT", "out", "fibra"));
  return { id, nome, marca: "NovaStar", categoria: "controladora", portas, largura: 0, pxPorta, obs };
}

export const SEED_EQUIPS = [
  // ── Série VX ──
  ctrl("nova-vx400", "VX400", { dataPorts: 4, pxPorta: PX_VX, ins: [["HDMI In", "hdmi"], ["3G-SDI In", "sdi"]], obs: "Entrada HDMI 1.3, só 8-bit — substituída pela VX400 Pro." }),
  ctrl("nova-vx600", "VX600", { dataPorts: 6, pxPorta: PX_VX, ins: [["HDMI In", "hdmi"], ["3G-SDI In", "sdi"]], obs: "Entrada HDMI 1.3, só 8-bit — substituída pela VX600 Pro." }),
  ctrl("nova-vx1000", "VX1000", { dataPorts: 10, pxPorta: PX_VX, ins: [["HDMI In", "hdmi"], ["DVI In", "custom"], ["3G-SDI In", "sdi"]], obs: "Descontinuada, mas ainda a queridinha do mercado de rental." }),
  ctrl("nova-vx400pro", "VX400 Pro", { dataPorts: 4, pxPorta: PX_VX, ins: [["HDMI In", "hdmi"], ["3G-SDI In", "sdi"]] }),
  ctrl("nova-vx600pro", "VX600 Pro", { dataPorts: 6, pxPorta: PX_VX, ins: [["HDMI In", "hdmi"], ["3G-SDI In", "sdi"]] }),
  ctrl("nova-vx1000pro", "VX1000 Pro", { dataPorts: 10, pxPorta: PX_VX, ins: [["HDMI In", "hdmi"], ["3G-SDI In", "sdi"]] }),
  ctrl("nova-vx2000pro", "VX2000 Pro", { dataPorts: 20, pxPorta: PX_VX, ins: [["HDMI In", "hdmi"], ["12G-SDI In", "sdi"], ["DP In", "displayport"]] }),
  // ── Série MX (COEX) ──
  ctrl("nova-mx20", "MX20", { dataPorts: 6, pxPorta: PX_MX, ins: [["HDMI In", "hdmi"], ["3G-SDI In", "sdi"]], obs: "Ecossistema COEX (VMP)." }),
  ctrl("nova-mx30", "MX30", { dataPorts: 10, pxPorta: PX_MX, ins: [["HDMI In", "hdmi"], ["DP In", "displayport"], ["3G-SDI In", "sdi"]], obs: "Ecossistema COEX (VMP)." }),
  ctrl("nova-mx40pro", "MX40 Pro", { dataPorts: 20, pxPorta: PX_MX, ins: [["HDMI In", "hdmi"], ["DP In", "displayport"], ["12G-SDI In", "sdi"]], obs: "Carro-chefe COEX (VMP) — processa no máx. 9M px, menos que portas × px/porta." }),
];
