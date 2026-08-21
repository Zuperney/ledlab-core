// imantar.test.js — o ímã do desenho e a trena (E5).
import { describe, it, expect } from "vitest";
import {
  IMA_MM, PASSO_PADRAO_MM, imantar, imantarPonto, maisProximo, medir, planosDeImante,
  pontosDaTela, pontosDeImante, pontosNotaveis,
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

// ══ OS NOVE PONTOS: tela × tela é encaixe RIGOROSO ═══════════
describe("pontosDaTela — os oito puxadores da moldura, mais o miolo", () => {
  it("são nove, no plano da face, e a espessura não entra", () => {
    const pts = pontosDaTela([0, 500, 0], MEDIDAS, "N");
    expect(pts).toHaveLength(9);
    expect(pts.every((p) => p[2] === 0)).toBe(true); // tudo na profundidade do centro
    expect(pts).toContainEqual([0, 500, 0]); // o centro
    expect(pts).toContainEqual([1000, 0, 0]); // uma quina de baixo
    expect(pts).toContainEqual([0, 1000, 0]); // meio da borda de cima
  });

  it("acompanham o giro do LED: olhando pro leste, a largura mora no Z", () => {
    const pts = pontosDaTela([0, 500, 0], MEDIDAS, "L");
    expect(pts.every((p) => p[0] === 0)).toBe(true);
    expect(pts.map((p) => p[2]).sort((a, b) => a - b)[0]).toBe(-1000);
  });

  it("a tela que está sendo movida não entra nos próprios pontos", () => {
    const m = comTela([0, 500, 0]);
    expect(pontosDeImante(m, [tela()], null)).toHaveLength(9);
    expect(pontosDeImante(m, [tela()], "pn1")).toHaveLength(0);
  });
});

describe("o ímã ponto a ponto", () => {
  const vizinha = comTela([0, 500, 0]);           // pontos em x ∈ {-1000, 0, 1000}
  const pontos = () => pontosDeImante(vizinha, [tela()], "movel");

  // quina com quina, nos TRÊS eixos de uma vez — é o que emenda parede de verdade
  it("casa a quina e corrige os três eixos numa tacada", () => {
    const bruto = [2060, 540, 30];
    const r = imantar(planosDeImante(vizinha, [tela()], "movel"), MEDIDAS, "N", bruto, { pontos: pontos() });
    expect(r.pos).toEqual([2000, 500, 0]); // encostada exata na vizinha
    expect(r.ponto).toBe(true);
    expect(r.presos).toEqual([true, true, true]);
  });

  // a ÂNCORA é o que a vista acende: ímã que gruda sem dizer onde parece bug
  it("devolve o PONTO que pegou, pra vista poder acender ele", () => {
    const r = imantar(planosDeImante(vizinha, [tela()], "movel"), MEDIDAS, "N", [2060, 540, 30], { pontos: pontos() });
    expect(r.ancora).toEqual([1000, 0, 0]); // a quina de baixo-direita da vizinha
  });

  it("sem encaixe de ponto não há âncora pra acender", () => {
    const r = imantar(planosDeImante(vizinha, [tela()], "movel"), MEDIDAS, "N", [20037, 9043, 20000], { pontos: pontos() });
    expect(r.ancora).toBeNull();
  });

  it("longe demais não casa ponto: cai na régua dos planos", () => {
    const bruto = [20000 + 37, 9000 + 43, 20000];
    const r = imantar(planosDeImante(vizinha, [tela()], "movel"), MEDIDAS, "N", bruto, { pontos: pontos() });
    expect(r.ponto).toBe(false);
    expect(r.pos[0] % PASSO_PADRAO_MM).toBe(0);
  });

  it("desligado, nem ponto nem plano", () => {
    const r = imantar(planosDeImante(vizinha, [tela()], "movel"), MEDIDAS, "N", [2060, 540, 30], { pontos: pontos(), ligado: false });
    expect(r.ponto).toBe(false);
    expect(r.presos.every((p) => p === false)).toBe(true);
  });
});

// ⚠️ A TRAVA É DO DEDO DO TÉCNICO: ímã que a desfaz é ímã que atrapalha
describe("a trava de eixo (Shift / Ctrl)", () => {
  const vizinha = comTela([0, 500, 0]);
  const opts = (eixos) => ({ pontos: pontosDeImante(vizinha, [tela()], "movel"), eixos });
  const planos = () => planosDeImante(vizinha, [tela()], "movel");

  it("Shift (só altura): X e Z ficam exatamente onde estavam", () => {
    const r = imantar(planos(), MEDIDAS, "N", [2060, 540, 30], opts([false, true, false]));
    expect(r.pos[0]).toBe(2060); // nem gruda, nem arredonda na grade
    expect(r.pos[2]).toBe(30);
    expect(r.pos[1]).toBe(500); // a altura, essa sim, casa com a vizinha
    expect(r.presos).toEqual([false, true, false]);
  });

  it("Ctrl (só chão): a altura não se mexe nem por ímã", () => {
    const r = imantar(planos(), MEDIDAS, "N", [2060, 540, 30], opts([true, false, true]));
    expect(r.pos[1]).toBe(540);
    expect([r.pos[0], r.pos[2]]).toEqual([2000, 0]);
    expect(r.presos).toEqual([true, false, true]);
  });

  it("tudo travado não move nada", () => {
    const r = imantar(planos(), MEDIDAS, "N", [2060, 540, 30], opts([false, false, false]));
    expect(r.pos).toEqual([2060, 540, 30]);
  });
});
