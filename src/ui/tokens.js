// ui/tokens.js
// ─────────────────────────────────────────────────────────────
// "UI Tokens" — a fonte única de cores do LedLab Core (tema Dark/Roxo).
// Componentes e páginas importam T e usam via style inline (ex: color: T.txt).
// ─────────────────────────────────────────────────────────────

export const T = {
  bg: "#0d0d1a", // fundo do app
  sb: "#11112a", // sidebar / painéis
  card: "#1a1a2e",
  card2: "#12122a",
  bd: "#2d2d4e", // borda
  bdA: "#3b1f6e", // borda de destaque

  acc: "#7c3aed", // acento primário (violeta)
  acM: "#a78bfa", // acento médio
  acL: "#c4b5fd", // acento claro

  txt: "#e5e7eb",
  mut: "#9ca3af", // texto suave
  dim: "#6b7280",
  dim2: "#4b5563",

  grn: "#34d399",
  amb: "#fbbf24",
  red: "#f87171",

  sel: "#2e1f5e", // fundo selecionado
  strip: "#1a1040",
  hero: "#150e2a",
  ambBg: "#3b2a07",
  grnBg: "#083d2a",
  indBg: "#1e1040",
  zebra: "#14142a", // linhas zebradas de tabela
  overloadBg: "#3b0a0a", // fundo de badge de sobrecarga / cancelado
};

// Paleta categórica (cores de cabos, blocos de portas, etc.)
export const PALETTE = [
  "#0f766e", "#ea580c", "#2563eb", "#dc2626",
  "#7c3aed", "#059669", "#ca8a04", "#db2777",
];

export const paletteColor = (i) => PALETTE[i % PALETTE.length];

// Tokens claros para o documento de Relatório (impressão / PDF).
export const PRINT = {
  ink: "#0f172a",
  mut: "#475569",
  dim: "#64748b",
  line: "#e2e8f0",
  head: "#f1f5f9",
  acc: "#6d28d9",
  grn: "#047857",
  red: "#b91c1c",
  amb: "#b45309",
};

export const FONT = "system-ui, sans-serif";
