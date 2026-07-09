// store/AppContext.jsx
// ─────────────────────────────────────────────────────────────
// "Switch Central" — estado compartilhado do LedLab Core.
// Guarda gabinetes, projetos, preferências e presets de test card, todos
// persistidos em localStorage (o app é 100% client-side / offline).
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState } from "react";
import { SEED_CABINETS } from "../data/mockCabinets.js";
import { SEED_PROJECTS } from "../data/mockProjects.js";
import { SEED_ACTIVITY_TYPES } from "../data/seedActivityTypes.js";
import { recomputeStatus, isoDate } from "../services/projectCalc.js";
import { fullSnapshot } from "../services/cabinets.js";
import { genId } from "../services/ids.js";
import { markBackupNow, getLastBackupAt, downloadJSON } from "../services/storage.js";

// Chaves de localStorage — fonte única em src/config/storageConfig.js
import { KEYS } from "../config/storageConfig.js";
export { KEYS };

export const DEFAULT_PREFS = {
  vk: "220_tri",
  brilho: 0.7,
  conteudo: 0.33,
  dashUpcoming: 5,
  cabCols: { pitch: true, resolucao: true, dimensoes: false, pwrMax: true, pwrMed: false, peso: true, ip: false },
  cablingAreaCount: true,
  cableNumbering: "row-tb-lr", // ordem de numeração dos cabos (ver ProjectCabeamento)
  // módulo Diárias — parâmetros globais de cálculo (ver docs/diarias-spec.md §5.1)
  worklog: { jornadaH: 12, janelaExtraH: 4, toleranciaExtraMin: 50 },
  tecnico: "", // nome que aparece no recibo (prestador/signatário)
  // fixo mensal (retainer): valor fixo por mês de um cliente prioritário, somado
  // no fechamento além dos cachês variáveis (ex.: acordo de prioridade).
  fixo: { valor: 0, cliente: "" },
  // dados legais do emitente (prestador) que aparecem no recibo de mão de obra
  emitente: { nomeFantasia: "", razaoSocial: "", cnpj: "", cpf: "", rg: "", endereco: "", cep: "", cidade: "", telefone: "", email: "", pix: "", banco: "" },
  // pagadores (tomadores) lembrados por nome de cliente: { [cliente]: { nome, doc } }
  pagadores: {},
};

// Config de cabeamento padrão de uma tela nova.
export const DEFAULT_CABLING = {
  orientation: "horizontal",
  derating: false,
  aligned: true,
  hz: 60,
  overclock: false,
  strategy: "linha",
  manual: [],
};

// ── loaders seguros ──────────────────────────────────────────
const loadArray = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v : fallback;
  } catch {
    return fallback;
  }
};

const loadObject = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const v = JSON.parse(raw);
    if (!v || typeof v !== "object") return fallback;
    const out = { ...fallback, ...v };
    // merge de 1 nível: subcampos NOVOS de subobjetos (worklog/emitente/fixo/cabCols…)
    // retroalimentam prefs já salvas, sem sobrescrever o que o usuário tinha
    for (const k of Object.keys(fallback)) {
      const fk = fallback[k], vk = v[k];
      if (fk && typeof fk === "object" && !Array.isArray(fk) && vk && typeof vk === "object" && !Array.isArray(vk)) {
        out[k] = { ...fk, ...vk };
      }
    }
    return out;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / privado — ignora; STORAGE_WRITABLE já avisa o usuário */
  }
};

// checa UMA vez, no carregamento, se dá pra gravar no localStorage (modo privado ou
// armazenamento desabilitado bloqueiam a escrita). Alimenta o aviso global em <App>.
const STORAGE_WRITABLE = (() => {
  try {
    localStorage.setItem("__ledlab_probe__", "1");
    localStorage.removeItem("__ledlab_probe__");
    return true;
  } catch {
    return false;
  }
})();

// ── factories ────────────────────────────────────────────────
export function newProject(overrides = {}) {
  return {
    id: genId("proj"),
    name: "", cliente: "", local: "", dataInicio: "", dataFim: "",
    status: "planned", obs: "",
    config: { vk: "220_tri", brilho: 0.7, conteudo: 0.33 },
    telas: [],
    updatedAt: Date.now(),
    ...overrides,
  };
}

export function newScreen(cab, overrides = {}) {
  return {
    id: genId("tela"),
    nome: "", cenario: "",
    cabling: { ...DEFAULT_CABLING, manual: [] }, // manual próprio (não compartilha a ref de DEFAULT_CABLING)
    cabId: cab?.id ?? null,
    gabinete: fullSnapshot(cab),
    cols: 1, rows: 1,
    ...overrides,
  };
}

// ── context ──────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [cabs, setCabs] = useState(() => loadArray(KEYS.cabs, SEED_CABINETS));
  const [projects, setProjects] = useState(() =>
    loadArray(KEYS.projects, SEED_PROJECTS).map((p) => ({ ...p, status: recomputeStatus(p, isoDate()) }))
  );
  const [prefs, setPrefs] = useState(() => loadObject(KEYS.prefs, DEFAULT_PREFS));
  const [tcPresets, setTcPresets] = useState(() => loadArray(KEYS.tcPresets, []));
  // módulo Diárias
  const [worklog, setWorklog] = useState(() => loadArray(KEYS.worklog, []));
  const [activityTypes, setActivityTypes] = useState(() => loadArray(KEYS.activityTypes, SEED_ACTIVITY_TYPES));
  const [lastBackupAt, setLastBackupAt] = useState(() => getLastBackupAt());

  useEffect(() => save(KEYS.cabs, cabs), [cabs]);
  useEffect(() => save(KEYS.projects, projects), [projects]);
  useEffect(() => save(KEYS.prefs, prefs), [prefs]);
  useEffect(() => save(KEYS.tcPresets, tcPresets), [tcPresets]);
  useEffect(() => save(KEYS.worklog, worklog), [worklog]);
  useEffect(() => save(KEYS.activityTypes, activityTypes), [activityTypes]);

  // backup completo (baixa .json + registra a data). lastBackupAt é reativo, então
  // o lembrete de backup no <App> some sozinho — seja pelo banner ou pelo Settings.
  const exportBackup = () => {
    downloadJSON("ledlab-backup.json", { schema: "ledlab.backup.v2", exportedAt: new Date().toISOString(), cabs, projects, prefs, tcPresets, worklog, activityTypes });
    setLastBackupAt(markBackupNow());
  };

  const value = {
    cabs, setCabs,
    projects, setProjects,
    prefs, setPrefs,
    tcPresets, setTcPresets,
    worklog, setWorklog,
    activityTypes, setActivityTypes,
    lastBackupAt, exportBackup,
    storageOk: STORAGE_WRITABLE,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useLedLabContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useLedLabContext() deve ser usado dentro de <AppProvider>.");
  return ctx;
}
