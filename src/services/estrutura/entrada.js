// services/estrutura/entrada.js — por qual FACE a peça nova entra na junta.
//
// Espeque: docs/estrutura3d-spec.md §8.6, item C1.
//
// O CONSERTO DO CUBO. O dono relatou: "coloquei o cubo e a parte sem face ficou
// virada pra cima, e nela não é permitido colocar mais uma peça". Ele achou que
// era o giro que estava quebrado. Não era — está medido no §8.5: **nenhum dos 4
// giros libera uma face pra cima**, e isso é geometria, não bug. O giro acontece
// em torno do EIXO DO ENCAIXE, que ali é vertical, e a face fechada está EM CIMA
// desse eixo: ela roda em torno de si mesma e nunca sai do topo.
//
// O que resolve é escolher por onde a peça ENTRA. Entrando por qualquer face
// lateral, sobra face livre pra cima — e a torre continua.
//
// ⚠️ Nada aqui pode tocar em `three` (mesma regra do resto do motor).

import { conectorPorId } from "./catalogo.js";
import { conectorNoMundo, resolverEncaixe } from "./encaixe.js";
import { escalar, unitario } from "./vetor.js";

export const PARA_CIMA = [0, 1, 0];

// quão alinhada uma face precisa estar pra contar como "apontando pra lá".
// 0,9 ≈ 26° de tolerância: generoso o bastante pra peça em diagonal, apertado o
// bastante pra não chamar de "pra cima" uma face que aponta pro lado.
const ALINHADA = 0.9;

/** as faces por onde esta peça pode entrar numa junta */
export const entradasDe = (cat) => cat?.conectores ?? [];

/**
 * Escolher a entrada só faz diferença quando a peça tem mais de duas faces.
 * Barra entra pela ponta "a" ou pela "b" e dá no mesmo (ela é simétrica); o cubo
 * tem cinco, e aí a escolha é o que decide onde a face cega vai parar.
 */
export const escolhaImporta = (cat) => entradasDe(cat).length > 2;

/**
 * As faces que SOBRAM livres, já no mundo, se a peça entrar por `conNovoId`.
 * É o que responde "depois de encaixar isso aqui, dá pra continuar?".
 */
export function facesLivresApos(conAlvo, cat, conNovoId, giro = 0) {
  const entrada = conectorPorId(cat, conNovoId);
  if (!conAlvo || !entrada) return [];
  const { matriz } = resolverEncaixe(conAlvo, entrada, giro);
  return cat.conectores
    .filter((c) => c.id !== conNovoId)
    .map((c) => conectorNoMundo(c, matriz));
}

/** essa entrada deixa alguma face livre apontando pra `direcao`? */
export function sobraFacePara(conAlvo, cat, conNovoId, giro = 0, direcao = PARA_CIMA) {
  const d = unitario(direcao);
  return facesLivresApos(conAlvo, cat, conNovoId, giro)
    .some((f) => escalar(unitario(f.dir), d) > ALINHADA);
}

/**
 * A entrada que o app escolhe sozinho: a primeira (na ordem do catálogo) que
 * deixa face livre apontando pra cima.
 *
 * Por que "pra cima" e não outra regra: estrutura cresce pra cima. Uma peça que
 * entra fechando o topo é um beco sem saída, e o técnico só descobre isso depois
 * de já ter encaixado. Quando nenhuma entrada libera o topo (encaixe lateral,
 * por exemplo), volta a primeira do catálogo — que é o comportamento de sempre.
 */
export function melhorEntrada(conAlvo, cat, giro = 0, direcao = PARA_CIMA) {
  const opcoes = entradasDe(cat);
  if (!opcoes.length) return null;
  const boa = opcoes.find((c) => sobraFacePara(conAlvo, cat, c.id, giro, direcao));
  return (boa ?? opcoes[0]).id;
}

// Rótulos de tela. Os ids dos conectores são internos ("topo", "norte", "a");
// o técnico não pensa em pontos cardeais dentro de um cubo que gira — ele pensa
// em "a face de cima" e "os lados".
const ROTULOS = { topo: "Face de cima", a: "Ponta A", b: "Ponta B" };
export function rotuloDaEntrada(cat, conectorId) {
  if (ROTULOS[conectorId]) return ROTULOS[conectorId];
  const lados = entradasDe(cat).filter((c) => !ROTULOS[c.id]);
  const i = lados.findIndex((c) => c.id === conectorId);
  return i < 0 ? conectorId : `Lado ${i + 1}`;
}
