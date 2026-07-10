// services/cabling.js — lógica de roteamento de cabos (sinal e AC), COMPARTILHADA
// pela aba Cabeamento e pelo overlay "Mapa de cabos" do Test Card (mantém consistência).
//
// SINAL (Novastar básico): capacidade da porta pela ÁREA RETANGULAR (bounding box).
// Cabo inicia no canto inferior-esquerdo; parte principal "reta" + sobra combinada.

// Constantes elétricas/sinal — fonte única em src/config/electricalConfig.js
import { PX_PER_PORT, FASE_V, CONN_AMP } from "../config/electricalConfig.js";
export { PX_PER_PORT, FASE_V, CONN_AMP };

export const range = (n) => [...Array(Math.max(0, n)).keys()];
export const key = (c, r) => `${r},${c}`;
export const parseKey = (k) => { const [r, c] = k.split(",").map(Number); return { c, r }; };
export const bboxArea = (p) => { let a = 1e9, b = -1, c = 1e9, d = -1; for (const x of p) { a = Math.min(a, x.c); b = Math.max(b, x.c); c = Math.min(c, x.r); d = Math.max(d, x.r); } return p.length ? (b - a + 1) * (d - c + 1) : 0; };
export const chunkArr = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };

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

function blockUpDown(bx, by, W, H) {
  const block = [];
  for (let ci = 0; ci < W; ci++) {
    const c = bx + ci;
    const col = range(H).map((i) => by + i);
    (ci % 2 === 0 ? col.slice().reverse() : col).forEach((r) => block.push({ c, r }));
  }
  return block;
}
function blockZigZag(bx, by, W, H) {
  const block = [];
  for (let ri = 0; ri < H; ri++) {
    const r = by + (H - 1 - ri);
    const cc = range(W).map((i) => bx + i);
    (ri % 2 === 0 ? cc : cc.slice().reverse()).forEach((c) => block.push({ c, r }));
  }
  return block;
}
export const mkBlock = (bx, by, W, H, routing) => (routing === "zigzag" ? blockZigZag : blockUpDown)(bx, by, W, H);

function portsLinha(cols, rows, budget, routing) {
  const ports = []; let bx = 0;
  for (const w of bands(cols, budget)) {
    const h = Math.max(1, Math.floor(budget / w));
    for (let by = 0; by < rows; by += h) ports.push(mkBlock(bx, by, Math.min(w, cols - bx), Math.min(h, rows - by), routing));
    bx += w;
  }
  return ports;
}
function portsColuna(cols, rows, budget, routing) {
  const ports = []; let by = 0;
  for (const h of bands(rows, budget)) {
    const w = Math.max(1, Math.floor(budget / h));
    for (let bx = 0; bx < cols; bx += w) ports.push(mkBlock(bx, by, Math.min(w, cols - bx), Math.min(h, rows - by), routing));
    by += h;
  }
  return ports;
}
function portsArea(cols, rows, budget, routing) {
  // bloco ~quadrado de área ≤ budget; MAS se a grade limita uma dimensão (ex.:
  // painel estreito), a outra estica pra aproveitar o budget — evita sub-dividir
  // à toa. (bug: 3×6 c/ budget 26 dava 15+3 em vez de um bloco único de 18.)
  let bw = Math.max(1, Math.min(cols, Math.floor(Math.sqrt(budget))));
  let bh = Math.max(1, Math.min(rows, Math.floor(budget / bw)));
  bw = Math.max(1, Math.min(cols, Math.floor(budget / bh)));
  const ports = [];
  for (let by = 0; by < rows; by += bh)
    for (let bx = 0; bx < cols; bx += bw) ports.push(mkBlock(bx, by, Math.min(bw, cols - bx), Math.min(bh, rows - by), routing));
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
  const acBudget = Math.max(1, Math.floor(connRating / (ampCab || 1)));
  const cabling = tela?.cabling || {};
  const sinalBudget = Math.max(1, Math.floor(Math.floor((PX_PER_PORT * 60) / ((cabling.sinal || {}).hz || 60)) / pxPerCab));
  return { cols, rows, pxPerCab, fp, ampCab, connRating, acBudget, sinalBudget };
}

export function buildAuto(cols, rows, strat, bud, rout, numbering) {
  const p = strat === "coluna" ? portsColuna(cols, rows, bud, rout) : strat === "area" ? portsArea(cols, rows, bud, rout) : portsLinha(cols, rows, bud, rout);
  return orderPorts(p, numbering);
}

export function signalRoute(tela, numbering) {
  const { cols, rows, sinalBudget } = cableMeta(tela);
  const s = (tela?.cabling || {}).sinal || {};
  return s.strategy === "livre"
    ? (s.cables || []).map((ks) => ks.map(parseKey)).filter((p) => p.length)
    : buildAuto(cols, rows, s.strategy || "linha", sinalBudget, s.routing || "updown", numbering);
}

// portas/cabos de uma tela para um modo, a partir da config persistida em tela.cabling
export function cablePorts(tela, mode, numbering = "row-tb-lr") {
  const { cols, rows, acBudget, sinalBudget } = cableMeta(tela);
  const cfg = (tela?.cabling || {})[mode] || {};
  const strategy = cfg.strategy || "linha";
  const routing = cfg.routing || "updown";
  const budget = mode === "sinal" ? sinalBudget : acBudget;
  if (strategy === "livre") return (cfg.cables || []).map((ks) => ks.map(parseKey));
  if (mode === "ac" && strategy === "sinal") return signalRoute(tela, numbering).flatMap((p) => chunkArr(p, acBudget));
  return buildAuto(cols, rows, strategy, budget, routing, numbering);
}
