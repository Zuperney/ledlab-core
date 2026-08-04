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
}

// Desliga neste aparelho: remove do Supabase e cancela a assinatura local.
export async function desativarAvisos() {
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager?.getSubscription();
  if (!sub) return;
  try {
    const client = await getSupabase();
    await client?.from("push_assinaturas").delete().eq("endpoint", sub.endpoint);
  } catch { /* sem rede: a Edge Function limpa no próximo 410 */ }
  await sub.unsubscribe();
}
