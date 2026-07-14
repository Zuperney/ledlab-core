// services/layout.js — geometria de layout da Composição.
// Extraído do componente pra ser testável (vitest) — segurança de campo:
// tela sobreposta na composição = conteúdo duplicado/escondido no painel real.

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
