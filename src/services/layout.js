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
// ele, cada modelo vira uma faixa só. `vao` (px) separa telas e faixas — é o vão
// padrão da Screen, pra todas as folgas saírem do mesmo tamanho.
export function packByModel(items, maxWidth = Infinity, vao = 0) {
  const groups = new Map();
  for (const it of items || []) {
    const k = String(it.model ?? "");
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(it);
  }
  const g = Math.max(0, vao) || 0;
  const pos = {};
  let y = 0, W = 0;
  for (const group of groups.values()) {
    let x = 0, rowH = 0;
    for (const it of group) {
      if (x > 0 && x + it.w > maxWidth) { y += rowH + g; x = 0; rowH = 0; } // não cabe: quebra a faixa
      pos[it.id] = { x, y };
      W = Math.max(W, x + it.w);
      x += it.w + g;
      rowH = Math.max(rowH, it.h);
    }
    y += rowH + g; // próxima faixa começa embaixo da mais alta desta
  }
  return { pos, w: W, h: Math.max(0, y - g) }; // sem o vão pendurado no fim
}

// ── encaixe (snap) e a régua do VÃO ──────────────────────────────────────────
// Encaixe num eixo, em px de canvas: as posições candidatas de uma tela de
// tamanho `size` diante dos vizinhos `spans` ([[inicio, fim], …] no MESMO eixo).
// Cada vizinho oferece encostar (dos dois lados), alinhar (início/fim) e — quando
// a Screen tem vão padrão — a folga EXATA de cada lado; o 0 é a origem da Screen.
// Vence a candidata mais próxima dentro de `thr`; nenhuma perto → o valor cru.
// É isso que faz todo vão sair do mesmo tamanho, em vez de "quase igual" no olho.
export function snapAxis(v, size, spans, vao = 0, thr = 9) {
  const cands = [0];
  for (const [a, b] of spans || []) {
    cands.push(a, b, a - size, b - size); // alinhar início/fim + encostar dos dois lados
    if (vao > 0) cands.push(b + vao, a - size - vao); // o vão padrão, depois e antes
  }
  let best = v, dist = thr;
  for (const c of cands) {
    const d = Math.abs(v - c);
    if (d <= thr && d < dist) { dist = d; best = c; }
  }
  return best;
}

// Vãos entre `alvo` e os vizinhos que ele ENCARA (projeção sobreposta no outro
// eixo) — um por lado, o mais próximo, e só quando existe folga de verdade (> 0).
// Tela na diagonal não tem vão medível: a distância ali não é folga entre painéis.
// Devolve a régua pronta pro canvas: { dir, axis, gap, x, y, len } em px de
// canvas — (x,y) é onde a cota começa, `len` o comprimento no eixo `axis`.
export function gapsAround(alvo, outros) {
  if (!alvo) return [];
  const a = alvo;
  const melhor = { left: null, right: null, top: null, bottom: null };
  const guarda = (lado, cota) => { if (!melhor[lado] || cota.gap < melhor[lado].gap) melhor[lado] = cota; };
  for (const b of outros || []) {
    const y0 = Math.max(a.y, b.y), y1 = Math.min(a.y + a.h, b.y + b.h);
    if (y1 > y0) {
      const y = (y0 + y1) / 2;
      const esq = a.x - (b.x + b.w);
      if (esq > 0) guarda("left", { dir: "left", axis: "x", gap: esq, x: b.x + b.w, y, len: esq });
      const dir = b.x - (a.x + a.w);
      if (dir > 0) guarda("right", { dir: "right", axis: "x", gap: dir, x: a.x + a.w, y, len: dir });
    }
    const x0 = Math.max(a.x, b.x), x1 = Math.min(a.x + a.w, b.x + b.w);
    if (x1 > x0) {
      const x = (x0 + x1) / 2;
      const cima = a.y - (b.y + b.h);
      if (cima > 0) guarda("top", { dir: "top", axis: "y", gap: cima, x, y: b.y + b.h, len: cima });
      const baixo = b.y - (a.y + a.h);
      if (baixo > 0) guarda("bottom", { dir: "bottom", axis: "y", gap: baixo, x, y: a.y + a.h, len: baixo });
    }
  }
  return [melhor.left, melhor.right, melhor.top, melhor.bottom].filter(Boolean);
}

/**
 * Quanto um eixo está REALMENTE COBERTO, em px — a soma dos trechos com tela,
 * ignorando o vazio entre eles.
 *
 * ⚠️ É a diferença entre RESOLUÇÃO e DISPOSIÇÃO, e ela já mordeu o caderno uma
 * vez (a grade da Screen contava gabinete que não existe). O vão que o técnico
 * deixa no canvas é referência VISUAL de como as telas ficam separadas — não é
 * pixel de LED e não entra em nenhuma conta de resolução. Duas telas de 1024
 * afastadas continuam sendo 2048 px de largura, não 2248.
 *
 * @param {Array<[number, number]>} intervalos pares [início, fim] no eixo
 */
export function extensaoCoberta(intervalos) {
  const ordenados = (intervalos || [])
    .filter((i) => Array.isArray(i) && i[1] > i[0])
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let ini = null;
  let fim = null;
  for (const [a, b] of ordenados) {
    if (ini === null) { ini = a; fim = b; continue; }
    if (a <= fim) { fim = Math.max(fim, b); continue; } // encosta ou sobrepõe: junta
    total += fim - ini;
    ini = a; fim = b;
  }
  return ini === null ? 0 : total + (fim - ini);
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
