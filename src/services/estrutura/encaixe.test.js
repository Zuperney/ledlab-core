// encaixe.test.js — o coração do motor: duas peças que se encontram.
import { describe, it, expect } from "vitest";
import {
  afastamento, conectorNoMundo, encaixeRecuado, enfrentamento, normalizarGiro,
  podeEncaixar, resolverEncaixe,
} from "./encaixe.js";
import { conectorPorId, pecaPorId } from "./catalogo.js";
import { escalar, matriz, qDoEixo, IDENTIDADE, MATRIZ_IDENTIDADE } from "./vetor.js";

const perto = (v, alvo, casas = 4) =>
  v.forEach((n, i) => expect(n).toBeCloseTo(alvo[i], casas));

const barra = (id) => pecaPorId(id);
const con = (peca, id) => conectorPorId(peca, id);

describe("normalizarGiro", () => {
  it("gira em 4 passos e dá a volta nos dois sentidos", () => {
    expect([0, 1, 2, 3, 4, 5, -1, -4].map(normalizarGiro)).toEqual([0, 1, 2, 3, 0, 1, 3, 0]);
  });
});

describe("resolverEncaixe — a regra fundamental", () => {
  const b2 = barra("p30-b2000");
  const b1 = barra("p30-b1000");

  it("os centros dos conectores COINCIDEM depois do encaixe", () => {
    const alvo = conectorNoMundo(con(b2, "b"), MATRIZ_IDENTIDADE);
    const { matriz: m } = resolverEncaixe(alvo, con(b1, "a"), 0);
    const novo = conectorNoMundo(con(b1, "a"), m);
    perto(novo.pos, alvo.pos);
  });

  it("as normais se ENFRENTAM (dirNovo = −dirAlvo)", () => {
    const alvo = conectorNoMundo(con(b2, "b"), MATRIZ_IDENTIDADE);
    const { matriz: m } = resolverEncaixe(alvo, con(b1, "a"), 0);
    const novo = conectorNoMundo(con(b1, "a"), m);
    expect(escalar(alvo.dir, novo.dir)).toBeCloseTo(-1, 5);
  });

  it("empilha na altura certa: 2 m + 1 m com o topo em 2000", () => {
    // barra de 2 m centrada na origem → topo em +1000
    const alvo = conectorNoMundo(con(b2, "b"), MATRIZ_IDENTIDADE);
    expect(alvo.pos[1]).toBe(1000);
    const { posicao } = resolverEncaixe(alvo, con(b1, "a"), 0);
    // a de 1 m fica centrada em 1000 + 500 = 1500 → topo dela em 2000
    perto(posicao, [0, 1500, 0]);
  });

  it("funciona com o alvo em qualquer pose, não só na origem", () => {
    const alvoM = matriz(qDoEixo([0, 0, 1], Math.PI / 3), [1234, -567, 890]);
    const alvo = conectorNoMundo(con(b2, "b"), alvoM);
    const { matriz: m } = resolverEncaixe(alvo, con(b1, "a"), 0);
    const novo = conectorNoMundo(con(b1, "a"), m);
    perto(novo.pos, alvo.pos, 3);
    expect(escalar(alvo.dir, novo.dir)).toBeCloseTo(-1, 5);
  });

  // este é o caso que o espeque manda NÃO simplificar: quando as direções já são
  // opostas, o quatérnio mais curto é degenerado e o rolo sairia imprevisível.
  it("o rolo é DETERMINÍSTICO mesmo no caso degenerado", () => {
    const alvo = conectorNoMundo(con(b2, "b"), MATRIZ_IDENTIDADE);
    const a = resolverEncaixe(alvo, con(b1, "b"), 0); // dir do novo já é +Y, igual ao alvo
    const b = resolverEncaixe(alvo, con(b1, "b"), 0);
    expect(a.matriz).toEqual(b.matriz);
    const novo = conectorNoMundo(con(b1, "b"), a.matriz);
    expect(escalar(alvo.dir, novo.dir)).toBeCloseTo(-1, 5);
  });
});

describe("giro em passos de 90°", () => {
  const cubo = pecaPorId("p30-cubo5");
  const b1 = barra("p30-b1000");
  const alvo = conectorNoMundo(con(cubo, "leste"), MATRIZ_IDENTIDADE);

  it("os 4 passos são poses distintas", () => {
    const poses = [0, 1, 2, 3].map((k) => JSON.stringify(resolverEncaixe(alvo, con(b1, "a"), k).matriz));
    expect(new Set(poses).size).toBe(4);
  });

  it("4 passos voltam à pose inicial", () => {
    const a = resolverEncaixe(alvo, con(b1, "a"), 0).matriz;
    const b = resolverEncaixe(alvo, con(b1, "a"), 4).matriz;
    b.forEach((n, i) => expect(n).toBeCloseTo(a[i], 4));
  });

  it("girar NÃO desencaixa: o centro e as normais continuam certos", () => {
    for (const k of [0, 1, 2, 3]) {
      const { matriz: m } = resolverEncaixe(alvo, con(b1, "a"), k);
      const novo = conectorNoMundo(con(b1, "a"), m);
      perto(novo.pos, alvo.pos, 3);
      expect(escalar(alvo.dir, novo.dir)).toBeCloseTo(-1, 5);
    }
  });
});

describe("encaixeRecuado (a prévia fantasma)", () => {
  it("fica na mesma orientação, afastado ao longo da normal do alvo", () => {
    const b2 = barra("p30-b2000");
    const b1 = barra("p30-b1000");
    const alvo = conectorNoMundo(con(b2, "b"), MATRIZ_IDENTIDADE);
    const encaixado = resolverEncaixe(alvo, con(b1, "a"), 0);
    const recuado = encaixeRecuado(alvo, con(b1, "a"), 0, 60);
    expect(recuado.posicao[1] - encaixado.posicao[1]).toBeCloseTo(60, 4);
    expect(recuado.quaternio).toEqual(encaixado.quaternio);
  });
});

describe("podeEncaixar", () => {
  const frente = { dir: [0, 1, 0], pos: [0, 0, 0] };
  const contra = { dir: [0, -1, 0], pos: [0, 0, 0] };
  const lado = { dir: [1, 0, 0], pos: [0, 0, 0] };

  it("normais opostas encaixam", () => {
    expect(podeEncaixar(frente, contra)).toBe(true);
  });

  it("normais perpendiculares NÃO encaixam", () => {
    expect(podeEncaixar(frente, lado)).toBe(false);
  });

  it("normais iguais (peça de costas) NÃO encaixam", () => {
    expect(podeEncaixar(frente, frente)).toBe(false);
  });

  it("sistema diferente NÃO encaixa — P30 não entra em P50", () => {
    expect(podeEncaixar(frente, contra, { sistemaA: 300, sistemaB: 500 })).toBe(false);
    expect(podeEncaixar(frente, contra, { sistemaA: 300, sistemaB: 300 })).toBe(true);
  });
});

describe("afastamento e enfrentamento", () => {
  it("medem distância e o quanto as normais se olham", () => {
    const a = { pos: [0, 0, 0], dir: [0, 1, 0] };
    const b = { pos: [0, 30, 40], dir: [0, -1, 0] };
    expect(afastamento(a, b)).toBe(50);
    expect(enfrentamento(a, b)).toBeCloseTo(1, 6);
    expect(enfrentamento(a, { ...b, dir: [1, 0, 0] })).toBe(0);
  });
});

describe("conectorNoMundo", () => {
  it("a identidade devolve o conector local intacto", () => {
    const c = con(barra("p30-b1000"), "b");
    const m = conectorNoMundo(c, matriz(IDENTIDADE, [0, 0, 0]));
    perto(m.pos, c.pos);
    perto(m.dir, c.dir);
  });
});
