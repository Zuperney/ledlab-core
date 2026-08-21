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
import { cableMeta, cablePorts, balancedChunks, buildAuto, portOffset, ampCabTipico } from "./cabling.js";
import { acTone } from "./electricalCalc.js";
import { canvasCells, snakeCellsPorTela, clusterTelas, portAreaPx, telaRects, panelIds, modelKey, orderCanvasPorts } from "./canvasCabling.js";
import { screenTelas, screenOfTela, unassignedTelas, screenResolucao, screenSize } from "./screens.js";

const cellKey = (c) => `${c.telaId}:${c.c},${c.r}`;
const cfgOf = (screen, kind) => (kind === "ac" ? screen?.ac : screen?.sinal) || {};
// meta do gabinete com a config de SINAL vinda da Screen (bits/régua), não da tela
const metaOf = (tela, cfg, kind) => (kind === "ac" ? cableMeta(tela) : cableMeta(tela, cfg));

function groupByModel(cells) {
  const m = new Map();
  for (const c of cells) { if (!m.has(c.model)) m.set(c.model, []); m.get(c.model).push(c); }
  return m;
}

// régua de ÁREA / regra do retângulo (e todo AC): parte o grupo do modelo em BLOCOS
// retangulares (Linha/Coluna/Área) reaproveitando o buildAuto por tela — normaliza o
// grupo numa grade (col/lin a partir do canto), roda a estratégia, e remapeia pros
// gabinetes reais. Buracos entram no retângulo (é a regra do retângulo) e caem fora
// da lista de gabinetes reais da porta.
function blockPorts(cells, tela, budget, strategy, routing, corner, numbering) {
  const resX = parseFloat(tela?.gabinete?.resX) || 128, resY = parseFloat(tela?.gabinete?.resY) || 128;
  let minX = Infinity, minY = Infinity;
  for (const c of cells) { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); }
  const byPos = new Map(); let maxC = 0, maxR = 0;
  for (const c of cells) {
    const gc = Math.round((c.x - minX) / resX), gr = Math.round((c.y - minY) / resY);
    byPos.set(`${gc},${gr}`, c); maxC = Math.max(maxC, gc); maxR = Math.max(maxR, gr);
  }
  return buildAuto(maxC + 1, maxR + 1, strategy, budget, routing, numbering, "area", corner)
    .map((port) => port.map((g) => byPos.get(`${g.c},${g.r}`)).filter(Boolean))
    .filter((port) => port.length);
}

// os gabinetes da Screen em coordenada de canvas (origem própria) — a base do desenho
export function screenCells(screen, telas) {
  return canvasCells(screenTelas(screen, telas), screen?.pos || {});
}

// AUTO (não-livre): uma serpentina/bloco por MODELO de gabinete, escopado nas telas
// DESTA Screen. A régua decide a forma:
//   px (Free Topology) → serpentina contígua cortada por CONTAGEM (buraco não paga)
//   área (regra do retângulo) → blocos retangulares (Linha/Coluna/Área)
// AC é sempre por blocos (conta por corrente). Orçamento: sinal vem dos bits da
// Screen; AC vem da corrente do conector.
export function screenAutoPorts(screen, telas, kind = "sinal", numbering = "row-tb-lr") {
  const cfg = cfgOf(screen, kind);
  const routing = cfg.routing || "updown", corner = cfg.corner || "bl";
  const membros = screenTelas(screen, telas);
  const ports = [];
  for (const [model, group] of groupByModel(screenCells(screen, telas))) {
    const tela = membros.find((t) => modelKey(t) === model);
    const meta = metaOf(tela, cfg, kind);
    const budget = kind === "ac" ? meta.acBudget : meta.sinalBudget;
    if (kind === "sinal" && meta.sinalRule === "px") {
      // serpentina tela-a-tela: no máximo 1 cabo cruza entre telas da Screen
      ports.push(...balancedChunks(snakeCellsPorTela(group, routing, corner), budget));
    } else {
      const strategy = ["linha", "coluna", "area"].includes(cfg.strategy) ? cfg.strategy : "area";
      // blocos por AGLOMERADO de telas encostadas: bloco retangular nunca
      // atravessa VÃO — o retângulo cobraria o vão na régua de área e o cabo
      // cruzaria o palco. Telas encostadas continuam um painel só.
      for (const cluster of clusterTelas(group))
        ports.push(...blockPorts(cluster, tela, budget, strategy, routing, corner, numbering));
    }
  }
  return orderCanvasPorts(ports, numbering);
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

// as portas/cabos da Screen. A "disposição" (strategy) manda: "livre" → os cabos
// desenhados; "sinal" (só AC) → atrela à rota do sinal; qualquer outra → auto.
export function screenPorts(screen, telas, kind = "sinal", numbering = "row-tb-lr") {
  const strat = cfgOf(screen, kind).strategy;
  if (strat === "livre") return resolveCables(screen, telas, kind);
  if (kind === "ac" && strat === "sinal") return acFromSignal(screen, telas, numbering);
  return screenAutoPorts(screen, telas, kind, numbering);
}

// resumo por porta/cabo: uso em %, se estoura, telas que percorre. Sinal mede em px
// (régua px real ou área/retângulo); AC mede em corrente (carga vs. conector).
// `elCfg` (opcional, só AC): { brilho, conteudo } — habilita `loadTip` (corrente
// típica do cabo, informativa; a régua/limite continua no pico).
export function screenPortSummary(screen, telas, kind = "sinal", numbering = "row-tb-lr", elCfg) {
  const cfg = cfgOf(screen, kind);
  const ports = screenPorts(screen, telas, kind, numbering);
  const membros = screenTelas(screen, telas);
  const nomeDe = (id) => membros.find((t) => t.id === id)?.nome;
  // PAINÉIS da Screen (telas encostadas, direta ou indiretamente). Sai das telas
  // TODAS, não das que a porta pegou: um cabo que liga só as pontas de um painel
  // contínuo tem BURACO no meio (a régua do retângulo cobra), não vão.
  const panels = panelIds(telaRects(screenCells(screen, telas)));
  return ports.map((port, pi) => {
    const telaDo = membros.find((t) => t.id === port[0]?.telaId);
    const m = metaOf(telaDo, cfg, kind);
    const telaIds = [...new Set(port.map((c) => c.telaId))];
    const f = port[0] || {};
    const base = {
      n: pi + 1, count: port.length, telaIds,
      telas: telaIds.map((id) => nomeDe(id) || "sem nome"), cruza: telaIds.length > 1,
      startX: f.x ?? 0, startY: f.y ?? 0,
    };
    if (kind === "ac") {
      const load = port.length * m.ampCab;
      const pct = m.connRating ? Math.round((load / m.connRating) * 100) : 0;
      const loadTip = elCfg ? port.length * ampCabTipico(telaDo, elCfg) : undefined;
      // regra dos 80% (carga contínua): warn = passou da margem, over = estourou o conector
      return { ...base, load, loadTip, pct, over: m.connRating ? load > m.connRating + 0.001 : false, warn: acTone(pct) === "warn" };
    }
    // régua de ÁREA: o vão entre painéis separados só entra na cota se a Screen
    // declarar (cfg.vaoConta) — ver portAreaPx. `cruzaVao` marca a porta em que a
    // escolha muda o número: é ela que faz o Caderno declarar a premissa.
    const contaVao = cfg.vaoConta === true;
    const cruzaVao = m.sinalRule !== "px" && new Set(port.map((c) => panels.get(c.telaId))).size > 1;
    const usoPx = m.sinalRule === "px" ? port.length * m.pxPerCab : portAreaPx(port, contaVao, panels);
    const over = m.pxPort ? usoPx > m.pxPort + 1 : false;
    // OVERCLOCK ligado: o excedente ESPERADO do ceil (porta dentro do orçamento
    // overclocado) sai como `oc` (laranja, escolha do técnico) — `over` (vermelho)
    // fica reservado pro que passa ALÉM disso (ex.: cabo desenhado no livre).
    const oc = m.overclock && over && port.length <= m.sinalBudget;
    return { ...base, pct: m.pxPort ? Math.round((usoPx / m.pxPort) * 100) : 0, over: over && !oc, oc, cruzaVao };
  });
}

// mapa gabinete → índice da porta, pro canvas colorir cada célula
export function cellPortIndex(ports) {
  const map = {};
  ports.forEach((port, pi) => port.forEach((c) => { map[cellKey(c)] = pi; }));
  return map;
}

// ── edição do modo LIVRE (puro, testável) ──
// o auto vira ponto de partida: importa os cabos sugeridos como editáveis. Se a
// disposição atual já é "livre", cai num padrão sensato (mantém "sinal"/atrelar).
export function autoAsCables(screen, telas, kind = "sinal", numbering = "row-tb-lr") {
  const cfg = cfgOf(screen, kind);
  const fallback = kind === "ac" ? "area" : (cfg.rule === "px" ? "auto" : "area");
  const strategy = !cfg.strategy || cfg.strategy === "livre" ? fallback : cfg.strategy;
  return screenPorts({ ...screen, [kind]: { ...cfg, strategy } }, telas, kind, numbering)
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

// vizinho GEOMÉTRICO de uma célula (as setas do teclado no modo livre): dá um
// passo pra fora da borda na direção pedida e acha a célula que contém o ponto.
// Por ser por geometria (e não por c/r), atravessa telas encostadas mesmo com
// gabinetes de dimensões diferentes; buraco entre telas ou borda → null.
export function neighborCell(cells, from, dir) {
  const cell = cells.find((c) => c.telaId === from.telaId && c.c === from.c && c.r === from.r);
  if (!cell) return null;
  const dx = dir === "left" ? -1 : dir === "right" ? 1 : 0;
  const dy = dir === "up" ? -1 : dir === "down" ? 1 : 0;
  const px = dx === 0 ? cell.x + cell.w / 2 : dx > 0 ? cell.x + cell.w + 2 : cell.x - 2;
  const py = dy === 0 ? cell.y + cell.h / 2 : dy > 0 ? cell.y + cell.h + 2 : cell.y - 2;
  return cells.find((c) => px >= c.x && px < c.x + c.w && py >= c.y && py < c.y + c.h) || null;
}

// gabinetes da Screen que ainda não estão em nenhum cabo (livre incompleto)
export function unassignedCount(screen, telas, kind = "sinal") {
  const cells = screenCells(screen, telas);
  const used = new Set((cfgOf(screen, kind).cables || []).flatMap((cab) => cab.map(cellKey)));
  return cells.filter((c) => !used.has(cellKey(c))).length;
}

// ── nível de PROJETO (Relatório, Test Card, Composição, CSV) ──
// o projeto "usa Screens" quando tem ao menos uma Screen com tela EXISTENTE —
// telaIds órfãos (tela excluída sem limpar a Screen, dado antigo) não contam,
// senão o Relatório entra no modo por-Screen com uma Screen 0×0 (LLC-11).
// Se não usa, os consumidores caem no modo legado (por tela), sem quebrar nada.
export function hasScreens(project) {
  const telas = project?.telas || [];
  return (project?.screens || []).some((s) => screenTelas(s, telas).length > 0);
}

// telas que não foram postas em nenhuma Screen — o relatório avisa "sem sistema"
export function telasSemScreen(project) {
  return unassignedTelas(project?.screens, project?.telas);
}

// Grade e contagem de gabinetes da Screen. A caixa envolvente (screenSize) inclui
// o VÃO entre telas afastadas no canvas — dividi-la pela resolução do gabinete
// contava gabinetes que NÃO existem (o caderno mostrava "Grade da Screen 20 × 6"
// = 120 numa Screen de 96 gabinetes com um vão no meio). `gabs` é a contagem real
// (os mesmos gabinetes que o mapa desenha e as portas somam); `cols × rows` só
// significa algo quando a Screen é UM retângulo cheio de um único modelo — é o
// que `exato` diz, e o caderno só imprime a grade nesse caso.
export function screenGrid(screen, telas) {
  const membros = screenTelas(screen, telas);
  const gabs = screenCells(screen, telas).length;
  const g = membros[0]?.gabinete || {};
  const resX = parseFloat(g.resX) || 128, resY = parseFloat(g.resY) || 128;
  const { w, h } = screenSize(screen, telas);
  const cols = Math.round(w / resX), rows = Math.round(h / resY);
  const umModelo = new Set(membros.map(modelKey)).size <= 1;
  return { gabs, cols, rows, exato: umModelo && gabs > 0 && cols * rows === gabs };
}

// Relatório: cada Screen com tamanho + resumo (numeração 1..N POR Screen, porque
// cada Screen é um controlador). `kind` = "sinal" ou "ac".
export function projectScreenReport(project, kind = "sinal", numbering = "row-tb-lr", elCfg) {
  const telas = project?.telas || [];
  return (project?.screens || [])
    .filter((s) => screenTelas(s, telas).length) // só telas existentes (LLC-11)
    .map((s) => ({
      id: s.id,
      nome: s.nome,
      // `res` é a RESOLUÇÃO (sem o vão) e `size` é a DISPOSIÇÃO (a caixa que o
      // desenho ocupa). Duas coisas, dois nomes — misturá-las foi o que fez o
      // caderno anunciar pixel que não existe.
      res: screenResolucao(s, telas),
      size: screenSize(s, telas),
      grid: screenGrid(s, telas),
      ports: screenPortSummary(s, telas, kind, numbering, elCfg),
    }));
}

// Todos os cabos AC do projeto como [{ n, load, loadTip }] — o insumo do rodízio
// de FASES (electricalCalc.phaseOf/phaseBalance). `load` = corrente de PICO;
// `loadTip` = típica (brilho/conteúdo do project.config). Com Screens, `n`
// reinicia por Screen (cada Screen é um quadro — o rodízio recomeça na fase R);
// no legado a numeração é a global do projeto (portOffset).
export function projectAcCabos(project, numbering = "row-tb-lr") {
  const elCfg = project?.config || {};
  if (hasScreens(project)) {
    return projectScreenReport(project, "ac", numbering, elCfg).flatMap((s) => s.ports.map((p) => ({ n: p.n, load: p.load, loadTip: p.loadTip })));
  }
  const telas = project?.telas || [];
  return telas.flatMap((t) => {
    const { ampCab } = cableMeta(t);
    const ampTip = ampCabTipico(t, elCfg);
    const off = portOffset(telas, t.id, "ac", numbering);
    return cablePorts(t, "ac", numbering).map((p, i) => ({ n: off + i + 1, load: p.length * ampCab, loadTip: p.length * ampTip }));
  });
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
