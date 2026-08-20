// direcoes.test.js — as seis direções do piso (regra D1).
import { describe, it, expect } from "vitest";
import {
  DIRECOES, HORIZONTAIS, OPOSTA, VERTICAIS, direcaoDe, ehHorizontal, listaDeNomes,
  nomeDe, vetorDe,
} from "./direcoes.js";

describe("a tabela", () => {
  it("são seis, e cada uma tem nome, vetor unitário e plano", () => {
    expect(DIRECOES).toHaveLength(6);
    for (const d of DIRECOES) {
      expect(nomeDe(d.id)).toBeTruthy();
      expect(Math.hypot(...d.vetor)).toBe(1);
      expect(typeof d.horizontal).toBe("boolean");
    }
  });

  it("quatro no plano do chão, duas na vertical", () => {
    expect(HORIZONTAIS).toHaveLength(4);
    expect(VERTICAIS).toEqual(["CIMA", "BAIXO"]);
    expect(HORIZONTAIS.every(ehHorizontal)).toBe(true);
    expect(VERTICAIS.some(ehHorizontal)).toBe(false);
  });

  // a ordem do R é a da bússola, não a do produto vetorial: quem gira está
  // lendo o desenho, não a matemática
  it("o ciclo horizontal segue a bússola", () => {
    expect(HORIZONTAIS).toEqual(["N", "L", "S", "O"]);
  });
});

describe("vetor ↔ direção", () => {
  it("ida e volta fecha nas seis", () => {
    for (const d of DIRECOES) expect(direcaoDe(vetorDe(d.id))).toBe(d.id);
  });

  it("o oposto é involutivo e aponta pro contrário", () => {
    for (const d of DIRECOES) {
      expect(OPOSTA[OPOSTA[d.id]]).toBe(d.id);
      expect(vetorDe(OPOSTA[d.id])).toEqual(d.vetor.map((n) => (n === 0 ? 0 : -n)));
    }
  });

  it("vetor não unitário também é lido — o que conta é pra onde aponta", () => {
    expect(direcaoDe([0, 4200, 0])).toBe("CIMA");
    expect(direcaoDe([-0.7, 0, 0])).toBe("O");
  });

  // peça em diagonal (o catálogo ainda não tem) não pode virar "quase norte":
  // quem chamou precisa saber que não dá pra nomear
  it("vetor em diagonal devolve null em vez de chutar", () => {
    expect(direcaoDe([1, 1, 0])).toBeNull();
    expect(direcaoDe([0, 0, 0])).toBeNull();
    expect(direcaoDe("norte")).toBeNull();
  });
});

describe("a frase de aviso", () => {
  it("junta com vírgula e um 'e' no fim, como se fala", () => {
    expect(listaDeNomes(["N", "L", "BAIXO"])).toBe("Norte, Leste e Baixo");
    expect(listaDeNomes(["CIMA"])).toBe("Cima");
    expect(listaDeNomes([])).toBe("");
  });
});
