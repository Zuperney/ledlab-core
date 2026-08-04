// services/equipe.js — I/O fino do módulo Equipe contra o Supabase.
// Padrão do sync.js: sem estado, sem React; quem orquestra é o EquipeContext.
// Regras puras (código de convite, mensagens) moram em avisosCalc.js.
import { getSupabase } from "../config/supabase.js";
import { gerarCodigoConvite, normalizarCodigoConvite } from "./avisosCalc.js";

async function sb() {
  const client = await getSupabase();
  if (!client) throw new Error("sem_sessao");
  return client;
}

function lanca(error) {
  if (error) throw new Error(error.message || String(error));
}

// Carrega todos os vínculos do usuário logado numa tacada:
// equipes que gerencio (com código) e equipes em que sou membro, com a lista
// de membros de cada uma. RLS decide o que cada select devolve.
export async function carregarVinculos(userId) {
  const client = await sb();
  const [eq, mem, conv] = await Promise.all([
    client.from("equipes").select("id, nome, gestor_id"),
    client.from("equipe_membros").select("equipe_id, user_id, nome_exibicao, funcao"),
    client.from("equipe_convites").select("equipe_id, codigo"),
  ]);
  lanca(eq.error); lanca(mem.error); lanca(conv.error);

  const codigoPor = Object.fromEntries((conv.data || []).map((c) => [c.equipe_id, c.codigo]));
  const membrosPor = {};
  for (const m of mem.data || []) (membrosPor[m.equipe_id] ||= []).push(m);

  return (eq.data || []).map((e) => ({
    id: e.id,
    nome: e.nome,
    souGestor: e.gestor_id === userId,
    codigo: codigoPor[e.id] || null, // só vem pro gestor (RLS)
    membros: (membrosPor[e.id] || []).sort((a, b) => a.nome_exibicao.localeCompare(b.nome_exibicao, "pt-BR")),
  }));
}

// Cria a equipe + código de convite. Colisão de código (unique) é rara
// (31^6 combinações) — tenta de novo com outro código até 3×.
export async function criarEquipe(nome) {
  const client = await sb();
  const { data, error } = await client.from("equipes").insert({ nome }).select("id, nome").single();
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
