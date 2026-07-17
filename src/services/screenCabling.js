// services/screenCabling.js — cabeamento de SINAL de uma Screen.
//
// A Screen é o sistema que o técnico montou (aba Screens). Aqui a corrente é cabeada
// sobre ela: AUTO (o app sugere — serpentina por modelo, cortada em portas
// balanceadas) ou LIVRE (o técnico desenha cada cabo como quiser, inclusive a
// gambiarra de 18 gab numa porta que estoura 1%). Numeração 1..N por Screen: cada
// Screen é um controlador (a "Screen" do NovaLCT), então a porta reinicia por Screen.
import { cableMeta, cablePorts } from "./cabling.js";
import { canvasCells, canvasPorts, portBboxPx } from "./canvasCabling.js";
import { screenTelas, screenOfTela, unassignedTelas, screenSize } from "./screens.js";

const cellKey = (c) => `${c.telaId}:${c.c},${c.r}`;

// AUTO: reaproveita o canvasPorts (serpentina por modelo + corte balanceado), só que
// escopado nas telas DESTA Screen e na posição dela. routing/corner vêm da Screen.
export function screenAutoPorts(screen, telas, numbering = "row-tb-lr") {
  return canvasPorts(screenTelas(screen, telas), screen?.pos || {}, {
    routing: screen?.sinal?.routing, corner: screen?.sinal?.corner, numbering,
  });
}

// os gabinetes da Screen em coordenada de canvas (origem própria) — a base do desenho
export function screenCells(screen, telas) {
  return canvasCells(screenTelas(screen, telas), screen?.pos || {});
}

// LIVRE: resolve os cabos salvos ({telaId,c,r}) pros gabinetes completos (x/y/w/h).
// Ignora referências que não existem mais (tela removida da Screen).
export function resolveCables(screen, telas) {
  const byKey = new Map(screenCells(screen, telas).map((c) => [cellKey(c), c]));
  return (screen?.sinal?.cables || []).map((cable) => cable.map((ref) => byKey.get(cellKey(ref))).filter(Boolean));
}

// as portas da Screen: livre → os cabos desenhados; auto → a sugestão do app
export function screenPorts(screen, telas, numbering = "row-tb-lr") {
  if (screen?.sinal?.mode === "livre") return resolveCables(screen, telas);
  return screenAutoPorts(screen, telas, numbering);
}

// resumo por porta: uso em %, se estoura, telas que percorre. A régua (px real ou
// área/retângulo) vem do gabinete da porta — mesma lógica do resto do app.
export function screenPortSummary(screen, telas, numbering = "row-tb-lr") {
  const ports = screenPorts(screen, telas, numbering);
  const membros = screenTelas(screen, telas);
  const nomeDe = (id) => membros.find((t) => t.id === id)?.nome;
  return ports.map((port, pi) => {
    const tela = membros.find((t) => t.id === port[0]?.telaId);
    const { sinalRule, pxPort, pxPerCab } = cableMeta(tela);
    const usoPx = sinalRule === "px" ? port.length * pxPerCab : portBboxPx(port);
    const telaIds = [...new Set(port.map((c) => c.telaId))];
    const f = port[0] || {};
    return {
      n: pi + 1,
      count: port.length,
      pct: pxPort ? Math.round((usoPx / pxPort) * 100) : 0,
      over: pxPort ? usoPx > pxPort + 1 : false, // +1 px de folga contra erro de float
      telaIds,
      telas: telaIds.map((id) => nomeDe(id) || "sem nome"),
      cruza: telaIds.length > 1,
      startX: f.x ?? 0,
      startY: f.y ?? 0,
    };
  });
}

// mapa gabinete → índice da porta, pro canvas colorir cada célula
export function cellPortIndex(ports) {
  const map = {};
  ports.forEach((port, pi) => port.forEach((c) => { map[cellKey(c)] = pi; }));
  return map;
}

// ── edição do modo LIVRE (puro, testável) ──
// o auto vira ponto de partida: importa as portas sugeridas como cabos editáveis
export function autoAsCables(screen, telas, numbering = "row-tb-lr") {
  return screenAutoPorts(screen, telas, numbering).map((port) => port.map((c) => ({ telaId: c.telaId, c: c.c, r: c.r })));
}

// clique num gabinete no modo livre: se já está no cabo ativo → tira (toggle);
// senão → tira de qualquer cabo e põe no ativo (um gabinete pertence a 1 cabo só).
export function assignCell(cables, activeIdx, cell) {
  const same = (c) => c.telaId === cell.telaId && c.c === cell.c && c.r === cell.r;
  const inActive = (cables[activeIdx] || []).some(same);
  const cleaned = cables.map((cab) => cab.filter((c) => !same(c)));
  if (inActive) return cleaned; // estava no ativo → removido
  cleaned[activeIdx] = [...(cleaned[activeIdx] || []), { telaId: cell.telaId, c: cell.c, r: cell.r }];
  return cleaned;
}

// gabinetes da Screen que ainda não estão em nenhum cabo (livre incompleto)
export function unassignedCount(screen, telas) {
  const cells = screenCells(screen, telas);
  const used = new Set((screen?.sinal?.cables || []).flatMap((cab) => cab.map(cellKey)));
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

// Relatório: cada Screen com tamanho + resumo das portas (numeração 1..N POR Screen,
// porque cada Screen é um controlador — não é 1..N global do projeto).
export function projectScreenReport(project, numbering = "row-tb-lr") {
  const telas = project?.telas || [];
  return (project?.screens || [])
    .filter((s) => (s.telaIds || []).length)
    .map((s) => ({ id: s.id, nome: s.nome, size: screenSize(s, telas), ports: screenPortSummary(s, telas, numbering) }));
}

// A fatia de UMA tela nas portas — pro selo do Test Card / Composição. Se a tela
// está numa Screen → usa as portas da Screen (número real por Screen); se não está
// (projeto legado ou tela solta) → numeração local por tela. Uma tela pode carregar
// portas não contíguas (3, 4, 7), então devolve lista {n, cells}, não um offset.
export function telaPortSlices(project, telaId, numbering = "row-tb-lr") {
  const telas = project?.telas || [];
  const screen = screenOfTela(project?.screens, telaId);
  if (screen) {
    const out = [];
    screenPorts(screen, telas, numbering).forEach((port, pi) => {
      const cells = port.filter((c) => c.telaId === telaId);
      if (cells.length) out.push({ n: pi + 1, cells });
    });
    return out;
  }
  const tela = telas.find((t) => t.id === telaId);
  if (!tela) return [];
  const resX = parseFloat(tela.gabinete?.resX) || 128, resY = parseFloat(tela.gabinete?.resY) || 128;
  return cablePorts(tela, "sinal", numbering).map((port, pi) => ({
    n: pi + 1,
    cells: port.map((c) => ({ telaId, c: c.c, r: c.r, x: c.c * resX, y: c.r * resY, w: resX, h: resY })),
  }));
}

// mapa de pixels de UMA Screen (1 linha/gabinete) — X/Y na coordenada da Screen,
// que é o que o operador digita no NovaLCT.
export function screenPixelMapRows(screen, telas, numbering = "row-tb-lr") {
  const nome = (id) => (telas || []).find((t) => t.id === id)?.nome || "";
  const rows = [];
  screenPorts(screen, telas, numbering).forEach((port, pi) => port.forEach((cell, seq) => rows.push({
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
