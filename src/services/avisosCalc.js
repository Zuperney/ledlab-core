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

// Mensagens de erro do RPC entrar_na_equipe → texto de UI (toast "info").
// O banco lança exceções com códigos estáveis; a tradução mora aqui pra ser
// testável e pra UI não ter string solta.
export function mensagemErroEquipe(err) {
  const raw = String(err?.message || err || "");
  if (raw.includes("codigo_invalido")) return "Código não encontrado — confira com quem te convidou.";
  if (raw.includes("nome_obrigatorio")) return "Digite seu nome antes de entrar.";
  if (raw.includes("sem_sessao")) return "Conecte-se primeiro (Conta & sincronização).";
  return "Falha ao falar com o servidor — tente de novo.";
}
