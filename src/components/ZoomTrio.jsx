// components/ZoomTrio.jsx — o trio de zoom padrão (R6): diminuir · enquadrar · aumentar.
// Um só tamanho (34px) em todo canvas do app.
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { T } from "../ui/tokens.js";

export default function ZoomTrio({ onOut, onFit, onIn }) {
  const b = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", padding: 0 };
  return (
    <span style={{ display: "inline-flex", gap: 6, flexShrink: 0 }}>
      <button style={b} title="Diminuir" aria-label="Diminuir zoom" onClick={onOut}><ZoomOut size={15} /></button>
      <button style={b} title="Enquadrar" aria-label="Enquadrar" onClick={onFit}><Maximize size={15} /></button>
      <button style={b} title="Aumentar" aria-label="Aumentar zoom" onClick={onIn}><ZoomIn size={15} /></button>
    </span>
  );
}
