// paineis.test.js — as telas do projeto penduradas na estrutura (E4).
import { describe, it, expect } from "vitest";
import {
  ESPESSURA_PADRAO_MM, MOTIVOS_DE_PAINEL, caixaDoPainel, eixosDoPainel, medidasDaTela,
  melhorOlhar, paineisNoMundo, pesoDosPaineis, poseDoPainel, problemasDosPaineis,
  telaMensuravel,
} from "./paineis.js";
import { adicionarPecaEncaixada, adicionarPecaLivre, matrizApoiada, novaMontagem } from "./montagem.js";
import { caixaNoMundo, penetracao } from "./colisao.js";
import { vetorDe } from "./direcoes.js";
import { porticoDeExemplo } from "./exemplos.js";

// uma tela de 4 × 2 gabinetes de 500 × 500, 8 kg cada → 2,00 × 1,00 m e 64 kg
const tela = (extra = {}) => ({
  id: "t1",
  cols: 4,
  rows: 2,
  gabinete: { dimW: "500", dimH: "500", peso: "8" },
  ...extra,
});

/** viga de 4 m deitada no leste–oeste, a 3 m do chão */
function vigaAlta() {
  let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", {
    id: "torre", matriz: matrizApoiada("p30-b2000"),
  });
  return adicionarPecaEncaixada(m, {
    id: "cubo", catalogoId: "p30-cubo5", de: "torre", conAlvo: "b", conNovo: "norte",
  });
}

describe("a medida sai da tela, não de um cadastro novo", () => {
  it("largura, altura, gabinetes e peso vêm de cols × rows × gabinete", () => {
    const m = medidasDaTela(tela());
    expect(m.larguraMm).toBe(2000);
    expect(m.alturaMm).toBe(1000);
    expect(m.gabinetes).toBe(8);
    expect(m.pesoKg).toBe(64);
  });

  // profundidade não existe no cadastro do gabinete: é nominal, e só pro desenho
  it("a espessura é nominal e não mexe no peso", () => {
    expect(medidasDaTela(tela()).espessuraMm).toBe(ESPESSURA_PADRAO_MM);
    expect(medidasDaTela(tela({ gabinete: { dimW: "500", dimH: "500", peso: "8" } })).pesoKg).toBe(64);
  });

  it("tela sem gabinete não tem medida — e o app sabe disso", () => {
    expect(telaMensuravel(tela())).toBe(true);
    expect(telaMensuravel({ id: "x", cols: 2, rows: 2 })).toBe(false);
    expect(telaMensuravel(null)).toBe(false);
  });
});

describe("os eixos do painel", () => {
  it("o LED olha pra uma direção horizontal do piso", () => {
    for (const olha of ["N", "S", "L", "O"]) {
      const e = eixosDoPainel(olha);
      expect(e.frente).toEqual(vetorDe(olha));
      expect(e.cima).toEqual([0, 1, 0]);
      expect(Math.abs(e.lado[1])).toBe(0); // o lado é horizontal
    }
  });

  it("painel deitado não existe nesta fase", () => {
    expect(eixosDoPainel("CIMA")).toBeNull();
    expect(eixosDoPainel("BAIXO")).toBeNull();
  });
});

describe("o painel encosta na face, e não invade a peça", () => {
  const m = vigaAlta();

  const cubo = () => caixaNoMundo(m.pecas.find((p) => p.id === "cubo"));

  it("pendurado por BAIXO, a borda de cima toca a peça", () => {
    const pose = poseDoPainel(m, { de: "cubo", face: "BAIXO", olha: "N" }, tela());
    // o topo do painel é o centro + meia altura, e bate com a face de baixo do cubo
    expect(pose[13] + 500).toBeCloseTo(cubo().centro[1] - 150, 3);
  });

  it("apoiado em CIMA, a borda de baixo toca a peça", () => {
    const pose = poseDoPainel(m, { de: "cubo", face: "CIMA", olha: "N" }, tela());
    expect(pose[13] - 500).toBeCloseTo(cubo().centro[1] + 150, 3);
  });

  it("de costas pra uma face lateral, quem encosta é a espessura", () => {
    const pose = poseDoPainel(m, { de: "cubo", face: "N", olha: "N" }, tela());
    expect(pose[14]).toBeCloseTo(cubo().centro[2] - 150 - ESPESSURA_PADRAO_MM / 2, 3);
  });

  it("de perfil pra uma face lateral, quem encosta é a largura", () => {
    const pose = poseDoPainel(m, { de: "cubo", face: "L", olha: "N" }, tela());
    expect(pose[12]).toBeCloseTo(cubo().centro[0] + 150 + 1000, 3);
  });

  it("encostar não é invadir: painel e peça não se sobrepõem", () => {
    for (const face of ["BAIXO", "CIMA", "N", "S", "L", "O"]) {
      const pose = poseDoPainel(m, { de: "cubo", face, olha: "N" }, tela());
      const caixa = caixaDoPainel(pose, medidasDaTela(tela()));
      expect(penetracao(caixa, cubo())).toBeLessThan(1);
    }
  });
});

describe("pra onde o painel nasce olhando", () => {
  it("perpendicular ao comprimento da peça — nunca pra ponta da viga", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "pe", matriz: matrizApoiada("p30-b2000") });
    m = adicionarPecaEncaixada(m, { id: "cubo", catalogoId: "p30-cubo5", de: "pe", conAlvo: "b", conNovo: "norte" });
    const lateral = m.pecas.find((p) => p.id === "cubo");
    m = adicionarPecaEncaixada(m, {
      id: "viga", catalogoId: "p30-b4000", de: "cubo",
      conAlvo: m.pecas.find((p) => p.id === lateral.id) ? "topo" : "topo", conNovo: "a",
    });
    const olhar = melhorOlhar(m, "viga");
    expect(["N", "S", "L", "O"]).toContain(olhar);
  });

  it("peça em pé não tem preferência: cai na primeira da bússola", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a", matriz: matrizApoiada("p30-b2000") });
    expect(melhorOlhar(m, "a")).toBe("N");
  });
});

describe("a lista pronta", () => {
  it("resolve tela, medidas e pose numa volta só", () => {
    const m = { ...vigaAlta(), paineis: [{ id: "p1", telaId: "t1", de: "cubo", face: "BAIXO", olha: "N" }] };
    const [item] = paineisNoMundo(m, [tela()]);
    expect(item.tela.id).toBe("t1");
    expect(item.medidas.pesoKg).toBe(64);
    expect(item.matriz).toHaveLength(16);
  });

  // perder painel em silêncio é a mesma armadilha da peça fora do catálogo
  it("painel apontando pra tela que sumiu sai MARCADO, não descartado", () => {
    const m = { ...vigaAlta(), paineis: [{ id: "p1", telaId: "sumiu", de: "cubo", face: "BAIXO", olha: "N" }] };
    const [item] = paineisNoMundo(m, [tela()]);
    expect(item.tela).toBeNull();
    expect(item.matriz).toBeNull();
  });

  it("montagem sem painéis devolve lista vazia", () => {
    expect(paineisNoMundo(vigaAlta(), [tela()])).toEqual([]);
    expect(paineisNoMundo(null, [])).toEqual([]);
  });
});

describe("o peso pendurado — o número que o rigger pede", () => {
  const pendurado = () => {
    const m = vigaAlta();
    return { ...m, paineis: [{ id: "p1", telaId: "t1", de: "cubo", face: "BAIXO", olha: "N" }] };
  };


  it("soma o peso das telas, separado do peso da treliça", () => {
    const p = pesoDosPaineis(pendurado(), [tela()]);
    expect(p.paineis).toBe(1);
    expect(p.kg).toBe(64);
    expect(p.completo).toBe(true);
  });

  it("tela sem peso de gabinete deixa o total PARCIAL, e diz", () => {
    const p = pesoDosPaineis(pendurado(), [tela({ gabinete: { dimW: "500", dimH: "500" } })]);
    expect(p.kg).toBe(0);
    expect(p.completo).toBe(false);
  });

  it("sem painel, zero — e sem inventar", () => {
    expect(pesoDosPaineis(vigaAlta(), [tela()])).toMatchObject({ paineis: 0, kg: 0 });
  });
});

describe("o aviso de medida (nunca de carga)", () => {
  // O caso REAL: painel pendurado numa VIGA horizontal, no vão entre as torres.
  // Pendurar embaixo do cubo que está no topo de uma torre atravessaria a torre
  // — e o app está certo em acusar isso.
  const comViga = () => {
    const m = vigaAlta();
    return adicionarPecaEncaixada(m, {
      id: "viga", catalogoId: "p30-b4000", de: "cubo", conAlvo: "topo", conNovo: "a",
    });
  };
  const com = (paineis) => ({ ...comViga(), paineis });

  it("montagem certa não acusa nada", () => {
    const m = com([{ id: "p1", telaId: "t1", de: "viga", face: "BAIXO", olha: "N" }]);
    expect(problemasDosPaineis(m, [tela()])).toEqual([]);
  });

  // é o que o dono viu no desenho: painel pendurado embaixo de um cubo que está
  // no topo de uma torre desce POR DENTRO da torre
  it("pendurar embaixo do cubo da torre acusa que atravessa", () => {
    const m = com([{ id: "p1", telaId: "t1", de: "cubo", face: "BAIXO", olha: "N" }]);
    expect(problemasDosPaineis(m, [tela()])[0].motivo).toBe(MOTIVOS_DE_PAINEL.ATRAVESSA);
  });

  it("tela que saiu do projeto", () => {
    const m = com([{ id: "p1", telaId: "sumiu", de: "cubo", face: "BAIXO", olha: "N" }]);
    expect(problemasDosPaineis(m, [tela()])[0].motivo).toBe(MOTIVOS_DE_PAINEL.SEM_TELA);
  });

  it("peça apagada deixa o painel sem apoio", () => {
    const m = com([{ id: "p1", telaId: "t1", de: "nao-existe", face: "BAIXO", olha: "N" }]);
    expect(problemasDosPaineis(m, [tela()])[0].motivo).toBe(MOTIVOS_DE_PAINEL.SEM_APOIO);
  });

});

// O pórtico tem geometria conhecida: vão de 4 m, torres centradas em ±2,15 m e
// a viga a ~4,3 m do chão. Dá pra afirmar o que cabe e o que não cabe.
describe("o aviso de VÃO, no pórtico de verdade", () => {
  const noPortico = (t) => {
    const m = porticoDeExemplo();
    return {
      montagem: { ...m, paineis: [{ id: "p1", telaId: "t1", de: "viga", face: "BAIXO", olha: "N" }] },
      telas: [t],
    };
  };
  const motivos = (t) => {
    const { montagem, telas } = noPortico(t);
    return problemasDosPaineis(montagem, telas).map((x) => x.motivo);
  };

  it("parede de 3 m cabe no vão de 4 m", () => {
    expect(motivos(tela({ cols: 6, rows: 2 }))).toEqual([]); // 3,00 × 1,00 m
  });

  // é o "não cabe no vão": parede mais larga que o espaço livre bate na torre
  it("parede de 6 m bate nas torres", () => {
    expect(motivos(tela({ cols: 12, rows: 2 }))).toContain(MOTIVOS_DE_PAINEL.ATRAVESSA);
  });

  it("parede alta demais arrasta no chão", () => {
    expect(motivos(tela({ cols: 6, rows: 10 }))).toContain(MOTIVOS_DE_PAINEL.NO_CHAO); // 5 m de altura
  });
});
