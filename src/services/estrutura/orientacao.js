// services/estrutura/orientacao.js — as regras de rotação, em cima das direções
// do piso.
//
// Espeque: docs/estrutura3d-spec.md §8.11 (regras D2 a D7).
//
// POR QUE ESTE MÓDULO EXISTE. A rotação nasceu descrita pelo **eixo da junta** —
// um eixo que muda conforme onde a peça foi encaixada, de modo que a mesma tecla
// fazia coisas diferentes em peças iguais. A régua certa é a do PISO: rotação se
// descreve por onde a coisa aponta, e as direções do piso não se mexem (D1).
//
// As três regras que este arquivo implementa, em uma frase cada:
//   D4 · barra e sapata giram só no PRÓPRIO eixo — nunca mudam de lugar;
//   D5 · cubo gira movendo a FACE CEGA entre direções do piso;
//   D6 · direção que já tem junta é trava: ali existe flange aparafusada.
//
// ⚠️ Nada de `three` aqui: o Caderno abre no celular.

import { caixaLocal, conectorPorId, pecaPorId, ANGULO_DE_GIRO } from "./catalogo.js";
import { HORIZONTAIS, VERTICAIS, direcaoDe, vetorDe } from "./direcoes.js";
import { conectorNoMundo } from "./encaixe.js";
import { facesCegasNoMundo } from "./entrada.js";
import { pecaDaMontagem } from "./montagem.js";
import {
  arredMatriz, matDirecao, matPonto, matRodada, qDoEixo, qEntreVetores,
} from "./vetor.js";

const catDa = (peca) => pecaPorId(peca?.catalogoId);

/** o centro da caixa da peça, no mundo — é em cima dele que tudo gira */
function centroNoMundo(peca) {
  const caixa = caixaLocal(catDa(peca));
  if (!caixa || !peca?.matriz) return null;
  return matPonto(peca.matriz, [0, 1, 2].map((k) => (caixa.min[k] + caixa.max[k]) / 2));
}

/** pra onde a face cega da peça aponta (D5). `null` quando ela não tem face cega */
export function faceCegaEm(montagem, id) {
  const peca = pecaDaMontagem(montagem, id);
  const [face] = facesCegasNoMundo(peca ?? {}, catDa(peca));
  return face ? direcaoDe(face.dir) : null;
}

/**
 * As direções do piso que já têm JUNTA nesta peça (D2) — a junta com a mãe e a
 * junta de cada filha. É o que trava a face cega: ali tem flange aparafusada.
 */
export function direcoesOcupadas(montagem, id) {
  const out = new Set();
  const peca = pecaDaMontagem(montagem, id);
  const cat = catDa(peca);
  if (!peca || !cat) return out;

  const direcaoDoConector = (conectorId) => {
    const c = conectorPorId(cat, conectorId);
    return c ? direcaoDe(conectorNoMundo(c, peca.matriz).dir) : null;
  };

  const marcar = (d) => { if (d) out.add(d); };
  if (peca.encaixe?.conNovo) marcar(direcaoDoConector(peca.encaixe.conNovo));
  for (const filha of montagem?.pecas ?? []) {
    if (filha.encaixe?.de === id) marcar(direcaoDoConector(filha.encaixe.conAlvo));
  }
  return out;
}

/** as direções livres, opcionalmente só de um plano (D2) */
export function direcoesLivres(montagem, id, plano = null) {
  const ocupadas = direcoesOcupadas(montagem, id);
  const lista = plano === "vertical" ? VERTICAIS
    : plano === "horizontal" ? HORIZONTAIS
      : [...HORIZONTAIS, ...VERTICAIS];
  return lista.filter((d) => !ocupadas.has(d));
}

/**
 * A próxima direção livre pra onde a face cega pode ir (D5 + D6).
 *
 * `R` anda no plano horizontal, no ciclo da bússola; `Shift+R` vai pro vertical.
 * Direção ocupada é PULADA — e quando não sobra nenhuma, devolve `null`, que é a
 * aba dizendo "não cabe" em vez de fingir que girou.
 */
export function proximaFaceCega(montagem, id, plano = "horizontal", sentido = 1) {
  const atual = faceCegaEm(montagem, id);
  if (!atual) return null;
  const ciclo = plano === "vertical" ? VERTICAIS : HORIZONTAIS;
  const livres = new Set(direcoesLivres(montagem, id, plano));
  const i = ciclo.indexOf(atual);
  // face cega fora do plano pedido (ex.: está no CIMA e o R é horizontal):
  // entra pela primeira livre do ciclo, que é o passo mais curto e previsível
  if (i < 0) return ciclo.find((d) => livres.has(d)) ?? null;
  for (let k = 1; k < ciclo.length; k++) {
    const d = ciclo[(((i + sentido * k) % ciclo.length) + ciclo.length) % ciclo.length];
    if (livres.has(d)) return d;
  }
  return null;
}

/**
 * A pose da peça com a face cega apontando pra `direcao` (D5).
 *
 * Gira em cima do PRÓPRIO CENTRO, e é isso que segura a junta: o centro do cubo
 * não sai do lugar, então o ponto da junta continua sendo o centro de uma face —
 * só troca QUAL face está lá. Com a D6 valendo, sempre há uma.
 */
export function poseComFaceCegaEm(montagem, id, direcao) {
  const peca = pecaDaMontagem(montagem, id);
  const atual = faceCegaEm(montagem, id);
  const alvo = vetorDe(direcao);
  const centro = centroNoMundo(peca);
  if (!peca || !atual || !alvo || !centro || atual === direcao) return null;
  return arredMatriz(matRodada(peca.matriz, qEntreVetores(vetorDe(atual), alvo), centro));
}

/**
 * A pose da peça girada 90° no PRÓPRIO EIXO (D4).
 *
 * Barra e sapata não têm face cega e não mudam de lugar: o que gira é qual face
 * leva a escada. O eixo é o Y local — o comprimento da barra, a altura da sapata
 * —, e as pontas dela ficam EM CIMA desse eixo, então a junta nem sente.
 */
export function poseGiradaNoEixo(montagem, id, passos = 1) {
  const peca = pecaDaMontagem(montagem, id);
  const centro = centroNoMundo(peca);
  if (!peca || !centro) return null;
  const eixo = matDirecao(peca.matriz, [0, 1, 0]);
  return arredMatriz(matRodada(peca.matriz, qDoEixo(eixo, passos * ANGULO_DE_GIRO), centro));
}

/**
 * A pose da peça SOLTA tombada 90° (D7) — em pé vira deitada, e vice-versa.
 *
 * É o único movimento que muda a posição de uma peça reta, e existe porque sem
 * ele não há como nascer uma barra horizontal sem depender de cubo.
 *
 * O eixo do tombo é HORIZONTAL e perpendicular ao comprimento da peça: tombar em
 * torno do próprio comprimento não tombaria nada. E a peça volta com a base no
 * MESMO NÍVEL de antes — deitar uma barra em pé deixa ela deitada no chão, não
 * meio enterrada.
 */
export function poseTombada(montagem, id, passos = 1) {
  const peca = pecaDaMontagem(montagem, id);
  const caixa = caixaLocal(catDa(peca));
  const centro = centroNoMundo(peca);
  if (!peca || !caixa || !centro) return null;

  const comprimento = matDirecao(peca.matriz, [0, 1, 0]);
  // deitada, o perpendicular horizontal é o eixo certo; em pé, qualquer um serve
  const eixo = Math.abs(comprimento[1]) > 0.9
    ? [1, 0, 0]
    : [-comprimento[2], 0, comprimento[0]];

  const cantos = [];
  for (const x of [caixa.min[0], caixa.max[0]]) {
    for (const y of [caixa.min[1], caixa.max[1]]) {
      for (const z of [caixa.min[2], caixa.max[2]]) cantos.push([x, y, z]);
    }
  }
  const base = (m) => Math.min(...cantos.map((c) => matPonto(m, c)[1]));

  const antes = base(peca.matriz);
  const girada = matRodada(peca.matriz, qDoEixo(eixo, passos * ANGULO_DE_GIRO), centro);
  girada[13] += antes - base(girada);
  return arredMatriz(girada);
}

// ── o que cada tecla faz ─────────────────────────────────────
// Mora AQUI, e não na aba, pra que o teste exercite exatamente o que o dedo
// exercita. Regra escrita num lugar e testada noutro é regra que diverge.

/** a pose que o `R` produz — ou `null` quando não há pra onde ir */
export function poseDoGiro(montagem, id) {
  const peca = pecaDaMontagem(montagem, id);
  // barra e sapata giram no próprio eixo e não saem do lugar (D4)
  if (catDa(peca)?.tipo !== "cubo") return poseGiradaNoEixo(montagem, id);
  const alvo = proximaFaceCega(montagem, id, "horizontal");
  return alvo ? poseComFaceCegaEm(montagem, id, alvo) : null;
}

/** tem alguma peça pendurada nesta? */
export const temFilhas = (montagem, id) =>
  (montagem?.pecas ?? []).some((p) => p.encaixe?.de === id);

/** a pose que o `Shift+R` produz — ou `null` quando a peça não tomba */
export function poseDoTombo(montagem, id) {
  const peca = pecaDaMontagem(montagem, id);
  if (catDa(peca)?.tipo === "cubo") {
    const alvo = proximaFaceCega(montagem, id, "vertical");
    return alvo ? poseComFaceCegaEm(montagem, id, alvo) : null;
  }
  // Barra encaixada não tomba: quem manda na direção dela é a junta (D4).
  //
  // ⚠️ E peça solta COM PEÇA PENDURADA também não. Tombar é o único movimento
  // que muda a posição (D7), e a raiz de uma torre é justamente uma peça solta:
  // deitá-la deitaria a torre inteira junto, atropelando a D3. Girar a estrutura
  // toda é outra operação — não é "girar a peça".
  if (peca?.encaixe || temFilhas(montagem, id)) return null;
  return poseTombada(montagem, id);
}
