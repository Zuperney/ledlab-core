// components/BottomNav.jsx — navegação inferior (mobile). 5 entradas: Início, Agenda,
// Projetos, Ferramentas (folha) e Mais (folha). Reaproveita NAV p/ rótulos/ícones.
import { useState } from "react";
import { LayoutDashboard, CalendarDays, FolderOpen, Wrench, MoreHorizontal } from "lucide-react";
import { NAV } from "../nav.js";
import { T } from "../ui/tokens.js";
import { Z, TOUCH_MIN } from "../config/uiConfig.js";
import BottomSheet from "./BottomSheet.jsx";

const TOOL_IDS = ["diagrams", "testcards", "aspect"];
const MORE_IDS = ["inventory", "knowledge", "settings"];
const byId = (id) => NAV.find((n) => n.id === id);

export default function BottomNav({ page, onNavigate }) {
  const [sheet, setSheet] = useState(null); // "tools" | "more" | null

  const tabs = [
    { id: "dashboard", label: "Início", Icon: LayoutDashboard, active: page === "dashboard" },
    { id: "agenda", label: "Agenda", Icon: CalendarDays, active: page === "agenda" },
    { id: "projects", label: "Projetos", Icon: FolderOpen, active: page === "projects" },
    { id: "tools", label: "Ferramentas", Icon: Wrench, active: TOOL_IDS.includes(page), sheet: "tools" },
    { id: "more", label: "Mais", Icon: MoreHorizontal, active: MORE_IDS.includes(page), sheet: "more" },
  ];

  const go = (id) => { setSheet(null); onNavigate(id); };
  const items = sheet === "tools" ? TOOL_IDS.map(byId) : sheet === "more" ? MORE_IDS.map(byId) : [];

  return (
    <>
      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: Z.bottomNav, display: "flex", background: T.sb, borderTop: `1px solid ${T.bd}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {tabs.map((t) => {
          const Icon = t.Icon;
          return (
            <button key={t.id} onClick={() => (t.sheet ? setSheet(t.sheet) : go(t.id))}
              style={{ flex: 1, minHeight: TOUCH_MIN + 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 3, background: "none", border: "none", cursor: "pointer", color: t.active ? T.acM : T.mut, padding: "8px 2px" }}>
              <Icon size={20} />
              <span style={{ fontSize: 10, fontWeight: 600 }}>{t.label}</span>
            </button>
          );
        })}
      </nav>

      {sheet && (
        <BottomSheet title={sheet === "tools" ? "Ferramentas" : "Mais"} onClose={() => setSheet(null)}>
          {items.filter(Boolean).map((it) => {
            const Icon = it.Icon;
            const active = page === it.id;
            return (
              <button key={it.id} onClick={() => go(it.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 10px", background: active ? T.sel : "transparent", border: "none", borderRadius: 10, cursor: "pointer", color: active ? T.txt : T.mut, fontSize: 15, fontWeight: 600, textAlign: "left" }}>
                <Icon size={18} /> {it.label}
              </button>
            );
          })}
        </BottomSheet>
      )}
    </>
  );
}
