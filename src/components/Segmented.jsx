// components/Segmented.jsx — escolha EXCLUSIVA de modo (F1 da gramática).
// Um pill único pra todo sub-modo do app (Sinal|AC, tipos de relatório, projeto|manual…)
// — substitui os três dialetos antigos (botões grandes, chips outline, botões soltos).
import { T } from "../ui/tokens.js";

export default function Segmented({ options, value, onChange, size = "md" }) {
  const pad = size === "sm" ? "6px 11px" : "8px 13px";
  const fs = size === "sm" ? 12.5 : 13.5;
  return (
    <div className="no-scrollbar" style={{ display: "inline-flex", gap: 3, background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 10, padding: 3, overflowX: "auto", maxWidth: "100%", flexShrink: 0 }}>
      {options.map((o) => {
        const on = String(o.value) === String(value);
        const Icon = o.Icon;
        return (
          <button key={String(o.value)} onClick={() => onChange(o.value)} aria-pressed={on} title={o.title || o.label}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: pad, borderRadius: 7, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: fs, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0, background: on ? T.acc : "transparent", color: on ? "#fff" : T.mut }}>
            {Icon && <Icon size={14} />}{o.label}
          </button>
        );
      })}
    </div>
  );
}
