import { describe, it, expect } from "vitest";
import { sugereMotor, riggingTela, projectRigging, MOTORES_KG, DEFAULT_RIG } from "./rigging.js";

// gabinete padrão dos testes: 8 kg (strings, como o app guarda)
const GAB = { peso: "8" };
const TELA = { cols: 5, rows: 5, gabinete: GAB };

describe("sugereMotor", () => {
  it("escolhe o menor WLL que aguenta", () => {
    expect(sugereMotor(100)).toBe(250);
    expect(sugereMotor(250)).toBe(250);
    expect(sugereMotor(251)).toBe(500);
    expect(sugereMotor(1900)).toBe(2000);
  });
  it("null acima do maior motor ou sem carga", () => {
    expect(sugereMotor(2001)).toBeNull();
    expect(sugereMotor(0)).toBeNull();
    expect(sugereMotor(NaN)).toBeNull();
  });
  it("utilização reduz o WLL admitido", () => {
    expect(sugereMotor(210, 0.8)).toBe(500); // 250×0.8=200 não aguenta
    expect(sugereMotor(1500, 0.8, MOTORES_KG)).toBe(2000); // 2000×0.8=1600 aguenta
    expect(sugereMotor(1601, 0.8)).toBeNull(); // acima de 2000×0.8
  });
});

describe("riggingTela", () => {
  it("tela 5×5 de 8 kg com os padrões", () => {
    const r = riggingTela(TELA);
    expect(r.pesoColuna).toBe(40); // 5 × 8
    expect(r.bumpers).toBe(3); // ceil(5/2)
    expect(r.pontos).toBe(3);
    // pior caso: bumper cheio (2 colunas) + bumper 15 + extras 5
    expect(r.cargaPorPonto).toBe(2 * 40 + 15 + 5);
    expect(r.motor).toBe(250);
    expect(r.over).toBe(false);
    expect(r.totalKg).toBe(5 * 40 + 3 * 15); // 245
    expect(r.empilhaOk).toBeNull(); // sem maxRows configurado
  });

  it("2 pontos por bumper repartem a carga do bumper (extras por ponto)", () => {
    const r = riggingTela(TELA, { pontosPorBumper: 2 });
    expect(r.pontos).toBe(6);
    expect(r.cargaPorPonto).toBe((2 * 40 + 15) / 2 + 5);
  });

  it("tela mais estreita que o bumper não conta coluna fantasma", () => {
    const r = riggingTela({ cols: 1, rows: 5, gabinete: GAB }, { colunasPorBumper: 2 });
    expect(r.bumpers).toBe(1);
    expect(r.cargaPorPonto).toBe(1 * 40 + 15 + 5); // só 1 coluna existe
  });

  it("estouro: carga por ponto acima do maior motor", () => {
    // 2 colunas × 20 gab × 60 kg = 2400 + bumper
    const r = riggingTela({ cols: 4, rows: 20, gabinete: { peso: "60" } });
    expect(r.cargaPorPonto).toBeGreaterThan(2000);
    expect(r.motor).toBeNull();
    expect(r.over).toBe(true);
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
  it("soma telas e marca estouro do projeto", () => {
    const p = { telas: [TELA, { cols: 2, rows: 2, gabinete: GAB }] };
    const r = projectRigging(p);
    expect(r.telas).toHaveLength(2);
    expect(r.totalKg).toBe(245 + (2 * 16 + 1 * 15)); // 245 + 47
    expect(r.pontos).toBe(3 + 1);
    expect(r.algumOver).toBe(false);
  });
  it("projeto vazio", () => {
    expect(projectRigging({})).toMatchObject({ totalKg: 0, pontos: 0, algumOver: false });
  });
  it("defaults exportados batem com o espeque", () => {
    expect(DEFAULT_RIG.colunasPorBumper).toBe(2);
    expect(DEFAULT_RIG.utilizacao).toBe(1);
  });
});
