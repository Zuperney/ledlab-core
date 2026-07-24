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

// tema PALCO (escuro, padrão) — a MARCA: fundos quase-pretos NEUTROS, ação
// primária LIME com tinta PRETA (accInk). Ver docs/marca/manual.md §2.2.
const DARK = {
  bg: "#0f0f0d", // fundo do app
  sb: "#131311", // sidebar / painéis
  card: "#191917",
  card2: "#121210",
  bd: "#2b2b26", // borda
  bdA: "#5a5f14", // borda de destaque

  acc: "#ebf51e", // ação primária = Lime LedLab
  accInk: "#111111", // tinta sobre acc (sobre lime, SEMPRE preto)
  acM: "#e3ee45", // acento médio (texto/ícone de destaque)
  acL: "#f2f877", // acento claro

  txt: "#ececea",
  mut: "#a6a69c", // texto suave
  dim: "#72726a",
  dim2: "#4e4e47",

  grn: "#34d399",
  amb: "#fb923c", // aviso é LARANJA (amarelo colava no lime da marca)
  red: "#f87171",

  sel: "#272b0d", // fundo selecionado
  strip: "#1b1d10",
  hero: "#191b0e",
  ambBg: "#3b2408",
  grnBg: "#0a3d2a",
  indBg: "#20230d",
  zebra: "#151513", // linhas zebradas de tabela
  overloadBg: "#3b0a0a", // fundo de badge de sobrecarga / cancelado
};

// tema SOL: claro de ALTO CONTRASTE pra ler ao ar livre — a marca INVERTE:
// primária quase-preta com tinta LIME; acentos de texto em oliva (lime
// escurecido). Bordas fortes (no sol, sombra não trabalha). Manual §2.3.
const SOL = {
  bg: "#f4f4ee",
  sb: "#e9e9e1",
  card: "#ffffff",
  card2: "#ecece4",
  bd: "#a9a99b",
  bdA: "#6b7500",

  acc: "#161711", // primária preta (marca invertida)
  accInk: "#ebf51e", // tinta lime sobre a primária preta
  acM: "#5c6600", // acento de texto (oliva legível no claro)
  acL: "#454d00",

  txt: "#141410",
  mut: "#3c3c34",
  dim: "#5c5c52",
  dim2: "#8c8c80",

  grn: "#047857",
  amb: "#b45309", // laranja escuro (aviso)
  red: "#b91c1c",

  sel: "#e7ecc0",
  strip: "#eef0d8",
  hero: "#f0f2da",
  ambBg: "#fdeacd",
  grnBg: "#d2efe2",
  indBg: "#e4e8c4",
  zebra: "#ebebe4",
  overloadBg: "#f8dada",
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
// O Caderno NÃO é o app: acento OLIVA (lime é ilegível no papel — a capa é a
// única área lime). Manual §2.4 e §10.
export const PRINT = {
  ink: "#0f172a",
  mut: "#475569",
  dim: "#64748b",
  line: "#e2e8f0",
  head: "#f1f5f9",
  acc: "#4d5500",
  grn: "#047857",
  red: "#b91c1c",
  amb: "#b45309",
};

export const FONT = "system-ui, sans-serif";
