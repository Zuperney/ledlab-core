// pages/Settings.jsx — backup, importação e restauração.
import { useRef } from "react";
import { Download, Upload, Eraser, RotateCcw } from "lucide-react";
import { useLedLabContext, KEYS, DEFAULT_PREFS } from "../store/AppContext.jsx";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import { SEED_CABINETS } from "../data/mockCabinets.js";
import { SEED_PROJECTS } from "../data/mockProjects.js";
import { T } from "../ui/tokens.js";
import { card, btn } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";

export default function Settings() {
  const { cabs, setCabs, projects, setProjects, prefs, setPrefs, tcPresets, setTcPresets } = useLedLabContext();
  const confirm = useConfirm();
  const toast = useToast();
  const fileRef = useRef(null);

  const exportBackup = () => {
    const data = { schema: "ledlab.backup.v1", exportedAt: new Date().toISOString(), cabs, projects, prefs, tcPresets };
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
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (Array.isArray(d.cabs)) setCabs(d.cabs);
        if (Array.isArray(d.projects)) setProjects(d.projects);
        if (d.prefs) setPrefs({ ...DEFAULT_PREFS, ...d.prefs });
        if (Array.isArray(d.tcPresets)) setTcPresets(d.tcPresets);
        toast("Backup importado");
      } catch {
        toast("Arquivo inválido", "info");
      }
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
    toast("Dados restaurados de fábrica");
  };

  const row = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, padding: "14px 0", borderTop: `1px solid ${T.bd}` };

  return (
    <div>
      <SectionHeader title="Configurações" subtitle="Backup, importação e manutenção dos dados (salvos neste navegador)." />
      <div style={card({ maxWidth: 640 })}>
        <div style={{ ...row, borderTop: "none" }}>
          <div><div style={{ color: T.txt, fontWeight: 600 }}>Backup completo</div><div style={{ color: T.dim, fontSize: 13 }}>Gabinetes, projetos e preferências em um arquivo.</div></div>
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
