// montagem.test.js — a árvore de peças: encaixar, remover, reconstruir.
import { describe, it, expect } from "vitest";
import {
  ErroDeMontagem, MOTIVOS, adicionarPecaEncaixada, adicionarPecaLivre, chaveConector,
  conectores, conectoresLivres, conectoresOcupados, juntas, matrizApoiada,
  novaMontagem, pecaDaMontagem, recalcular, removerPeca,
} from "./montagem.js";
import { caixaEnvolvente } from "./metricas.js";
import { matriz, qDoEixo } from "./vetor.js";

// torre: sapata + 2 m + 1 m, tudo com id fixo pro teste ser legível
const torre = () => {
  let m = novaMontagem();
  m = adicionarPecaLivre(m, "p30-sapata-baixa", { id: "s1" });
  m = adicionarPecaEncaixada(m, {
    id: "b1", catalogoId: "p30-b2000", de: "s1", conAlvo: "topo", conNovo: "a",
  });
  m = adicionarPecaEncaixada(m, {
    id: "b2", catalogoId: "p30-b1000", de: "b1", conAlvo: "b", conNovo: "a",
  });
  return m;
};

describe("adicionar", () => {
  it("a primeira peça entra na origem", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "x" });
    expect(m.pecas).toHaveLength(1);
    expect(m.pecas[0].encaixe).toBeNull();
    expect(m.pecas[0].matriz.slice(12, 15)).toEqual([0, 0, 0]);
  });

  it("peça fora do catálogo é recusada", () => {
    expect(() => adicionarPecaLivre(novaMontagem(), "p50-b2000")).toThrow(ErroDeMontagem);
    try {
      adicionarPecaLivre(novaMontagem(), "nao-existe");
    } catch (e) {
      expect(e.motivo).toBe(MOTIVOS.PECA_DESCONHECIDA);
    }
  });

  it("encaixar empilha na altura certa: sapata 55 + 2000 + 1000", () => {
    const m = torre();
    expect(m.pecas).toHaveLength(3);
    // a de 2 m fica centrada em 55 + 1000
    expect(m.pecas[1].matriz[13]).toBeCloseTo(1055, 3);
    // a de 1 m, em 55 + 2000 + 500
    expect(m.pecas[2].matriz[13]).toBeCloseTo(2555, 3);
  });

  it("não deixa encaixar num conector JÁ ocupado", () => {
    const m = torre();
    expect(() =>
      adicionarPecaEncaixada(m, {
        catalogoId: "p30-b1000", de: "b1", conAlvo: "b", conNovo: "a",
      }),
    ).toThrowError(/conector-ocupado/);
  });

  it("recusa alvo inexistente e conector inexistente", () => {
    const m = torre();
    expect(() =>
      adicionarPecaEncaixada(m, { catalogoId: "p30-b1000", de: "zzz", conAlvo: "b", conNovo: "a" }),
    ).toThrowError(/alvo-inexistente/);
    expect(() =>
      adicionarPecaEncaixada(m, { catalogoId: "p30-b1000", de: "b2", conAlvo: "topo", conNovo: "a" }),
    ).toThrowError(/conector-inexistente/);
  });

  it("é PURA: a montagem de entrada não muda", () => {
    const antes = novaMontagem();
    const depois = adicionarPecaLivre(antes, "p30-b2000");
    expect(antes.pecas).toHaveLength(0);
    expect(depois.pecas).toHaveLength(1);
  });
});

describe("juntas e conectores", () => {
  it("conta uma junta por peça encaixada", () => {
    expect(juntas(torre())).toHaveLength(2);
    expect(juntas(novaMontagem())).toHaveLength(0);
  });

  it("marca como ocupados exatamente os dois lados de cada junta", () => {
    const ocup = conectoresOcupados(torre());
    expect(ocup.size).toBe(4);
    expect(ocup.has(chaveConector("s1", "topo"))).toBe(true);
    expect(ocup.has(chaveConector("b1", "a"))).toBe(true);
    expect(ocup.has(chaveConector("b1", "b"))).toBe(true);
    expect(ocup.has(chaveConector("b2", "a"))).toBe(true);
  });

  it("sobra livre só o topo da torre", () => {
    const livres = conectoresLivres(torre());
    expect(livres).toHaveLength(1);
    expect(livres[0].chave).toBe(chaveConector("b2", "b"));
    expect(livres[0].pos[1]).toBeCloseTo(3055, 3); // 55 + 2000 + 1000
  });

  it("os conectores saem no MUNDO, com sistema e ocupação", () => {
    const c = conectores(torre());
    expect(c).toHaveLength(1 + 2 + 2);
    expect(c.every((x) => x.sistema === 300)).toBe(true);
  });
});

describe("remover", () => {
  it("some com a peça e libera o conector do alvo", () => {
    const m = removerPeca(torre(), "b2");
    expect(m.pecas).toHaveLength(2);
    expect(conectoresOcupados(m).has(chaveConector("b1", "b"))).toBe(false);
  });

  // decisão deliberada do espeque: cascatear apagaria meia estrutura num clique
  it("quem estava encaixado na peça removida vira LIVRE, não some", () => {
    const m = removerPeca(torre(), "b1");
    expect(m.pecas.map((p) => p.id)).toEqual(["s1", "b2"]);
    expect(pecaDaMontagem(m, "b2").encaixe).toBeNull();
    // e não se mexe: a matriz continua a mesma
    expect(pecaDaMontagem(m, "b2").matriz[13]).toBeCloseTo(2555, 3);
  });

  it("remover id inexistente não quebra nada", () => {
    expect(removerPeca(torre(), "nada").pecas).toHaveLength(3);
  });
});

describe("recalcular — a razão de guardar o encaixe simbólico", () => {
  it("reconstrói as matrizes idênticas a partir dos encaixes", () => {
    const m = torre();
    const r = recalcular(m);
    r.pecas.forEach((p, i) =>
      p.matriz.forEach((n, k) => expect(n).toBeCloseTo(m.pecas[i].matriz[k], 6)),
    );
  });

  it("conserta matriz corrompida sem tocar no encaixe", () => {
    const m = torre();
    const torto = {
      ...m,
      pecas: m.pecas.map((p) => (p.id === "b2" ? { ...p, matriz: matriz(qDoEixo([1, 0, 0], 1), [9, 9, 9]) } : p)),
    };
    const r = recalcular(torto);
    expect(pecaDaMontagem(r, "b2").matriz[13]).toBeCloseTo(2555, 3);
  });

  it("peça livre mantém a matriz (não há de onde derivar)", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", {
      id: "solta", matriz: matriz(qDoEixo([0, 1, 0], 0.3), [500, 600, 700]),
    });
    m = recalcular(m);
    expect(m.pecas[0].matriz.slice(12, 15)).toEqual([500, 600, 700]);
  });

  it("acusa CICLO em vez de travar o navegador", () => {
    const m = {
      versao: 1,
      pecas: [
        { id: "a", catalogoId: "p30-b1000", matriz: null, encaixe: { de: "b", conAlvo: "b", conNovo: "a", giro: 0 } },
        { id: "b", catalogoId: "p30-b1000", matriz: null, encaixe: { de: "a", conAlvo: "b", conNovo: "a", giro: 0 } },
      ],
    };
    expect(() => recalcular(m)).toThrowError(/ciclo/);
  });
});

describe("uma corrente longa acumula o comprimento certo", () => {
  it("10 barras de 1 m dão 10 m de topo", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b1000", { id: "p0" });
    for (let i = 1; i < 10; i++) {
      m = adicionarPecaEncaixada(m, {
        id: `p${i}`, catalogoId: "p30-b1000", de: `p${i - 1}`, conAlvo: "b", conNovo: "a",
      });
    }
    const topo = conectoresLivres(m).find((c) => c.dir[1] > 0.9);
    // a primeira nasce centrada na origem → base em −500, topo em +9500
    expect(topo.pos[1]).toBeCloseTo(9500, 3);
  });
});

describe("a peça solta nasce apoiada, não enterrada", () => {
  // Barra e cubo têm origem no CENTRO — nascer na origem era nascer com metade
  // da peça abaixo do piso, que foi o que o dono viu.
  it("a barra de 2 m sobe meio comprimento", () => {
    expect(matrizApoiada("p30-b2000")[13]).toBe(1000);
  });

  it("o cubo sobe meio lado", () => {
    expect(matrizApoiada("p30-cubo5")[13]).toBe(150);
  });

  it("a sapata não se mexe: a origem dela JÁ é o chão", () => {
    expect(matrizApoiada("p30-sapata-baixa")[13]).toBe(0);
  });

  it("x e z passam direto — a altura é a única coisa que a regra decide", () => {
    const m = matrizApoiada("p30-b2000", { x: 500, z: -300 });
    expect([m[12], m[13], m[14]]).toEqual([500, 1000, -300]);
  });

  it("peça fora do catálogo não explode: fica na origem", () => {
    expect(matrizApoiada("p50-b2000")[13]).toBe(0);
  });

  it("montada assim, a peça inteira fica em cima do piso", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", {
      id: "a", matriz: matrizApoiada("p30-b2000"),
    });
    expect(caixaEnvolvente(m).min[1]).toBe(0);
  });
});

