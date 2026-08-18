// folhaTestCards.test.js — a folha sem tamanho padrão: geometria, rótulo e guardas.
import { describe, it, expect } from "vitest";
import { folhaGeometria, rotuloFs, buildFolhaTestCardsDoc, maxPxDaTela, LADO_MAIOR_MM, TETO_PT, ROTULO_PISO, ROTULO_TETO, CANVAS_TETO_PX } from "./folhaTestCards.js";

// projeto real do Boticário: Unilumin P2.9 (168 px por gabinete), canvas 12.768 × 1.680
const gab = { resX: "168", resY: "168", dimW: "500", dimH: "500" };
const tela = (id, nome, cols, rows) => ({ id, nome, cols, rows, gabinete: gab });
const telas = [
  tela("central", "Painel Central", 32, 9),
  tela("topo", "Testeira Topo", 76, 1),
  tela("tira", "Tira 2 | Dir", 12, 1),
];
const pos = { central: { x: 0, y: 168 }, topo: { x: 0, y: 0 }, tira: { x: 5376, y: 1512 } };
const PT_MM = 72 / 25.4;

describe("folhaGeometria — a folha se molda ao canvas", () => {
  const geo = folhaGeometria(telas, pos);

  it("lado maior vira 1,20 m e o outro segue a proporção do canvas", () => {
    expect(geo.canvasW).toBe(12768);
    expect(geo.canvasH).toBe(1680);
    expect(geo.pageW).toBeCloseTo(LADO_MAIOR_MM * PT_MM, 1); // 3.401,6 pt
    expect(geo.pageH).toBeCloseTo(1680 * geo.k, 4);
    expect(geo.pageH / geo.pageW).toBeCloseTo(1680 / 12768, 6); // proporção intacta
    expect(geo.pageH / PT_MM).toBeCloseTo(158, 0); // 158 mm de altura
  });

  it("é o lado MAIOR, não a largura: canvas em pé não vira folha de 4 m", () => {
    const empe = folhaGeometria([tela("a", "Torre", 2, 40)], { a: { x: 0, y: 0 } });
    expect(empe.pageH).toBeCloseTo(LADO_MAIOR_MM * PT_MM, 1);
    expect(empe.pageW).toBeLessThan(empe.pageH);
  });

  it("cada tela cai na posição da Composição, na escala da folha", () => {
    const central = geo.itens.find((i) => i.telaId === "central");
    expect(central.w).toBeCloseTo(5376 * geo.k, 4); // 1.432 pt
    expect(central.h).toBeCloseTo(1512 * geo.k, 4); // 403 pt
    expect(central.x).toBe(0);
    expect(central.y).toBeCloseTo(168 * geo.k, 4);
    // a fita ocupa a folha inteira na largura
    expect(geo.itens.find((i) => i.telaId === "topo").w).toBeCloseTo(geo.pageW, 4);
  });

  it("guarda o teto de página do PDF (200 in) quando pedem folha gigante", () => {
    const gigante = folhaGeometria(telas, pos, { ladoMaiorMM: 9000 });
    expect(Math.max(gigante.pageW, gigante.pageH)).toBeCloseTo(TETO_PT, 1);
    expect(gigante.reduzida).toBe(true);
    expect(folhaGeometria(telas, pos).reduzida).toBe(false);
  });

  it("projeto sem tela não quebra", () => {
    expect(folhaGeometria([], {}).itens).toEqual([]);
    expect(folhaGeometria(undefined, undefined).pageW).toBe(0);
  });
});

describe("rotuloFs — legível sem virar letreiro", () => {
  const { itens } = folhaGeometria(telas, pos);
  const de = (id) => rotuloFs(itens.find((i) => i.telaId === id));

  it("painel grande trava no teto (não vira letreiro)", () => {
    expect(de("central")).toBe(ROTULO_TETO);
  });

  it("fita fina cai pela ALTURA dela — o rótulo não fica maior que a tela", () => {
    const tira = itens.find((i) => i.telaId === "tira");
    expect(de("tira")).toBeCloseTo(tira.h * 0.26, 4); // ~11,6 pt ≈ 4 mm impressos
    expect(de("tira")).toBeLessThan(tira.h);
  });

  it("nome comprido encolhe pela largura", () => {
    const curto = rotuloFs({ nome: "A", w: 100, h: 400 });
    const longo = rotuloFs({ nome: "Painel Central de Fundo do Palco", w: 100, h: 400 });
    expect(longo).toBeLessThan(curto);
  });

  it("tela minúscula na folha ainda ganha o PISO — rótulo ilegível não serve", () => {
    expect(rotuloFs({ nome: "Mini", w: 6, h: 6 })).toBe(ROTULO_PISO);
  });
});

describe("maxPxDaTela — guarda do canvas do browser", () => {
  it("tela normal vai NATIVA (é o ponto da folha)", () => {
    expect(maxPxDaTela(5376, 1512)).toBe(Infinity);
    expect(maxPxDaTela(12768, 168)).toBe(Infinity); // a testeira do Boticário passa inteira
  });

  it("tela acima do teto de canvas é capada em vez de não renderizar", () => {
    expect(maxPxDaTela(20000, 500)).toBe(CANVAS_TETO_PX);
    // 16.384 px na folha de 1,20 m ainda dá 347 dpi — capar não subresolve nada
    expect(CANVAS_TETO_PX / (LADO_MAIOR_MM / 25.4)).toBeGreaterThan(300);
  });
});

describe("buildFolhaTestCardsDoc", () => {
  const geo = folhaGeometria(telas, pos);
  const cards = telas.map((t) => ({ telaId: t.id, url: `data:image/png;base64,${t.id}` }));
  const doc = buildFolhaTestCardsDoc({ project: { name: "Boticario" }, geo, cards });

  it("página do tamanho da folha, sem margem, fundo preto", () => {
    expect(doc.pageSize).toEqual({ width: geo.pageW, height: geo.pageH });
    expect(doc.pageMargins).toEqual([0, 0, 0, 0]);
    expect(doc.background().canvas[0]).toMatchObject({ w: geo.pageW, h: geo.pageH, color: "#000000" });
  });

  it("imagem por NOME no dicionário, posicionada em absolutePosition (nunca dataURL no nó)", () => {
    expect(Object.keys(doc.images)).toEqual(["tc_central", "tc_topo", "tc_tira"]);
    const arte = doc.content.filter((n) => n.image);
    expect(arte.length).toBe(3);
    expect(arte[0]).toMatchObject({ image: "tc_central", absolutePosition: { x: 0 } });
    expect(JSON.stringify(doc.content)).not.toContain("data:image/png");
  });

  it("rótulo vem DEPOIS da arte (desenha por cima) e traz nome + região", () => {
    const j = JSON.stringify(doc.content);
    expect(j.indexOf("Painel Central")).toBeGreaterThan(j.indexOf('"image":"tc_tira"'));
    expect(j).toContain("x 0 · y 168 · 5376×1512"); // região da tela no canvas
  });

  it("tela sem imagem desenhada não vira rótulo órfão", () => {
    const parcial = buildFolhaTestCardsDoc({ project: {}, geo, cards: [cards[0]] });
    expect(parcial.content.filter((n) => n.image).length).toBe(1);
    expect(JSON.stringify(parcial.content)).not.toContain("Testeira Topo");
  });

  it("rótulo foge da caixa de info da arte: info em cima → rótulo embaixo", () => {
    const emCima = buildFolhaTestCardsDoc({ project: {}, geo, cards, infoPos: "sup-esq" });
    const central = geo.itens.find((i) => i.telaId === "central");
    const placas = (d) => d.content.filter((n) => n.canvas).map((n) => n.absolutePosition.y);
    expect(placas(doc)).toContain(central.y); // default (info embaixo): rótulo no topo
    expect(placas(emCima).some((y) => y > central.y)).toBe(true); // info em cima: rótulo desce
  });

  it("sem cards, a folha nasce vazia em vez de explodir", () => {
    const vazia = buildFolhaTestCardsDoc({ project: {}, geo: folhaGeometria([], {}), cards: [] });
    expect(vazia.content).toEqual([]);
    expect(vazia.pageSize).toEqual({ width: 1, height: 1 });
  });
});
