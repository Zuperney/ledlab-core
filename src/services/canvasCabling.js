// services/canvasCabling.js — cabeamento de sinal sobre o CANVAS DO PROCESSADOR,
// onde a corrente atravessa telas.
//
// O motivo de existir: hoje cada tela é uma ilha, então uma tira de 3 gabinetes
// come uma porta inteira e joga 85% fora. Na parede real (a "Screen" do NovaLCT)
// as tiras estão encostadas e uma porta só passa por todas. A conta muda MUITO —
// no projeto real "Colação de Grau", de 10 portas pra 6.
//
// A serpentina aqui é a mesma do cabling.js (mesmos routing/corner, os 8 padrões de
// Quick Connection), só que percorre um CONJUNTO de gabinetes em coordenada de
// canvas em vez de um retângulo de uma tela — é isso que deixa o cabo cruzar.
//
// Só encadeia gabinetes do MESMO MODELO: a corrente não mistura modelos, e o manual
// do VX Pro exige "The size of all cabinets must be the same" pra topologia livre.
import { cableMeta, balancedChunks } from "./cabling.js";

export const modelKey = (t) => `${parseFloat(t?.gabinete?.resX) || 128}x${parseFloat(t?.gabinete?.resY) || 128}`;

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

// ordem de numeração das portas no canvas — mesmo esquema do orderPorts() por tela
// ("eixo-dir1-dir2"), só que medindo em pixels de canvas.
function orderCanvasPorts(ports, scheme) {
  const bb = (p) => { let minY = Infinity, minX = Infinity; for (const x of p) { if (x.y < minY) minY = x.y; if (x.x < minX) minX = x.x; } return { minY, minX }; };
  const [axis, d1, d2] = (scheme || "row-tb-lr").split("-");
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

// Portas do PROJETO INTEIRO: uma serpentina por modelo de gabinete, cortada em
// portas balanceadas. Cada porta é uma lista de gabinetes {telaId, c, r, x, y, …}
// que PODE atravessar telas.
export function canvasPorts(telas, positions, opts = {}) {
  const { routing = "updown", corner = "bl", numbering = "row-tb-lr" } = opts;
  const cells = canvasCells(telas, positions);
  const byModel = new Map();
  for (const cell of cells) {
    if (!byModel.has(cell.model)) byModel.set(cell.model, []);
    byModel.get(cell.model).push(cell);
  }
  const ports = [];
  for (const [model, group] of byModel) {
    const tela = (telas || []).find((t) => modelKey(t) === model);
    const { sinalBudget } = cableMeta(tela);
    ports.push(...balancedChunks(snakeCells(group, routing, corner), sinalBudget));
  }
  return orderCanvasPorts(ports, numbering);
}

// Quantas portas o projeto gasta HOJE (cada tela isolada) × com o cabo cruzando
// telas no canvas. É a conta que mostra ao usuário o que ele ganha — e que ensina
// a função, que é o ponto: dá pra desperdiçar porta sem saber.
export function portSavings(telas, positions, opts = {}) {
  const isolado = (telas || []).reduce((n, t) => {
    const { sinalBudget } = cableMeta(t);
    return n + Math.max(1, Math.ceil(((t.cols || 1) * (t.rows || 1)) / Math.max(1, sinalBudget)));
  }, 0);
  const noCanvas = canvasPorts(telas, positions, opts).length;
  return { isolado, canvas: noCanvas, economia: isolado - noCanvas };
}
