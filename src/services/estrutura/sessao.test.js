// sessao.test.js — o desfazer atravessa a troca de aba, mas não engole projeto alterado.
import { describe, it, expect, beforeEach } from "vitest";
import { esquecerHistorico, guardarHistorico, retomarHistorico, _tamanho } from "./sessao.js";
import { ACOES, criarHistorico, executar, podeDesfazer } from "./historico.js";
import { adicionarPecaLivre, novaMontagem } from "./montagem.js";

const comUmaPeca = () =>
  executar(criarHistorico(), { tipo: ACOES.ADICIONAR_LIVRE, id: "a", catalogoId: "p30-b2000" });

beforeEach(() => {
  for (const id of ["p1", "p2", "p3", "p4", "p5"]) esquecerHistorico(id);
});

describe("atravessar a aba", () => {
  it("o desfazer volta inteiro quando a montagem é a mesma", () => {
    const h = comUmaPeca();
    guardarHistorico("p1", h);
    const voltou = retomarHistorico("p1", h.montagem);
    expect(voltou).toBe(h);
    expect(podeDesfazer(voltou)).toBe(true);
  });

  it("projeto sem nada guardado devolve null, e a aba começa do zero", () => {
    expect(retomarHistorico("p1", novaMontagem())).toBeNull();
  });
});

describe("o cache velho", () => {
  // o sync pode ter trazido outra versão de outro aparelho enquanto a aba
  // estava fechada — desfazer pra um estado que nunca existiu apaga trabalho
  // alheio e chama isso de desfazer
  it("montagem diferente descarta o histórico em vez de mentir", () => {
    guardarHistorico("p1", comUmaPeca());
    const outra = adicionarPecaLivre(novaMontagem(), "p30-b4000", { id: "z" });
    expect(retomarHistorico("p1", outra)).toBeNull();
  });

  it("e o descarte é definitivo: não volta na tentativa seguinte", () => {
    const h = comUmaPeca();
    guardarHistorico("p1", h);
    retomarHistorico("p1", novaMontagem());
    expect(retomarHistorico("p1", h.montagem)).toBeNull();
  });

  it("esquecer é o que o excluir do projeto chama", () => {
    const h = comUmaPeca();
    guardarHistorico("p1", h);
    esquecerHistorico("p1");
    expect(retomarHistorico("p1", h.montagem)).toBeNull();
  });
});

describe("o teto de memória", () => {
  it("guarda poucos projetos: o mais antigo sai quando entra um novo", () => {
    const h = comUmaPeca();
    for (const id of ["p1", "p2", "p3", "p4", "p5"]) guardarHistorico(id, h);
    expect(_tamanho()).toBe(4);
    expect(retomarHistorico("p1", h.montagem)).toBeNull(); // o primeiro caiu
    expect(retomarHistorico("p5", h.montagem)).toBe(h);
  });

  it("reguardar o mesmo projeto não conta como projeto novo", () => {
    const h = comUmaPeca();
    guardarHistorico("p1", h);
    guardarHistorico("p1", h);
    guardarHistorico("p2", h);
    expect(_tamanho()).toBe(2);
  });

  it("sem id não guarda nada — projeto sem id é bug de quem chamou", () => {
    guardarHistorico(null, comUmaPeca());
    expect(_tamanho()).toBe(0);
  });
});
