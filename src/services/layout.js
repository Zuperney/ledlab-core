// services/layout.js — geometria de layout da Composição.
// Extraído do componente pra ser testável (vitest) — segurança de campo:
// tela sobreposta na composição = conteúdo duplicado/escondido no painel real.

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
