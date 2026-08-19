// folha.test.js — a folha ESTRUTURA do Caderno: o que ela diz e o que ela cala.
import { describe, it, expect } from "vitest";
import { AVISO_ESTRUTURA, avisoEstruturaPdf, dadosDaFolha, plural, procedenciaDoPeso } from "./folha.js";
import { paraJSON } from "./serializar.js";
import { porticoDeExemplo } from "./exemplos.js";

const projeto = (extra = {}) => ({
  id: "p1",
  estrutura: paraJSON(porticoDeExemplo()),
  ...extra,
});

describe("quando a folha NÃO sai", () => {
  // imprimir "0 peças" seria pior que não imprimir: ocupa folha e não informa
  it("projeto sem estrutura devolve null", () => {
    expect(dadosDaFolha({})).toBeNull();
    expect(dadosDaFolha({ estrutura: { versao: 1, pecas: [] } })).toBeNull();
    expect(dadosDaFolha(null)).toBeNull();
  });

  // uma montagem corrompida não pode derrubar o Caderno inteiro
  it("estrutura corrompida devolve null em vez de explodir", () => {
    expect(dadosDaFolha({ estrutura: { versao: 1, pecas: "lixo" } })).toBeNull();
    expect(dadosDaFolha({ estrutura: { versao: 99, pecas: [] } })).toBeNull();
  });
});

describe("o que a folha entrega", () => {
  const d = dadosDaFolha(projeto());

  it("as três respostas que o dono pediu: peças, peso e medida", () => {
    expect(d.lista).toHaveLength(4);
    expect(d.pesoTexto).toBe("166 kg");
    expect(d.medidas.texto).toBe("5,05 m × 4,36 m × 0,75 m");
  });

  it("conta as juntas e a parafusaria que vai na caixa", () => {
    expect(d.juntas).toBe(7);
    expect(d.parafusaria.itens.find((i) => i.id === "parafuso").qtd).toBe(28);
    expect(d.parafusaria.itens.find((i) => i.id === "arruela").qtd).toBe(56);
  });

  // L30, P30 e R30 são todos 300×300 e encaixam entre si, mas a L30 vale
  // METADE da carga da P30 — a folha tem que dizer a linha, não só a medida
  it("agrupa por LINHA do fabricante, não só por medida", () => {
    expect(d.porLinha).toEqual([{ linha: "P30", qtd: 9, kg: 166 }]);
  });

  it("mede em metros com vírgula, no padrão do papel brasileiro", () => {
    expect(d.medidas.altura).toBe("4,36 m");
    expect(d.medidas.largura).toMatch(/^\d+,\d{2} m$/);
  });
});

describe("o peso não pode parecer fechado", () => {
  const d = dadosDaFolha(projeto());

  it("declara que é estimado enquanto não for pesado", () => {
    expect(d.pesoConferido).toBe(false);
    expect(d.pesoNota).toMatch(/estimad/i);
    expect(d.pesoNota).toMatch(/balança/i);
  });

  it("carrega a procedência item a item", () => {
    const proc = procedenciaDoPeso(d);
    expect(proc.length).toBeGreaterThan(0);
    expect(proc.every((p) => typeof p.fonte === "string" && p.pecas.length)).toBe(true);
    expect(proc.some((p) => /Auratec/.test(p.fonte))).toBe(true);
  });

  it("sem dados, a procedência é lista vazia (não quebra)", () => {
    expect(procedenciaDoPeso(null)).toEqual([]);
  });
});

describe("a imagem da cena", () => {
  // A imagem entra por PARÂMETRO porque vive no IndexedDB, não no projeto: ela
  // pesa ~300 KB e a fatia `projects` sobe inteira pro sync a cada mudança.
  // Sendo derivada (dá pra recapturar a qualquer momento), não ocupa nuvem.
  it("entra por parâmetro, não pelo projeto", () => {
    expect(dadosDaFolha(projeto()).imagem).toBeNull();
    const comImg = dadosDaFolha(projeto({ estruturaImg: { em: 123 } }), "data:image/png;base64,AAA");
    expect(comImg.imagem).toBe("data:image/png;base64,AAA");
    expect(comImg.imagemEm).toBe(123);
  });

  it("o projeto guarda só a REFERÊNCIA, nunca os bytes", () => {
    const p = projeto({ estruturaImg: { em: 123, kb: 316 } });
    expect(JSON.stringify(p)).not.toMatch(/data:image/);
    expect(dadosDaFolha(p).imagem).toBeNull(); // sem o parâmetro, sem imagem
  });
});

describe("o aviso de responsabilidade", () => {
  // é a fronteira do produto, não rodapé jurídico — e vai impresso SEMPRE
  it("diz explicitamente que o app não afirma se aguenta", () => {
    const texto = AVISO_ESTRUTURA.partes
      .map((p) => (typeof p === "string" ? p : p.texto))
      .join("");
    expect(texto).toMatch(/não dimensiona/i);
    expect(texto).toMatch(/não diz se ela aguenta/i);
    expect(texto).toMatch(/rigger habilitado/i);
    expect(texto).toMatch(/ART no CREA/i);
  });
});

describe("o aviso no dialeto do PDF", () => {
  // duas cópias de um aviso de segurança é como ele começa a divergir
  it("converte sem perder uma palavra do texto", () => {
    const doDom = AVISO_ESTRUTURA.partes.map((p) => (typeof p === "string" ? p : p.texto)).join("");
    const doPdf = avisoEstruturaPdf().partes.map((p) => p.t).join("");
    expect(doPdf).toBe(doDom);
    expect(avisoEstruturaPdf().titulo).toBe(AVISO_ESTRUTURA.titulo);
  });

  it("preserva o que está em negrito", () => {
    const fortes = avisoEstruturaPdf().partes.filter((p) => p.b).map((p) => p.t);
    expect(fortes).toContain("rigger habilitado");
    expect(fortes.some((t) => /não diz se ela aguenta/.test(t))).toBe(true);
  });
});

describe("plural", () => {
  it("o papel não diz \"1 juntas\"", () => {
    expect(plural(1, "junta")).toBe("1 junta");
    expect(plural(7, "junta")).toBe("7 juntas");
    expect(plural(1, "peça")).toBe("1 peça");
    expect(plural(0, "peça")).toBe("0 peças");
  });
});
