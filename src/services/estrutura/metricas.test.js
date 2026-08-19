// metricas.test.js — peso, medidas e a lista que vai pro galpão.
import { describe, it, expect } from "vitest";
import {
  caixaEnvolvente, listaDePecas, parafusaria, pesoTotal, resumo,
} from "./metricas.js";
import { adicionarPecaEncaixada, adicionarPecaLivre, novaMontagem } from "./montagem.js";
import { pecaPorId } from "./catalogo.js";

// sapata (8) + 2 m (22) + 1 m (13) = 43 kg, altura 55 + 2000 + 1000 = 3055
const torre = () => {
  let m = novaMontagem();
  m = adicionarPecaLivre(m, "p30-sapata-baixa", { id: "s1" });
  m = adicionarPecaEncaixada(m, { id: "b1", catalogoId: "p30-b2000", de: "s1", conAlvo: "topo", conNovo: "a" });
  m = adicionarPecaEncaixada(m, { id: "b2", catalogoId: "p30-b1000", de: "b1", conAlvo: "b", conNovo: "a" });
  return m;
};

describe("pesoTotal", () => {
  it("soma o peso das peças", () => {
    expect(pesoTotal(torre()).kg).toBe(43);
  });

  it("montagem vazia pesa zero e está completa", () => {
    const p = pesoTotal(novaMontagem());
    expect(p.kg).toBe(0);
    expect(p.completo).toBe(true);
  });

  // enquanto o dono não pesar na balança, o número é ordem de grandeza — e o
  // Caderno tem que dizer isso, não fingir que fechou
  it("marca que NENHUM peso foi conferido ainda", () => {
    const p = pesoTotal(torre());
    expect(p.naoConferidas).toBe(3);
    expect(p.conferido).toBe(false);
    expect(p.completo).toBe(true);
  });
});

describe("caixaEnvolvente", () => {
  it("mede a torre inteira, do chão ao topo", () => {
    const c = caixaEnvolvente(torre());
    expect(c.alturaMm).toBeCloseTo(3055, 1);
    expect(c.larguraMm).toBeCloseTo(750, 1); // a sapata é mais larga que a barra
    expect(c.min[1]).toBeCloseTo(0, 1);
    expect(c.max[1]).toBeCloseTo(3055, 1);
  });

  it("uma barra sozinha: seção × comprimento", () => {
    const c = caixaEnvolvente(adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "x" }));
    expect(c.larguraMm).toBe(300);
    expect(c.alturaMm).toBe(2000);
    expect(c.profundidadeMm).toBe(300);
  });

  it("montagem vazia devolve null em vez de zeros que parecem medida", () => {
    expect(caixaEnvolvente(novaMontagem())).toBeNull();
  });
});

describe("listaDePecas — o artefato do galpão", () => {
  it("agrupa por peça e soma o peso", () => {
    let m = torre();
    m = adicionarPecaEncaixada(m, { id: "b3", catalogoId: "p30-b1000", de: "b2", conAlvo: "b", conNovo: "a" });
    const lista = listaDePecas(m);
    const umMetro = lista.find((l) => l.catalogoId === "p30-b1000");
    expect(umMetro.qtd).toBe(2);
    expect(umMetro.pesoTotalKg).toBe(26);
  });

  it("sai sempre na mesma ordem do catálogo (a folha impressa não pode dançar)", () => {
    const ordem = listaDePecas(torre()).map((l) => l.catalogoId);
    expect(ordem).toEqual(["p30-b1000", "p30-b2000", "p30-sapata-baixa"]);
  });

  it("carrega a procedência do peso, item a item", () => {
    for (const l of listaDePecas(torre())) {
      expect(l.pesoConferido).toBe(false);
      expect(typeof l.pesoFonte).toBe("string");
    }
  });

  it("montagem vazia dá lista vazia", () => {
    expect(listaDePecas(novaMontagem())).toEqual([]);
  });
});

describe("parafusaria — CONTAGEM, não massa", () => {
  it("4 parafusos, 4 porcas e 8 arruelas por junta", () => {
    const p = parafusaria(torre()); // 2 juntas
    expect(p.juntas).toBe(2);
    expect(p.itens.find((i) => i.id === "parafuso").qtd).toBe(8);
    expect(p.itens.find((i) => i.id === "porca").qtd).toBe(8);
    expect(p.itens.find((i) => i.id === "arruela").qtd).toBe(16);
  });

  it("sem junta, sem parafuso", () => {
    expect(parafusaria(adicionarPecaLivre(novaMontagem(), "p30-b2000")).juntas).toBe(0);
  });

  // o dia que o dono pesar as peças COM os parafusos, a massa já estará no total
  // e somar de novo infla o peso em silêncio
  it("avisa quando a massa dos parafusos já está no peso da peça", () => {
    expect(parafusaria(torre()).massaInclusaNoPeso).toBe(false);
    expect(pecaPorId("p30-b2000").peso.incluiParafusos).toBe(false);
  });
});

describe("resumo", () => {
  it("entrega tudo que a aba e o Caderno precisam", () => {
    const r = resumo(torre());
    expect(r.pecas).toBe(3);
    expect(r.juntas).toBe(2);
    expect(r.peso.kg).toBe(43);
    expect(r.caixa.alturaMm).toBeCloseTo(3055, 1);
    expect(r.lista).toHaveLength(3);
    expect(r.parafusaria.juntas).toBe(2);
  });

  it("aguenta montagem vazia sem quebrar", () => {
    const r = resumo(novaMontagem());
    expect(r.pecas).toBe(0);
    expect(r.caixa).toBeNull();
    expect(r.peso.kg).toBe(0);
  });
});
