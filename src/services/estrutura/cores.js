// services/estrutura/cores.js — uma cor por peça do catálogo, e a legenda.
//
// Espeque: docs/estrutura3d-spec.md §8.6, itens D1 e D2.
//
// POR QUE A COR MORA NAS PREFERÊNCIAS GLOBAIS, E NÃO NO PROJETO: o catálogo é o
// GALPÃO. A barra de 2 m é a mesma barra em todo projeto, então a cor dela também
// tem que ser. Se a cor fosse por projeto, o técnico aprenderia "laranja é 2 m"
// num caderno e "laranja é 3 m" no seguinte — que é pior do que não ter cor.
// Mesmo precedente da paleta dos cabos (`prefs.cablePalette`).
//
// A PALETA PADRÃO SEGUE O COMPRIMENTO, não o gosto: barra curta é fria, barra
// longa é quente. Quem bate o olho na legenda já leu a escala antes de ler o
// texto — e no galpão a separação por tamanho é exatamente o trabalho.
//
// ⚠️ ABRE NO CELULAR (a legenda sai no Caderno). Nada de `three` aqui.

import { CATALOGO, pecaPorId } from "./catalogo.js";
import { listaDePecas } from "./metricas.js";

// A RAMPA das barras, do curto ao longo: frio → quente. Tons médios de
// propósito — precisam ler no FUNDO ESCURO da cena e no BRANCO do papel, porque
// a imagem capturada vai impressa. Pastel some no papel; neon vibra na tela.
const RAMPA_BARRAS = [
  "#64748b", "#0ea5e9", "#14b8a6", "#22c55e",
  "#a3a30d", "#f97316", "#dc2626", "#9333ea",
];
const POR_TIPO = { cubo: "#db2777", sapata: "#78716c" };

// peça nova no catálogo, sem cor atribuída: melhor um cinza honesto do que uma
// cor sorteada que colide com a de outra peça
export const COR_SEM_ATRIBUICAO = "#94a3b8";

// A cor é DERIVADA da peça, não escrita ao lado do id. Duas razões: a regra
// "curta fria, longa quente" vira código em vez de coincidência de hexadecimais
// escolhidos à mão, e uma renomeação de id no catálogo leva a cor junto em vez
// de deixar a paleta inteira cinza.
const barrasPorComprimento = () =>
  CATALOGO.filter((p) => p.tipo === "barra")
    .slice()
    .sort((a, b) => (a.comprimentoMm ?? 0) - (b.comprimentoMm ?? 0));

function corPadrao(peca) {
  if (!peca) return COR_SEM_ATRIBUICAO;
  if (POR_TIPO[peca.tipo]) return POR_TIPO[peca.tipo];
  if (peca.tipo !== "barra") return COR_SEM_ATRIBUICAO;
  const i = barrasPorComprimento().findIndex((p) => p.id === peca.id);
  return i < 0 ? COR_SEM_ATRIBUICAO : RAMPA_BARRAS[i % RAMPA_BARRAS.length];
}

export const CORES_PADRAO = Object.freeze(
  Object.fromEntries(CATALOGO.map((p) => [p.id, corPadrao(p)])),
);

export const corDaPeca = (catalogoId, custom = null) =>
  custom?.[catalogoId] || CORES_PADRAO[catalogoId] || COR_SEM_ATRIBUICAO;

/** o mapa inteiro `catalogoId → cor`, já com o que o usuário personalizou */
export function paletaDaEstrutura(custom = null) {
  const out = {};
  for (const p of CATALOGO) out[p.id] = corDaPeca(p.id, custom);
  return out;
}

/** true quando o usuário mexeu na cor de alguma peça */
export const temPersonalizacao = (custom) =>
  !!custom && CATALOGO.some((p) => custom[p.id] && custom[p.id] !== CORES_PADRAO[p.id]);

/**
 * A legenda: só as peças que ESTÃO na montagem, na ordem do catálogo.
 * Legenda com peça que não aparece no desenho é ruído — a mesma régua do mapa
 * de cabos, que só lista as portas que existem.
 */
export function legendaDaEstrutura(montagem, custom = null) {
  return listaDePecas(montagem).map((item) => ({
    catalogoId: item.catalogoId,
    nome: item.nome,
    qtd: item.qtd,
    tipo: pecaPorId(item.catalogoId)?.tipo ?? "?",
    cor: corDaPeca(item.catalogoId, custom),
  }));
}
