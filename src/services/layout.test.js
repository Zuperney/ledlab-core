// layout.test.js — detecção de sobreposição da Composição (segurança de campo)
// e o layout puro da Composição (fonte única da aba, do Caderno e do PDF).
import { describe, it, expect } from "vitest";
import { overlappingIds, reorder, packByModel, compLayout, regionEdges, snapAxis, gapsAround } from "./layout.js";

const r = (id, x, y, w, h) => ({ id, x, y, w, h });

describe("compLayout — posições da Composição + fallback + bbox", () => {
  const tela = (id, cols, rows) => ({ id, cols, rows, gabinete: { resX: 100, resY: 100 } });
  const telas = [tela("a", 4, 2), tela("b", 2, 3)];

  it("sem posição salva: fila lado a lado no y=0", () => {
    const { pos, bbox } = compLayout(telas, undefined);
    expect(pos.a).toEqual({ x: 0, y: 0 });
    expect(pos.b).toEqual({ x: 400, y: 0 });
    expect(bbox).toEqual({ minX: 0, minY: 0, w: 600, h: 300 });
  });

  it("posição parcial: a salva vale, a nova entra depois da mais à direita", () => {
    const { pos } = compLayout(telas, { a: { x: 100, y: 50 } });
    expect(pos.a).toEqual({ x: 100, y: 50 });
    expect(pos.b).toEqual({ x: 500, y: 0 }); // 100 + 400 (borda direita da salva)
  });

  it("bbox segue as posições salvas (empilhado = mais alto que largo)", () => {
    const { bbox } = compLayout(telas, { a: { x: 0, y: 0 }, b: { x: 0, y: 200 } });
    expect(bbox).toEqual({ minX: 0, minY: 0, w: 400, h: 500 });
  });

  it("posição salva de tela removida não vaza; sem telas → bbox zero", () => {
    const { pos, bbox } = compLayout([], { fantasma: { x: 9, y: 9 } });
    expect(pos).toEqual({});
    expect(bbox).toEqual({ minX: 0, minY: 0, w: 0, h: 0 });
  });

  it("gabinete vazio assume 128 px (mesma regra do draw)", () => {
    const { dims } = compLayout([{ id: "x", cols: 2, rows: 1 }], undefined);
    expect(dims.x).toEqual({ w: 256, h: 128 });
  });
});

describe("regionEdges — contorno real do grupo de células de um cabo", () => {
  const cell = (x, y) => ({ x, y, w: 10, h: 10 });

  it("uma célula → 4 arestas", () => {
    expect(regionEdges([cell(0, 0)])).toHaveLength(4);
  });

  it("dominó 2×1 → 6 arestas (a interna some)", () => {
    const edges = regionEdges([cell(0, 0), cell(10, 0)]);
    expect(edges).toHaveLength(6);
    // a aresta compartilhada (x=10 vertical) não pode aparecer
    expect(edges.some((e) => e.x1 === 10 && e.x2 === 10 && e.y1 === 0 && e.y2 === 10)).toBe(false);
  });

  it("L de 3 células → 8 arestas (contorno segue a forma, não o bbox)", () => {
    // (0,0) (10,0) e (0,10): bbox teria 4 arestas; o L tem 8 segmentos de borda
    expect(regionEdges([cell(0, 0), cell(10, 0), cell(0, 10)])).toHaveLength(8);
  });

  it("vazio → sem arestas", () => {
    expect(regionEdges([])).toEqual([]);
    expect(regionEdges(undefined)).toEqual([]);
  });
});

describe("overlappingIds", () => {
  it("lado a lado (bordas encostadas) NÃO conta como sobreposição", () => {
    const set = overlappingIds([r("a", 0, 0, 100, 100), r("b", 100, 0, 100, 100)]);
    expect(set.size).toBe(0);
  });

  it("invasão de 1px marca as duas telas", () => {
    const set = overlappingIds([r("a", 0, 0, 100, 100), r("b", 99, 0, 100, 100)]);
    expect(set.has("a")).toBe(true);
    expect(set.has("b")).toBe(true);
  });

  it("tela contida dentro de outra marca as duas", () => {
    const set = overlappingIds([r("a", 0, 0, 200, 200), r("b", 50, 50, 20, 20)]);
    expect(set.size).toBe(2);
  });

  it("telas separadas ficam limpas", () => {
    const set = overlappingIds([r("a", 0, 0, 100, 100), r("b", 500, 500, 100, 100)]);
    expect(set.size).toBe(0);
  });

  it("só o par sobreposto é marcado (terceira tela fica fora)", () => {
    const set = overlappingIds([r("a", 0, 0, 100, 100), r("b", 50, 50, 100, 100), r("c", 1000, 0, 100, 100)]);
    expect(set.has("a")).toBe(true);
    expect(set.has("b")).toBe(true);
    expect(set.has("c")).toBe(false);
  });

  it("empilhamento vertical encostado (topo/base) também é permitido", () => {
    const set = overlappingIds([r("a", 0, 0, 100, 100), r("b", 0, 100, 100, 100)]);
    expect(set.size).toBe(0);
  });
});

describe("reorder (drag & drop de telas)", () => {
  const L = ["A", "B", "C", "D"];
  it("move o topo pro fim", () => expect(reorder(L, 0, 4)).toEqual(["B", "C", "D", "A"]));
  it("move o topo pro meio (entre B e C)", () => expect(reorder(L, 0, 2)).toEqual(["B", "A", "C", "D"]));
  it("move o fim pro topo", () => expect(reorder(L, 3, 0)).toEqual(["D", "A", "B", "C"]));
  it("move o meio pra baixo", () => expect(reorder(L, 1, 3)).toEqual(["A", "C", "B", "D"]));
  it("soltar no próprio lugar não muda nada (insertion == from e from+1)", () => {
    expect(reorder(L, 1, 1)).toEqual(L);
    expect(reorder(L, 1, 2)).toEqual(L);
  });
  it("cobre a lista toda sem perder/duplicar item, pra qualquer from×insertion", () => {
    for (let from = 0; from < L.length; from++)
      for (let ins = 0; ins <= L.length; ins++)
        expect([...reorder(L, from, ins)].sort()).toEqual([...L].sort());
  });
  it("índice de origem inválido devolve a mesma lista", () => expect(reorder(L, -1, 2)).toBe(L));
});

// O caso que originou a função: projeto real "Colação de Grau" (VX1000). O usuário
// montou o canvas do NovaLCT NA MÃO — 4 tiras juntas, Central colada nelas, as duas
// IMAGs embaixo = 2304×1344. A regra "agrupa por modelo, empilha faixas" tem que
// chegar sozinha no mesmo tamanho.
describe("packByModel — canvas do processador", () => {
  const TIRA = "gab-128x256", IMAG = "gab-192x192";
  const colacao = [
    { id: "imagD", w: 1152, h: 576, model: IMAG },
    { id: "imagE", w: 1152, h: 576, model: IMAG },
    { id: "t4", w: 128, h: 768, model: TIRA },
    { id: "t3", w: 128, h: 768, model: TIRA },
    { id: "t2", w: 128, h: 768, model: TIRA },
    { id: "t1", w: 128, h: 768, model: TIRA },
    { id: "central", w: 1280, h: 768, model: TIRA },
  ];

  it("chega no MESMO canvas que o operador montou na mão: 2304×1344", () => {
    const { w, h } = packByModel(colacao);
    expect(w).toBe(2304); // faixa das IMAGs: 1152 + 1152
    expect(h).toBe(1344); // 576 (IMAGs) + 768 (tiras + Central)
  });

  it("junta as telas do mesmo modelo lado a lado — é o que permite a corrente cruzar tela", () => {
    const { pos } = packByModel(colacao);
    expect(pos.t4).toEqual({ x: 0, y: 576 });
    expect(pos.t3).toEqual({ x: 128, y: 576 });
    expect(pos.t2).toEqual({ x: 256, y: 576 });
    expect(pos.t1).toEqual({ x: 384, y: 576 });
    expect(pos.central).toEqual({ x: 512, y: 576 }); // colada na última tira
    // as 4 tiras encostadas viram um retângulo de 512×768 = 393.216 px = 60% de
    // UMA porta. Espalhadas (como no canvas de conteúdo) seriam 210% e estourariam.
  });

  it("cada modelo ganha sua faixa: IMAG em cima, tiras embaixo (ordem da lista)", () => {
    const { pos } = packByModel(colacao);
    expect(pos.imagD).toEqual({ x: 0, y: 0 });
    expect(pos.imagE).toEqual({ x: 1152, y: 0 });
    expect(pos.t4.y).toBe(576); // faixa nova começa embaixo da IMAG mais alta
  });

  it("não sobrepõe nada", () => {
    const { pos } = packByModel(colacao);
    const rects = colacao.map((it) => ({ id: it.id, ...pos[it.id], w: it.w, h: it.h }));
    expect(overlappingIds(rects).size).toBe(0);
  });

  it("maxWidth quebra a faixa em vez de estourar a resolução do sinal", () => {
    const { pos, w, h } = packByModel(colacao, 1920);
    expect(w).toBeLessThanOrEqual(1920);
    expect(pos.imagE).toEqual({ x: 0, y: 576 }); // não coube em 1920 → desceu
    expect(h).toBeGreaterThan(1344); // paga em altura o que economiza em largura
  });

  it("lista vazia não quebra", () => {
    expect(packByModel([])).toEqual({ pos: {}, w: 0, h: 0 });
    expect(packByModel(undefined)).toEqual({ pos: {}, w: 0, h: 0 });
  });

  it("vão padrão separa telas e faixas — e não sobra folga pendurada no fim", () => {
    const { pos, w, h } = packByModel(colacao, Infinity, 64);
    expect(pos.imagD).toEqual({ x: 0, y: 0 });
    expect(pos.imagE).toEqual({ x: 1216, y: 0 }); // 1152 + 64
    expect(pos.t4).toEqual({ x: 0, y: 640 }); // faixa nova: 576 + 64
    expect(pos.t3.x).toBe(192); // 128 + 64
    expect(w).toBe(2368); // 1216 + 1152 — a borda direita real, sem vão sobrando
    expect(h).toBe(1408); // 640 + 768
  });
});

describe("snapAxis — encaixe com vão padrão (todo vão do mesmo tamanho)", () => {
  // um vizinho ocupando 0..512 no eixo; a tela que se arrasta tem 256 de lado
  const spans = [[0, 512]];

  it("encosta no vizinho e alinha as bordas (comportamento de sempre)", () => {
    expect(snapAxis(517, 256, spans, 0)).toBe(512); // encostou à direita
    expect(snapAxis(-250, 256, spans, 0)).toBe(-256); // encostou à esquerda
    expect(snapAxis(4, 256, spans, 0)).toBe(0); // alinhou o início
    expect(snapAxis(253, 256, spans, 0)).toBe(256); // alinhou o fim (512 - 256)
  });

  it("com vão de 128, a folga cai EXATA nos dois lados", () => {
    expect(snapAxis(634, 256, spans, 128)).toBe(640); // 512 + 128
    expect(snapAxis(-380, 256, spans, 128)).toBe(-384); // 0 - 256 - 128
  });

  it("longe de qualquer candidata, o valor cru passa (arraste livre)", () => {
    expect(snapAxis(900, 256, spans, 128)).toBe(900);
  });

  it("empate de proximidade vence a mais perto, não a primeira da lista", () => {
    // 0 (origem) e 512 (borda) disputam: 500 está a 12 de 512 e a 500 de 0
    expect(snapAxis(500, 256, spans, 0, 20)).toBe(512);
  });
});

describe("gapsAround — a cota de px do vão no canvas", () => {
  const alvo = { x: 1024, y: 0, w: 512, h: 384 };

  it("mede o vão do vizinho que a tela ENCARA, com a cota no meio da sobreposição", () => {
    const [g] = gapsAround(alvo, [{ x: 0, y: 0, w: 512, h: 384 }]);
    expect(g).toEqual({ dir: "left", axis: "x", gap: 512, x: 512, y: 192, len: 512 });
  });

  it("vizinho na diagonal não tem vão medível (não há folga entre painéis ali)", () => {
    expect(gapsAround(alvo, [{ x: 0, y: 500, w: 512, h: 384 }])).toEqual([]);
  });

  it("encostado ou sobreposto não vira cota (0 é o visual; sobreposição já é o alerta vermelho)", () => {
    expect(gapsAround(alvo, [{ x: 512, y: 0, w: 512, h: 384 }])).toEqual([]);
    expect(gapsAround(alvo, [{ x: 1000, y: 0, w: 512, h: 384 }])).toEqual([]);
  });

  it("um vão por lado — o vizinho MAIS PRÓXIMO de cada lado", () => {
    const gs = gapsAround(alvo, [
      { x: 0, y: 0, w: 512, h: 384 }, // esquerda, vão 512
      { x: 768, y: 0, w: 128, h: 384 }, // esquerda, vão 128 (mais perto — este vence)
      { x: 1600, y: 0, w: 256, h: 384 }, // direita, vão 64
      { x: 1024, y: 500, w: 512, h: 100 }, // embaixo, vão 116
    ]);
    expect(gs.map((g) => [g.dir, g.gap])).toEqual([["left", 128], ["right", 64], ["bottom", 116]]);
  });

  it("sem alvo ou sem vizinhos → nada a cotar", () => {
    expect(gapsAround(null, [])).toEqual([]);
    expect(gapsAround(alvo, [])).toEqual([]);
  });
});
