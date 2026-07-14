// services/pixelMap.js — mapa de pixels exportável: gabinete → porta → coordenada.
// Fecha o ciclo projeto→operação: o operador transcreve isto no NovaLCT (Novastar)
// ou no Tessera (Brompton) em vez de redesenhar tudo na régua no local.
//
// Uma linha por gabinete, na ordem da rota do SINAL (porta, depois sequência no
// cabo). Coordenadas em pixels com origem no CANTO SUPERIOR-ESQUERDO (padrão dos
// dois softwares) — independente do início inferior-esquerdo da rota do cabo.
import { signalRoute } from "./cabling.js";

export function pixelMapRows(tela, numbering = "row-tb-lr") {
  const g = tela?.gabinete || {};
  const resX = parseFloat(g.resX) || 0;
  const resY = parseFloat(g.resY) || 0;
  const rows = [];
  signalRoute(tela, numbering).forEach((port, pi) => {
    port.forEach((cell, seq) => {
      rows.push({
        port: pi + 1,        // porta / saída (1-based, como o operador vê)
        seq: seq + 1,        // ordem do gabinete dentro do cabo daquela porta
        col: cell.c + 1,     // coluna na grade (1-based)
        row: cell.r + 1,     // linha na grade (1-based)
        x: cell.c * resX,    // X do canto sup-esq do gabinete (px)
        y: cell.r * resY,    // Y do canto sup-esq do gabinete (px)
        w: resX,
        h: resY,
      });
    });
  });
  return rows;
}

// resumo por porta (1 linha por porta) — versão compacta pro relatório impresso,
// que aguenta projetos grandes sem virar milhares de linhas. Início = 1º gabinete
// do cabo (canto de início configurável da rota); bbox = retângulo que a porta cobre.
export function pixelMapPorts(tela, numbering = "row-tb-lr") {
  const g = tela?.gabinete || {};
  const resX = parseFloat(g.resX) || 0;
  const resY = parseFloat(g.resY) || 0;
  return signalRoute(tela, numbering).map((port, pi) => {
    let minC = Infinity, maxC = -Infinity, minR = Infinity, maxR = -Infinity;
    port.forEach((cell) => {
      if (cell.c < minC) minC = cell.c;
      if (cell.c > maxC) maxC = cell.c;
      if (cell.r < minR) minR = cell.r;
      if (cell.r > maxR) maxR = cell.r;
    });
    const start = port[0] || { c: 0, r: 0 };
    return {
      port: pi + 1,
      count: port.length,
      startCol: start.c + 1,
      startRow: start.r + 1,
      startX: start.c * resX,
      startY: start.r * resY,
      bboxCols: port.length ? maxC - minC + 1 : 0,
      bboxRows: port.length ? maxR - minR + 1 : 0,
    };
  });
}

// colunas do CSV/tabela (chave interna + rótulo pt-BR)
export const PIXELMAP_COLS = [
  ["port", "Porta"],
  ["seq", "Ordem"],
  ["col", "Coluna"],
  ["row", "Linha"],
  ["x", "X (px)"],
  ["y", "Y (px)"],
  ["w", "Largura"],
  ["h", "Altura"],
];

// CSV pt-BR: separador ';' (o Excel brasileiro não joga tudo numa coluna só) e
// quebra CRLF. Sem decimais nos valores, então nada a escapar.
export function pixelMapCSV(tela, numbering = "row-tb-lr", sep = ";") {
  const head = PIXELMAP_COLS.map((c) => c[1]).join(sep);
  const body = pixelMapRows(tela, numbering).map((r) => PIXELMAP_COLS.map((c) => r[c[0]]).join(sep));
  return [head, ...body].join("\r\n");
}
