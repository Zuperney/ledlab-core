// store/EquipeContext.jsx — orquestra o módulo Equipe (agenda escalada).
// Mesmo padrão do SyncContext: só age com sessão; busca ao logar e quando a
// janela volta ao foco; guarda a última foto em cache local pra abrir offline.
// A fonte da verdade é o Supabase (RLS) — o cache nunca é escrito de volta.
import { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import { CACHE_KEYS } from "../config/storageConfig.js";
import { FLAGS } from "../config/featureFlags.js";
import * as equipeApi from "../services/equipe.js";

const EquipeContext = createContext(null);

function lerCache() {
  try {
    const raw = localStorage.getItem(CACHE_KEYS.equipe);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function EquipeProvider({ children }) {
  const { user } = useAuth();
  const [equipes, setEquipes] = useState(lerCache); // [{ id, nome, souGestor, codigo, membros }]
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (!FLAGS.equipe || !user || running.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return; // fica no cache
    running.current = true;
    setStatus("loading");
    try {
      const dados = await equipeApi.carregarVinculos(user.id);
      setEquipes(dados);
      localStorage.setItem(CACHE_KEYS.equipe, JSON.stringify(dados));
      setStatus("ready");
    } catch {
      setStatus("error"); // cache continua valendo na tela
    } finally {
      running.current = false;
    }
  }, [user]);

  // busca ao logar; limpa ao deslogar (dado de terceiros não fica sem sessão).
  // setTimeout: mesmo padrão do SyncContext — nada de setState síncrono no effect.
  const prevUser = useRef(user);
  useEffect(() => {
    const saiu = prevUser.current && !user;
    prevUser.current = user;
    const t = setTimeout(() => {
      if (user) refresh();
      else if (saiu) {
        setEquipes([]);
        setStatus("idle");
        localStorage.removeItem(CACHE_KEYS.equipe);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [user, refresh]);

  // re-busca quando a janela volta ao foco (outro membro pode ter entrado)
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // ações: chamam o serviço e re-buscam (a lista local nunca é editada à mão)
  const agir = useCallback(async (fn) => { const r = await fn(); await refresh(); return r; }, [refresh]);
  const criarEquipe = useCallback((nome) => agir(() => equipeApi.criarEquipe(nome)), [agir]);
  const entrarNaEquipe = useCallback((codigo, nome) => agir(() => equipeApi.entrarNaEquipe(codigo, nome)), [agir]);
  const sairDaEquipe = useCallback((id) => agir(() => equipeApi.sairDaEquipe(id, user?.id)), [agir, user]);
  const removerMembro = useCallback((id, uid) => agir(() => equipeApi.removerMembro(id, uid)), [agir]);
  const regerarCodigo = useCallback((id) => agir(() => equipeApi.regerarCodigo(id)), [agir]);
  const excluirEquipe = useCallback((id) => agir(() => equipeApi.excluirEquipe(id)), [agir]);

  const value = {
    equipes, status, refresh,
    gerencio: equipes.filter((e) => e.souGestor),
    participo: equipes.filter((e) => !e.souGestor),
    criarEquipe, entrarNaEquipe, sairDaEquipe, removerMembro, regerarCodigo, excluirEquipe,
  };
  return <EquipeContext.Provider value={value}>{children}</EquipeContext.Provider>;
}

export function useEquipe() {
  return useContext(EquipeContext) || {
    equipes: [], gerencio: [], participo: [], status: "idle", refresh: () => {},
  };
}
