// services/estrutura/paineis.js — as telas do projeto DENTRO do desenho.
//
// Espeque: docs/estrutura3d-spec.md §11 (E4) e §11.5 (E4.5).
//
// ⚠️ A E4.5 VIROU A MESA, e foi decisão do dono (20/08): o painel **não é mais
// pendurado numa peça**. Ele é um objeto SOLTO no mundo — posição livre em mm —
// porque o que a aba entrega aqui é **preview de montagem**, não montagem. Regra
// de fixação (clamp, sapata, apoio) é do rigger e ainda não existe no app; até
// existir, prender a tela à treliça só atrapalhava quem estava desenhando.
//
// O que ficou de pé da E4: a tela NÃO é copiada (o painel guarda só o `telaId`,
// medida e peso saem da tela do projeto, viva), o peso continua saindo separado
// do peso da treliça, e o app segue sem dizer se aguenta (§10).
//
// O FORMATO ANTIGO CONTINUA DESENHANDO. Painel gravado com `de`/`face` (v2) é
// resolvido pela âncora, como sempre foi, até alguém mexer nele — `migrarPaineis`
// congela a pose de mundo e ele vira solto. Projeto do galpão não pode quebrar
// por causa de uma mudança de modelo nossa.
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

// quanto a borda de baixo pode estar longe do piso e o painel ainda contar como
// APOIADO NO CHÃO. Meio centímetro é a folga de quem desenha, não de quem monta.
const RENTE_AO_CHAO_MM = 5;

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
 * O quanto o painel se estende em cada EIXO DO MUNDO — meia largura, meia
 * altura e meia espessura já rodadas pelo `olha`.
 *
 * É o que o ímã precisa pra saber onde estão as bordas dele, e o que responde
 * "esse painel encosta no chão?" sem montar caixa nenhuma.
 */
export function meiasNoMundo(medidas, olha) {
  const eixos = eixosDoPainel(olha);
  if (!eixos || !medidas) return null;
  const meias = [medidas.larguraMm / 2, medidas.alturaMm / 2, medidas.espessuraMm / 2];
  const cols = [eixos.lado, eixos.cima, eixos.frente];
  return [0, 1, 2].map((k) =>
    cols.reduce((acc, eixo, i) => acc + Math.abs(eixo[k]) * meias[i], 0));
}

/** a matriz de mundo de um painel SOLTO, a partir do centro dele */
export function poseLivre(pos, olha) {
  const eixos = eixosDoPainel(olha);
  if (!eixos || !Array.isArray(pos) || pos.length !== 3) return null;
  const { lado, cima, frente } = eixos;
  return arredMatriz([
    lado[0], lado[1], lado[2], 0,
    cima[0], cima[1], cima[2], 0,
    frente[0], frente[1], frente[2], 0,
    pos[0], pos[1], pos[2], 1,
  ]);
}

/**
 * A pose ANCORADA do formato antigo (v2): o painel encostado numa FACE da peça.
 *
 * Ele encosta e não invade: o centro sai do centro da face, empurrado pela
 * metade da própria extensão naquela direção. Continua aqui porque projeto
 * gravado antes da E4.5 tem que abrir desenhando igual.
 */
export function poseAncorada(montagem, painel, tela) {
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
  return poseLivre(centro, painel.olha);
}

/**
 * A matriz de mundo do painel — solto (E4.5) ou ancorado (v2, legado).
 *
 * Quem tem `pos` é solto e manda; sem `pos`, cai na âncora. Um `if` só, e é o
 * que deixa o formato antigo abrindo sem migração forçada.
 */
export function poseDoPainel(montagem, painel, tela) {
  if (!telaMensuravel(tela)) return null;
  if (Array.isArray(painel?.pos)) return poseLivre(painel.pos, painel.olha);
  return poseAncorada(montagem, painel, tela);
}

/** o painel está solto (E4.5) ou ainda preso numa peça (v2)? */
export const painelSolto = (painel) => Array.isArray(painel?.pos);

/**
 * Onde nasce um painel largado no piso: em pé, com a borda de baixo no chão.
 *
 * Nasce APOIADO de propósito. Painel que nasce no ar exige um segundo gesto só
 * pra descer, e o caso de campo mais comum — parede de LED no chão do palco —
 * fica pronto no primeiro clique.
 */
export function poseNoChao(ponto, medidas, olha, chaoMm = 0) {
  const meias = meiasNoMundo(medidas, olha);
  if (!meias || !ponto) return null;
  return [Math.round(ponto[0]), Math.round(chaoMm + meias[1]), Math.round(ponto[2])];
}

/**
 * Pra onde o painel deve olhar quando nasce em cima de uma peça.
 *
 * Perpendicular ao comprimento da peça: painel numa viga que corre leste–oeste
 * olha pro norte ou pro sul, nunca pra ponta da viga. Peça em pé não tem
 * preferência — aí vale a primeira da bússola.
 */
export function melhorOlhar(montagem, pecaId) {
  const peca = pecaDaMontagem(montagem, pecaId);
  if (!peca?.matriz) return HORIZONTAIS[0];
  const eixo = matDirecao(peca.matriz, [0, 1, 0]);
  if (Math.abs(eixo[1]) > 0.9) return HORIZONTAIS[0]; // peça em pé
  const perpendicular = direcaoDe(unitario(vetorial([0, 1, 0], eixo)));
  return perpendicular ?? HORIZONTAIS[0];
}

/**
 * Congela a pose dos painéis ancorados e devolve todos SOLTOS (v2 → v3).
 *
 * Roda uma vez, na abertura do projeto. O painel fica exatamente onde já estava
 * desenhado — migração que MOVE a coisa é migração que o técnico descobre no
 * galpão. Painel cuja peça sumiu não tem pose pra congelar: fica como está, e a
 * aba continua avisando que ele está sem apoio.
 */
export function migrarPaineis(montagem, telas = []) {
  const lista = montagem?.paineis ?? [];
  if (!lista.some((p) => !painelSolto(p))) return montagem;
  const porId = new Map((telas ?? []).map((t) => [t.id, t]));
  let mexeu = false;
  const paineis = lista.map((painel) => {
    if (painelSolto(painel)) return painel;
    const m = poseAncorada(montagem, painel, porId.get(painel.telaId) ?? null);
    if (!m) return painel;
    mexeu = true;
    return { id: painel.id, telaId: painel.telaId, olha: painel.olha, pos: [m[12], m[13], m[14]] };
  });
  return mexeu ? { ...montagem, paineis } : montagem;
}

// ── a lista pronta pra desenhar e pra somar ──────────────────

/**
 * Os painéis com tudo resolvido: a tela, as medidas, a pose e o apoio.
 * É o que a cena desenha e o que as métricas somam — uma volta só.
 *
 * Painel apontando pra tela que sumiu do projeto **não é descartado calado**: ele
 * sai marcado com `tela: null`, e quem chama decide se avisa. Perder painel em
 * silêncio é a mesma armadilha da peça fora do catálogo (§8.6-B2).
 */
export function paineisNoMundo(montagem, telas = []) {
  const porId = new Map((telas ?? []).map((t) => [t.id, t]));
  const chao = nivelDoChao(montagem);
  return (montagem?.paineis ?? []).map((painel) => {
    const tela = porId.get(painel.telaId) ?? null;
    const medidas = tela ? medidasDaTela(tela) : null;
    const pose = tela ? poseDoPainel(montagem, painel, tela) : null;
    return {
      painel,
      tela,
      medidas,
      matriz: pose,
      // NO CHÃO OU NO AR, e a diferença não é decorativa: painel apoiado no piso
      // não é peso suspenso, e somar os dois juntos faria o Caderno mentir
      // justamente no número que o rigger lê antes de içar.
      apoiado: !!pose && !!medidas
        && pose[13] - medidas.alturaMm / 2 <= chao + RENTE_AO_CHAO_MM,
    };
  });
}

/** a caixa orientada de um painel, no formato que o detector de colisão usa */
export function caixaDoPainel(pose, medidas) {
  if (!pose || !medidas) return null;
  const meias = [medidas.larguraMm / 2, medidas.alturaMm / 2, medidas.espessuraMm / 2];
  return {
    pecaId: null,
    centro: [pose[12], pose[13], pose[14]],
    meias,
    eixos: [
      [pose[0], pose[1], pose[2]],
      [pose[4], pose[5], pose[6]],
      [pose[8], pose[9], pose[10]],
    ],
    raio: Math.hypot(meias[0], meias[1], meias[2]),
  };
}

/** a matriz identidade, pro caso de alguém precisar de um painel sem âncora */
export const MATRIZ_SOLTA = arredMatriz(matriz(IDENTIDADE, [0, 0, 0]));

// ── o que a E4 entrega ───────────────────────────────────────

/**
 * O peso das telas no desenho — e QUANTO DELE ESTÁ NO AR.
 *
 * Separado do peso da estrutura de propósito: quem monta precisa saber quanto a
 * treliça pesa por si e quanto ela está CARREGANDO. Com o painel solto (E4.5) a
 * separação virou três números, porque parede apoiada no chão não pendura em
 * nada — e somar as duas daria um "suspenso" que ninguém vai içar.
 *
 * O app continua sem dizer se aguenta (§10).
 */
export function pesoDosPaineis(montagem, telas = []) {
  let kg = 0;
  let kgSuspenso = 0;
  let kgNoChao = 0;
  let semTela = 0;
  let suspensos = 0;
  let conferido = true;
  const itens = paineisNoMundo(montagem, telas);
  for (const item of itens) {
    if (!item.tela) { semTela++; continue; }
    kg += item.medidas.pesoKg;
    if (item.apoiado) kgNoChao += item.medidas.pesoKg;
    else { kgSuspenso += item.medidas.pesoKg; suspensos++; }
    if (!(item.medidas.pesoPorGabinete > 0)) conferido = false;
  }
  const um = (v) => Math.round(v * 10) / 10;
  return {
    paineis: itens.length,
    suspensos,
    kg: um(kg),
    kgSuspenso: um(kgSuspenso),
    kgNoChao: um(kgNoChao),
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
 * O que há de errado com os painéis — a régua de MEDIDA, nunca de carga (§10).
 *
 * - `sem-tela`   — a tela saiu do projeto e o painel ficou apontando pro vazio;
 * - `sem-apoio`  — só no formato antigo: a peça onde ele estava pendurado sumiu;
 * - `atravessa`  — o painel entra numa peça da estrutura. É o "não cabe no vão";
 * - `no-chao`    — a borda de baixo passa DO piso, ou seja, o painel está
 *                  enterrado. Painel APOIADO no piso é caso normal desde a E4.5 e
 *                  não é problema nenhum.
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
