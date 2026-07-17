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
