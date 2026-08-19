// serializar.test.js — o que vai pro IndexedDB e pro sync.
// O teste de ida-e-volta é o que protege o dado do usuário: priorizado.
import { describe, it, expect } from "vitest";
import { deJSON, migrarCatalogoId, paraJSON } from "./serializar.js";
import {
  VERSAO_MONTAGEM, adicionarPecaEncaixada, adicionarPecaLivre, juntas, novaMontagem,
  pecaDaMontagem,
} from "./montagem.js";
import { pecaPorId } from "./catalogo.js";
import { matriz, qDoEixo } from "./vetor.js";

const torre = () => {
  let m = novaMontagem();
  m = adicionarPecaLivre(m, "base-baixa", { id: "s1" });
  m = adicionarPecaEncaixada(m, { id: "b1", catalogoId: "barra-2000", de: "s1", conAlvo: "topo", conNovo: "a" });
  m = adicionarPecaEncaixada(m, { id: "b2", catalogoId: "barra-1000", de: "b1", conAlvo: "b", conNovo: "a", giro: 2 });
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
    const j = paraJSON(adicionarPecaLivre(novaMontagem(), "barra-2000", { id: "x" }));
    expect("encaixe" in j.pecas[0]).toBe(false);
  });
});

describe("versão", () => {
  it("carimba a versão atual", () => {
    expect(paraJSON(torre()).versao).toBe(VERSAO_MONTAGEM);
    expect(VERSAO_MONTAGEM).toBe(2);
  });

  it("recusa arquivo de versão FUTURA em vez de abrir pela metade", () => {
    expect(() => deJSON({ versao: 99, pecas: [] })).toThrowError(/versao-futura/);
  });

  it("arquivo sem versão é tratado como 1 — e sai migrado", () => {
    expect(deJSON({ pecas: [] }).versao).toBe(VERSAO_MONTAGEM);
    const m = deJSON({ pecas: [{ id: "a", catalogoId: "p30-b2000" }] });
    expect(m.pecas[0].catalogoId).toBe("barra-2000");
  });
});

// v1 → v2 (19/08/2026): o catálogo virou CATEGORIA-MODELO e o id largou o
// prefixo de linha. É o teste que protege o projeto que já estava salvo.
describe("migração v1 → v2", () => {
  // Um arquivo REAL da v1, LITERAL: é assim que ficou gravado no IndexedDB de
  // quem montou antes de 19/08. Fixture gerada pelo código de hoje não provaria
  // migração nenhuma — ela migraria junto e o teste passaria sozinho.
  const ARQUIVO_V1 = Object.freeze({
    versao: 1,
    pecas: [
      { id: "s1", catalogoId: "p30-sapata-baixa", matriz: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1] },
      {
        id: "b1", catalogoId: "p30-b2000",
        matriz: [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 1055, 0, 1],
        encaixe: { de: "s1", conAlvo: "topo", conNovo: "a", giro: 0 },
      },
      {
        id: "b2", catalogoId: "p30-b1000",
        matriz: [-1, 0, 0, 0, 0, 1, 0, 0, 0, 0, -1, 0, 0, 2555, 0, 1],
        encaixe: { de: "b1", conAlvo: "b", conNovo: "a", giro: 2 },
      },
    ],
  });

  it("os ids antigos viram os novos", () => {
    expect(deJSON(ARQUIVO_V1).pecas.map((p) => p.catalogoId))
      .toEqual(["base-baixa", "barra-2000", "barra-1000"]);
  });

  // a prova de que nada se perdeu: o arquivo da v1 abre EXATAMENTE na mesma
  // montagem que a torre montada hoje — mesmas peças, mesmas matrizes, mesmo giro
  it("ida e volta: arquivo da v1 → montagem → JSON da v2, idêntico ao de hoje", () => {
    expect(paraJSON(deJSON(ARQUIVO_V1))).toEqual(paraJSON(torre()));
  });

  it("a estrutura não se mexe no meio do caminho", () => {
    const m = deJSON(ARQUIVO_V1);
    expect(pecaDaMontagem(m, "b2").matriz[13]).toBeCloseTo(2555, 3);
    expect(pecaDaMontagem(m, "b2").encaixe.giro).toBe(2);
    expect(juntas(m)).toHaveLength(2);
  });

  it("depois de migrado o arquivo é v2 e não migra de novo", () => {
    const v2 = paraJSON(deJSON(ARQUIVO_V1));
    expect(v2.versao).toBe(2);
    expect(paraJSON(deJSON(v2))).toEqual(v2);
  });

  // migração que reescreve o que não conhece é migração que inventa dado
  it("id de fora da tabela passa intacto — quem decide é o deJSON", () => {
    expect(migrarCatalogoId("p50-b2000", 1)).toBe("p50-b2000");
    expect(() => deJSON({ versao: 1, pecas: [{ id: "a", catalogoId: "p50-b2000" }] }))
      .toThrowError(/peca-desconhecida/);
  });

  // a tabela é a foto do catálogo v1: se um destino sumir do catálogo de hoje,
  // projeto antigo abre com buraco — e isso tem que quebrar AQUI, não no galpão
  it("todo destino da tabela existe no catálogo de hoje", () => {
    const v1 = [
      "p30-b0200", "p30-b0300", "p30-b0500", "p30-b0600", "p30-b1000",
      "p30-b2000", "p30-b3000", "p30-b4000", "p30-cubo5", "p30-sapata-baixa",
    ];
    for (const antigo of v1) {
      expect(pecaPorId(migrarCatalogoId(antigo, 1))).toBeTruthy();
    }
  });

  // arquivo já na v2 não pode ser mexido: um id novo que por acaso batesse com
  // um antigo seria reescrito sem motivo
  it("arquivo v2 não passa pela tabela", () => {
    expect(migrarCatalogoId("p30-b2000", 2)).toBe("p30-b2000");
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
    expect(() => deJSON({ versao: 1, pecas: [{ catalogoId: "barra-2000" }] })).toThrowError(/peca-invalida/);
  });

  it("id duplicado é recusado", () => {
    const p = { id: "a", catalogoId: "barra-2000" };
    expect(() => deJSON({ versao: 1, pecas: [p, { ...p }] })).toThrowError(/id-duplicado/);
  });

  it("peça fora do catálogo: recusa por padrão, descarta se pedirem", () => {
    const dados = { versao: 1, pecas: [{ id: "a", catalogoId: "p50-b2000" }] };
    expect(() => deJSON(dados)).toThrowError(/peca-desconhecida/);
    expect(deJSON(dados, { descartarDesconhecidas: true }).pecas).toHaveLength(0);
  });

  it("matriz corrompida vira identidade em vez de propagar NaN", () => {
    const m = deJSON({ versao: 1, pecas: [{ id: "a", catalogoId: "barra-2000", matriz: [1, 2, "x"] }] });
    expect(m.pecas[0].matriz).toHaveLength(16);
    expect(m.pecas[0].matriz.every(Number.isFinite)).toBe(true);
  });

  it("encaixe apontando pra peça que não existe mais vira peça livre", () => {
    const m = deJSON({
      versao: 1,
      pecas: [{ id: "a", catalogoId: "barra-2000", encaixe: { de: "fantasma", conAlvo: "b", conNovo: "a", giro: 0 } }],
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
