// components/SectionMenu.jsx — popover contextual do menu mobile.
//
// Abre logo ACIMA da aba de seção tocada, com uma setinha apontando pra ela. Leve e
// elegante: cartão arredondado, sem escurecer a tela (só um captador transparente de
// toque-fora pra fechar). Diferente da BottomSheet (que segue no resto do app). A
// geometria da âncora (posição/tamanho da aba + dimensões da tela) vem no toque, então
// nada de ler `window` durante o render.
import { useEffect, useState } from "react";
import { T } from "../ui/tokens.js";
import { Z } from "../config/uiConfig.js";

const W = 236;      // largura do popover
const MARGIN = 12;  // respiro das bordas da tela

export default function SectionMenu({ title, items, anchor, page, onSelect, onClose }) {
  const [inView, setInView] = useState(false); // dispara a animação de entrada
  useEffect(() => {
    // rAF anima suave em device real; setTimeout garante visibilidade mesmo onde o
    // rAF é estrangulado (aba em segundo plano / ambiente sem composição).
    const raf = requestAnimationFrame(() => setInView(true));
    const t = setTimeout(() => setInView(true), 40);
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { cancelAnimationFrame(raf); clearTimeout(t); window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  const centerX = anchor.left + anchor.width / 2;
  const left = Math.min(Math.max(centerX - W / 2, MARGIN), anchor.vw - W - MARGIN);
  const caretX = Math.min(Math.max(centerX - left, 22), W - 22); // setinha ancorada na aba
  const bottom = anchor.vh - anchor.top + 12; // fica acima da barra

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: Z.sheet, background: "transparent" }}>
      <div onClick={(e) => e.stopPropagation()} role="menu"
        style={{
          position: "fixed", left, bottom, width: W,
          background: T.card, border: `1px solid ${T.bd}`, borderRadius: 14,
          boxShadow: "0 14px 44px rgba(0,0,0,0.55)", padding: 6,
          transformOrigin: `${caretX}px 100%`,
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0) scale(1)" : "translateY(8px) scale(0.96)",
          transition: "opacity .16s ease, transform .19s cubic-bezier(.2,.8,.2,1)",
        }}>
        <div style={{ color: T.dim, fontSize: 10.5, textTransform: "uppercase", letterSpacing: ".08em", padding: "6px 10px 5px" }}>{title}</div>
        {items.map((it) => {
          const Icon = it.Icon;
          const active = page === it.id;
          return (
            <button key={it.id} onClick={() => onSelect(it.id)} role="menuitem"
              style={{ display: "flex", alignItems: "center", gap: 11, width: "100%", padding: "11px 10px", background: active ? T.sel : "transparent", border: "none", borderRadius: 9, cursor: "pointer", color: active ? T.txt : T.mut, fontSize: 14.5, fontWeight: 600, textAlign: "left" }}>
              <Icon size={17} color={active ? T.acM : T.mut} /> {it.label}
            </button>
          );
        })}
        {/* setinha (quadrado girado) apontando pra aba tocada */}
        <span style={{ position: "absolute", left: caretX - 6, bottom: -6, width: 12, height: 12, background: T.card, borderRight: `1px solid ${T.bd}`, borderBottom: `1px solid ${T.bd}`, borderBottomRightRadius: 3, transform: "rotate(45deg)" }} />
      </div>
    </div>
  );
}
