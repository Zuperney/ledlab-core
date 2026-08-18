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
// teto de página do PDF: 14.400 pt = 200 in = 5,08 m por lado. Só entra em cena
// se alguém pedir uma folha maior que isso em `ladoMaiorMM`.
export const TETO_PT = 14400;

// Rótulo: piso e teto em pt. O PISO vence quando a tela é pequena na folha —
// rótulo ilegível não serve a ninguém, e um nome transbordando um pouco a tela
// é menos ruim que um nome que ninguém lê. O TETO (~1 cm na folha de 1,20 m)
// impede que o painel grande ganhe um letreiro.
export const ROTULO_PISO = 8;
export const ROTULO_TETO = 28;

// Geometria da folha a partir das telas e das posições da Composição.
// Devolve tudo em PONTOS, já com a origem no canto sup-esq da folha.
export function folhaGeometria(telas, compPos, { ladoMaiorMM = LADO_MAIOR_MM } = {}) {
  const lista = telas || [];
  const { pos, dims, bbox } = compLayout(lista, compPos);
  const vazio = { pageW: 0, pageH: 0, k: 0, itens: [], canvasW: 0, canvasH: 0, reduzida: false };
  if (!lista.length || !bbox.w || !bbox.h) return vazio;

  const pedido = ladoMaiorMM * PT_POR_MM;
  const alvo = Math.min(pedido, TETO_PT);
  const k = alvo / Math.max(bbox.w, bbox.h); // pt por pixel de canvas
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
    pageW: bbox.w * k, pageH: bbox.h * k, k, itens,
    canvasW: Math.round(bbox.w), canvasH: Math.round(bbox.h),
    reduzida: pedido > TETO_PT,
  };
}

// Tamanho do rótulo de uma tela — mesma fórmula do esquema de telas do Caderno
// (pdfCableMap.telasLayoutSvg): limitado pela ALTURA do bloco e pelo comprimento
// do nome, pra o rótulo nunca ficar maior que a tela que ele nomeia.
export function rotuloFs(item) {
  const nome = String(item?.nome || "Tela");
  const porAltura = (item?.h || 0) * 0.26;
  const porLargura = (item?.w || 0) / (Math.max(4, nome.length) * 0.62);
  return Math.max(ROTULO_PISO, Math.min(ROTULO_TETO, porAltura, porLargura));
}

// Teto de canvas do browser (~16.384 px de lado no Chrome/Firefox): a arte é
// desenhada em resolução real, e uma tela acima disso não renderiza. Como a folha
// tem dpi uniforme, capar aqui nunca subresolve — 16.384 px na folha de 1,20 m dá
// 347 dpi, acima dos 300 de impressão.
export const CANVAS_TETO_PX = 16384;
export const maxPxDaTela = (pxW, pxH) => (Math.max(pxW || 0, pxH || 0) > CANVAS_TETO_PX ? CANVAS_TETO_PX : Infinity);

// docDefinition da folha. `cards` = [{ telaId, url }] em resolução nativa; tela
// sem imagem simplesmente não é desenhada (o rótulo dela também não).
// `infoPos` é a posição da caixa de info DENTRO da arte (services/testcardDraw.js):
// o rótulo vetorial vai pro canto oposto, pra os dois não se cobrirem.
export function buildFolhaTestCardsDoc({ project, geo, cards = [], infoPos = "inf-esq" }) {
  const comImagem = new Set(cards.map((c) => c.telaId));
  const itens = (geo?.itens || []).filter((it) => comImagem.has(it.telaId));

  // as imagens primeiro, os rótulos depois: nó com absolutePosition não entra no
  // fluxo, então quem vem depois desenha POR CIMA
  const arte = itens.map((it) => ({
    image: `tc_${it.telaId}`,
    fit: [it.w, it.h], // sempre fit, nunca width cru — a caixa já tem a proporção da tela
    absolutePosition: { x: it.x, y: it.y },
  }));

  const rotulos = itens.flatMap((it) => {
    const fs = rotuloFs(it);
    const cabeRegiao = it.h > fs * 3.4; // 2ª linha só quando sobra altura (portão do esquema do Caderno)
    const regiao = `x ${it.posX} · y ${it.posY} · ${it.pxW}×${it.pxH}`;
    const pad = fs * 0.4;
    // largura estimada (o builder é puro, não mede fonte): avanço médio da Plex
    // bold ~0,55em; a mono da 2ª linha é mais estreita em corpo menor
    const larg = Math.min(it.w, Math.max(
      it.nome.length * fs * 0.55,
      cabeRegiao ? regiao.length * fs * 0.72 * 0.6 : 0,
    ) + pad * 2);
    const alt = (cabeRegiao ? fs * 2.35 : fs * 1.35) + pad;
    // a arte já carrega a caixa de info dela (default "inf-esq") — o rótulo foge
    // pro canto oposto no eixo vertical em vez de brigar por espaço
    const y = String(infoPos).startsWith("sup") ? it.y + it.h - alt : it.y;
    return [
      { canvas: [{ type: "rect", x: 0, y: 0, w: larg, h: alt, color: "#000000", fillOpacity: 0.62 }], absolutePosition: { x: it.x, y } },
      {
        absolutePosition: { x: it.x + pad, y: y + pad * 0.8 },
        stack: [
          { text: it.nome, bold: true, fontSize: fs, color: "#ffffff", lineHeight: 1 },
          ...(cabeRegiao ? [{ text: regiao, font: "PlexMono", fontSize: fs * 0.72, color: "#cbd5e1", lineHeight: 1, margin: [0, fs * 0.25, 0, 0] }] : []),
        ],
      },
    ];
  });

  return {
    // a folha É o canvas: sem margem, sem moldura, sem carimbo. Não é caderno.
    pageSize: { width: geo?.pageW || 1, height: geo?.pageH || 1 },
    pageMargins: [0, 0, 0, 0],
    // imagens por NOME no dicionário — dataURL inline no nó multiplica o embed
    images: Object.fromEntries(cards.map((c) => [`tc_${c.telaId}`, c.url])),
    background: () => ({ canvas: [{ type: "rect", x: 0, y: 0, w: geo?.pageW || 1, h: geo?.pageH || 1, color: "#000000" }] }),
    defaultStyle: { font: "PlexSans", fontSize: 9, color: "#ffffff" },
    info: {
      title: `${project?.name || "Projeto"} — Folha de Test Cards`,
      author: "LedLab Core",
    },
    content: [...arte, ...rotulos],
  };
}
