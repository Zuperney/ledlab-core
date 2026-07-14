// pixelMap.test.js — mapa de pixels exportável (gabinete → porta → coordenada).
import { describe, it, expect } from "vitest";
import { pixelMapRows, pixelMapPorts, pixelMapCSV, PIXELMAP_COLS } from "./pixelMap.js";

// gabinete 128×128 = 16.384 px → budget px @8-bit/60Hz = floor(655360/16384) = 40
const tela2x2 = { cols: 2, rows: 2, gabinete: { resX: 128, resY: 128 }, cabling: { sinal: { rule: "px" } } };

describe("pixelMapRows", () => {
  it("uma linha por gabinete, cobrindo a grade toda", () => {
    const rows = pixelMapRows(tela2x2);
    expect(rows.length).toBe(4);
  });

  it("X/Y = (col-1)·resX, (lin-1)·resY, origem no canto superior-esquerdo (invariante)", () => {
    for (const r of pixelMapRows(tela2x2)) {
      expect(r.x).toBe((r.col - 1) * 128);
      expect(r.y).toBe((r.row - 1) * 128);
      expect(r.w).toBe(128);
      expect(r.h).toBe(128);
    }
  });

  it("cabendo tudo numa porta: todas as 4 posições da grade aparecem, seq 1..4", () => {
    const rows = pixelMapRows(tela2x2);
    expect(new Set(rows.map((r) => r.port))).toEqual(new Set([1]));
    expect(rows.map((r) => r.seq).sort()).toEqual([1, 2, 3, 4]);
    const cells = new Set(rows.map((r) => `${r.col},${r.row}`));
    expect(cells).toEqual(new Set(["1,1", "1,2", "2,1", "2,2"]));
  });

  it("orçamento pequeno divide em várias portas (gabinete grande = 2 gab/porta)", () => {
    // gabinete 512×512 = 262.144 px → budget floor(655360/262144) = 2
    const tela = { cols: 2, rows: 2, gabinete: { resX: 512, resY: 512 }, cabling: { sinal: { rule: "px" } } };
    const rows = pixelMapRows(tela);
    expect(rows.length).toBe(4);
    expect(new Set(rows.map((r) => r.port))).toEqual(new Set([1, 2]));
  });
});

describe("pixelMapPorts", () => {
  it("resumo por porta: início = 1º gabinete do cabo (canto inferior-esquerdo da rota)", () => {
    const ports = pixelMapPorts(tela2x2);
    expect(ports.length).toBe(1);
    const p = ports[0];
    expect(p.count).toBe(4);
    expect(p.startCol).toBe(1);
    expect(p.startRow).toBe(2); // rota começa embaixo à esquerda (linha de baixo)
    expect(p.startX).toBe(0);
    expect(p.startY).toBe(128);
    expect(p.bboxCols).toBe(2);
    expect(p.bboxRows).toBe(2);
  });

  it("bbox e contagem por porta num painel dividido", () => {
    const tela = { cols: 2, rows: 2, gabinete: { resX: 512, resY: 512 }, cabling: { sinal: { rule: "px" } } };
    const ports = pixelMapPorts(tela);
    expect(ports.map((p) => p.count)).toEqual([2, 2]);
    for (const p of ports) expect(p.bboxCols * p.bboxRows).toBeGreaterThanOrEqual(p.count);
  });
});

describe("pixelMapCSV", () => {
  it("cabeçalho pt-BR, separador ';' e uma linha por gabinete (+1 do header)", () => {
    const csv = pixelMapCSV(tela2x2);
    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(PIXELMAP_COLS.map((c) => c[1]).join(";"));
    expect(lines[0]).toContain("Porta;Ordem;Coluna;Linha");
    expect(lines.length).toBe(1 + 4);
    expect(lines[1].split(";").length).toBe(PIXELMAP_COLS.length);
  });
});
