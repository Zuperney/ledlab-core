// worklog.test.js — testes do motor de Diárias contra a tabela da spec (§5.3).
// Roda com: npm test   (vitest, ambiente node — funções puras, sem DOM)
import { describe, it, expect } from "vitest";
import { breakdownEvento, valorDia, normalizeCfg, DEFAULT_WORKLOG_CFG } from "./worklog.js";

const cfg = DEFAULT_WORKLOG_CFG; // J=12h, W=4h, TOL=50min
const M = { id: "m", nome: "Montagem", geraHoraExtra: true, podeSegundoCache: true, valorBase: 350 };
const D = { id: "d", nome: "Deslocamento", geraHoraExtra: false, podeSegundoCache: false, valorBase: 150 };
const V = { id: "v", nome: "Diária de viagem", geraHoraExtra: false, podeSegundoCache: true, valorBase: 200 };
const tiposById = { m: M, d: D, v: V };

const CHECKIN = "2026-07-03T09:00:00-03:00";
const base = Date.parse(CHECKIN);
// evento de `min` minutos de duração (checkout = checkin + min); override opcional
const ev = (min, over = {}) => ({ tipoId: "m", dataRef: "2026-07-03", checkin: CHECKIN, checkout: new Date(base + min * 60000).toISOString(), ...over });

describe("breakdownEvento — evento único (tipo com hora extra, C=350, J=12h)", () => {
  it.each([
    [720, 350], [780, 380], [840, 410], [900, 440], [960, 470],
    [1020, 700], [1440, 700], [1680, 820], [1740, 1050], [1920, 1050],
  ])("%i min => R$ %i", (min, exp) => {
    expect(breakdownEvento(ev(min), M, cfg).total).toBe(exp);
  });
});

describe("breakdownEvento — fração (regra dos 50 min)", () => {
  it.each([
    [770, 350], [771, 380], [820, 380], [831, 410],
  ])("%i min => R$ %i", (min, exp) => {
    expect(breakdownEvento(ev(min), M, cfg).total).toBe(exp);
  });
});

describe("breakdownEvento — flat e sem horários", () => {
  it("flat 20h (deslocamento) => 150", () => {
    expect(breakdownEvento(ev(1200, { tipoId: "d" }), D, cfg).total).toBe(150);
  });
  it("sem horários (só o cachê) => 350", () => {
    expect(breakdownEvento({ tipoId: "m", dataRef: "2026-07-03" }, M, cfg).total).toBe(350);
  });
});

describe("valorDia — agregação do dia (regra do deslocamento §5.5)", () => {
  it("4 serviços empilháveis (2+3+1+2h) => 1400", () => {
    expect(valorDia([ev(120), ev(180), ev(60), ev(120)], tiposById, cfg).total).toBe(1400);
  });
  it("só deslocamento (ida+volta) => 1 cachê = 150", () => {
    expect(valorDia([ev(300, { tipoId: "d" }), ev(300, { tipoId: "d" })], tiposById, cfg).total).toBe(150);
  });
  it("trabalho + deslocamento => deslocamento não cobra = 350", () => {
    expect(valorDia([ev(600, { tipoId: "m" }), ev(120, { tipoId: "d" })], tiposById, cfg).total).toBe(350);
  });
  it("diária de viagem + montagem (ambos empilham) => 550", () => {
    expect(valorDia([ev(600, { tipoId: "v" }), ev(600, { tipoId: "m" })], tiposById, cfg).total).toBe(550);
  });
  it("override cobrarSeparado=false cancela empilhamento do evento", () => {
    expect(valorDia([ev(120, { tipoId: "m" }), ev(120, { tipoId: "m", cobrarSeparado: false })], tiposById, cfg).total).toBe(350);
  });
});

describe("normalizeCfg — hardening de configuração", () => {
  it("normaliza números inválidos para defaults seguros", () => {
    expect(normalizeCfg({ jornadaH: 0, janelaExtraH: -1, toleranciaExtraMin: 99 })).toEqual(cfg);
    expect(normalizeCfg({ jornadaH: "x", janelaExtraH: null, toleranciaExtraMin: undefined })).toEqual(cfg);
  });
  it("não quebra cálculo mesmo com cfg inválida", () => {
    expect(breakdownEvento(ev(780), M, { jornadaH: 0, janelaExtraH: -2, toleranciaExtraMin: 999 }).total).toBe(380);
  });
});
