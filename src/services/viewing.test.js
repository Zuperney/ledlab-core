import { describe, it, expect } from "vitest";
import { pitchMm, viewingOf, faixa, pitchFor, sugerirGabinete, MIN_K, OTIMA_K, RETINA_K, MAX_ALTURA_K } from "./viewing.js";

// As quatro réguas validadas com fontes (02/08/2026): 1× fusão de cores,
// 10× em pés (Daktronics), retina 3,438 (Planar), altura × 30 (billboard).
// Os valores de P3 abaixo TRAVAM as constantes — não "corrigir" o fator
// dimensional mm→m da regra 1×.

describe("viewingOf — as quatro distâncias", () => {
  it("P3: mín 3,00 m · ótima 9,14 m · retina 10,31 m (constantes travadas)", () => {
    const v = viewingOf(3, null);
    expect(v.minM).toBeCloseTo(3.0, 2);
    expect(v.otimaM).toBeCloseTo(9.144, 2);
    expect(v.retinaM).toBeCloseTo(10.314, 2);
    expect(v.maxM).toBeNull(); // sem altura não existe máxima
  });

  it("altura 3 m → máxima 90 m (altura × 30); altura 0/ausente → null", () => {
    expect(viewingOf(3, 3).maxM).toBe(90);
    expect(viewingOf(3, 0).maxM).toBeNull();
    expect(viewingOf(3, undefined).maxM).toBeNull();
  });

  it("pitch inválido (0/NaN/negativo) → null, nunca NaN", () => {
    expect(viewingOf(0, 3)).toBeNull();
    expect(viewingOf(NaN, 3)).toBeNull();
    expect(viewingOf(-2, 3)).toBeNull();
  });

  it("constantes com os valores das fontes", () => {
    expect(MIN_K).toBe(1);
    expect(OTIMA_K).toBe(3.048);
    expect(RETINA_K).toBe(3.438);
    expect(MAX_ALTURA_K).toBe(30);
  });
});

describe("pitchMm — pitch numérico do cadastro (strings do formulário)", () => {
  it("ROE CB5 600 mm / 104 px → 5,77 mm (mesma fixture do teste do PDF)", () => {
    expect(pitchMm({ dimW: "600", resX: "104" })).toBeCloseTo(5.769, 2);
  });

  it("sem dimW ou resX (ou 0) → null", () => {
    expect(pitchMm({ resX: "104" })).toBeNull();
    expect(pitchMm({ dimW: "600" })).toBeNull();
    expect(pitchMm({ dimW: "0", resX: "104" })).toBeNull();
    expect(pitchMm(null)).toBeNull();
  });
});

describe("faixa — classificação da primeira fila", () => {
  const v = viewingOf(3, 3); // mín 3 · ótima 9,14 · retina 10,31 · máx 90

  it("as cinco bandas", () => {
    expect(faixa(1, v)).toBe("muito-perto");
    expect(faixa(5, v)).toBe("aceitavel");
    expect(faixa(10, v)).toBe("ideal");
    expect(faixa(20, v)).toBe("retina");
    expect(faixa(120, v)).toBe("longe-demais");
  });

  it("sem altura (maxM null) nunca dá longe-demais", () => {
    expect(faixa(500, viewingOf(3, null))).toBe("retina");
  });

  it("entradas degeneradas → null", () => {
    expect(faixa(0, v)).toBeNull();
    expect(faixa(5, null)).toBeNull();
  });
});

describe("pitchFor — o inverso (que pitch comprar pra essa fila)", () => {
  it("fila a 10,31 m → retina 3,0 mm; teto = a própria distância em mm", () => {
    const p = pitchFor(10.314);
    expect(p.retinaMm).toBeCloseTo(3.0, 2);
    expect(pitchFor(5).tetoMm).toBeCloseTo(5.0, 2);
  });

  it("ida e volta: pitchFor(retinaM do pitch) devolve o pitch", () => {
    expect(pitchFor(viewingOf(2.6, null).retinaM).retinaMm).toBeCloseTo(2.6, 6);
  });

  it("distância inválida → null", () => {
    expect(pitchFor(0)).toBeNull();
    expect(pitchFor(NaN)).toBeNull();
  });
});

describe("sugerirGabinete — recomendação sobre o cadastro real", () => {
  // pitches: MG6S 2,6 · CB4 3,9 · CB8 5,9
  const cabs = [
    { nome: "CB8", dimW: "590", resX: "100" },
    { nome: "MG6S", dimW: "520", resX: "200" },
    { nome: "CB4", dimW: "780", resX: "200" },
  ];

  it("12 m (retina ≤ 3,49): escolhe o MAIOR pitch que atende — o mais econômico", () => {
    const s = sugerirGabinete(12, cabs);
    expect(s.cab.nome).toBe("MG6S"); // 2,6 atende; 3,9 já passa de 3,49
    expect(s.atende).toBe(true);
  });

  it("35 m (retina ≤ 10,2): todos atendem → o de maior pitch (CB8)", () => {
    const s = sugerirGabinete(35, cabs);
    expect(s.cab.nome).toBe("CB8");
    expect(s.atende).toBe(true);
  });

  it("5 m (retina ≤ 1,45): nenhum atende → o de MENOR pitch, atende=false", () => {
    const s = sugerirGabinete(5, cabs);
    expect(s.cab.nome).toBe("MG6S");
    expect(s.atende).toBe(false);
  });

  it("cadastro vazio ou sem dimensões → null", () => {
    expect(sugerirGabinete(10, [])).toBeNull();
    expect(sugerirGabinete(10, [{ nome: "X", resX: "104" }])).toBeNull();
    expect(sugerirGabinete(0, cabs)).toBeNull();
  });
});
