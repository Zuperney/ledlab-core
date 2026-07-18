// services/screenCabling.js — cabeamento de uma Screen, SINAL e AC, na mesma lógica.
//
// A Screen é o sistema que o técnico montou (aba Screens). Aqui a corrente é cabeada
// sobre ela — tanto SINAL quanto AC seguem a MESMA mecânica (AUTO serpentina por
// modelo cortada em cabos balanceados, ou LIVRE desenhado à mão) pra ficar fácil de
// contabilizar tudo. `kind`:
//   "sinal" → orçamento em px/porta (655.360 @8-bit); config em screen.sinal
//   "ac"    → orçamento em gabinetes/cabo (corrente do conector); config em screen.ac
//
// AC é energia (segue o físico), mas por consistência de contagem é organizado por
// Screen igual o sinal — o modo LIVRE parte os circuitos como a energia realmente
// corre quando a Screen mistura telas distantes. Numeração 1..N por Screen.
import { cableMeta, cablePorts, balancedChunks } from "./cabling.js";
import { canvasCells, canvasPorts, portBboxPx } from "./canvasCabling.js";
import { screenTelas, screenOfTela, unassignedTelas, screenSize } from "./screens.js";

const cellKey = (c) => `${c.telaId}:${c.c},${c.r}`;
const cfgOf = (screen, kind) => (kind === "ac" ? screen?.ac : screen?.sinal) || {};
const budgetKeyOf = (kind) => (kind === "ac" ? "acBudget" : "sinalBudget");

// os gabinetes da Screen em coordenada de canvas (origem própria) — a base do desenho
export function screenCells(screen, telas) {
  return canvasCells(screenTelas(screen, telas), screen?.pos || {});
}

// AUTO: reaproveita o canvasPorts (serpentina por modelo + corte balanceado),
// escopado nas telas DESTA Screen, com o orçamento do `kind`. routing/corner vêm da
// config do kind.
export function screenAutoPorts(screen, telas, kind = "sinal", numbering = "row-tb-lr") {
  const cfg = cfgOf(screen, kind);
  return canvasPorts(screenTelas(screen, telas), screen?.pos || {}, {
    routing: cfg.routing, corner: cfg.corner, numbering, budgetKey: budgetKeyOf(kind),
  });
}

// AC "atrelar ao sinal": segue as portas de SINAL da Screen, mas reparte cada uma em
// cabos de AC balanceados pela corrente. Assim a energia acompanha a rota de dados.
function acFromSignal(screen, telas, numbering) {
  const membros = screenTelas(screen, telas);
  return screenPorts(screen, telas, "sinal", numbering).flatMap((port) => {
    const tela = membros.find((t) => t.id === port[0]?.telaId);
    const { acBudget } = cableMeta(tela);
    return balancedChunks(port, acBudget);
  });
}

// LIVRE: resolve os cabos salvos ({telaId,c,r}) pros gabinetes completos (x/y/w/h).
// Ignora referências que não existem mais (tela removida da Screen).
export function resolveCables(screen, telas, kind = "sinal") {
  const byKey = new Map(screenCells(screen, telas).map((c) => [cellKey(c), c]));
  return (cfgOf(screen, kind).cables || []).map((cable) => cable.map((ref) => byKey.get(cellKey(ref))).filter(Boolean));
}

// as portas/cabos da Screen: livre → os desenhados; sinal atrelado (AC) → segue o
// sinal; senão → a sugestão automática do app.
export function screenPorts(screen, telas, kind = "sinal", numbering = "row-tb-lr") {
  const cfg = cfgOf(screen, kind);
  if (cfg.mode === "livre") return resolveCables(screen, telas, kind);
  if (kind === "ac" && cfg.mode === "sinal") return acFromSignal(screen, telas, numbering);
  return screenAutoPorts(screen, telas, kind, numbering);
}

// resumo por porta/cabo: uso em %, se estoura, telas que percorre. Sinal mede em px
// (régua px real ou área/retângulo); AC mede em corrente (carga vs. conector).
export function screenPortSummary(screen, telas, kind = "sinal", numbering = "row-tb-lr") {
  const ports = screenPorts(screen, telas, kind, numbering);
  const membros = screenTelas(screen, telas);
  const nomeDe = (id) => membros.find((t) => t.id === id)?.nome;
  return ports.map((port, pi) => {
    const m = cableMeta(membros.find((t) => t.id === port[0]?.telaId));
    const telaIds = [...new Set(port.map((c) => c.telaId))];
    const f = port[0] || {};
    const base = {
      n: pi + 1, count: port.length, telaIds,
      telas: telaIds.map((id) => nomeDe(id) || "sem nome"), cruza: telaIds.length > 1,
      startX: f.x ?? 0, startY: f.y ?? 0,
    };
    if (kind === "ac") {
      const load = port.length * m.ampCab;
      return { ...base, load, pct: m.connRating ? Math.round((load / m.connRating) * 100) : 0, over: m.connRating ? load > m.connRating + 0.001 : false };
    }
    const usoPx = m.sinalRule === "px" ? port.length * m.pxPerCab : portBboxPx(port);
    return { ...base, pct: m.pxPort ? Math.round((usoPx / m.pxPort) * 100) : 0, over: m.pxPort ? usoPx > m.pxPort + 1 : false };
  });
}

// mapa gabinete → índice da porta, pro canvas colorir cada célula
export function cellPortIndex(ports) {
  const map = {};
  ports.forEach((port, pi) => port.forEach((c) => { map[cellKey(c)] = pi; }));
  return map;
}

// ── edição do modo LIVRE (puro, testável) ──
// o auto vira ponto de partida: importa os cabos sugeridos como editáveis
export function autoAsCables(screen, telas, kind = "sinal", numbering = "row-tb-lr") {
  return screenPorts({ ...screen, [kind]: { ...cfgOf(screen, kind), mode: "auto" } }, telas, kind, numbering)
    .map((port) => port.map((c) => ({ telaId: c.telaId, c: c.c, r: c.r })));
}

// clique num gabinete no modo livre: se já está no cabo ativo → tira (toggle);
// senão → tira de qualquer cabo e põe no ativo (um gabinete pertence a 1 cabo só).
export function assignCell(cables, activeIdx, cell) {
  const same = (c) => c.telaId === cell.telaId && c.c === cell.c && c.r === cell.r;
  const inActive = (cables[activeIdx] || []).some(same);
  const cleaned = cables.map((cab) => cab.filter((c) => !same(c)));
  if (inActive) return cleaned;
  cleaned[activeIdx] = [...(cleaned[activeIdx] || []), { telaId: cell.telaId, c: cell.c, r: cell.r }];
  return cleaned;
}

// gabinetes da Screen que ainda não estão em nenhum cabo (livre incompleto)
export function unassignedCount(screen, telas, kind = "sinal") {
  const cells = screenCells(screen, telas);
  const used = new Set((cfgOf(screen, kind).cables || []).flatMap((cab) => cab.map(cellKey)));
  return cells.filter((c) => !used.has(cellKey(c))).length;
}

// ── nível de PROJETO (Relatório, Test Card, Composição, CSV) ──
// o projeto "usa Screens" quando tem ao menos uma Screen com tela. Se não usa,
// os consumidores caem no modo legado (por tela), sem quebrar nada.
export function hasScreens(project) {
  return (project?.screens || []).some((s) => (s.telaIds || []).length > 0);
}

// telas que não foram postas em nenhuma Screen — o relatório avisa "sem sistema"
export function telasSemScreen(project) {
  return unassignedTelas(project?.screens, project?.telas);
}

// Relatório: cada Screen com tamanho + resumo (numeração 1..N POR Screen, porque
// cada Screen é um controlador). `kind` = "sinal" ou "ac".
export function projectScreenReport(project, kind = "sinal", numbering = "row-tb-lr") {
  const telas = project?.telas || [];
  return (project?.screens || [])
    .filter((s) => (s.telaIds || []).length)
    .map((s) => ({ id: s.id, nome: s.nome, size: screenSize(s, telas), ports: screenPortSummary(s, telas, kind, numbering) }));
}

// A fatia de UMA tela nas portas — pro selo do Test Card / Composição. Se a tela
// está numa Screen → usa as portas da Screen (número real por Screen); se não está
// (projeto legado ou tela solta) → numeração local por tela.
export function telaPortSlices(project, telaId, kind = "sinal", numbering = "row-tb-lr") {
  const telas = project?.telas || [];
  const screen = screenOfTela(project?.screens, telaId);
  if (screen) {
    const out = [];
    screenPorts(screen, telas, kind, numbering).forEach((port, pi) => {
      const cells = port.filter((c) => c.telaId === telaId);
      if (cells.length) out.push({ n: pi + 1, cells });
    });
    return out;
  }
  const tela = telas.find((t) => t.id === telaId);
  if (!tela) return [];
  const resX = parseFloat(tela.gabinete?.resX) || 128, resY = parseFloat(tela.gabinete?.resY) || 128;
  return cablePorts(tela, kind, numbering).map((port, pi) => ({
    n: pi + 1,
    cells: port.map((c) => ({ telaId, c: c.c, r: c.r, x: c.c * resX, y: c.r * resY, w: resX, h: resY })),
  }));
}

// mapa de pixels de UMA Screen (1 linha/gabinete) — X/Y na coordenada da Screen (só
// faz sentido pro sinal; é o que o operador digita no NovaLCT).
export function screenPixelMapRows(screen, telas, numbering = "row-tb-lr") {
  const nome = (id) => (telas || []).find((t) => t.id === id)?.nome || "";
  const rows = [];
  screenPorts(screen, telas, "sinal", numbering).forEach((port, pi) => port.forEach((cell, seq) => rows.push({
    porta: pi + 1, ordem: seq + 1, tela: nome(cell.telaId), col: cell.c + 1, row: cell.r + 1, x: cell.x, y: cell.y, w: cell.w, h: cell.h,
  })));
  return rows;
}

export const PIXELMAP_COLS = [
  ["screen", "Screen"], ["porta", "Porta"], ["ordem", "Ordem"], ["tela", "Tela"],
  ["col", "Coluna"], ["row", "Linha"], ["x", "X (px)"], ["y", "Y (px)"], ["w", "Largura"], ["h", "Altura"],
];

// CSV do projeto todo: uma linha por gabinete, com a coluna Screen e a Porta
// reiniciando por Screen. pt-BR (';' + CRLF). `only` limita a uma Screen.
export function projectPixelMapCSV(project, numbering = "row-tb-lr", only = null, sep = ";") {
  const telas = project?.telas || [];
  const esc = (v) => (typeof v === "string" && v.includes(sep) ? `"${v.replace(/"/g, '""')}"` : v);
  const rows = [];
  for (const s of (project?.screens || []).filter((s) => (s.telaIds || []).length && (!only || s.id === only)))
    for (const r of screenPixelMapRows(s, telas, numbering)) rows.push({ screen: s.nome, ...r });
  const head = PIXELMAP_COLS.map((c) => c[1]).join(sep);
  const body = rows.map((r) => PIXELMAP_COLS.map((c) => esc(r[c[0]])).join(sep));
  return [head, ...body].join("\r\n");
}
