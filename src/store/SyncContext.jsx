// store/SyncContext.jsx — orquestra a sincronização com a nuvem (opcional).
// Só age quando há sessão (usuário logado). Sincroniza ao logar, quando os dados
// mudam (com debounce) e ao reconectar. Expõe status pro UI das Configurações.
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import { useLedLabContext, KEYS } from "./AppContext.jsx";
import { syncAll, clearSyncBaseline } from "../services/sync.js";

const SyncContext = createContext(null);

export function SyncProvider({ children }) {
  const { user } = useAuth();
  const app = useLedLabContext();
  const [status, setStatus] = useState("idle"); // idle | syncing | synced | offline | error
  const [lastSyncedAt, setLastSyncedAt] = useState(null);
  const running = useRef(false);

  const runSync = useCallback(async () => {
    if (!user || running.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) { setStatus("offline"); return; }
    running.current = true;
    setStatus("syncing");
    try {
      await syncAll(user.id, [
        { key: KEYS.cabs, value: app.cabs, apply: app.setCabs },
        { key: KEYS.projects, value: app.projects, apply: app.setProjects },
        { key: KEYS.prefs, value: app.prefs, apply: app.setPrefs },
        { key: KEYS.tcPresets, value: app.tcPresets, apply: app.setTcPresets },
        { key: KEYS.worklog, value: app.worklog, apply: app.setWorklog },
        { key: KEYS.activityTypes, value: app.activityTypes, apply: app.setActivityTypes },
      ]);
      setStatus("synced");
      setLastSyncedAt(Date.now());
    } catch {
      setStatus("error");
    } finally {
      running.current = false;
    }
  }, [user, app.cabs, app.projects, app.prefs, app.tcPresets, app.worklog, app.activityTypes,
      app.setCabs, app.setProjects, app.setPrefs, app.setTcPresets, app.setWorklog, app.setActivityTypes]);

  // esquece a baseline ao deslogar (próximo login re-sincroniza limpo)
  const prevUser = useRef(user);
  useEffect(() => {
    if (prevUser.current && !user) clearSyncBaseline();
    prevUser.current = user;
  }, [user]);

  // sincroniza ao logar e quando os dados mudam (debounce)
  useEffect(() => {
    if (!user) return;
    const t = setTimeout(runSync, 800);
    return () => clearTimeout(t);
  }, [user, runSync]);

  // re-sincroniza ao reconectar
  useEffect(() => {
    const onOnline = () => runSync();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [runSync]);

  return <SyncContext.Provider value={{ status, lastSyncedAt, syncNow: runSync }}>{children}</SyncContext.Provider>;
}

export function useSync() {
  return useContext(SyncContext) || { status: "idle", lastSyncedAt: null, syncNow: () => {} };
}
