// ui/tokens.js
// ─────────────────────────────────────────────────────────────
// "UI Tokens" — a fonte única de cores do LedLab Core.
// Componentes e páginas importam T e usam via style inline (ex: color: T.txt).
//
// DOIS temas: Dark/Roxo (padrão) e SOL — claro de ALTO CONTRASTE pra operar
// ao ar livre (contra o sol não se ganha com brilho, se ganha com contraste).
// T é um objeto MUTÁVEL: applyTheme() troca os valores in-place e o App força
// um remount (key) pra todo style inline reler — os canvas (test card, mapa de
// cabos) redesenham no remount. PRINT (relatório) não muda com o tema.
// ─────────────────────────────────────────────────────────────

// tema padrão: Dark/Roxo
const DARK = {
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

// tema SOL: claro de alto contraste (texto quase-preto, bordas fortes, acento
// violeta ESCURECIDO pra passar de 4.5:1 sobre fundo claro). acM/acL viram
// tons ESCUROS porque no app eles são usados como COR DE TEXTO de destaque.
const SOL = {
  bg: "#f2f2ee",
  sb: "#e8e8e1",
  card: "#ffffff",
  card2: "#ebebf2",
  bd: "#a9a9bd",
  bdA: "#6d28d9",

  acc: "#6d28d9",
  acM: "#5b21b6",
  acL: "#4c1d95",

  txt: "#101018",
  mut: "#333342",
  dim: "#555566",
  dim2: "#8a8a9a",

  grn: "#047857",
  amb: "#8a5a06",
  red: "#b91c1c",

  sel: "#ddd2f8",
  strip: "#e9e1fb",
  hero: "#efeafc",
  ambBg: "#fbeecb",
  grnBg: "#d3efe2",
  indBg: "#e5dcfa",
  zebra: "#ececec",
  overloadBg: "#f8d9d9",
};

export const THEMES = { dark: DARK, sol: SOL };

export const T = { ...DARK };

// troca o tema IN-PLACE (quem chama força o re-render — ver App.jsx)
export function applyTheme(name) {
  Object.assign(T, THEMES[name] || DARK);
  // o body tem background próprio no index.css (dark); acompanha o tema
  if (typeof document !== "undefined") document.body.style.background = T.bg;
}

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
