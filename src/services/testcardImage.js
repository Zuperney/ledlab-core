// services/testcardImage.js — o Test Card de cada tela como IMAGEM, pro Caderno.
//
// Por que existe: o caderno de Design vai pra produção e pro cliente, e até aqui
// dizia a grade e a resolução sem MOSTRAR o que vai aparecer no painel. A folha
// de referência de imagem resolve isso — a mesma arte da aba Test Card, com a
// numeração de gabinete e o mapa de cabos que o projeto já configurou.
//
// É o MESMO desenho da aba Test Card / Composição (services/testcardDraw.js), só
// reduzido: o card em resolução real (ex.: 2.560 × 1.440) embutido no PDF pesaria
// megabytes por tela. `maxPx` é o lado maior da imagem gerada — 1.000 px dá ~200
// dpi no slot de 128 mm da folha (duas por linha), que é referência de imagem com
// sobra. PNG de propósito: JPEG borraria a junção e sujaria a cor de um card de
// calibração. O arquivo pra controladora continua saindo na aba Test Card, em
// resolução real; aqui é referência visual.
//
// Precisa de canvas (browser). Sem `document` — motor de PDF rodando em teste
// (node) — devolve lista vazia e o caderno simplesmente não ganha a folha.
import { draw, DEFAULTS } from "./testcardDraw.js";
import { telaPortSlices } from "./screenCabling.js";

export const TESTCARD_MAX_PX = 1000;


// dataURL de UMA tela (PNG). Devolve null se não houver canvas.
export function testCardImage(project, tela, { style, palette, numbering = "row-tb-lr", maxPx = TESTCARD_MAX_PX } = {}) {
  if (typeof document === "undefined") return null;
  const o = { ...DEFAULTS, ...(style || {}) };
  // selo de porta: o número REAL (por Screen) — mesma regra da Composição, pra
  // dois "1" em telas diferentes não virarem mentira no papel
  const slices = o.cableMap === "sinal" || o.cableMap === "ac" ? telaPortSlices(project, tela.id, o.cableMap, numbering) : null;
  const temGab = parseFloat(tela?.gabinete?.resX) > 0;
  const ports = o.cableMap && o.cableMap !== "off" && temGab ? (slices || []).map((s) => s.cells) : null;
  const nums = slices ? slices.map((s) => s.n) : null;

  const c = document.createElement("canvas");
  draw(c, tela, o, ports, palette, nums);
  const k = Math.min(1, maxPx / Math.max(c.width, c.height, 1));
  if (k >= 1) return { url: c.toDataURL("image/png"), pxW: c.width, pxH: c.height };
  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.round(c.width * k));
  small.height = Math.max(1, Math.round(c.height * k));
  const ctx = small.getContext("2d");
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(c, 0, 0, small.width, small.height);
  return { url: small.toDataURL("image/png"), pxW: c.width, pxH: c.height };
}

// as imagens de TODAS as telas do projeto, na ordem delas — o insumo da folha de
// referência (DOM e PDF leem daqui, então a folha é a mesma nos dois).
export function testCardImages(project, opts = {}) {
  const out = [];
  for (const tela of project?.telas || []) {
    const img = testCardImage(project, tela, opts);
    if (img) out.push({ telaId: tela.id, nome: tela.nome || "Tela", cols: tela.cols || 1, rows: tela.rows || 1, gabinete: tela.gabinete?.nome || "", ...img });
  }
  return out;
}
