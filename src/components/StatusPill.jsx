// components/StatusPill.jsx — o selo de estado padrão (R6): OK / Alerta / Faltam N.
// Cor vem do chamador (T.grn/T.red/T.amb) — o formato é sempre o mesmo.
export default function StatusPill({ color, label }) {
  return (
    <span style={{ background: color + "22", color, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", flexShrink: 0 }}>
      {label}
    </span>
  );
}
