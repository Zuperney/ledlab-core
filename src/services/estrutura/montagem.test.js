// montagem.test.js — a árvore de peças: encaixar, remover, reconstruir.
import { describe, it, expect } from "vitest";
import {
  ErroDeMontagem, MOTIVOS, adicionarPecaEncaixada, adicionarPecaLivre, chaveConector, girarPeca,
  conectores, conectoresLivres, conectoresOcupados, juntas, matrizApoiada, mudarEntrada,
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

describe("girar", () => {
  it("muda o giro guardado e mexe a peça de lugar", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    m = adicionarPecaEncaixada(m, { id: "b", catalogoId: "p30-b2000", de: "c", conAlvo: "leste", conNovo: "a" });
    const antes = pecaDaMontagem(m, "b").matriz;
    const girada = girarPeca(m, "b", 1);
    expect(pecaDaMontagem(girada, "b").encaixe.giro).toBe(1);
    expect(pecaDaMontagem(girada, "b").matriz).not.toEqual(antes);
  });

  it("4 passos voltam ao lugar de origem", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    m = adicionarPecaEncaixada(m, { id: "b", catalogoId: "p30-b2000", de: "c", conAlvo: "leste", conNovo: "a" });
    const volta = girarPeca(m, "b", 4);
    expect(pecaDaMontagem(volta, "b").encaixe.giro).toBe(0);
    pecaDaMontagem(volta, "b").matriz.forEach((n, i) =>
      expect(n).toBeCloseTo(pecaDaMontagem(m, "b").matriz[i], 4),
    );
  });

  // SÓ A PEÇA SELECIONADA SE MEXE (decisão do dono, 19/08). Antes, girar uma
  // barra no meio da torre arrastava tudo que estava acima — e a peça escolhida,
  // que gira em torno do próprio eixo, parecia travada.
  it("girar uma barra da torre NÃO mexe no que está encaixado nela", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    m = adicionarPecaEncaixada(m, { id: "b1", catalogoId: "p30-b2000", de: "c", conAlvo: "leste", conNovo: "a" });
    m = adicionarPecaEncaixada(m, { id: "b2", catalogoId: "p30-b1000", de: "b1", conAlvo: "b", conNovo: "a" });
    m = adicionarPecaEncaixada(m, { id: "b3", catalogoId: "p30-b0500", de: "b2", conAlvo: "b", conNovo: "a" });

    const girada = girarPeca(m, "b1", 1);
    expect(pecaDaMontagem(girada, "b1").encaixe.giro).toBe(1);
    // filha e NETA exatamente onde estavam — compensar a filha basta, porque a
    // neta não chega a saber que houve giro
    expect(pecaDaMontagem(girada, "b2").matriz).toEqual(pecaDaMontagem(m, "b2").matriz);
    expect(pecaDaMontagem(girada, "b3").matriz).toEqual(pecaDaMontagem(m, "b3").matriz);
    expect(juntas(girada)).toHaveLength(3); // e ninguém se soltou
  });

  it("a compensação sobrevive a desfazer: girar e voltar devolve tudo", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    m = adicionarPecaEncaixada(m, { id: "b1", catalogoId: "p30-b2000", de: "c", conAlvo: "leste", conNovo: "a" });
    m = adicionarPecaEncaixada(m, { id: "b2", catalogoId: "p30-b1000", de: "b1", conAlvo: "b", conNovo: "a" });
    const volta = girarPeca(girarPeca(m, "b1", 1), "b1", 0);
    expect(pecaDaMontagem(volta, "b2").encaixe.giro).toBe(pecaDaMontagem(m, "b2").encaixe.giro);
    expect(pecaDaMontagem(volta, "b2").matriz).toEqual(pecaDaMontagem(m, "b2").matriz);
  });

  // O LIMITE, e ele é físico: a face lateral do cubo fica FORA do eixo do giro.
  // Girar o cubo muda o lugar dessa face, e o que está aparafusado nela viaja
  // junto — no truss de verdade também viaja.
  it("no cubo, o que está na face lateral acompanha — não há compensação que segure", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "base" });
    m = adicionarPecaEncaixada(m, { id: "cubo", catalogoId: "p30-cubo5", de: "base", conAlvo: "b", conNovo: "topo" });
    m = adicionarPecaEncaixada(m, { id: "braco", catalogoId: "p30-b1000", de: "cubo", conAlvo: "leste", conNovo: "a" });
    const antes = pecaDaMontagem(m, "braco").matriz.slice(12, 15);
    const girada = girarPeca(m, "cubo", 1);
    expect(pecaDaMontagem(girada, "braco").matriz.slice(12, 15)).not.toEqual(antes);
    expect(juntas(girada)).toHaveLength(2);
  });

  it("dá pra pedir o comportamento antigo — arrastar os filhos junto", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    m = adicionarPecaEncaixada(m, { id: "b1", catalogoId: "p30-b2000", de: "c", conAlvo: "leste", conNovo: "a" });
    m = adicionarPecaEncaixada(m, { id: "b2", catalogoId: "p30-b1000", de: "b1", conAlvo: "b", conNovo: "a" });
    const arrastando = girarPeca(m, "b1", 1, { compensarFilhos: false });
    expect(pecaDaMontagem(arrastando, "b2").matriz).not.toEqual(pecaDaMontagem(m, "b2").matriz);
  });

  it("peça LIVRE não gira (não tem eixo de encaixe)", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "solta" });
    expect(girarPeca(m, "solta", 2)).toBe(m);
  });

  it("id inexistente não quebra", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "x" });
    expect(girarPeca(m, "nada", 1)).toBe(m);
  });
});

describe("mudarEntrada — a segunda rotação do cubo", () => {
  // O giro roda em torno do eixo do encaixe, e a face cega do cubo MORA nesse
  // eixo quando ele entra pelo topo: ela gira em torno de si mesma e nunca sai
  // de lá (§8.5). Quem tira a face cega do topo é trocar a face de entrada.
  const torreComCubo = (conNovo = "topo") => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "b" });
    return adicionarPecaEncaixada(m, { id: "c", catalogoId: "p30-cubo5", de: "b", conAlvo: "b", conNovo });
  };

  it("trocar a entrada muda a pose da peça", () => {
    const antes = torreComCubo("topo").pecas[1].matriz;
    const depois = mudarEntrada(torreComCubo("topo"), "c", "norte").pecas[1].matriz;
    expect(depois).not.toEqual(antes);
  });

  it("e é o que libera face pra cima, coisa que nenhum giro faz", () => {
    const cima = (m) => conectoresLivres(m).some((k) => k.pecaId === "c" && k.dir[1] > 0.9);
    const pelaFaceDeCima = torreComCubo("topo");
    expect(cima(pelaFaceDeCima)).toBe(false);
    for (let g = 0; g < 4; g++) expect(cima(girarPeca(pelaFaceDeCima, "c", g))).toBe(false);
    expect(cima(mudarEntrada(pelaFaceDeCima, "c", "norte"))).toBe(true);
  });

  it("o que estava preso no cubo acompanha — a fonte da verdade é o encaixe", () => {
    let m = torreComCubo("norte");
    const alvo = conectoresLivres(m).find((k) => k.pecaId === "c" && k.dir[1] > 0.9);
    m = adicionarPecaEncaixada(m, { id: "topo", catalogoId: "p30-b2000", de: "c", conAlvo: alvo.conectorId, conNovo: "a" });
    const antes = pecaDaMontagem(m, "topo").matriz;
    // uma face LIVRE do cubo (a ocupada pelo braço é recusada, e com razão)
    const livre = conectoresLivres(m).find((k) => k.pecaId === "c").conectorId;
    const depois = pecaDaMontagem(mudarEntrada(m, "c", livre), "topo").matriz;
    expect(depois).not.toEqual(antes);
  });

  it("peça livre não tem junta pra trocar — devolve a montagem intacta", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    expect(mudarEntrada(m, "c", "norte")).toBe(m);
  });

  it("face que não existe na peça é erro, não silêncio", () => {
    expect(() => mudarEntrada(torreComCubo(), "c", "zenite")).toThrow(ErroDeMontagem);
  });
});

describe("a face de entrada não pode roubar conector ocupado", () => {
  it("face que já tem peça pendurada é recusada", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "b" });
    m = adicionarPecaEncaixada(m, { id: "c", catalogoId: "p30-cubo5", de: "b", conAlvo: "b", conNovo: "topo" });
    m = adicionarPecaEncaixada(m, { id: "braco", catalogoId: "p30-b1000", de: "c", conAlvo: "norte", conNovo: "a" });
    expect(() => mudarEntrada(m, "c", "norte")).toThrow(ErroDeMontagem);
    expect(mudarEntrada(m, "c", "sul").pecas[1].encaixe.conNovo).toBe("sul");
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
