// pages/Projects.jsx — lista de projetos com filtros, ordenação e agrupamento; abre o detalhe.
import { useState, useMemo, useEffect } from "react";
import { Plus, Download, Trash2, SlidersHorizontal, FolderOpen } from "lucide-react";
import { useLedLabContext, newProject } from "../store/AppContext.jsx";
import { projectRollup, MONTHS_LONG } from "../services/projectCalc.js";
import { formatRange } from "../services/dates.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Z } from "../config/uiConfig.js";
import { T } from "../ui/tokens.js";
import { card, input, btn, iconBtn, dangerIconBtn, label as lblStyle } from "../ui/styles.js";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import StatusBadge, { STATUS, STATUS_ORDER } from "../components/StatusBadge.jsx";
import Placeholder from "../components/Placeholder.jsx";
import DropdownMenu from "../components/DropdownMenu.jsx";
import BottomSheet from "../components/BottomSheet.jsx";
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
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const toast = useToast();
  const [openId, setOpenId] = useState(nav?.openProjectId || null);
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [ano, setAno] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [agrupar, setAgrupar] = useState("none");
  const [filterOpen, setFilterOpen] = useState(false);
  const filtersActive = ano !== "all" || sortBy !== "date" || agrupar !== "none";

  useEffect(() => { if (nav?.openProjectId) setOpenId(nav.openProjectId); }, [nav?.openProjectId]);
  const closeDetail = () => { setOpenId(null); nav?.clearProject?.(); };

  const counts = useMemo(() => {
    const c = { all: projects.length };
    for (const s of STATUS_ORDER) c[s] = projects.filter((p) => p.status === s).length;
    return c;
  }, [projects]);

  const years = useMemo(
    () => ["all", ...Array.from(new Set(projects.map((p) => (p.dataInicio || "").slice(0, 4)).filter(Boolean))).sort()],
    [projects]
  );

  const sorted = useMemo(() => {
    let r = projects;
    if (filter !== "all") r = r.filter((p) => p.status === filter);
    if (ano !== "all") r = r.filter((p) => (p.dataInicio || "").slice(0, 4) === ano);
    if (q) r = r.filter((p) => `${p.name} ${p.cliente} ${p.local}`.toLowerCase().includes(q.toLowerCase()));
    const arr = [...r];
    if (sortBy === "name") arr.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
    else if (sortBy === "status") arr.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || (a.dataInicio || "").localeCompare(b.dataInicio || ""));
    else arr.sort((a, b) => (a.dataInicio || "").localeCompare(b.dataInicio || ""));
    return arr;
  }, [projects, filter, ano, q, sortBy]);

  const groups = useMemo(() => {
    if (agrupar === "status") {
      return STATUS_ORDER.map((s) => ({ key: s, label: STATUS[s].l, projects: sorted.filter((p) => p.status === s) })).filter((g) => g.projects.length);
    }
    if (agrupar === "month") {
      const m = {};
      for (const p of sorted) { const k = p.dataInicio ? p.dataInicio.slice(0, 7) : "sem-data"; (m[k] ||= []).push(p); }
      return Object.keys(m).sort().map((k) => ({
        key: k,
        label: k === "sem-data" ? "SEM DATA" : `${MONTHS_LONG[+k.split("-")[1] - 1]} ${k.split("-")[0]}`.toUpperCase(),
        projects: m[k],
      }));
    }
    return [{ key: "all", label: null, projects: sorted }];
  }, [sorted, agrupar]);

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

  const selStyle = input({ width: "auto" });
  const lbl = { color: T.mut, fontSize: 11, textTransform: "uppercase" };

  return (
    <div>
      <SectionHeader title="Projetos / Eventos" subtitle={`${projects.length} projetos · abra um para acessar energia, sinal, test card e relatório.`}>
        <DropdownMenu items={[{ label: "Exportar todos (.json)", Icon: Download, onClick: () => exportAll(projects) }]} />
        {!isMobile && <button style={btn("primary")} onClick={create}><Plus size={16} /> Novo Projeto</button>}
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

      {isMobile ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <input placeholder="Buscar nome, cliente, local…" value={q} onChange={(e) => setQ(e.target.value)} style={input({ flex: 1 })} />
          <button style={btn("ghost", { position: "relative", flexShrink: 0 })} onClick={() => setFilterOpen(true)}>
            <SlidersHorizontal size={16} /> Filtros
            {filtersActive && <span style={{ position: "absolute", top: 5, right: 6, width: 8, height: 8, borderRadius: "50%", background: T.acc, border: `1px solid ${T.card}` }} />}
          </button>
        </div>
      ) : (
        <div style={card({ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 })} className="m-controlbar">
          <input placeholder="Buscar nome, cliente, local…" value={q} onChange={(e) => setQ(e.target.value)} style={input({ maxWidth: 260, flex: 1 })} />
          <span style={lbl}>Ano</span>
          <select value={ano} onChange={(e) => setAno(e.target.value)} style={selStyle}>{years.map((y) => <option key={y} value={y}>{y === "all" ? "Todos" : y}</option>)}</select>
          <span style={lbl}>Ordenar</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={selStyle}>
            <option value="date">Data</option><option value="name">Nome</option><option value="status">Status</option>
          </select>
          <span style={lbl}>Agrupar</span>
          <select value={agrupar} onChange={(e) => setAgrupar(e.target.value)} style={selStyle}>
            <option value="none">Não</option><option value="month">Por mês</option><option value="status">Por status</option>
          </select>
        </div>
      )}

      {isMobile && filterOpen && (
        <BottomSheet title="Filtros" onClose={() => setFilterOpen(false)}>
          <div style={{ display: "grid", gap: 14 }}>
            <div><div style={lblStyle}>Ano</div><select value={ano} onChange={(e) => setAno(e.target.value)} style={input()}>{years.map((y) => <option key={y} value={y}>{y === "all" ? "Todos" : y}</option>)}</select></div>
            <div><div style={lblStyle}>Ordenar por</div><select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={input()}><option value="date">Data</option><option value="name">Nome</option><option value="status">Status</option></select></div>
            <div><div style={lblStyle}>Agrupar</div><select value={agrupar} onChange={(e) => setAgrupar(e.target.value)} style={input()}><option value="none">Não</option><option value="month">Por mês</option><option value="status">Por status</option></select></div>
            <button style={btn("primary", { justifyContent: "center" })} onClick={() => setFilterOpen(false)}>Aplicar</button>
          </div>
        </BottomSheet>
      )}

      {sorted.length === 0 ? (
        <Placeholder icon={FolderOpen} title="Nenhum projeto" description="Ajuste os filtros ou clique em “Novo Projeto” para começar." />
      ) : (
        groups.map((g) => (
          <div key={g.key} style={{ marginBottom: g.label ? 18 : 0 }}>
            {g.label && <div style={{ color: T.acM, fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", margin: "4px 0 10px" }}>{g.label}</div>}
            {g.projects.map((p) => (
              <div key={p.id} style={card({ display: "flex", alignItems: isMobile ? "flex-start" : "center", gap: 12, marginBottom: 10, flexDirection: isMobile ? "column" : "row" })}>
                <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
                  <button onClick={() => setOpenId(p.id)} style={{ background: "none", border: "none", color: T.txt, fontWeight: 600, fontSize: 15, cursor: "pointer", padding: 0, textAlign: "left" }}>{p.name || "Sem nome"}</button>
                  <div style={{ color: T.dim, fontSize: 12, marginTop: 3 }}>
                    {formatRange(p.dataInicio, p.dataFim)} · {p.local} · {p.telas?.length || 0} tela(s) · {projectRollup(p).gab} gabinetes
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-end" }}>
                  <StatusBadge s={p.status} />
                  <div style={{ display: "flex", gap: 8 }}>
                    {isMobile
                      ? <button style={iconBtn({ width: 40, height: 40, color: T.txt })} title="Abrir" onClick={() => setOpenId(p.id)}><FolderOpen size={16} /></button>
                      : <button style={btn("ghost")} onClick={() => setOpenId(p.id)}>Abrir</button>}
                    <button style={iconBtn(isMobile ? { width: 40, height: 40 } : {})} title="Exportar JSON" onClick={() => exportOne(p)}><Download size={15} /></button>
                    <button style={dangerIconBtn(isMobile ? { width: 40, height: 40 } : {})} title="Excluir" onClick={() => remove(p)}><Trash2 size={15} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))
      )}

      {isMobile && (
        <button onClick={create} title="Novo projeto"
          style={{ position: "fixed", right: 16, bottom: "calc(84px + env(safe-area-inset-bottom))", width: 56, height: 56, borderRadius: "50%", background: T.acc, color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.fab }}>
          <Plus size={24} />
        </button>
      )}
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
const slug = (s) => (s || "projeto").toLowerCase().normalize("NFD").replace(/[^\w]+/g, "-");
const exportOne = (p) => download(`${slug(p.name)}.ledlab.json`, { schema: "ledlab.project.v1", project: p });
const exportAll = (ps) => download("projetos-ledlab.json", { schema: "ledlab.projects.bundle.v1", projects: ps });
