// serializar.test.js — o que vai pro IndexedDB e pro sync.
// O teste de ida-e-volta é o que protege o dado do usuário: priorizado.
import { describe, it, expect } from "vitest";
import { deJSON, paraJSON } from "./serializar.js";
import {
  ErroDeMontagem, adicionarPecaEncaixada, adicionarPecaLivre, juntas, novaMontagem,
  pecaDaMontagem, adicionarPainel, removerPeca,
} from "./montagem.js";
import { matriz, qDoEixo } from "./vetor.js";

const torre = () => {
  let m = novaMontagem();
  m = adicionarPecaLivre(m, "p30-sapata-baixa", { id: "s1" });
  m = adicionarPecaEncaixada(m, { id: "b1", catalogoId: "p30-b2000", de: "s1", conAlvo: "topo", conNovo: "a" });
  m = adicionarPecaEncaixada(m, { id: "b2", catalogoId: "p30-b1000", de: "b1", conAlvo: "b", conNovo: "a", giro: 2 });
  return m;
};

describe("ida e volta", () => {
  it("JSON → montagem → JSON é IDÊNTICO", () => {
    const original = paraJSON(torre());
    expect(paraJSON(deJSON(original))).toEqual(original);
  });

  it("sobrevive a JSON.stringify/parse (o caminho real do IndexedDB)", () => {
    const original = paraJSON(torre());
    const voltou = paraJSON(deJSON(JSON.parse(JSON.stringify(original))));
    expect(voltou).toEqual(original);
  });

  it("preserva o giro escolhido pelo técnico", () => {
    const m = deJSON(paraJSON(torre()));
    expect(pecaDaMontagem(m, "b2").encaixe.giro).toBe(2);
  });

  it("a saída é ESTÁVEL: mesma montagem, mesmo JSON (o sync não acorda à toa)", () => {
    const m = torre();
    expect(JSON.stringify(paraJSON(m))).toBe(JSON.stringify(paraJSON(m)));
    expect(JSON.stringify(paraJSON(deJSON(paraJSON(m))))).toBe(JSON.stringify(paraJSON(m)));
  });

  it("não guarda geometria — só a árvore de montagem", () => {
    const j = paraJSON(torre());
    const chaves = new Set(j.pecas.flatMap((p) => Object.keys(p)));
    expect([...chaves].sort()).toEqual(["catalogoId", "encaixe", "id", "matriz"]);
  });

  it("peça livre sai SEM a chave `encaixe` (JSON enxuto, diff limpo)", () => {
    const j = paraJSON(adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "x" }));
    expect("encaixe" in j.pecas[0]).toBe(false);
  });
});

describe("versão", () => {
  it("carimba a versão atual", () => {
    expect(paraJSON(torre()).versao).toBe(1);
  });

  it("recusa arquivo de versão FUTURA em vez de abrir pela metade", () => {
    expect(() => deJSON({ versao: 99, pecas: [] })).toThrowError(/versao-futura/);
  });

  it("arquivo sem versão é tratado como 1", () => {
    expect(deJSON({ pecas: [] }).versao).toBe(1);
  });
});

describe("dado torto falha alto", () => {
  it("null vira montagem vazia", () => {
    expect(deJSON(null).pecas).toEqual([]);
  });

  it("objeto sem `pecas` é recusado", () => {
    expect(() => deJSON({ versao: 1 })).toThrowError(/json-invalido/);
    expect(() => deJSON("lixo")).toThrowError(/json-invalido/);
  });

  it("peça sem id ou sem catalogoId é recusada", () => {
    expect(() => deJSON({ versao: 1, pecas: [{ catalogoId: "p30-b2000" }] })).toThrowError(/peca-invalida/);
  });

  it("id duplicado é recusado", () => {
    const p = { id: "a", catalogoId: "p30-b2000" };
    expect(() => deJSON({ versao: 1, pecas: [p, { ...p }] })).toThrowError(/id-duplicado/);
  });

  it("peça fora do catálogo: recusa por padrão, descarta se pedirem", () => {
    const dados = { versao: 1, pecas: [{ id: "a", catalogoId: "p50-b2000" }] };
    expect(() => deJSON(dados)).toThrowError(/peca-desconhecida/);
    expect(deJSON(dados, { descartarDesconhecidas: true }).pecas).toHaveLength(0);
  });

  it("matriz corrompida vira identidade em vez de propagar NaN", () => {
    const m = deJSON({ versao: 1, pecas: [{ id: "a", catalogoId: "p30-b2000", matriz: [1, 2, "x"] }] });
    expect(m.pecas[0].matriz).toHaveLength(16);
    expect(m.pecas[0].matriz.every(Number.isFinite)).toBe(true);
  });

  it("encaixe apontando pra peça que não existe mais vira peça livre", () => {
    const m = deJSON({
      versao: 1,
      pecas: [{ id: "a", catalogoId: "p30-b2000", encaixe: { de: "fantasma", conAlvo: "b", conNovo: "a", giro: 0 } }],
    });
    expect(m.pecas[0].encaixe).toBeNull();
    expect(juntas(m)).toHaveLength(0);
  });
});

describe("recalcular ao carregar", () => {
  // é isto que endireita projeto antigo quando a geometria do catálogo é corrigida
  it("conserta matriz salva errada a partir do encaixe simbólico", () => {
    const j = paraJSON(torre());
    j.pecas[2].matriz = matriz(qDoEixo([1, 0, 0], 0.7), [999, 999, 999]);
    const m = deJSON(j);
    expect(pecaDaMontagem(m, "b2").matriz[13]).toBeCloseTo(2555, 3);
  });

  it("dá pra desligar o recálculo quando se quer o arquivo como está", () => {
    const j = paraJSON(torre());
    j.pecas[2].matriz = matriz(qDoEixo([1, 0, 0], 0.7), [999, 999, 999]);
    const m = deJSON(j, { recalcularMatrizes: false });
    expect(pecaDaMontagem(m, "b2").matriz[13]).toBe(999);
  });
});

describe("os painéis atravessam o arquivo (E4 · E5)", () => {
  const comAncora = () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a" });
    return adicionarPainel(m, { id: "p1", telaId: "t9", de: "a", face: "BAIXO", olha: "L" });
  };
  const comPainel = () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a" });
    return adicionarPainel(m, { id: "p1", telaId: "t9", pos: [1000, 2500, -300], olha: "L" });
  };

  it("ida e volta preserva o painel solto inteiro", () => {
    const json = paraJSON(comPainel());
    expect(json.paineis).toEqual([
      { id: "p1", telaId: "t9", olha: "L", pos: [1000, 2500, -300] },
    ]);
    expect(deJSON(json).paineis).toEqual(json.paineis);
  });

  // ⚠️ O FORMATO ANTIGO NÃO PODE QUEBRAR: projeto gravado antes da E5 abre igual
  it("ida e volta preserva o painel ancorado do formato antigo", () => {
    const json = paraJSON(comAncora());
    expect(json.paineis).toEqual([
      { id: "p1", telaId: "t9", de: "a", face: "BAIXO", olha: "L" },
    ]);
    expect(deJSON(json).paineis).toEqual(json.paineis);
  });

  // estrutura sem painel continua abrindo em quem ainda não atualizou o app
  it("cada versão só entra quando o recurso dela entra", () => {
    expect(paraJSON(adicionarPecaLivre(novaMontagem(), "p30-b2000", { id: "a" })).versao).toBe(1);
    expect(paraJSON(comAncora()).versao).toBe(2);
    expect(paraJSON(comPainel()).versao).toBe(3);
  });

  it("posição torta é erro, não painel no lugar errado", () => {
    expect(() => deJSON({
      versao: 3, pecas: [], paineis: [{ id: "x", telaId: "t", pos: [1, "dois", 3] }],
    })).toThrowError(/painel-invalido/);
  });

  it("sem painel, a chave nem aparece no arquivo", () => {
    expect("paineis" in paraJSON(adicionarPecaLivre(novaMontagem(), "p30-b2000"))).toBe(false);
  });

  it("painel torto é erro, não silêncio", () => {
    expect(() => deJSON({ versao: 2, pecas: [], paineis: [{ id: "x" }] })).toThrow(ErroDeMontagem);
  });

  it("apagar a peça NÃO apaga o painel — ele fica sem apoio", () => {
    const m = removerPeca(comAncora(), "a");
    expect(m.paineis).toHaveLength(1);
    expect(m.pecas).toHaveLength(0);
  });
});
