// filenames.test.js — nomes de arquivo padronizados (projeto_tipo_timestamp).
import { describe, it, expect } from "vitest";
import { fileStamp, fileName } from "./filenames.js";

describe("fileStamp", () => {
  it("formata data/hora local ordenável (YYYY-MM-DD_HHMM, com zeros)", () => {
    expect(fileStamp(new Date(2026, 6, 13, 8, 5))).toBe("2026-07-13_0805");
    expect(fileStamp(new Date(2026, 11, 1, 23, 59))).toBe("2026-12-01_2359");
  });
});

describe("fileName", () => {
  it("junta as partes com slug + carimbo + extensão", () => {
    const n = fileName(["Migração Teste", "Relatório", "Completo"], "pdf");
    expect(n).toMatch(/^migracao-teste_relatorio_completo_\d{4}-\d{2}-\d{2}_\d{4}\.pdf$/);
  });

  it("remove acentos e símbolos (slug seguro pra arquivo)", () => {
    expect(fileName(["São João & Cia."], "png")).toMatch(/^sao-joao-cia_/);
    expect(fileName(["--Olá!--"], "png")).toMatch(/^ola_/);
  });

  it("sem extensão: termina no carimbo (título de PDF via impressão)", () => {
    expect(fileName(["x"])).toMatch(/^x_\d{4}-\d{2}-\d{2}_\d{4}$/);
  });

  it("partes vazias caem no fallback 'ledlab'", () => {
    expect(fileName([], "json")).toMatch(/^ledlab_/);
    expect(fileName(["", "  "], "json")).toMatch(/^ledlab_/);
  });

  it("aceita parte única fora de array", () => {
    expect(fileName("Backup Geral", "json")).toMatch(/^backup-geral_/);
  });
});
