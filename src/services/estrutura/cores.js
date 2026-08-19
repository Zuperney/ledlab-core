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

// Tons médios de propósito: precisam ler no FUNDO ESCURO da cena e no BRANCO do
// papel, porque a imagem capturada vai impressa. Pastel some no papel; neon
// vibra na tela.
export const CORES_PADRAO = Object.freeze({
  "p30-b0200": "#64748b", // 0,2 m
  "p30-b0300": "#0ea5e9", // 0,3 m
  "p30-b0500": "#14b8a6", // 0,5 m
  "p30-b0600": "#22c55e", // 0,6 m
  "p30-b1000": "#a3a30d", // 1 m
  "p30-b2000": "#f97316", // 2 m
  "p30-b3000": "#dc2626", // 3 m
  "p30-b4000": "#9333ea", // 4 m
  "p30-cubo5": "#db2777", // o cubo
  "p30-sapata-baixa": "#78716c", // a sapata
});

// peça nova no catálogo, sem cor atribuída: melhor um cinza honesto do que uma
// cor sorteada que colide com a de outra peça
export const COR_SEM_ATRIBUICAO = "#94a3b8";

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
