// entrada.test.js — o conserto do cubo, provado.
import { describe, it, expect } from "vitest";
import { escolhaImporta, entradasDe, facesLivresApos, melhorEntrada, rotuloDaEntrada, sobraFacePara } from "./entrada.js";
import { pecaPorId } from "./catalogo.js";
import { adicionarPecaEncaixada, adicionarPecaLivre, conectoresLivres, novaMontagem } from "./montagem.js";

const cubo = pecaPorId("p30-cubo5");
const barra = pecaPorId("p30-b2000");

// uma barra em pé, e o conector do TOPO dela — o alvo do caso relatado
function topoDaBarra() {
  const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "b" });
  return conectoresLivres(m).find((c) => c.dir[1] > 0.9);
}

describe("o caso que o dono relatou", () => {
  const alvo = topoDaBarra();

  it("entrando pelo topo, o cubo fecha a estrutura: sobra nada pra cima", () => {
    expect(sobraFacePara(alvo, cubo, "topo")).toBe(false);
  });

  it("e nenhum giro conserta — a face cega mora NO eixo do encaixe", () => {
    for (let giro = 0; giro < 4; giro++) {
      expect(sobraFacePara(alvo, cubo, "topo", giro)).toBe(false);
    }
  });

  it("entrando por qualquer lado, sobra face pra cima e a torre continua", () => {
    for (const id of ["norte", "sul", "leste", "oeste"]) {
      expect(sobraFacePara(alvo, cubo, id)).toBe(true);
    }
  });

  it("o padrão do app já escolhe uma entrada que não fecha o topo", () => {
    const escolha = melhorEntrada(alvo, cubo);
    expect(escolha).not.toBe("topo");
    expect(sobraFacePara(alvo, cubo, escolha)).toBe(true);
  });
});

describe("quando entrar pelo topo é o certo", () => {
  // cubo encostado no LADO de uma barra deitada: aí a face de cima do cubo já
  // fica livre, e mudar a entrada só bagunçaria
  it("alvo apontando pro lado: o topo já resolve, e é o escolhido", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    m = adicionarPecaEncaixada(m, { id: "cima", catalogoId: "p30-b2000", de: "c", conAlvo: "topo", conNovo: "a" });
    const lateral = conectoresLivres(m).find((c) => c.pecaId === "c" && Math.abs(c.dir[1]) < 0.1);
    expect(melhorEntrada(lateral, cubo)).toBe("topo");
  });

  it("barra na barra: a ponta A entra e a B sobra pra cima, como sempre foi", () => {
    expect(melhorEntrada(topoDaBarra(), barra)).toBe("a");
  });

  it("sapata só tem uma face — não há o que escolher", () => {
    const sapata = pecaPorId("p30-sapata-baixa");
    expect(melhorEntrada(topoDaBarra(), sapata)).toBe("topo");
    expect(escolhaImporta(sapata)).toBe(false);
  });
});

describe("quando o controle aparece", () => {
  it("só quando a peça tem mais de duas faces — no cubo, e só nele", () => {
    expect(escolhaImporta(cubo)).toBe(true);
    expect(escolhaImporta(barra)).toBe(false);
    expect(escolhaImporta(null)).toBe(false);
  });
});

describe("as faces que sobram", () => {
  const alvo = topoDaBarra();

  it("sobram todas menos a que entrou", () => {
    const livres = facesLivresApos(alvo, cubo, "norte");
    expect(livres).toHaveLength(entradasDe(cubo).length - 1);
    expect(livres.map((f) => f.id)).not.toContain("norte");
  });

  it("alvo nulo não explode — devolve lista vazia", () => {
    expect(facesLivresApos(null, cubo, "topo")).toEqual([]);
    expect(melhorEntrada(null, null)).toBeNull();
  });
});

describe("os rótulos", () => {
  // o técnico não pensa em ponto cardeal dentro de um cubo que gira
  it("falam de cima e de lados, não de norte e sul", () => {
    expect(rotuloDaEntrada(cubo, "topo")).toBe("Face de cima");
    expect(rotuloDaEntrada(cubo, "norte")).toBe("Lado 1");
    expect(rotuloDaEntrada(cubo, "oeste")).toBe("Lado 4");
    expect(rotuloDaEntrada(barra, "a")).toBe("Ponta A");
  });
});
