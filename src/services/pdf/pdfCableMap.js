// services/pdf/pdfCableMap.js — o mapa de cabos VISUAL do Caderno em PDF: gera a
// STRING de SVG que o pdfmake desenha vetorial (nó { svg }). Geometria espelhada
// do components/CablingLayer.jsx (gabinetes quadrados encostados, número da ordem
// no canto, trajeto branco com setas, selo de início colorido) — se mudar lá,
// muda aqui. Diferenças forçadas pelo motor de SVG do pdfmake:
//   • sem paint-order: o contorno do número vira DUAS passadas (stroke → fill);
//   • sem hex com alpha (#xxxxxxNN): fill-opacity separado;
//   • sem dominant-baseline confiável: o baseline entra na conta do y.
// PURO de propósito (string → string): testável sem pdfmake nem DOM.
import { screenCells, screenPorts, cellPortIndex } from "../screenCabling.js";
import { key, cablePorts } from "../cabling.js";

const BG = "#0d0d1a"; // mesmo fundo do mapa no DOM (identidade do mapa, v1.5.3)
const UNASSIGNED = "#3f3f5a";
const NSIZE = { sm: 0.26, md: 0.34, lg: 0.42 }; // fração do gabinete → fonte do número
const CELL = 40; // tamanho da célula no modo legado (como o CableMap do DOM)

const r2 = (n) => Math.round(n * 100) / 100;
const cx = (c) => c.x + c.w / 2;
const cy = (c) => c.y + c.h / 2;

// posição do número num canto (respiro p) → x, baseline-y e âncora (baseline manual)
const numPos = (c, p, fs, corner) => ({
  tl: { x: c.x + p, y: c.y + p + fs * 0.82, a: "start" },
  tr: { x: c.x + c.w - p, y: c.y + p + fs * 0.82, a: "end" },
  bl: { x: c.x + p, y: c.y + c.h - p, a: "start" },
  br: { x: c.x + c.w - p, y: c.y + c.h - p, a: "end" },
}[corner] || { x: c.x + p, y: c.y + c.h - p, a: "start" });

const textAttrs = (fs, anchor) => `font-family="Helvetica" font-size="${r2(fs)}" font-weight="bold" text-anchor="${anchor}"`;

// camada do mapa: células/portas já em coordenadas de desenho
function layerSvg(cells, ports, colorOf, { portOffset = 0, showNumbers, arrows, numberSize, numberPos }) {
  const seqOf = {};
  ports.forEach((port) => port.forEach((cell, i) => { seqOf[cell.k] = i + 1; }));
  const nsize = NSIZE[numberSize] ?? NSIZE.sm;
  const out = [];

  // gabinetes — quadrados e encostados
  for (const cell of cells) {
    const assigned = cell.port != null;
    const col = assigned ? colorOf(cell.port) : UNASSIGNED;
    out.push(`<rect x="${r2(cell.x)}" y="${r2(cell.y)}" width="${r2(cell.w)}" height="${r2(cell.h)}" fill="${assigned ? col : "none"}" fill-opacity="0.15" stroke="${col}" stroke-width="1"${assigned ? "" : ' stroke-dasharray="4 4"'}/>`);
  }

  // número da ordem no cabo, num canto (contorno escuro em passada própria)
  if (showNumbers) {
    for (const cell of cells) {
      if (cell.port == null) continue;
      const u = Math.min(cell.w, cell.h);
      const fs = u * nsize;
      const p = numPos(cell, u * 0.16, fs, numberPos);
      const n = seqOf[cell.k];
      out.push(`<text x="${r2(p.x)}" y="${r2(p.y)}" ${textAttrs(fs, p.a)} fill="none" stroke="#0a0a14" stroke-width="${r2(fs * 0.16)}">${n}</text>`);
      out.push(`<text x="${r2(p.x)}" y="${r2(p.y)}" ${textAttrs(fs, p.a)} fill="#ffffff">${n}</text>`);
    }
  }

  // trajeto + setas + selo de início (o fim não é marcado, de propósito)
  ports.forEach((port, pi) => {
    if (!port.length) return;
    const pts = port.map((c) => [cx(c), cy(c)]);
    const d = pts.map((p, i) => (i ? "L" : "M") + `${r2(p[0])} ${r2(p[1])}`).join(" ");
    const f = port[0];
    const u = Math.min(f.w, f.h);
    const rad = u * 0.28;
    out.push(`<path d="${d}" fill="none" stroke="#ffffff" stroke-width="${r2(Math.max(1.6, u * 0.06))}" stroke-linejoin="round" stroke-linecap="round" opacity="0.92"/>`);
    if (arrows) {
      const size = u * 0.14;
      for (let i = 0; i < pts.length - 1; i++) {
        const a = pts[i], b = pts[i + 1];
        const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
        const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
        out.push(`<path d="M ${r2(-size)} ${r2(-size * 0.85)} L ${r2(size)} 0 L ${r2(-size)} ${r2(size * 0.85)} Z" fill="#ffffff" transform="translate(${r2(mx)},${r2(my)}) rotate(${r2(ang)})"/>`);
      }
    }
    out.push(`<circle cx="${r2(cx(f))}" cy="${r2(cy(f))}" r="${r2(rad)}" fill="${colorOf(pi)}" stroke="#ffffff" stroke-width="${r2(Math.max(1.2, u * 0.045))}"/>`);
    out.push(`<text x="${r2(cx(f))}" y="${r2(cy(f) + rad * 0.38)}" ${textAttrs(rad * 1.05, "middle")} fill="#ffffff">${portOffset + pi + 1}</text>`);
  });

  return out.join("");
}

// normaliza células/portas pro retângulo do documento e fecha o <svg> com fundo
function wrapSvg(cells, ports, colorOf, cr, { portOffset = 0, maxWidth = 480, maxHeight = 200 } = {}) {
  if (!cells.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); }
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const scale = Math.min(maxWidth / bw, maxHeight / bh, 1);
  const W = bw * scale, H = bh * scale;
  const put = (c) => ({ k: c.k, x: (c.x - minX) * scale, y: (c.y - minY) * scale, w: c.w * scale, h: c.h * scale, port: c.port });
  const drawCells = cells.map(put);
  const drawPorts = ports.map((port) => port.map(put));
  const cellPx = Math.min(cells[0]?.w || CELL, cells[0]?.h || CELL) * scale;
  const showNumbers = (cr.numbers ?? true) && cellPx >= 14; // gabinete miúdo esconde o número (como no DOM)
  const pad = 6, vw = W + pad * 2, vh = H + pad * 2;
  const body = layerSvg(drawCells, drawPorts, colorOf, { portOffset, showNumbers, arrows: cr.arrows ?? true, numberSize: cr.numberSize || "sm", numberPos: cr.numberPos || "bl" });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(vw)}" height="${r2(vh)}" viewBox="0 0 ${r2(vw)} ${r2(vh)}"><rect x="0" y="0" width="${r2(vw)}" height="${r2(vh)}" rx="6" fill="${BG}"/><g transform="translate(${pad},${pad})">${body}</g></svg>`;
  return { svg, width: r2(vw), height: r2(vh) };
}

// mapa de uma SCREEN (sinal ou AC) — mesmos dados do ScreenCableMap do DOM
export function screenMapSvg(screen, telas, kind, numbering, colorOf, cr, opts) {
  const cellKey = (c) => `${c.telaId}:${c.c},${c.r}`;
  const cells = screenCells(screen, telas);
  if (!cells.length) return null;
  const ports = screenPorts(screen, telas, kind, numbering);
  const portOf = cellPortIndex(ports);
  return wrapSvg(
    cells.map((c) => ({ k: cellKey(c), x: c.x, y: c.y, w: c.w, h: c.h, port: portOf[cellKey(c)] ?? null })),
    ports.map((port) => port.map((c) => ({ k: cellKey(c), x: c.x, y: c.y, w: c.w, h: c.h }))),
    colorOf, cr, opts
  );
}

// mapa de uma TELA (modo legado) — grade cols×rows, numeração global via offset
export function telaMapSvg(tela, mode, numbering, offset, colorOf, cr, opts) {
  const cols = tela?.cols || 1, rows = tela?.rows || 1;
  const ports = cablePorts(tela, mode, numbering);
  const portOf = {};
  ports.forEach((p, i) => p.forEach((cell) => { portOf[key(cell.c, cell.r)] = i; }));
  const cells = [];
  for (let rr = 0; rr < rows; rr++)
    for (let c = 0; c < cols; c++)
      cells.push({ k: key(c, rr), x: c * CELL, y: rr * CELL, w: CELL, h: CELL, port: portOf[key(c, rr)] ?? null });
  const drawPorts = ports.map((port) => port.map((cell) => ({ k: key(cell.c, cell.r), x: cell.c * CELL, y: cell.r * CELL, w: CELL, h: CELL })));
  return wrapSvg(cells, drawPorts, (pi) => colorOf(offset + pi), cr, { ...opts, portOffset: offset });
}
