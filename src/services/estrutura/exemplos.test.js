// exemplos.test.js — as montagens de demonstração, e a regressão que elas guardam.
import { describe, it, expect } from "vitest";
import { conectorApontandoPara, porticoDeExemplo, torreDeExemplo } from "./exemplos.js";
import { conectoresLivres, juntas } from "./montagem.js";
import { caixaEnvolvente, listaDePecas, pesoTotal } from "./metricas.js";
import { adicionarPecaEncaixada, adicionarPecaLivre, novaMontagem } from "./montagem.js";

describe("conectorApontandoPara", () => {
  // Este é o teste que guarda o bug real de E1: o cubo encaixado no TOPO de uma
  // barra entra de cabeça pra baixo (a face que ele oferece precisa ENFRENTAR a
  // barra), e aí o conector "leste" passa a apontar pra oeste. Escolher conector
  // pelo nome mandou a viga do pórtico pro lado errado — 8,8 m de vão onde
  // deviam ser 5.
  it("o cubo no topo INVERTE: 'leste' aponta pra −X", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "b" });
    m = adicionarPecaEncaixada(m, { id: "c", catalogoId: "p30-cubo5", de: "b", conAlvo: "b", conNovo: "topo" });
    const leste = conectoresLivres(m).find((c) => c.conectorId === "leste");
    expect(Math.round(leste.dir[0])).toBe(-1);
  });

  it("acha o conector pela direção do MUNDO, não pelo nome", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "b" });
    m = adicionarPecaEncaixada(m, { id: "c", catalogoId: "p30-cubo5", de: "b", conAlvo: "b", conNovo: "topo" });
    const paraLeste = conectorApontandoPara(m, "c", [1, 0, 0]);
    expect(paraLeste.conectorId).toBe("oeste");
    expect(Math.round(paraLeste.dir[0])).toBe(1);
  });

  it("não oferece conector ocupado", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "b" });
    m = adicionarPecaEncaixada(m, { id: "c", catalogoId: "p30-cubo5", de: "b", conAlvo: "b", conNovo: "topo" });
    expect(conectorApontandoPara(m, "c", [0, -1, 0]).conectorId).not.toBe("topo");
  });
});

describe("pórtico de exemplo", () => {
  const m = porticoDeExemplo();

  it("tem as 9 peças e as 7 juntas esperadas", () => {
    expect(m.pecas).toHaveLength(9);
    expect(juntas(m)).toHaveLength(7);
    expect(listaDePecas(m).map((l) => [l.catalogoId, l.qtd])).toEqual([
      ["p30-b2000", 4], ["p30-b4000", 1], ["p30-cubo5", 2], ["p30-sapata-baixa", 2],
    ]);
  });

  // a regressão: com o conector escolhido pelo nome, a largura dava 8,8 m
  it("a viga fica ENTRE as torres — a estrutura é simétrica", () => {
    const c = caixaEnvolvente(m);
    expect(c.min[0]).toBeCloseTo(-c.max[0], 3);
    // 4000 de vão + 2×150 de cubo + 2×(750−300)/2 de sobra da sapata = 5050
    expect(c.larguraMm).toBeCloseTo(5050, 1);
  });

  it("as duas torres têm a mesma altura, e a viga passa pelo topo", () => {
    const c = caixaEnvolvente(m);
    // sapata 55 + 2×2000 + cubo 300 = 4355
    expect(c.alturaMm).toBeCloseTo(4355, 1);
    const viga = m.pecas.find((p) => p.id === "viga");
    expect(viga.matriz[12]).toBeCloseTo(0, 3); // centrada no vão
    expect(viga.matriz[13]).toBeCloseTo(4205, 3); // na altura do centro dos cubos
  });

  it("o vão é parâmetro e a geometria acompanha", () => {
    const largo = caixaEnvolvente(porticoDeExemplo(6000));
    expect(largo.larguraMm).toBeCloseTo(7050, 1);
    expect(largo.min[0]).toBeCloseTo(-largo.max[0], 3);
  });

  it("pesa o que a lista soma", () => {
    // 4×22 + 38 + 2×12 + 2×8 = 166
    expect(pesoTotal(m).kg).toBe(166);
  });
});

describe("torre de exemplo", () => {
  it("empilha os andares pedidos e sobra um conector livre no topo", () => {
    const m = torreDeExemplo(3);
    expect(m.pecas).toHaveLength(5); // sapata + 3 barras + cubo
    const c = caixaEnvolvente(m);
    expect(c.alturaMm).toBeCloseTo(55 + 6000 + 300, 1);
    // o cubo entra invertido, então sobram as 4 faces laterais
    expect(conectoresLivres(m)).toHaveLength(4);
  });
});
