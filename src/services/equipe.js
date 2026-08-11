// services/equipe.js — I/O fino do módulo Equipe contra o Supabase.
// Padrão do sync.js: sem estado, sem React; quem orquestra é o EquipeContext.
// Regras puras (código de convite, mensagens) moram em avisosCalc.js.
import { getSupabase } from "../config/supabase.js";
import { gerarCodigoConvite, normalizarCodigoConvite, disparoDoLembrete } from "./avisosCalc.js";

async function sb() {
  const client = await getSupabase();
  if (!client) throw new Error("sem_sessao");
  return client;
}

function lanca(error) {
  if (error) throw new Error(error.message || String(error));
}

// ── perfil pessoal (fase 6) ────────────────────────────────────────────────
// UM nome por conta (tabela profiles): pré-preenche o "entrar na equipe" e
// alimenta o que os colegas veem. O apelido por equipe continua possível
// (nome_exibicao é do vínculo).

export async function carregarPerfil(userId) {
  const client = await sb();
  const { data, error } = await client.from("profiles")
    .select("nome").eq("id", userId).maybeSingle();
  lanca(error);
  return data?.nome || "";
}

export async function salvarPerfil(userId, nome) {
  const client = await sb();
  const { error } = await client.from("profiles")
    .upsert({ id: userId, nome: nome.trim() });
  lanca(error);
}

// O próprio membro corrige como aparece pra equipe (policy própria no banco)
export async function atualizarMeuNome(equipeId, userId, nome) {
  const client = await sb();
  const { error } = await client.from("equipe_membros")
    .update({ nome_exibicao: nome.trim() })
    .eq("equipe_id", equipeId).eq("user_id", userId);
  lanca(error);
}

// Carrega todos os vínculos do usuário logado numa tacada:
// equipes que gerencio (com código) e equipes em que sou membro, com a lista
// de membros e o catálogo de habilidades. RLS decide o que cada select devolve.
export async function carregarVinculos(userId) {
  const client = await sb();
  const [eq, mem, conv, hab, mh] = await Promise.all([
    client.from("equipes").select("id, nome, gestor_id"),
    client.from("equipe_membros").select("equipe_id, user_id, nome_exibicao, funcao"),
    client.from("equipe_convites").select("equipe_id, codigo"),
    client.from("habilidades").select("id, equipe_id, nome, ordem"),
    client.from("membro_habilidades").select("equipe_id, user_id, habilidade_id"),
  ]);
  lanca(eq.error); lanca(mem.error); lanca(conv.error); lanca(hab.error); lanca(mh.error);

  const codigoPor = Object.fromEntries((conv.data || []).map((c) => [c.equipe_id, c.codigo]));
  const habPor = {};
  for (const h of hab.data || []) (habPor[h.equipe_id] ||= []).push(h);
  // habilidades de cada membro, indexadas por "equipe:user"
  const habDoMembro = {};
  for (const r of mh.data || []) (habDoMembro[`${r.equipe_id}:${r.user_id}`] ||= []).push(r.habilidade_id);

  const membrosPor = {};
  for (const m of mem.data || []) {
    (membrosPor[m.equipe_id] ||= []).push({
      ...m,
      habilidades: habDoMembro[`${m.equipe_id}:${m.user_id}`] || [],
    });
  }

  return (eq.data || []).map((e) => ({
    id: e.id,
    nome: e.nome,
    souGestor: e.gestor_id === userId,
    codigo: codigoPor[e.id] || null, // só vem pro gestor (RLS)
    habilidades: (habPor[e.id] || []).sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome, "pt-BR")),
    membros: (membrosPor[e.id] || []).sort((a, b) => a.nome_exibicao.localeCompare(b.nome_exibicao, "pt-BR")),
  }));
}

// ── mão de obra: catálogo da equipe e o que cada um faz (fase 7) ───────────

// Liga/desliga uma habilidade do membro (só o gestor, por RLS).
export async function marcarHabilidade(equipeId, userId, habilidadeId, ligar) {
  const client = await sb();
  const { error } = ligar
    ? await client.from("membro_habilidades")
        .upsert({ equipe_id: equipeId, user_id: userId, habilidade_id: habilidadeId })
    : await client.from("membro_habilidades").delete()
        .eq("equipe_id", equipeId).eq("user_id", userId).eq("habilidade_id", habilidadeId);
  lanca(error);
}

export async function adicionarHabilidade(equipeId, nome, ordem) {
  const client = await sb();
  const { data, error } = await client.from("habilidades")
    .insert({ equipe_id: equipeId, nome: nome.trim(), ordem })
    .select("id, equipe_id, nome, ordem").single();
  lanca(error);
  return data;
}

// Apaga do catálogo — o vínculo com os membros cai em cascata.
export async function excluirHabilidade(habilidadeId) {
  const client = await sb();
  const { error } = await client.from("habilidades").delete().eq("id", habilidadeId);
  lanca(error);
}

// Função do membro na equipe (texto livre: "Técnico de LED", "Operador"…).
// Via RPC: a policy de UPDATE da tabela é do próprio membro — o gestor mexe
// só na coluna `funcao`, e o nome de exibição segue sendo de quem entrou.
export async function definirFuncao(equipeId, userId, funcao) {
  const client = await sb();
  const { error } = await client.rpc("definir_funcao", {
    p_equipe: equipeId, p_user: userId, p_funcao: funcao,
  });
  lanca(error);
}

// Cria a equipe + código de convite. Colisão de código (unique) é rara
// (31^6 combinações) — tenta de novo com outro código até 3×.
// gestor_id vai explícito: a coluna é not-null e o RLS confere = auth.uid().
export async function criarEquipe(nome, gestorId) {
  const client = await sb();
  const { data, error } = await client.from("equipes")
    .insert({ nome, gestor_id: gestorId }).select("id, nome").single();
  lanca(error);
  let ultimoErro = null;
  for (let i = 0; i < 3; i++) {
    const codigo = gerarCodigoConvite();
    const { error: e2 } = await client.from("equipe_convites").insert({ equipe_id: data.id, codigo });
    if (!e2) return { ...data, codigo };
    ultimoErro = e2;
    if (!String(e2.message).includes("duplicate")) break;
  }
  lanca(ultimoErro);
}

export async function entrarNaEquipe(codigo, nome) {
  const client = await sb();
  const { data, error } = await client.rpc("entrar_na_equipe", {
    p_codigo: normalizarCodigoConvite(codigo),
    p_nome: nome,
  });
  lanca(error);
  return data; // { id, nome }
}

export async function sairDaEquipe(equipeId, userId) {
  const client = await sb();
  const { error } = await client.from("equipe_membros").delete()
    .eq("equipe_id", equipeId).eq("user_id", userId);
  lanca(error);
}

export async function removerMembro(equipeId, userId) {
  return sairDaEquipe(equipeId, userId); // mesma operação; RLS autoriza o gestor
}

export async function regerarCodigo(equipeId) {
  const client = await sb();
  let ultimoErro = null;
  for (let i = 0; i < 3; i++) {
    const codigo = gerarCodigoConvite();
    const { error } = await client.from("equipe_convites")
      .update({ codigo, gerado_em: new Date().toISOString() }).eq("equipe_id", equipeId);
    if (!error) return codigo;
    ultimoErro = error;
    if (!String(error.message).includes("duplicate")) break;
  }
  lanca(ultimoErro);
}

export async function excluirEquipe(equipeId) {
  const client = await sb();
  const { error } = await client.from("equipes").delete().eq("id", equipeId);
  lanca(error); // cascade limpa convite + membros
}

// ── eventos publicados & escala (fase 2) ───────────────────────────────────

// Publica (ou atualiza) o Project na agenda da equipe e acerta a escala.
// Sobe SÓ o mínimo — nada financeiro/técnico (LGPD/minimização).
// opts: { horaChamada: "HH:MM"|null, antecedenciaMin: number|null } —
// null em antecedenciaMin = lembrete desligado.
export async function publicarEvento(equipeId, project, escaladosIds, opts = {}) {
  const client = await sb();
  const { data: ev, error } = await client.from("eventos_publicados").upsert({
    equipe_id: equipeId,
    project_id: project.id,
    nome: project.name || "Sem nome",
    cliente: project.cliente || "",
    local: project.local || "",
    data_inicio: project.dataInicio,
    data_fim: project.dataFim || null,
    hora_chamada: opts.horaChamada || null,
    obs: project.obs || "",
    cancelado: !!project.cancelled,
    atualizado_em: new Date().toISOString(),
  }, { onConflict: "equipe_id,project_id" }).select("id").single();
  lanca(error);

  // lembrete: zera os pendentes e re-arma o escolhido (upsert cobre o caso de
  // já existir um ENVIADO com a mesma antecedência — re-arma por cima)
  const { error: eLem } = await client.from("lembretes").delete()
    .eq("evento_id", ev.id).is("enviado_em", null);
  lanca(eLem);
  if (opts.antecedenciaMin != null) {
    const disparo = disparoDoLembrete(project.dataInicio, opts.horaChamada, opts.antecedenciaMin);
    if (disparo && Date.parse(disparo) > Date.now()) {
      const { error: eLem2 } = await client.from("lembretes").upsert({
        evento_id: ev.id,
        antecedencia_min: opts.antecedenciaMin,
        disparar_em: disparo,
        enviado_em: null,
      }, { onConflict: "evento_id,antecedencia_min" });
      lanca(eLem2);
    }
  }

  // diff da escala: insere quem entrou, remove quem saiu (triggers avisam)
  const { data: atuais, error: e2 } = await client.from("escalas")
    .select("user_id").eq("evento_id", ev.id);
  lanca(e2);
  const antes = new Set((atuais || []).map((r) => r.user_id));
  const depois = new Set(escaladosIds || []);
  const entra = [...depois].filter((u) => !antes.has(u));
  const saem = [...antes].filter((u) => !depois.has(u));
  if (entra.length) {
    const { error: e3 } = await client.from("escalas")
      .insert(entra.map((user_id) => ({ evento_id: ev.id, user_id })));
    lanca(e3);
  }
  for (const u of saem) {
    const { error: e4 } = await client.from("escalas").delete()
      .eq("evento_id", ev.id).eq("user_id", u);
    lanca(e4);
  }
  return ev.id;
}

// Remove a publicação (o Project local segue intacto).
export async function removerPublicacao(equipeId, projectId) {
  const client = await sb();
  const { error } = await client.from("eventos_publicados").delete()
    .eq("equipe_id", equipeId).eq("project_id", projectId);
  lanca(error);
}

// Publicações + escalas dos MEUS projetos (visão do gestor): o RLS devolve só
// o que eu gerencio ou onde estou escalado; o filtro por equipe vem de fora.
export async function carregarPublicacoes() {
  const client = await sb();
  const [ev, esc, lem] = await Promise.all([
    client.from("eventos_publicados").select("id, equipe_id, project_id, nome, data_inicio, data_fim, hora_chamada, cancelado, atualizado_em, cliente, local, obs"),
    client.from("escalas").select("evento_id, user_id, funcao"),
    client.from("lembretes").select("evento_id, antecedencia_min, enviado_em"), // RLS: só o gestor recebe
  ]);
  lanca(ev.error); lanca(esc.error); lanca(lem.error);
  const escaladosPor = {};
  for (const r of esc.data || []) (escaladosPor[r.evento_id] ||= []).push(r.user_id);
  const lembretePor = {};
  for (const r of lem.data || []) {
    // pendente ganha do enviado (é o que está configurado "pra frente")
    if (!lembretePor[r.evento_id] || !r.enviado_em) lembretePor[r.evento_id] = r.antecedencia_min;
  }
  return (ev.data || []).map((e) => ({
    ...e,
    escalados: escaladosPor[e.id] || [],
    lembreteAntecedencia: lembretePor[e.id] ?? null,
  }));
}

// Convocação manual: a Edge Function valida o gestor, cria os avisos com
// janela de dedupe (10 min) e dispara o push na sequência.
export async function convocarEquipe(eventoId) {
  const client = await sb();
  const { data, error } = await client.functions.invoke("convocar", {
    body: { evento_id: eventoId },
  });
  lanca(error);
  if (data?.erro) throw new Error(data.erro);
  return data; // { convocados, enviados, aparelhos }
}

// ── central de avisos (fase 2) ─────────────────────────────────────────────

export async function carregarAvisos() {
  const client = await sb();
  const { data, error } = await client.from("avisos")
    .select("id, evento_id, tipo, titulo, corpo, criado_em, lido_em")
    .order("criado_em", { ascending: false }).limit(80);
  lanca(error);
  return data || [];
}

export async function marcarAvisosLidos(ids) {
  if (!ids?.length) return;
  const client = await sb();
  const { error } = await client.from("avisos")
    .update({ lido_em: new Date().toISOString() }).in("id", ids);
  lanca(error);
}
