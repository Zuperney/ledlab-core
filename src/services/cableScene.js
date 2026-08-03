// services/cableScene.js — a CENA IMPRESSA do mapa de cabos (estilo SmartLCT,
// decisão do dono 02/08): região de cada cabo em PASTEL da própria cor,
// serpentina azul com setas na ordem elétrica, entrada verde numerada e fim
// vermelho. Aqui mora só o que é genuinamente compartilhado entre o PDF
// (pdfCableMap.js, strings SVG) e o DOM (CablingLayer.jsx, JSX): cores da cena
// e geometria pura — o desenho em si continua em cada lado, mas nunca desalinha
// de cor nem de matemática.
// PURO de propósito: testável sem pdfmake nem DOM.

export const ROUTE = "#1e40af"; // serpentina (azul único, como o export do LCT)
export const ENTRY = "#16a34a"; // selo de entrada (verde numerado)
export const END = "#dc2626"; // fim do cabo (ponto vermelho)
export const FRAME = "#e2e8f0"; // moldura do mapa sobre o papel
export const UNASSIGNED = "#94a3b8"; // gabinete sem cabo (tracejado)
export const TINT_K = 0.75; // fração de branco no pastel da região

const r2 = (n) => Math.round(n * 100) / 100;

// pastel da cor do cabo: mistura com branco componente a componente. Saída
// SEMPRE hex de 6 dígitos — o motor de SVG do pdfmake não aceita #rrggbbaa.
// Cor base já clara (paleta customizada do usuário) mistura MENOS, senão a
// região some no papel; hex inválido cai num cinza neutro em vez de propagar
// lixo pro SVG.
export function tint(hex, k = TINT_K) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return "#d4d4d8";
  let h = m[1];
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const ch = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const luma = 0.299 * ch[0] + 0.587 * ch[1] + 0.114 * ch[2];
  const kk = luma > 180 ? Math.min(k, 0.45) : k;
  return "#" + ch.map((c) => Math.round(c + (255 - c) * kk).toString(16).padStart(2, "0")).join("");
}

// centros das células do cabo, NA ORDEM ELÉTRICA (port[0] = entrada) — é a
// polyline da serpentina pronta pra virar path (PDF) ou points (DOM)
export function routePoints(port) {
  return port.map((c) => [r2(c.x + c.w / 2), r2(c.y + c.h / 2)]);
}

// seta de direção no ponto médio do segmento a→b, como PATH ABSOLUTO
// ("M tip L base L base Z") — sem transform/rotate, a mesma string vale pro
// motor do pdfmake e pro DOM sem depender de suporte a transform
export function arrowPath(a, b, size) {
  const dx = b[0] - a[0], dy = b[1] - a[1];
  const len = Math.hypot(dx, dy);
  if (!len) return "";
  const ux = dx / len, uy = dy / len; // direção
  const px = -uy, py = ux; // perpendicular
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const tip = [mx + ux * size, my + uy * size];
  const b1 = [mx - ux * size * 0.7 + px * size * 0.62, my - uy * size * 0.7 + py * size * 0.62];
  const b2 = [mx - ux * size * 0.7 - px * size * 0.62, my - uy * size * 0.7 - py * size * 0.62];
  const p = (pt) => `${r2(pt[0])} ${r2(pt[1])}`;
  return `M${p(tip)} L${p(b1)} L${p(b2)} Z`;
}
