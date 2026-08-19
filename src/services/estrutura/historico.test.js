// historico.test.js — desfazer e refazer sem snapshot.
import { describe, it, expect } from "vitest";
import {
  ACOES, criarHistorico, desfazerUm, executar, podeDesfazer, podeRefazer, refazerUm,
} from "./historico.js";
import { juntas, novaMontagem, pecaDaMontagem } from "./montagem.js";
import { paraJSON } from "./serializar.js";

const addLivre = (id, catalogoId = "p30-b2000") => ({
  tipo: ACOES.ADICIONAR_LIVRE, id, catalogoId,
});
const addEncaixada = (id, de, catalogoId = "p30-b1000") => ({
  tipo: ACOES.ADICIONAR_ENCAIXADA, id, catalogoId, de, conAlvo: "b", conNovo: "a",
});

const torre = () => {
  let h = criarHistorico();
  h = executar(h, addLivre("b1"));
  h = executar(h, addEncaixada("b2", "b1"));
  h = executar(h, addEncaixada("b3", "b2"));
  return h;
};

describe("executar", () => {
  it("aplica e empilha o inverso", () => {
    const h = executar(criarHistorico(), addLivre("x"));
    expect(h.montagem.pecas).toHaveLength(1);
    expect(podeDesfazer(h)).toBe(true);
    expect(podeRefazer(h)).toBe(false);
  });

  it("histórico novo não tem o que desfazer", () => {
    expect(podeDesfazer(criarHistorico())).toBe(false);
  });
});

describe("desfazer e refazer", () => {
  // o teste mais valioso: o estado tem que voltar IDÊNTICO, não parecido
  it("desfazer + refazer devolve o estado EXATO", () => {
    const h = torre();
    const antes = paraJSON(h.montagem);
    const volta = refazerUm(desfazerUm(h));
    expect(paraJSON(volta.montagem)).toEqual(antes);
  });

  it("desfazer até o fim volta ao projeto vazio", () => {
    let h = torre();
    while (podeDesfazer(h)) h = desfazerUm(h);
    expect(h.montagem.pecas).toHaveLength(0);
    expect(paraJSON(h.montagem)).toEqual(paraJSON(novaMontagem()));
  });

  it("refazer tudo reconstrói a torre inteira", () => {
    const original = torre();
    let h = original;
    while (podeDesfazer(h)) h = desfazerUm(h);
    while (podeRefazer(h)) h = refazerUm(h);
    expect(paraJSON(h.montagem)).toEqual(paraJSON(original.montagem));
  });

  it("comando novo LIMPA a pilha de refazer (o galho deixou de existir)", () => {
    let h = desfazerUm(torre());
    expect(podeRefazer(h)).toBe(true);
    h = executar(h, addLivre("outra", "p30-cubo5"));
    expect(podeRefazer(h)).toBe(false);
  });

  it("desfazer sem nada na pilha é inofensivo", () => {
    const h = criarHistorico();
    expect(desfazerUm(h)).toBe(h);
    expect(refazerUm(h)).toBe(h);
  });
});

describe("desfazer uma REMOÇÃO", () => {
  it("devolve a peça na mesma posição da lista", () => {
    let h = torre();
    h = executar(h, { tipo: ACOES.REMOVER, id: "b2" });
    expect(h.montagem.pecas.map((p) => p.id)).toEqual(["b1", "b3"]);
    h = desfazerUm(h);
    expect(h.montagem.pecas.map((p) => p.id)).toEqual(["b1", "b2", "b3"]);
  });

  // sem isto o "desfazer" mentiria: a peça voltaria, mas solta
  it("reata os ÓRFÃOS — quem tinha virado livre volta encaixado", () => {
    let h = torre();
    h = executar(h, { tipo: ACOES.REMOVER, id: "b2" });
    expect(pecaDaMontagem(h.montagem, "b3").encaixe).toBeNull();
    expect(juntas(h.montagem)).toHaveLength(0);

    h = desfazerUm(h);
    expect(pecaDaMontagem(h.montagem, "b3").encaixe).toEqual({
      de: "b2", conAlvo: "b", conNovo: "a", giro: 0,
    });
    expect(juntas(h.montagem)).toHaveLength(2);
  });

  it("remoção → desfazer → refazer fecha o ciclo", () => {
    let h = torre();
    const comTudo = paraJSON(h.montagem);
    h = executar(h, { tipo: ACOES.REMOVER, id: "b2" });
    const semB2 = paraJSON(h.montagem);
    expect(paraJSON(desfazerUm(h).montagem)).toEqual(comTudo);
    expect(paraJSON(refazerUm(desfazerUm(h)).montagem)).toEqual(semB2);
  });
});

describe("limite da pilha", () => {
  it("descarta o passo mais antigo em vez de estourar a memória", () => {
    let h = criarHistorico(novaMontagem(), 3);
    for (let i = 0; i < 10; i++) h = executar(h, addLivre(`p${i}`));
    expect(h.desfazer).toHaveLength(3);
    expect(h.montagem.pecas).toHaveLength(10);
  });
});

describe("ação desconhecida", () => {
  it("falha alto em vez de virar no-op silencioso", () => {
    expect(() => executar(criarHistorico(), { tipo: "voar" })).toThrowError(/ação desconhecida/);
  });
});

describe("desfazer um GIRO", () => {
  const comCubo = () => {
    let h = criarHistorico();
    h = executar(h, { tipo: ACOES.ADICIONAR_LIVRE, id: "c", catalogoId: "p30-cubo5" });
    h = executar(h, {
      tipo: ACOES.ADICIONAR_ENCAIXADA, id: "b", catalogoId: "p30-b2000",
      de: "c", conAlvo: "leste", conNovo: "a",
    });
    return h;
  };

  it("volta ao giro anterior, não ao zero", () => {
    let h = comCubo();
    h = executar(h, { tipo: ACOES.GIRAR, id: "b", giro: 2 });
    h = executar(h, { tipo: ACOES.GIRAR, id: "b", giro: 3 });
    expect(pecaDaMontagem(desfazerUm(h).montagem, "b").encaixe.giro).toBe(2);
  });

  it("girar → desfazer devolve o estado EXATO", () => {
    const h = comCubo();
    const antes = paraJSON(h.montagem);
    const girado = executar(h, { tipo: ACOES.GIRAR, id: "b", giro: 1 });
    expect(paraJSON(desfazerUm(girado).montagem)).toEqual(antes);
  });
});

describe("o lote — várias ações que valem como uma", () => {
  // apagar 5 peças de uma vez e ter que apertar Ctrl+Z cinco vezes pra voltar
  // é o app cobrando pelo gesto que ele mesmo ofereceu (§8.6, C2)
  const tresPecas = () => {
    let h = criarHistorico();
    for (const id of ["a", "b", "c"]) {
      h = executar(h, { tipo: ACOES.ADICIONAR_LIVRE, id, catalogoId: "p30-b2000" });
    }
    return h;
  };

  it("apaga três peças e desfaz com UM passo só", () => {
    const h = executar(tresPecas(), {
      tipo: ACOES.LOTE,
      acoes: ["a", "b", "c"].map((id) => ({ tipo: ACOES.REMOVER, id })),
    });
    expect(h.montagem.pecas).toHaveLength(0);
    expect(h.desfazer).toHaveLength(4); // os 3 adicionares + O LOTE, não 3 + 3

    const voltou = desfazerUm(h);
    expect(voltou.montagem.pecas.map((p) => p.id)).toEqual(["a", "b", "c"]);
    expect(voltou.desfazer).toHaveLength(3); // um Ctrl+Z devolveu as três
  });

  it("e refaz também num passo", () => {
    const h = executar(tresPecas(), {
      tipo: ACOES.LOTE,
      acoes: ["a", "c"].map((id) => ({ tipo: ACOES.REMOVER, id })),
    });
    expect(refazerUm(desfazerUm(h)).montagem.pecas.map((p) => p.id)).toEqual(["b"]);
  });

  // o inverso da segunda ação depende de a primeira já ter acontecido
  it("o inverso é calculado encadeando o estado, não sobre o estado inicial", () => {
    let h = criarHistorico();
    h = executar(h, { tipo: ACOES.ADICIONAR_LIVRE, id: "base", catalogoId: "p30-b2000" });
    h = executar(h, {
      tipo: ACOES.LOTE,
      acoes: [
        { tipo: ACOES.ADICIONAR_ENCAIXADA, id: "topo", catalogoId: "p30-b2000", de: "base", conAlvo: "b", conNovo: "a" },
        { tipo: ACOES.REMOVER, id: "base" },
      ],
    });
    expect(h.montagem.pecas.map((p) => p.id)).toEqual(["topo"]);

    const voltou = desfazerUm(h);
    expect(voltou.montagem.pecas.map((p) => p.id)).toEqual(["base"]);
  });

  it("lote vazio não empilha passo nenhum", () => {
    const h = executar(tresPecas(), { tipo: ACOES.LOTE, acoes: [] });
    expect(h.montagem.pecas).toHaveLength(3);
    expect(h.desfazer).toHaveLength(3); // só os três adicionares
  });
});

describe("desfazer a troca de face de entrada", () => {
  const comCubo = () => {
    let h = executar(criarHistorico(), { tipo: ACOES.ADICIONAR_LIVRE, id: "b", catalogoId: "p30-b2000" });
    return executar(h, {
      tipo: ACOES.ADICIONAR_ENCAIXADA, id: "c", catalogoId: "p30-cubo5",
      de: "b", conAlvo: "b", conNovo: "topo",
    });
  };

  it("volta a face que estava antes, não uma qualquer", () => {
    const h = executar(comCubo(), { tipo: ACOES.ENTRADA, id: "c", conNovo: "leste" });
    expect(h.montagem.pecas[1].encaixe.conNovo).toBe("leste");
    expect(desfazerUm(h).montagem.pecas[1].encaixe.conNovo).toBe("topo");
  });
});
