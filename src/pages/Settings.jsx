// pages/Settings.jsx — configurações globais em categorias colapsáveis:
// cabeamento, cachês, test card, dados/backup e manutenção. Centraliza export/import
// (backup, projetos e gabinetes) que antes ficavam espalhados nas abas.
import { useRef, useState } from "react";
import { Download, Upload, Eraser, RotateCcw, Trash2, ChevronDown, ChevronUp, GitBranch, Receipt, Monitor, Database, TriangleAlert } from "lucide-react";
import { useLedLabContext, KEYS, DEFAULT_PREFS, newProject } from "../store/AppContext.jsx";
import { genId, genNumericId } from "../services/ids.js";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { SEED_CABINETS } from "../data/mockCabinets.js";
import { SEED_PROJECTS } from "../data/mockProjects.js";
import { SEED_ACTIVITY_TYPES } from "../data/seedActivityTypes.js";
import { T } from "../ui/tokens.js";
import { card, btn } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import DiariasConfig from "./settings/DiariasConfig.jsx";

const download = (name, obj) => {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
};

export default function Settings() {
  const { cabs, setCabs, projects, setProjects, prefs, setPrefs, tcPresets, setTcPresets, worklog, setWorklog, activityTypes, setActivityTypes } = useLedLabContext();
  const confirm = useConfirm();
  const toast = useToast();
  const isMobile = useIsMobile();
  const backupRef = useRef(null);
  const projRef = useRef(null);
  const cabRef = useRef(null);

  // ── Backup completo ──
  const exportBackup = () => download("ledlab-backup.json", { schema: "ledlab.backup.v2", exportedAt: new Date().toISOString(), cabs, projects, prefs, tcPresets, worklog, activityTypes });
  const importBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let d;
      try { d = JSON.parse(reader.result); } catch { toast("Arquivo inválido", "info"); return; }
      if (!d || typeof d !== "object" || (d.schema && !String(d.schema).startsWith("ledlab.backup"))) { toast("Este arquivo não é um backup do LedLab", "info"); return; }
      const campos = ["cabs", "projects", "prefs", "tcPresets", "worklog", "activityTypes"];
      if (!campos.some((k) => d[k] != null)) { toast("Backup vazio ou não reconhecido", "info"); return; }
      if (!(await confirm({ title: "Importar backup?", message: "Isso substitui seus dados atuais (gabinetes, projetos, cachês e preferências) pelos do arquivo. Não pode ser desfeito.", confirmLabel: "Importar" }))) return;
      if (Array.isArray(d.cabs)) setCabs(d.cabs);
      if (Array.isArray(d.projects)) setProjects(d.projects);
      if (d.prefs) setPrefs({ ...DEFAULT_PREFS, ...d.prefs });
      if (Array.isArray(d.tcPresets)) setTcPresets(d.tcPresets);
      if (Array.isArray(d.worklog)) setWorklog(d.worklog);
      if (Array.isArray(d.activityTypes)) setActivityTypes(d.activityTypes);
      toast("Backup importado");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Projetos (só a lista de projetos) ──
  const exportProjects = () => download("projetos-ledlab.json", { schema: "ledlab.projects.bundle.v1", projects });
  const importProjects = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        const incoming = Array.isArray(d) ? d : d.project ? [d.project] : Array.isArray(d.projects) ? d.projects : [];
        const fresh = incoming.filter((p) => p && typeof p === "object").map((p) => ({
          ...newProject({}), ...p, id: genId("proj"), updatedAt: Date.now(),
          telas: (p.telas || []).map((t) => ({ ...t, id: genId("tela") })),
        }));
        if (!fresh.length) { toast("Nenhum projeto no arquivo", "info"); return; }
        setProjects([...projects, ...fresh]);
        toast(`${fresh.length} projeto${fresh.length > 1 ? "s" : ""} importado${fresh.length > 1 ? "s" : ""}`);
      } catch { toast("Arquivo inválido", "info"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Biblioteca de gabinetes ──
  const exportCabs = () => download("gabinetes-ledlab.json", { schema: "ledlab.cabinets.v1", cabinets: cabs });
  const importCabs = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = Array.isArray(parsed) ? parsed : parsed.cabinets || parsed.cabs || [];
        if (!Array.isArray(incoming) || !incoming.length) { toast("Nenhum gabinete no arquivo.", "info"); return; }
        const byName = new Map(cabs.map((c) => [c.nome.toLowerCase(), c]));
        let added = 0, updated = 0;
        for (const raw of incoming) {
          if (!raw || !raw.nome) continue;
          const k = raw.nome.toLowerCase();
          if (byName.has(k)) { const ex = byName.get(k); byName.set(k, { ...ex, ...raw, id: ex.id }); updated++; }
          else { byName.set(k, { ...raw, id: genNumericId(byName.size) }); added++; }
        }
        setCabs(Array.from(byName.values()));
        toast(`Importado: ${added} novo(s), ${updated} atualizado(s).`);
      } catch { toast("Arquivo inválido. Use um .json exportado do LedLab Core.", "info"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Manutenção ──
  const clearProjects = async () => {
    if (await confirm({ title: "Limpar todos os projetos?", message: "Todos os projetos serão removidos. Os gabinetes da biblioteca são mantidos." })) {
      setProjects([]);
      toast("Projetos removidos");
    }
  };
  const factoryReset = async () => {
    if (!(await confirm({ title: "Restaurar de fábrica?", message: "Isso apaga TODOS os seus dados (gabinetes e projetos) e recarrega os dados de exemplo. Não pode ser desfeito." }))) return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    setCabs(SEED_CABINETS); setProjects(SEED_PROJECTS); setPrefs(DEFAULT_PREFS); setTcPresets([]);
    setWorklog([]); setActivityTypes(SEED_ACTIVITY_TYPES);
    toast("Dados restaurados de fábrica");
  };

  const open = !isMobile; // no mobile as categorias começam fechadas (minimalista); no desktop, abertas

  return (
    <div style={{ maxWidth: 640 }}>
      <SectionHeader title="Configurações" subtitle="Preferências, dados e manutenção — tudo salvo neste navegador." />

      <Section icon={GitBranch} title="Cabeamento" subtitle="Ordem de numeração dos cabos" defaultOpen={open}>
        <div style={{ color: T.dim, fontSize: 13, marginBottom: 10 }}>Ordem em que os cabos são numerados (sinal e AC), conforme sua preferência de montagem em campo.</div>
        <select value={prefs.cableNumbering || "row-tb-lr"} onChange={(e) => setPrefs({ ...prefs, cableNumbering: e.target.value })}
          style={{ width: "100%", background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 14 }}>
          <option value="col-lr-bt">Coluna · esquerda→direita · de baixo p/ cima</option>
          <option value="col-lr-tb">Coluna · esquerda→direita · de cima p/ baixo</option>
          <option value="col-rl-bt">Coluna · direita→esquerda · de baixo p/ cima</option>
          <option value="row-bt-lr">Linha · de baixo p/ cima · esquerda→direita</option>
          <option value="row-tb-lr">Linha · de cima p/ baixo · esquerda→direita</option>
          <option value="row-bt-rl">Linha · de baixo p/ cima · direita→esquerda</option>
        </select>
      </Section>

      <Section icon={Receipt} title="Cachês (Diárias)" subtitle="Cálculo, fixo mensal, recibo e tipos" defaultOpen={open}>
        <DiariasConfig />
      </Section>

      {tcPresets.length > 0 && (
        <Section icon={Monitor} title="Test Card" subtitle={`${tcPresets.length} predefiniç${tcPresets.length === 1 ? "ão" : "ões"} salva${tcPresets.length === 1 ? "" : "s"}`} defaultOpen={open}>
          {tcPresets.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${T.bd}` }}>
              <span style={{ color: T.txt, fontSize: 14 }}>{p.name}</span>
              <button style={btn("danger")} onClick={async () => { if (await confirm({ title: "Excluir predefinição?", message: `"${p.name}" será removida.` })) { setTcPresets(tcPresets.filter((x) => x.id !== p.id)); toast("Predefinição excluída"); } }}><Trash2 size={14} /> Excluir</button>
            </div>
          ))}
        </Section>
      )}

      <Section icon={Database} title="Dados & backup" subtitle="Exportar / importar arquivos (.json)" defaultOpen={open}>
        <IoRow first title="Backup completo" desc="Tudo num arquivo: gabinetes, projetos, cachês e preferências." onExport={exportBackup} onImport={() => backupRef.current?.click()} />
        <input ref={backupRef} type="file" accept="application/json" onChange={importBackup} style={{ display: "none" }} />
        <IoRow title="Projetos" desc="Só os projetos/eventos — o importado é adicionado (não substitui)." onExport={exportProjects} onImport={() => projRef.current?.click()} />
        <input ref={projRef} type="file" accept=".json,application/json" onChange={importProjects} style={{ display: "none" }} />
        <IoRow title="Biblioteca de gabinetes" desc="Só os gabinetes — mescla por nome (adiciona novos, atualiza iguais)." onExport={exportCabs} onImport={() => cabRef.current?.click()} />
        <input ref={cabRef} type="file" accept="application/json" onChange={importCabs} style={{ display: "none" }} />
      </Section>

      <Section icon={TriangleAlert} title="Manutenção" subtitle="Ações destrutivas — não podem ser desfeitas" defaultOpen={false}>
        <div style={rowStyle(true)}>
          <div><div style={mTitle}>Limpar projetos</div><div style={mDesc}>Remove todos os projetos, mantém a biblioteca de gabinetes.</div></div>
          <button style={btn("danger")} onClick={clearProjects}><Eraser size={14} /> Limpar</button>
        </div>
        <div style={rowStyle(false)}>
          <div><div style={mTitle}>Restaurar de fábrica</div><div style={mDesc}>Apaga tudo e recarrega os dados de exemplo.</div></div>
          <button style={btn("danger")} onClick={factoryReset}><RotateCcw size={14} /> Restaurar</button>
        </div>
      </Section>
    </div>
  );
}

// ── categoria colapsável (o "dropdown" de configurações) ──
function Section({ icon: Icon, title, subtitle, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={card({ marginBottom: 12, padding: 0, overflow: "hidden" })}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {Icon && <Icon size={18} style={{ color: T.acM, flexShrink: 0 }} />}
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: T.txt, fontWeight: 600, fontSize: 14.5 }}>{title}</span>
            {subtitle && <span style={{ display: "block", color: T.dim, fontSize: 12, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</span>}
          </span>
        </span>
        {open ? <ChevronUp size={18} style={{ color: T.mut, flexShrink: 0 }} /> : <ChevronDown size={18} style={{ color: T.mut, flexShrink: 0 }} />}
      </button>
      {open && <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${T.bd}` }}>{children}</div>}
    </div>
  );
}

// linha de exportar/importar
function IoRow({ title, desc, onExport, onImport, first }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderTop: first ? "none" : `1px solid ${T.bd}`, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: "1 1 180px" }}><div style={mTitle}>{title}</div><div style={mDesc}>{desc}</div></div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button style={btn("ghost")} onClick={onImport}><Upload size={14} /> Importar</button>
        <button style={btn("ghost")} onClick={onExport}><Download size={14} /> Exportar</button>
      </div>
    </div>
  );
}

const mTitle = { color: T.txt, fontWeight: 600, fontSize: 14 };
const mDesc = { color: T.dim, fontSize: 12 };
const rowStyle = (first) => ({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderTop: first ? "none" : `1px solid ${T.bd}`, flexWrap: "wrap" });
