// hooks/useActivityTypes.js — CRUD dos tipos de atividade do módulo Diárias.
import { useLedLabContext } from "../store/AppContext.jsx";
import { genId } from "../services/ids.js";

export function useActivityTypes() {
  const { activityTypes, setActivityTypes } = useLedLabContext();
  const typesById = Object.fromEntries(activityTypes.map((t) => [t.id, t]));
  const addType = (data) => {
    const t = { id: genId("atype"), cor: "#7c3aed", valorBase: 0, geraHoraExtra: true, podeSegundoCache: true, ativo: true, ...data };
    setActivityTypes([...activityTypes, t]);
    return t;
  };
  const updateType = (data) => setActivityTypes(activityTypes.map((t) => (t.id === data.id ? { ...t, ...data } : t)));
  const removeType = (id) => setActivityTypes(activityTypes.filter((t) => t.id !== id));
  return { activityTypes, typesById, addType, updateType, removeType };
}
