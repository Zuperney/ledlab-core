// components/LightModal.jsx — o "modal LEVE" (pedido do usuário): um card flutuante
// compacto que NÃO preenche a tela — diferente do Drawer das Configurações globais
// e da BottomSheet. Pra ajustes rápidos de contexto (ex.: Avançado da Screen).
import { useEffect } from "react";
import { X } from "lucide-react";
import { T } from "../ui/tokens.js";
import { Z } from "../config/uiConfig.js";

export default function LightModal({ title, onClose, children, width = 400 }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.35)", zIndex: Z.sheet, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true"
        style={{ width: "100%", maxWidth: width, maxHeight: "72vh", overflowY: "auto", background: T.card, border: `1px solid ${T.bd}`, borderRadius: 14, padding: "12px 14px 14px", boxShadow: "0 18px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ color: T.mut, fontSize: 12, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>{title}</span>
          <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", color: T.mut, cursor: "pointer", padding: 6, margin: -6, display: "flex" }}><X size={17} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
