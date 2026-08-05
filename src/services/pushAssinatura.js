// services/pushAssinatura.js — I/O do opt-in de "avisos no celular" (Web Push).
// Padrão sync.js: sem estado, quem orquestra é a UI. Sem teste (borda de I/O).
//
// Regras de plataforma que moram aqui:
// - permissão SÓ a partir de gesto do usuário (toggle nas Configurações);
// - iOS: push exige o PWA instalado na tela de início (iOS 16.4+);
// - Electron/dev: sem service worker registrado → sem push (a central in-app cobre).
import { getSupabase } from "../config/supabase.js";
import { VAPID_PUBLIC_KEY, PUSH_CONFIGURED } from "../config/push.js";

// base64url → Uint8Array (formato que o pushManager.subscribe exige)
function chaveComoBytes(b64url) {
  const pad = "=".repeat((4 - (b64url.length % 4)) % 4);
  const b64 = (b64url + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

// Opt-out explícito por aparelho: quem DESLIGOU não pode ser re-assinado
// pelo automático (a permissão do navegador continua "granted").
const OPT_OUT_KEY = "ledlab.avisosOptOut";

const ehIOS = () => /iPad|iPhone|iPod/.test(navigator.userAgent);
const ehInstalado = () =>
  window.matchMedia?.("(display-mode: standalone)")?.matches || window.navigator.standalone === true;

// Diagnóstico pro UI decidir o que mostrar.
// "ok" | "sem-suporte" | "ios-nao-instalado" | "negado"
export function suportePush() {
  if (!PUSH_CONFIGURED) return "sem-suporte";
  if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
    return ehIOS() && !ehInstalado() ? "ios-nao-instalado" : "sem-suporte";
  }
  if (ehIOS() && !ehInstalado()) return "ios-nao-instalado";
  if (Notification.permission === "denied") return "negado";
  return "ok";
}

// Já existe assinatura neste aparelho?
export async function assinaturaAtiva() {
  try {
    if (suportePush() !== "ok") return false;
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager?.getSubscription();
    return !!sub;
  } catch { return false; }
}

// Liga os avisos neste aparelho: pede permissão, assina e grava no Supabase.
// Lança Error com mensagem já em PT-BR (a UI só repassa pro toast).
export async function ativarAvisos(userId) {
  const estado = suportePush();
  if (estado === "ios-nao-instalado") throw new Error("No iPhone, adicione o app à tela de início primeiro (Compartilhar → Adicionar à Tela de Início).");
  if (estado === "negado") throw new Error("O navegador está bloqueando avisos — libere nas permissões do site.");
  if (estado !== "ok") throw new Error("Este navegador não tem suporte a avisos no celular.");

  const perm = await Notification.requestPermission();
  if (perm !== "granted") throw new Error("Sem a permissão o aviso não chega — você pode ligar de novo quando quiser.");

  const reg = await navigator.serviceWorker.ready; // registrado só em PROD (main.jsx)
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: chaveComoBytes(VAPID_PUBLIC_KEY),
  });

  const { keys } = sub.toJSON();
  const client = await getSupabase();
  if (!client) throw new Error("Conecte-se primeiro (Conta & sincronização).");
  const { error } = await client.from("push_assinaturas").upsert({
    user_id: userId,
    endpoint: sub.endpoint,
    p256dh: keys.p256dh,
    auth: keys.auth,
    user_agent: navigator.userAgent.slice(0, 200),
  }, { onConflict: "endpoint" });
  if (error) { try { await sub.unsubscribe(); } catch { /* melhor esforço */ } throw new Error(error.message); }
  try { localStorage.removeItem(OPT_OUT_KEY); } catch { /* ok */ }
}

// "Vem ativo" até onde o navegador deixa: se a permissão JÁ está concedida
// neste aparelho (usuário permitiu antes) e ele não desligou de propósito,
// re-assina sozinho ao logar — sem prompt, que prompt exige gesto.
export async function reassinarSeConcedido(userId) {
  try {
    if (!import.meta.env.PROD) return false;
    if (suportePush() !== "ok") return false;
    if (Notification.permission !== "granted") return false;
    if (localStorage.getItem(OPT_OUT_KEY) === "1") return false;
    if (await assinaturaAtiva()) return false; // já está de pé
    await ativarAvisos(userId); // permissão granted → não abre prompt
    return true;
  } catch { return false; } // silencioso: é conveniência, não fluxo principal
}

// Aparelhos assinados da conta (pra revisar/revogar nas Configurações).
export async function listarAparelhos() {
  const client = await getSupabase();
  if (!client) return [];
  const { data, error } = await client.from("push_assinaturas")
    .select("id, endpoint, user_agent, criado_em, ultimo_ok")
    .order("criado_em", { ascending: false });
  if (error) throw new Error(error.message);
  const atualEndpoint = await (async () => {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      return (await reg?.pushManager?.getSubscription())?.endpoint || null;
    } catch { return null; }
  })();
  return (data || []).map((d) => ({ ...d, esteAparelho: d.endpoint === atualEndpoint }));
}

// Revoga um aparelho (LGPD: o dono da conta controla onde o aviso chega).
// Se for o aparelho atual, cancela a assinatura local também.
export async function revogarAparelho(aparelho) {
  const client = await getSupabase();
  if (!client) throw new Error("Conecte-se primeiro (Conta & sincronização).");
  const { error } = await client.from("push_assinaturas").delete().eq("id", aparelho.id);
  if (error) throw new Error(error.message);
  if (aparelho.esteAparelho) {
    try {
      const reg = await navigator.serviceWorker?.getRegistration();
      await (await reg?.pushManager?.getSubscription())?.unsubscribe();
    } catch { /* melhor esforço */ }
  }
}

// rótulo curto do aparelho a partir do user-agent (só pra lista das Configurações)
export function rotuloDoAparelho(userAgent = "") {
  const so = /iPhone|iPad/.test(userAgent) ? "iPhone/iPad"
    : /Android/.test(userAgent) ? "Android"
    : /Windows/.test(userAgent) ? "Windows"
    : /Mac OS/.test(userAgent) ? "Mac" : "Aparelho";
  const nav = /Edg\//.test(userAgent) ? "Edge"
    : /Chrome\//.test(userAgent) ? "Chrome"
    : /Safari\//.test(userAgent) ? "Safari"
    : /Firefox\//.test(userAgent) ? "Firefox" : "";
  return nav ? `${so} · ${nav}` : so;
}

// Desliga neste aparelho: remove do Supabase e cancela a assinatura local.
// Marca o opt-out — o auto-assinar (reassinarSeConcedido) passa a respeitar.
export async function desativarAvisos() {
  try { localStorage.setItem(OPT_OUT_KEY, "1"); } catch { /* ok */ }
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub) return;
  try {
    const client = await getSupabase();
    await client?.from("push_assinaturas").delete().eq("endpoint", sub.endpoint);
  } catch { /* sem rede: a Edge Function limpa no próximo 410 */ }
  await sub.unsubscribe();
}
