// layout.test.js — detecção de sobreposição da Composição (segurança de campo).
import { describe, it, expect } from "vitest";
import { overlappingIds, reorder } from "./layout.js";

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
