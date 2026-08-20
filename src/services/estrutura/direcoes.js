// services/estrutura/direcoes.js — as seis direções do piso.
//
// Espeque: docs/estrutura3d-spec.md §8.11, regra D1.
//
// ⚠️ NÃO CONFUNDIR COM OS NOMES DOS CONECTORES. O catálogo chama os conectores do
// cubo de `topo/norte/sul/leste/oeste`, mas aqueles são **locais**: viajam com a
// peça quando ela gira. Estes aqui são do **mundo** e ficam parados, ancorados na
// grade. É a distinção que torna a regra dizível:
//
//   "a face cega está no OESTE"   → verdade absoluta, dá pra apontar o dedo
//   "a face cega é a `oeste`"     → deixa de significar nada no primeiro giro
//
// É este vocabulário que sai na tela, na ajuda e nos avisos.
//
// ⚠️ ABRE NO CELULAR (o Caderno usa). Nada de `three` aqui.

import { escalar, unitario } from "./vetor.js";

export const DIRECOES = Object.freeze([
  Object.freeze({ id: "N", nome: "Norte", vetor: Object.freeze([0, 0, -1]), horizontal: true }),
  Object.freeze({ id: "L", nome: "Leste", vetor: Object.freeze([1, 0, 0]), horizontal: true }),
  Object.freeze({ id: "S", nome: "Sul", vetor: Object.freeze([0, 0, 1]), horizontal: true }),
  Object.freeze({ id: "O", nome: "Oeste", vetor: Object.freeze([-1, 0, 0]), horizontal: true }),
  Object.freeze({ id: "CIMA", nome: "Cima", vetor: Object.freeze([0, 1, 0]), horizontal: false }),
  Object.freeze({ id: "BAIXO", nome: "Baixo", vetor: Object.freeze([0, -1, 0]), horizontal: false }),
]);

// A ORDEM DO CICLO é a da bússola, não a do produto vetorial: quem gira a peça
// está lendo o desenho, não a matemática.
export const HORIZONTAIS = Object.freeze(["N", "L", "S", "O"]);
export const VERTICAIS = Object.freeze(["CIMA", "BAIXO"]);

export const OPOSTA = Object.freeze({
  N: "S", S: "N", L: "O", O: "L", CIMA: "BAIXO", BAIXO: "CIMA",
});

const PORID = new Map(DIRECOES.map((d) => [d.id, d]));

export const vetorDe = (id) => PORID.get(id)?.vetor ?? null;
export const nomeDe = (id) => PORID.get(id)?.nome ?? null;
export const ehHorizontal = (id) => PORID.get(id)?.horizontal ?? false;

// quão alinhado um vetor precisa estar pra CONTAR como uma direção: 0,9 ≈ 26°.
// Peça em diagonal (que o catálogo ainda não tem) não vira "quase norte" —
// devolve null, e quem chamou decide o que fazer com isso.
const ALINHADA = 0.9;

/** a direção do piso pra onde um vetor de mundo aponta, ou `null` */
export function direcaoDe(vetor) {
  if (!Array.isArray(vetor)) return null;
  const v = unitario(vetor);
  let melhor = null;
  let maior = ALINHADA;
  for (const d of DIRECOES) {
    const alinhamento = escalar(v, d.vetor);
    if (alinhamento > maior) {
      maior = alinhamento;
      melhor = d.id;
    }
  }
  return melhor;
}

/** "N, L e BAIXO" — pra frase de aviso não sair com vírgula sobrando */
export function listaDeNomes(ids = []) {
  const nomes = [...ids].map((id) => nomeDe(id) ?? id);
  if (nomes.length <= 1) return nomes[0] ?? "";
  return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}
