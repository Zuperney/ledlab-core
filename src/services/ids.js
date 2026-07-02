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

// id numérico (usado ao importar gabinetes antigos)
export const genNumericId = (i = 0) =>
  Date.now() + i + Math.floor(Math.random() * 1000);
