// services/canvasCabling.js — primitivas de cabeamento sobre um CONJUNTO de
// gabinetes em coordenada de canvas (a corrente atravessa telas).
//
// A serpentina aqui é a mesma do cabling.js (mesmos routing/corner, os 8 padrões de
// Quick Connection), só que percorre um conjunto de gabinetes em coordenada de
// canvas em vez de um retângulo de uma tela — é isso que deixa o cabo cruzar.
//
// Só encadeia gabinetes do MESMO MODELO: a corrente não mistura modelos, e o manual
// do VX Pro exige "The size of all cabinets must be the same" pra topologia livre.
//
// Estas são as PEÇAS; o cabeamento por Screen (auto/livre) e as funções de projeto
// (relatório, mapa de pixels) vivem em services/screenCabling.js.
import { cableMeta, balancedChunks, serpOrder } from "./cabling.js";

export const modelKey = (t) => `${parseFloat(t?.gabinete?.resX) || 128}x${parseFloat(t?.gabinete?.resY) || 128}`;

// resolução real da tela em pixels (gabinete vazio = 128, mesma regra do draw)
export const dimOf = (t) => ({
  w: (t?.cols || 1) * (parseFloat(t?.gabinete?.resX) || 128),
  h: (t?.rows || 1) * (parseFloat(t?.gabinete?.resY) || 128),
});

// Um gabinete de cada tela, já na coordenada do canvas (origem sup-esq, como o
// NovaLCT). Tela sem posição no canvas fica de fora.
export function canvasCells(telas, positions) {
  const cells = [];
  for (const t of telas || []) {
    const p = positions?.[t.id];
    if (!p) continue;
    const resX = parseFloat(t.gabinete?.resX) || 128;
    const resY = parseFloat(t.gabinete?.resY) || 128;
    const model = modelKey(t);
    for (let r = 0; r < (t.rows || 1); r++)
      for (let c = 0; c < (t.cols || 1); c++)
        cells.push({ telaId: t.id, c, r, x: p.x + c * resX, y: p.y + r * resY, w: resX, h: resY, model });
  }
  return cells;
}

// Serpentina sobre um CONJUNTO de gabinetes no canvas (não um retângulo): agrupa em
// faixas pela coordenada primária e alterna a direção a cada faixa. Mesma semântica
// de corner/routing do serpentine() — "updown" varre coluna a coluna, "zigzag" linha
// a linha, e o canto (bl|br|tl|tr) diz onde a corrente começa.
export function snakeCells(cells, routing = "updown", corner = "bl") {
  const rightStart = corner === "br" || corner === "tr";
  const bottomStart = corner === "bl" || corner === "br";
  const primary = routing === "zigzag" ? "y" : "x"; // zigzag: faixa = linha
  const secondary = primary === "x" ? "y" : "x";

  const lanes = new Map();
  for (const cell of cells) {
    const k = cell[primary];
    if (!lanes.has(k)) lanes.set(k, []);
    lanes.get(k).push(cell);
  }
  const keys = [...lanes.keys()].sort((a, b) => a - b);
  if (primary === "x" ? rightStart : bottomStart) keys.reverse(); // faixa começa no canto
  const revSec = secondary === "x" ? rightStart : bottomStart;

  const out = [];
  keys.forEach((k, i) => {
    const lane = lanes.get(k).sort((a, b) => a[secondary] - b[secondary]);
    const asc = (i % 2 === 0) !== revSec; // alterna a cada faixa (é a serpentina)
    out.push(...(asc ? lane : lane.reverse()));
  });
  return out;
}

// Serpentina TELA-A-TELA: completa todos os gabinetes de uma tela e só então
// pula pra próxima — o LINK entre duas telas é no máximo 1 (regra de campo:
// telas da mesma Screen podem estar longe uma da outra, e cada travessia é um
// cabo comprido a mais; a varredura por faixas do snakeCells cruzava o vão a
// cada faixa). A ordem das telas segue a posição no canvas, no mesmo eixo e
// sentido do routing/corner; dentro de cada tela a serpentina é a de sempre.
export function snakeCellsPorTela(cells, routing = "updown", corner = "bl") {
  const byTela = new Map();
  for (const cell of cells) {
    if (!byTela.has(cell.telaId)) byTela.set(cell.telaId, []);
    byTela.get(cell.telaId).push(cell);
  }
  if (byTela.size <= 1) return snakeCells(cells, routing, corner);
  const rightStart = corner === "br" || corner === "tr";
  const bottomStart = corner === "bl" || corner === "br";
  const primary = routing === "zigzag" ? "y" : "x";
  const secondary = primary === "x" ? "y" : "x";
  const min = (group, axis) => group.reduce((m, c) => Math.min(m, c[axis]), Infinity);
  const revPrim = primary === "x" ? rightStart : bottomStart;
  const groups = [...byTela.values()].sort((a, b) => {
    const p = min(a, primary) - min(b, primary);
    return (revPrim ? -p : p) || min(a, secondary) - min(b, secondary);
  });
  return groups.flatMap((group) => snakeCells(group, routing, corner));
}

// caixa de cada tela a partir das cells — telaId → {x1,y1,x2,y2}. Com o conjunto
// COMPLETO da Screen, é a caixa real da tela; com as cells de uma porta, só o
// pedaço que ela pegou (por isso quem mede vão passa o conjunto completo).
export function telaRects(cells) {
  const m = new Map();
  for (const c of cells || []) {
    const b = m.get(c.telaId);
    if (!b) m.set(c.telaId, { x1: c.x, y1: c.y, x2: c.x + c.w, y2: c.y + c.h });
    else { b.x1 = Math.min(b.x1, c.x); b.y1 = Math.min(b.y1, c.y); b.x2 = Math.max(b.x2, c.x + c.w); b.y2 = Math.max(b.y2, c.y + c.h); }
  }
  return m;
}

// telas ENCOSTADAS (direta ou indiretamente) da Screen → telaId → id do PAINEL.
// Painel é o objeto físico montado inteiro: A—B—C encostadas são um painel só,
// mesmo que A e C não se toquem. É o que separa BURACO (dentro do painel, e a
// régua do retângulo cobra) de VÃO (entre painéis, o vazio do palco).
export function panelIds(rects) {
  const ids = [...(rects?.keys?.() || [])];
  const pai = new Map(ids.map((id) => [id, id]));
  const raiz = (i) => {
    while (pai.get(i) !== i) { pai.set(i, pai.get(pai.get(i))); i = pai.get(i); }
    return i;
  };
  const toca = (a, b) => a.x1 <= b.x2 + 1 && b.x1 <= a.x2 + 1 && a.y1 <= b.y2 + 1 && b.y1 <= a.y2 + 1;
  for (let i = 0; i < ids.length; i++)
    for (let j = i + 1; j < ids.length; j++)
      if (toca(rects.get(ids[i]), rects.get(ids[j]))) pai.set(raiz(ids[i]), raiz(ids[j]));
  return new Map(ids.map((id) => [id, raiz(id)]));
}

// Aglomerados de telas ENCOSTADAS: telas cujas caixas se tocam (vão zero) formam
// um painel contínuo e podem dividir os mesmos blocos; VÃO entre caixas separa
// aglomerados — um bloco retangular que atravessasse o vão cobraria o vão na
// régua de área E viraria cabo cruzando o palco. Devolve listas de cells.
export function clusterTelas(cells) {
  const byTela = new Map();
  for (const c of cells) {
    if (!byTela.has(c.telaId)) byTela.set(c.telaId, []);
    byTela.get(c.telaId).push(c);
  }
  const grupos = [...byTela.values()];
  if (grupos.length <= 1) return grupos;
  const bbox = (arr) => {
    let x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
    for (const c of arr) { x1 = Math.min(x1, c.x); y1 = Math.min(y1, c.y); x2 = Math.max(x2, c.x + c.w); y2 = Math.max(y2, c.y + c.h); }
    return { x1, y1, x2, y2 };
  };
  const boxes = grupos.map(bbox);
  const toca = (a, b) => a.x1 <= b.x2 + 1 && b.x1 <= a.x2 + 1 && a.y1 <= b.y2 + 1 && b.y1 <= a.y2 + 1;
  // union-find simples sobre as telas
  const pai = grupos.map((_, i) => i);
  const raiz = (i) => (pai[i] === i ? i : (pai[i] = raiz(pai[i])));
  for (let i = 0; i < grupos.length; i++)
    for (let j = i + 1; j < grupos.length; j++)
      if (toca(boxes[i], boxes[j])) pai[raiz(i)] = raiz(j);
  const out = new Map();
  grupos.forEach((g, i) => {
    const r = raiz(i);
    if (!out.has(r)) out.set(r, []);
    out.get(r).push(...g);
  });
  return [...out.values()];
}

// retângulo circunscrito da porta, em pixels de canvas — é o que a régua de ÁREA
// cobra quando o Free Topology está desligado.
export function portBboxPx(port) {
  if (!port?.length) return 0;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const cell of port) {
    minX = Math.min(minX, cell.x); minY = Math.min(minY, cell.y);
    maxX = Math.max(maxX, cell.x + cell.w); maxY = Math.max(maxY, cell.y + cell.h);
  }
  return (maxX - minX) * (maxY - minY);
}

// O que a porta GASTA na régua de área. O retângulo é o que a controladora
// básica reserva — mas quando a porta atravessa o VÃO entre painéis separados,
// o retângulo único cobra o vazio do palco, e aí o vão come cota de uma porta
// que não manda pixel nenhum pra lá. Padrão: um retângulo por AGLOMERADO de
// telas encostadas, somados — é assim que o painel é mapeado em região no Unico,
// no SmartLCT e na Complex Screen do NovaLCT.
// `contaVao` volta ao retângulo ÚNICO: quem monta a Screen como um retângulo
// simples (sem separar regiões na controladora) paga o vão mesmo, e essa escolha
// fica declarada no Caderno. Buraco DENTRO do painel contínuo continua pago nos
// dois modos — isso é a regra do retângulo, não vão.
export function portAreaPx(port, contaVao = false, panels = null) {
  if (!port?.length) return 0;
  if (contaVao) return portBboxPx(port);
  const porPainel = new Map();
  for (const c of port) {
    // sem o mapa de painéis (chamada solta), cada tela responde por si
    const k = panels?.get(c.telaId) ?? c.telaId;
    if (!porPainel.has(k)) porPainel.set(k, []);
    porPainel.get(k).push(c);
  }
  return [...porPainel.values()].reduce((px, grupo) => px + portBboxPx(grupo), 0);
}

// ordem de numeração das portas no canvas — mesmo esquema do orderPorts() por tela
// ("eixo-dir1-dir2" zigzag, ou "…-serp" serpentina), só que medindo em px de canvas.
export function orderCanvasPorts(ports, scheme) {
  const bb = (p) => { let minY = Infinity, minX = Infinity; for (const x of p) { if (x.y < minY) minY = x.y; if (x.x < minX) minX = x.x; } return { minY, minX }; };
  const [axis, d1, d2, serp] = (scheme || "row-tb-lr").split("-");
  if (serp === "serp") {
    return axis === "col"
      ? serpOrder(ports, bb, "minX", "minY", d1 === "lr", d2 !== "bt")
      : serpOrder(ports, bb, "minY", "minX", d1 !== "bt", d2 === "lr");
  }
  return [...ports].sort((A, B) => {
    const a = bb(A), b = bb(B);
    if (axis === "col") {
      const c = d1 === "lr" ? a.minX - b.minX : b.minX - a.minX;
      return c || (d2 === "bt" ? b.minY - a.minY : a.minY - b.minY);
    }
    const r = d1 === "bt" ? b.minY - a.minY : a.minY - b.minY;
    return r || (d2 === "lr" ? a.minX - b.minX : b.minX - a.minX);
  });
}

// Portas sobre um conjunto de telas+posições: uma serpentina por modelo de gabinete,
// cortada em portas balanceadas. Cada porta é uma lista de gabinetes {telaId,c,r,x,
// y,w,h,model} que PODE atravessar telas. É a base do modo automático da Screen.
// budgetKey escolhe o orçamento do gabinete: "sinalBudget" (px/porta) ou "acBudget"
// (gabinetes/cabo pela corrente do conector) — é o que deixa o mesmo motor servir
// pro Sinal e pro AC.
export function canvasPorts(telas, positions, opts = {}) {
  const { routing = "updown", corner = "bl", numbering = "row-tb-lr", budgetKey = "sinalBudget" } = opts;
  const cells = canvasCells(telas, positions);
  const byModel = new Map();
  for (const cell of cells) {
    if (!byModel.has(cell.model)) byModel.set(cell.model, []);
    byModel.get(cell.model).push(cell);
  }
  const ports = [];
  for (const [model, group] of byModel) {
    const tela = (telas || []).find((t) => modelKey(t) === model);
    const budget = cableMeta(tela)[budgetKey] || 1;
    ports.push(...balancedChunks(snakeCellsPorTela(group, routing, corner), budget));
  }
  return orderCanvasPorts(ports, numbering);
}
