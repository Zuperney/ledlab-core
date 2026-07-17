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
import { cableMeta, balancedChunks, cablePorts } from "./cabling.js";
import { packByModel } from "./layout.js";

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

// Posições do canvas: as salvas + o arranjo automático pras telas que ainda não
// têm posição (tela adicionada depois não fica empilhada na origem).
export function canvasPositions(project) {
  const telas = project?.telas || [];
  const saved = project?.canvas?.pos || {};
  const faltantes = telas.filter((t) => !saved[t.id]);
  if (!faltantes.length) return saved;
  const auto = packByModel(telas.map((t) => ({ id: t.id, ...dimOf(t), model: modelKey(t) })));
  const pos = { ...saved };
  for (const t of faltantes) pos[t.id] = auto.pos[t.id] || { x: 0, y: 0 };
  return pos;
}

// O canvas só passa a MANDAR depois que o usuário mexeu nele (arrastou ou
// auto-arrumou). Antes disso a aba mostra uma pré-visualização e o cabeamento
// segue por tela — é o que mantém o canvas opcional de verdade.
export const canvasAtivo = (project) => Object.keys(project?.canvas?.pos || {}).length > 0;

// ── FONTE ÚNICA das portas de sinal do projeto ──
// Relatório, Cabeamento, Test Card e mapa de pixels TÊM que concordar: duas
// respostas pra "quantas portas" é pior que uma resposta conservadora. Com canvas
// ativo, a corrente atravessa telas; sem canvas, é a alocação por tela de sempre.
// Nos dois casos a porta sai no mesmo formato — lista de gabinetes com telaId e
// coordenada — e numerada 1..N no projeto.
export function projectSignalPorts(project, numbering = "row-tb-lr") {
  const telas = project?.telas || [];
  if (canvasAtivo(project)) {
    const { routing, corner } = project.canvas || {};
    return { ports: canvasPorts(telas, canvasPositions(project), { numbering, routing, corner }), canvas: true };
  }
  const ports = [];
  for (const t of telas) {
    const resX = parseFloat(t.gabinete?.resX) || 128;
    const resY = parseFloat(t.gabinete?.resY) || 128;
    const model = modelKey(t);
    for (const port of cablePorts(t, "sinal", numbering))
      ports.push(port.map((cell) => ({ ...cell, telaId: t.id, x: cell.c * resX, y: cell.r * resY, w: resX, h: resY, model })));
  }
  return { ports, canvas: false };
}

// Resumo por porta pro Relatório e pra aba Canvas — uso em %, telas que a porta
// cruza e o gabinete de início.
export function projectPortSummary(project, numbering = "row-tb-lr") {
  const { ports, canvas } = projectSignalPorts(project, numbering);
  const telas = project?.telas || [];
  const nomeDe = (id) => telas.find((t) => t.id === id)?.nome;
  return {
    canvas,
    ports: ports.map((port, pi) => {
      const tela = telas.find((t) => t.id === port[0]?.telaId);
      const { sinalRule, pxPort, pxPerCab } = cableMeta(tela);
      const usoPx = sinalRule === "px" ? port.length * pxPerCab : portBboxPx(port);
      const f = port[0] || {};
      // "cruza tela" se decide por ID, nunca por nome: tela sem nome existe, e o
      // nome é só rótulo — contar nome dava porta-que-cruza como se não cruzasse.
      const telaIds = [...new Set(port.map((c) => c.telaId))];
      return {
        n: pi + 1,
        count: port.length,
        pct: pxPort ? Math.round((usoPx / pxPort) * 100) : 0,
        telaIds,
        telas: telaIds.map((id) => nomeDe(id) || "sem nome"),
        cruza: telaIds.length > 1,
        startX: f.x ?? 0,
        startY: f.y ?? 0,
        rule: sinalRule,
      };
    }),
  };
}

// A fatia de UMA tela nas portas do projeto: as portas que tocam esta tela, só com
// os gabinetes dela, junto do número REAL da porta. O Test Card precisa disto — com
// a corrente atravessando telas, uma tela pode ter gabinetes das portas 3, 4 e 7, e
// nenhum "offset" único descreve isso.
export function telaPortSlices(project, telaId, numbering = "row-tb-lr") {
  const { ports } = projectSignalPorts(project, numbering);
  const out = [];
  ports.forEach((port, pi) => {
    const cells = port.filter((c) => c.telaId === telaId);
    if (cells.length) out.push({ n: pi + 1, cells });
  });
  return out;
}

// Mapa de pixels do PROJETO: uma linha por gabinete. Com canvas ativo, o X/Y é a
// coordenada da Screen inteira — que é exatamente o que o operador digita no
// NovaLCT, e o que faltava pro CSV deixar de ser "legal de ver".
export function projectPixelMapRows(project, numbering = "row-tb-lr") {
  const { ports, canvas } = projectSignalPorts(project, numbering);
  const telas = project?.telas || [];
  const rows = [];
  ports.forEach((port, pi) => port.forEach((cell, seq) => rows.push({
    port: pi + 1,
    seq: seq + 1,
    tela: telas.find((t) => t.id === cell.telaId)?.nome || "",
    col: cell.c + 1,
    row: cell.r + 1,
    x: cell.x,
    y: cell.y,
    w: cell.w,
    h: cell.h,
  })));
  return { rows, canvas };
}

// a coluna "Tela" só existe aqui (e não no mapa por tela): agora que uma porta
// atravessa telas, sem ela o operador não sabe em que peça está o gabinete.
export const PROJECT_PIXELMAP_COLS = [
  ["port", "Porta"], ["seq", "Ordem"], ["tela", "Tela"], ["col", "Coluna"],
  ["row", "Linha"], ["x", "X (px)"], ["y", "Y (px)"], ["w", "Largura"], ["h", "Altura"],
];

// CSV pt-BR: separador ';' e quebra CRLF (o Excel brasileiro abre certo).
export function projectPixelMapCSV(project, numbering = "row-tb-lr", sep = ";") {
  const { rows } = projectPixelMapRows(project, numbering);
  const head = PROJECT_PIXELMAP_COLS.map((c) => c[1]).join(sep);
  const esc = (v) => (typeof v === "string" && v.includes(sep) ? `"${v.replace(/"/g, '""')}"` : v);
  const body = rows.map((r) => PROJECT_PIXELMAP_COLS.map((c) => esc(r[c[0]])).join(sep));
  return [head, ...body].join("\r\n");
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
