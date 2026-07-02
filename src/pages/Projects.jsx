// pages/Projects.jsx — lista de projetos com filtros; abre o detalhe.
import { useState, useMemo, useEffect } from "react";
import { Plus, Download, Trash2 } from "lucide-react";
import { useLedLabContext, newProject } from "../store/AppContext.jsx";
import { projectRollup } from "../services/projectCalc.js";
import { formatRange } from "../services/dates.js";
import { T } from "../ui/tokens.js";
import { card, input, btn, iconBtn, dangerIconBtn } from "../ui/styles.js";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatusBadge, { STATUS_ORDER } from "../components/StatusBadge.jsx";
import DropdownMenu from "../components/DropdownMenu.jsx";
import ProjectDetail from "./ProjectDetail.jsx";

const FILTERS = [
  { key: "all", label: "Todos" },
  { key: "planned", label: "Planejamento" },
  { key: "active", label: "Em andamento" },
  { key: "done", label: "Concluído" },
  { key: "cancelled", label: "Cancelado" },
];

export default function Projects({ nav }) {
  const { projects, setProjects } = useLedLabContext();
  const confirm = useConfirm();
  const toast = useToast();
  const [openId, setOpenId] = useState(nav?.openProjectId || null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");

  // abre o projeto pedido por outra tela (ex.: Agenda)
  useEffect(() => { if (nav?.openProjectId) setOpenId(nav.openProjectId); }, [nav?.openProjectId]);
  const closeDetail = () => { setOpenId(null); nav?.clearProject?.(); };

  const counts = useMemo(() => {
    const c = { all: projects.length };
    for (const s of STATUS_ORDER) c[s] = projects.filter((p) => p.status === s).length;
    return c;
  }, [projects]);

  const rows = useMemo(() => {
    let r = projects;
    if (filter !== "all") r = r.filter((p) => p.status === filter);
    if (q) r = r.filter((p) => `${p.name} ${p.cliente} ${p.local}`.toLowerCase().includes(q.toLowerCase()));
    return [...r].sort((a, b) => (a.dataInicio || "").localeCompare(b.dataInicio || ""));
  }, [projects, filter, q]);

  const create = () => {
    const p = newProject({ name: "Novo Projeto" });
    setProjects([...projects, p]);
    setOpenId(p.id);
  };
  const remove = async (p) => {
    if (await confirm({ title: "Excluir projeto?", message: `"${p.name || "Sem nome"}" e todas as suas telas serão removidos. Esta ação não pode ser desfeita.` })) {
      setProjects(projects.filter((x) => x.id !== p.id));
      toast("Projeto excluído");
    }
  };

  if (openId) {
    const proj = projects.find((p) => p.id === openId);
    if (proj) return <ProjectDetail project={proj} onBack={closeDetail} />;
  }

  return (
    <div>
      <SectionHeader title="Projetos / Eventos" subtitle={`${projects.length} projetos · abra um para acessar energia, sinal, test card e relatório.`}>
        <DropdownMenu items={[{ label: "Exportar todos (.json)", onClick: () => exportAll(projects) }]} />
        <button style={btn("primary")} onClick={create}><Plus size={16} /> Novo Projeto</button>
      </SectionHeader>

      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <button key={f.key} onClick={() => setFilter(f.key)}
              style={{ padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${active ? T.acc : T.bd}`, background: active ? T.acc : "transparent", color: active ? "#fff" : T.mut }}>
              {f.label} <span style={{ opacity: 0.7 }}>{counts[f.key] ?? 0}</span>
            </button>
          );
        })}
      </div>

      <div style={card({ marginBottom: 16 })}>
        <input placeholder="Buscar nome, cliente, local…" value={q} onChange={(e) => setQ(e.target.value)} style={input({ maxWidth: 320 })} />
      </div>

      {rows.map((p) => (
        <div key={p.id} style={card({ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 })}>
          <div style={{ flex: 1 }}>
            <div style={{ color: T.txt, fontWeight: 600 }}>{p.name}</div>
            <div style={{ color: T.dim, fontSize: 12, marginTop: 3 }}>
              {formatRange(p.dataInicio, p.dataFim)} · {p.local} · {p.telas?.length || 0} tela(s) · {projectRollup(p).gab} gabinetes
            </div>
          </div>
          <StatusBadge s={p.status} />
          <button style={btn("ghost")} onClick={() => setOpenId(p.id)}>Abrir</button>
          <button style={iconBtn()} title="Exportar" onClick={() => exportOne(p)}><Download size={15} /></button>
          <button style={dangerIconBtn()} title="Excluir" onClick={() => remove(p)}><Trash2 size={15} /></button>
        </div>
      ))}
    </div>
  );
}

function download(name, obj) {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
}
const slug = (s) => s.toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-");
const exportOne = (p) => download(`${slug(p.name)}.ledlab.json`, { schema: "ledlab.project.v1", project: p });
const exportAll = (ps) => download("projetos-ledlab.json", { schema: "ledlab.projects.bundle.v1", projects: ps });
