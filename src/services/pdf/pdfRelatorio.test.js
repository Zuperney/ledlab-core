import { describe, it, expect } from "vitest";
import { buildRelatorioDoc } from "./pdfRelatorio.js";

// projeto mínimo com 2 telas reais (gabinete com specs) — o suficiente pro
// builder montar todas as seções sem NaN
const gab = { nome: "ROE CB5", resX: 104, resY: 104, dimW: 600, dimH: 600, pwrMax: 650, peso: 13.5, fp: 0.9, conector: "true1" };
const project = {
  name: "AD Summit",
  cliente: "Performance",
  local: "Arena da Baixada",
  status: "planned",
  dataInicio: "2026-08-10",
  dataFim: "2026-08-12",
  telas: [
    { id: "t1", nome: "Main", cols: 10, rows: 6, gabinete: gab },
    { id: "t2", nome: "Side", cols: 4, rows: 6, gabinete: gab },
  ],
};
const cfg = { vk: "220_tri", brilho: 0.7, conteudo: 0.33 };
const build = (tipo) => buildRelatorioDoc({ project, tipo, cfg, logo: null, gerado: "24/07/2026" });

describe("buildRelatorioDoc (motor de PDF, F2)", () => {
  const doc = build("Completo");
  const json = JSON.stringify(doc.content);

  it("é paisagem A4 com as fontes Plex embutidas (numeral tabular)", () => {
    expect(doc.pageOrientation).toBe("landscape");
    expect(doc.pageSize).toBe("A4");
    expect(doc.defaultStyle.font).toBe("PlexSans");
  });

  it("capa: tag Caderno Técnico, nome, STATUS legível, datas do evento e quebra de página", () => {
    expect(json).toContain("CADERNO TÉCNICO · COMPLETO");
    expect(json).toContain("AD Summit");
    expect(json).toContain("Planejamento"); // planned → rótulo PT, não a chave crua
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

  it("Visão Geral: uma linha por tela + total + gabinetes utilizados", () => {
    expect(json).toContain("VISÃO GERAL");
    expect(json).toContain("Main");
    expect(json).toContain("Side");
    expect(json).toContain('"PlexMono"'); // dado técnico em mono (manual §10.4)
    expect(json).toContain('"84"'); // total de gabinetes: 10×6 + 4×6
    expect(json).toContain("GABINETES UTILIZADOS");
    expect(json).toContain("ROE CB5");
  });

  it("Vídeo/Resolução: resolução por tela e aspecto", () => {
    expect(json).toContain("VÍDEO / RESOLUÇÃO");
    expect(json).toContain("1.040 × 624"); // 10×104 por 6×104, pt-BR
  });

  it("Elétrica: disjuntor por tela, gerador sugerido e fórmula do típico", () => {
    expect(json).toContain("INFORMAÇÕES ELÉTRICAS");
    expect(json).toContain("Disjuntor".toUpperCase());
    expect(json).toContain("Gerador sugerido");
    expect(json).toContain("Típico por gabinete = base + (pico − base) × brilho × conteúdo");
  });

  it("Sinal (legado, sem Screens): seção por tela com ficha de specs", () => {
    expect(json).toContain("CABEAMENTO DE SINAL");
    expect(json).toContain("MÁX POR PORTA");
    expect(json).toContain("RÉGUA");
  });

  it("AC: aviso de energização (laranja) + ficha de specs por tela", () => {
    expect(json).toContain("ENERGIA — CABEAMENTO AC");
    expect(json).toContain("ATENÇÃO — ENERGIZAÇÃO");
    expect(json).toContain("powerCON azuis");
    expect(json).toContain("MÁX POR CABO");
    expect(json).toContain("A/gabinete");
  });

  it("Glossário em duas colunas fecha o caderno Completo", () => {
    expect(json).toContain("GLOSSÁRIO");
    expect(json).toContain("Pico × Típico");
    expect(json).toContain("Serpentina");
  });

  it("sem logo, a capa não tem node de imagem (não quebra o pdfmake)", () => {
    expect(json).not.toContain('"image"');
  });

  it("swatch de cor por porta (rect na cor do cabo)", () => {
    expect(json).toContain('"type":"rect"');
  });
});

describe("filtros por TIPO do caderno (paridade com o DOM)", () => {
  it("Resumido: sem sinal/AC/glossário; com VG, vídeo e elétrica", () => {
    const j = JSON.stringify(build("Resumido").content);
    expect(j).toContain("VISÃO GERAL");
    expect(j).toContain("INFORMAÇÕES ELÉTRICAS");
    expect(j).not.toContain("CABEAMENTO DE SINAL");
    expect(j).not.toContain("GLOSSÁRIO");
  });

  it("Elétrico: só elétrica (sem VG/vídeo/sinal)", () => {
    const j = JSON.stringify(build("Elétrico").content);
    expect(j).toContain("INFORMAÇÕES ELÉTRICAS");
    expect(j).not.toContain("VISÃO GERAL");
    expect(j).not.toContain("CABEAMENTO DE SINAL");
  });

  it("Mapa de cabos: sinal+AC com mapa de pixels, sem elétrica; capa sem Pico/Gerador", () => {
    const doc = build("Mapa de cabos");
    const j = JSON.stringify(doc.content);
    expect(j).toContain("CABEAMENTO DE SINAL");
    expect(j).toContain("Mapa de pixels");
    expect(j).not.toContain("INFORMAÇÕES ELÉTRICAS");
    expect(j).not.toContain("Gerador");
  });

  it("LLC-01: nome de 40+ caracteres encolhe o título da capa (não estoura a página)", () => {
    const longo = buildRelatorioDoc({ project: { ...project, name: "Ademicom Summit 2026 — Arena da Baixada PR" }, tipo: "Completo", cfg, logo: null });
    const title = longo.content.find((n) => typeof n.text === "string" && n.text.startsWith("Ademicom"));
    expect(title.fontSize).toBeLessThanOrEqual(33);
    expect(title.fontSize).toBeGreaterThanOrEqual(24);
    const curto = build("Completo").content.find((n) => n.text === "AD Summit");
    expect(curto.fontSize).toBe(58);
  });

  it("um tópico por página + uma página por Screen/tela no sinal e no AC", () => {
    // Completo sem Screens: 7 seções (com sumário, todas quebram) + 4 blocos
    // (2 telas × sinal e AC, cada um na própria página) → 11 quebras "before".
    // A cadeia de Peso e ancoragens FLUI: não abre página por tela.
    const completo = JSON.stringify(build("Completo").content);
    expect(completo.match(/"pageBreak":"before"/g)?.length).toBe(11);
    // Elétrico = 1 seção só, sem sumário e sem blocos → nenhuma quebra "before"
    const eletrico = JSON.stringify(build("Elétrico").content);
    expect(eletrico.match(/"pageBreak":"before"/g)).toBeNull();
  });

  it("abertura de seção: 04 e 05 têm resumo geral (stats + tabela de Screens/telas)", () => {
    const j = JSON.stringify(build("Completo").content);
    expect(j).toContain("PORTAS DE SINAL"); // stat da abertura do sinal (legado)
    expect(j).toContain("CIRCUITOS AC"); // stat da abertura do AC
    expect(j).toContain('"fontSize":19'); // números grandes da statRow
    expect(j).toContain('"fontSize":11.5'); // specs por Screen/tela em fonte maior
  });

  it("SUMÁRIO só no Completo: nó toc + entradas coloridas por disciplina", () => {
    const completo = JSON.stringify(build("Completo").content);
    expect(completo).toContain('"toc"');
    expect(completo).toContain("SUMÁRIO");
    // 7 seções marcadas (marcador invisível com a linha "NN · TÍTULO")
    expect(completo.match(/"tocItem":true/g)?.length).toBe(7);
    expect(completo).toContain("01  ·  VISÃO GERAL");
    // Elétrico/Mapa de cabos: sem sumário (mas os marcadores são inofensivos)
    expect(JSON.stringify(build("Elétrico").content)).not.toContain('"toc"');
  });

  // ── R3: Peso e ancoragens ──
  // O contrato do papel: a seção registra peso e ancoragens; nunca promete
  // engenharia e nunca transforma ausência de dado em folga.
  it("Peso e ancoragens: seção 02, logo depois da Visão Geral, na cor da Estrutura", () => {
    const j = JSON.stringify(build("Completo").content);
    expect(j).toContain("02  ·  PESO E ANCORAGENS");
    expect(j).toContain("#0f766e"); // teal da disciplina Estrutura
    expect(j).not.toContain("RIGGING"); // a seção nunca se chama assim
  });

  it("sai no Completo e no Estrutural; fica fora do Elétrico e do Resumido", () => {
    expect(JSON.stringify(build("Estrutural").content)).toContain("PESO E ANCORAGENS");
    expect(JSON.stringify(build("Elétrico").content)).not.toContain("PESO E ANCORAGENS");
    expect(JSON.stringify(build("Resumido").content)).not.toContain("PESO E ANCORAGENS");
  });

  it("gabinete sem limite de fabricante: imprime NÃO INFORMADO, nunca 'dentro'", () => {
    const j = JSON.stringify(build("Estrutural").content); // o gab do teste não tem rigging
    expect(j).toContain("NÃO INFORMADO");
    expect(j).toContain("LIMITE DE EMPILHAMENTO NÃO INFORMADO");
    expect(j).toContain("sem dado de fabricante");
    expect(j).not.toContain("DENTRO");
  });

  it("acima do limite: aviso VERMELHO que nomeia o elo e desarma a troca de talha", () => {
    const gabLim = { ...gab, rigging: { voadoMaxM: 2, porBarraMaxQtd: 4, fonte: "Datasheet", conferido: true } };
    const j = JSON.stringify(buildRelatorioDoc({ project: { ...project, telas: [{ id: "t1", nome: "Main", cols: 10, rows: 6, gabinete: gabLim }] }, tipo: "Estrutural", cfg, logo: null }));
    expect(j).toContain("ACIMA DO LIMITE DO FABRICANTE");
    expect(j).toContain("#b91c1c"); // borda vermelha do aviso (PRINT.red)
    expect(j).toContain("trocar de talha não resolve");
  });

  it("gabinete sem peso: campos em branco e aviso — a seção não inventa um zero", () => {
    const semPeso = { ...gab, peso: "" };
    const doc = buildRelatorioDoc({ project: { ...project, telas: [{ id: "t1", nome: "Main", cols: 10, rows: 6, gabinete: semPeso }] }, tipo: "Estrutural", cfg, logo: null });
    const j = JSON.stringify(doc.content);
    expect(j).toContain("PESO DO GABINETE NÃO INFORMADO");
    // peso e pior ancoragem saem como travessão na tabela, não como 0 kg
    expect(j).toContain('{"text":"—","font":"PlexMono","alignment":"right"}');
    // e o total avisa que é parcial em vez de fingir que fechou
    expect(j).toContain("(parcial)");
  });

  it("o checklist de campo e o aviso de escopo viajam junto com os números", () => {
    const j = JSON.stringify(build("Estrutural").content);
    expect(j).toContain("ANTES DE SUBIR");
    expect(j).toContain("1 m de corrente livre");
    expect(j).toContain("PLANEJAMENTO DE REFERÊNCIA");
    expect(j).toContain("rigger habilitado");
  });

  it("bloco de tela/Screen NÃO usa unbreakable — o pdfmake descarta bloco maior que a página", () => {
    // regressão do caderno real: unbreakable no fio da página gerou páginas em
    // branco e a Screen 2 sumiu; o bloco abre em página própria e pode fluir
    expect(JSON.stringify(build("Completo").content)).not.toContain('"unbreakable"');
  });

  it("F3: sinal e AC levam o mapa de cabos VISUAL (nó svg por tela)", () => {
    const j = JSON.stringify(build("Completo").content);
    // esquema das telas em fila + 2 telas × (sinal + AC) = 5 svgs
    expect((j.match(/"svg":"<svg/g) || []).length).toBe(5);
    expect(j).toContain("#0d0d1a"); // fundo do mapa (identidade visual v1.5.3)
  });

  it("F3: Vídeo abre com o esquema das telas em fila + legenda da resolução linear", () => {
    const j = JSON.stringify(build("Completo").content);
    expect(j).toContain("As telas em fila");
    expect(j).toContain("resolução linear ");
    // 10×104 + 4×104 = 1.456 px de largura linear · altura 6×104
    expect(j).toContain("1.456 × 624 px");
  });

  it("numeração de seção segue a ordem exibida (Completo começa em 01)", () => {
    const j = JSON.stringify(build("Completo").content);
    expect(j).toContain('"01"');
    expect(j).toContain('"05"'); // 5 seções numeradas no Completo sem Screens... VG, vídeo, elétrica, sinal, AC, glossário = 6
    expect(j).toContain('"06"');
  });
});
