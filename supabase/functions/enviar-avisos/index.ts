// enviar-avisos — WORKER da fila de push.
// Cutucado pelo trigger avisos_cutucar_push (migration 03) e pelo pg_cron dos
// lembretes (fase 4). Não confia em input nenhum: só drena avisos pendentes.
// Cutucar de novo é inofensivo (claim atômico em _shared/push.ts).
import { serviceClient, enviarPendentes, respostaJson } from "../_shared/push.ts";

Deno.serve(async () => {
  try {
    const resultado = await enviarPendentes(serviceClient());
    return respostaJson(resultado);
  } catch (err) {
    console.error("enviar-avisos:", err);
    return respostaJson({ erro: String(err) }, 500);
  }
});
