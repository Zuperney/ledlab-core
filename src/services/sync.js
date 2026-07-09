// services/sync.js — motor de sincronização (opcional) com a nuvem (Supabase).
//
// Estratégia: por FATIA (cabs, projects, prefs, tcPresets, worklog, activityTypes),
// last-write-wins com uma "baseline" da última sincronização.
//   - baseline = { [key]: { hash, cloudTs } } no localStorage.
//   - mudança LOCAL = hash do conteúdo diferente do baseline (não precisa
//     instrumentar cada edição do app).
//   - mudança na NUVEM = updated_at diferente do baseline.
// À prova de loop: ao aplicar dado da nuvem, o baseline passa a bater com o
// local → a fatia não é re-enviada.
import { getSupabase } from "../config/supabase.js";

const BASELINE_KEY = "ledlab.syncBaseline";

// hash barato e estável do conteúdo (detecta mudança, não precisa ser cripto)
function hash(v) {
  const s = JSON.stringify(v ?? null);
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
  return `${h}:${s.length}`;
}

function getBaseline() {
  try { return JSON.parse(localStorage.getItem(BASELINE_KEY)) || {}; } catch { return {}; }
}
function setBaseline(b) {
  try { localStorage.setItem(BASELINE_KEY, JSON.stringify(b)); } catch { /* quota */ }
}
// usado ao sair da conta: esquece a baseline (o próximo login re-sincroniza do zero)
export function clearSyncBaseline() {
  try { localStorage.removeItem(BASELINE_KEY); } catch { /* ok */ }
}

async function pullCloud(userId) {
  const sb = await getSupabase();
  const { data, error } = await sb.from("user_data").select("key,value,updated_at").eq("user_id", userId);
  if (error) throw error;
  const out = {};
  for (const r of data || []) out[r.key] = { value: r.value, cloudTs: new Date(r.updated_at).getTime() };
  return out;
}

async function pushSlice(userId, key, value) {
  const sb = await getSupabase();
  const iso = new Date().toISOString();
  const { error } = await sb.from("user_data").upsert({ user_id: userId, key, value, updated_at: iso }, { onConflict: "user_id,key" });
  if (error) throw error;
  return new Date(iso).getTime();
}

// slices: [{ key, value, apply(newValue) }]
export async function syncAll(userId, slices) {
  const baseline = getBaseline();
  const cloud = await pullCloud(userId);
  let pushed = 0, pulled = 0;

  for (const s of slices) {
    const localH = hash(s.value);
    const ce = cloud[s.key];        // { value, cloudTs } | undefined
    const bl = baseline[s.key];     // { hash, cloudTs } | undefined
    const localChanged = !bl || localH !== bl.hash;
    const cloudChanged = ce ? (!bl || ce.cloudTs !== bl.cloudTs) : false;

    if (!localChanged && !cloudChanged) continue;

    if (localChanged && cloudChanged) {
      if (!bl && ce) {
        // 1ª sincronização e a nuvem já tem dado → nuvem vence (você logou pra buscar seus dados)
        s.apply(ce.value);
        baseline[s.key] = { hash: hash(ce.value), cloudTs: ce.cloudTs };
        pulled++;
      } else {
        // conflito depois de já ter sincronizado → local vence (preserva o aparelho atual)
        const ts = await pushSlice(userId, s.key, s.value);
        baseline[s.key] = { hash: localH, cloudTs: ts };
        pushed++;
      }
    } else if (cloudChanged) {
      // só a nuvem mudou → aplica local
      s.apply(ce.value);
      baseline[s.key] = { hash: hash(ce.value), cloudTs: ce.cloudTs };
      pulled++;
    } else {
      // só o local mudou (ou a nuvem não tem) → sobe
      const ts = await pushSlice(userId, s.key, s.value);
      baseline[s.key] = { hash: localH, cloudTs: ts };
      pushed++;
    }
  }

  setBaseline(baseline);
  return { pushed, pulled };
}
