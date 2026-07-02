// components/SectionHeader.jsx — cabeçalho de seção/página com ações à direita.
import { T } from "../ui/tokens.js";

export default function SectionHeader({ title, subtitle, children }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 16 }}>
      <div>
        <h2 style={{ color: T.txt, margin: 0, fontSize: 18 }}>{title}</h2>
        {subtitle && <p style={{ color: T.mut, margin: "4px 0 0", fontSize: 13 }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{children}</div>}
    </div>
  );
}
