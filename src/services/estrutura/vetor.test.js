// vetor.test.js — a álgebra do módulo 3D. Roda em Node puro, sem WebGL.
import { describe, it, expect } from "vitest";
import {
  arred, distancia, escalar, matDirecao, matPonto, matriz, oposto, qAplicar,
  qDoEixo, qEntreVetores, qIguais, qMultiplicar, unitario, vetorial, IDENTIDADE,
} from "./vetor.js";

const perto = (v, alvo, casas = 6) => {
  expect(v.length).toBe(alvo.length);
  v.forEach((n, i) => expect(n).toBeCloseTo(alvo[i], casas));
};

describe("vetores", () => {
  it("produto vetorial segue a regra da mão direita", () => {
    perto(vetorial([1, 0, 0], [0, 1, 0]), [0, 0, 1]);
  });

  it("unitario de vetor nulo não explode", () => {
    expect(unitario([0, 0, 0])).toEqual([0, 0, 0]);
  });
});

describe("qEntreVetores", () => {
  it("leva um vetor até o outro", () => {
    const q = qEntreVetores([1, 0, 0], [0, 1, 0]);
    perto(qAplicar(q, [1, 0, 0]), [0, 1, 0]);
  });

  it("vetores iguais → identidade", () => {
    expect(qIguais(qEntreVetores([0, 1, 0], [0, 1, 0]), IDENTIDADE)).toBe(true);
  });

  // o caso que quebra implementação ingênua: infinitos eixos válidos
  it("vetores OPOSTOS ainda invertem o vetor (caso degenerado)", () => {
    for (const v of [[1, 0, 0], [0, 1, 0], [0, 0, 1], unitario([1, 2, 3])]) {
      const q = qEntreVetores(v, oposto(v));
      perto(qAplicar(q, v), oposto(v), 5);
    }
  });
});

describe("quatérnios", () => {
  it("giro de 90° em torno de Y leva +X em −Z", () => {
    const q = qDoEixo([0, 1, 0], Math.PI / 2);
    perto(qAplicar(q, [1, 0, 0]), [0, 0, -1]);
  });

  it("compõe na ordem certa: qMultiplicar(a,b) aplica b e depois a", () => {
    const a = qDoEixo([0, 1, 0], Math.PI / 2);
    const b = qDoEixo([1, 0, 0], Math.PI / 2);
    perto(qAplicar(qMultiplicar(a, b), [0, 1, 0]), qAplicar(a, qAplicar(b, [0, 1, 0])));
  });

  // q e −q são a MESMA rotação — comparar componente a componente daria falso negativo
  it("qIguais compara o efeito, não os componentes", () => {
    const q = qDoEixo([0, 0, 1], 1.2);
    const menosQ = q.map((n) => -n);
    expect(qIguais(q, menosQ)).toBe(true);
    expect(q).not.toEqual(menosQ);
  });
});

describe("matriz (coluna-maior, compatível com THREE.Matrix4)", () => {
  it("identidade não move ponto nem direção", () => {
    const m = matriz(IDENTIDADE, [0, 0, 0]);
    perto(matPonto(m, [3, 4, 5]), [3, 4, 5]);
    perto(matDirecao(m, [3, 4, 5]), [3, 4, 5]);
  });

  it("translação move PONTO mas não DIREÇÃO", () => {
    const m = matriz(IDENTIDADE, [10, 20, 30]);
    perto(matPonto(m, [1, 0, 0]), [11, 20, 30]);
    perto(matDirecao(m, [1, 0, 0]), [1, 0, 0]);
  });

  it("a translação mora nos índices 12..14 (como no three)", () => {
    const m = matriz(IDENTIDADE, [7, 8, 9]);
    expect([m[12], m[13], m[14], m[15]]).toEqual([7, 8, 9, 1]);
  });

  it("rotação + translação combinam na ordem certa", () => {
    const q = qDoEixo([0, 1, 0], Math.PI / 2);
    const m = matriz(q, [0, 100, 0]);
    perto(matPonto(m, [10, 0, 0]), [0, 100, -10], 5);
  });
});

describe("arredondamento de saída", () => {
  it("mata o −0 (senão o JSON do sync muda à toa)", () => {
    expect(Object.is(arred(-1e-12), 0)).toBe(true);
  });

  it("estabiliza lixo de ponto flutuante", () => {
    expect(arred(0.1 + 0.2)).toBe(0.3);
  });
});

describe("escalar", () => {
  it("normais opostas dão −1", () => {
    expect(escalar([0, 1, 0], [0, -1, 0])).toBe(-1);
    expect(distancia([0, 0, 0], [3, 4, 0])).toBe(5);
  });
});
