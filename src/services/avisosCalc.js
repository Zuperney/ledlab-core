// services/avisosCalc.js — motor PURO do módulo Equipe & avisos.
// Regras testáveis sem I/O: código de convite (fase 1); chaves de dedupe,
// textos de aviso e horário de lembrete entram nas fases seguintes.
// Convenção de termos: docs/marca/manual.md §12.1 (bloco "Equipe e avisos").

// Alfabeto sem ambíguos (sem 0/O, 1/I/L): o código viaja por WhatsApp e é
// digitado à mão — cada caractere precisa ser inconfundível.
const ALFABETO_CONVITE = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TAMANHO_CONVITE = 6;
const PREFIXO_CONVITE = "LED-";

// Gera um código de convite "LED-XXXXXX". `rnd` é injetável pra teste.
export function gerarCodigoConvite(rnd = Math.random) {
  let corpo = "";
  for (let i = 0; i < TAMANHO_CONVITE; i++) {
    corpo += ALFABETO_CONVITE[Math.floor(rnd() * ALFABETO_CONVITE.length)];
  }
  return PREFIXO_CONVITE + corpo;
}

// Normaliza o que o técnico digitou: maiúsculas, sem espaços/pontuação,
// prefixo "LED-" opcional na digitação (a gente completa).
export function normalizarCodigoConvite(texto) {
  const limpo = String(texto ?? "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!limpo) return "";
  const corpo = limpo.startsWith("LED") ? limpo.slice(3) : limpo;
  return PREFIXO_CONVITE + corpo;
}

export function codigoConviteValido(texto) {
  const norm = normalizarCodigoConvite(texto);
  if (norm.length !== PREFIXO_CONVITE.length + TAMANHO_CONVITE) return false;
  return [...norm.slice(PREFIXO_CONVITE.length)].every((c) => ALFABETO_CONVITE.includes(c));
}

// ── convite pronto pra WhatsApp (fase 6) ───────────────────────────────────
// O botão Copiar leva a mensagem completa: link do app + passo a passo +
// código. O técnico não deve precisar perguntar "e agora?".

export const APP_URL = "https://zuperney.github.io/ledlab-core/";

export function mensagemConvite(equipeNome, codigo, url = APP_URL) {
  return [
    `Você foi convidado pra equipe *${equipeNome}* no LedLab.`,
    "",
    `1. Abra ${url} no celular e adicione à tela de início;`,
    "2. Conecte seu e-mail (Configurações → Conta & sincronização);",
    `3. Em *Equipe & avisos*, entre com o código: *${codigo}*`,
  ].join("\n");
}

// ── lembrete por horário (fase 4) ──────────────────────────────────────────
// Datas de Project são "YYYY-MM-DD" SEM fuso; o horário de chamada é local.
// America/Sao_Paulo = UTC−3 FIXO (sem horário de verão desde 2019) — a conta
// inteira vive em ms UTC pra virada de dia/mês/ano sair de graça.

const TZ_OFFSET_MIN = 3 * 60; // São Paulo: UTC = local + 3h

// Instante do disparo do lembrete, em ISO UTC (o que o Postgres grava).
// Regra: com hora de chamada → `chamada − antecedência`; sem chamada (ou
// antecedência 0 = "véspera") → VÉSPERA às 18h. Inválido → null.
export function disparoDoLembrete(dataInicio, horaChamada, antecedenciaMin) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataInicio || "");
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];

  const temChamada = /^\d{2}:\d{2}/.test(horaChamada || "");
  const ant = Number(antecedenciaMin) || 0;

  let ms;
  if (temChamada && ant > 0) {
    const [hh, mm] = horaChamada.split(":").map(Number);
    ms = Date.UTC(y, mo - 1, d, hh, mm + TZ_OFFSET_MIN) - ant * 60000;
  } else {
    ms = Date.UTC(y, mo - 1, d - 1, 18, TZ_OFFSET_MIN); // véspera, 18h local
  }
  return new Date(ms).toISOString();
}

// Opções do Select de antecedência (0 = véspera às 18h, a regra sem chamada)
export const ANTECEDENCIAS = [
  { v: 0, l: "Véspera às 18h" },
  { v: 60, l: "1 h antes da chamada" },
  { v: 120, l: "2 h antes da chamada" },
  { v: 360, l: "6 h antes da chamada" },
  { v: 720, l: "12 h antes da chamada" },
  { v: 1440, l: "24 h antes da chamada" },
];

// ── mão de obra (fase 7) ───────────────────────────────────────────────────

// Nome de habilidade como entra no catálogo: sem espaço sobrando, primeira
// letra maiúscula, e nunca vazio. Duplicata é barrada pelo unique do banco,
// mas comparar aqui evita a ida perdida ao servidor.
export function normalizarHabilidade(texto) {
  const limpo = String(texto ?? "").trim().replace(/\s+/g, " ");
  if (!limpo) return "";
  return limpo[0].toUpperCase() + limpo.slice(1);
}

export function habilidadeJaExiste(nome, catalogo) {
  const alvo = normalizarHabilidade(nome).toLowerCase();
  return (catalogo || []).some((h) => h.nome.toLowerCase() === alvo);
}

// Filtra membros por habilidade exigida. `exigidas` vazio = ninguém é
// filtrado (o gestor ainda não escolheu nada). Com N exigidas, o membro
// precisa ter TODAS — quem monta escala procura quem resolve o pacote.
export function filtrarPorHabilidades(membros, exigidas) {
  if (!exigidas?.length) return membros || [];
  return (membros || []).filter((m) =>
    exigidas.every((id) => (m.habilidades || []).includes(id)));
}

// Mensagens de erro do RPC entrar_na_equipe → texto de UI (toast "info").
// O banco lança exceções com códigos estáveis; a tradução mora aqui pra ser
// testável e pra UI não ter string solta.
export function mensagemErroEquipe(err) {
  const raw = String(err?.message || err || "");
  if (raw.includes("codigo_invalido")) return "Código não encontrado — confira com quem te convidou.";
  if (raw.includes("nome_obrigatorio")) return "Digite seu nome antes de entrar.";
  if (raw.includes("sem_sessao")) return "Conecte-se primeiro (Conta & sincronização).";
  if (raw.includes("so_gestor")) return "Só o gestor da equipe pode fazer isso.";
  if (raw.includes("duplicate") || raw.includes("23505")) return "Essa habilidade já existe no catálogo.";
  return "Falha ao falar com o servidor — tente de novo.";
}
