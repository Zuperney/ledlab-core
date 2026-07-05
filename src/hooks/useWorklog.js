// hooks/useWorklog.js — hook de domínio das Diárias: CRUD de lançamentos + cálculo
// (delega ao motor puro services/worklog.js, injetando tipos e config do usuário).
import { useLedLabContext } from "../store/AppContext.jsx";
import { genId } from "../services/ids.js";
import { DEFAULT_WORKLOG_CFG, normalizeCfg, breakdownEvento, valorDia, agruparPorDia, totalPeriodo } from "../services/worklog.js";

export function useWorklog() {
  const { worklog, setWorklog, activityTypes, prefs } = useLedLabContext();
  const cfg = normalizeCfg({ ...DEFAULT_WORKLOG_CFG, ...(prefs.worklog || {}) });
  const typesById = Object.fromEntries(activityTypes.map((t) => [t.id, t]));

  const addEntry = (data) => { const e = { id: genId("wl"), ...data }; setWorklog([...worklog, e]); return e; };
  const updateEntry = (data) => setWorklog(worklog.map((e) => (e.id === data.id ? { ...e, ...data } : e)));
  const removeEntry = (id) => setWorklog(worklog.filter((e) => e.id !== id));

  // atalhos de cálculo já com tipos + cfg aplicados
  const breakdown = (entry) => breakdownEvento(entry, typesById[entry.tipoId], cfg);
  const dia = (entries) => valorDia(entries, typesById, cfg);
  const porDia = (entries = worklog) => agruparPorDia(entries, typesById, cfg);
  const total = (entries = worklog) => totalPeriodo(entries, typesById, cfg);

  return { worklog, setWorklog, cfg, typesById, addEntry, updateEntry, removeEntry, breakdown, dia, porDia, total };
}
