// services/pdf/pdfCableMap.js — o mapa de cabos VISUAL do Caderno em PDF: gera a
// STRING de SVG que o pdfmake desenha vetorial (nó { svg }). Geometria espelhada
// do components/CablingLayer.jsx modo print — se mudar lá, muda aqui (cores e
// matemática compartilhadas moram em services/cableScene.js). Restrições do
// motor de SVG do pdfmake:
//   • sem paint-order: texto contornado seria DUAS passadas (stroke → fill);
//   • sem hex com alpha (#xxxxxxNN): pastel é hex real via tint();
//   • sem dominant-baseline confiável: o baseline entra na conta do y;
//   • sem depender de transform: setas são paths absolutos (arrowPath).
// PURO de propósito (string → string): testável sem pdfmake nem DOM.
import { screenCells, screenPorts, cellPortIndex } from "../screenCabling.js";
import { key, cablePorts } from "../cabling.js";
import { compLayout, overlappingIds, regionEdges } from "../layout.js";
import { tint, routePoints, arrowPath, ROUTE, ENTRY, END, FRAME, UNASSIGNED } from "../cableScene.js";

const BG = "#0d0d1a"; // fundo do ESQUEMA DE TELAS (seção Vídeo — identidade v1.5.3)
const CELL = 40; // tamanho da célula no modo legado (como o CableMap do DOM)

const r2 = (n) => Math.round(n * 100) / 100;
const PRINT_ACC = "#4d5500"; // oliva do papel (manual §2.4) — a geometria do card
const ptBRn = (n) => (n || 0).toLocaleString("pt-BR");
const vg = (n) => (n || 0).toFixed(2).replace(".", ",");
// nome de tela é texto LIVRE — escapa o que quebraria o XML do SVG
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const cx = (c) => c.x + c.w / 2;
const cy = (c) => c.y + c.h / 2;

const textAttrs = (fs, anchor) => `font-family="PlexSans" font-size="${r2(fs)}" font-weight="bold" text-anchor="${anchor}"`;

// camada do mapa impresso, estilo SmartLCT (decisão do dono, 02/08): cada cabo
// PINTA sua região com pastel da própria cor, a SERPENTINA azul mostra a ordem
// elétrica real com setas, a ENTRADA é selo verde numerado e o FIM é ponto
// vermelho — a convenção que o técnico já conhece do export do LCT. Sem texto
// dentro do gabinete; a contagem vive na tabela de portas da mesma folha.
function layerSvg(cells, ports, colorOf, { portOffset = 0 }) {
  const out = [];

  // gabinetes — pastel sólido + grade branca fina onde há cabo (o gabinete
  // individual se conta no olho); tracejado cinza onde não há
  for (const cell of cells) {
    const assigned = cell.port != null;
    out.push(assigned
      ? `<rect x="${r2(cell.x)}" y="${r2(cell.y)}" width="${r2(cell.w)}" height="${r2(cell.h)}" fill="${tint(colorOf(cell.port))}" stroke="#ffffff" stroke-width="0.75"/>`
      : `<rect x="${r2(cell.x)}" y="${r2(cell.y)}" width="${r2(cell.w)}" height="${r2(cell.h)}" fill="none" stroke="${UNASSIGNED}" stroke-width="1" stroke-dasharray="4 4"/>`);
  }

  ports.forEach((port, pi) => {
    if (!port.length) return;
    // borda BRANCA da região (separador entre pasteis vizinhos; segue L/serpentina)
    for (const e of regionEdges(port)) {
      out.push(`<line x1="${r2(e.x1)}" y1="${r2(e.y1)}" x2="${r2(e.x2)}" y2="${r2(e.y2)}" stroke="#ffffff" stroke-width="2" stroke-linecap="square"/>`);
    }
    const f = port[0];
    const u = Math.min(f.w, f.h);
    const pts = routePoints(port);
    if (pts.length > 1) {
      // serpentina na ordem elétrica; setas somem quando a célula fica pequena
      // demais no papel (degraus de densidade) — a rota fina fica
      const d = "M" + pts.map((p) => `${p[0]} ${p[1]}`).join(" L");
      out.push(`<path d="${d}" fill="none" stroke="${ROUTE}" stroke-width="${r2(Math.max(1, u * 0.06))}" stroke-linejoin="round" stroke-linecap="round"/>`);
      if (u >= 9) {
        for (let i = 0; i < pts.length - 1; i++) {
          const ap = arrowPath(pts[i], pts[i + 1], u * 0.16);
          if (ap) out.push(`<path d="${ap}" fill="${ROUTE}"/>`);
        }
      }
      // fim do cabo — cabo de 1 gabinete não entra aqui: o selo basta
      const last = pts[pts.length - 1];
      out.push(`<circle cx="${last[0]}" cy="${last[1]}" r="${r2(Math.max(2, u * 0.14))}" fill="${END}" stroke="#ffffff" stroke-width="1"/>`);
    }
    // selo de ENTRADA verde com o número do cabo — número branco em UMA passada
    // (o contorno escuro de antes existia por causa do fundo variável)
    const rad = u * 0.32;
    out.push(`<circle cx="${r2(cx(f))}" cy="${r2(cy(f))}" r="${r2(rad)}" fill="${ENTRY}" stroke="#ffffff" stroke-width="${r2(Math.max(1.2, u * 0.045))}"/>`);
    out.push(`<text x="${r2(cx(f))}" y="${r2(cy(f) + rad * 0.38)}" ${textAttrs(rad * 1.05, "middle")} fill="#ffffff">${portOffset + pi + 1}</text>`);
  });

  return out.join("");
}

// normaliza células/portas pro retângulo do documento e fecha o <svg> com fundo.
// `cr` (prefs cablingRender: setas/números) NÃO afeta mais o impresso — são
// knobs das ferramentas de trabalho; o Caderno usa sempre a cena impressa.
function wrapSvg(cells, ports, colorOf, cr, { portOffset = 0, maxWidth = 480, maxHeight = 160, upscale = false } = {}) {
  if (!cells.length) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); }
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  // `upscale` só no mapa que tem a folha inteira pra si: sem ele, parede pequena
  // (poucos gabinetes = bbox de poucos px) parava no tamanho natural e deixava
  // meia página vazia. Nos mapas que dividem a folha com a tabela o teto de 1
  // continua valendo — crescer ali empurraria a tabela pra outra página.
  const scale = upscale
    ? Math.min(maxWidth / bw, maxHeight / bh)
    : Math.min(maxWidth / bw, maxHeight / bh, 1);
  const W = bw * scale, H = bh * scale;
  const put = (c) => ({ k: c.k, x: (c.x - minX) * scale, y: (c.y - minY) * scale, w: c.w * scale, h: c.h * scale, port: c.port });
  const drawCells = cells.map(put);
  const drawPorts = ports.map((port) => port.map(put));
  const pad = 6, vw = W + pad * 2, vh = H + pad * 2;
  const body = layerSvg(drawCells, drawPorts, colorOf, { portOffset });
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(vw)}" height="${r2(vh)}" viewBox="0 0 ${r2(vw)} ${r2(vh)}"><rect x="0.5" y="0.5" width="${r2(vw - 1)}" height="${r2(vh - 1)}" rx="6" fill="#ffffff" stroke="${FRAME}" stroke-width="1"/><g transform="translate(${pad},${pad})">${body}</g></svg>`;
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

// ── ESQUEMA DE VÍDEO (folha de Conteúdo do caderno de Design) ────────────────
// Cada tela vira um retângulo com a geometria de test card (grade de gabinete +
// círculo e diagonais), em ESCALA COMUM: o painel de 16 m sai três vezes o de
// 4,5 m, como no rider que o pessoal de conteúdo já conhece. A resolução vai EM
// CIMA e o tamanho físico EMBAIXO, FORA do desenho — rótulo dentro do painel foi
// o que poluiu a primeira versão da folha.
//
// Escala comum tem um preço: um projeto com uma fita de 12.768 px e um painel de
// 5.376 px espreme o menor. Por isso as telas QUEBRAM EM LINHAS (a mais larga
// define a escala e ocupa a linha dela), e a escala cai junto se o conjunto não
// couber na altura disponível.
export function videoSchemaSvg(telas, { maxWidth = 748, maxHeight = 300, fs = 7 } = {}) {
  const itens = (telas || []).map((t) => {
    const g = t.gabinete || {};
    const resX = parseFloat(g.resX) || 0, resY = parseFloat(g.resY) || 0;
    const cols = t.cols || 0, rows = t.rows || 0;
    return {
      nome: String(t.nome || "Tela"), cols, rows, resX, resY,
      pxW: cols * resX, pxH: rows * resY,
      mW: (cols * (parseFloat(g.dimW) || 0)) / 1000, mH: (rows * (parseFloat(g.dimH) || 0)) / 1000,
    };
  }).filter((i) => i.pxW > 0 && i.pxH > 0);
  if (!itens.length) return null;

  const LBL = fs * 1.6, GAPX = 16, GAPY = fs * 1.4;
  const larguraMax = Math.max(...itens.map((i) => i.pxW));
  const alturaMax = Math.max(...itens.map((i) => i.pxH));
  // escala: a tela mais larga ocupa a linha inteira, e nenhuma passa de 120 pt
  // de altura (senão um canvas quadrado come a folha)
  let k = Math.min(maxWidth / larguraMax, 120 / alturaMax);

  const quebrar = (kk) => {
    const linhas = [[]];
    let larg = 0;
    for (const it of itens) {
      const w = it.pxW * kk;
      const atual = linhas[linhas.length - 1];
      if (atual.length && larg + GAPX + w > maxWidth) { linhas.push([it]); larg = w; }
      else { atual.push(it); larg += (atual.length > 1 ? GAPX : 0) + w; }
    }
    const alturas = linhas.map((l) => Math.max(...l.map((i) => i.pxH * kk)) + LBL * 2);
    return { linhas, alturas, total: alturas.reduce((a, b) => a + b, 0) + GAPY * (linhas.length - 1) };
  };

  let plano = quebrar(k);
  // não coube na altura: encolhe na proporção que falta e refaz a quebra (duas
  // passadas resolvem — a segunda só ajusta o arredondamento da primeira)
  for (let i = 0; i < 2 && plano.total > maxHeight; i++) {
    k *= maxHeight / plano.total;
    plano = quebrar(k);
  }

  const out = [];
  let y = 0;
  for (let li = 0; li < plano.linhas.length; li++) {
    const linha = plano.linhas[li];
    const larguraLinha = linha.reduce((a, i) => a + i.pxW * k, 0) + GAPX * (linha.length - 1);
    let x = (maxWidth - larguraLinha) / 2; // linha centrada, como no rider
    const alturaLinha = plano.alturas[li] - LBL * 2;
    for (const it of linha) {
      const w = it.pxW * k, h = it.pxH * k;
      const py = y + LBL + (alturaLinha - h) / 2; // telas da linha alinhadas pelo centro
      out.push(`<rect x="${r2(x)}" y="${r2(py)}" width="${r2(w)}" height="${r2(h)}" fill="#f8fafc" stroke="${FRAME}" stroke-width="0.8"/>`);
      // grade de gabinete: só quando a célula ainda se distingue no papel
      const cw = w / it.cols, ch = h / it.rows;
      if (cw >= 2.5) for (let c = 1; c < it.cols; c++) out.push(`<line x1="${r2(x + c * cw)}" y1="${r2(py)}" x2="${r2(x + c * cw)}" y2="${r2(py + h)}" stroke="#e2e8f0" stroke-width="0.4"/>`);
      if (ch >= 2.5) for (let rr = 1; rr < it.rows; rr++) out.push(`<line x1="${r2(x)}" y1="${r2(py + rr * ch)}" x2="${r2(x + w)}" y2="${r2(py + rr * ch)}" stroke="#e2e8f0" stroke-width="0.4"/>`);
      // geometria de test card: círculo inscrito + diagonais (é o que identifica
      // a peça como card de alinhamento, mesmo em esquema)
      out.push(`<line x1="${r2(x)}" y1="${r2(py)}" x2="${r2(x + w)}" y2="${r2(py + h)}" stroke="${PRINT_ACC}" stroke-width="0.5"/>`);
      out.push(`<line x1="${r2(x)}" y1="${r2(py + h)}" x2="${r2(x + w)}" y2="${r2(py)}" stroke="${PRINT_ACC}" stroke-width="0.5"/>`);
      // CÍRCULO, não elipse: o círculo de alinhamento é redondo no painel real —
      // esticado na largura ele viraria uma lente e deixaria de significar o que
      // significa. Some na fita fina, onde viraria um borrão de tinta.
      const raio = Math.min(w, h) * 0.46;
      if (raio > 3) out.push(`<circle cx="${r2(x + w / 2)}" cy="${r2(py + h / 2)}" r="${r2(raio)}" fill="none" stroke="${PRINT_ACC}" stroke-width="0.6"/>`);
      // rótulos FORA do desenho: resolução em cima, tamanho físico embaixo
      const fsw = Math.max(4.5, Math.min(fs, w / (String(it.pxW).length + String(it.pxH).length + 5) / 0.6));
      out.push(`<text x="${r2(x + w / 2)}" y="${r2(py - fs * 0.45)}" font-family="PlexMono" font-size="${r2(fsw)}" text-anchor="middle" fill="#334155">${ptBRn(it.pxW)} × ${ptBRn(it.pxH)} px</text>`);
      if (it.mW > 0) out.push(`<text x="${r2(x + w / 2)}" y="${r2(py + h + fs * 1.15)}" font-family="PlexMono" font-size="${r2(fsw)}" text-anchor="middle" fill="#334155">${vg(it.mW)} × ${vg(it.mH)} m</text>`);
      x += w + GAPX;
    }
    y += plano.alturas[li] + GAPY;
  }
  const H = Math.max(0, y - GAPY);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${r2(maxWidth)}" height="${r2(H)}" viewBox="0 0 ${r2(maxWidth)} ${r2(H)}">${out.join("")}</svg>`;
  return { svg, width: r2(maxWidth), height: r2(H), escala: k };
}
