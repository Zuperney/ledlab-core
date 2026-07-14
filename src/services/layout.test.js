// layout.test.js — detecção de sobreposição da Composição (segurança de campo).
import { describe, it, expect } from "vitest";
import { overlappingIds } from "./layout.js";

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
