// services/pdf/folhaTestCards.js — a FOLHA DE TEST CARDS: uma folha só, sem
// tamanho padrão, com a proporção do canvas de conteúdo e cada Test Card na
// RESOLUÇÃO NATIVA, na posição exata da Composição.
//
// Por que existe: o Caderno é A4 e sempre vai ser — nele o card é referência de
// imagem, uma tela por página. Mas o painel real raramente cabe numa proporção de
// papel (o canvas do Boticário é 7,6:1), e reduzir a arte pra caber numa folha
// padrão desperdiça a folha E o pixel. Aqui a FOLHA é que se molda ao painel.
//
// Por que arquivo separado, e não uma página do Caderno: o pdfmake aceita UM
// pageSize por documento (a orientação vira no meio, o tamanho não). Não é
// escolha de gosto — folha fora do padrão não cabe no mesmo PDF.
//
// PURO de propósito, como o pdfRelatorio.js: (telas + posições + imagens) →
// docDefinition. Quem tem canvas é o pdfEngine, no browser.
import { compLayout } from "../layout.js";

const PT_POR_MM = 72 / 25.4;

// Lado MAIOR da folha (não "largura"): canvas em pé não vira folha de 4 m de
// altura. 1,20 m é largura de rolo de plotter — imprime em qualquer lugar.
export const LADO_MAIOR_MM = 1200;
// margem de respiro em volta da arte, em fração do lado maior. A arte mantém a
// proporção exata do canvas; a folha é que ganha a borda — e é nela que mora a
// linha de identificação. Sem isso a arte morria colada no corte do plotter.
export const MARGEM = 0.012;
// teto de página do PDF: 14.400 pt = 200 in = 5,08 m por lado. Só entra em cena
// se alguém pedir uma folha maior que isso em `ladoMaiorMM`.
export const TETO_PT = 14400;

// Geometria da folha a partir das telas e das posições da Composição.
// Devolve tudo em PONTOS, já com a origem no canto sup-esq da folha.
export function folhaGeometria(telas, compPos, { ladoMaiorMM = LADO_MAIOR_MM } = {}) {
  const lista = telas || [];
  const { pos, dims, bbox } = compLayout(lista, compPos);
  const vazio = { pageW: 0, pageH: 0, k: 0, itens: [], canvasW: 0, canvasH: 0, margem: 0, reduzida: false };
  if (!lista.length || !bbox.w || !bbox.h) return vazio;

  const pedido = ladoMaiorMM * PT_POR_MM;
  const alvo = Math.min(pedido, TETO_PT);
  const margem = alvo * MARGEM;
  const k = (alvo - margem * 2) / Math.max(bbox.w, bbox.h); // pt por pixel de canvas
  const itens = lista.map((t) => {
    const p = pos[t.id], d = dims[t.id];
    return {
      telaId: t.id,
      nome: t.nome || "Tela",
      x: (p.x - bbox.minX) * k, y: (p.y - bbox.minY) * k,
      w: d.w * k, h: d.h * k,
      pxW: d.w, pxH: d.h,                                   // resolução real da tela
      posX: Math.round(p.x - bbox.minX), posY: Math.round(p.y - bbox.minY), // região no canvas
    };
  });
  return {
    pageW: bbox.w * k, pageH: bbox.h * k, k, itens, margem,
    canvasW: Math.round(bbox.w), canvasH: Math.round(bbox.h),
    reduzida: pedido > TETO_PT,
  };
}

// Teto de canvas do browser (~16.384 px de lado no Chrome/Firefox): a arte é
// desenhada em resolução real, e uma tela acima disso não renderiza. Como a folha
// tem dpi uniforme, capar aqui nunca subresolve — 16.384 px na folha de 1,20 m dá
// 347 dpi, acima dos 300 de impressão.
export const CANVAS_TETO_PX = 16384;
export const maxPxDaTela = (pxW, pxH) => (Math.max(pxW || 0, pxH || 0) > CANVAS_TETO_PX ? CANVAS_TETO_PX : Infinity);

// docDefinition da folha. `cards` = [{ telaId, url }] em resolução nativa; tela
// sem imagem simplesmente não é desenhada.
//
// SEM rótulo por cima da arte (era o que poluía a folha, 18/08): cada card já
// carrega a identificação DENTRO dele (a caixa de info do próprio Test Card), e
// o que faltava — resolução por tela, tamanho em metros, manual de conteúdo —
// mora agora na folha de Conteúdo do caderno de Design. Aqui é só a arte, com
// uma linha discreta de identificação na margem.
export function buildFolhaTestCardsDoc({ project, geo, cards = [], gerado = "" }) {
  const comImagem = new Set(cards.map((c) => c.telaId));
  const itens = (geo?.itens || []).filter((it) => comImagem.has(it.telaId));
  const m = geo?.margem || 0;

  const arte = itens.map((it) => ({
    image: `tc_${it.telaId}`,
    fit: [it.w, it.h], // sempre fit, nunca width cru — a caixa já tem a proporção da tela
    absolutePosition: { x: m + it.x, y: m + it.y },
  }));

  // identificação na margem de baixo: quem é, qual o canvas e em que escala.
  // Folha técnica sem nome vira folha de ninguém — mas uma linha basta.
  const fs = Math.max(6, Math.min(11, (geo?.pageW || 0) * 0.0032));
  const selo = !geo?.pageW ? [] : [{
    absolutePosition: { x: m, y: (geo.pageH || 0) + m + (m - fs) / 2 },
    columns: [
      { width: "*", text: project?.name || "Projeto", bold: true, fontSize: fs, color: "#334155" },
      { width: "auto", text: [
        `canvas ${(geo.canvasW || 0).toLocaleString("pt-BR")} × ${(geo.canvasH || 0).toLocaleString("pt-BR")} px`,
        // o tamanho da FOLHA impressa (arte + margem), que é o que vai pro plotter
        `${((geo.pageW + m * 2) / (72 / 25.4) / 1000).toFixed(2).replace(".", ",")} × ${((geo.pageH + m * 2) / (72 / 25.4) / 1000).toFixed(2).replace(".", ",")} m`,
        gerado,
      ].filter(Boolean).join("   ·   "), font: "PlexMono", fontSize: fs * 0.92, color: "#64748b", alignment: "right" },
    ],
  }];

  return {
    // a folha É o canvas, com uma margem de respiro em volta. Sem moldura, sem
    // carimbo: não é caderno.
    pageSize: { width: (geo?.pageW || 1) + m * 2, height: (geo?.pageH || 1) + m * 2 },
    pageMargins: [0, 0, 0, 0],
    // imagens por NOME no dicionário — dataURL inline no nó multiplica o embed
    images: Object.fromEntries(cards.map((c) => [`tc_${c.telaId}`, c.url])),
    defaultStyle: { font: "PlexSans", fontSize: 9, color: "#334155" },
    info: {
      title: `${project?.name || "Projeto"} — Folha de Test Cards`,
      author: "LedLab Core",
    },
    content: [...arte, ...selo],
  };
}
