// config/supabase.js — cliente Supabase para o sync opcional na nuvem.
//
// A URL e a ANON KEY são PÚBLICAS por design (feitas pra rodar no browser). Quem
// protege os dados é o Row-Level Security (RLS) no banco — por isso podem ficar no
// código/repo sem risco. NUNCA colocar aqui a service_role key (essa é secreta).
//
// O supabase-js é carregado SOB DEMANDA (lazy): só entra no bundle quando o
// usuário ativa o sync (login). Mantém o carregamento inicial leve pra quem só
// usa o app offline.

export const SUPABASE_URL = "https://hjcbwyhxmczmehdqfnkc.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhqY2J3eWh4bWN6bWVoZHFmbmtjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM1NTYyNDAsImV4cCI6MjA5OTEzMjI0MH0.QEVoClFsgQGbZSV4YQel6Klb4Wp2DZu4KKBDwn-x1cg";

export const SYNC_CONFIGURED = Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);

let clientPromise = null;

// Retorna o cliente Supabase (singleton), importando a lib sob demanda.
export function getSupabase() {
  if (!SYNC_CONFIGURED) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        // PKCE + detectSessionInUrl: o link mágico volta com ?code=... (query, não
        // hash) — convive bem com o hash-router do app; o supabase troca o code
        // por sessão e limpa a URL sozinho.
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" },
      }),
    );
  }
  return clientPromise;
}
