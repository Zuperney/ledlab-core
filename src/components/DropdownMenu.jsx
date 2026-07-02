// components/DropdownMenu.jsx — menu "Mais ações" (kebab).
import { useState, useRef, useEffect } from "react";
import { Ellipsis, ChevronDown } from "lucide-react";
import { T } from "../ui/tokens.js";
import { iconBtn } from "../ui/styles.js";

export default function DropdownMenu({ items = [], label = "Mais ações", Icon = Ellipsis, align = "right", triggerLabel }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const trigger = triggerLabel
    ? { display: "inline-flex", alignItems: "center", gap: 8, height: 32, padding: "0 12px", borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", fontSize: 13, fontWeight: 600 }
    : iconBtn();

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button aria-label={label} title={label} style={trigger} onClick={() => setOpen((o) => !o)}>
        <Icon size={16} />
        {triggerLabel && <>{triggerLabel} <ChevronDown size={14} /></>}
      </button>
      {open && (
        <div
          style={{
            position: "absolute", top: "calc(100% + 4px)", [align]: 0, zIndex: 30,
            minWidth: 180, background: T.card, border: `1px solid ${T.bd}`,
            borderRadius: 10, padding: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {items.map((it, i) => {
            const ItIcon = it.Icon;
            return (
              <button
                key={i}
                disabled={it.disabled}
                title={it.title}
                onClick={() => { setOpen(false); it.onClick?.(); }}
                style={{
                  display: "flex", alignItems: "center", gap: 10, width: "100%",
                  padding: "8px 10px", borderRadius: 6, border: "none", cursor: it.disabled ? "not-allowed" : "pointer",
                  background: it.active ? T.sel : "transparent",
                  color: it.disabled ? T.dim2 : it.danger ? T.red : T.txt,
                  fontSize: 13, textAlign: "left",
                }}
              >
                {ItIcon && <ItIcon size={15} />}
                {it.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
