// store/AppContext.jsx
// ─────────────────────────────────────────────────────────────
// "Switch Central" — estado compartilhado do LedLab Core.
// Guarda gabinetes, projetos, preferências e presets de test card, todos
// persistidos em localStorage (o app é 100% client-side / offline).
// ─────────────────────────────────────────────────────────────

import { createContext, useContext, useEffect, useState } from "react";
import { SEED_CABINETS } from "../data/mockCabinets.js";
import { SEED_PROJECTS } from "../data/mockProjects.js";
import { recomputeStatus, isoDate } from "../services/projectCalc.js";
import { fullSnapshot } from "../services/cabinets.js";
import { genId } from "../services/ids.js";

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
    return v && typeof v === "object" ? { ...fallback, ...v } : fallback;
  } catch {
    return fallback;
  }
};

const save = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / privado — ignora */
  }
};

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
    cabling: { ...DEFAULT_CABLING },
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

  useEffect(() => save(KEYS.cabs, cabs), [cabs]);
  useEffect(() => save(KEYS.projects, projects), [projects]);
  useEffect(() => save(KEYS.prefs, prefs), [prefs]);
  useEffect(() => save(KEYS.tcPresets, tcPresets), [tcPresets]);

  const value = {
    cabs, setCabs,
    projects, setProjects,
    prefs, setPrefs,
    tcPresets, setTcPresets,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useLedLabContext() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useLedLabContext() deve ser usado dentro de <AppProvider>.");
  return ctx;
}
