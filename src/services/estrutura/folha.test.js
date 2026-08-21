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
    // 8 juntas: o pórtico fecha nas duas pontas da viga, e a segunda leva
    // parafuso igual — contar só os encaixes da árvore mandaria a equipe pro
    // galpão com um jogo a menos
    expect(d.juntas).toBe(8);
    expect(d.parafusaria.itens.find((i) => i.id === "parafuso").qtd).toBe(32);
    expect(d.parafusaria.itens.find((i) => i.id === "arruela").qtd).toBe(64);
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

describe("a peça que o catálogo não conhece", () => {
  // Imprimir a lista MENOS a peça desconhecida é o pior desfecho: o galpão
  // carrega o caminhão com uma peça a menos e ninguém sabe por quê.
  it("some com a folha inteira em vez de imprimir uma lista curta", () => {
    const p = projeto();
    p.estrutura.pecas.push({ id: "x", catalogoId: "p50-b2000", matriz: null });
    expect(dadosDaFolha(p)).toBeNull();
  });
});

describe("a legenda do desenho", () => {
  it("traz cor, nome e quantidade das peças que estão montadas", () => {
    const leg = dadosDaFolha(projeto()).legenda;
    expect(leg.map((l) => l.catalogoId)).toEqual(["p30-b2000", "p30-b4000", "p30-cubo5", "p30-sapata-baixa"]);
    expect(leg.every((l) => /^#[0-9a-f]{6}$/.test(l.cor))).toBe(true);
  });

  it("respeita a cor que o usuário configurou nas preferências", () => {
    const leg = dadosDaFolha(projeto(), null, { cores: { "p30-cubo5": "#010203" } }).legenda;
    expect(leg.find((l) => l.catalogoId === "p30-cubo5").cor).toBe("#010203");
  });
});

describe("peça dentro de peça vai impresso", () => {
  it("montagem certa não acusa nada", () => {
    expect(dadosDaFolha(projeto()).conflitos).toEqual([]);
  });

  it("duas peças no mesmo lugar saem nomeadas na folha", () => {
    const p = projeto();
    const clone = { ...p.estrutura.pecas[1], id: "clone" };
    delete clone.encaixe;
    p.estrutura.pecas.push(clone);
    const c = dadosDaFolha(p).conflitos;
    expect(c.length).toBeGreaterThan(0);
    expect(c[0].nomeA).toMatch(/^Barra P30/);
    expect(c[0].mm).toBeGreaterThan(0);
  });
});

describe("os painéis na folha (E4)", () => {
  const comPainel = (telaExtra = {}) => {
    const p = projeto();
    const viga = p.estrutura.pecas.find((x) => x.catalogoId === "p30-b4000");
    p.estrutura.paineis = [{ id: "pn1", telaId: "t1", de: viga.id, face: "BAIXO", olha: "N" }];
    p.telas = [{
      id: "t1", nome: "Frontal", cols: 6, rows: 2,
      gabinete: { dimW: "500", dimH: "500", peso: "8" },
      ...telaExtra,
    }];
    return p;
  };

  it("sem painel, a folha nem menciona", () => {
    expect(dadosDaFolha(projeto()).paineis).toBeNull();
  });

  it("separa o peso da treliça do peso do que ela carrega, e fecha o total", () => {
    const d = dadosDaFolha(comPainel());
    expect(d.pesoTexto).toBe("166 kg"); // a treliça, sozinha
    expect(d.paineis.pesoTexto).toBe("96 kg"); // 12 gabinetes × 8 kg
    expect(d.pesoSuspensoTexto).toBe("262 kg"); // o que sai do chão junto
  });

  // a lista é o que torna o total conferível: sem ela, o número é palavra
  it("lista cada tela com medida, gabinetes, peso e a que altura começa", () => {
    const [item] = dadosDaFolha(comPainel()).paineis.lista;
    expect(item.nome).toBe("Frontal");
    expect(item.medida).toBe("3,00 m × 1,00 m");
    expect(item.gabinetes).toBe(12);
    expect(item.pesoKg).toBe(96);
    // a borda DE BAIXO, que é a cota que se mede com a trena no galpão
    expect(item.em).toMatch(/^\d,\d\d m do piso$/);
    expect(item.suspenso).toBe(true);
  });

  // ⚠️ TELA NO CHÃO NÃO É PESO SUSPENSO. Somar as duas daria um "suspenso" que
  // ninguém vai içar — e é justamente esse o número que o rigger lê.
  it("separa o que está no ar do que está apoiado no piso", () => {
    const p = comPainel();
    p.estrutura.paineis = [{ id: "pn1", telaId: "t1", olha: "N", pos: [0, 500, 0] }];
    const d = dadosDaFolha(p);
    expect(d.paineis.pesoTexto).toBe("96 kg");
    expect(d.paineis.noChaoTexto).toBe("96 kg");
    expect(d.paineis.suspensoTexto).toBe("0 kg");
    expect(d.pesoSuspensoTexto).toBe("166 kg"); // só a treliça sai do chão
    expect(d.paineis.lista[0].em).toBe("no chão");
  });

  it("o que não cabe vai IMPRESSO, em medida e não em carga", () => {
    const d = dadosDaFolha(comPainel({ cols: 12 })); // 6 m no vão de 4 m
    expect(d.paineis.problemas).toContain("não cabe no vão — entra na treliça");
  });

  it("tela sem peso de gabinete deixa o total parcial, e a folha sabe", () => {
    const d = dadosDaFolha(comPainel({ gabinete: { dimW: "500", dimH: "500" } }));
    expect(d.paineis.completo).toBe(false);
  });
});
