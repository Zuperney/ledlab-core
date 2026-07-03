// components/BottomSheet.jsx — folha deslizante de baixo (mobile): menus, filtros, ações.
import { X } from "lucide-react";
import { T } from "../ui/tokens.js";
import { Z } from "../config/uiConfig.js";

export default function BottomSheet({ title, onClose, children }) {
  return (
    <div onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: Z.sheet, display: "flex", alignItems: "flex-end" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", background: T.card, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTop: `1px solid ${T.bd}`, padding: "14px 14px calc(14px + env(safe-area-inset-bottom))", maxHeight: "72vh", overflowY: "auto", boxShadow: "0 -12px 40px rgba(0,0,0,0.5)" }}>
        <div style={{ width: 36, height: 4, borderRadius: 3, background: T.bd, margin: "0 auto 12px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <span style={{ color: T.mut, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>{title}</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: T.mut, cursor: "pointer", padding: 6, display: "flex" }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
