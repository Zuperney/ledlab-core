import { describe, it, expect } from "vitest";
import { telaMapSvg, screenMapSvg, telasLayoutSvg } from "./pdfCableMap.js";
import { cablePorts } from "../cabling.js";
import { tint } from "../cableScene.js";

const gab = { resX: 128, resY: 128, pwrMax: 200, fp: 0.9, conector: "true1" };
const tela = { id: "t1", nome: "Main", cols: 6, rows: 4, gabinete: gab, cabling: { sinal: { rule: "px" } } };
const colorOf = (i) => ["#7c3aed", "#0ea5e9", "#f59e0b"][i % 3];
const cr = { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl" };

describe("telaMapSvg (mapa legado por tela → SVG do PDF, estilo SmartLCT)", () => {
  const m = telaMapSvg(tela, "sinal", "row-tb-lr", 0, colorOf, cr);

  it("gera SVG com moldura clara, gabinetes pastel, serpentina, entrada e fim", () => {
    expect(m.svg).toContain("<svg");
    expect(m.svg).toContain('fill="#ffffff"'); // fundo papel
    expect(m.svg).toContain('stroke="#e2e8f0"'); // moldura
    expect((m.svg.match(/<rect/g) || []).length).toBeGreaterThanOrEqual(25); // 24 gabinetes + fundo
    expect(m.svg).toContain("<line"); // borda branca da região
    expect(m.svg).toContain('stroke="#1e40af"'); // serpentina azul
    expect(m.svg).toContain('fill="#16a34a"'); // selo verde de entrada
    expect(m.svg).toContain('fill="#dc2626"'); // ponto vermelho de fim
  });

  it("pastel SÓLIDO da cor do cabo — sem fill-opacity, sem fundo escuro, sem 'N gab'", () => {
    expect(m.svg).toContain(`fill="${tint("#7c3aed")}"`); // região do cabo 1
    expect(m.svg).not.toContain('fill-opacity="0.15"');
    expect(m.svg).not.toContain("#0d0d1a");
    expect(m.svg).not.toContain(" gab</text>"); // contagem vive na tabela de portas
  });

  it("serpentina na ORDEM ELÉTRICA: rota nasce na entrada, fim ganha o ponto vermelho", () => {
    const ports = cablePorts(tela, "sinal", "row-tb-lr");
    const first = ports[0][0], last = ports[0][ports[0].length - 1];
    const ctr = (c) => [c.c * 40 + 20, c.r * 40 + 20]; // CELL=40, escala 1 no 6×4
    const [fx, fy] = ctr(first), [lx, ly] = ctr(last);
    expect(m.svg).toContain(`d="M${fx} ${fy} L`);
    expect(m.svg).toContain(`<circle cx="${lx}" cy="${ly}"`);
  });

  it("setas presentes em célula grande, AUSENTES quando a célula encolhe no papel", () => {
    expect(m.svg).toMatch(/Z" fill="#1e40af"/); // seta = path fechado azul
    const larga = telaMapSvg({ ...tela, cols: 60, rows: 4 }, "sinal", "row-tb-lr", 0, colorOf, cr);
    expect(larga.svg).not.toMatch(/Z" fill="#1e40af"/); // u = 8 < 9 → sem setas
    expect(larga.svg).toContain('stroke="#1e40af"'); // mas a rota fina fica
  });

  it("cabo de 1 gabinete: o selo basta — sem ponto vermelho em cima", () => {
    const um = telaMapSvg({ ...tela, cols: 1, rows: 1 }, "sinal", "row-tb-lr", 0, colorOf, cr);
    expect(um.svg).toContain('fill="#16a34a"');
    expect(um.svg).not.toContain("#dc2626");
  });

  it("respeita o motor de SVG do pdfmake: sem paint-order, sem hex com alpha, sem dominant-baseline", () => {
    expect(m.svg).not.toContain("paint-order");
    expect(m.svg).not.toMatch(/#[0-9a-fA-F]{8}/); // pastel é hex REAL via tint(), nunca alpha
    expect(m.svg).not.toContain("dominant-baseline");
  });

  it("número do selo em UMA passada (branco sobre verde dispensa contorno)", () => {
    expect(m.svg).not.toContain('stroke="#0a0a14"');
    expect(m.svg).toContain('fill="#ffffff">1</text>');
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

describe("telasLayoutSvg (esquema das telas na disposição da Composição — seção Vídeo)", () => {
  const telas = [
    { id: "t1", nome: "MAIN <STAGE> & CIA", cols: 20, rows: 8, gabinete: { ...gab, nome: "Absen" } },
    { id: "t2", nome: "SIDE", cols: 6, rows: 4, gabinete: { ...gab, nome: "ROE" } },
  ];
  const m = telasLayoutSvg(telas, undefined, colorOf);

  it("sem comp.pos: fallback lado a lado — bbox = larguras somadas × altura máxima", () => {
    expect((m.svg.match(/<rect/g) || []).length).toBe(3); // fundo + 2 telas
    expect(m.linW).toBe(20 * 128 + 6 * 128);
    expect(m.linH).toBe(8 * 128);
  });

  it("com comp.pos: o bbox segue a disposição salva", () => {
    // t2 embaixo de t1 → largura = só a da t1; altura = 8 + 4 linhas
    const pos = { t1: { x: 0, y: 0 }, t2: { x: 0, y: 8 * 128 } };
    const c = telasLayoutSvg(telas, pos, colorOf);
    expect(c.linW).toBe(20 * 128);
    expect(c.linH).toBe(12 * 128);
  });

  it("tela sobreposta ganha contorno vermelho (mesma segurança da Composição)", () => {
    const pos = { t1: { x: 0, y: 0 }, t2: { x: 10, y: 10 } }; // t2 invade t1
    const c = telasLayoutSvg(telas, pos, colorOf);
    expect(c.svg).toContain('stroke="#ef4444"');
  });

  it("nome com &/< é escapado (nome de tela é texto livre)", () => {
    expect(m.svg).toContain("MAIN &lt;STAGE&gt; &amp; CIA");
    expect(m.svg).not.toContain("<STAGE>");
  });

  it("cor por MODELO (mesma sequência dos chips), não por índice de tela", () => {
    expect(m.svg).toContain('stroke="#7c3aed"'); // Absen = 1º modelo
    expect(m.svg).toContain('stroke="#0ea5e9"'); // ROE = 2º modelo
  });

  it("sem telas → null", () => {
    expect(telasLayoutSvg([], undefined, colorOf)).toBeNull();
  });
});

describe("screenMapSvg (mapa por Screen)", () => {
  const telas = [
    { id: "a", nome: "A", cols: 4, rows: 3, gabinete: gab },
    { id: "b", nome: "B", cols: 4, rows: 3, gabinete: gab },
  ];
  const screen = { id: "s1", nome: "S", telaIds: ["a", "b"], pos: { a: { x: 0, y: 0 }, b: { x: 512, y: 0 } }, sinal: { rule: "px", strategy: "auto" } };

  it("desenha as células das DUAS telas da Screen, com serpentina e entrada", () => {
    const m = screenMapSvg(screen, telas, "sinal", "row-tb-lr", colorOf, cr);
    expect((m.svg.match(/<rect/g) || []).length).toBeGreaterThanOrEqual(25); // 24 gabinetes + fundo
    expect(m.svg).toContain('stroke="#1e40af"'); // serpentina atravessa a Screen
    expect(m.svg).toContain('fill="#16a34a"'); // selo de entrada
  });

  it("Screen sem células (telaIds órfãos) → null, sem quebrar o builder", () => {
    expect(screenMapSvg({ ...screen, telaIds: ["morta"] }, telas, "sinal", "row-tb-lr", colorOf, cr)).toBeNull();
  });
});
