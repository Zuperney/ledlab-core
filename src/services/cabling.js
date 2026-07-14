// services/cabling.js — lógica de roteamento de cabos (sinal e AC), COMPARTILHADA
// pela aba Cabeamento e pelo overlay "Mapa de cabos" do Test Card (mantém consistência).
//
// SINAL — duas RÉGUAS de porta (config por tela em cabling.sinal.rule):
//  • "px" (padrão p/ telas novas): pixels REAIS — é como VX/série A/Colorlight
//    distribuem; a porta gasta a contagem de gabinetes×px, rota serpentina contínua
//    cortada por contagem balanceada. Capacidade escala com refresh E profundidade
//    de cor (8-bit ≈ 655k px, 10-bit ≈ 327k px @60Hz).
//  • "area" (legado; telas antigas sem o campo): Novastar básico — a porta reserva a
//    ÁREA RETANGULAR (bounding box); blocos retangulares ≤ budget.

// Constantes elétricas/sinal — fonte única em src/config/electricalConfig.js
import { PX_PER_PORT, PX_PER_PORT_BY_BITS, FASE_V, CONN_AMP } from "../config/electricalConfig.js";
export { PX_PER_PORT, PX_PER_PORT_BY_BITS, FASE_V, CONN_AMP };

// Fator de segurança do cabo AC (regra dos 80% p/ carga contínua de show). É uma
// preferência GLOBAL do app (Configurações), então vive como módulo em vez de
// prop threaded: o AppContext chama setAcMargin quando as prefs carregam/mudam.
// 1 = sem margem (padrão histórico). Afeta só o acBudget (cabeamento AC).
let acMargin = 1;
export function setAcMargin(m) {
  const n = Number(m);
  acMargin = n >= 0.5 && n <= 1 ? n : 1;
}

export const range = (n) => [...Array(Math.max(0, n)).keys()];
export const key = (c, r) => `${r},${c}`;
export const parseKey = (k) => { const [r, c] = k.split(",").map(Number); return { c, r }; };
export const bboxArea = (p) => { let a = 1e9, b = -1, c = 1e9, d = -1; for (const x of p) { a = Math.min(a, x.c); b = Math.max(b, x.c); c = Math.min(c, x.r); d = Math.max(d, x.r); } return p.length ? (b - a + 1) * (d - c + 1) : 0; };
// divide arr em N segmentos CONTÍGUOS o mais iguais possível, com N = mínimo de
// cabos pra respeitar o budget (ceil). Mantém a ordem (a rota do sinal), mas
// equilibra a carga entre os cabos — "balanceamento de fase": em vez de 22+3
// (guloso), faz 13+12. Nunca passa do budget nem usa mais cabos que o guloso.
export const balancedChunks = (arr, budget) => {
  const L = arr.length;
  if (L === 0) return [];
  const n = Math.max(1, Math.ceil(L / Math.max(1, budget)));
  const base = Math.floor(L / n);
  let extra = L - base * n; // os primeiros `extra` segmentos levam +1
  const out = [];
  for (let i = 0, k = 0; k < n; k++) {
    const size = base + (extra > 0 ? 1 : 0);
    if (extra > 0) extra--;
    out.push(arr.slice(i, i + size));
    i += size;
  }
  return out;
};

// ordem de numeração dos cabos (config global). scheme = "eixo-dir1-dir2".
function orderPorts(ports, scheme) {
  const bb = (p) => { let minR = 1e9, minC = 1e9; for (const x of p) { if (x.r < minR) minR = x.r; if (x.c < minC) minC = x.c; } return { minR, minC }; };
  const [axis, d1, d2] = (scheme || "row-tb-lr").split("-");
  return [...ports].sort((A, B) => {
    const a = bb(A), b = bb(B);
    if (axis === "col") {
      const c = d1 === "lr" ? a.minC - b.minC : b.minC - a.minC;
      return c || (d2 === "bt" ? b.minR - a.minR : a.minR - b.minR);
    }
    const r = d1 === "bt" ? b.minR - a.minR : a.minR - b.minR;
    return r || (d2 === "lr" ? a.minC - b.minC : b.minC - a.minC);
  });
}

function bands(total, budget) { const out = []; let rem = total; while (rem > budget) { out.push(budget); rem -= budget; } if (rem > 0) out.push(rem); return out; }

// serpentina dentro de um bloco: COMEÇA no canto `corner` (bl|br|tl|tr) e alterna
// a direção a cada faixa. `routing`: "updown" varre coluna a coluna (vertical
// primeiro); "zigzag" varre linha a linha (horizontal primeiro). Os 4 cantos × 2
// orientações = os 8 padrões de "Quick Connection" do NovaLCT, pra casar com a
// montagem física real (onde o cabo de fato começa na parede).
export function serpentine(bx, by, W, H, routing = "updown", corner = "bl") {
  const rightStart = corner === "br" || corner === "tr";
  const bottomStart = corner === "bl" || corner === "br";
  let cols = range(W).map((i) => bx + i);
  let rows = range(H).map((i) => by + i);
  if (rightStart) cols = cols.slice().reverse();
  if (bottomStart) rows = rows.slice().reverse();
  const block = [];
  if (routing === "zigzag") { // horizontal primeiro
    rows.forEach((r, ri) => (ri % 2 === 0 ? cols : cols.slice().reverse()).forEach((c) => block.push({ c, r })));
  } else { // vertical primeiro (updown)
    cols.forEach((c, ci) => (ci % 2 === 0 ? rows : rows.slice().reverse()).forEach((r) => block.push({ c, r })));
  }
  return block;
}
export const mkBlock = (bx, by, W, H, routing, corner = "bl") => serpentine(bx, by, W, H, routing, corner);

function portsLinha(cols, rows, budget, routing, corner) {
  const ports = []; let bx = 0;
  for (const w of bands(cols, budget)) {
    const h = Math.max(1, Math.floor(budget / w));
    for (let by = 0; by < rows; by += h) ports.push(mkBlock(bx, by, Math.min(w, cols - bx), Math.min(h, rows - by), routing, corner));
    bx += w;
  }
  return ports;
}
function portsColuna(cols, rows, budget, routing, corner) {
  const ports = []; let by = 0;
  for (const h of bands(rows, budget)) {
    const w = Math.max(1, Math.floor(budget / h));
    for (let bx = 0; bx < cols; bx += w) ports.push(mkBlock(bx, by, Math.min(w, cols - bx), Math.min(h, rows - by), routing, corner));
    by += h;
  }
  return ports;
}
// régua de PIXELS: rota serpentina contínua na grade inteira, cortada por CONTAGEM
// balanceada — a porta gasta os px reais (nº de gabinetes), não o retângulo envolvente.
function portsPx(cols, rows, budget, routing, corner) {
  return balancedChunks(mkBlock(0, 0, cols, rows, routing, corner), budget);
}

function portsArea(cols, rows, budget, routing, corner) {
  // bloco ~quadrado de área ≤ budget; MAS se a grade limita uma dimensão (ex.:
  // painel estreito), a outra estica pra aproveitar o budget — evita sub-dividir
  // à toa. (bug: 3×6 c/ budget 26 dava 15+3 em vez de um bloco único de 18.)
  let bw = Math.max(1, Math.min(cols, Math.floor(Math.sqrt(budget))));
  let bh = Math.max(1, Math.min(rows, Math.floor(budget / bw)));
  bw = Math.max(1, Math.min(cols, Math.floor(budget / bh)));
  const ports = [];
  for (let by = 0; by < rows; by += bh)
    for (let bx = 0; bx < cols; bx += bw) ports.push(mkBlock(bx, by, Math.min(bw, cols - bx), Math.min(bh, rows - by), routing, corner));
  return ports;
}

// dados derivados do gabinete/tela (orçamentos de sinal e AC)
export function cableMeta(tela) {
  const g = tela?.gabinete || {};
  const cols = tela?.cols || 1, rows = tela?.rows || 1;
  const pxPerCab = (parseFloat(g.resX) || 1) * (parseFloat(g.resY) || 1);
  const fp = parseFloat(g.fp) || 0.9;
  const ampCab = (parseFloat(g.pwrMax) || 0) / (FASE_V * fp);
  const connRating = CONN_AMP[g.conector] || 16;
  const acBudget = Math.max(1, Math.floor((connRating * acMargin) / (ampCab || 1)));
  const s = (tela?.cabling || {}).sinal || {};
  const sinalBits = s.bits === 10 ? 10 : 8; // profundidade de cor (8-bit padrão)
  const sinalRule = s.rule === "px" ? "px" : "area"; // sem o campo = legado (área) — não muda projetos existentes
  const pxPort = Math.floor(((PX_PER_PORT_BY_BITS[sinalBits] || PX_PER_PORT) * 60) / (s.hz || 60));
  const sinalBudget = Math.max(1, Math.floor(pxPort / pxPerCab));
  return { cols, rows, pxPerCab, fp, ampCab, connRating, acBudget, sinalBudget, sinalRule, sinalBits, pxPort };
}

export function buildAuto(cols, rows, strat, bud, rout, numbering, rule = "area", corner = "bl") {
  const p = rule === "px"
    ? portsPx(cols, rows, bud, rout, corner) // régua de pixels: estratégia de bandas não se aplica
    : strat === "coluna" ? portsColuna(cols, rows, bud, rout, corner) : strat === "area" ? portsArea(cols, rows, bud, rout, corner) : portsLinha(cols, rows, bud, rout, corner);
  return orderPorts(p, numbering);
}

export function signalRoute(tela, numbering) {
  const { cols, rows, sinalBudget, sinalRule } = cableMeta(tela);
  const s = (tela?.cabling || {}).sinal || {};
  return s.strategy === "livre"
    ? (s.cables || []).map((ks) => ks.map(parseKey)).filter((p) => p.length)
    : buildAuto(cols, rows, s.strategy || "linha", sinalBudget, s.routing || "updown", numbering, sinalRule, s.corner || "bl");
}

// AC "atrelado ao sinal": segue a rota de cada cabo de sinal, mas parte em
// segmentos de AC BALANCEADOS (mesmo nº de cabos do guloso, porém equilibrados
// — evita um cabo cheio + uma sobra minúscula). Fonte única p/ a aba Cabeamento,
// o Test Card, o Relatório e o "importar do sinal" do modo livre.
export function acRouteFromSignal(tela, numbering) {
  const { acBudget } = cableMeta(tela);
  return signalRoute(tela, numbering).flatMap((p) => balancedChunks(p, acBudget));
}

// portas/cabos de uma tela para um modo, a partir da config persistida em tela.cabling
export function cablePorts(tela, mode, numbering = "row-tb-lr") {
  const { cols, rows, acBudget, sinalBudget, sinalRule } = cableMeta(tela);
  const cfg = (tela?.cabling || {})[mode] || {};
  const strategy = cfg.strategy || "linha";
  const routing = cfg.routing || "updown";
  const budget = mode === "sinal" ? sinalBudget : acBudget;
  if (strategy === "livre") return (cfg.cables || []).map((ks) => ks.map(parseKey));
  if (mode === "ac" && strategy === "sinal") return acRouteFromSignal(tela, numbering);
  return buildAuto(cols, rows, strategy, budget, routing, numbering, mode === "sinal" ? sinalRule : "area", cfg.corner || "bl");
}
