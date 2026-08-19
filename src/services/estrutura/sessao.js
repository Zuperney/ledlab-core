// services/estrutura/sessao.js — o desfazer que sobrevive à troca de aba.
//
// Espeque: docs/estrutura3d-spec.md §8.6, item B3.
//
// O BURACO QUE ISTO TAPA: a montagem é gravada no projeto e volta inteira, mas o
// histórico era estado do componente — e o componente desmonta quando o técnico
// vai ver o Caderno e volta. Ele voltava sem poder desfazer nada, sem nunca ter
// pedido isso.
//
// ⚠️ É MEMÓRIA DE SESSÃO, NÃO PERSISTÊNCIA. Nada aqui vai pro IndexedDB nem pro
// sync: recarregou a página, o desfazer começa do zero — e está certo que
// comece. Histórico de comando é sobre o que ACABOU de acontecer; ressuscitar
// ontem o "desfazer" de anteontem é oferecer um botão que ninguém sabe onde vai
// parar.

import { paraJSON } from "./serializar.js";

// poucos projetos abertos por vez; o teto existe pra memória não crescer sozinha
// numa sessão longa de galpão
const LIMITE_PROJETOS = 4;
const guardados = new Map();

/** a impressão digital de uma montagem — é o que denuncia cache velho */
const assinar = (montagem) => JSON.stringify(paraJSON(montagem));

export function guardarHistorico(projectId, historico) {
  if (!projectId || !historico) return;
  guardados.delete(projectId); // reinsere no fim: o Map guarda ordem de inserção
  guardados.set(projectId, { historico, assinatura: assinar(historico.montagem) });
  while (guardados.size > LIMITE_PROJETOS) {
    guardados.delete(guardados.keys().next().value);
  }
}

/**
 * O histórico guardado, SE ele ainda combina com o projeto.
 *
 * A conferência não é paranoia: o projeto pode ter mudado por fora (o sync
 * trouxe outra versão de outro aparelho). Um histórico cujo "desfazer" volta pra
 * um estado que nunca existiu é pior que não ter histórico — ele apaga trabalho
 * alheio e chama isso de desfazer.
 */
export function retomarHistorico(projectId, montagemAtual) {
  const g = guardados.get(projectId);
  if (!g) return null;
  if (g.assinatura !== assinar(montagemAtual)) {
    guardados.delete(projectId);
    return null;
  }
  return g.historico;
}

export function esquecerHistorico(projectId) {
  guardados.delete(projectId);
}

/** só pro teste — a sessão não tem por que ser inspecionada em produção */
export const _tamanho = () => guardados.size;
