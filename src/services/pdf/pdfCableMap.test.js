import { describe, it, expect } from "vitest";
import { telaMapSvg, screenMapSvg } from "./pdfCableMap.js";

const gab = { resX: 128, resY: 128, pwrMax: 200, fp: 0.9, conector: "true1" };
const tela = { id: "t1", nome: "Main", cols: 6, rows: 4, gabinete: gab, cabling: { sinal: { rule: "px" } } };
const colorOf = (i) => ["#7c3aed", "#0ea5e9", "#f59e0b"][i % 3];
const cr = { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl" };

describe("telaMapSvg (mapa legado por tela → SVG do PDF)", () => {
  const m = telaMapSvg(tela, "sinal", "row-tb-lr", 0, colorOf, cr);

  it("gera SVG com fundo, gabinetes, trajeto e selo de início", () => {
    expect(m.svg).toContain("<svg");
    expect(m.svg).toContain('fill="#0d0d1a"'); // fundo do mapa
    expect((m.svg.match(/<rect/g) || []).length).toBeGreaterThanOrEqual(25); // 24 gabinetes + fundo
    expect(m.svg).toContain("stroke-linejoin"); // trajeto do cabo
    expect(m.svg).toContain("<circle"); // selo de início
  });

  it("respeita o motor de SVG do pdfmake: sem paint-order, sem hex com alpha, sem dominant-baseline", () => {
    expect(m.svg).not.toContain("paint-order");
    expect(m.svg).not.toMatch(/#[0-9a-fA-F]{8}/);
    expect(m.svg).not.toContain("dominant-baseline");
  });

  it("número do gabinete sai em DUAS passadas (contorno + preenchimento)", () => {
    const strokes = (m.svg.match(/stroke="#0a0a14"/g) || []).length;
    const fills = (m.svg.match(/fill="#ffffff"/g) || []).length;
    expect(strokes).toBeGreaterThan(0);
    expect(fills).toBeGreaterThan(strokes); // brancos = números + setas + trajeto
  });

  it("numeração global: offset desloca o selo da porta", () => {
    const m2 = telaMapSvg(tela, "sinal", "row-tb-lr", 4, colorOf, cr);
    expect(m2.svg).toContain(">5</text>"); // 1ª porta da tela = porta 5 do projeto
  });

  it("cabe no documento: largura ≤ 492 e altura ≤ 212 (com padding)", () => {
    const larga = telaMapSvg({ ...tela, cols: 60, rows: 4 }, "sinal", "row-tb-lr", 0, colorOf, cr);
    expect(larga.width).toBeLessThanOrEqual(492);
    expect(larga.height).toBeLessThanOrEqual(212);
  });
});

describe("screenMapSvg (mapa por Screen)", () => {
  const telas = [
    { id: "a", nome: "A", cols: 4, rows: 3, gabinete: gab },
    { id: "b", nome: "B", cols: 4, rows: 3, gabinete: gab },
  ];
  const screen = { id: "s1", nome: "S", telaIds: ["a", "b"], pos: { a: { x: 0, y: 0 }, b: { x: 512, y: 0 } }, sinal: { rule: "px", strategy: "auto" } };

  it("desenha as células das DUAS telas da Screen", () => {
    const m = screenMapSvg(screen, telas, "sinal", "row-tb-lr", colorOf, cr);
    expect((m.svg.match(/<rect/g) || []).length).toBeGreaterThanOrEqual(25); // 24 gabinetes + fundo
  });

  it("Screen sem células (telaIds órfãos) → null, sem quebrar o builder", () => {
    expect(screenMapSvg({ ...screen, telaIds: ["morta"] }, telas, "sinal", "row-tb-lr", colorOf, cr)).toBeNull();
  });
});
