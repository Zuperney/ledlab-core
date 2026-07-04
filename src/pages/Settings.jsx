// pages/Settings.jsx — backup, importação e restauração.
import { useRef } from "react";
import { Download, Upload, Eraser, RotateCcw, Trash2 } from "lucide-react";
import { useLedLabContext, KEYS, DEFAULT_PREFS } from "../store/AppContext.jsx";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import { SEED_CABINETS } from "../data/mockCabinets.js";
import { SEED_PROJECTS } from "../data/mockProjects.js";
import { SEED_ACTIVITY_TYPES } from "../data/seedActivityTypes.js";
import { T } from "../ui/tokens.js";
import { card, btn } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import DiariasConfig from "./settings/DiariasConfig.jsx";

export default function Settings() {
  const { cabs, setCabs, projects, setProjects, prefs, setPrefs, tcPresets, setTcPresets, worklog, setWorklog, activityTypes, setActivityTypes } = useLedLabContext();
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef(null);

  const exportBackup = () => {
    const data = { schema: "ledlab.backup.v2", exportedAt: new Date().toISOString(), cabs, projects, prefs, tcPresets, worklog, activityTypes };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "ledlab-backup.json";
    a.click();
  };

  const importBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let d;
      try {
        d = JSON.parse(reader.result);
      } catch {
        toast("Arquivo inválido", "info");
        return;
      }
      // valida que é mesmo um backup do LedLab (schema conhecido ou campos reconhecíveis)
      if (!d || typeof d !== "object" || (d.schema && !String(d.schema).startsWith("ledlab.backup"))) {
        toast("Este arquivo não é um backup do LedLab", "info");
        return;
      }
      const campos = ["cabs", "projects", "prefs", "tcPresets", "worklog", "activityTypes"];
      if (!campos.some((k) => d[k] != null)) {
        toast("Backup vazio ou não reconhecido", "info");
        return;
      }
      // substitui os dados atuais → confirma antes (não pode ser desfeito)
      if (!(await confirm({
        title: "Importar backup?",
        message: "Isso substitui seus dados atuais (gabinetes, projetos, cachês e preferências) pelos do arquivo. Não pode ser desfeito.",
        confirmLabel: "Importar",
      }))) return;
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

  const row = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 0", borderTop: `1px solid ${T.bd}` };

  return (
    <div>
      <SectionHeader title="Configurações" subtitle="Backup, importação e manutenção dos dados (salvos neste navegador)." />

      <div style={card({ maxWidth: 640, marginBottom: 16 })}>
        <div style={{ color: T.txt, fontWeight: 600 }}>Numeração dos cabos</div>
        <div style={{ color: T.dim, fontSize: 13, margin: "2px 0 10px" }}>Ordem em que os cabos são numerados no cabeamento (sinal e AC), conforme sua preferência de montagem em campo.</div>
        <select value={prefs.cableNumbering || "row-tb-lr"} onChange={(e) => setPrefs({ ...prefs, cableNumbering: e.target.value })}
          style={{ width: "100%", background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 14 }}>
          <option value="col-lr-bt">Coluna · esquerda→direita · de baixo p/ cima</option>
          <option value="col-lr-tb">Coluna · esquerda→direita · de cima p/ baixo</option>
          <option value="col-rl-bt">Coluna · direita→esquerda · de baixo p/ cima</option>
          <option value="row-bt-lr">Linha · de baixo p/ cima · esquerda→direita</option>
          <option value="row-tb-lr">Linha · de cima p/ baixo · esquerda→direita</option>
          <option value="row-bt-rl">Linha · de baixo p/ cima · direita→esquerda</option>
        </select>
      </div>

      <DiariasConfig />

      {tcPresets.length > 0 && (
        <div style={card({ maxWidth: 640, marginBottom: 16 })}>
          <div style={{ color: T.txt, fontWeight: 600 }}>Predefinições de Test Card</div>
          <div style={{ color: T.dim, fontSize: 13, margin: "2px 0 6px" }}>Predefinições salvas no gerador de test card.</div>
          {tcPresets.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${T.bd}` }}>
              <span style={{ color: T.txt, fontSize: 14 }}>{p.name}</span>
              <button style={btn("danger")} onClick={async () => { if (await confirm({ title: "Excluir predefinição?", message: `"${p.name}" será removida.` })) { setTcPresets(tcPresets.filter((x) => x.id !== p.id)); toast("Predefinição excluída"); } }}><Trash2 size={14} /> Excluir</button>
            </div>
          ))}
        </div>
      )}

      <div style={card({ maxWidth: 640 })}>
        <div style={{ ...row, borderTop: "none" }}>
          <div><div style={{ color: T.txt, fontWeight: 600 }}>Backup completo</div><div style={{ color: T.dim, fontSize: 13 }}>Gabinetes, projetos, cachês (lançamentos + tipos) e preferências em um arquivo.</div></div>
          <button style={btn("ghost")} onClick={exportBackup}><Download size={15} /> Exportar</button>
        </div>
        <div style={row}>
          <div><div style={{ color: T.txt, fontWeight: 600 }}>Importar backup</div><div style={{ color: T.dim, fontSize: 13 }}>Substitui os dados atuais pelos do arquivo.</div></div>
          <button style={btn("ghost")} onClick={() => fileRef.current?.click()}><Upload size={15} /> Importar</button>
          <input ref={fileRef} type="file" accept="application/json" onChange={importBackup} style={{ display: "none" }} />
        </div>
        <div style={row}>
          <div><div style={{ color: T.txt, fontWeight: 600 }}>Limpar projetos</div><div style={{ color: T.dim, fontSize: 13 }}>Remove todos os projetos, mantém a biblioteca.</div></div>
          <button style={btn("danger")} onClick={clearProjects}><Eraser size={15} /> Limpar</button>
        </div>
        <div style={row}>
          <div><div style={{ color: T.txt, fontWeight: 600 }}>Restaurar de fábrica</div><div style={{ color: T.dim, fontSize: 13 }}>Apaga tudo e recarrega os dados de exemplo.</div></div>
          <button style={btn("danger")} onClick={factoryReset}><RotateCcw size={15} /> Restaurar</button>
        </div>
      </div>
    </div>
  );
}
