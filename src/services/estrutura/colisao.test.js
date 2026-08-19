// colisao.test.js — o que é "peça dentro de peça" e o que é junta legítima.
import { describe, it, expect } from "vitest";
import { colisoes, penetracao, caixaNoMundo, pecasEmConflito, FOLGA_MM } from "./colisao.js";
import { adicionarPecaEncaixada, adicionarPecaLivre, novaMontagem } from "./montagem.js";
import { porticoDeExemplo, torreDeExemplo, conectorApontandoPara } from "./exemplos.js";
import { IDENTIDADE, matriz } from "./vetor.js";

const em = (x, y = 0, z = 0) => matriz(IDENTIDADE, [x, y, z]);

describe("o falso positivo que mataria a checagem", () => {
  // Se junta acusasse colisão, TODA estrutura montada nasceria em vermelho e o
  // aviso viraria ruído — que é o mesmo que não existir.
  it("o pórtico de exemplo, montado certo, não acusa nada", () => {
    expect(colisoes(porticoDeExemplo())).toEqual([]);
  });

  it("torre de 6 andares (sapata, barras e cubo em fila) também não", () => {
    expect(colisoes(torreDeExemplo(6))).toEqual([]);
  });

  it("duas barras encostadas ponta com ponta se TOCAM, e tocar é zero", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a", matriz: em(0, 0) });
    m = adicionarPecaEncaixada(m, { id: "b", catalogoId: "p30-b2000", de: "a", conAlvo: "b", conNovo: "a" });
    const [ca, cb] = m.pecas.map(caixaNoMundo);
    expect(penetracao(ca, cb)).toBe(0);
  });

  // as duas menores do estoque emendadas: o caso que quebra qualquer heurística
  // de "encolhe a peça e mede a distância entre os eixos"
  it("duas barras de 0,2 m emendadas — as menores do estoque — passam limpo", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b0200", { id: "a" });
    m = adicionarPecaEncaixada(m, { id: "b", catalogoId: "p30-b0200", de: "a", conAlvo: "b", conNovo: "a" });
    expect(colisoes(m)).toEqual([]);
  });

  it("barras lado a lado, faces se tocando (300 mm de centro a centro), passam", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a", matriz: em(0) });
    m = adicionarPecaLivre(m, "p30-b2000", { id: "b", matriz: em(300) });
    expect(colisoes(m)).toEqual([]);
  });

  // barra pra cima e barra pro lado saindo do MESMO cubo: encostam no cubo,
  // não uma na outra
  it("duas barras em faces diferentes do mesmo cubo não brigam entre si", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    m = adicionarPecaEncaixada(m, { id: "cima", catalogoId: "p30-b2000", de: "c", conAlvo: "topo", conNovo: "a" });
    const lado = conectorApontandoPara(m, "c", [1, 0, 0]);
    m = adicionarPecaEncaixada(m, { id: "lado", catalogoId: "p30-b2000", de: "c", conAlvo: lado.conectorId, conNovo: "a" });
    expect(colisoes(m)).toEqual([]);
  });
});

describe("o que a checagem tem que pegar", () => {
  it("duas barras iguais na MESMA posição — o caso que o dono viu", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a" });
    m = adicionarPecaLivre(m, "p30-b2000", { id: "b" });
    const c = colisoes(m);
    expect(c).toHaveLength(1);
    expect(c[0].mm).toBe(300); // a seção inteira: uma está DENTRO da outra
  });

  it("barra atravessando a outra pelo meio, em cruz", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a" });
    // deitada: gira 90° em torno de Z leva o eixo Y da barra pro X do mundo
    m = adicionarPecaLivre(m, "p30-b2000", {
      id: "b",
      matriz: [0, 1, 0, 0, -1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    });
    expect(colisoes(m).map((c) => [c.a, c.b])).toEqual([["a", "b"]]);
  });

  it("cubo enfiado no meio de uma barra", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b4000", { id: "barra" });
    m = adicionarPecaLivre(m, "p30-cubo5", { id: "cubo", matriz: em(0, 500) });
    expect(pecasEmConflito(m)).toEqual(new Set(["barra", "cubo"]));
  });

  it("sapatas pisando uma na outra", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-sapata-baixa", { id: "s1", matriz: em(0) });
    m = adicionarPecaLivre(m, "p30-sapata-baixa", { id: "s2", matriz: em(400) });
    expect(colisoes(m)).toHaveLength(1); // 750 de largura não cabem em 400 de vão
  });

  it("ordena pela pior sobreposição primeiro — é por onde se começa a consertar", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a" });
    m = adicionarPecaLivre(m, "p30-b2000", { id: "b" }); // dentro: 300
    m = adicionarPecaLivre(m, "p30-b2000", { id: "c", matriz: em(200) }); // de raspão: 100
    const c = colisoes(m);
    expect(c[0].mm).toBeGreaterThan(c[c.length - 1].mm);
  });
});

describe("a folga", () => {
  it("encostar não é colidir: a folga engole o arredondamento da matriz", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a" });
    m = adicionarPecaLivre(m, "p30-b2000", { id: "b", matriz: em(300 - FOLGA_MM / 2) });
    expect(colisoes(m)).toEqual([]);
  });

  it("dá pra apertar a folga quando se quer ver até o encosto", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a" });
    m = adicionarPecaLivre(m, "p30-b2000", { id: "b", matriz: em(300 - FOLGA_MM / 2) });
    expect(colisoes(m, { folgaMm: 1 })).toHaveLength(1);
  });
});

describe("não quebra com pouco", () => {
  it("montagem vazia, nula ou de uma peça só", () => {
    expect(colisoes(novaMontagem())).toEqual([]);
    expect(colisoes(null)).toEqual([]);
    expect(colisoes(adicionarPecaLivre(novaMontagem(), "p30-b2000"))).toEqual([]);
    expect(pecasEmConflito(null)).toEqual(new Set());
  });
});
