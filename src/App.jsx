// App.jsx — shell: sidebar, topbar e navegação principal orientada por rota.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, TriangleAlert } from "lucide-react";
import { useLocation } from "wouter";
import logo from "./assets/logo.png";
import { NAV, SECTIONS, LABELS, VERSION } from "./nav.js";
import { useToast } from "./store/UIContext.jsx";
import { useAuth } from "./store/AuthContext.jsx";
import { T, FONT } from "./ui/tokens.js";
import { useIsMobile } from "./hooks/useIsMobile.js";
import { useLedLabContext } from "./store/AppContext.jsx";
import NavBtn from "./components/NavBtn.jsx";
import BottomNav from "./components/BottomNav.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Agenda from "./pages/Agenda.jsx";
import Financeiro from "./pages/Financeiro.jsx";
import Inventory from "./pages/Inventory.jsx";
import Projects from "./pages/Projects.jsx";
import Diagrams from "./pages/Diagrams.jsx";
import TestCards from "./pages/TestCards.jsx";
import AspectRatio from "./pages/AspectRatio.jsx";
import Knowledge from "./pages/Knowledge.jsx";
import Settings from "./pages/Settings.jsx";

const PAGES = {
  dashboard: Dashboard, agenda: Agenda, financeiro: Financeiro, inventory: Inventory, projects: Projects,
  diagrams: Diagrams, testcards: TestCards, aspect: AspectRatio,
  knowledge: Knowledge, settings: Settings,
};
const DEFAULT_PAGE = "dashboard";
const PAGE_TO_PATH = Object.fromEntries(Object.keys(PAGES).map((id) => [id, `/${id}`]));
const PATH_TO_PAGE = Object.fromEntries(Object.entries(PAGE_TO_PATH).map(([id, path]) => [path, id]));

export default function App() {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openProjectId, setOpenProjectId] = useState(null);
  const page = PATH_TO_PAGE[location] || DEFAULT_PAGE;
  const Page = PAGES[page] || Dashboard;
  const isMobile = useIsMobile();
  const { storageOk, projects, worklog, lastBackupAt, exportBackup } = useLedLabContext();
  const { user } = useAuth();
  const toast = useToast();
  const [backupNagOff, setBackupNagOff] = useState(false);
  const daysNoBackup = lastBackupAt ? (Date.now() - new Date(lastBackupAt).getTime()) / 86400000 : Infinity;
  const hasUserData = (projects?.length || 0) > 0 || (worklog?.length || 0) > 0;
  // não incomoda com backup local se está logado — a nuvem já é o backup
  const showBackupNag = storageOk && hasUserData && daysNoBackup > 7 && !backupNagOff && !user;
  const doBackup = () => { exportBackup(); toast("Backup exportado"); };

  useEffect(() => {
    if (location === "/") {
      setLocation(PAGE_TO_PATH[DEFAULT_PAGE], { replace: true });
      return;
    }
    if (!PATH_TO_PAGE[location]) setLocation(PAGE_TO_PATH[DEFAULT_PAGE], { replace: true });
  }, [location, setLocation]);

  useEffect(() => {
    if (page !== "projects" && openProjectId) setOpenProjectId(null);
  }, [page, openProjectId]);

  // navegação principal limpa projeto aberto e atualiza a URL (deep-link + back button)
  const navigate = (id) => {
    setOpenProjectId(null);
    setLocation(PAGE_TO_PATH[id] || PAGE_TO_PATH[DEFAULT_PAGE]);
  };
  // abrir um projeto específico (ex.: a partir da Agenda)
  const openProject = (id) => {
    setOpenProjectId(id);
    setLocation(PAGE_TO_PATH.projects);
  };
  const nav = { page, setPage: navigate, openProject, openProjectId, clearProject: () => setOpenProjectId(null) };

  // ── Shell mobile: topbar compacta + conteúdo + bottom navigation ──
  if (isMobile) {
    return (
      <div className="app-mobile-shell" style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", background: T.bg, color: T.txt, fontFamily: FONT, fontSize: 14 }}>
        <header className="app-mobile-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 14px", borderBottom: `1px solid ${T.bd}`, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <img src={logo} alt="" style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{LABELS[page] || "LedLab Core"}</h1>
          </div>
          <span style={{ flexShrink: 0, background: T.sel, color: T.acM, borderRadius: 999, padding: "3px 8px", fontSize: 11, fontWeight: 600 }}>{VERSION}</span>
        </header>
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 12, paddingBottom: "calc(66px + env(safe-area-inset-bottom))" }}>
          {!storageOk && <StorageBanner />}
          {showBackupNag && <BackupReminder days={daysNoBackup} onBackup={doBackup} onDismiss={() => setBackupNagOff(true)} />}
          <ErrorBoundary>
            <Page nav={nav} />
          </ErrorBoundary>
        </main>
        <BottomNav page={page} onNavigate={navigate} />
      </div>
    );
  }

  const topItems = NAV.filter((n) => n.sec === null && n.id !== "settings");
  const settingsItem = NAV.find((n) => n.id === "settings");

  const renderItem = (item) => (
    <NavBtn key={item.id} item={item} active={page === item.id} collapsed={collapsed} onClick={() => navigate(item.id)} />
  );

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", background: T.bg, color: T.txt, fontFamily: FONT, fontSize: 14 }}>
      {/* sidebar */}
      <aside style={{ width: collapsed ? 60 : 220, flexShrink: 0, background: T.sb, borderRight: `1px solid ${T.bd}`, display: "flex", flexDirection: "column", padding: 12, transition: "width 0.15s" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: collapsed ? "center" : "flex-start", padding: "8px 4px 16px" }}>
          <img src={logo} alt="LedLab Core" style={{ width: 38, height: 38, borderRadius: 8 }} />
          {!collapsed && (
            <span style={{ marginLeft: 10, fontSize: 16, fontWeight: 800, color: "#fff", letterSpacing: "0.14em" }}>CORE</span>
          )}
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
          {!storageOk && <StorageBanner />}
          {showBackupNag && <BackupReminder days={daysNoBackup} onBackup={doBackup} onDismiss={() => setBackupNagOff(true)} />}
          <ErrorBoundary>
            <Page nav={nav} />
          </ErrorBoundary>
        </main>
      </div>
    </div>
  );
}

// aviso persistente quando o navegador não consegue gravar (modo privado / quota cheia)
function StorageBanner() {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.overloadBg, border: `1px solid ${T.red}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: T.txt }}>
      <TriangleAlert size={16} color={T.red} style={{ flexShrink: 0 }} />
      <span>Este navegador não está salvando seus dados (modo privado ou armazenamento cheio). <b>As alterações se perderão ao fechar</b> — exporte um backup em Configurações.</span>
    </div>
  );
}

// lembrete discreto e dispensável: passou de ~7 dias sem backup (só quando há dados)
function BackupReminder({ days, onBackup, onDismiss }) {
  const txt = days === Infinity ? "Você ainda não fez um backup." : `Faz ${Math.floor(days)} dias desde seu último backup.`;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.sel, border: `1px solid ${T.acc}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 13, color: T.txt }}>
      <TriangleAlert size={16} color={T.acM} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1, minWidth: 0 }}>{txt} Seus dados vivem só neste navegador — <b>faça um backup</b> pra não perder.</span>
      <button onClick={onBackup} style={{ flexShrink: 0, background: T.acc, color: "#fff", border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Fazer backup</button>
      <button onClick={onDismiss} aria-label="Dispensar" style={{ flexShrink: 0, background: "none", border: "none", color: T.mut, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
    </div>
  );
}
