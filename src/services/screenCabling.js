// services/screenCabling.js — cabeamento de SINAL de uma Screen.
//
// A Screen é o sistema que o técnico montou (aba Screens). Aqui a corrente é cabeada
// sobre ela: AUTO (o app sugere — serpentina por modelo, cortada em portas
// balanceadas) ou LIVRE (o técnico desenha cada cabo como quiser, inclusive a
// gambiarra de 18 gab numa porta que estoura 1%). Numeração 1..N por Screen: cada
// Screen é um controlador (a "Screen" do NovaLCT), então a porta reinicia por Screen.
import { cableMeta } from "./cabling.js";
import { canvasCells, canvasPorts, portBboxPx } from "./canvasCabling.js";
import { screenTelas } from "./screens.js";

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
    return {
      n: pi + 1,
      count: port.length,
      pct: pxPort ? Math.round((usoPx / pxPort) * 100) : 0,
      over: pxPort ? usoPx > pxPort + 1 : false, // +1 px de folga contra erro de float
      telaIds,
      telas: telaIds.map((id) => nomeDe(id) || "sem nome"),
      cruza: telaIds.length > 1,
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
