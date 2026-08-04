// services/escalaMerge.js — motor PURO: mescla eventos em que fui ESCALADO
// (vindos do Supabase, read-only) com os projetos locais pra Agenda mostrar
// tudo junto. O item escalado imita o shape de Project só no que a Agenda usa
// (name/cliente/local/datas/status) — nunca vira um Project de verdade.

// evento remoto → item de agenda (shape compatível com as views da Agenda)
function eventoParaItem(ev) {
  return {
    id: "esc_" + ev.id,          // prefixo evita colisão com ids locais
    eventoId: ev.id,
    escalado: true,              // a Agenda usa pra badge + LightModal read-only
    equipeNome: ev.equipe_nome || "",
    name: ev.nome,
    cliente: ev.cliente || "",
    local: ev.local || "",
    dataInicio: ev.data_inicio,
    dataFim: ev.data_fim || ev.data_inicio,
    horaChamada: ev.hora_chamada || null,
    obs: ev.obs || "",
    cancelled: !!ev.cancelado,   // recomputeStatus entende "cancelled"
    telas: [],                   // rollup de gabinetes zera (dado não sobe)
  };
}

// `projects` = projetos locais · `eventos` = eventos_publicados onde estou
// escalado. Se o project_id do evento existe localmente, o evento é MEU
// (sou o gestor): o projeto local já aparece na Agenda — não duplica.
export function mesclarEscalados(projects, eventos) {
  const locais = new Set((projects || []).map((p) => p.id));
  const remotos = (eventos || [])
    .filter((ev) => ev && ev.data_inicio && !locais.has(ev.project_id))
    .map(eventoParaItem);
  return [...(projects || []), ...remotos];
}
