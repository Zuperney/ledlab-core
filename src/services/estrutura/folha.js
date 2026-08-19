// services/estrutura/folha.js — o que a folha ESTRUTURA do Caderno diz.
//
// Espeque: docs/estrutura3d-spec.md §9, fase E3. É a entrega que o dono pediu no
// primeiro dia: **lista de peças, peso e medidas reais**.
//
// ⚠️ ABRE NO CELULAR. O Caderno é offline e o chunk 3D fica fora do precache —
// nada aqui (nem na cadeia de imports) pode tocar em `three`.
//
// PURO de propósito: mesma fonte pro DOM (ProjectRelatorio) e pro PDF
// (pdfRelatorio), que é o padrão que o `cableScene.js` já estabeleceu na casa.

import { pecaPorId } from "./catalogo.js";
import { colisoes } from "./colisao.js";
import { legendaDaEstrutura } from "./cores.js";
import { juntas } from "./montagem.js";
import { resumo } from "./metricas.js";
import { deJSON } from "./serializar.js";

// O que o app NUNCA afirma sobre estrutura. Vai impresso, sempre — não é
// rodapé jurídico, é a fronteira do produto (espeque §10).
export const AVISO_ESTRUTURA = {
  titulo: "Estrutura — responsabilidade técnica",
  partes: [
    "Esta folha é REGISTRO do que foi montado: peças, peso e medidas. ",
    { texto: "Ela não dimensiona a estrutura e não diz se ela aguenta.", forte: true },
    " Vão livre, carga admissível, flecha, ponto de içamento e contraventamento são do ",
    { texto: "rigger habilitado", forte: true },
    " e do ",
    { texto: "engenheiro responsável, com ART no CREA", forte: true },
    ". Nenhum fabricante brasileiro de box truss publica tabela de carga aberta — na dúvida, consulte o fabricante das suas peças.",
  ],
};

// O `warnBox` do PDF fala outro dialeto de partes ({t, b}) que o do DOM.
// Converter aqui mantém UM texto só — o pior jeito de um aviso de segurança
// divergir é ter duas cópias dele.
export const avisoEstruturaPdf = () => ({
  titulo: AVISO_ESTRUTURA.titulo,
  partes: AVISO_ESTRUTURA.partes.map((p) =>
    typeof p === "string" ? { t: p } : { t: p.texto, b: !!p.forte },
  ),
});

const metroBR = (mm) =>
  mm == null ? "—" : `${(mm / 1000).toFixed(2).replace(".", ",")} m`;

const nomeDaPeca = (montagem, id) =>
  pecaPorId(montagem.pecas.find((p) => p.id === id)?.catalogoId)?.nome ?? "peça";

/**
 * Os dados da folha, a partir do projeto.
 *
 * A IMAGEM entra por parâmetro, não pelo projeto: ela vive no IndexedDB (ver
 * `imagem.js`) justamente pra não subir pro sync. Quem chama carrega e passa.
 *
 * @param {object} project
 * @param {string|null} imagem data URL da vista capturada, se houver
 * @param {{cores?:object}} opcoes `cores` = personalização de cor por peça (prefs globais)
 * @returns {null | object} `null` quando não há estrutura — e aí a seção some do
 *   Caderno, em vez de imprimir uma folha dizendo "0 peças".
 */
export function dadosDaFolha(project, imagem = null, opcoes = {}) {
  let montagem;
  try {
    // SEM `descartarDesconhecidas`: se o arquivo tem uma peça que este catálogo
    // não conhece, a folha inteira sai de cena. Imprimir a lista MENOS aquela
    // peça é o pior desfecho possível — o galpão carregaria o caminhão com uma
    // peça a menos e ninguém saberia por quê. Sem folha, o técnico pergunta.
    montagem = deJSON(project?.estrutura ?? null);
  } catch {
    return null; // montagem corrompida não derruba o Caderno inteiro
  }
  if (!montagem.pecas.length) return null;

  const r = resumo(montagem);

  // agrupa por LINHA do fabricante (P30 · L30 · R30). O relatório precisa dizer
  // a linha, não só a medida: L30, P30 e R30 são todos 300×300 e encaixam entre
  // si, mas a L30 vale metade da carga da P30 (espeque §2).
  const porLinha = new Map();
  for (const item of r.lista) {
    const linha = pecaPorId(item.catalogoId)?.linha ?? "—";
    const atual = porLinha.get(linha) ?? { linha, qtd: 0, kg: 0 };
    atual.qtd += item.qtd;
    atual.kg += item.pesoTotalKg ?? 0;
    porLinha.set(linha, atual);
  }

  return {
    resumo: r,
    lista: r.lista,
    parafusaria: r.parafusaria,
    juntas: juntas(montagem).length,
    porLinha: [...porLinha.values()].sort((a, b) => a.linha.localeCompare(b.linha)),
    medidas: r.caixa
      ? {
          largura: metroBR(r.caixa.larguraMm),
          altura: metroBR(r.caixa.alturaMm),
          profundidade: metroBR(r.caixa.profundidadeMm),
          texto: `${metroBR(r.caixa.larguraMm)} × ${metroBR(r.caixa.alturaMm)} × ${metroBR(r.caixa.profundidadeMm)}`,
        }
      : null,
    // o peso NUNCA sai como número seco enquanto não for conferido na balança:
    // quem lê o papel não tem como saber que é proxy de catálogo (§3.2)
    pesoTexto: `${r.peso.kg} kg`,
    pesoConferido: r.peso.conferido,
    pesoNota: r.peso.conferido
      ? null
      : "Peso estimado — valores de catálogo, ainda não conferidos na balança.",
    imagem: imagem ?? null,
    imagemEm: project?.estruturaImg?.em ?? null,
    // a legenda do desenho: cor, nome e quantidade, só das peças que estão lá
    legenda: legendaDaEstrutura(montagem, opcoes.cores ?? null),
    // PEÇA DENTRO DE PEÇA vai IMPRESSO. Quem monta no galpão segue o papel, e
    // uma montagem que não fecha no 3D também não fecha no truss.
    conflitos: colisoes(montagem).map((c) => ({
      ...c,
      nomeA: nomeDaPeca(montagem, c.a),
      nomeB: nomeDaPeca(montagem, c.b),
    })),
  };
}

/** plural do português, pra folha impressa não dizer "1 juntas" */
export const plural = (n, sing, plur = `${sing}s`) => `${n} ${n === 1 ? sing : plur}`;

/** as fontes de peso que a folha está usando — a procedência, item a item */
export function procedenciaDoPeso(dados) {
  if (!dados) return [];
  const fontes = new Map();
  for (const item of dados.lista) {
    if (!item.pesoFonte) continue;
    const atual = fontes.get(item.pesoFonte) ?? [];
    atual.push(item.nome);
    fontes.set(item.pesoFonte, atual);
  }
  return [...fontes.entries()].map(([fonte, pecas]) => ({ fonte, pecas }));
}
