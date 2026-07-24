// components/HelpTip.jsx — o "?" que guarda a didática.
//
// Texto explicativo fixo na tela é teto permanente: ensina UMA vez e depois só
// ocupa (feedback dos prints de campo — "poluição visual"). O HelpTip inverte:
// a explicação aparece SOB DEMANDA, num popover, pra quem precisa e na hora que
// precisa. Usar em toda didática de aba (Screens, Composição, Relatório…).
import { useState, useRef, useEffect } from "react";
import { T } from "../ui/tokens.js";
import { Z } from "../config/uiConfig.js";

export default function HelpTip({ children, title = "Como funciona", align = "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // fecha ao tocar fora (padrão dos popovers do app)
  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    return () => document.removeEventListener("pointerdown", onDoc);
  }, [open]);

  return (
    <span ref={ref} style={{ position: "relative", display: "inline-flex", verticalAlign: "middle" }}>
      <button onClick={() => setOpen((v) => !v)} aria-label={title} aria-expanded={open} title={title}
        style={{ width: 22, height: 22, borderRadius: "50%", border: `1px solid ${open ? T.acc : T.bd}`, background: open ? T.sel : T.card2, color: open ? T.acM : T.dim, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", padding: 0, flexShrink: 0, fontFamily: "inherit" }}>
        ?
      </button>
      {open && (
        <div role="note" style={{ position: "absolute", top: 27, [align === "left" ? "left" : "right"]: 0, zIndex: Z.sheet - 1, width: "min(300px, 78vw)", background: T.card, border: `1px solid ${T.bd}`, borderRadius: 10, padding: "10px 12px", color: T.mut, fontSize: 12.5, lineHeight: 1.55, boxShadow: "0 10px 30px rgba(0,0,0,0.45)" }}>
          {children}
        </div>
      )}
    </span>
  );
}
