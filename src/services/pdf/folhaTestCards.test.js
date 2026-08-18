// folhaTestCards.test.js — a folha sem tamanho padrão: geometria, rótulo e guardas.
import { describe, it, expect } from "vitest";
import { folhaGeometria, buildFolhaTestCardsDoc, maxPxDaTela, LADO_MAIOR_MM, TETO_PT, CANVAS_TETO_PX, MARGEM } from "./folhaTestCards.js";

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

  it("lado maior vira 1,20 m e a ARTE segue a proporção do canvas", () => {
    expect(geo.canvasW).toBe(12768);
    expect(geo.canvasH).toBe(1680);
    // a arte cabe na folha de 1,20 m descontada a margem de respiro dos dois lados
    expect(geo.pageW + geo.margem * 2).toBeCloseTo(LADO_MAIOR_MM * PT_MM, 1);
    expect(geo.margem).toBeCloseTo(LADO_MAIOR_MM * PT_MM * MARGEM, 4);
    expect(geo.pageH).toBeCloseTo(1680 * geo.k, 4);
    expect(geo.pageH / geo.pageW).toBeCloseTo(1680 / 12768, 6); // proporção intacta
  });

  it("é o lado MAIOR, não a largura: canvas em pé não vira folha de 4 m", () => {
    const empe = folhaGeometria([tela("a", "Torre", 2, 40)], { a: { x: 0, y: 0 } });
    expect(empe.pageH + empe.margem * 2).toBeCloseTo(LADO_MAIOR_MM * PT_MM, 1);
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
    expect(Math.max(gigante.pageW, gigante.pageH) + gigante.margem * 2).toBeCloseTo(TETO_PT, 1);
    expect(gigante.reduzida).toBe(true);
    expect(folhaGeometria(telas, pos).reduzida).toBe(false);
  });

  it("projeto sem tela não quebra", () => {
    expect(folhaGeometria([], {}).itens).toEqual([]);
    expect(folhaGeometria(undefined, undefined).pageW).toBe(0);
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
  const doc = buildFolhaTestCardsDoc({ project: { name: "Boticario" }, geo, cards, gerado: "18/08/2026" });

  it("página = arte + margem de respiro, sem margem interna de fluxo", () => {
    expect(doc.pageSize).toEqual({ width: geo.pageW + geo.margem * 2, height: geo.pageH + geo.margem * 2 });
    expect(doc.pageMargins).toEqual([0, 0, 0, 0]);
  });

  it("imagem por NOME no dicionário, deslocada pela margem (nunca dataURL no nó)", () => {
    expect(Object.keys(doc.images)).toEqual(["tc_central", "tc_topo", "tc_tira"]);
    const arte = doc.content.filter((n) => n.image);
    expect(arte.length).toBe(3);
    expect(arte[0]).toMatchObject({ image: "tc_central", absolutePosition: { x: geo.margem } });
    expect(JSON.stringify(doc.content)).not.toContain("data:image/png");
  });

  it("SEM rótulo por cima da arte — era o que poluía a folha", () => {
    const j = JSON.stringify(doc.content);
    expect(j).not.toContain("Painel Central"); // o nome está DENTRO do card, desenhado na arte
    expect(j).not.toContain("Testeira Topo");
    expect(doc.content.filter((n) => n.canvas)).toEqual([]); // nenhuma plaquinha
  });

  it("uma linha de identificação na margem: projeto, canvas, tamanho e data", () => {
    const j = JSON.stringify(doc.content);
    expect(j).toContain("Boticario");
    expect(j).toContain("canvas 12.768 × 1.680 px");
    expect(j).toContain("18/08/2026");
    expect(j).toContain("1,20"); // o tamanho físico da folha, em metros
  });

  it("tela sem imagem desenhada não entra na folha", () => {
    const parcial = buildFolhaTestCardsDoc({ project: {}, geo, cards: [cards[0]] });
    expect(parcial.content.filter((n) => n.image).length).toBe(1);
  });

  it("sem cards, a folha nasce vazia em vez de explodir", () => {
    const vazia = buildFolhaTestCardsDoc({ project: {}, geo: folhaGeometria([], {}), cards: [] });
    expect(vazia.content).toEqual([]);
    expect(vazia.pageSize).toEqual({ width: 1, height: 1 });
  });
});
