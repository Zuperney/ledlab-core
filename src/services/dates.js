// services/dates.js — formatação de datas (strings YYYY-MM-DD, sem fuso).
import { MONTHS_SHORT } from "./projectCalc.js";

const parts = (iso) => (iso ? iso.split("-").map(Number) : null);

// "1 Jul" a partir de "2026-07-01"
export function formatDay(iso) {
  const p = parts(iso);
  if (!p) return "—";
  return `${p[2]} ${MONTHS_SHORT[p[1] - 1]}`;
}

// "1 Jul – 3 Jul" (ou só "11 Jul" se início == fim)
export function formatRange(inicio, fim) {
  if (!inicio) return "—";
  if (!fim || fim === inicio) return formatDay(inicio);
  return `${formatDay(inicio)} – ${formatDay(fim)}`;
}

// "02/07/2026"
export function formatFull(iso) {
  const p = parts(iso);
  if (!p) return "—";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(p[2])}/${pad(p[1])}/${p[0]}`;
}
