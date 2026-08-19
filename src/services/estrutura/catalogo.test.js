// catalogo.test.js — o galpão do dono, e a geometria medida no modelo da casa.
import { describe, it, expect } from "vitest";
import {
  ANGULO_DE_GIRO, CATALOGO, PARAFUSARIA_POR_JUNTA, PASSOS_DE_GIRO, SISTEMAS,
  caixaLocal, conectorPorId, escadaDaBarra, escadasDaBarra, pecaPorId, pecasDoSistema,
} from "./catalogo.js";
import { escalar, comprimento } from "./vetor.js";

describe("o catálogo v1 é o estoque, não o catálogo da fábrica", () => {
  it("tem exatamente as 10 peças cravadas no espeque §3.2", () => {
    expect(CATALOGO).toHaveLength(10);
    expect(CATALOGO.filter((p) => p.tipo === "barra")).toHaveLength(8);
    expect(CATALOGO.filter((p) => p.tipo === "cubo")).toHaveLength(1);
    expect(CATALOGO.filter((p) => p.tipo === "sapata")).toHaveLength(1);
  });

  it("os comprimentos são os NOMINAIS do estoque (2 m = 2000 mm)", () => {
    expect(CATALOGO.filter((p) => p.tipo === "barra").map((p) => p.comprimentoMm))
      .toEqual([200, 300, 500, 600, 1000, 2000, 3000, 4000]);
  });

  it("não tem P50 no catálogo, mas o campo `sistema` existe", () => {
    expect(pecasDoSistema(500)).toHaveLength(0);
    expect(pecasDoSistema(300)).toHaveLength(10);
    expect(CATALOGO.every((p) => p.sistema === 300)).toBe(true);
  });

  // armadilha real: as duas medem 300 mm e mandar a errada pro caminhão é fácil
  it("a barra de 0,3 m e o cubo são peças DISTINTAS", () => {
    const barra = pecaPorId("p30-b0300");
    const cubo = pecaPorId("p30-cubo5");
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
    const b = pecaPorId("p30-b2000");
    expect(conectorPorId(b, "a").pos).toEqual([0, -1000, 0]);
    expect(conectorPorId(b, "b").pos).toEqual([0, 1000, 0]);
  });

  it("o cubo tem 5 faces abertas — a de baixo é a fechada", () => {
    const c = pecaPorId("p30-cubo5");
    expect(c.facesAbertas).toBe(5);
    expect(c.conectores.some((k) => k.dir[1] === -1)).toBe(false);
  });

  it("a sapata conecta só no topo, e a origem dela é o CHÃO", () => {
    const s = pecaPorId("p30-sapata-baixa");
    expect(s.conectores).toHaveLength(1);
    expect(s.conectores[0].pos).toEqual([0, s.alturaMm, 0]);
    expect(caixaLocal(s).min[1]).toBe(0);
  });
});

describe("caixaLocal", () => {
  it("barra: seção × comprimento, centrada", () => {
    expect(caixaLocal(pecaPorId("p30-b2000"))).toEqual({
      min: [-150, -1000, -150],
      max: [150, 1000, 150],
    });
  });

  it("peça desconhecida devolve null em vez de inventar", () => {
    expect(caixaLocal(null)).toBeNull();
    expect(caixaLocal({ tipo: "curva", sistema: 300 })).toBeNull();
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
    for (const p of CATALOGO.filter((x) => x.tipo === "barra")) {
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
      ...CATALOGO.filter((p) => p.tipo === "barra").map((p) => p.comprimentoMm),
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
