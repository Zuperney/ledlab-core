// ui/styles.js — helpers de estilo compartilhados (inline styles + T).
import { T, FONT } from "./tokens.js";

export const card = (extra = {}) => ({
  background: T.card,
  border: `1px solid ${T.bd}`,
  borderRadius: 12,
  padding: 16,
  ...extra,
});

export const label = {
  display: "block",
  textTransform: "uppercase",
  fontSize: 11,
  letterSpacing: "0.06em",
  color: T.mut,
  marginBottom: 6,
};

export const input = (extra = {}) => ({
  width: "100%",
  background: T.card2,
  color: T.txt,
  border: `1px solid ${T.bd}`,
  borderRadius: 8,
  padding: "9px 12px",
  fontSize: 14,
  fontFamily: FONT,
  outline: "none",
  ...extra,
});

export const btn = (variant = "ghost", extra = {}) => {
  const base = {
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    borderRadius: 8,
    padding: "9px 14px",
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    border: "1px solid transparent",
    fontFamily: FONT,
  };
  const variants = {
    primary: { background: T.acc, color: "#fff" },
    ghost: { background: T.card2, color: T.txt, borderColor: T.bd },
    subtle: { background: "transparent", color: T.mut, borderColor: T.bd },
    danger: { background: "transparent", color: T.red, borderColor: T.bd },
  };
  return { ...base, ...(variants[variant] || variants.ghost), ...extra };
};

export const iconBtn = (extra = {}) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 44,
  height: 44,
  borderRadius: 8,
  background: T.card2,
  border: `1px solid ${T.bd}`,
  color: T.mut,
  cursor: "pointer",
  ...extra,
});

// botão de ícone destrutivo (lixeira): vermelho
export const dangerIconBtn = (extra = {}) => iconBtn({ color: T.red, ...extra });
