// data/seedActivityTypes.js — tipos de atividade iniciais do módulo Diárias.
// Os tipos são genéricos; os valores começam em 0 — cada usuário define o próprio
// cachê em Configurações (nada de tabela de preços embutida).
export const SEED_ACTIVITY_TYPES = [
  { id: "montagem",     nome: "Montagem",          cor: "#7c3aed", valorBase: 0, geraHoraExtra: true,  podeSegundoCache: true,  ativo: true },
  { id: "operacao",     nome: "Operação",          cor: "#2563eb", valorBase: 0, geraHoraExtra: true,  podeSegundoCache: true,  ativo: true },
  { id: "desmontagem",  nome: "Desmontagem",       cor: "#059669", valorBase: 0, geraHoraExtra: true,  podeSegundoCache: true,  ativo: true },
  { id: "viagem-trab",  nome: "Trabalho em viagem", cor: "#d97706", valorBase: 0, geraHoraExtra: true,  podeSegundoCache: true,  ativo: true },
  { id: "diaria-viagem", nome: "Diária de viagem",  cor: "#db2777", valorBase: 0, geraHoraExtra: false, podeSegundoCache: true,  ativo: true },
  { id: "deslocamento", nome: "Deslocamento",      cor: "#6b7280", valorBase: 0, geraHoraExtra: false, podeSegundoCache: false, ativo: true },
];
