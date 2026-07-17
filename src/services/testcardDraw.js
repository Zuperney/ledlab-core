// services/testcardDraw.js — motor de desenho do test card (canvas 2D).
// Extraído de ProjectTestCard.jsx: é lógica pura de render (sem React), usada
// pela aba Test Card e pela Composição. Manter aqui também deixa o arquivo do
// componente só com componentes (fast refresh limpo).
import { PALETTE } from "../ui/tokens.js";

const BAR_COLORS = ["#ffffff", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff"];

export const DEFAULTS = { scheme: "cores", rainbowDir: "h", solidColor: "#ffffff", solidAlpha: false, numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, numScale: 1, colorBar: "off", cableMap: "off", info: true, infoPos: "inf-esq", infoInline: false };

export const PRESETS = {
  map: { scheme: "cores", numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, colorBar: "off", cableMap: "off", info: true },
  align: { scheme: "cores", numbers: false, junctions: true, circle: true, cross: true, corner: true, side: true, colorBar: "off", cableMap: "off", info: false },
  solid: { scheme: "solida", solidColor: "#ffffff", solidAlpha: false, numbers: false, junctions: false, circle: false, cross: false, corner: false, side: false, colorBar: "off", cableMap: "off", info: false },
  bars: { scheme: "solida", solidColor: "#000000", numbers: false, junctions: false, circle: false, cross: false, corner: false, side: false, colorBar: "centro", cableMap: "off", info: false },
  cabsig: { scheme: "cores", numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, colorBar: "off", cableMap: "sinal", info: true },
};

function textOn(hex) {
  const h = (hex || "").replace("#", "");
  if (h.length < 6) return "#fff";
  const L = (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255;
  return L > 0.6 ? "#111" : "#fff";
}

function cellColor(o, c, r, cols, rows) {
  if (o.scheme === "solida") return o.solidColor;
  if (o.scheme === "arcoiris") {
    const t = o.rainbowDir === "v" ? r / Math.max(1, rows - 1) : o.rainbowDir === "d" ? (c + r) / Math.max(1, cols - 1 + (rows - 1)) : c / Math.max(1, cols - 1);
    return `hsl(${Math.round(t * 360)},85%,55%)`;
  }
  if (o.scheme === "cinza") return `hsl(0,0%,${Math.round((c / Math.max(1, cols - 1)) * 100)}%)`; // preto→branco por coluna
  return PALETTE[(r * cols + c) % PALETTE.length];
}

// portNums = o número REAL de cada porta de mapPorts (1-based), paralelo ao array.
// Não é um offset: com a corrente atravessando telas, uma tela pode carregar as
// portas 3, 4 e 7 — números não contíguos, que offset nenhum descreve. Sem ele,
// numera 1..N local (ferramenta avulsa).
export function draw(canvas, tela, o, mapPorts, cablePal, portNums) {
  const cols = tela.cols || 1, rows = tela.rows || 1;
  const g = tela.gabinete || {};
  const resX = parseFloat(g.resX) || 128, resY = parseFloat(g.resY) || 128;
  const W = cols * resX, H = rows * resY;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const locked = o.scheme === "cinza"; // predefinição de calibração: travada
  const transparent = o.scheme === "solida" && o.solidAlpha;

  ctx.clearRect(0, 0, W, H);
  if (!transparent) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }

  // células
  const numColor = o.scheme === "solida" ? (transparent ? "#fff" : textOn(o.solidColor)) : "#fff";
  let n = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * resX, y = r * resY;
      if (!transparent) { ctx.fillStyle = cellColor(o, c, r, cols, rows); ctx.fillRect(x, y, resX, resY); }
      if (!locked && o.junctions) { ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = Math.max(1, resX * 0.02); ctx.strokeRect(x, y, resX, resY); }
      if (!locked && o.numbers) {
        ctx.fillStyle = numColor;
        ctx.font = `700 ${resY * 0.28 * o.numScale}px system-ui, sans-serif`;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(String(n), x + resX * 0.08, y + resY * 0.06);
      }
      n++;
    }
  }
  if (locked) return; // grayscale = só o gradiente

  // barras de cor (topo / base / centro)
  if (o.colorBar !== "off") {
    const barH = H * 0.12, bw = W / BAR_COLORS.length;
    const y0 = o.colorBar === "topo" ? 0 : o.colorBar === "centro" ? (H - barH) / 2 : H - barH;
    BAR_COLORS.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * bw, y0, bw, barH); });
  }

  // geometria
  ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = Math.max(2, W * 0.002);
  if (o.cross) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.moveTo(W, 0); ctx.lineTo(0, H); ctx.stroke(); }
  if (o.circle) { ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - ctx.lineWidth, 0, Math.PI * 2); ctx.stroke(); } // ocupa o máximo
  const rr = Math.min(W, H) * 0.08;
  if (o.corner) { for (const [x, y] of [[rr, rr], [W - rr, rr], [rr, H - rr], [W - rr, H - rr]]) { ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke(); } }
  if (o.side) { // semicírculos: círculo centrado na borda; o canvas corta a metade externa
    const sr = Math.min(W, H) * 0.28;
    for (const [x, y] of [[W / 2, 0], [W / 2, H], [0, H / 2], [W, H / 2]]) { ctx.beginPath(); ctx.arc(x, y, sr, 0, Math.PI * 2); ctx.stroke(); }
  }

  // mapa de cabos (consistente com a aba Cabeamento)
  if (o.cableMap !== "off" && mapPorts) {
    const cx = (c) => c * resX + resX / 2, cy = (r) => r * resY + resY / 2;
    ctx.lineWidth = Math.max(3, resX * 0.06);
    mapPorts.forEach((port, pi) => {
      if (!port.length) return;
      const n = portNums?.[pi] ?? pi + 1;
      const col = cablePal[(n - 1) % cablePal.length];
      ctx.strokeStyle = "#fff"; ctx.beginPath();
      port.forEach((cell, i) => { const x = cx(cell.c), y = cy(cell.r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      const f = port[0]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx(f.c), cy(f.r), resY * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(2, resX * 0.02); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = `700 ${resY * 0.26}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(n), cx(f.c), cy(f.r));
    });
  }

  // caixa de info — layout DINÂMICO: quebra automaticamente em 1–5 linhas pra MAXIMIZAR
  // a fonte legível na resolução da tela. Telas achatadas/estreitas ganham menos linhas
  // (fonte maior); telas normais mantêm as 5 linhas. Empate de fonte → a caixa com
  // proporção mais parecida com a da tela. Nunca passa do teto (não domina telas grandes)
  // nem estoura o canvas. Resolve a info virar minúscula em telas de baixa resolução.
  if (o.info) {
    const SEP = "   ·   ";
    const fields = [tela.nome, `${W} x ${H} px`, `${cols} × ${rows} = ${cols * rows} gab`];
    if (parseFloat(g.dimW) > 0 && parseFloat(g.dimH) > 0) // só com gabinete definido (evita "NaN")
      fields.push(`pitch ${(parseFloat(g.dimW) / resX).toFixed(2)} mm`, `${(cols * parseFloat(g.dimW) / 1000).toFixed(2)} x ${(rows * parseFloat(g.dimH) / 1000).toFixed(2)} m`);
    // distribui os campos em k linhas equilibrando o comprimento de cada uma
    const groupInto = (k) => {
      if (k <= 1) return [fields.join(SEP)];
      if (k >= fields.length) return fields.slice();
      const len = (f) => f.length + 3;
      const per = fields.reduce((s, f) => s + len(f), 0) / k;
      const out = [], cur = []; let acc = 0;
      for (let i = 0; i < fields.length; i++) {
        cur.push(fields[i]); acc += len(fields[i]);
        if (out.length < k - 1 && acc >= per && fields.length - i - 1 > k - out.length - 1) { out.push(cur.join(SEP)); cur.length = 0; acc = 0; }
      }
      if (cur.length) out.push(cur.join(SEP));
      return out;
    };
    const measure = (arr, size) => {
      ctx.font = `600 ${size}px ui-monospace, monospace`;
      const pad = size * 0.6;
      return { bw: Math.max(...arr.map((l) => ctx.measureText(l).width)) + pad * 2, bh: arr.length * size * 1.3 + pad, pad };
    };
    const cap = Math.pow(W * H, 0.25) * 0.85; // teto da fonte: evita a caixa dominar telas grandes
    // maior fonte que cabe (≤ 90% do canvas) por candidato de nº de linhas, limitada ao teto
    const cands = (o.infoInline ? [1] : [5, 4, 3, 2, 1]).map((k) => {
      const arr = groupInto(k);
      const m = measure(arr, 100);
      return { arr, fs: Math.min(cap, 100 * Math.min((W * 0.9) / m.bw, (H * 0.9) / m.bh)) };
    });
    const maxFs = Math.max(...cands.map((c) => c.fs));
    const aspect = H / W;
    // entre os que empatam na maior fonte, escolhe a caixa de proporção mais parecida com a tela
    const best = cands
      .filter((c) => c.fs >= maxFs * 0.98)
      .map((c) => { const m = measure(c.arr, c.fs); return { arr: c.arr, fs: c.fs, m, d: Math.abs(Math.log(m.bh / m.bw / aspect)) }; })
      .sort((a, b) => a.d - b.d)[0];
    const lines = best.arr, fs = best.fs, b = best.m;
    ctx.font = `600 ${fs}px ui-monospace, monospace`;
    const center = o.infoPos === "centro";
    const top = o.infoPos.startsWith("sup"), left = o.infoPos.endsWith("esq");
    const bx = center ? (W - b.bw) / 2 : left ? b.pad : W - b.bw - b.pad;
    const by = center ? (H - b.bh) / 2 : top ? b.pad : H - b.bh - b.pad;
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(bx, by, b.bw, b.bh);
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, bx + b.pad, by + b.pad / 2 + i * fs * 1.3));
  }
}
