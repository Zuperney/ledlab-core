// config/push.js — chave PÚBLICA do Web Push (VAPID).
// É pública por design (identifica o servidor de envio pro navegador); a chave
// PRIVADA do par vive só nos secrets das Edge Functions (VAPID_PRIVATE_KEY) —
// nunca no repo. Par gerado em 04/08/2026 (curva P-256).
export const VAPID_PUBLIC_KEY =
  "BJdc0rQVhxWBYUmqe9zkjUoH-L564FG98jbznMEJd5Ib_cTokSkHfh1mkBBjMCkyjhkotppV0zkSR2UyU-ujuNo";

export const PUSH_CONFIGURED = Boolean(VAPID_PUBLIC_KEY);
