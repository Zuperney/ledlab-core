// components/SectionHeader.jsx — cabeçalho de seção/página com ações à direita
// (empilha no mobile pra o título/subtítulo não ficarem espremidos).
import { T } from "../ui/tokens.js";
import { useIsMobile } from "../hooks/useIsMobile.js";

export default function SectionHeader({ title, subtitle, children }) {
  const isMobile = useIsMobile();
  // no mobile o nome da página já aparece no header do app — não repete o título aqui
  // (economiza altura); mantém só o subtítulo, compacto.
  return (
    <div style={{ display: "flex", flexDirection: isMobile ? "column" : "row", alignItems: isMobile ? "stretch" : "flex-start", justifyContent: "space-between", gap: isMobile ? 10 : 16, marginBottom: isMobile ? 12 : 16 }}>
      {(!isMobile || subtitle) && (
        <div style={{ minWidth: 0 }}>
          {!isMobile && <h2 style={{ color: T.txt, margin: 0, fontSize: 18 }}>{title}</h2>}
          {subtitle && <p style={{ color: T.mut, margin: isMobile ? 0 : "4px 0 0", fontSize: isMobile ? 12.5 : 13 }}>{subtitle}</p>}
        </div>
      )}
      {children && <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>{children}</div>}
    </div>
  );
}
