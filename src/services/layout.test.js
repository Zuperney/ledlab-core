// layout.test.js — detecção de sobreposição da Composição (segurança de campo).
import { describe, it, expect } from "vitest";
import { overlappingIds, reorder, packByModel } from "./layout.js";

const r = (id, x, y, w, h) => ({ id, x, y, w, h });

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
});
