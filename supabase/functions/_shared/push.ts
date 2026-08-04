// _shared/push.ts — envio de Web Push compartilhado pelas Edge Functions.
// Roda no Deno das Edge Functions (npm-compat). A chave PRIVADA vem dos
// secrets (VAPID_PRIVATE_KEY); a pública é a mesma do app (pública por design).
import webpush from "npm:web-push@3.6.7";
import { createClient } from "npm:@supabase/supabase-js@2";

const VAPID_PUBLIC_KEY =
  "BJdc0rQVhxWBYUmqe9zkjUoH-L564FG98jbznMEJd5Ib_cTokSkHfh1mkBBjMCkyjhkotppV0zkSR2UyU-ujuNo";

export function serviceClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

function configurarVapid() {
  webpush.setVapidDetails(
    Deno.env.get("VAPID_SUBJECT") ?? "mailto:neymoma@gmail.com",
    VAPID_PUBLIC_KEY,
    Deno.env.get("VAPID_PRIVATE_KEY")!,
  );
}

// Worker de fila: reivindica avisos pendentes (push_em nulo) e envia pra cada
// aparelho assinado do destinatário. Reivindicar via UPDATE atômico garante
// at-most-once mesmo com dois pokes simultâneos. Assinatura morta (404/410)
// é apagada na hora.
export async function enviarPendentes(sb: ReturnType<typeof serviceClient>) {
  configurarVapid();

  const { data: claimed, error } = await sb
    .from("avisos")
    .update({ push_em: new Date().toISOString() })
    .is("push_em", null)
    .select("id, user_id, evento_id, titulo, corpo, chave_dedupe");
  if (error) throw error;
  if (!claimed?.length) return { enviados: 0, aparelhos: 0 };

  const userIds = [...new Set(claimed.map((a) => a.user_id))];
  const { data: subs, error: e2 } = await sb
    .from("push_assinaturas")
    .select("id, user_id, endpoint, p256dh, auth")
    .in("user_id", userIds);
  if (e2) throw e2;

  const porUsuario = new Map<string, typeof subs>();
  for (const s of subs ?? []) {
    const lista = porUsuario.get(s.user_id) ?? [];
    lista.push(s);
    porUsuario.set(s.user_id, lista);
  }

  let aparelhos = 0;
  const mortas: string[] = [];
  const vivas = new Set<string>();
  await Promise.all(claimed.map(async (aviso) => {
    for (const s of porUsuario.get(aviso.user_id) ?? []) {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          JSON.stringify({
            titulo: aviso.titulo,
            corpo: aviso.corpo,
            tag: aviso.chave_dedupe,
            url: "./#/agenda",
          }),
        );
        aparelhos++;
        vivas.add(s.id);
      } catch (err) {
        const code = (err as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) mortas.push(s.id);
      }
    }
  }));

  if (mortas.length) await sb.from("push_assinaturas").delete().in("id", mortas);
  if (vivas.size) {
    await sb.from("push_assinaturas")
      .update({ ultimo_ok: new Date().toISOString() }).in("id", [...vivas]);
  }
  return { enviados: claimed.length, aparelhos };
}

// CORS: convocar é invocada direto do navegador (functions.invoke) — sem
// estes headers o preflight morre e o app só vê "Failed to send a request".
export const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export function respostaJson(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}
