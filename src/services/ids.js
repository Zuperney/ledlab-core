// services/ids.js
// Geração de ids únicos. Usa crypto.randomUUID() quando disponível,
// senão cai num id legível "<prefix>-<base36 do tempo><aleatório>".

export function genId(prefix = "id") {
  try {
    if (typeof crypto !== "undefined" && crypto.randomUUID) {
      return crypto.randomUUID();
    }
  } catch {
    /* ignore */
  }
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${t}${r}`;
}

// id numérico (usado ao importar gabinetes antigos). Date.now()*1000 reserva 1000 "slots"
// por milissegundo; o índice incremental i (0..999) desambigua itens do mesmo lote sem
// colidir (o additivo antigo, Date.now()+i+random, podia repetir dentro de um mesmo import).
export const genNumericId = (i = 0) => Date.now() * 1000 + (i % 1000);
