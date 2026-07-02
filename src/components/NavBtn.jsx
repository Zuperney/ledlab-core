// components/NavBtn.jsx — item de navegação da sidebar.
import { T } from "../ui/tokens.js";

export default function NavBtn({ item, active, onClick, collapsed }) {
  const { Icon, label } = item;
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        width: "100%",
        padding: collapsed ? "10px 0" : "10px 12px",
        justifyContent: collapsed ? "center" : "flex-start",
        background: active ? T.sel : "transparent",
        color: active ? "#fff" : T.mut,
        border: "none",
        borderLeft: `3px solid ${active ? T.acc : "transparent"}`,
        borderRadius: 8,
        cursor: "pointer",
        fontSize: 14,
        fontWeight: active ? 600 : 500,
        textAlign: "left",
      }}
    >
      <Icon size={18} />
      {!collapsed && <span>{label}</span>}
    </button>
  );
}
