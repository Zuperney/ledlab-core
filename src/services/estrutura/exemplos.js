// services/estrutura/exemplos.js — montagens prontas, pra provar a cena (E1) e
// pra servir de fixture nos testes.
//
// ⚠️ LIMITE CONHECIDO DO MODELO: a montagem é uma ÁRVORE, não um grafo — cada
// peça tem no máximo um encaixe "pai". Um pórtico real se prende nas DUAS
// pontas; aqui a segunda é coincidência geométrica, não vínculo. Não muda peso
// nem medida (que é o que a gente afirma), mas o dia que o app contar juntas de
// fechamento, isso vira grafo.

import { adicionarPecaEncaixada, adicionarPecaLivre, conectoresLivres, novaMontagem } from "./montagem.js";
import { IDENTIDADE, matriz } from "./vetor.js";

const naPosicao = (x, z = 0) => matriz(IDENTIDADE, [x, 0, z]);

/**
 * O conector LIVRE de uma peça que aponta para uma direção do MUNDO.
 *
 * Existe por um motivo concreto: quando o cubo é encaixado no topo de uma barra,
 * ele entra de cabeça pra baixo (a face que ele oferece é a "topo", e ela tem
 * que ENFRENTAR a barra). Aí "leste" passa a apontar pra oeste. Escolher o
 * conector pelo NOME é chute; pela direção no mundo é o que o técnico enxerga.
 */
export function conectorApontandoPara(montagem, pecaId, direcao) {
  return conectoresLivres(montagem)
    .filter((c) => c.pecaId === pecaId)
    .map((c) => ({ c, d: c.dir[0] * direcao[0] + c.dir[1] * direcao[1] + c.dir[2] * direcao[2] }))
    .sort((a, b) => b.d - a.d)[0]?.c ?? null;
}

/** uma torre: sapata + N barras de 2 m, com o cubo no topo */
function torre(montagem, prefixo, x, andares = 2) {
  let m = adicionarPecaLivre(montagem, "p30-sapata-baixa", {
    id: `${prefixo}-sap`,
    matriz: naPosicao(x),
  });
  let anterior = `${prefixo}-sap`;
  let conAlvo = "topo";
  for (let i = 0; i < andares; i++) {
    const id = `${prefixo}-b${i}`;
    m = adicionarPecaEncaixada(m, { id, catalogoId: "p30-b2000", de: anterior, conAlvo, conNovo: "a" });
    anterior = id;
    conAlvo = "b";
  }
  m = adicionarPecaEncaixada(m, {
    id: `${prefixo}-cubo`, catalogoId: "p30-cubo5", de: anterior, conAlvo, conNovo: "topo",
  });
  return { montagem: m, cubo: `${prefixo}-cubo` };
}

/**
 * O pórtico: duas torres de 4 m e uma viga de 4 m ligando os cubos.
 *
 * As distâncias FECHAM, não são chute: a viga de 4 m sai da face do cubo
 * esquerdo e tem que morrer exatamente na face do cubo direito. Como cada cubo
 * tem 300 mm e a face fica a 150 do centro, o centro das torres precisa ficar a
 * `vão/2 + 150` da origem.
 */
export function porticoDeExemplo(vaoMm = 4000) {
  const meio = vaoMm / 2 + 150;

  const esq = torre(novaMontagem(), "e", -meio);
  const dir = torre(esq.montagem, "d", meio);

  // a face do cubo esquerdo que olha pra torre direita (+X)
  const saida = conectorApontandoPara(dir.montagem, esq.cubo, [1, 0, 0]);

  return adicionarPecaEncaixada(dir.montagem, {
    id: "viga",
    catalogoId: "p30-b4000",
    de: esq.cubo,
    conAlvo: saida.conectorId,
    conNovo: "a",
  });
}

/** uma torre sozinha — o caso mais simples que ainda mostra tudo */
export function torreDeExemplo(andares = 3) {
  return torre(novaMontagem(), "t", 0, andares).montagem;
}
