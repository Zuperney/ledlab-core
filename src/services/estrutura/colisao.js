// services/estrutura/colisao.js — duas peças ocupando o mesmo espaço.
//
// Espeque: docs/estrutura3d-spec.md §8.6, item B1.
//
// POR QUE ISTO EXISTE: até aqui dava pra montar uma peça DENTRO da outra sem um
// pio — duas barras de 2 m na mesma posição entravam, e a caixa envolvente saía
// como se fosse uma peça só. O app já sabe fazer essa checagem em 2D (o
// `layout.js` acusa telas sobrepostas na Composição, porque conteúdo escondido é
// erro de campo). Estrutura merece a mesma régua.
//
// ⚠️ AVISA, NÃO BLOQUEIA. Quem monta às vezes precisa de um estado inválido no
// meio do caminho — encaixa uma peça, percebe, tira. Travar o encaixe faria o
// técnico brigar com o app; acusar em vermelho faz ele ver o problema.
//
// ⚠️ ABRE NO CELULAR (o Caderno registra os conflitos). Nada aqui pode tocar em
// `three` — a matemática é a da casa, do `vetor.js`.

import { caixaLocal, pecaPorId } from "./catalogo.js";
import { escalar, matDirecao, matPonto, sub, unitario, vetorial } from "./vetor.js";

// A FOLGA é o que separa "encostado" de "dentro".
//
// Peça encaixada encosta face com face: a penetração de duas caixas numa junta
// legítima é ZERO. Peça montada dentro de outra penetra pela seção inteira —
// 300 mm no P30. Entre um caso e o outro não há meio-termo real; os 20 mm só
// absorvem o arredondamento da matriz, que guarda 6 casas.
export const FOLGA_MM = 20;

// ── a caixa orientada de uma peça, no mundo ──────────────────
// A matriz é sempre RÍGIDA (rotação + translação, sem escala), então as três
// colunas dela já são os eixos ortonormais da caixa.
export function caixaNoMundo(peca) {
  const cat = pecaPorId(peca?.catalogoId);
  const local = caixaLocal(cat);
  if (!local || !peca?.matriz) return null;
  const centro = [0, 1, 2].map((k) => (local.min[k] + local.max[k]) / 2);
  const meias = [0, 1, 2].map((k) => (local.max[k] - local.min[k]) / 2);
  return {
    pecaId: peca.id,
    centro: matPonto(peca.matriz, centro),
    meias,
    eixos: [
      unitario(matDirecao(peca.matriz, [1, 0, 0])),
      unitario(matDirecao(peca.matriz, [0, 1, 0])),
      unitario(matDirecao(peca.matriz, [0, 0, 1])),
    ],
    // raio da esfera que embrulha a caixa — o descarte barato antes do SAT
    raio: Math.hypot(meias[0], meias[1], meias[2]),
  };
}

// o quanto a caixa se estende ao longo de um eixo qualquer
const alcance = (caixa, eixo) =>
  caixa.meias[0] * Math.abs(escalar(caixa.eixos[0], eixo)) +
  caixa.meias[1] * Math.abs(escalar(caixa.eixos[1], eixo)) +
  caixa.meias[2] * Math.abs(escalar(caixa.eixos[2], eixo));

/**
 * O quanto duas caixas orientadas se interpenetram, em mm. `0` = não se tocam
 * ou se tocam exatamente (que é o caso de toda junta parafusada).
 *
 * Teorema do eixo separador: se existe UM eixo em que as sombras das duas caixas
 * não se cruzam, elas não se tocam. São 15 candidatos — 3 faces de cada caixa e
 * as 9 arestas cruzadas. A menor sobra entre todos é a profundidade.
 */
export function penetracao(a, b) {
  if (!a || !b) return 0;
  const entre = sub(b.centro, a.centro);
  // descarte barato: esferas longe uma da outra nem entram no SAT
  if (Math.hypot(entre[0], entre[1], entre[2]) > a.raio + b.raio) return 0;

  const eixos = [...a.eixos, ...b.eixos];
  for (const ea of a.eixos) {
    for (const eb of b.eixos) {
      const c = vetorial(ea, eb);
      // eixos paralelos dão produto vetorial nulo — não é candidato, é ruído
      if (Math.hypot(c[0], c[1], c[2]) > 1e-6) eixos.push(unitario(c));
    }
  }

  let menor = Infinity;
  for (const eixo of eixos) {
    const sobra = alcance(a, eixo) + alcance(b, eixo) - Math.abs(escalar(entre, eixo));
    if (sobra <= 0) return 0; // achou o separador: acabou
    if (sobra < menor) menor = sobra;
  }
  return menor === Infinity ? 0 : menor;
}

/**
 * Os pares de peças que se sobrepõem.
 *
 * @param {object} montagem
 * @param {{folgaMm?:number}} opcoes
 * @returns {{a:string,b:string,mm:number}[]} ordenado da pior sobreposição pra menor
 */
export function colisoes(montagem, { folgaMm = FOLGA_MM } = {}) {
  const caixas = (montagem?.pecas ?? []).map(caixaNoMundo).filter(Boolean);
  const out = [];
  for (let i = 0; i < caixas.length; i++) {
    for (let j = i + 1; j < caixas.length; j++) {
      const mm = penetracao(caixas[i], caixas[j]);
      if (mm > folgaMm) {
        out.push({ a: caixas[i].pecaId, b: caixas[j].pecaId, mm: Math.round(mm * 10) / 10 });
      }
    }
  }
  return out.sort((x, y) => y.mm - x.mm);
}

/** as peças envolvidas em alguma sobreposição — é o que a cena pinta de vermelho */
export function pecasEmConflito(montagem, opcoes) {
  const s = new Set();
  for (const c of colisoes(montagem, opcoes)) {
    s.add(c.a);
    s.add(c.b);
  }
  return s;
}
