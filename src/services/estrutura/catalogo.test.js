// catalogo.test.js — o galpão do dono, e a geometria medida no modelo da casa.
import { describe, it, expect } from "vitest";
import {
  ANGULO_DE_GIRO, CATALOGO, CATEGORIAS, PARAFUSARIA_POR_JUNTA, PASSOS_DE_GIRO, SISTEMAS,
  caixaLocal, categoriaPorId, categoriasComPecas, conectorPorId, escadaDaBarra,
  escadasDaBarra, pecaPorId, pecasDaCategoria, pecasDoSistema,
} from "./catalogo.js";
import { escalar, comprimento } from "./vetor.js";

describe("o catálogo v1 é o estoque, não o catálogo da fábrica", () => {
  it("tem exatamente as 10 peças cravadas no espeque §3.2", () => {
    expect(CATALOGO).toHaveLength(10);
    expect(pecasDaCategoria("barra")).toHaveLength(8);
    expect(pecasDaCategoria("cubo")).toHaveLength(1);
    expect(pecasDaCategoria("base")).toHaveLength(1);
  });

  it("os comprimentos são os NOMINAIS do estoque (2 m = 2000 mm)", () => {
    expect(pecasDaCategoria("barra").map((p) => p.comprimentoMm))
      .toEqual([200, 300, 500, 600, 1000, 2000, 3000, 4000]);
  });

  it("não tem P50 no catálogo, mas o campo `sistema` existe", () => {
    expect(pecasDoSistema(500)).toHaveLength(0);
    expect(pecasDoSistema(300)).toHaveLength(10);
    expect(CATALOGO.every((p) => p.sistema === 300)).toBe(true);
  });

  // armadilha real: as duas medem 300 mm e mandar a errada pro caminhão é fácil
  it("a barra de 0,3 m e o cubo são peças DISTINTAS", () => {
    const barra = pecaPorId("barra-0300");
    const cubo = pecaPorId("cubo-5f");
    expect(barra.comprimentoMm).toBe(300);
    expect(cubo.ladoMm).toBe(300);
    expect(barra.id).not.toBe(cubo.id);
    expect(barra.conectores).toHaveLength(2);
    expect(cubo.conectores).toHaveLength(5);
  });

  it("NENHUM peso nasce conferido — o dono ainda vai pesar", () => {
    expect(CATALOGO.every((p) => p.peso.conferido === false)).toBe(true);
    expect(CATALOGO.every((p) => typeof p.peso.fonte === "string" && p.peso.fonte)).toBe(true);
  });

  it("ids são únicos", () => {
    expect(new Set(CATALOGO.map((p) => p.id)).size).toBe(CATALOGO.length);
  });
});

// Decisão do dono (19/08/2026): "sem fabricante, somente modelos e categorias".
describe("a taxonomia: CATEGORIA × MODELO", () => {
  it("o id é `categoria-modelo` e NÃO carrega fabricante", () => {
    for (const p of CATALOGO) {
      expect(p.id).toBe(`${p.categoria}-${p.modelo}`);
      expect(p.id).not.toMatch(/p30|l30|r30|p50|feeling|auratec/i);
    }
  });

  it("toda peça mora numa categoria conhecida", () => {
    for (const p of CATALOGO) expect(categoriaPorId(p.categoria)).toBeTruthy();
  });

  // é o par (categoria, modelo) que identifica a peça — o id é só a colagem dos
  // dois. Se o par repetir, o id repete, e projeto salvo passa a apontar pra
  // peça errada sem ninguém perceber.
  it("o par categoria × modelo não repete", () => {
    const pares = CATALOGO.map((p) => `${p.categoria}/${p.modelo}`);
    expect(new Set(pares).size).toBe(pares.length);
  });

  it("o modelo da barra é o comprimento em mm, com 4 casas pra ordenar sozinho", () => {
    const barras = pecasDaCategoria("barra");
    expect(barras.map((p) => p.modelo)).toEqual(
      ["0200", "0300", "0500", "0600", "1000", "2000", "3000", "4000"],
    );
    expect([...barras.map((p) => p.modelo)].sort()).toEqual(barras.map((p) => p.modelo));
  });

  it("o nome é categoria + modelo, sem a linha do fabricante", () => {
    expect(pecaPorId("barra-2000").nome).toBe("Barra 2 m");
    expect(pecaPorId("cubo-5f").nome).toBe("Cubo 5 faces");
    expect(pecaPorId("base-baixa").nome).toBe("Base baixa");
    expect(CATALOGO.every((p) => !/P30/.test(p.nome))).toBe(true);
  });

  // ⚠️ a linha sai do ID, nunca do DADO: L30, P30 e R30 são todos 300×300 e
  // encaixam entre si, mas a L30 vale metade da carga (espeque §2)
  it("linha e sistema continuam CAMPOS de toda peça", () => {
    for (const p of CATALOGO) {
      expect(p.linha).toBe("P30");
      expect(p.sistema).toBe(300);
    }
  });

  it("as categorias futuras estão na lista, marcadas e com o motivo escrito", () => {
    const futuras = CATEGORIAS.filter((c) => c.futura);
    expect(futuras.map((c) => c.id)).toEqual(["sleeve", "pau-de-carga", "adaptador"]);
    expect(futuras.every((c) => typeof c.porque === "string" && c.porque)).toBe(true);
  });

  // categoria futura no seletor seria promessa vazia: abre e não tem nada dentro
  it("o seletor só oferece categoria que TEM peça", () => {
    expect(categoriasComPecas().map((c) => c.id)).toEqual(["barra", "cubo", "base"]);
    for (const c of CATEGORIAS.filter((x) => x.futura)) {
      expect(pecasDaCategoria(c.id)).toHaveLength(0);
    }
  });

  it("o catálogo sai ordenado por categoria — a folha impressa sai agrupada", () => {
    const ordem = categoriasComPecas().map((c) => c.id);
    const vistas = [...new Set(CATALOGO.map((p) => p.categoria))];
    expect(vistas).toEqual(ordem);
  });
});

describe("a geometria medida (pesquisa §4.8)", () => {
  it("o sistema 300 guarda o que foi medido na malha", () => {
    const s = SISTEMAS[300];
    expect(s.ladoMm).toBe(300);
    expect(s.entreEixosMm).toBe(250);
    expect(s.banzoMm).toBe(50);
    expect(s.diagonalMm).toBe(40);
    expect(s.passoEscadaMm).toBe(500);
    expect(s.defasagemEscadaMm).toBe(250);
    expect(s.banzos).toBe(4);
  });

  it("entre-eixos + banzo fecham a seção externa", () => {
    const s = SISTEMAS[300];
    expect(s.entreEixosMm + s.banzoMm).toBe(s.ladoMm);
  });

  it("4 banzos ⇒ giro de 90 em 90 graus", () => {
    expect(PASSOS_DE_GIRO).toBe(4);
    expect(ANGULO_DE_GIRO).toBeCloseTo(Math.PI / 2, 12);
  });
});

describe("conectores do catálogo", () => {
  it("toda direção e todo rolo são unitários", () => {
    for (const p of CATALOGO) {
      for (const c of p.conectores) {
        expect(comprimento(c.dir)).toBeCloseTo(1, 9);
        expect(comprimento(c.rolo)).toBeCloseTo(1, 9);
      }
    }
  });

  // sem isso o ângulo de rolagem sai torto e a peça encaixa girada
  it("o rolo é PERPENDICULAR à direção em toda peça", () => {
    for (const p of CATALOGO) {
      for (const c of p.conectores) {
        expect(escalar(c.dir, c.rolo)).toBeCloseTo(0, 9);
      }
    }
  });

  it("ids de conector são únicos dentro da peça", () => {
    for (const p of CATALOGO) {
      expect(new Set(p.conectores.map((c) => c.id)).size).toBe(p.conectores.length);
    }
  });

  it("a barra conecta nas duas pontas, ao longo do eixo Y", () => {
    const b = pecaPorId("barra-2000");
    expect(conectorPorId(b, "a").pos).toEqual([0, -1000, 0]);
    expect(conectorPorId(b, "b").pos).toEqual([0, 1000, 0]);
  });

  it("o cubo tem 5 faces abertas — a de baixo é a fechada", () => {
    const c = pecaPorId("cubo-5f");
    expect(c.facesAbertas).toBe(5);
    expect(c.conectores.some((k) => k.dir[1] === -1)).toBe(false);
  });

  it("a base conecta só no topo, e a origem dela é o CHÃO", () => {
    const s = pecaPorId("base-baixa");
    expect(s.conectores).toHaveLength(1);
    expect(s.conectores[0].pos).toEqual([0, s.alturaMm, 0]);
    expect(caixaLocal(s).min[1]).toBe(0);
  });
});

describe("caixaLocal", () => {
  it("barra: seção × comprimento, centrada", () => {
    expect(caixaLocal(pecaPorId("barra-2000"))).toEqual({
      min: [-150, -1000, -150],
      max: [150, 1000, 150],
    });
  });

  it("peça desconhecida devolve null em vez de inventar", () => {
    expect(caixaLocal(null)).toBeNull();
    expect(caixaLocal({ categoria: "curva", sistema: 300 })).toBeNull();
  });
});

describe("a escada — duas faces de 500, defasadas de 250", () => {
  it("a face que começa em 0 sobe de 500 em 500", () => {
    expect(escadaDaBarra(2000, 500, 0)).toEqual([0, 500, 1000, 1500, 2000]);
  });

  it("a outra face começa em 250 e mantém o passo", () => {
    expect(escadaDaBarra(2000, 500, 250)).toEqual([250, 750, 1250, 1750]);
  });

  // é ESTA soma que engana quem mede a malha projetando as duas faces juntas:
  // duas escadas de 500 defasadas leem como uma escada de 250
  it("as duas juntas leem como um passo de 250 — a armadilha da medição", () => {
    const [a, b] = escadasDaBarra(2000);
    const uniao = [...new Set([...a, ...b])].sort((x, y) => x - y);
    expect(uniao).toEqual([0, 250, 500, 750, 1000, 1250, 1500, 1750, 2000]);
  });

  it("barra curta ganha o que couber, sem travessa fora do comprimento", () => {
    expect(escadasDaBarra(200)).toEqual([[0], []]);
    expect(escadasDaBarra(300)).toEqual([[0], [250]]);
    expect(escadasDaBarra(600)).toEqual([[0, 500], [250]]);
  });

  it("nenhuma travessa passa do comprimento, em nenhuma peça do catálogo", () => {
    for (const p of pecasDaCategoria("barra")) {
      for (const escada of escadasDaBarra(p.comprimentoMm)) {
        for (const y of escada) {
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(p.comprimentoMm);
        }
      }
    }
  });
});

describe("a chapa de topo", () => {
  // ela existe pra dizer UMA coisa: a peça acaba aqui. Duas encostadas = junta.
  it("tem espessura suficiente pra ler, e fina o bastante pra não virar bloco", () => {
    const s = SISTEMAS[300];
    expect(s.placaEspessuraMm).toBeGreaterThanOrEqual(8);
    expect(s.placaEspessuraMm).toBeLessThanOrEqual(25);
  });

  // duas chapas encostadas não podem esconder a menor barra do catálogo
  it("duas chapas cabem folgadas na barra mais curta", () => {
    const s = SISTEMAS[300];
    const menor = Math.min(
      ...pecasDaCategoria("barra").map((p) => p.comprimentoMm),
    );
    expect(2 * s.placaEspessuraMm).toBeLessThan(menor / 2);
  });

  // a ferragem não some: ela vive na lista de material, que é onde importa
  it("a parafusaria segue contando 4 por junta, mesmo sem furo desenhado", () => {
    expect(PARAFUSARIA_POR_JUNTA.parafuso.qtd).toBe(4);
  });
});

describe("parafusaria", () => {
  it("uma junta = 4 parafusos, 4 porcas e 8 arruelas", () => {
    expect(PARAFUSARIA_POR_JUNTA.parafuso.qtd).toBe(4);
    expect(PARAFUSARIA_POR_JUNTA.porca.qtd).toBe(4);
    expect(PARAFUSARIA_POR_JUNTA.arruela.qtd).toBe(8);
    expect(PARAFUSARIA_POR_JUNTA.parafuso.spec).toMatch(/A325/);
  });
});
