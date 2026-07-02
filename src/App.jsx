// App.jsx — shell: sidebar, topbar e roteamento simples por estado.
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import logo from "./assets/logo.svg";
import { NAV, SECTIONS, LABELS, VERSION } from "./nav.js";
import { T, FONT } from "./ui/tokens.js";
import NavBtn from "./components/NavBtn.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Agenda from "./pages/Agenda.jsx";
import Inventory from "./pages/Inventory.jsx";
import Projects from "./pages/Projects.jsx";
import CalcElec from "./pages/CalcElec.jsx";
import CalcAdv from "./pages/CalcAdv.jsx";
import Diagrams from "./pages/Diagrams.jsx";
import TestCards from "./pages/TestCards.jsx";
import Knowledge from "./pages/Knowledge.jsx";
import Settings from "./pages/Settings.jsx";

const PAGES = {
  dashboard: Dashboard, agenda: Agenda, inventory: Inventory, projects: Projects,
  calc: CalcElec, "calc-adv": CalcAdv, diagrams: Diagrams, testcards: TestCards,
  knowledge: Knowledge, settings: Settings,
};

export default function App() {
  const [page, setPage] = useState("dashboard");
  const [collapsed, setCollapsed] = useState(false);
  const Page = PAGES[page] || Dashboard;

  const topItems = NAV.filter((n) => n.sec === null && n.id !== "settings");
  const settingsItem = NAV.find((n) => n.id === "settings");

  const renderItem = (item) => (
    <NavBtn key={item.id} item={item} active={page === item.id} collapsed={collapsed} onClick={() => setPage(item.id)} />
  );

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", background: T.bg, color: T.txt, fontFamily: FONT, fontSize: 14 }}>
      {/* sidebar */}
      <aside style={{ width: collapsed ? 60 : 220, flexShrink: 0, background: T.sb, borderRight: `1px solid ${T.bd}`, display: "flex", flexDirection: "column", padding: 12, transition: "width 0.15s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", padding: "8px 4px 16px" }}>
          <img src={logo} alt="LedLab Core" style={{ width: 34, height: 34, filter: "brightness(0) invert(1)" }} />
          {!collapsed && <span style={{ marginLeft: 10, fontWeight: 700, letterSpacing: "0.02em", lineHeight: 1.1 }}>Led Lab<br /><span style={{ color: T.acM }}>CORE</span></span>}
        </div>

        <nav style={{ display: "flex", flexDirection: "column", gap: 2, flex: 1, overflowY: "auto" }}>
          {topItems.map(renderItem)}
          {SECTIONS.map((sec) => {
            const items = NAV.filter((n) => n.sec === sec);
            if (!items.length) return null;
            return (
              <div key={sec} style={{ marginTop: 12 }}>
                {!collapsed && <div style={{ color: T.dim2, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", padding: "6px 12px" }}>{sec}</div>}
                {items.map(renderItem)}
              </div>
            );
          })}
        </nav>

        <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 8, marginTop: 8 }}>
          {settingsItem && renderItem(settingsItem)}
          <button onClick={() => setCollapsed((c) => !c)} style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "10px 12px", justifyContent: collapsed ? "center" : "flex-start", background: "transparent", color: T.dim, border: "none", cursor: "pointer", fontSize: 13 }}>
            {collapsed ? <ChevronRight size={18} /> : <><ChevronLeft size={18} /> Recolher</>}
          </button>
        </div>
      </aside>

      {/* conteúdo */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 28px", borderBottom: `1px solid ${T.bd}` }}>
          <h1 style={{ margin: 0, fontSize: 18 }}>{LABELS[page]}</h1>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ background: T.sel, color: T.acM, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{VERSION}</span>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.acc, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>D</div>
          </div>
        </header>
        <main style={{ flex: 1, overflowY: "auto", padding: 28 }}>
          <ErrorBoundary>
            <Page />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}
