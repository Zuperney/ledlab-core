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

  it("página 1 tem o fundo da capa; as demais ganham a MOLDURA da prancha", () => {
    const capa = JSON.stringify(doc.background(1, { width: 100, height: 50 }));
    expect(capa).toContain("#fafaf7"); // fundo Folha Técnica
    const prancha = doc.background(2, { width: 841.89, height: 595.28 });
    const r = prancha.canvas[0];
    expect(r.type).toBe("rect");
    expect(r.lineWidth).toBeGreaterThan(1); // moldura, não preenchimento
    expect(r.x).toBe(16); // inset da prancha
  });

  it("o CARIMBO sai em toda página menos a capa, com FOLHA página/total", () => {
    expect(doc.footer(1, 9)).toBeNull();
    const f = JSON.stringify(doc.footer(3, 12));
    expect(f).toContain('"03"'); // FOLHA grande, zero à esquerda
    expect(f).toContain("/12");
    expect(f).toContain('"AD-SUMMIT"'); // Nº doc sozinho na linha (nunca quebra)
    expect(f).toContain("REV 0"); // REV mora com o GERADO; primeira emissão = 0
    expect(f).toContain("CADERNO TÉCNICO · COMPLETO");
    expect(f).toContain("AD Summit"); // evento
    expect(f).toContain("Performance"); // cliente
    // a autoria LedLab mora AO LADO do chip do cabeçalho, não sob o logo do
    // cliente (lia como assinatura do logo alheio — dono, 30/07)
    const [marca, campos] = doc.footer(3, 12).table.body[0];
    expect(JSON.stringify(marca)).not.toContain("ENGENHARIA DE LED");
    const cab = JSON.stringify(campos.stack[0]);
    expect(cab).toContain("CADERNO TÉCNICO");
    expect(cab).toContain("LEDLAB CORE · ENGENHARIA DE LED");
  });

  // REGRESSÃO (caderno real de 30/07): "Nº ADEMICOM-SUMMIT-2026 · REV A" quebrava
  // de linha, a faixa crescia e a borda do carimbo vazava pra fora da moldura.
  // heights do pdfmake é MÍNIMO — a garantia é nenhum valor ocupar 2 linhas.
  it("carimbo: valor longo é truncado numa linha — a faixa nunca cresce", () => {
    const longo = {
      ...project,
      name: "Ademicom Summit 2026 Edição Especial de Aniversário com Nome Comprido Demais",
      cliente: "C".repeat(120),
      local: "L".repeat(120),
    };
    const d = buildRelatorioDoc({ project: longo, tipo: "Completo", cfg, logo: null, assinatura: "A".repeat(90) });
    const f = d.footer(2, 5);
    const strings = [];
    JSON.stringify(f, (k, v) => { if (typeof v === "string") strings.push(v); return v; });
    for (const s of strings) expect(s.length).toBeLessThanOrEqual(78); // truncado com "…"
    expect(JSON.stringify(f)).toContain("…");
  });

  it("REVISÃO é manual (project.rev): sobe no carimbo E na capa; lixo vira 0", () => {
    const d = buildRelatorioDoc({ project: { ...project, rev: 3 }, tipo: "Completo", cfg, logo: null });
    expect(JSON.stringify(d.footer(2, 5))).toContain("REV 3");
    expect(JSON.stringify(d.content)).toContain("Rev "); // capa carrega a revisão
    const lixo = buildRelatorioDoc({ project: { ...project, rev: -2 }, tipo: "Completo", cfg, logo: null });
    expect(JSON.stringify(lixo.footer(2, 5))).toContain("REV 0");
  });

  it("carimbo: assinatura entra no Projetou; sem assinatura sai travessão", () => {
    const com = buildRelatorioDoc({ project, tipo: "Completo", cfg, logo: null, assinatura: "Ney · LedLab" });
    expect(JSON.stringify(com.footer(2, 5))).toContain("Ney · LedLab");
    const sem = JSON.stringify(doc.footer(2, 5));
    expect(sem).toContain("PROJETOU");
    expect(sem).toContain("—");
  });

  it("carimbo: logo do projeto no bloco da marca; capa fica com a marca LedLab (imagens NOMEADAS)", () => {
    const px = "data:image/png;base64,AAA";
    const d = buildRelatorioDoc({ project: { ...project, logo: px }, tipo: "Completo", cfg, logo: "data:image/png;base64,LEDLAB", logoProjeto: px });
    // por NOME no dicionário images (embute 1× mesmo com re-layouts do pageBreakBefore)
    expect(JSON.stringify(d.footer(2, 5))).toContain('"image":"logoProjeto"');
    expect(d.images.logoProjeto).toBe(px);
    expect(d.images.marcaLedlab).toBe("data:image/png;base64,LEDLAB");
    const capaJson = JSON.stringify(d.content[0]); // topo da capa
    expect(capaJson).toContain('"image":"marcaLedlab"'); // a marca, não o logo do projeto
    expect(capaJson).not.toContain("logoProjeto");
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

  it("Vídeo/Resolução: resolução por tela, aspecto e fração decimal", () => {
    expect(json).toContain("VÍDEO / RESOLUÇÃO");
    expect(json).toContain("1.040 × 624"); // 10×104 por 6×104, pt-BR
    expect(json).toContain("FRAÇÃO");
    expect(json).toContain("1,667"); // 1040/624 com vírgula, 3 casas
  });

  it("Visão Geral tem a coluna de pixels da tela", () => {
    expect(json).toContain("RESOLUÇÃO (PX)");
  });

  it("Elétrica: sem sugestão de disjuntor; gerador mínimo pelo pico + fórmula do típico", () => {
    expect(json).toContain("INFORMAÇÕES ELÉTRICAS");
    expect(json).not.toContain("Disjuntor".toUpperCase()); // app não sugere disjuntor (auditoria 30/07/2026)
    expect(json).not.toContain("combustível"); // o app não calcula combustível
    expect(json).toContain("Gerador mínimo (pico × 1,25)");
    expect(json).toContain("Típico por gabinete = base + (pico − base) × brilho × conteúdo");
  });

  it("Elétrica: balanço por fase com pico E típico (220 tri = pares)", () => {
    expect(json).toContain("Balanço por fase");
    expect(json).toContain("PICO A");
    expect(json).toContain("TÍPICO A");
    expect(json).toContain('"RS"'); // par do 220 trifásico
  });

  it("Sinal (legado, sem Screens): seção por tela com ficha de specs", () => {
    expect(json).toContain("CABEAMENTO DE SINAL");
    expect(json).toContain("MÁX POR PORTA");
    expect(json).toContain("RÉGUA");
  });

  it("AC: título direto + aviso de energização (laranja) + ficha de specs por tela", () => {
    expect(json).toContain("CABEAMENTO AC");
    expect(json).not.toContain("ENERGIA — CABEAMENTO AC"); // título encurtou (31/07)
    expect(json).toContain("ATENÇÃO — ENERGIZAÇÃO");
    expect(json).toContain("powerCON azuis");
    expect(json).toContain("MÁX POR CABO");
    expect(json).toContain("A/gabinete");
  });

  it("Glossário em duas colunas fecha o caderno Completo (sem os termos removidos)", () => {
    expect(json).toContain("GLOSSÁRIO");
    expect(json).toContain("Pico × Típico");
    expect(json).toContain("Fases R/S/T");
    // "Serpentina" só existia como verbete — sumiu do doc inteiro. ("Bumper"/"Talha"
    // seguem citados na seção Estrutura, que aponta pro rigger; a ausência DELES
    // no glossário é travada em reportContent.test.js.)
    expect(json).not.toContain("Serpentina");
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

  it("Screen overclocada: spec OVERCLOCK declarada e uso >100% em laranja, não vermelho", () => {
    // gab 192×192 (36.864 px): floor 17 → ceil 18; 18 gab numa porta = 101%
    const proj = {
      ...project,
      telas: [{ id: "t1", nome: "Main", cols: 6, rows: 3, gabinete: { ...gab, resX: 192, resY: 192 } }],
      screens: [{ id: "s1", nome: "Screen 1", telaIds: ["t1"], pos: { t1: { x: 0, y: 0 } }, sinal: { rule: "px", strategy: "auto", overclock: true } }],
    };
    const j = JSON.stringify(buildRelatorioDoc({ project: proj, tipo: "Mapa de cabos", cfg, logo: null }).content);
    expect(j).toContain("OVERCLOCK"); // premissa declarada no specBox da Screen
    expect(j).toContain('"101%"'); // o % real nunca mente
    expect(j).toContain('"text":"101%","font":"PlexMono","alignment":"right","bold":true,"color":"#b45309"'); // laranja (PRINT.amb)
    expect(j).not.toContain('"text":"101%","font":"PlexMono","alignment":"right","bold":true,"color":"#b91c1c"'); // não é estouro
  });

  it("um tópico por página + uma página por Screen/tela — quebra CONDICIONAL (headlineLevel)", () => {
    // A quebra é decidida pelo pageBreakBefore do docDefinition (só quebra se a
    // página atual tem conteúdo — mata a página em branco); os nós de início de
    // seção/bloco carregam headlineLevel 1. Completo sem Screens: 7 seções (com
    // sumário, todas marcam) + 4 blocos (2 telas × sinal e AC) → 11 marcas.
    const doc = build("Completo");
    const completo = JSON.stringify(doc.content);
    expect(completo.match(/"headlineLevel":1/g)?.length).toBe(11);
    expect(completo.match(/"pageBreak":"before"/g)).toBeNull(); // nunca incondicional
    expect(typeof doc.pageBreakBefore).toBe("function");
    // quebra só com conteúdo na página atual (assinatura do pdfmake: getters no 2º arg)
    const ctx = (prev) => ({ getPreviousNodesOnPage: () => prev });
    expect(doc.pageBreakBefore({ headlineLevel: 1 }, ctx([{ text: "x" }]))).toBe(true);
    expect(doc.pageBreakBefore({ headlineLevel: 1 }, ctx([]))).toBe(false); // página vazia: não dobra a quebra
    expect(doc.pageBreakBefore({ text: "comum" }, ctx([{ text: "x" }]))).toBe(false);
    // Elétrico = 1 seção só, sem sumário e sem blocos → nenhuma marca
    const eletrico = JSON.stringify(build("Elétrico").content);
    expect(eletrico.match(/"headlineLevel":1/g)).toBeNull();
  });

  it("abertura de seção: 04 e 05 têm resumo geral (stats + tabela de Screens/telas)", () => {
    const j = JSON.stringify(build("Completo").content);
    expect(j).toContain("PORTAS DE SINAL"); // stat da abertura do sinal (legado)
    expect(j).toContain("CIRCUITOS AC"); // stat da abertura do AC
    expect(j).toContain('"fontSize":19'); // números grandes da statRow
    expect(j).toContain('"fontSize":10.5'); // specs por Screen/tela (compactadas em 31/07)
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

  it("elétrica declara a TENSÃO completa (não só 'Trifásico')", () => {
    expect(JSON.stringify(build("Completo").content)).toContain("Dimensionamento em 220 V · Trifásico (F+F+F)");
  });

  it("AC ganha coluna FASE com o rodízio (pares RS/ST/TR no 220 tri); some sem rodízio", () => {
    const com = JSON.stringify(build("Mapa de cabos").content);
    expect(com).toContain('"FASE"');
    expect(com).toContain('"RS"'); // 220 tri: circuito F+F → par de fases
    const mono = JSON.stringify(buildRelatorioDoc({ project, tipo: "Mapa de cabos", cfg: { ...cfg, vk: "380_mono" }, logo: null }).content);
    expect(mono).not.toContain('"FASE"');
  });

  // ── Peso e estrutura ──
  // O contrato do papel: a seção registra peso e checa limite publicado; nunca
  // promete engenharia e nunca transforma ausência de dado em folga.
  it("Peso e estrutura: seção 02, logo depois da Visão Geral, na cor da Estrutura", () => {
    const j = JSON.stringify(build("Completo").content);
    expect(j).toContain("02  ·  PESO E ESTRUTURA");
    expect(j).toContain("#0f766e"); // teal da disciplina Estrutura
    expect(j).not.toContain("RIGGING"); // a seção nunca se chama assim
  });

  it("sai no Completo e no Estrutural; fica fora do Elétrico e do Resumido", () => {
    expect(JSON.stringify(build("Estrutural").content)).toContain("PESO E ESTRUTURA");
    expect(JSON.stringify(build("Elétrico").content)).not.toContain("PESO E ESTRUTURA");
    expect(JSON.stringify(build("Resumido").content)).not.toContain("PESO E ESTRUTURA");
  });

  it("toggle `mostrar: false` tira a seção do Completo — mas o Estrutural mostra sempre", () => {
    const proj = { ...project, rigging: { mostrar: false } };
    expect(JSON.stringify(buildRelatorioDoc({ project: proj, tipo: "Completo", cfg, logo: null }).content)).not.toContain("PESO E ESTRUTURA");
    expect(JSON.stringify(buildRelatorioDoc({ project: proj, tipo: "Estrutural", cfg, logo: null }).content)).toContain("PESO E ESTRUTURA");
  });

  it("montagem sentada: a tag muda e a cadeia checa a altura empilhada", () => {
    const gabLim = { ...gab, rigging: { voadoMaxM: 10, empilhadoMaxM: 6, fonte: "Manual", conferido: true } };
    const proj = { ...project, rigging: { modo: "empilhado" }, telas: [{ id: "t1", nome: "Main", cols: 10, rows: 6, gabinete: gabLim }] };
    const j = JSON.stringify(buildRelatorioDoc({ project: proj, tipo: "Estrutural", cfg, logo: null }).content);
    expect(j).toContain("PAREDE SENTADA"); // o sectionHead põe a tag em caixa alta
    expect(j).toContain("Empilhamento no piso · altura");
    expect(j).not.toContain("Trava entre gabinetes · altura voada");
    expect(j).not.toContain("ANTES DE SUBIR"); // checklist é da parede voada
  });

  it("gabinete sem limite de fabricante: imprime NÃO INFORMADO, nunca 'dentro'", () => {
    const j = JSON.stringify(build("Estrutural").content); // o gab do teste não tem rigging
    expect(j).toContain("NÃO INFORMADO");
    expect(j).toContain("LIMITE DO FABRICANTE NÃO INFORMADO");
    expect(j).toContain("sem dado de fabricante");
    expect(j).not.toContain("DENTRO");
  });

  it("acima do limite: aviso VERMELHO que nomeia o elo e desarma a saída errada", () => {
    const gabLim = { ...gab, rigging: { voadoMaxM: 2, porBarraMaxQtd: 4, fonte: "Datasheet", conferido: true } };
    const j = JSON.stringify(buildRelatorioDoc({ project: { ...project, telas: [{ id: "t1", nome: "Main", cols: 10, rows: 6, gabinete: gabLim }] }, tipo: "Estrutural", cfg, logo: null }));
    expect(j).toContain("ACIMA DO LIMITE DO FABRICANTE");
    expect(j).toContain("#b91c1c"); // borda vermelha do aviso (PRINT.red)
    expect(j).toContain("ferragem não resolve");
  });

  it("gabinete sem peso: campos em branco e aviso — a seção não inventa um zero", () => {
    const semPeso = { ...gab, peso: "" };
    const telas = [
      { id: "t1", nome: "Main", cols: 10, rows: 6, gabinete: semPeso },
      { id: "t2", nome: "Side", cols: 4, rows: 6, gabinete: gab }, // esta tem peso
    ];
    const doc = buildRelatorioDoc({ project: { ...project, telas }, tipo: "Estrutural", cfg, logo: null });
    const j = JSON.stringify(doc.content);
    expect(j).toContain("PESO DO GABINETE NÃO INFORMADO");
    // o peso da tela sem dado sai como travessão na tabela, não como 0 kg
    expect(j).toContain('{"text":"—","font":"PlexMono","alignment":"right"}');
    // e o total avisa que é parcial em vez de fingir que fechou
    expect(j).toContain("(parcial)");
  });

  // REGRESSÃO ponta a ponta: o técnico cadastra o limite na Biblioteca e o
  // Caderno de um projeto ANTIGO (snapshot sem `rigging`) tem que refletir.
  it("limite cadastrado na Biblioteca chega no Caderno de projeto já existente", () => {
    const cabVivo = { ...gab, id: 42, rigging: { voadoMaxM: 2, porBarraMaxQtd: 4, fonte: "Manual Absen", conferido: true } };
    const proj = { ...project, telas: [{ id: "t1", nome: "Main", cols: 10, rows: 6, cabId: 42, gabinete: gab }] }; // snapshot SEM rigging
    const semLib = JSON.stringify(buildRelatorioDoc({ project: proj, tipo: "Estrutural", cfg, logo: null }).content);
    expect(semLib).toContain("NÃO INFORMADO");

    const comLib = JSON.stringify(buildRelatorioDoc({ project: proj, tipo: "Estrutural", cfg, logo: null, cabs: [cabVivo] }).content);
    expect(comLib).toContain("Manual Absen · conferido"); // a procedência aparece
    expect(comLib).toContain("ACIMA DO LIMITE DO FABRICANTE"); // e o limite passa a valer
  });

  it("telas com a mesma cadeia rendem UM bloco só (não 6 iguais)", () => {
    const seis = Array.from({ length: 6 }, (_, i) => ({ id: `t${i}`, nome: `Lateral ${i + 1}`, cols: 4, rows: 6, gabinete: gab }));
    const j = JSON.stringify(buildRelatorioDoc({ project: { ...project, telas: seis }, tipo: "Estrutural", cfg, logo: null }).content);
    expect(j.match(/A cadeia — o que trava primeiro/gi)?.length).toBe(1);
    expect(j.match(/LIMITE DO FABRICANTE NÃO INFORMADO/g)?.length).toBe(1);
    expect(j).toContain("Lateral 1 · Lateral 2"); // mas nomeia todas as paredes cobertas
    expect(j).toContain("6 telas · mesma cadeia");
  });

  it("a tabela da cadeia repete o cabeçalho se quebrar de página", () => {
    const j = JSON.stringify(build("Estrutural").content);
    expect(j).toContain('"headerRows":1');
    expect(j).toContain("A CADEIA — O QUE TRAVA PRIMEIRO");
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

  it("F3: Vídeo abre com o esquema das telas na disposição da Composição + legenda do canvas", () => {
    const j = JSON.stringify(build("Completo").content);
    expect(j).toContain("disposição da Composição");
    expect(j).toContain("Canvas de conteúdo");
    // sem comp.pos salvo o fallback é a fila: 10×104 + 4×104 = 1.456 px × altura 6×104
    expect(j).toContain("1.456 × 624 px");
  });

  it("numeração de seção segue a ordem exibida (Completo começa em 01)", () => {
    const j = JSON.stringify(build("Completo").content);
    expect(j).toContain('"01"');
    expect(j).toContain('"05"'); // 5 seções numeradas no Completo sem Screens... VG, vídeo, elétrica, sinal, AC, glossário = 6
    expect(j).toContain('"06"');
  });
});
