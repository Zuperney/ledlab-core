// services/storage.js — durabilidade dos dados no navegador.
// (1) Armazenamento persistente: pede ao navegador pra NÃO despejar os dados
//     (localStorage) sob pressão de espaço ou inatividade (ex.: iOS ~7 dias).
// (2) Marca da data do último backup, pra lembrar o usuário de exportar.

// Pede persistência. Em PWA instalado costuma ser concedido silenciosamente.
// Retorna true se está persistente (já era ou passou a ser), false caso contrário.
export async function requestPersist() {
  try {
    if (!navigator.storage?.persist) return false;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

export async function isPersisted() {
  try {
    return (await navigator.storage?.persisted?.()) ?? false;
  } catch {
    return false;
  }
}

// Uso estimado (bytes), quando o navegador expõe.
export async function storageUsage() {
  try {
    const est = await navigator.storage?.estimate?.();
    return est?.usage ?? null;
  } catch {
    return null;
  }
}

// ── Marca do último backup ──
const LAST_BACKUP_KEY = "ledlab.lastBackupAt";

export function markBackupNow() {
  try {
    const iso = new Date().toISOString();
    localStorage.setItem(LAST_BACKUP_KEY, iso);
    return iso;
  } catch {
    return null;
  }
}

export function getLastBackupAt() {
  try {
    return localStorage.getItem(LAST_BACKUP_KEY);
  } catch {
    return null;
  }
}

// Dias desde o último backup; Infinity se nunca fez.
export function daysSinceBackup() {
  const iso = getLastBackupAt();
  if (!iso) return Infinity;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return Infinity;
  return (Date.now() - t) / 86400000;
}
