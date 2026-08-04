// config/storageConfig.js — chaves de localStorage (versionadas).
// Fonte única; o AppContext importa daqui.

export const KEYS = {
  cabs: "ledlab.cabs.v1",
  projects: "ledlab.projects.v1",
  prefs: "ledlab.prefs.v1",
  tcPresets: "ledlab.testcard-presets.v1",
  worklog: "ledlab.worklog.v1",           // módulo Diárias: lançamentos (WorkEntry[])
  activityTypes: "ledlab.activitytypes.v1", // módulo Diárias: tipos de atividade
  despesas: "ledlab.despesas.v1",         // módulo Reembolso: despesas (Despesa[]); fotos ficam em idb à parte
};

// Caches read-only do módulo Equipe (a fonte da verdade é o Supabase; isto é
// só a última foto pra abrir offline). FORA de KEYS de propósito: não entram
// no backup, no sync KV nem no restaurar de fábrica — logout limpa.
export const CACHE_KEYS = {
  equipe: "ledlab.equipe.v1",   // vínculos + membros (EquipeContext)
};
