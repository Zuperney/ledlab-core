// cores.test.js — a cor de uma peça é a mesma em todo projeto.
import { describe, it, expect } from "vitest";
import { CORES_PADRAO, COR_SEM_ATRIBUICAO, corDaPeca, legendaDaEstrutura, paletaDaEstrutura, temPersonalizacao } from "./cores.js";
import { CATALOGO } from "./catalogo.js";
import { adicionarPecaLivre, novaMontagem } from "./montagem.js";
import { porticoDeExemplo } from "./exemplos.js";

describe("a paleta padrão", () => {
  it("cobre TODAS as peças do catálogo — nenhuma cai no cinza de sobra", () => {
    for (const p of CATALOGO) expect(CORES_PADRAO[p.id]).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("não repete cor: duas peças da mesma cor tornam a legenda inútil", () => {
    const cores = Object.values(CORES_PADRAO);
    expect(new Set(cores).size).toBe(cores.length);
  });

  it("peça fora do catálogo cai num cinza honesto, não numa cor sorteada", () => {
    expect(corDaPeca("p50-b2000")).toBe(COR_SEM_ATRIBUICAO);
  });
});

describe("a personalização", () => {
  it("o que o usuário escolheu ganha do padrão", () => {
    expect(corDaPeca("p30-b2000", { "p30-b2000": "#123456" })).toBe("#123456");
    expect(corDaPeca("p30-b3000", { "p30-b2000": "#123456" })).toBe(CORES_PADRAO["p30-b3000"]);
  });

  it("a paleta completa mistura padrão e personalizado", () => {
    const p = paletaDaEstrutura({ "p30-cubo5": "#000000" });
    expect(p["p30-cubo5"]).toBe("#000000");
    expect(p["p30-b1000"]).toBe(CORES_PADRAO["p30-b1000"]);
    expect(Object.keys(p)).toHaveLength(CATALOGO.length);
  });

  it("sabe dizer se alguém mexeu — é o que acende o botão de restaurar", () => {
    expect(temPersonalizacao(null)).toBe(false);
    expect(temPersonalizacao({})).toBe(false);
    expect(temPersonalizacao({ "p30-b2000": CORES_PADRAO["p30-b2000"] })).toBe(false);
    expect(temPersonalizacao({ "p30-b2000": "#123456" })).toBe(true);
  });
});

describe("a legenda", () => {
  it("lista só o que está montado, na ordem do catálogo", () => {
    const leg = legendaDaEstrutura(porticoDeExemplo());
    expect(leg.map((l) => l.catalogoId)).toEqual([
      "p30-b2000", "p30-b4000", "p30-cubo5", "p30-sapata-baixa",
    ]);
    expect(leg[0].qtd).toBe(4);
    expect(leg[0].cor).toBe(CORES_PADRAO["p30-b2000"]);
  });

  it("montagem vazia não gera legenda", () => {
    expect(legendaDaEstrutura(novaMontagem())).toEqual([]);
    expect(legendaDaEstrutura(null)).toEqual([]);
  });

  it("a cor da legenda é a MESMA que a cena usa — uma fonte só", () => {
    const custom = { "p30-b2000": "#ff0000" };
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000");
    expect(legendaDaEstrutura(m, custom)[0].cor).toBe(paletaDaEstrutura(custom)["p30-b2000"]);
  });
});
