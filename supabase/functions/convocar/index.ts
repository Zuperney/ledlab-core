// convocar — disparo MANUAL do gestor: "Convocar equipe" no app.
// Valida que quem chama é o gestor do evento, cria um aviso 'convocacao' pra
// cada escalado (dedupe com janela de 10 min — duplo-clique não duplica, mas
// reconvocar mais tarde funciona) e drena a fila de push na sequência.
import { createClient } from "npm:@supabase/supabase-js@2";
import { serviceClient, enviarPendentes, respostaJson, CORS } from "../_shared/push.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS }); // preflight
  try {
    const { evento_id } = await req.json().catch(() => ({}));
    if (!evento_id) return respostaJson({ erro: "evento_id obrigatório" }, 400);

    // quem chama (JWT do app) — verify_jwt já barrou token inválido
    const authed = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } } },
    );
    const { data: userData } = await authed.auth.getUser();
    const uid = userData?.user?.id;
    if (!uid) return respostaJson({ erro: "sem_sessao" }, 401);

    const sb = serviceClient();
    const { data: ev } = await sb.from("eventos_publicados")
      .select("id, nome, local, data_inicio, data_fim, equipe_id, cancelado")
      .eq("id", evento_id).single();
    if (!ev) return respostaJson({ erro: "evento não encontrado" }, 404);

    const { data: eq } = await sb.from("equipes").select("gestor_id").eq("id", ev.equipe_id).single();
    if (eq?.gestor_id !== uid) return respostaJson({ erro: "só o gestor convoca" }, 403);
    if (ev.cancelado) return respostaJson({ erro: "evento cancelado" }, 400);

    const { data: escala } = await sb.from("escalas").select("user_id").eq("evento_id", ev.id);
    const destinatarios = (escala ?? []).map((r) => r.user_id).filter((u) => u !== uid);
    if (!destinatarios.length) return respostaJson({ convocados: 0 });

    const fmt = (d: string | null) => (d ? d.slice(8, 10) + "/" + d.slice(5, 7) : "");
    const corpo = [fmt(ev.data_inicio) + (ev.data_fim && ev.data_fim !== ev.data_inicio ? "–" + fmt(ev.data_fim) : ""), ev.local]
      .filter(Boolean).join(" · ");
    const janela = Math.floor(Date.now() / 600_000); // 10 min

    const { error } = await sb.from("avisos").upsert(
      destinatarios.map((user_id) => ({
        user_id,
        evento_id: ev.id,
        tipo: "convocacao",
        titulo: "Convocação: " + ev.nome,
        corpo,
        chave_dedupe: `convocacao:${ev.id}:${janela}`,
      })),
      { onConflict: "user_id,chave_dedupe", ignoreDuplicates: true },
    );
    if (error) throw error;

    const envio = await enviarPendentes(sb);
    return respostaJson({ convocados: destinatarios.length, ...envio });
  } catch (err) {
    console.error("convocar:", err);
    return respostaJson({ erro: String(err) }, 500);
  }
});
