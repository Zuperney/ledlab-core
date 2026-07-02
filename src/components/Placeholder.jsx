// components/Placeholder.jsx — estado vazio (empty state) em card tracejado.
import { T } from "../ui/tokens.js";

export default function Placeholder({ icon: Icon, title, description, children }) {
  return (
    <div
      style={{
        border: `1px dashed ${T.bd}`,
        borderRadius: 12,
        padding: 40,
        textAlign: "center",
        color: T.mut,
      }}
    >
      {Icon && <Icon size={32} color={T.dim} />}
      {title && <h3 style={{ color: T.txt, margin: "12px 0 4px", fontSize: 16 }}>{title}</h3>}
      {description && <p style={{ margin: "0 auto", maxWidth: 460, fontSize: 13 }}>{description}</p>}
      {children && <div style={{ marginTop: 16 }}>{children}</div>}
    </div>
  );
}
