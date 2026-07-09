// store/AuthContext.jsx — sessão de autenticação para o sync opcional na nuvem.
//
// Estratégia de custo/leveza: o supabase-js só é carregado se o usuário JÁ ativou
// o sync antes (flag em localStorage) ou se está voltando de um link mágico (code
// na URL). Quem nunca logou não carrega nada — o app segue 100% local/offline.
import { createContext, useContext, useEffect, useState } from "react";
import { getSupabase, SYNC_CONFIGURED } from "../config/supabase.js";

const AuthContext = createContext(null);
const SYNC_FLAG = "ledlab.syncEnabled";

// só vale carregar o supabase-js se o sync já foi ativado (flag) ou se estamos
// voltando de um link mágico (code/token na URL). Quem nunca logou não paga nada.
function needsSupabase() {
  if (!SYNC_CONFIGURED) return false;
  const returning = /[?&]code=/.test(window.location.search) || window.location.hash.includes("access_token");
  return returning || localStorage.getItem(SYNC_FLAG) === "1";
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(() => !needsSupabase()); // já pronto se não precisa do supabase

  useEffect(() => {
    if (!needsSupabase()) return; // ready já começou true; nada a carregar
    let subscription;
    (async () => {
      try {
        const sb = await getSupabase();
        const { data } = await sb.auth.getSession();
        setSession(data.session);
        if (data.session) localStorage.setItem(SYNC_FLAG, "1");
        subscription = sb.auth.onAuthStateChange((_evt, s) => {
          setSession(s);
          if (s) localStorage.setItem(SYNC_FLAG, "1");
        }).data.subscription;
      } catch {
        /* offline / supabase indisponível — segue sem sessão, app funciona local */
      } finally {
        setReady(true);
      }
    })();
    return () => subscription?.unsubscribe?.();
  }, []);

  // envia o link mágico (OTP) pro e-mail; ao clicar, volta logado
  const signIn = async (email) => {
    const sb = await getSupabase();
    if (!sb) throw new Error("Sincronização não configurada.");
    localStorage.setItem(SYNC_FLAG, "1"); // marca a intenção p/ restaurar a sessão no retorno
    return sb.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
  };

  const signOut = async () => {
    const sb = await getSupabase();
    await sb?.auth.signOut();
    localStorage.removeItem(SYNC_FLAG);
    setSession(null);
  };

  return (
    <AuthContext.Provider value={{ session, user: session?.user || null, ready, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth() deve ser usado dentro de <AuthProvider>.");
  return ctx;
}
