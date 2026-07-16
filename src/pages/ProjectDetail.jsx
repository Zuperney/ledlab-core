// pages/ProjectDetail.jsx — detalhe do projeto com abas.
import { useState } from "react";
import { ArrowLeft, Check, Folder, Zap, GitBranch, Monitor, LayoutGrid, FileText, Frame } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { projectRollup } from "../services/projectCalc.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { T } from "../ui/tokens.js";
import { btn } from "../ui/styles.js";
import StatusBadge from "../components/StatusBadge.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import ProjectDados from "./project/ProjectDados.jsx";
import ProjectEnergia from "./project/ProjectEnergia.jsx";
import ProjectCanvas from "./project/ProjectCanvas.jsx";
import ProjectCabeamento from "./project/ProjectCabeamento.jsx";
import ProjectTestCard from "./project/ProjectTestCard.jsx";
import ProjectComposicao from "./project/ProjectComposicao.jsx";
import ProjectRelatorio from "./project/ProjectRelatorio.jsx";

const TABS = [
  { id: "dados", label: "Dados", Icon: Folder, Comp: ProjectDados },
  { id: "energia", label: "Energia (AC)", Icon: Zap, Comp: ProjectEnergia },
  // vem ANTES do Cabeamento: é o canvas que define onde as portas correm
  { id: "canvas", label: "Canvas", Icon: Frame, Comp: ProjectCanvas },
  { id: "cabeamento", label: "Cabeamento", Icon: GitBranch, Comp: ProjectCabeamento },
  { id: "relatorio", label: "Relatório", Icon: FileText, Comp: ProjectRelatorio },
  { id: "testcard", label: "Test Card", Icon: Monitor, Comp: ProjectTestCard },
  { id: "composicao", label: "Composição", Icon: LayoutGrid, Comp: ProjectComposicao },
];

export default function ProjectDetail({ project, onBack }) {
  const { projects, setProjects } = useLedLabContext();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState("dados");

  const patch = (partial) => setProjects(projects.map((p) => (p.id === project.id ? { ...p, ...partial, updatedAt: Date.now() } : p)));
  const patchTela = (telaId, partial) =>
    patch({ telas: (project.telas || []).map((t) => (t.id === telaId ? { ...t, ...partial } : t)) });

  const roll = projectRollup(project);
  const Active = TABS.find((t) => t.id === tab)?.Comp || ProjectDados;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, gap: 8 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <button style={btn("ghost", isMobile ? { padding: "9px 11px" } : {})} onClick={onBack}><ArrowLeft size={15} />{!isMobile && " Projetos"}</button>
          {!isMobile && <span style={{ color: T.dim }}>›</span>}
          <h2 style={{ color: T.txt, margin: 0, fontSize: isMobile ? 17 : 20, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{project.name || "Sem nome"}</h2>
          {!isMobile && <StatusBadge s={project.status} />}
        </div>
        {/* dados gravam sozinhos a cada edição (AppContext persiste em localStorage); selo só reforça isso */}
        <span title="Suas alterações são gravadas automaticamente neste dispositivo" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: T.dim, fontSize: isMobile ? 12 : 13, fontWeight: 500, flexShrink: 0, whiteSpace: "nowrap" }}>
          <Check size={15} style={{ color: T.grn }} /> {isMobile ? "Salvo" : "Salvo automaticamente"}
        </span>
      </div>

      <div style={{ display: "flex", gap: 20, color: T.mut, fontSize: 13, marginBottom: 16 }}>
        <span><b style={{ color: T.txt }}>{roll.telas}</b> telas</span>
        <span><b style={{ color: T.acM }}>{roll.gab}</b> gab</span>
        <span><b style={{ color: T.grn }}>{roll.area_m2.toFixed(2)}</b> m²</span>
      </div>

      <div className="no-scrollbar" style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.bd}`, marginBottom: 20, overflowX: "auto", flexWrap: "nowrap" }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.Icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)} title={t.label}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "10px 12px" : "10px 14px", background: "none", border: "none", borderBottom: `2px solid ${active ? T.acc : "transparent"}`, color: active ? T.txt : T.mut, cursor: "pointer", fontWeight: 600, fontSize: 14, whiteSpace: "nowrap", flexShrink: 0 }}>
              <Icon size={16} />{(!isMobile || active) && <span>{t.label}</span>}
            </button>
          );
        })}
      </div>

      <ErrorBoundary>
        <Active project={project} patch={patch} patchTela={patchTela} />
      </ErrorBoundary>
    </div>
  );
}
