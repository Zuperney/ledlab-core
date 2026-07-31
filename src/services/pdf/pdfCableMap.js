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
import { compLayout, overlappingIds, regionEdges } from "../layout.js";

const BG = "#0d0d1a"; // mesmo fundo do mapa no DOM (identidade do mapa, v1.5.3)
const UNASSIGNED = "#3f3f5a";
const CELL = 40; // tamanho da célula no modo legado (como o CableMap do DOM)

const r2 = (n) => Math.round(n * 100) / 100;
// nome de tela é texto LIVRE — escapa o que quebraria o XML do SVG
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cx = (c) => c.x + c.w / 2;
const cy = (c) => c.y + c.h / 2;

const textAttrs = (fs, anchor) => `font-family="PlexSans" font-size="${r2(fs)}" font-weight="bold" text-anchor="${anchor}"`;

// camada do mapa SIMPLIFICADO do Caderno (decisão do dono, 31/07): o impresso é
// ORIENTAÇÃO DE MONTAGEM, não rascunho — por cabo ficam só a REGIÃO (contorno
// forte na cor), o selo de ENTRADA (onde o cabo chega) e a CONTAGEM de
// gabinetes. Saíram: número de ordem por gabinete, trajeto e setas — esses são
// ferramenta de trabalho e continuam na aba Cabeamento/Diagramação.
function layerSvg(cells, ports, colorOf, { portOffset = 0, showCount = true }) {
  const out = [];

  // gabinetes — quadrados e encostados; grade SUAVE dentro da região (o
  // gabinete individual ainda se conta no olho), tracejado onde não há cabo
  for (const cell of cells) {
    const assigned = cell.port != null;
    const col = assigned ? colorOf(cell.port) : UNASSIGNED;
    out.push(`<rect x="${r2(cell.x)}" y="${r2(cell.y)}" width="${r2(cell.w)}" height="${r2(cell.h)}" fill="${assigned ? col : "none"}" fill-opacity="0.15" stroke="${col}" stroke-width="${assigned ? "0.5" : "1"}"${assigned ? ' stroke-opacity="0.35"' : ' stroke-dasharray="4 4"'}/>`);
  }

  ports.forEach((port, pi) => {
    if (!port.length) return;
    const col = colorOf(pi);
    // contorno FORTE da região do cabo (arestas não compartilhadas — segue L/serpentina)
    for (const e of regionEdges(port)) {
      out.push(`<line x1="${r2(e.x1)}" y1="${r2(e.y1)}" x2="${r2(e.x2)}" y2="${r2(e.y2)}" stroke="${col}" stroke-width="2" stroke-linecap="square"/>`);
    }
    const f = port[0];
    const u = Math.min(f.w, f.h);
    // contagem no centro da célula do MEIO da corrente (sempre dentro, mesmo em L)
    const m = port[Math.floor(port.length / 2)];
    if (showCount && port.length > 1 && u >= 12) {
      const fs = Math.max(6, u * 0.3);
      const label = `${port.length} gab`;
      out.push(`<text x="${r2(cx(m))}" y="${r2(cy(m) + fs * 0.35)}" ${textAttrs(fs, "middle")} fill="none" stroke="#0a0a14" stroke-width="${r2(fs * 0.16)}">${label}</text>`);
      out.push(`<text x="${r2(cx(m))}" y="${r2(cy(m) + fs * 0.35)}" ${textAttrs(fs, "middle")} fill="#ffffff">${label}</text>`);
    }
    // selo de ENTRADA (onde o cabo chega), com o número do cabo — um degrau maior
    const rad = u * 0.32;
    out.push(`<circle cx="${r2(cx(f))}" cy="${r2(cy(f))}" r="${r2(rad)}" fill="${col}" stroke="#ffffff" stroke-width="${r2(Math.max(1.2, u * 0.045))}"/>`);
    out.push(`<text x="${r2(cx(f))}" y="${r2(cy(f) + rad * 0.38)}" ${textAttrs(rad * 1.05, "middle")} fill="#ffffff">${portOffset + pi + 1}</text>`);
  });

  return out.join("");
}

// normaliza células/portas pro retângulo do documento e fecha o <svg> com fundo.
// `cr` (prefs cablingRender: setas/números) NÃO afeta mais o impresso — são
// knobs das ferramentas de trabalho; o Caderno usa sempre o modo simplificado.
function wrapSvg(cells, ports, colorOf, cr, { portOffset = 0, maxWidth = 480, maxHeight = 160 } = {}) {
  if (!cells.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); }
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const scale = Math.min(maxWidth / bw, maxHeight / bh, 1);
  const W = bw * scale, H = bh * scale;
  const put = (c) => ({ k: c.k, x: (c.x - minX) * scale, y: (c.y - minY) * scale, w: c.w * scale, h: c.h * scale, port: c.port });
  const drawCells = cells.map(put);
  const drawPorts = ports.map((port) => port.map(put));
  const pad = 6, vw = W + pad * 2, vh = H + pad * 2;
  const body = layerSvg(drawCells, drawPorts, colorOf, { portOffset });
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

// ESQUEMA DAS TELAS (seção Vídeo) — espelho do ReportTelasCanvas do DOM: cada
// tela é um bloco na cor do MODELO (mesma sequência dos chips "Gabinetes
// utilizados"), nome dentro, na DISPOSIÇÃO REAL da Composição (project.comp.pos
// via compLayout; sem posição salva o fallback é a fila lado a lado de sempre).
// Tela sobreposta ganha contorno vermelho (mesma segurança da aba Composição).
// Devolve também a resolução do bbox pra legenda.
export function telasLayoutSvg(telas, compPos, colorOf, { maxWidth = 620, maxHeight = 240 } = {}) {
  if (!telas?.length) return null;
  const { pos, dims, bbox } = compLayout(telas, compPos);
  const models = [...new Set(telas.filter((t) => t.gabinete?.nome).map((t) => t.gabinete.nome))];
  const colOf = (t) => colorOf(Math.max(0, models.indexOf(t.gabinete?.nome)));
  const overlap = overlappingIds(telas.map((t) => ({ id: t.id, ...pos[t.id], ...dims[t.id] })));

  const bw = bbox.w || 1, bh = bbox.h || 1;
  const scale = Math.min(maxWidth / bw, maxHeight / bh);
  const W = bw * scale, H = bh * scale;

  const out = [`<rect x="0" y="0" width="${r2(W)}" height="${r2(H)}" rx="6" fill="${BG}"/>`];
  for (const t of telas) {
    const d = dims[t.id], p = pos[t.id];
    const x = (p.x - bbox.minX) * scale, y = (p.y - bbox.minY) * scale, w = d.w * scale, h = d.h * scale;
    const col = overlap.has(t.id) ? "#ef4444" : colOf(t);
    const nome = String(t.nome || "Tela");
    const fs = Math.max(5, Math.min(14, Math.min(h * 0.26, w / (Math.max(4, nome.length) * 0.62))));
    const showRes = w > 56 && h > fs * 3.4; // resolução só quando cabe no bloco
    out.push(`<rect x="${r2(x)}" y="${r2(y)}" width="${r2(w)}" height="${r2(h)}" fill="${col}" fill-opacity="0.2" stroke="${col}" stroke-width="1.5"/>`);
    if (w > 20) {
      const ty = y + (showRes ? h / 2 - fs * 0.2 : h / 2) + fs * 0.35; // baseline manual (sem dominant-baseline)
      out.push(`<text x="${r2(x + w / 2)}" y="${r2(ty)}" ${textAttrs(fs, "middle")} fill="none" stroke="${BG}" stroke-width="${r2(fs * 0.14)}">${esc(nome)}</text>`);
      out.push(`<text x="${r2(x + w / 2)}" y="${r2(ty)}" ${textAttrs(fs, "middle")} fill="#ffffff">${esc(nome)}</text>`);
      if (showRes) out.push(`<text x="${r2(x + w / 2)}" y="${r2(ty + fs * 1.05)}" font-family="PlexSans" font-size="${r2(fs * 0.72)}" text-anchor="middle" fill="#cbd5e1">${d.w} × ${d.h}</text>`);
    }
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(W)}" height="${r2(H)}" viewBox="0 0 ${r2(W)} ${r2(H)}">${out.join("")}</svg>`;
  return { svg, width: r2(W), height: r2(H), linW: Math.round(bbox.w), linH: Math.round(bbox.h) };
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
