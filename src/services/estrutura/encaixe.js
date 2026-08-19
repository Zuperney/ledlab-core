// services/estrutura/encaixe.js — a matemática de encaixar uma peça na outra.
//
// Espeque: docs/estrutura3d-spec.md §6.
//
// São três operações, e é só isso:
//   1. DIREÇÃO — girar a peça nova até a normal dela ENFRENTAR a do alvo
//      (dirNovo = −dirAlvo);
//   2. ROLAGEM — girar em torno do eixo do encaixe até os `rolo` casarem, mais o
//      giro discreto de 90° que o técnico escolhe;
//   3. POSIÇÃO — transladar até os dois centros coincidirem.
//
// A junta brasileira é PARAFUSADA: duas faces chatas se encontrando. Não existe
// macho/fêmea (o spigot cônico europeu tem; o nosso não), então não há campo de
// gênero — qualquer conector encaixa em qualquer conector do mesmo sistema.

import {
  arredMatriz, escalar, matDirecao, matPonto, matriz, oposto, qAplicar,
  qDoEixo, qEntreVetores, qMultiplicar, sub, unitario, vetorial, EPS,
} from "./vetor.js";
import { ANGULO_DE_GIRO, PASSOS_DE_GIRO } from "./catalogo.js";

// normaliza o passo de giro pra 0..3. Guardamos SEMPRE o índice inteiro, nunca o
// ângulo: girar 50 vezes com float acumula erro e o JSON deixa de ser exato.
// o `+ PASSOS` antes do segundo módulo não é decoração: em JS `-4 % 4` é −0, e
// um −0 vazando pro JSON do projeto faz o sync enxergar mudança onde não houve.
export const normalizarGiro = (k) =>
  (((Math.round(Number(k) || 0) % PASSOS_DE_GIRO) + PASSOS_DE_GIRO) % PASSOS_DE_GIRO);

// projeta `rolo` no plano perpendicular a `dir` — defensivo: um catálogo editado
// à mão pode trazer um rolo levemente fora do plano, e aí o ângulo sai torto.
function roloOrtogonal(rolo, dir) {
  const d = unitario(dir);
  const k = escalar(rolo, d);
  return unitario([rolo[0] - d[0] * k, rolo[1] - d[1] * k, rolo[2] - d[2] * k]);
}

// leva um conector do espaço LOCAL da peça pro espaço do mundo
export function conectorNoMundo(conector, matrizPeca) {
  return {
    ...conector,
    pos: matPonto(matrizPeca, conector.pos),
    dir: unitario(matDirecao(matrizPeca, conector.dir)),
    rolo: unitario(matDirecao(matrizPeca, conector.rolo)),
  };
}

// ângulo assinado de `de` até `para`, medido em torno de `eixo`
function anguloEmTorno(de, para, eixo) {
  const e = unitario(eixo);
  const a = roloOrtogonal(de, e);
  const b = roloOrtogonal(para, e);
  return Math.atan2(escalar(vetorial(a, b), e), escalar(a, b));
}

/**
 * Resolve a matriz de mundo da peça NOVA pra que o conector `novo` (em espaço
 * local dela) encaixe no conector `alvo` (já em espaço de mundo).
 *
 * @param {{pos:number[],dir:number[],rolo:number[]}} alvo    conector de destino, no MUNDO
 * @param {{pos:number[],dir:number[],rolo:number[]}} novo    conector da peça nova, LOCAL
 * @param {number} giro  passo discreto de 90° escolhido pelo técnico (0..3)
 * @returns {{ matriz:number[], quaternio:number[], posicao:number[] }}
 */
export function resolverEncaixe(alvo, novo, giro = 0) {
  const dirAlvo = unitario(alvo.dir);
  const dirNovo = unitario(novo.dir);

  // 1 · enfrentar as normais
  const q1 = qEntreVetores(oposto(dirNovo), dirAlvo);

  // 2 · casar o rolo, e só então aplicar o giro do técnico.
  // ⚠️ Este passo NÃO é opcional. Quando as direções são exatamente opostas, o
  // `qEntreVetores` cai num caso degenerado e escolhe um eixo perpendicular
  // arbitrário — o rolo resultante ficaria imprevisível. É aqui que a gente
  // crava a rolagem e neutraliza aquela escolha.
  const roloGirado = qAplicar(q1, novo.rolo);
  const ang = anguloEmTorno(roloGirado, alvo.rolo, dirAlvo);
  const q2 = qDoEixo(dirAlvo, ang + normalizarGiro(giro) * ANGULO_DE_GIRO);

  const q = qMultiplicar(q2, q1);

  // 3 · juntar os centros
  const posicao = sub(alvo.pos, qAplicar(q, novo.pos));

  return { matriz: arredMatriz(matriz(q, posicao)), quaternio: q, posicao };
}

// A prévia "quase encaixada": a mesma pose, recuada ao longo da normal do alvo.
// Serve pro fantasma que o técnico vê antes de soltar.
export function encaixeRecuado(alvo, novo, giro = 0, recuoMm = 60) {
  const r = resolverEncaixe(alvo, novo, giro);
  const d = unitario(alvo.dir);
  const pos = [
    r.posicao[0] + d[0] * recuoMm,
    r.posicao[1] + d[1] * recuoMm,
    r.posicao[2] + d[2] * recuoMm,
  ];
  return { ...r, posicao: pos, matriz: arredMatriz(matriz(r.quaternio, pos)) };
}

/**
 * Dois conectores de MUNDO podem se encaixar?
 * Duas condições, e as duas importam:
 *  - mesmo sistema (P30 não entra em P50 sem adaptador);
 *  - as normais precisam se ENFRENTAR — conector paralelo não encaixa.
 */
export function podeEncaixar(a, b, { sistemaA, sistemaB, tolerancia = -0.5 } = {}) {
  if (sistemaA != null && sistemaB != null && sistemaA !== sistemaB) return false;
  const d = escalar(unitario(a.dir), unitario(b.dir));
  return d <= tolerancia;
}

// distância entre dois conectores de mundo (mm) — usada pelo snap
export function afastamento(a, b) {
  const d = sub(a.pos, b.pos);
  return Math.hypot(d[0], d[1], d[2]);
}

// quão bem duas normais se enfrentam: 1 = perfeitamente opostas, 0 = perpendiculares
export function enfrentamento(a, b) {
  const d = -escalar(unitario(a.dir), unitario(b.dir));
  return d < EPS ? 0 : d;
}
