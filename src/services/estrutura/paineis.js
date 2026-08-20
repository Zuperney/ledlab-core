// services/estrutura/paineis.js — as telas do projeto penduradas na estrutura.
//
// Espeque: docs/estrutura3d-spec.md §11 (fase E4).
//
// O QUE ESTA FASE ENTREGA, e é o que o rigger pede antes de içar: **quanto está
// pendurado**. A estrutura pesa X, os painéis pesam Y, o total suspenso é Z — e o
// app segue sem dizer se aguenta, que é a fronteira do §10.
//
// A TELA NÃO É COPIADA. O painel guarda só o `telaId`; medida e peso saem da tela
// do projeto, viva. Mexeu em `cols`/`rows` na aba Screens, o painel acompanha —
// duas cópias da mesma parede é como elas começam a divergir.
//
// ⚠️ ABRE NO CELULAR (o Caderno soma o peso). Nada de `three` aqui.

import { FOLGA_MM, alcance, caixaNoMundo, penetracao } from "./colisao.js";
import { HORIZONTAIS, direcaoDe, vetorDe } from "./direcoes.js";
import { nivelDoChao } from "./metricas.js";
import { pecaDaMontagem } from "./montagem.js";
import {
  arredMatriz, escalar, matDirecao, matriz, soma, unitario, vetorial, IDENTIDADE,
} from "./vetor.js";

// O gabinete do app não tem profundidade cadastrada (marca, resolução, medida da
// face, peso e potência — profundidade nunca fez falta). 100 mm é a ordem de
// grandeza de painel de evento e serve pro DESENHO: não entra no peso, não entra
// na lista, e a medida que o Caderno afirma continua sendo a da face.
export const ESPESSURA_PADRAO_MM = 100;

/** as medidas físicas de uma tela do projeto, em mm e kg */
export function medidasDaTela(tela) {
  const g = tela?.gabinete ?? {};
  const cols = Number(tela?.cols) || 0;
  const rows = Number(tela?.rows) || 0;
  const num = (v) => parseFloat(v) || 0;
  return {
    cols,
    rows,
    gabinetes: cols * rows,
    larguraMm: cols * num(g.dimW),
    alturaMm: rows * num(g.dimH),
    espessuraMm: ESPESSURA_PADRAO_MM,
    pesoKg: cols * rows * num(g.peso),
    // peso por gabinete conferido? o app nunca finge que sabe (mesma régua do §3.2)
    pesoPorGabinete: num(g.peso),
  };
}

/** o painel tem medida de verdade? tela sem gabinete não desenha nada */
export const telaMensuravel = (tela) => {
  const m = medidasDaTela(tela);
  return m.larguraMm > 0 && m.alturaMm > 0;
};

// ── a pose ───────────────────────────────────────────────────

/**
 * Os eixos do painel no mundo, a partir da direção pra onde o LED OLHA.
 *
 * O painel é um plano vertical: `olha` é horizontal (N/S/L/O) e dá o eixo Z
 * local — a face de LED. O Y é sempre a vertical do palco, e o X sai do produto
 * vetorial. Painel inclinado não existe nesta fase.
 */
export function eixosDoPainel(olha) {
  const frente = vetorDe(olha);
  if (!frente || Math.abs(frente[1]) > 0.5) return null; // só olhar horizontal
  const cima = [0, 1, 0];
  const lado = unitario(vetorial(cima, frente));
  return { lado, cima, frente };
}

/**
 * A matriz de mundo do painel encostado numa FACE da peça (D1 vale aqui também).
 *
 * Ele encosta e não invade: o centro do painel sai do centro da face, empurrado
 * pela metade da própria extensão naquela direção. Pendurado por baixo, a borda
 * de cima toca a peça; apoiado em cima, a de baixo; encostado num lado, é a
 * lateral ou as costas, conforme o painel esteja de frente ou de perfil pra face.
 */
export function poseDoPainel(montagem, painel, tela) {
  const peca = pecaDaMontagem(montagem, painel?.de);
  const caixa = caixaNoMundo(peca);
  const eixos = eixosDoPainel(painel?.olha);
  const n = vetorDe(painel?.face);
  if (!caixa || !eixos || !n || !telaMensuravel(tela)) return null;

  const { larguraMm, alturaMm, espessuraMm } = medidasDaTela(tela);
  const meias = { lado: larguraMm / 2, cima: alturaMm / 2, frente: espessuraMm / 2 };

  // onde a face da peça está, e o quanto o painel se estende naquela direção
  const naFace = soma(caixa.centro, [0, 1, 2].map((k) => n[k] * alcance(caixa, n)));
  const meiaDoPainel = Math.abs(escalar(n, eixos.lado)) * meias.lado
    + Math.abs(escalar(n, eixos.cima)) * meias.cima
    + Math.abs(escalar(n, eixos.frente)) * meias.frente;
  const centro = soma(naFace, [0, 1, 2].map((k) => n[k] * meiaDoPainel));

  const { lado, cima, frente } = eixos;
  return arredMatriz([
    lado[0], lado[1], lado[2], 0,
    cima[0], cima[1], cima[2], 0,
    frente[0], frente[1], frente[2], 0,
    centro[0], centro[1], centro[2], 1,
  ]);
}

/**
 * Pra onde o painel deve olhar quando nasce.
 *
 * Perpendicular ao comprimento da peça: painel pendurado numa viga que corre
 * leste–oeste olha pro norte ou pro sul, nunca pra ponta da viga. Peça em pé não
 * tem preferência — aí vale a primeira da bússola.
 */
export function melhorOlhar(montagem, pecaId) {
  const peca = pecaDaMontagem(montagem, pecaId);
  if (!peca?.matriz) return HORIZONTAIS[0];
  const eixo = matDirecao(peca.matriz, [0, 1, 0]);
  if (Math.abs(eixo[1]) > 0.9) return HORIZONTAIS[0]; // peça em pé
  const perpendicular = direcaoDe(unitario(vetorial([0, 1, 0], eixo)));
  return perpendicular ?? HORIZONTAIS[0];
}

// ── a lista pronta pra desenhar e pra somar ──────────────────

/**
 * Os painéis com tudo resolvido: a tela, as medidas, a pose e a caixa no mundo.
 * É o que a cena desenha e o que as métricas somam — uma volta só.
 *
 * Painel apontando pra tela que sumiu do projeto **não é descartado calado**: ele
 * sai marcado com `tela: null`, e quem chama decide se avisa. Perder painel em
 * silêncio é a mesma armadilha da peça fora do catálogo (§8.6-B2).
 */
export function paineisNoMundo(montagem, telas = []) {
  const porId = new Map((telas ?? []).map((t) => [t.id, t]));
  return (montagem?.paineis ?? []).map((painel) => {
    const tela = porId.get(painel.telaId) ?? null;
    const medidas = tela ? medidasDaTela(tela) : null;
    return {
      painel,
      tela,
      medidas,
      matriz: tela ? poseDoPainel(montagem, painel, tela) : null,
    };
  });
}

/** a caixa orientada de um painel, no formato que o detector de colisão usa */
export function caixaDoPainel(matriz, medidas) {
  if (!matriz || !medidas) return null;
  const meias = [medidas.larguraMm / 2, medidas.alturaMm / 2, medidas.espessuraMm / 2];
  return {
    pecaId: null,
    centro: [matriz[12], matriz[13], matriz[14]],
    meias,
    eixos: [
      [matriz[0], matriz[1], matriz[2]],
      [matriz[4], matriz[5], matriz[6]],
      [matriz[8], matriz[9], matriz[10]],
    ],
    raio: Math.hypot(meias[0], meias[1], meias[2]),
  };
}

/** a matriz identidade, pro caso de alguém precisar de um painel sem âncora */
export const MATRIZ_SOLTA = arredMatriz(matriz(IDENTIDADE, [0, 0, 0]));

// ── o que a E4 entrega ───────────────────────────────────────

/**
 * O peso pendurado — o número que o rigger pede antes de içar.
 *
 * Separado do peso da estrutura de propósito: quem monta precisa saber quanto a
 * treliça pesa por si e quanto ela está CARREGANDO. O total é a soma, e o app
 * continua sem dizer se aguenta (§10).
 */
export function pesoDosPaineis(montagem, telas = []) {
  let kg = 0;
  let semTela = 0;
  let conferido = true;
  const itens = paineisNoMundo(montagem, telas);
  for (const item of itens) {
    if (!item.tela) { semTela++; continue; }
    kg += item.medidas.pesoKg;
    if (!(item.medidas.pesoPorGabinete > 0)) conferido = false;
  }
  return {
    paineis: itens.length,
    kg: Math.round(kg * 10) / 10,
    semTela,
    // peso de gabinete vem do cadastro do dono; painel sem peso cadastrado faz o
    // total virar parcial, e o Caderno tem que dizer isso
    completo: conferido && semTela === 0,
  };
}

export const MOTIVOS_DE_PAINEL = Object.freeze({
  SEM_TELA: "sem-tela",
  SEM_APOIO: "sem-apoio",
  ATRAVESSA: "atravessa",
  NO_CHAO: "no-chao",
});

/**
 * O que há de errado com os painéis pendurados — a régua de MEDIDA, nunca de
 * carga (§10). São quatro coisas, e todas se veem no desenho:
 *
 * - `sem-tela`   — a tela saiu do projeto e o painel ficou apontando pro vazio;
 * - `sem-apoio`  — a peça onde ele estava pendurado foi apagada;
 * - `atravessa`  — o painel entra numa peça da estrutura. É o "não cabe no vão":
 *                  parede mais larga que o espaço livre bate na torre;
 * - `no-chao`    — a borda de baixo passa do piso; no palco, arrasta.
 */
export function problemasDosPaineis(montagem, telas = []) {
  const out = [];
  const caixasDaEstrutura = (montagem?.pecas ?? []).map(caixaNoMundo).filter(Boolean);
  const chao = nivelDoChao(montagem);

  for (const item of paineisNoMundo(montagem, telas)) {
    const id = item.painel.id;
    if (!item.tela) { out.push({ painelId: id, motivo: MOTIVOS_DE_PAINEL.SEM_TELA }); continue; }
    if (!item.matriz) { out.push({ painelId: id, motivo: MOTIVOS_DE_PAINEL.SEM_APOIO }); continue; }

    const caixa = caixaDoPainel(item.matriz, item.medidas);
    for (const c of caixasDaEstrutura) {
      const mm = penetracao(caixa, c);
      if (mm > FOLGA_MM) {
        out.push({ painelId: id, motivo: MOTIVOS_DE_PAINEL.ATRAVESSA, pecaId: c.pecaId, mm });
      }
    }

    const base = item.matriz[13] - item.medidas.alturaMm / 2;
    if (base < chao - FOLGA_MM) {
      out.push({
        painelId: id,
        motivo: MOTIVOS_DE_PAINEL.NO_CHAO,
        mm: Math.round((chao - base) * 10) / 10,
      });
    }
  }
  return out;
}
