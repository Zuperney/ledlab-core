// services/layout.js — geometria de layout: Composição (canvas de CONTEÚDO) e
// canvas do PROCESSADOR. Extraído do componente pra ser testável (vitest) —
// segurança de campo: tela sobreposta = conteúdo duplicado/escondido no painel real.

// move o item de `from` para a posição de INSERÇÃO `insertion` (índice 0..N na lista
// ORIGINAL — "inserir antes do item nesse índice"; N = fim). Ajusta o deslocamento
// causado pela remoção do próprio item. Usado pelo drag & drop de reordenação de telas.
export function reorder(list, from, insertion) {
  if (from < 0 || from >= list.length) return list;
  const next = [...list];
  const [moved] = next.splice(from, 1);
  const at = insertion > from ? insertion - 1 : insertion; // compensa o item removido
  next.splice(Math.max(0, Math.min(at, next.length)), 0, moved);
  return next;
}

// Empacota as telas no canvas do PROCESSADOR (a "Screen" do NovaLCT): agrupa por
// MODELO de gabinete, cada modelo vira uma faixa horizontal, faixas empilhadas.
//
// Por que por modelo: uma corrente só encadeia gabinetes iguais, e o manual do VX
// Pro exige "The size of all cabinets must be the same" pra topologia livre. Juntar
// as telas do mesmo modelo é o que TORNA a corrente entre telas possível — e é o
// que o operador experiente já faz na mão (conferido contra um projeto real).
//
// items: [{ id, w, h, model }], na ordem das telas → { pos: {id:{x,y}}, w, h }.
// maxWidth quebra a faixa (o canvas não pode passar da resolução do sinal); sem
// ele, cada modelo vira uma faixa só.
export function packByModel(items, maxWidth = Infinity) {
  const groups = new Map();
  for (const it of items || []) {
    const k = String(it.model ?? "");
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  const pos = {};
  let y = 0, W = 0;
  for (const group of groups.values()) {
    let x = 0, rowH = 0;
    for (const it of group) {
      if (x > 0 && x + it.w > maxWidth) { y += rowH; x = 0; rowH = 0; } // não cabe: quebra a faixa
      pos[it.id] = { x, y };
      x += it.w;
      rowH = Math.max(rowH, it.h);
      W = Math.max(W, x);
    }
    y += rowH; // próxima faixa começa embaixo da mais alta desta
  }
  return { pos, w: W, h: y };
}

// resolução real da tela em pixels (mesma regra do draw: gabinete vazio = 128)
export const compDimOf = (t) => ({
  w: (t.cols || 1) * (parseFloat(t.gabinete?.resX) || 128),
  h: (t.rows || 1) * (parseFloat(t.gabinete?.resY) || 128),
});

// Layout da COMPOSIÇÃO: posições salvas (project.comp.pos) + default lado a lado
// pras telas ainda sem posição, e a caixa envolvente. Fonte única — usada pela
// aba Composição, pelo Caderno DOM e pelo PDF (a disposição impressa é a real).
export function compLayout(telas, savedPos) {
  const pos = {}, dims = {};
  let cx = 0;
  for (const t of telas || []) {
    dims[t.id] = compDimOf(t);
    const saved = (savedPos || {})[t.id];
    if (saved) { pos[t.id] = { x: saved.x, y: saved.y }; cx = Math.max(cx, saved.x + dims[t.id].w); }
    else { pos[t.id] = { x: cx, y: 0 }; cx += dims[t.id].w; }
  }
  if (!(telas || []).length) return { pos, dims, bbox: { minX: 0, minY: 0, w: 0, h: 0 } };
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const t of telas) {
    const p = pos[t.id], d = dims[t.id];
    minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x + d.w); maxY = Math.max(maxY, p.y + d.h);
  }
  return { pos, dims, bbox: { minX, minY, w: maxX - minX, h: maxY - minY } };
}

// Contorno REAL de uma região de células [{x,y,w,h}] (o grupo de gabinetes de
// um cabo): devolve os segmentos [{x1,y1,x2,y2}] das arestas que NÃO são
// compartilhadas por duas células — bbox mentiria em cabo em L/serpentina.
// Células de um cabo são uniformes (porta nunca mistura modelo), então a
// aresta compartilhada aparece exatamente 2× e some. Usado pelo mapa de cabos
// SIMPLIFICADO do Caderno (orientação de montagem, decisão do dono 31/07).
export function regionEdges(cells) {
  const r2 = (n) => Math.round(n * 100) / 100;
  const seen = new Map(); // chave canônica da aresta → segmento
  for (const c of cells || []) {
    const x0 = r2(c.x), y0 = r2(c.y), x1 = r2(c.x + c.w), y1 = r2(c.y + c.h);
    for (const [a, b, cc, d] of [[x0, y0, x1, y0], [x0, y1, x1, y1], [x0, y0, x0, y1], [x1, y0, x1, y1]]) {
      const k = `${a},${b}|${cc},${d}`;
      if (seen.has(k)) seen.delete(k); // aresta interna (2ª vez) — some
      else seen.set(k, { x1: a, y1: b, x2: cc, y2: d });
    }
  }
  return [...seen.values()];
}

// rects: [{ id, x, y, w, h }] → Set de ids que se SOBREPÕEM.
// Encostar borda com borda (lado a lado) NÃO conta como sobreposição.
export function overlappingIds(rects) {
  const set = new Set();
  for (let i = 0; i < rects.length; i++) {
    const a = rects[i];
    for (let j = i + 1; j < rects.length; j++) {
      const b = rects[j];
      if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) {
        set.add(a.id);
        set.add(b.id);
      }
    }
  }
  return set;
}
