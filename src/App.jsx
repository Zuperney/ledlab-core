// App.jsx — shell: sidebar, topbar e navegação principal orientada por rota.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, TriangleAlert, Eye, EyeOff, Sparkles, X, Settings as SettingsIcon, Sun, Moon } from "lucide-react";
import { useLocation } from "wouter";
import logo from "./assets/logo.png";
import { NAV, SECTIONS, LABELS, VERSION, WHATS_NEW } from "./nav.js";
import { useToast } from "./store/UIContext.jsx";
import { useAuth } from "./store/AuthContext.jsx";
import { T, FONT, applyTheme } from "./ui/tokens.js";
import { Z } from "./config/uiConfig.js";
import { useIsMobile } from "./hooks/useIsMobile.js";
import { useLedLabContext } from "./store/AppContext.jsx";
import NavBtn from "./components/NavBtn.jsx";
import BottomNav from "./components/BottomNav.jsx";
import ErrorBoundary from "./components/ErrorBoundary.jsx";
import Drawer from "./components/Drawer.jsx";

import Dashboard from "./pages/Dashboard.jsx";
import Agenda from "./pages/Agenda.jsx";
import Caches from "./pages/Caches.jsx";
import Financeiro from "./pages/Financeiro.jsx";
import Reembolso from "./pages/Reembolso.jsx";
import Inventory from "./pages/Inventory.jsx";
import Equipamentos from "./pages/Equipamentos.jsx";
import Projects from "./pages/Projects.jsx";
import Diagrams from "./pages/Diagrams.jsx";
import TestCards from "./pages/TestCards.jsx";
import AspectRatio from "./pages/AspectRatio.jsx";
import Knowledge from "./pages/Knowledge.jsx";
import Settings from "./pages/Settings.jsx";

// Configurações NÃO é rota: vira overlay (Drawer) por cima da página atual, pra não
// desmontar onde o usuário está. Por isso fica fora de PAGES (ver settingsOpen abaixo).
const PAGES = {
  dashboard: Dashboard, agenda: Agenda, diarias: Caches, financeiro: Financeiro, reembolso: Reembolso, inventory: Inventory, equipamentos: Equipamentos, projects: Projects,
  diagrams: Diagrams, testcards: TestCards, aspect: AspectRatio,
  knowledge: Knowledge,
};
const DEFAULT_PAGE = "dashboard";
const PAGE_TO_PATH = Object.fromEntries(Object.keys(PAGES).map((id) => [id, `/${id}`]));
const PATH_TO_PAGE = Object.fromEntries(Object.entries(PAGE_TO_PATH).map(([id, path]) => [path, id]));

export default function App() {
  const [location, setLocation] = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [openProjectId, setOpenProjectId] = useState(null);
  const [settingsOpen, setSettingsOpen] = useState(false); // overlay de Configurações
  const isMobile = useIsMobile();
  // páginas desktop-only (ex.: Equipamentos) caem na Visão Geral no mobile
  const rawPage = PATH_TO_PAGE[location] || DEFAULT_PAGE;
  const page = isMobile && NAV.find((n) => n.id === rawPage)?.desktopOnly ? DEFAULT_PAGE : rawPage;
  const Page = PAGES[page] || Dashboard;
  const { storageOk, projects, worklog, prefs, setPrefs, lastBackupAt, exportBackup } = useLedLabContext();
  const { user } = useAuth();
  const toast = useToast();
  const [backupNagOff, setBackupNagOff] = useState(false);
  // se a versão salva difere da atual (houve atualização), prepara o modal de novidades.
  // Decide no initializer (leitura única); a marcação de "visto" fica no efeito abaixo.
  const [updateInfo, setUpdateInfo] = useState(() => {
    try {
      const last = localStorage.getItem("ledlab.lastSeenVersion");
      return last && last !== VERSION && WHATS_NEW ? { version: VERSION, whatsNew: WHATS_NEW } : null;
    } catch { return null; }
  });
  // eslint-disable-next-line react-hooks/purity -- relógio de parede só p/ exibição (granularidade de dias); cada render mantém fresco
  const daysNoBackup = lastBackupAt ? (Date.now() - new Date(lastBackupAt).getTime()) / 86400000 : Infinity;
  const hasUserData = (projects?.length || 0) > 0 || (worklog?.length || 0) > 0;
  // não incomoda com backup local se está logado — a nuvem já é o backup.
  // Só na Visão Geral: banner em TODA tela vira teto permanente (~100px de moldura
  // por página no mobile) — o lembrete numa página basta.
  const showBackupNag = storageOk && hasUserData && daysNoBackup > 7 && !backupNagOff && !user && page === "dashboard";
  const doBackup = () => { exportBackup(); toast("Backup exportado"); };
  // privacidade: esconde os valores em R$ (dashboard + diárias). Toggle no topbar (olho).
  const ocultarValores = !!prefs.dashOcultarValor;
  const toggleOcultar = () => setPrefs({ ...prefs, dashOcultarValor: !ocultarValores });

  // MODO SOL: claro de alto contraste pra operar ao ar livre (toggle no topbar —
  // em campo é ajuste frequente, não mora em Configurações). Os tokens T são
  // trocados in-place e o key={theme} remonta a árvore pra tudo reler as cores.
  // troca determinística dos tokens ANTES dos filhos renderizarem; o key={theme}
  // remonta a árvore no mesmo render, então todo style inline relê as cores novas
  const theme = prefs.theme === "sol" ? "sol" : "dark";
  applyTheme(theme);
  const toggleTheme = () => setPrefs({ ...prefs, theme: theme === "sol" ? "dark" : "sol" });

  // marca a versão atual como "vista" (o modal já foi decidido no initializer acima)
  useEffect(() => {
    try { localStorage.setItem("ledlab.lastSeenVersion", VERSION); } catch { /* ok */ }
  }, []);

  // Esc fecha o overlay de Configurações (backdrop e X já fecham no próprio Drawer)
  useEffect(() => {
    if (!settingsOpen) return;
    const onKey = (e) => { if (e.key === "Escape") setSettingsOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [settingsOpen]);

  useEffect(() => {
    if (location === "/") {
      setLocation(PAGE_TO_PATH[DEFAULT_PAGE], { replace: true });
      return;
    }
    if (!PATH_TO_PAGE[location]) setLocation(PAGE_TO_PATH[DEFAULT_PAGE], { replace: true });
  }, [location, setLocation]);

  // saiu de Projetos com um projeto aberto → limpa durante o render (ajuste convergente)
  if (page !== "projects" && openProjectId) setOpenProjectId(null);

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
      <div key={theme} className="app-mobile-shell" style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", background: T.bg, color: T.txt, fontFamily: FONT, fontSize: 14 }}>
        <header className="app-mobile-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "calc(9px + env(safe-area-inset-top)) calc(14px + env(safe-area-inset-right)) 9px calc(14px + env(safe-area-inset-left))", borderBottom: `1px solid ${T.bd}`, background: T.bg, flexShrink: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
            <img src={logo} alt="" style={{ width: 26, height: 26, borderRadius: 6, flexShrink: 0 }} />
            <h1 style={{ margin: 0, fontSize: 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{LABELS[page] || "LedLab Core"}</h1>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            {/* alvos de 38px no mobile (thumb zone; NN/g pede ~1cm) — desktop segue 30 */}
            <SunToggle sol={theme === "sol"} onClick={toggleTheme} size={38} />
            <PrivacyEye on={ocultarValores} onClick={toggleOcultar} size={38} />
            <button onClick={() => setSettingsOpen(true)} aria-label="Configurações" title="Configurações"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 8, background: settingsOpen ? T.sel : "transparent", border: `1px solid ${settingsOpen ? T.acc : T.bd}`, color: settingsOpen ? T.acM : T.mut, cursor: "pointer", padding: 0 }}>
              <SettingsIcon size={17} />
            </button>
            {/* badge de versão saiu do topbar mobile (respiro) — mora nas Configurações */}
          </div>
        </header>
        <main style={{ flex: 1, overflowY: "auto", overflowX: "hidden", padding: 12, paddingBottom: "calc(66px + env(safe-area-inset-bottom))" }}>
          {!storageOk && <StorageBanner />}
          {showBackupNag && <BackupReminder days={daysNoBackup} onBackup={doBackup} onDismiss={() => setBackupNagOff(true)} />}
          <ErrorBoundary>
            <Page nav={nav} />
          </ErrorBoundary>
        </main>
        <BottomNav page={page} onNavigate={navigate} />
        {updateInfo && <UpdateModal info={updateInfo} onClose={() => setUpdateInfo(null)} />}
        <Drawer open={settingsOpen} title="Configurações" onClose={() => setSettingsOpen(false)} width={560}>
          <Settings embedded />
        </Drawer>
      </div>
    );
  }

  const topItems = NAV.filter((n) => n.sec === null && n.id !== "settings");
  const settingsItem = NAV.find((n) => n.id === "settings");

  const renderItem = (item) => (
    <NavBtn key={item.id} item={item} active={page === item.id} collapsed={collapsed} onClick={() => navigate(item.id)} />
  );

  return (
    <div key={theme} style={{ display: "flex", height: "100%", width: "100%", background: T.bg, color: T.txt, fontFamily: FONT, fontSize: 14 }}>
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
          {settingsItem && <NavBtn item={settingsItem} active={settingsOpen} collapsed={collapsed} onClick={() => setSettingsOpen(true)} />}
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
            <SunToggle sol={theme === "sol"} onClick={toggleTheme} />
            <PrivacyEye on={ocultarValores} onClick={toggleOcultar} />
            <span style={{ background: T.sel, color: T.acM, borderRadius: 999, padding: "3px 10px", fontSize: 12, fontWeight: 600 }}>{VERSION}</span>
            <div style={{ width: 30, height: 30, borderRadius: "50%", background: T.acc, color: T.accInk, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>D</div>
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
      {updateInfo && <UpdateModal info={updateInfo} onClose={() => setUpdateInfo(null)} />}
      <Drawer open={settingsOpen} title="Configurações" onClose={() => setSettingsOpen(false)} width={560}>
        <Settings embedded />
      </Drawer>
    </div>
  );
}

// modal pós-atualização: aparece uma vez ao subir de versão, com o "o que mudou".
// O usuário fecha (botão, X, clique fora ou Esc) — não some sozinho como o toast antigo.
function UpdateModal({ info, onClose }) {
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div onClick={onClose} role="dialog" aria-modal="true"
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: Z.dialog, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px calc(20px + env(safe-area-inset-right)) calc(20px + env(safe-area-inset-bottom)) calc(20px + env(safe-area-inset-left))" }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: T.card, border: `1px solid ${T.bd}`, borderRadius: 16, padding: 22, boxShadow: "0 24px 64px rgba(0,0,0,0.55)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: 11, background: T.sel, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Sparkles size={22} style={{ color: T.acM }} />
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Aplicativo atualizado</div>
            <div style={{ color: T.txt, fontSize: 18, fontWeight: 700 }}>Novidades da {info.version}</div>
          </div>
          <button onClick={onClose} aria-label="Fechar" style={{ background: "none", border: "none", color: T.mut, cursor: "pointer", padding: 4, display: "flex", flexShrink: 0 }}><X size={18} /></button>
        </div>
        <div style={{ color: T.txt, fontSize: 14, lineHeight: 1.55, marginBottom: 20 }}>{info.whatsNew}</div>
        <button onClick={onClose} autoFocus
          style={{ width: "100%", background: T.acc, color: T.accInk, border: "none", borderRadius: 10, padding: "11px 16px", fontSize: 14, fontWeight: 700, cursor: "pointer", fontFamily: FONT }}>
          Entendi
        </button>
      </div>
    </div>
  );
}

// MODO SOL no topbar — alterna o tema claro de alto contraste pra ler ao ar livre
function SunToggle({ sol, onClick, size = 30 }) {
  return (
    <button onClick={onClick} aria-label={sol ? "Voltar ao tema escuro" : "Modo sol (alto contraste)"} title={sol ? "Voltar ao tema escuro" : "Modo sol — claro de alto contraste pra ler no sol"}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: 8, background: sol ? T.sel : "transparent", border: `1px solid ${sol ? T.acc : T.bd}`, color: sol ? T.acM : T.mut, cursor: "pointer", padding: 0 }}>
      {sol ? <Moon size={16} /> : <Sun size={16} />}
    </button>
  );
}

// olho de privacidade no topbar — esconde/mostra os valores em R$ (dashboard + diárias)
function PrivacyEye({ on, onClick, size = 30 }) {
  return (
    <button onClick={onClick} aria-label={on ? "Mostrar valores" : "Ocultar valores"} title={on ? "Mostrar valores em R$" : "Ocultar valores em R$"}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: 8, background: on ? T.sel : "transparent", border: `1px solid ${on ? T.acc : T.bd}`, color: on ? T.acM : T.mut, cursor: "pointer", padding: 0 }}>
      {on ? <EyeOff size={16} /> : <Eye size={16} />}
    </button>
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
      <button onClick={onBackup} style={{ flexShrink: 0, background: T.acc, color: T.accInk, border: "none", borderRadius: 8, padding: "6px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Fazer backup</button>
      <button onClick={onDismiss} aria-label="Dispensar" style={{ flexShrink: 0, background: "none", border: "none", color: T.mut, cursor: "pointer", fontSize: 18, lineHeight: 1, padding: "0 2px" }}>×</button>
    </div>
  );
}
