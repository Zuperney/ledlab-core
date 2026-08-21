// services/estrutura/imantar.js — o ímã do desenho e a trena.
//
// Espeque: docs/estrutura3d-spec.md §12 (E5).
//
// DUAS COISAS, e as duas existem pela mesma razão: **posicionar à mão erra**.
// Desde que a tela virou objeto solto (§12), largar uma parede "quase" encostada
// na outra é o resultado normal do mouse — e um "quase" de 3 cm no desenho vira
// uma emenda que não fecha no galpão.
//
//   · o ÍMÃ  — a borda do que você está arrastando pula pra borda do que já
//              está lá. Sem alvo por perto, cai na grade de 10 cm;
//   · a TRENA — dois cliques, e a distância entre eles em metro. Os cliques
//              grudam nos pontos que importam (nó de treliça, quina de painel),
//              porque medir "mais ou menos de onde eu cliquei" não mede nada.
//
// EIXO POR EIXO, e é o que faz o ímã ser previsível: cada eixo do mundo decide
// sozinho se grudou. Assim dá pra encostar duas paredes lado a lado sem que o
// app resolva também mexer na altura delas.
//
// ⚠️ ABRE NO CELULAR (nada aqui é de desenho). Nada de `three`.

import { alcance, caixaNoMundo } from "./colisao.js";
import { nivelDoChao } from "./metricas.js";
import { conectoresNoMundo } from "./montagem.js";
import { caixaDoPainel, eixosDoPainel, meiasNoMundo, paineisNoMundo } from "./paineis.js";

// a grade fina do desenho: no campo se mede em centímetro inteiro, e posição
// solta na terceira casa deixa a medida do Caderno com um resto que ninguém pediu
export const PASSO_PADRAO_MM = 100;

// o ALCANCE DO ÍMÃ. 300 mm é meia seção de truss: perto o bastante pra encostar
// de propósito, longe o bastante pra não puxar sozinho quem só passou por ali.
export const IMA_MM = 300;

// o raio em que a trena gruda num ponto notável. Maior que o ímã de propósito:
// errar o nó da treliça por 4 cm e medir a diagonal errada é pior do que grudar
// num ponto que o técnico não queria — esse ele vê e corrige.
export const TRENA_MM = 400;

const arred = (v) => Math.round(v * 10) / 10;

/** o valor mais próximo de `v` numa lista JÁ ORDENADA (busca binária) */
export function maisProximo(ordenada, v) {
  if (!ordenada?.length) return null;
  let lo = 0;
  let hi = ordenada.length - 1;
  if (v <= ordenada[lo]) return ordenada[lo];
  if (v >= ordenada[hi]) return ordenada[hi];
  while (hi - lo > 1) {
    const meio = (lo + hi) >> 1;
    if (ordenada[meio] === v) return v;
    if (ordenada[meio] < v) lo = meio;
    else hi = meio;
  }
  return v - ordenada[lo] <= ordenada[hi] - v ? ordenada[lo] : ordenada[hi];
}

/**
 * Os PLANOS onde uma tela gruda, um conjunto por eixo do mundo.
 *
 * Cada peça e cada painel contribuem com três valores por eixo — a borda de cá,
 * o meio e a borda de lá. É o que faz "encostar" e "alinhar pelo centro" caírem
 * na mesma conta, sem regra especial pra nenhum dos dois.
 *
 * Sai ORDENADO porque o arraste consulta isto a cada quadro: com a lista pronta,
 * cada consulta é uma busca binária e não uma varredura da estrutura inteira.
 *
 * @param {string|null} exceto id do painel que está sendo movido — ele não pode
 *   grudar em si mesmo, senão o ímã trava o arraste no lugar.
 */
export function planosDeImante(montagem, telas = [], exceto = null) {
  const conj = [new Set(), new Set(), new Set()];
  const somar = (centro, meias) => {
    for (let k = 0; k < 3; k++) {
      conj[k].add(arred(centro[k] - meias[k]));
      conj[k].add(arred(centro[k]));
      conj[k].add(arred(centro[k] + meias[k]));
    }
  };

  for (const peca of montagem?.pecas ?? []) {
    const caixa = caixaNoMundo(peca);
    if (!caixa) continue;
    somar(caixa.centro, [
      alcance(caixa, [1, 0, 0]), alcance(caixa, [0, 1, 0]), alcance(caixa, [0, 0, 1]),
    ]);
  }

  for (const item of paineisNoMundo(montagem, telas)) {
    if (!item.matriz || !item.medidas || item.painel.id === exceto) continue;
    const meias = meiasNoMundo(item.medidas, item.painel.olha);
    if (meias) somar([item.matriz[12], item.matriz[13], item.matriz[14]], meias);
  }

  // O PISO É UM PLANO COMO OUTRO QUALQUER. Sem ele, largar a parede no chão
  // exigiria mira de milímetro justamente no caso mais comum do palco.
  conj[1].add(arred(nivelDoChao(montagem)));

  return conj.map((s) => [...s].sort((a, b) => a - b));
}

/**
 * Os NOVE PONTOS de uma tela: as quatro quinas, os quatro meios de borda e o
 * centro — os oito puxadores da moldura, mais o miolo.
 *
 * São os pontos que alguém realmente casa quando encosta duas paredes: quina com
 * quina pra emendar, meio de borda com meio de borda pra centralizar uma tela
 * menor na maior, centro com centro pra sobrepor. Ficam no PLANO DA FACE de LED
 * (na profundidade do centro): a espessura é nominal e não é coisa que se alinha.
 */
export function pontosDaTela(centro, medidas, olha) {
  const eixos = eixosDoPainel(olha);
  if (!eixos || !medidas || !centro) return [];
  const out = [];
  for (const a of [-1, 0, 1]) {
    for (const b of [-1, 0, 1]) {
      const dl = (a * medidas.larguraMm) / 2;
      const dc = (b * medidas.alturaMm) / 2;
      out.push([0, 1, 2].map((k) => arred(centro[k] + eixos.lado[k] * dl + eixos.cima[k] * dc)));
    }
  }
  return out;
}

/**
 * Os pontos em que uma tela gruda em OUTRA TELA.
 *
 * ⚠️ SÓ TELAS, de propósito (decisão do dono, 20/08). Entre telas o encaixe é
 * RIGOROSO — parede com parede é emenda, e emenda que erra 3 cm no desenho é
 * emenda que não fecha no galpão. Com a ESTRUTURA a régua continua sendo a dos
 * planos, que é mais frouxa e é o que se quer: encostar num truss é apoiar, não
 * casar quina. Mesmo motor, duas fontes de candidato.
 */
export function pontosDeImante(montagem, telas = [], exceto = null) {
  const out = [];
  for (const item of paineisNoMundo(montagem, telas)) {
    if (!item.matriz || !item.medidas || item.painel.id === exceto) continue;
    out.push(...pontosDaTela(
      [item.matriz[12], item.matriz[13], item.matriz[14]], item.medidas, item.painel.olha,
    ));
  }
  return out;
}

/**
 * Onde a tela realmente encosta.
 *
 * DUAS RÉGUAS, nesta ordem:
 *
 * 1. PONTO A PONTO, contra as outras telas: o par (meu ponto, ponto de lá) mais
 *    próximo dentro do alcance vence, e a correção vale nos três eixos de uma
 *    vez. É o que faz quina casar com quina em vez de "quase" — e é mais
 *    previsível que o alinhamento por eixo, que podia pegar o X de uma parede e
 *    o Z de outra sem ninguém pedir;
 * 2. POR PLANO, contra a estrutura e o piso: pra cada eixo, o app compara três
 *    pontos do painel — borda de cá, centro, borda de lá — com os planos de lá.
 *    Mais frouxo de propósito: encostar num truss é apoiar, não casar quina.
 *
 * Não achou nada perto? cai na grade, que é melhor que deixar o número solto na
 * casa do milímetro.
 *
 * `eixos` é a TRAVA (Shift/Ctrl): eixo travado não se move e não gruda em nada —
 * o ímã não pode desfazer a trava que o técnico está segurando com o dedo.
 *
 * @returns {{ pos, presos, ponto }} `presos[k]` diz se aquele eixo grudou; `ponto`
 *   diz que o encaixe foi quina-com-quina, que é o que a aba anuncia diferente.
 */
export function imantar(planos, medidas, olha, pos, opcoes = {}) {
  const {
    passoMm = PASSO_PADRAO_MM, imaMm = IMA_MM, ligado = true,
    pontos = null, eixos = [true, true, true],
  } = opcoes;
  const meias = meiasNoMundo(medidas, olha);
  const out = [...pos];
  const presos = [false, false, false];
  if (!meias) return { pos: out.map((v) => Math.round(v)), presos, ponto: false, ancora: null };

  // ── 1. ponto a ponto (tela × tela) ──
  if (ligado && pontos?.length) {
    const meus = pontosDaTela(pos, medidas, olha);
    let melhor = null;
    for (const meu of meus) {
      for (const alvo of pontos) {
        let d2 = 0;
        const delta = [0, 0, 0];
        for (let k = 0; k < 3; k++) {
          if (!eixos[k]) continue; // eixo travado não conta nem na distância
          delta[k] = alvo[k] - meu[k];
          d2 += delta[k] * delta[k];
        }
        if (d2 <= imaMm * imaMm && (melhor === null || d2 < melhor.d2)) melhor = { d2, delta, alvo };
      }
    }
    if (melhor) {
      for (let k = 0; k < 3; k++) {
        if (!eixos[k]) continue;
        out[k] = arred(pos[k] + melhor.delta[k]);
        presos[k] = true;
      }
      // a ÂNCORA sai junto pra vista acender o ponto que pegou: ímã que gruda
      // sem dizer onde é ímã que parece bug.
      return { pos: out, presos, ponto: true, ancora: melhor.alvo };
    }
  }

  // ── 2. por plano (tela × estrutura, tela × piso) ──
  for (let k = 0; k < 3; k++) {
    // eixo TRAVADO não se move: nem gruda, nem arredonda na grade. A trava é do
    // dedo do técnico, e ímã que a desfaz é ímã que atrapalha.
    if (!eixos[k]) { out[k] = pos[k]; continue; }
    let melhor = null;
    if (ligado) {
      for (const desvio of [-meias[k], 0, meias[k]]) {
        const alvo = maisProximo(planos?.[k] ?? [], pos[k] + desvio);
        if (alvo == null) continue;
        const d = alvo - (pos[k] + desvio);
        if (Math.abs(d) <= imaMm && (melhor === null || Math.abs(d) < Math.abs(melhor))) melhor = d;
      }
    }
    if (melhor !== null) {
      out[k] = arred(pos[k] + melhor);
      presos[k] = true;
    } else {
      out[k] = Math.round(pos[k] / passoMm) * passoMm;
    }
  }
  return { pos: out, presos, ponto: false, ancora: null };
}

// ── a trena ──────────────────────────────────────────────────

/**
 * Os pontos em que a trena GRUDA: os nós da treliça e as quinas dos painéis.
 *
 * São os pontos que alguém mede de verdade — vão entre torres, altura do nó,
 * largura da parede. Medir de um ponto qualquer da superfície devolveria um
 * número que muda a cada clique, e número assim não vale como medida.
 */
export function pontosNotaveis(montagem, telas = []) {
  const out = conectoresNoMundo(montagem).map((c) => c.pos);
  for (const item of paineisNoMundo(montagem, telas)) {
    const caixa = caixaDoPainel(item.matriz, item.medidas);
    if (!caixa) continue;
    const meias = meiasNoMundo(item.medidas, item.painel.olha);
    if (!meias) continue;
    for (const sx of [-1, 1]) {
      for (const sy of [-1, 1]) {
        for (const sz of [-1, 1]) {
          out.push([
            caixa.centro[0] + sx * meias[0],
            caixa.centro[1] + sy * meias[1],
            caixa.centro[2] + sz * meias[2],
          ]);
        }
      }
    }
  }
  return out;
}

/**
 * O clique da trena, grudado no ponto notável mais próximo.
 *
 * Sem ponto por perto, arredonda na grade: o técnico clicou no chão vazio, e
 * "3,00 m" é uma medida melhor que "2,987 m" pra quem está desenhando.
 */
export function imantarPonto(pontos, p, opcoes = {}) {
  const { raioMm = TRENA_MM, passoMm = PASSO_PADRAO_MM } = opcoes;
  let melhor = null;
  let menor = raioMm * raioMm;
  for (const q of pontos ?? []) {
    const d = (q[0] - p[0]) ** 2 + (q[1] - p[1]) ** 2 + (q[2] - p[2]) ** 2;
    if (d <= menor) { menor = d; melhor = q; }
  }
  if (melhor) return { ponto: [arred(melhor[0]), arred(melhor[1]), arred(melhor[2])], preso: true };
  return { ponto: p.map((v) => Math.round(v / passoMm) * passoMm), preso: false };
}

/**
 * A medida entre dois pontos: a reta, e as três projeções.
 *
 * As projeções não são enfeite. Quem está medindo vão de pórtico quer a
 * horizontal; quem está medindo altura de içamento quer a vertical — e a reta
 * entre dois pontos em diagonal não responde nem uma nem outra.
 */
export function medir(a, b) {
  if (!a || !b) return null;
  const d = [b[0] - a[0], b[1] - a[1], b[2] - a[2]];
  return {
    mm: arred(Math.hypot(d[0], d[1], d[2])),
    horizontalMm: arred(Math.hypot(d[0], d[2])),
    verticalMm: arred(Math.abs(d[1])),
    dx: arred(d[0]),
    dy: arred(d[1]),
    dz: arred(d[2]),
  };
}
