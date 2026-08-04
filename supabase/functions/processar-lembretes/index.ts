// processar-lembretes — varredura do pg_cron (a cada 5 min).
// Reivindica lembretes vencidos (claim atômico via UPDATE), cria um aviso
// 'lembrete' pra cada escalado do evento e drena a fila de push. Dedupe:
// 'lembrete:<evento>:<antecedência>' — reagendar o MESMO lembrete não repete
// aviso; mudar a antecedência gera um novo (comportamento desejado).
import { serviceClient, enviarPendentes, respostaJson } from "../_shared/push.ts";

Deno.serve(async () => {
  try {
    const sb = serviceClient();

    const { data: vencidos, error } = await sb
      .from("lembretes")
      .update({ enviado_em: new Date().toISOString() })
      .lte("disparar_em", new Date().toISOString())
      .is("enviado_em", null)
      .select("id, evento_id, antecedencia_min, disparar_em");
    if (error) throw error;

    for (const lem of vencidos ?? []) {
      const { data: ev } = await sb.from("eventos_publicados")
        .select("id, nome, local, data_inicio, data_fim, hora_chamada, equipe_id, cancelado")
        .eq("id", lem.evento_id).single();
      if (!ev || ev.cancelado) continue;

      const { data: eq } = await sb.from("equipes").select("gestor_id").eq("id", ev.equipe_id).single();
      const { data: escala } = await sb.from("escalas").select("user_id").eq("evento_id", ev.id);
      const destinatarios = (escala ?? []).map((r) => r.user_id).filter((u) => u !== eq?.gestor_id);
      if (!destinatarios.length) continue;

      const fmt = (d: string | null) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "");
      const chamada = ev.hora_chamada ? " · chamada " + String(ev.hora_chamada).slice(0, 5) : "";
      const corpo = [fmt(ev.data_inicio) + chamada, ev.local].filter(Boolean).join(" · ");

      const { error: e2 } = await sb.from("avisos").upsert(
        destinatarios.map((user_id) => ({
          user_id,
          evento_id: ev.id,
          tipo: "lembrete",
          titulo: "Lembrete: " + ev.nome,
          corpo,
          // disparar_em na chave: evento adiado → lembrete re-armado avisa de
          // novo; re-publicar SEM mudar nada continua deduplicado
          chave_dedupe: `lembrete:${ev.id}:${lem.antecedencia_min}:${lem.disparar_em}`,
        })),
        { onConflict: "user_id,chave_dedupe", ignoreDuplicates: true },
      );
      if (e2) console.error("processar-lembretes upsert:", e2);
    }

    const envio = (vencidos?.length) ? await enviarPendentes(sb) : { enviados: 0, aparelhos: 0 };
    return respostaJson({ lembretes: vencidos?.length ?? 0, ...envio });
  } catch (err) {
    console.error("processar-lembretes:", err);
    return respostaJson({ erro: String(err) }, 500);
  }
});
