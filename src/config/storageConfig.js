// config/storageConfig.js — chaves de localStorage (versionadas) e schemas de backup.
// Fonte única; o AppContext importa daqui.

export const KEYS = {
  cabs: "ledlab.cabs.v1",
  projects: "ledlab.projects.v1",
  prefs: "ledlab.prefs.v1",
  tcPresets: "ledlab.testcard-presets.v1",
  worklog: "ledlab.worklog.v1",           // módulo Diárias: lançamentos (WorkEntry[])
  activityTypes: "ledlab.activitytypes.v1", // módulo Diárias: tipos de atividade
};

export const BACKUP_SCHEMA = "ledlab.backup.v1";
