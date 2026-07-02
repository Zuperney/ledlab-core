// pages/ProjectDetail.jsx — detalhe do projeto com abas.
import { useState } from "react";
import { ArrowLeft, Save, Folder, Zap, GitBranch, Monitor, FileText } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { projectRollup } from "../services/projectCalc.js";
import { T } from "../ui/tokens.js";
import { btn } from "../ui/styles.js";
import StatusBadge from "../components/StatusBadge.jsx";
import ErrorBoundary from "../components/ErrorBoundary.jsx";
import ProjectDados from "./project/ProjectDados.jsx";
import ProjectEnergia from "./project/ProjectEnergia.jsx";
import ProjectCabeamento from "./project/ProjectCabeamento.jsx";
import ProjectTestCard from "./project/ProjectTestCard.jsx";
import ProjectRelatorio from "./project/ProjectRelatorio.jsx";

const TABS = [
  { id: "dados", label: "Dados", Icon: Folder, Comp: ProjectDados },
  { id: "energia", label: "Energia (AC)", Icon: Zap, Comp: ProjectEnergia },
  { id: "cabeamento", label: "Cabeamento", Icon: GitBranch, Comp: ProjectCabeamento },
  { id: "testcard", label: "Test Card", Icon: Monitor, Comp: ProjectTestCard },
  { id: "relatorio", label: "Relatório", Icon: FileText, Comp: ProjectRelatorio },
];

export default function ProjectDetail({ project, onBack }) {
  const { projects, setProjects } = useLedLabContext();
  const [tab, setTab] = useState("dados");

  const patch = (partial) => setProjects(projects.map((p) => (p.id === project.id ? { ...p, ...partial, updatedAt: Date.now() } : p)));
  const patchTela = (telaId, partial) =>
    patch({ telas: (project.telas || []).map((t) => (t.id === telaId ? { ...t, ...partial } : t)) });

  const roll = projectRollup(project);
  const Active = TABS.find((t) => t.id === tab)?.Comp || ProjectDados;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button style={btn("ghost")} onClick={onBack}><ArrowLeft size={15} /> Projetos</button>
          <span style={{ color: T.dim }}>›</span>
          <h2 style={{ color: T.txt, margin: 0, fontSize: 20 }}>{project.name || "Sem nome"}</h2>
          <StatusBadge s={project.status} />
        </div>
        <button style={btn("primary")} onClick={() => patch({})}><Save size={15} /> Salvar</button>
      </div>

      <div style={{ display: "flex", gap: 20, color: T.mut, fontSize: 13, marginBottom: 16 }}>
        <span><b style={{ color: T.txt }}>{roll.telas}</b> telas</span>
        <span><b style={{ color: T.acM }}>{roll.gab}</b> gab</span>
        <span><b style={{ color: T.grn }}>{roll.area_m2.toFixed(2)}</b> m²</span>
      </div>

      <div style={{ display: "flex", gap: 4, borderBottom: `1px solid ${T.bd}`, marginBottom: 20 }}>
        {TABS.map((t) => {
          const active = tab === t.id;
          const Icon = t.Icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "none", border: "none", borderBottom: `2px solid ${active ? T.acc : "transparent"}`, color: active ? T.txt : T.mut, cursor: "pointer", fontWeight: 600, fontSize: 14 }}>
              <Icon size={15} /> {t.label}
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
