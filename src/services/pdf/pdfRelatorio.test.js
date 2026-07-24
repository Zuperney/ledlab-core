import { describe, it, expect } from "vitest";
import { buildRelatorioDoc } from "./pdfRelatorio.js";

// projeto mínimo com 2 telas reais (gabinete com specs) — o suficiente pro
// builder montar capa, Visão Geral e Elétrica sem NaN
const gab = { nome: "ROE CB5", resX: 104, resY: 104, dimW: 600, dimH: 600, pwrMax: 650, peso: 13.5, fp: 0.9, conector: "true1" };
const project = {
  name: "AD Summit",
  cliente: "Performance",
  local: "Arena da Baixada",
  status: "Planejamento",
  telas: [
    { id: "t1", nome: "Main", cols: 10, rows: 6, gabinete: gab },
    { id: "t2", nome: "Side", cols: 4, rows: 6, gabinete: gab },
  ],
};
const cfg = { vk: "220_tri", brilho: 0.7, conteudo: 0.33 };

describe("buildRelatorioDoc (F1 do motor de PDF)", () => {
  const doc = buildRelatorioDoc({ project, tipo: "Completo", cfg, logo: null, gerado: "24/07/2026" });
  const json = JSON.stringify(doc.content);

  it("é paisagem A4 com fontes standard e margens", () => {
    expect(doc.pageOrientation).toBe("landscape");
    expect(doc.pageSize).toBe("A4");
    expect(doc.defaultStyle.font).toBe("Helvetica");
  });

  it("capa: tag Caderno Técnico, nome do projeto e quebra de página", () => {
    expect(json).toContain("CADERNO TÉCNICO · COMPLETO");
    expect(json).toContain("AD Summit");
    expect(json).toContain('"pageBreak":"after"');
  });

  it("capa tem fundo próprio só na página 1", () => {
    expect(doc.background(1, { width: 100, height: 50 })).toBeTruthy();
    expect(doc.background(2, { width: 100, height: 50 })).toBeNull();
  });

  it("rodapé numera todas as páginas MENOS a capa", () => {
    expect(doc.footer(1, 9)).toBeNull();
    const f = JSON.stringify(doc.footer(3, 9));
    expect(f).toContain("PÁG 3 DE 9");
    expect(f).toContain("AD-SUMMIT");
  });

  it("Visão Geral: uma linha por tela + total, dados em Courier", () => {
    expect(json).toContain("Visão Geral".toUpperCase());
    expect(json).toContain("Main");
    expect(json).toContain("Side");
    expect(json).toContain('"Courier"');
    // total de gabinetes: 10×6 + 4×6 = 84
    expect(json).toContain('"84"');
  });

  it("Elétrica: disjuntor por tela, gerador sugerido e fórmula do típico", () => {
    expect(json).toContain("INFORMAÇÕES ELÉTRICAS");
    expect(json).toContain("Disjuntor".toUpperCase());
    expect(json).toContain("Gerador sugerido");
    expect(json).toContain("Típico por gabinete = base + (pico − base) × brilho × conteúdo");
  });

  it("sem logo, a capa não tem node de imagem (não quebra o pdfmake)", () => {
    expect(json).not.toContain('"image"');
  });
});
