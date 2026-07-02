// components/GabinetePill.jsx — pílula indicando um gabinete vinculado.
import { Link2 } from "lucide-react";
import { T } from "../ui/tokens.js";

export default function GabinetePill({ label = "Gabinete" }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 5,
        background: T.card2, color: T.acM, border: `1px solid ${T.bd}`,
        borderRadius: 999, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      }}
    >
      <Link2 size={12} />
      {label}
    </span>
  );
}
