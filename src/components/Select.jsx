// components/Select.jsx — dropdown temático que substitui o <select> nativo.
// Motivo: o navegador/SO desenha a LISTA ABERTA do <select> por conta própria
// (no Android vira aquela lista com radinho laranja), então o campo fechado até
// combina com o app, mas a lista aberta não. Aqui a lista casa com o tema.
//
// Drop-in: aceita <option> como filhos, dispara onChange com um evento sintético
// { target: { value } } — handlers no estilo `(e) => ...e.target.value` seguem
// funcionando sem mudança. Mobile: abre num BottomSheet; desktop: popover ancorado.
import { Children, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check, X } from "lucide-react";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { T, FONT } from "../ui/tokens.js";
import { Z } from "../config/uiConfig.js";

// lê os <option> filhos -> [{ value, label, disabled }]
function parseOptions(children) {
  const out = [];
  Children.forEach(children, (c) => {
    if (!c || typeof c !== "object" || !c.props) return;
    const kids = c.props.children;
    const label =
      typeof kids === "string" || typeof kids === "number"
        ? String(kids)
        : Children.toArray(kids)
            .map((k) => (typeof k === "string" || typeof k === "number" ? String(k) : ""))
            .join("");
    const value = c.props.value !== undefined ? c.props.value : label;
    out.push({ value, label, disabled: !!c.props.disabled });
  });
  return out;
}

export default function Select({
  value,
  onChange,
  children,
  style = {},
  disabled,
  placeholder = "Selecionar",
  title,
}) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const wrapRef = useRef(null);
  const opts = parseOptions(children);
  const current = opts.find((o) => String(o.value) === String(value));
  // "cheio" = ocupa a largura (como input()); senão fica compacto/inline (como o dropSel nativo, auto-width)
  const full = style.width === "100%";

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    // "clicar fora" só no desktop: lá o popover fica DENTRO do wrapper. No mobile a
    // lista vai pro portal (fora do wrapRef), então um mousedown nela fecharia o sheet
    // antes do clique completar — quem fecha no mobile é o backdrop do próprio sheet.
    let onDoc;
    if (!isMobile) {
      onDoc = (e) => {
        if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
      };
      document.addEventListener("mousedown", onDoc);
    }
    return () => {
      document.removeEventListener("keydown", onKey);
      if (onDoc) document.removeEventListener("mousedown", onDoc);
    };
  }, [open, isMobile]);

  const pick = (v) => {
    setOpen(false);
    // emite SEMPRE string, como o <select> nativo (o value do DOM é string) — senão
    // handlers tipo `cabs.find(x => String(x.id) === e.target.value)` quebram quando o
    // value da <option> é número (ex.: id de gabinete), gravando null sem querer.
    onChange?.({ target: { value: String(v) } });
  };

  // o wrapper carrega o layout (largura/flex/maxWidth) que o <select> nativo teria;
  // o botão sempre preenche o wrapper (width 100%).
  const hasFlex = style.flex != null;
  const wrapStyle = {
    position: "relative",
    minWidth: 0,
    verticalAlign: "middle",
    display: full && !hasFlex ? "block" : "inline-block",
  };
  if (hasFlex) wrapStyle.flex = style.flex;
  else wrapStyle.width = full ? "100%" : style.width; // "auto"/180/undefined p/ compactos
  if (style.maxWidth != null) wrapStyle.maxWidth = style.maxWidth;

  // botão fechado — herda o style do chamador (input(), dropSel…) + layout do gatilho
  const btnStyle = {
    fontFamily: FONT,
    fontSize: 16,
    ...style,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    cursor: disabled ? "default" : "pointer",
    textAlign: "left",
    width: "100%",
    opacity: disabled ? 0.55 : 1,
  };

  const rows = opts.map((o) => {
    const sel = String(o.value) === String(value);
    return (
      <button
        key={String(o.value)}
        type="button"
        disabled={o.disabled}
        onClick={() => !o.disabled && pick(o.value)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          width: "100%",
          textAlign: "left",
          padding: isMobile ? "13px 14px" : "8px 11px",
          background: sel ? T.sel : "transparent",
          border: "none",
          borderRadius: 8,
          cursor: o.disabled ? "default" : "pointer",
          color: o.disabled ? T.dim : sel ? T.acL : T.txt,
          fontFamily: FONT,
          fontSize: isMobile ? 15 : 14,
          fontWeight: sel ? 600 : 400,
          opacity: o.disabled ? 0.5 : 1,
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
        {sel && <Check size={16} style={{ flexShrink: 0 }} />}
      </button>
    );
  });

  return (
    <div ref={wrapRef} style={wrapStyle}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={title}
        style={btnStyle}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            color: current ? "inherit" : T.dim,
          }}
        >
          {current ? current.label : placeholder}
        </span>
        <ChevronDown
          size={16}
          style={{
            flexShrink: 0,
            color: T.mut,
            transition: "transform .15s",
            transform: open && !isMobile ? "rotate(180deg)" : "none",
          }}
        />
      </button>

      {open &&
        isMobile &&
        createPortal(
          <div
            onClick={() => setOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0,0,0,0.5)",
              zIndex: Z.dialog + 1,
              display: "flex",
              alignItems: "flex-end",
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                width: "100%",
                background: T.card,
                borderTopLeftRadius: 16,
                borderTopRightRadius: 16,
                borderTop: `1px solid ${T.bd}`,
                padding: "14px 10px calc(14px + env(safe-area-inset-bottom))",
                maxHeight: "72vh",
                overflowY: "auto",
                boxShadow: "0 -12px 40px rgba(0,0,0,0.5)",
              }}
            >
              <div style={{ width: 36, height: 4, borderRadius: 3, background: T.bd, margin: "0 auto 12px" }} />
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 6,
                  padding: "0 4px",
                }}
              >
                <span style={{ color: T.mut, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  {title || placeholder}
                </span>
                <button
                  onClick={() => setOpen(false)}
                  style={{ background: "none", border: "none", color: T.mut, cursor: "pointer", padding: 6, display: "flex" }}
                >
                  <X size={18} />
                </button>
              </div>
              <div style={{ display: "grid", gap: 2 }}>{rows}</div>
            </div>
          </div>,
          document.body,
        )}

      {open && !isMobile && (
        <div
          role="listbox"
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            zIndex: Z.dialog + 1,
            minWidth: "100%",
            width: "max-content",
            maxWidth: "min(92vw, 360px)",
            background: T.card,
            border: `1px solid ${T.bd}`,
            borderRadius: 10,
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
            padding: 4,
            maxHeight: 300,
            overflowY: "auto",
          }}
        >
          {rows}
        </div>
      )}
    </div>
  );
}
