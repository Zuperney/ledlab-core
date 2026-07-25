import { describe, it, expect } from "vitest";
import {
  sugereTalha, riggingTela, projectRigging, colunasNoBumper, rigTone,
  BUMPERS, FIXACOES, TALHAS_KG, DEFAULT_RIG,
} from "./rigging.js";

// gabinete padrão dos testes: 8 kg, 500 mm de largura (strings, como o app guarda)
const GAB = { peso: "8", dimW: "500" };
const TELA = { cols: 5, rows: 5, gabinete: GAB };
// com os padrões (bumper 100 cm = 14 kg, fixação cinta = 5 kg/ponto):
// pesoColuna 40 · colunasPorBumper 2 · bumpers 3 · carga/ponto 2×40+14+5 = 99

describe("sugereTalha", () => {
  it("a frota é 1 t: aguenta até 1000 kg no ponto", () => {
    expect(sugereTalha(100)).toBe(1000);
    expect(sugereTalha(1000)).toBe(1000);
    expect(sugereTalha(1001)).toBeNull();
  });
  it("null sem carga", () => {
    expect(sugereTalha(0)).toBeNull();
    expect(sugereTalha(NaN)).toBeNull();
  });
  it("utilização reduz o WLL admitido", () => {
    expect(sugereTalha(800, 0.8)).toBe(1000);
    expect(sugereTalha(801, 0.8)).toBeNull(); // acima de 1000×0.8
  });
  it("aceita lista de WLL alternativa (se entrar outra talha na frota)", () => {
    expect(sugereTalha(300, 1, [250, 500, 1000])).toBe(500);
  });
});

describe("colunasNoBumper", () => {
  it("deriva da largura: quantos gabinetes inteiros a viga cobre", () => {
    expect(colunasNoBumper(1000, 500)).toBe(2); // bumper 100 cm × gabinete 500 mm
    expect(colunasNoBumper(500, 500)).toBe(1); // bumper 50 cm × gabinete 500 mm
    expect(colunasNoBumper(1000, 600)).toBe(1); // CB5 (600 mm) no bumper de 100 cm
  });
  it("gabinete mais largo que o bumper ainda vale 1 coluna", () => {
    expect(colunasNoBumper(500, 745)).toBe(1);
  });
  it("override manda; dado faltando cai em 1", () => {
    expect(colunasNoBumper(1000, 500, 3)).toBe(3);
    expect(colunasNoBumper(0, 500)).toBe(1);
    expect(colunasNoBumper(1000, 0)).toBe(1);
  });
});

describe("rigTone", () => {
  it("espelha a regra dos 80% do elétrico", () => {
    expect(rigTone(50)).toBe("ok");
    expect(rigTone(80)).toBe("ok");
    expect(rigTone(81)).toBe("warn");
    expect(rigTone(101)).toBe("over");
  });
});

describe("riggingTela", () => {
  it("tela 5×5 de 8 kg com os padrões (bumper 100 cm + cinta)", () => {
    const r = riggingTela(TELA);
    expect(r.pesoColuna).toBe(40); // 5 × 8
    expect(r.colunasPorBumper).toBe(2); // derivado: 1000 mm ÷ 500 mm
    expect(r.bumpers).toBe(3); // ceil(5/2)
    expect(r.pontos).toBe(3);
    // pior caso: bumper cheio (2 colunas) + bumper 14 kg + cinta/manilha 5 kg
    expect(r.cargaPorPonto).toBe(2 * 40 + 14 + 5);
    expect(r.talhaWLL).toBe(1000);
    expect(r.talha).toBe(1000);
    expect(r.tone).toBe("ok");
    expect(r.over).toBe(false);
    expect(r.totalKg).toBe(5 * 40 + 3 * 14); // 242
    expect(r.empilhaOk).toBeNull(); // sem maxRows configurado
  });

  it("bumper de 50 cm dobra a quantidade de vigas e pontos", () => {
    const r = riggingTela(TELA, { bumperId: "b50" });
    expect(r.colunasPorBumper).toBe(1);
    expect(r.bumpers).toBe(5);
    expect(r.pontos).toBe(5);
    expect(r.cargaPorPonto).toBe(40 + 8 + 5); // 1 coluna + bumper 8 kg + cinta
  });

  it("fixação por algema/garra pesa menos no ponto que cinta+manilha", () => {
    const garra = riggingTela(TELA, { fixacao: "garra" });
    const cinta = riggingTela(TELA, { fixacao: "cinta" });
    expect(cinta.cargaPorPonto - garra.cargaPorPonto).toBe(2);
    expect(garra.fixacao.acessorios).toContain("Algema/garra");
  });

  it("2 pontos por bumper repartem a carga da viga (acessórios são por ponto)", () => {
    const r = riggingTela(TELA, { pontosPorBumper: 2 });
    expect(r.pontos).toBe(6);
    expect(r.cargaPorPonto).toBe((2 * 40 + 14) / 2 + 5);
  });

  it("tela mais estreita que o bumper não conta coluna fantasma", () => {
    const r = riggingTela({ cols: 1, rows: 5, gabinete: GAB });
    expect(r.bumpers).toBe(1);
    expect(r.cargaPorPonto).toBe(1 * 40 + 14 + 5); // só 1 coluna existe
  });

  it("gabinete mais largo que o bumper avisa", () => {
    const r = riggingTela({ cols: 3, rows: 3, gabinete: { peso: "13.5", dimW: "600" } }, { bumperId: "b50" });
    expect(r.colunasPorBumper).toBe(1);
    expect(r.avisos.some((a) => a.includes("mais largo"))).toBe(true);
  });

  it("estouro: carga por ponto acima da talha de 1 t", () => {
    // 2 colunas × 20 gabinetes × 60 kg = 2400 kg + bumper
    const r = riggingTela({ cols: 4, rows: 20, gabinete: { peso: "60", dimW: "500" } });
    expect(r.cargaPorPonto).toBeGreaterThan(1000);
    expect(r.talha).toBeNull();
    expect(r.tone).toBe("over");
    expect(r.over).toBe(true);
  });

  it("atenção: entre 80% e 100% do WLL", () => {
    // 2 colunas × 11 gabinetes × 40 kg = 880 + 14 + 5 = 899 kg → 89,9%
    const r = riggingTela({ cols: 4, rows: 11, gabinete: { peso: "40", dimW: "500" } });
    expect(r.tone).toBe("warn");
    expect(r.over).toBe(false);
  });

  it("empilhamento: maxRows checa a altura da coluna", () => {
    expect(riggingTela(TELA, { maxRows: 8 }).empilhaOk).toBe(true);
    expect(riggingTela(TELA, { maxRows: 4 }).empilhaOk).toBe(false);
  });

  it("tela vazia/sem gabinete não explode", () => {
    const r = riggingTela({ cols: 0, rows: 0 });
    expect(r).toMatchObject({ bumpers: 0, pontos: 0, cargaPorPonto: 0, totalKg: 0, over: false });
    expect(riggingTela(undefined).over).toBe(false);
  });
});

describe("projectRigging", () => {
  it("soma telas e reporta o pior tom", () => {
    const p = { telas: [TELA, { cols: 2, rows: 2, gabinete: GAB }] };
    const r = projectRigging(p);
    expect(r.telas).toHaveLength(2);
    expect(r.totalKg).toBe(242 + (2 * 16 + 1 * 14)); // 242 + 46
    expect(r.pontos).toBe(3 + 1);
    expect(r.bumpers).toBe(3 + 1);
    expect(r.algumOver).toBe(false);
    expect(r.tone).toBe("ok");
  });
  it("uma tela estourada contamina o tom do projeto", () => {
    const p = { telas: [TELA, { cols: 4, rows: 20, gabinete: { peso: "60", dimW: "500" } }] };
    expect(projectRigging(p)).toMatchObject({ algumOver: true, tone: "over" });
  });
  it("projeto vazio", () => {
    expect(projectRigging({})).toMatchObject({ totalKg: 0, pontos: 0, algumOver: false, tone: "ok" });
  });
  it("catálogo e defaults batem com a frota do espeque", () => {
    expect(BUMPERS.map((b) => b.larguraMm)).toEqual([500, 1000]);
    expect(FIXACOES.map((f) => f.id)).toEqual(["garra", "cinta"]);
    expect(TALHAS_KG).toEqual([1000]); // talhas manuais de 1 t
    expect(DEFAULT_RIG.colunasPorBumper).toBeNull(); // derivado da largura
    expect(DEFAULT_RIG.talhaWLL).toBe(1000);
  });
});
