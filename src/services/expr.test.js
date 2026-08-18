// expr.test.js — a conta dentro do campo numérico (NumField).
import { describe, it, expect } from "vitest";
import { evalExpr, parseNum, isExpr } from "./expr.js";

describe("parseNum — número em pt-BR", () => {
  it("vírgula é decimal; ponto agrupando 3 dígitos é milhar", () => {
    expect(parseNum("1,5")).toBe(1.5);
    expect(parseNum("1.920")).toBe(1920);
    expect(parseNum("12.345.678")).toBe(12345678);
    expect(parseNum("1.920,5")).toBe(1920.5);
  });
  it("ponto decimal comum segue decimal (ninguém escreve mil com 1 dígito na frente)", () => {
    expect(parseNum("1.5")).toBe(1.5);
    expect(parseNum("0.96")).toBe(0.96);
  });
  it("texto que não é número → null", () => {
    expect(parseNum("")).toBe(null);
    expect(parseNum(",")).toBe(null);
  });
});

describe("evalExpr — as contas que o técnico faz de cabeça", () => {
  it("os casos do pedido: metade da resolução e múltiplo do gabinete", () => {
    expect(evalExpr("1920/2")).toBe(960);
    expect(evalExpr("192*3")).toBe(576);
  });
  it("número puro passa reto (o campo continua sendo um campo numérico)", () => {
    expect(evalExpr("512")).toBe(512);
    expect(evalExpr("3,5")).toBe(3.5);
    expect(evalExpr("-64")).toBe(-64);
  });
  it("precedência, parênteses e espaços", () => {
    expect(evalExpr("2+3*4")).toBe(14);
    expect(evalExpr("(1920-64)/2")).toBe(928);
    expect(evalExpr(" 128 * 4 + 64 ")).toBe(576);
    expect(evalExpr("-(2+3)")).toBe(-5);
  });
  it("× e x multiplicam, ÷ divide (a grade se escreve com ×)", () => {
    expect(evalExpr("192×3")).toBe(576);
    expect(evalExpr("192x3")).toBe(576);
    expect(evalExpr("1920÷2")).toBe(960);
  });
  it("milhar pt-BR dentro da conta", () => {
    expect(evalExpr("1.920/2")).toBe(960);
    expect(evalExpr("2.560-1.024")).toBe(1536);
  });
  it("meio de digitação → null (quem chama não commita)", () => {
    expect(evalExpr("1920/")).toBe(null);
    expect(evalExpr("(1920")).toBe(null);
    expect(evalExpr("*3")).toBe(null);
    expect(evalExpr("")).toBe(null);
    expect(evalExpr("12)3")).toBe(null);
  });
  it("divisão por zero não vira Infinity — vira null", () => {
    expect(evalExpr("512/0")).toBe(null);
  });
});

describe("isExpr — tem conta pra mostrar?", () => {
  it("operador no meio é conta; sinal na frente não é", () => {
    expect(isExpr("1920/2")).toBe(true);
    expect(isExpr("128*2")).toBe(true);
    expect(isExpr("1024-64")).toBe(true);
    expect(isExpr("-64")).toBe(false);
    expect(isExpr("512")).toBe(false);
    expect(isExpr("3,5")).toBe(false);
  });
});
