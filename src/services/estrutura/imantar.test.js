// imantar.test.js — o ímã do desenho e a trena (E5).
import { describe, it, expect } from "vitest";
import {
  IMA_MM, PASSO_PADRAO_MM, imantar, imantarPonto, maisProximo, medir, planosDeImante,
  pontosNotaveis,
} from "./imantar.js";
import { adicionarPainel, adicionarPecaLivre, novaMontagem } from "./montagem.js";
import { medidasDaTela, meiasNoMundo } from "./paineis.js";
import { porticoDeExemplo } from "./exemplos.js";

// uma tela de 4 × 2 gabinetes de 500 × 500, 8 kg cada → 2,00 × 1,00 m e 64 kg
const tela = (extra = {}) => ({
  id: "t1",
  cols: 4,
  rows: 2,
  gabinete: { dimW: "500", dimH: "500", peso: "8" },
  ...extra,
});
const MEDIDAS = medidasDaTela(tela());

/** uma montagem só com uma tela solta, no lugar que o teste pedir */
const comTela = (pos, olha = "N", id = "pn1") =>
  adicionarPainel(novaMontagem(), { id, telaId: "t1", olha, pos });

describe("a busca binária do plano mais próximo", () => {
  const lista = [-1000, 0, 250, 3000];

  it("acha o vizinho de cada lado e resolve o empate pelo de baixo", () => {
    expect(maisProximo(lista, 240)).toBe(250);
    expect(maisProximo(lista, 100)).toBe(0);
    expect(maisProximo(lista, 125)).toBe(0); // empate exato
    expect(maisProximo(lista, 3000)).toBe(3000);
  });

  it("fora das pontas devolve a ponta, e lista vazia não devolve nada", () => {
    expect(maisProximo(lista, -99999)).toBe(-1000);
    expect(maisProximo(lista, 99999)).toBe(3000);
    expect(maisProximo([], 0)).toBeNull();
  });
});

describe("os planos onde a tela gruda", () => {
  it("cada peça entrega borda, meio e borda em cada eixo", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a" });
    const [x, y, z] = planosDeImante(m, []);
    // a barra é simétrica no X e no Z: borda, meio e borda dão três valores
    expect(x).toHaveLength(3);
    expect(z).toHaveLength(3);
    expect(x[1]).toBe(0); // o meio da peça, que nasce na origem
    // o piso entra como mais um plano — sem ele, largar no chão exigiria mira
    // de milímetro justamente no caso mais comum do palco
    expect(y).toContain(0);
  });

  // ⚠️ SEM ISTO O ARRASTE TRAVA NO LUGAR: a tela gruda nela mesma e não sai mais
  it("a tela que está sendo movida não entra nos próprios planos", () => {
    const m = comTela([5000, 500, 5000]);
    expect(planosDeImante(m, [tela()], null)[0]).toContain(5000);
    expect(planosDeImante(m, [tela()], "pn1")[0]).not.toContain(5000);
  });
});

describe("o ímã encosta a borda, eixo por eixo", () => {
  const planos = (m) => planosDeImante(m, [tela()], "movel");

  it("borda com borda: duas paredes ficam emendadas, não 'quase'", () => {
    // uma tela de 2 m centrada em x=0 vai de -1000 a +1000
    const m = comTela([0, 500, 0]);
    // a segunda chega com a borda esquerda a 8 cm da direita da primeira
    const bruto = [1000 + MEDIDAS.larguraMm / 2 - 80, 500, 0];
    const { pos, presos } = imantar(planos(m), MEDIDAS, "N", bruto);
    expect(pos[0]).toBe(1000 + MEDIDAS.larguraMm / 2); // encostou de verdade
    expect(presos[0]).toBe(true);
  });

  it("longe demais não puxa: cai na grade de 10 cm", () => {
    const m = comTela([0, 500, 0]);
    const bruto = [20000 + 37, 500, 20000 + 37];
    const { pos, presos } = imantar(planos(m), MEDIDAS, "N", bruto);
    expect(pos[0] % PASSO_PADRAO_MM).toBe(0);
    expect(presos[0]).toBe(false);
    expect(Math.abs(pos[0] - bruto[0])).toBeLessThanOrEqual(PASSO_PADRAO_MM / 2);
  });

  // é o que permite encostar duas paredes lado a lado sem que o app resolva
  // mexer também na altura delas
  it("cada eixo decide sozinho", () => {
    const m = comTela([0, 500, 0]);
    const alto = [1000 + MEDIDAS.larguraMm / 2 - 80, 9000 + 43, 20000];
    const { pos, presos } = imantar(planos(m), MEDIDAS, "N", alto);
    expect(presos[0]).toBe(true);
    expect(presos[1]).toBe(false);
    expect(pos[1]).toBe(9000); // a altura só arredondou na grade
  });

  it("o piso é um plano como outro qualquer: a borda de baixo pousa nele", () => {
    const m = novaMontagem();
    const meias = meiasNoMundo(MEDIDAS, "N");
    const bruto = [0, meias[1] + 90, 0]; // 9 cm acima do chão
    const { pos, presos } = imantar(planosDeImante(m, []), MEDIDAS, "N", bruto);
    expect(pos[1]).toBe(meias[1]); // a borda de baixo no zero
    expect(presos[1]).toBe(true);
  });

  it("desligado, o ímã não puxa nada — a tela para na grade", () => {
    const m = comTela([0, 500, 0]);
    const bruto = [1000 + MEDIDAS.larguraMm / 2 - 80, 500, 0];
    const { pos, presos } = imantar(planos(m), MEDIDAS, "N", bruto, { ligado: false });
    expect(presos.every((p) => p === false)).toBe(true);
    expect(pos[0] % PASSO_PADRAO_MM).toBe(0);
  });

  it("o alcance é o alcance: um milímetro além dele já não gruda", () => {
    const m = comTela([0, 500, 0]);
    const meia = MEDIDAS.larguraMm / 2;
    const dentro = imantar(planos(m), MEDIDAS, "N", [1000 + meia - IMA_MM, 500, 0]);
    const fora = imantar(planos(m), MEDIDAS, "N", [1000 + meia - IMA_MM - 1, 500, 0]);
    expect(dentro.presos[0]).toBe(true);
    expect(fora.presos[0]).toBe(false);
  });
});

describe("a trena", () => {
  it("gruda nos nós da treliça e nas quinas das telas", () => {
    const m = adicionarPainel(porticoDeExemplo(), {
      id: "pn1", telaId: "t1", olha: "N", pos: [0, 500, 0],
    });
    const pontos = pontosNotaveis(m, [tela()]);
    const meias = meiasNoMundo(MEDIDAS, "N");
    // as oito quinas da tela estão lá
    expect(pontos).toContainEqual([meias[0], 500 + meias[1], meias[2]]);
    // e há muito mais que só elas: os conectores de todas as peças
    expect(pontos.length).toBeGreaterThan(8);
  });

  it("perto de um ponto notável, o clique vira ELE", () => {
    const pontos = [[1000, 2000, 3000]];
    const { ponto, preso } = imantarPonto(pontos, [1000 + 120, 2000 - 90, 3000]);
    expect(ponto).toEqual([1000, 2000, 3000]);
    expect(preso).toBe(true);
  });

  // "3,00 m" é uma medida melhor que "2,987 m" pra quem está desenhando
  it("longe de tudo, arredonda na grade em vez de deixar o número solto", () => {
    const { ponto, preso } = imantarPonto([], [2987, 13, -1044]);
    expect(ponto).toEqual([3000, 0, -1000]);
    expect(preso).toBe(false);
  });

  // quem mede vão quer a horizontal; quem mede içamento quer a vertical, e a
  // reta entre dois pontos em diagonal não responde nem uma nem outra
  it("devolve a reta E as projeções", () => {
    const d = medir([0, 0, 0], [3000, 4000, 0]);
    expect(d.mm).toBe(5000);
    expect(d.horizontalMm).toBe(3000);
    expect(d.verticalMm).toBe(4000);
    expect(d.dy).toBe(4000);
  });

  it("sem as duas pontas não há medida", () => {
    expect(medir([0, 0, 0], null)).toBeNull();
  });
});
