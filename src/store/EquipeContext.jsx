// store/EquipeContext.jsx — orquestra o módulo Equipe (agenda escalada).
// Mesmo padrão do SyncContext: só age com sessão; busca ao logar e quando a
// janela volta ao foco; guarda a última foto em cache local pra abrir offline.
// A fonte da verdade é o Supabase (RLS) — o cache nunca é escrito de volta.
import { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useAuth } from "./AuthContext.jsx";
import { CACHE_KEYS } from "../config/storageConfig.js";
import { FLAGS } from "../config/featureFlags.js";
import * as equipeApi from "../services/equipe.js";

const EquipeContext = createContext(null);

function lerCache(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch { return fallback; }
}
function gravarCache(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* cheio/privado — segue sem cache */ }
}

export function EquipeProvider({ children }) {
  const { user } = useAuth();
  const [equipes, setEquipes] = useState(() => lerCache(CACHE_KEYS.equipe, [])); // [{ id, nome, souGestor, codigo, membros }]
  const [eventos, setEventos] = useState(() => lerCache(CACHE_KEYS.escala, []));  // eventos_publicados visíveis + escalados[]
  const [avisos, setAvisos] = useState(() => lerCache(CACHE_KEYS.avisos, []));
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error
  const running = useRef(false);

  const refresh = useCallback(async () => {
    if (!FLAGS.equipe || !user || running.current) return;
    if (typeof navigator !== "undefined" && navigator.onLine === false) return; // fica no cache
    running.current = true;
    setStatus("loading");
    try {
      const [vinculos, pubs, avs] = await Promise.all([
        equipeApi.carregarVinculos(user.id),
        equipeApi.carregarPublicacoes(),
        equipeApi.carregarAvisos(),
      ]);
      setEquipes(vinculos); gravarCache(CACHE_KEYS.equipe, vinculos);
      setEventos(pubs); gravarCache(CACHE_KEYS.escala, pubs);
      setAvisos(avs); gravarCache(CACHE_KEYS.avisos, avs);
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
        setEquipes([]); setEventos([]); setAvisos([]);
        setStatus("idle");
        Object.values(CACHE_KEYS).forEach((k) => localStorage.removeItem(k));
      }
    }, 0);
    return () => clearTimeout(t);
  }, [user, refresh]);

  // re-busca quando a janela volta ao foco (outro membro/aviso pode ter chegado)
  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  // ── derivados ──
  const gerencio = useMemo(() => equipes.filter((e) => e.souGestor), [equipes]);
  const participo = useMemo(() => equipes.filter((e) => !e.souGestor), [equipes]);

  // publicação do gestor, indexada pelo id LOCAL do Project (aba Equipe do projeto)
  const publicacaoDoProjeto = useMemo(() => {
    const meus = new Set(gerencio.map((e) => e.id));
    const map = {};
    for (const ev of eventos) if (meus.has(ev.equipe_id)) map[ev.project_id] = ev;
    return map;
  }, [eventos, gerencio]);

  // eventos em que EU estou escalado (a Agenda mescla; dedupe lá por project_id)
  const eventosEscalados = useMemo(() => {
    const nomePor = Object.fromEntries(equipes.map((e) => [e.id, e.nome]));
    return eventos
      .filter((ev) => (ev.escalados || []).includes(user?.id))
      .map((ev) => ({ ...ev, equipe_nome: nomePor[ev.equipe_id] || "" }));
  }, [eventos, equipes, user]);

  const naoLidos = useMemo(() => avisos.filter((a) => !a.lido_em).length, [avisos]);

  // marca tudo como lido (ao abrir a central) — otimista no local, servidor atrás
  const marcarTudoLido = useCallback(async () => {
    const ids = avisos.filter((a) => !a.lido_em).map((a) => a.id);
    if (!ids.length) return;
    const agora = new Date().toISOString();
    setAvisos((prev) => prev.map((a) => (a.lido_em ? a : { ...a, lido_em: agora })));
    try { await equipeApi.marcarAvisosLidos(ids); } catch { /* re-tenta no próximo refresh */ }
  }, [avisos]);

  // ações: chamam o serviço e re-buscam (a lista local nunca é editada à mão).
  // console.error com o erro CRU: o toast mostra a tradução amigável, mas o
  // diagnóstico de campo precisa da mensagem real do Supabase.
  const agir = useCallback(async (fn) => {
    try {
      const r = await fn();
      await refresh();
      return r;
    } catch (err) {
      console.error("[equipe]", err);
      throw err;
    }
  }, [refresh]);
  const criarEquipe = useCallback((nome) => agir(() => equipeApi.criarEquipe(nome, user?.id)), [agir, user]);
  const entrarNaEquipe = useCallback((codigo, nome) => agir(() => equipeApi.entrarNaEquipe(codigo, nome)), [agir]);
  const sairDaEquipe = useCallback((id) => agir(() => equipeApi.sairDaEquipe(id, user?.id)), [agir, user]);
  const removerMembro = useCallback((id, uid) => agir(() => equipeApi.removerMembro(id, uid)), [agir]);
  const regerarCodigo = useCallback((id) => agir(() => equipeApi.regerarCodigo(id)), [agir]);
  const excluirEquipe = useCallback((id) => agir(() => equipeApi.excluirEquipe(id)), [agir]);
  const publicarEvento = useCallback((equipeId, project, ids) => agir(() => equipeApi.publicarEvento(equipeId, project, ids)), [agir]);
  const removerPublicacao = useCallback((equipeId, projectId) => agir(() => equipeApi.removerPublicacao(equipeId, projectId)), [agir]);

  const value = {
    equipes, gerencio, participo, status, refresh,
    eventos, eventosEscalados, publicacaoDoProjeto,
    avisos, naoLidos, marcarTudoLido,
    criarEquipe, entrarNaEquipe, sairDaEquipe, removerMembro, regerarCodigo, excluirEquipe,
    publicarEvento, removerPublicacao,
  };
  return <EquipeContext.Provider value={value}>{children}</EquipeContext.Provider>;
}

export function useEquipe() {
  return useContext(EquipeContext) || {
    equipes: [], gerencio: [], participo: [], status: "idle", refresh: () => {},
    eventos: [], eventosEscalados: [], publicacaoDoProjeto: {},
    avisos: [], naoLidos: 0, marcarTudoLido: () => {},
  };
}
