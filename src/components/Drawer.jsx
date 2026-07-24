// components/Drawer.jsx — painel deslizante à direita (formulários / detalhes).
// No celular ocupa a largura toda (maxWidth cede) e fica acima da bottom nav.
import { X } from "lucide-react";
import { T } from "../ui/tokens.js";
import { Z } from "../config/uiConfig.js";

export default function Drawer({ open, title, onClose, children, footer, width = 480 }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: Z.drawer, display: "flex", justifyContent: "flex-end" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%", maxWidth: width, height: "100%",
          background: T.sb, borderLeft: `1px solid ${T.bd}`,
          display: "flex", flexDirection: "column",
        }}
      >
        {/* safe-area no topo: no iOS (PWA) o cabeçalho sumia atrás da barra de status */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: 16, paddingTop: "calc(16px + env(safe-area-inset-top))", borderBottom: `1px solid ${T.bd}` }}>
          <h3 style={{ color: T.txt, margin: 0, fontSize: 16 }}>{title}</h3>
          <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", color: T.mut, cursor: "pointer", padding: 8, margin: -8, display: "flex" }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, overflowY: "auto", padding: 16 }}>{children}</div>
        {footer && <div style={{ padding: 16, borderTop: `1px solid ${T.bd}`, display: "flex", gap: 8, justifyContent: "flex-end" }}>{footer}</div>}
      </div>
    </div>
  );
}
