// components/SectionHeader.jsx — cabeçalho de seção/página com ações à direita
// (empilha no mobile pra o título/subtítulo não ficarem espremidos).
import { T } from "../ui/tokens.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

export default function SectionHeader({ title, subtitle, children }) {
  const isMobile = useIsMobile();
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-start", justifyContent: "space-between", gap: isMobile ? 12 : 16, marginBottom: 16 }}>
      <div style={{ minWidth: 0 }}>
        <h2 style={{ color: T.txt, margin: 0, fontSize: 18 }}>{title}</h2>
        {subtitle && <p style={{ color: T.mut, margin: "4px 0 0", fontSize: 13 }}>{subtitle}</p>}
      </div>
      {children && <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>{children}</div>}
    </div>
  );
}
