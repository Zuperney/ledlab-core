// hooks/useCabinets.js — hook de domínio p/ a biblioteca de gabinetes.
import { useLedLabContext } from "../store/AppContext.jsx";
import { genNumericId } from "../services/ids.js";

const firstWord = (s) => (s || "").trim().split(/\s+/)[0] || "";
// marca: campo explícito; senão 1ª palavra do nome (dados antigos); senão "Genérico"
export const brandOf = (c) => (c.marca && c.marca.trim()) || firstWord(c.nome) || "Genérico";

export function useCabinets() {
  const { cabs, setCabs, prefs, setPrefs } = useLedLabContext();
  const addCabinet = (data) => { const c = { ...data, id: genNumericId(cabs.length) }; setCabs([...cabs, c]); return c; };
  const updateCabinet = (data) => setCabs(cabs.map((c) => (c.id === data.id ? data : c)));
  const removeCabinet = (id) => setCabs(cabs.filter((c) => c.id !== id));
  const favCabId = prefs.favCabId;
  const favCab = cabs.find((c) => c.id === favCabId) || cabs[0];
  const setFav = (id) => setPrefs({ ...prefs, favCabId: prefs.favCabId === id ? null : id });
  return { cabs, setCabs, addCabinet, updateCabinet, removeCabinet, favCabId, favCab, setFav, brandOf };
}
