// snap.test.js — a busca do conector em que a peça vai grudar.
import { describe, it, expect } from "vitest";
import { criarGrade, melhorCandidato, proximos } from "./snap.js";
import { adicionarPecaEncaixada, adicionarPecaLivre, conectores, conectoresLivres, novaMontagem } from "./montagem.js";

const con = (pos, dir, extra = {}) => ({
  pos, dir, rolo: [0, 0, 1], sistema: 300, ocupado: false,
  chave: extra.chave ?? `${pos.join("_")}`, pecaId: extra.pecaId ?? "p", ...extra,
});

describe("grade espacial", () => {
  it("acha só o que está dentro do raio", () => {
    const g = criarGrade([
      con([0, 0, 0], [0, 1, 0], { chave: "perto" }),
      con([0, 150, 0], [0, 1, 0], { chave: "medio" }),
      con([0, 5000, 0], [0, 1, 0], { chave: "longe" }),
    ]);
    expect(proximos(g, [0, 0, 0], 200).map((c) => c.chave).sort()).toEqual(["medio", "perto"]);
    expect(proximos(g, [0, 0, 0], 100).map((c) => c.chave)).toEqual(["perto"]);
  });

  it("atravessa a fronteira de célula (o bug clássico da grade)", () => {
    const g = criarGrade([con([499, 0, 0], [0, 1, 0], { chave: "a" }), con([501, 0, 0], [0, 1, 0], { chave: "b" })], 500);
    expect(proximos(g, [500, 0, 0], 10)).toHaveLength(2);
  });

  it("aguenta muitos conectores sem varrer todos", () => {
    const muitos = [];
    for (let i = 0; i < 4000; i++) muitos.push(con([i * 37, 0, 0], [0, 1, 0], { chave: `c${i}` }));
    const g = criarGrade(muitos);
    expect(g.total).toBe(4000);
    expect(proximos(g, [0, 0, 0], 100).length).toBeLessThan(10);
  });
});

describe("melhorCandidato", () => {
  const movel = con([0, 0, 0], [0, -1, 0], { chave: "movel", pecaId: "nova" });

  it("acha o alvo que ENFRENTA e está no raio", () => {
    const g = criarGrade([con([0, 50, 0], [0, 1, 0], { chave: "bom", pecaId: "a" })]);
    expect(melhorCandidato(g, movel)?.alvo.chave).toBe("bom");
  });

  it("ignora conector OCUPADO", () => {
    const g = criarGrade([con([0, 50, 0], [0, 1, 0], { chave: "x", pecaId: "a", ocupado: true })]);
    expect(melhorCandidato(g, movel)).toBeNull();
  });

  it("ignora conector PARALELO (não se enfrentam)", () => {
    const g = criarGrade([con([0, 50, 0], [1, 0, 0], { chave: "x", pecaId: "a" })]);
    expect(melhorCandidato(g, movel)).toBeNull();
  });

  it("ignora sistema incompatível — P30 não entra em P50", () => {
    const g = criarGrade([con([0, 50, 0], [0, 1, 0], { chave: "x", pecaId: "a", sistema: 500 })]);
    expect(melhorCandidato(g, movel)).toBeNull();
    expect(melhorCandidato(g, { ...movel, sistema: 500 })?.alvo.chave).toBe("x");
  });

  it("ignora a própria peça em movimento", () => {
    const g = criarGrade([con([0, 50, 0], [0, 1, 0], { chave: "eu", pecaId: "nova" })]);
    expect(melhorCandidato(g, movel, { ignorarPecas: ["nova"] })).toBeNull();
  });

  it("o mais PERTO ganha", () => {
    const g = criarGrade([
      con([0, 120, 0], [0, 1, 0], { chave: "longe", pecaId: "a" }),
      con([0, 30, 0], [0, 1, 0], { chave: "perto", pecaId: "b" }),
    ]);
    expect(melhorCandidato(g, movel)?.alvo.chave).toBe("perto");
  });

  // empate técnico: quem está mais "de frente" é o que o técnico quis
  it("em empate de distância, o melhor ENFRENTAMENTO ganha", () => {
    const g = criarGrade([
      con([0, 50, 0], [0, 0.8, 0.6], { chave: "torto", pecaId: "a" }),
      con([0, 52, 0], [0, 1, 0], { chave: "reto", pecaId: "b" }),
    ]);
    expect(melhorCandidato(g, movel)?.alvo.chave).toBe("reto");
  });

  it("fora do raio não é candidato", () => {
    const g = criarGrade([con([0, 900, 0], [0, 1, 0], { chave: "x", pecaId: "a" })]);
    expect(melhorCandidato(g, movel, { raioMm: 200 })).toBeNull();
    expect(melhorCandidato(g, movel, { raioMm: 1000 })?.alvo.chave).toBe("x");
  });
});

describe("integrado com a montagem", () => {
  it("uma barra solta encontra o topo livre da torre", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-sapata-baixa", { id: "s" });
    m = adicionarPecaEncaixada(m, { id: "b", catalogoId: "p30-b2000", de: "s", conAlvo: "topo", conNovo: "a" });

    const grade = criarGrade(conectoresLivres(m));
    const topo = conectoresLivres(m)[0];
    // peça nova chegando perto do topo, apontando pra baixo
    const movel = { pos: [0, topo.pos[1] + 40, 0], dir: [0, -1, 0], rolo: [0, 0, 1], sistema: 300, pecaId: "nova" };

    const achado = melhorCandidato(grade, movel);
    expect(achado?.alvo.chave).toBe("b:b");
    expect(achado.distancia).toBeCloseTo(40, 6);
  });

  it("não oferece conector já ocupado da estrutura", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-sapata-baixa", { id: "s" });
    m = adicionarPecaEncaixada(m, { id: "b", catalogoId: "p30-b2000", de: "s", conAlvo: "topo", conNovo: "a" });

    const grade = criarGrade(conectores(m)); // TODOS, inclusive ocupados
    const movel = { pos: [0, 55, 0], dir: [0, -1, 0], rolo: [0, 0, 1], sistema: 300, pecaId: "nova" };
    expect(melhorCandidato(grade, movel)).toBeNull();
  });
});
