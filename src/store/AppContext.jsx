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
import { setAcMargin } from "../services/cabling.js";
import { fullSnapshot } from "../services/cabinets.js";
import { genId } from "../services/ids.js";
import { markBackupNow, getLastBackupAt, downloadJSON } from "../services/storage.js";
import { fileName } from "../services/filenames.js";
import { idbGet, idbSet } from "../services/idb.js";
import { T } from "../ui/tokens.js";

// Chaves de localStorage — fonte única em src/config/storageConfig.js
import { KEYS } from "../config/storageConfig.js";
export { KEYS };

export const DEFAULT_PREFS = {
  vk: "220_tri",
  brilho: 0.7,
  conteudo: 0.33,
  dashUpcoming: 5,
  dashOcultarValor: false, // esconde o total de cachês (R$) na tela inicial (privacidade)
  cabCols: { pitch: true, resolucao: true, dimensoes: false, pwrMax: true, pwrMed: false, peso: true, ip: false },
  cablingAreaCount: true,
  cableNumbering: "row-tb-lr", // ordem de numeração dos cabos; sufixo "-serp" = serpentina (ver NumberingPicker)
  // render do mapa de cabos (Cabeamento/Diagramação/Relatório) — ver components/CablingLayer.jsx
  cablingRender: { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl" }, // numberPos: tl|tr|bl|br
  acMargin: 1, // fator de segurança do cabo AC: 1 = sem margem; 0,8 = regra dos 80% (carga contínua)
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

// merge de 1 nível: subcampos NOVOS de subobjetos (worklog/emitente/fixo/cabCols…)
// retroalimentam prefs já salvas, sem sobrescrever o que o usuário tinha
function mergeDefaults(fallback, v) {
  if (!v || typeof v !== "object" || Array.isArray(v)) return fallback;
  const out = { ...fallback, ...v };
  for (const k of Object.keys(fallback)) {
    const fk = fallback[k], vk = v[k];
    if (fk && typeof fk === "object" && !Array.isArray(fk) && vk && typeof vk === "object" && !Array.isArray(vk)) {
      out[k] = { ...fk, ...vk };
    }
  }
  return out;
}

const loadObject = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? mergeDefaults(fallback, JSON.parse(raw)) : fallback;
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

// ── armazenamento: IndexedDB é primário; localStorage é o espelho (dual-write) ──
// grava nos dois — IndexedDB (cota grande, base de fotos/sync) + localStorage
// (rede de segurança síncrona; aposentável depois do período de teste).
function persist(key, value) {
  save(key, value);
  idbSet(key, value);
}
// lê a fatia do IndexedDB; na 1ª vez (vazio) migra o valor atual do localStorage
async function hydrateArray(key, fallback) {
  const v = await idbGet(key);
  if (Array.isArray(v)) return v;
  const fromLs = loadArray(key, fallback);
  idbSet(key, fromLs);
  return fromLs;
}
async function hydrateObject(key, fallback) {
  const v = await idbGet(key);
  if (v && typeof v === "object" && !Array.isArray(v)) return mergeDefaults(fallback, v);
  const fromLs = loadObject(key, fallback);
  idbSet(key, fromLs);
  return fromLs;
}

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
    // manual próprio (não compartilha a ref); telas NOVAS nascem na régua de PIXELS
    // (portas de dados reais) — telas antigas sem o campo continuam na régua de área.
    cabling: { ...DEFAULT_CABLING, manual: [], sinal: { rule: "px" } },
    cabId: cab?.id ?? null,
    gabinete: fullSnapshot(cab),
    cols: 1, rows: 1,
    ...overrides,
  };
}

// ── context ──────────────────────────────────────────────────
const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);
  // valores iniciais são placeholders — a splash cobre até hidratar do IndexedDB
  const [cabs, setCabs] = useState(SEED_CABINETS);
  const [projects, setProjects] = useState(SEED_PROJECTS);
  const [prefs, setPrefs] = useState(DEFAULT_PREFS);
  const [tcPresets, setTcPresets] = useState([]);
  const [worklog, setWorklog] = useState([]);
  const [activityTypes, setActivityTypes] = useState(SEED_ACTIVITY_TYPES);
  const [despesas, setDespesas] = useState([]);
  const [lastBackupAt, setLastBackupAt] = useState(() => getLastBackupAt());

  // hidratação: IndexedDB é a fonte primária. Na 1ª abertura (IndexedDB vazio),
  // migra o que existir no localStorage. Se algo falhar, cai pro localStorage —
  // o app nunca fica preso na splash.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, p, pr, tc, wl, at, dp] = await Promise.all([
          hydrateArray(KEYS.cabs, SEED_CABINETS),
          hydrateArray(KEYS.projects, SEED_PROJECTS),
          hydrateObject(KEYS.prefs, DEFAULT_PREFS),
          hydrateArray(KEYS.tcPresets, []),
          hydrateArray(KEYS.worklog, []),
          hydrateArray(KEYS.activityTypes, SEED_ACTIVITY_TYPES),
          hydrateArray(KEYS.despesas, []),
        ]);
        if (!alive) return;
        setCabs(c);
        setProjects(p.map((x) => ({ ...x, status: recomputeStatus(x, isoDate()) })));
        setPrefs(pr);
        setTcPresets(tc);
        setWorklog(wl);
        setActivityTypes(at);
        setDespesas(dp);
      } catch {
        if (!alive) return;
        setCabs(loadArray(KEYS.cabs, SEED_CABINETS));
        setProjects(loadArray(KEYS.projects, SEED_PROJECTS).map((x) => ({ ...x, status: recomputeStatus(x, isoDate()) })));
        setPrefs(loadObject(KEYS.prefs, DEFAULT_PREFS));
        setTcPresets(loadArray(KEYS.tcPresets, []));
        setWorklog(loadArray(KEYS.worklog, []));
        setActivityTypes(loadArray(KEYS.activityTypes, SEED_ACTIVITY_TYPES));
        setDespesas(loadArray(KEYS.despesas, []));
      } finally {
        if (alive) setHydrated(true);
      }
    })();
    return () => { alive = false; };
  }, []);

  // dual-write (IndexedDB + localStorage), só depois de hidratar — evita gravar
  // o placeholder inicial por cima do dado real.
  useEffect(() => { if (hydrated) persist(KEYS.cabs, cabs); }, [cabs, hydrated]);
  useEffect(() => { if (hydrated) persist(KEYS.projects, projects); }, [projects, hydrated]);
  useEffect(() => { if (hydrated) persist(KEYS.prefs, prefs); }, [prefs, hydrated]);
  useEffect(() => { if (hydrated) persist(KEYS.tcPresets, tcPresets); }, [tcPresets, hydrated]);
  useEffect(() => { if (hydrated) persist(KEYS.worklog, worklog); }, [worklog, hydrated]);
  useEffect(() => { if (hydrated) persist(KEYS.activityTypes, activityTypes); }, [activityTypes, hydrated]);
  useEffect(() => { if (hydrated) persist(KEYS.despesas, despesas); }, [despesas, hydrated]);

  // sincroniza a margem de segurança do cabo AC (módulo em cabling.js) com a pref
  useEffect(() => { setAcMargin(prefs.acMargin); }, [prefs.acMargin]);

  // backup completo (baixa .json + registra a data). lastBackupAt é reativo, então
  // o lembrete de backup no <App> some sozinho — seja pelo banner ou pelo Settings.
  const exportBackup = () => {
    downloadJSON(fileName(["ledlab-backup"], "json"), { schema: "ledlab.backup.v2", exportedAt: new Date().toISOString(), cabs, projects, prefs, tcPresets, worklog, activityTypes, despesas });
    setLastBackupAt(markBackupNow());
  };

  const value = {
    cabs, setCabs,
    projects, setProjects,
    prefs, setPrefs,
    tcPresets, setTcPresets,
    worklog, setWorklog,
    activityTypes, setActivityTypes,
    despesas, setDespesas,
    lastBackupAt, exportBackup,
    storageOk: STORAGE_WRITABLE,
  };
  if (!hydrated) return <Splash />;
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

function Splash() {
  return (
    <div style={{ position: "fixed", inset: 0, display: "grid", placeItems: "center", background: T.bg, color: T.mut, fontSize: 13, letterSpacing: "0.02em" }}>
      Carregando…
    </div>
  );
}

export function useLedLabContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useLedLabContext() deve ser usado dentro de <AppProvider>.");
  return ctx;
}
