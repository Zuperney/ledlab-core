import { describe, it, expect } from "vitest";
import { buildRelatorioDoc } from "./pdfRelatorio.js";
import { CRITERIOS, REFERENCIAS } from "../reportContent.js";
import { paraJSON } from "../estrutura/serializar.js";
import { porticoDeExemplo } from "../estrutura/exemplos.js";

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

  it("Vídeo/Resolução: resolução por tela, aspecto, fração decimal, pitch e distâncias", () => {
    expect(json).toContain("VÍDEO / RESOLUÇÃO");
    expect(json).toContain("1.040 × 624"); // 10×104 por 6×104, pt-BR
    expect(json).toContain("FRAÇÃO");
    expect(json).toContain("1,667"); // 1040/624 com vírgula, 3 casas
    expect(json).toContain("PITCH");
    expect(json).toContain("5,77 mm"); // 600 mm / 104 px
    // as réguas de distância saem numa tabela AGRUPADA por pitch × altura
    // (listar por tela repetia os mesmos números — feedback do dono, 02/08)
    expect(json).toContain("DISTÂNCIA DE VISÃO");
    expect(json).toContain('"Main, Side"'); // mesma altura (6 linhas) → uma linha só
    expect(json).toContain("19,8 m"); // retina: 5,769 × 3,438
  });

  it("Visão Geral tem a coluna de pixels da tela", () => {
    expect(json).toContain("RESOLUÇÃO (PX)");
  });

  it("Elétrica: sem sugestão de disjuntor; gerador mínimo pelo pico + fórmula do típico", () => {
    expect(json).toContain("INFORMAÇÕES ELÉTRICAS");
    // app não sugere disjuntor (auditoria 30/07/2026) — o guard é a CÉLULA de
    // cabeçalho exata; a palavra solta é permitida (Critérios de Cálculo cita
    // que o disjuntor é do eletricista)
    expect(json).not.toContain('"DISJUNTOR"');
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
    // vocabulário §12.1: a unidade numerada do AC é CIRCUITO (cabo = o físico)
    expect(json).toContain("MÁX POR CIRCUITO");
    expect(json).not.toContain("MÁX POR CABO");
    expect(json).toContain("A/gabinete");
  });

  it("tabela de cabos com Fase NUNCA passa de 4 grupos (largura > contagem de linhas)", () => {
    // Screen 220_tri com 64 cabos AC: a regra de contagem pediria 6 grupos, mas
    // 6 grupos × 4 colunas (~160 pt cada) estouram os 762 pt úteis — o caderno
    // real imprimiu o grupo dos cabos 55-64 FORA da folha (31/07). Teto: 4.
    const gabAc = { ...gab, resX: 192, resY: 192, pwrMax: 470, conector: "true1" }; // ampCab 470/(220×0,9)=2,37 → 5 gab/cabo (margem 1 nos testes)
    const telona = { id: "tg", nome: "Telona", cols: 20, rows: 16, gabinete: gabAc }; // 320 gab → 64 cabos
    const proj = { ...project, telas: [telona], screens: [{ id: "s1", nome: "S1", telaIds: ["tg"], pos: { tg: { x: 0, y: 0 } }, sinal: { rule: "px", strategy: "auto" } }] };
    const d = buildRelatorioDoc({ project: proj, tipo: "Completo", cfg, logo: null, gerado: "31/07/2026" });
    const grupos = [];
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (Array.isArray(n)) return n.forEach(walk);
      if (Array.isArray(n.columns) && n.columns.length > 1 && n.columns.every((c) => c?.table)) {
        const header = JSON.stringify(n.columns[0].table.body?.[0] || []);
        if (header.includes("FASE")) grupos.push(n.columns.length);
      }
      Object.values(n).forEach(walk);
    };
    walk(d.content);
    expect(grupos.length).toBeGreaterThan(0); // a tabela existe (fixture válida)
    for (const g of grupos) expect(g).toBeLessThanOrEqual(4);
  });

  it("coluna de cabos passa de 15 linhas → tabela abre na PÁGINA SEGUINTE (mapa fica sozinho, grande)", () => {
    // regra do dono (02/08): 70 cabos com Fase → 4 grupos → 18 linhas > 15 —
    // antes, 2-3 linhas órfãs vazavam pra outra folha (caderno real, folha 14).
    // (20×20 = 400 gab → 70 cabos AC atrelados ao sinal; a grade 20×16 do teste
    // dos grupos dá 60 → 15 linhas EXATAS, no fio da regra — e não quebra.)
    const gabAc = { ...gab, resX: 192, resY: 192, pwrMax: 470, conector: "true1" };
    const telona = { id: "tg", nome: "Telona", cols: 20, rows: 20, gabinete: gabAc };
    const proj = { ...project, telas: [telona], screens: [{ id: "s1", nome: "S1", telaIds: ["tg"], pos: { tg: { x: 0, y: 0 } }, sinal: { rule: "px", strategy: "auto" } }] };
    const j = JSON.stringify(buildRelatorioDoc({ project: proj, tipo: "Completo", cfg, logo: null }).content);
    expect(j).toContain('"pageBreak":"before"');
    // o caderno pequeno (2 telas, tabelas baixas) NUNCA ganha essa quebra
    expect(json).not.toContain('"pageBreak":"before"');
  });

  it("Critérios de Cálculo: regras, normas e referências antes do Glossário (só no Completo)", () => {
    expect(json).toContain("CRITÉRIOS DE CÁLCULO");
    expect(json).toContain("NORMAS E PRÁTICAS ADOTADAS");
    expect(json).toContain("ABNT NBR 5410");
    expect(json).toContain("REFERÊNCIAS");
    expect(json).toContain("The truth about the power consumption of LED walls");
    // grupo de vídeo (as quatro réguas) + fontes da pesquisa de distância
    expect(json).toContain("Vídeo e distância de visão");
    expect(json).toContain("Understanding Viewing Distance");
    // a folha vem ANTES do glossário
    expect(json.indexOf("CRITÉRIOS DE CÁLCULO")).toBeLessThan(json.indexOf("GLOSSÁRIO"));
    expect(JSON.stringify(build("Resumido").content)).not.toContain("CRITÉRIOS DE CÁLCULO");
  });

  it("seção Cabos: a listagem sai das folhas de mapa e se junta no fim (dono, 13/08)", () => {
    // a régua abre a seção — é ela que explica os % das tabelas logo abaixo
    expect(json).toContain("SINAL — CAPACIDADE POR PORTA");
    expect(json).toContain("ENERGIA — CAPACIDADE POR CIRCUITO");
    expect(json).toContain("MÁX GAB./PORTA");
    expect(json).toContain("CABO / CONECTOR");
    expect(json).toContain("PORTA MAIS CHEIA");
    expect(json).toContain("FOLGA DE ENERGIA");
    // e a listagem cabo a cabo, que era das páginas de mapa
    expect(json).toContain("PORTAS DE SINAL, CABO A CABO");
    expect(json).toContain("CIRCUITOS DE ENERGIA, CABO A CABO");
    // fecha o caderno: depois dos mapas, antes dos critérios
    expect(json.indexOf("PORTAS DE SINAL, CABO A CABO")).toBeGreaterThan(json.indexOf("CABEAMENTO DE SINAL"));
    expect(json.indexOf("PORTAS DE SINAL, CABO A CABO")).toBeLessThan(json.indexOf("CRITÉRIOS DE CÁLCULO"));
    // segue o gate das seções de cabo: o Resumido não tem mapa, não tem lista
    expect(JSON.stringify(build("Resumido").content)).not.toContain("CABO A CABO");
  });

  it("folha de mapa fica SÓ com o mapa — a tabela de cabos não divide mais a página", () => {
    // a tabela de porta/circuito aparece UMA vez no caderno (na seção Cabos),
    // não mais grudada em cada folha de mapa. Antes de 13/08 ela saía nas duas.
    const jm = JSON.stringify(build("Mapa de cabos").content);
    const iMapaSinal = jm.indexOf("CABEAMENTO DE SINAL");
    const iLista = jm.indexOf("PORTAS DE SINAL, CABO A CABO");
    expect(iMapaSinal).toBeGreaterThanOrEqual(0);
    expect(iLista).toBeGreaterThan(iMapaSinal);
    // entre a abertura do mapa de sinal e a listagem não há cabeçalho "USO"
    // (coluna exclusiva da tabela de portas) — prova que a folha ficou limpa
    expect(jm.slice(iMapaSinal, iLista)).not.toContain('"USO"');
  });

  it("o doc do PDF não compartilha arrays com o conteúdo do DOM (pdfmake MUTA o ul)", () => {
    // Regressão de 31/07: passar CRITERIOS[i].itens/REFERENCIAS direto no `ul`
    // fazia o pdfmake trocar as strings por nós (positions/_inlines) — e o
    // Caderno DOM quebrava no <li> depois de gerar um PDF.
    const compartilhados = new Set([REFERENCIAS, ...CRITERIOS.map((g) => g.itens)]);
    const walk = (n) => {
      if (!n || typeof n !== "object") return;
      if (Array.isArray(n)) { expect(compartilhados.has(n)).toBe(false); return n.forEach(walk); }
      Object.values(n).forEach(walk);
    };
    walk(build("Completo").content);
  });

  it("Glossário em duas colunas fecha o caderno Completo (sem os termos removidos)", () => {
    expect(json).toContain("GLOSSÁRIO");
    expect(json).toContain("Pico × Típico");
    expect(json).toContain("Fases R/S/T");
    // termos que só existiam como verbete (ou na seção de estrutura, que saiu
    // com o rigging em 02/08) sumiram do doc inteiro
    expect(json).not.toContain("Serpentina");
    expect(json).not.toContain("Bumper");
    expect(json).not.toContain("Talha");
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

  it("Screen com VÃO: specBox conta os gabinetes REAIS e não imprime grade", () => {
    // duas telas 4×3 de 128 px afastadas: bbox 1.536 px = 12 col × 3 lin = 36
    // gabinetes que não existem. A Screen tem 24 — e sem retângulo cheio a
    // linha "Grade da Screen" some (a bbox não descreve a montagem).
    const g128 = { ...gab, resX: 128, resY: 128 };
    const mk = (id, nome) => ({ id, nome, cols: 4, rows: 3, gabinete: g128 });
    const scr = (posB) => ({ id: "s1", nome: "Screen 1", telaIds: ["tA", "tB"], pos: { tA: { x: 0, y: 0 }, tB: { x: posB, y: 0 } }, sinal: { rule: "px", strategy: "auto" } });
    const doc = (posB) => JSON.stringify(buildRelatorioDoc({ project: { ...project, telas: [mk("tA", "Tela A"), mk("tB", "Tela B")], screens: [scr(posB)] }, tipo: "Mapa de cabos", cfg, logo: null }).content);

    const comVao = doc(1024);
    expect(comVao).toContain('"GABINETES"');
    expect(comVao).toContain('"text":"24"');
    expect(comVao).not.toContain('"GRADE DA SCREEN"');
    expect(comVao).not.toContain('"12 × 3"'); // a grade fantasma da bbox

    // encostadas (8 × 3 = 24): a grade volta, porque agora descreve a Screen
    const encostadas = doc(512);
    expect(encostadas).toContain('"GRADE DA SCREEN"');
    expect(encostadas).toContain('"text":"8 × 3"');
  });

  it("porta atravessando VÃO: o caderno declara se o vazio entrou na cota", () => {
    // duas telas 128×256 (1×3) afastadas, um cabo desenhado cobrindo as duas
    const gab128 = { ...gab, resX: 128, resY: 256 };
    const telas = [{ id: "a", nome: "Tira A", cols: 1, rows: 3, gabinete: gab128 }, { id: "b", nome: "Tira B", cols: 1, rows: 3, gabinete: gab128 }];
    const cabo = [...[0, 1, 2].map((r) => ({ telaId: "a", c: 0, r })), ...[0, 1, 2].map((r) => ({ telaId: "b", c: 0, r }))];
    const scr = (vaoConta) => ({ id: "s1", nome: "Palco", telaIds: ["a", "b"], pos: { a: { x: 0, y: 0 }, b: { x: 1152, y: 0 } },
      sinal: { rule: "area", strategy: "livre", vaoConta, cables: [cabo] } });
    const doc = (vaoConta) => JSON.stringify(buildRelatorioDoc({ project: { ...project, telas, screens: [scr(vaoConta)] }, tipo: "Mapa de cabos", cfg, logo: null }).content);

    const padrao = doc(undefined);
    expect(padrao).toContain('"VÃO NO RETÂNGULO"');
    expect(padrao).toContain('"text":"não conta"');
    expect(doc(true)).toContain('"text":"conta"');
  });

  it("sem porta cruzando vão, a premissa não polui o specBox", () => {
    const j = JSON.stringify(buildRelatorioDoc({
      project: { ...project, screens: [{ id: "s1", nome: "Screen 1", telaIds: ["t1"], pos: { t1: { x: 0, y: 0 } }, sinal: { rule: "area", strategy: "area" } }] },
      tipo: "Mapa de cabos", cfg, logo: null,
    }).content);
    expect(j).not.toContain('"VÃO NO RETÂNGULO"');
  });

  it("Design com Test Cards: folha de referência de imagem, com as imagens no dicionário", () => {
    // as imagens vêm DESENHADAS de fora (canvas é do browser; o builder é puro) —
    // e entram por NOME no dicionário `images`, nunca dataURL inline no nó
    const testCards = [
      { telaId: "t1", nome: "Main", cols: 10, rows: 6, url: "data:image/png;base64,AAA", pxW: 1040, pxH: 624 },
      { telaId: "t2", nome: "Side", cols: 4, rows: 6, url: "data:image/png;base64,BBB", pxW: 416, pxH: 624 },
    ];
    const doc = buildRelatorioDoc({ project, tipo: "Design", cfg, logo: null, testCards });
    const j = JSON.stringify(doc.content);
    expect(j).toContain("TEST CARD");
    expect(j).toContain("REFERÊNCIA DE IMAGEM");
    expect(j).toContain('"image":"tc_t1"');
    expect(j).toContain('"image":"tc_t2"');
    expect(j).not.toContain("data:image/png;base64,AAA"); // nada de dataURL no nó
    expect(doc.images.tc_t1).toBe("data:image/png;base64,AAA");
    expect(doc.images.tc_t2).toBe("data:image/png;base64,BBB");
    // um card por PÁGINA: o largo (10×6 gab = 1.040 × 624, proporção 1,7) fica com
    // a ficha ao LADO. O 1º divide a folha com o cabeçalho da seção (340), os
    // demais usam o orçamento inteiro (408)
    expect(j).toContain('"fit":[566,340]');
    expect(j).toContain('"fit":[566,408]');
    expect(j).toContain('"04.1"'); // cada card abre em bloco numerado próprio
    expect(j).toContain('"04.2"'); // (03 é a folha de Conteúdo, que vem antes)
    // quebra CONDICIONAL, e o 1º card não marca — senão sobra folha só com título
    expect(j).not.toContain('"pageBreak":"before"');
    expect(j).not.toContain('"unbreakable"');
  });

  it("card FITA toma a folha inteira e a ficha desce pra baixo dele", () => {
    // testeira real do Boticário: 76 × 1 gabinetes de 168 px = 12.768 × 168 (76:1)
    const fita = [{ telaId: "t3", nome: "Testeira Topo", cols: 76, rows: 1, gabinete: "Unilumin P2.9 Venti", url: "data:image/png;base64,CCC", pxW: 12768, pxH: 168 }];
    const j = JSON.stringify(buildRelatorioDoc({ project, tipo: "Design", cfg, logo: null, testCards: fita }).content);
    expect(j).toContain('"fit":[748,320]'); // largura inteira; card único = 1º bloco (340 − 20 da ficha)
    expect(j).not.toContain('"fit":[566,340]'); // não sobrou coluna pra ficha do lado
    expect(j).toContain("Testeira Topo");
    expect(j).toContain("12.768 × 168 px");
  });

  it("Design ganha a folha de Conteúdo: esquema dos painéis + as duas fichas", () => {
    const j = JSON.stringify(buildRelatorioDoc({ project, tipo: "Design", cfg, logo: null }).content);
    expect(j).toContain("MANUAL DE VÍDEO");
    expect(j).toContain("PAINEL DE LED");
    expect(j).toContain("MANUAL DE CONTEÚDO");
    expect(j).toContain("6,00 × 3,60 m  +  2,40 × 3,60 m"); // tamanho tela a tela, como no rider
    expect(j).toContain("1040 × 624 px  +  416 × 624 px");
    expect(j).toContain("DXV3 Normal Quality"); // padrão da casa quando o projeto não define
    expect(j).toContain("<svg"); // o esquema dos painéis
    // e não polui os outros cadernos
    expect(JSON.stringify(buildRelatorioDoc({ project, tipo: "Completo", cfg, logo: null }).content)).not.toContain("MANUAL DE VÍDEO");
  });

  it("capa do Design troca PESO por RESOLUÇÃO (quem lê monta conteúdo, não rigging)", () => {
    // rótulo da CAPA é mono (a coluna PESO da tabela de Visão Geral não é, e fica)
    const naCapa = (rot) => `"text":"${rot}","font":"PlexMono"`;
    const design = JSON.stringify(buildRelatorioDoc({ project, tipo: "Design", cfg, logo: null }).content);
    expect(design).toContain(naCapa("RESOLUÇÃO"));
    expect(design).toContain('"text":"1.456 × 624 px"');
    expect(design).not.toContain(naCapa("PESO"));
    const completo = JSON.stringify(buildRelatorioDoc({ project, tipo: "Completo", cfg, logo: null }).content);
    expect(completo).toContain(naCapa("PESO")); // rigging continua vendo peso
    expect(completo).not.toContain(naCapa("RESOLUÇÃO"));
  });

  it("Design troca as distâncias de visão pelo tamanho do canvas", () => {
    const design = JSON.stringify(buildRelatorioDoc({ project, tipo: "Design", cfg, logo: null }).content);
    expect(design).not.toContain("DISTÂNCIA DE VISÃO");
    expect(design).toContain("CANVAS DE CONTEÚDO");
    expect(design).toContain("1.456 × 624 px"); // as 2 telas lado a lado
    expect(design).toContain("ÁREA DE LED");

    // os outros cadernos seguem com as distâncias e sem o quadro
    const completo = JSON.stringify(buildRelatorioDoc({ project, tipo: "Completo", cfg, logo: null }).content);
    expect(completo).toContain("DISTÂNCIA DE VISÃO");
    expect(completo).not.toContain("CANVAS DE CONTEÚDO");
  });

  it("sem cards desenhados — ou fora do Design — não nasce folha de Test Card", () => {
    const semCards = JSON.stringify(buildRelatorioDoc({ project, tipo: "Design", cfg, logo: null }).content);
    expect(semCards).not.toContain("REFERÊNCIA DE IMAGEM");
    // o mesmo insumo num caderno Completo não vira folha (a folha é do Design)
    const cards = [{ telaId: "t1", nome: "Main", cols: 10, rows: 6, url: "data:x", pxW: 1040, pxH: 624 }];
    const completo = JSON.stringify(buildRelatorioDoc({ project, tipo: "Completo", cfg, logo: null, testCards: cards }).content);
    expect(completo).not.toContain("REFERÊNCIA DE IMAGEM");
  });

  it("um tópico por página + uma página por Screen/tela — quebra CONDICIONAL (headlineLevel)", () => {
    // A quebra é decidida pelo pageBreakBefore do docDefinition (só quebra se a
    // página atual tem conteúdo — mata a página em branco); os nós de início de
    // seção/bloco carregam headlineLevel 1. Completo sem Screens: 8 seções (com
    // sumário, todas marcam) + 4 blocos (2 telas × sinal e AC) → 12 marcas.
    const doc = build("Completo");
    const completo = JSON.stringify(doc.content);
    expect(completo.match(/"headlineLevel":1/g)?.length).toBe(12); // 8 seções + 4 blocos (capacidade entrou, 13/08)
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
    // 8 seções marcadas (marcador invisível com a linha "NN · TÍTULO")
    expect(completo.match(/"tocItem":true/g)?.length).toBe(8);
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

  // (a suíte da seção "Peso e estrutura" saiu com o motor de rigging —
  // decisão do dono, 02/08/2026; reservado pro futuro 3D)

  it("bloco de tela/Screen NÃO usa unbreakable — o pdfmake descarta bloco maior que a página", () => {
    // regressão do caderno real: unbreakable no fio da página gerou páginas em
    // branco e a Screen 2 sumiu; o bloco abre em página própria e pode fluir
    expect(JSON.stringify(build("Completo").content)).not.toContain('"unbreakable"');
  });

  it("F3: sinal e AC levam o mapa de cabos VISUAL (nó svg por tela)", () => {
    const j = JSON.stringify(build("Completo").content);
    // esquema das telas em fila + 2 telas × (sinal + AC) = 5 svgs
    expect((j.match(/"svg":"<svg/g) || []).length).toBe(5);
    expect(j).toContain("#0d0d1a"); // só o ESQUEMA DE TELAS segue escuro (identidade v1.5.3)
    // mapas de cabo no estilo SmartLCT (dono, 02/08): serpentina azul + entrada verde
    expect(j).toContain("#1e40af");
    expect(j).toContain("#16a34a");
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
    // VG, vídeo, elétrica, sinal, AC, capacidade, critérios, glossário = 8
    expect(j).toContain('"08"');
    expect(j).not.toContain('"09"');
  });
});

describe("folha ESTRUTURA (box truss)", () => {
  const comEstrutura = { ...project, estrutura: paraJSON(porticoDeExemplo()) };
  const doc = buildRelatorioDoc({ project: comEstrutura, tipo: "Completo", cfg, logo: null, gerado: "19/08/2026" });
  const json = JSON.stringify(doc.content);

  it("imprime as três respostas: peças, peso e medida", () => {
    expect(json).toContain("ESTRUTURA");
    expect(json).toContain("BOX TRUSS · MONTAGEM");
    expect(json).toContain("166 kg");
    expect(json).toContain("4,36 m");
    expect(json).toContain("Barra P30 2 m");
  });

  // 8 juntas × 4 parafusos: o pórtico FECHA nas duas pontas da viga, e a
  // segunda leva jogo igual. Contar só os encaixes da árvore mandaria a equipe
  // pro galpão com um jogo a menos (ver montagem.juntas).
  it("conta a parafusaria da caixa, com a junta de fechamento", () => {
    expect(json).toContain("32× ");
    expect(json).toContain("64× ");
    expect(json).toMatch(/A325/);
  });

  // a fronteira do produto vai IMPRESSA, não é rodapé jurídico
  it("carrega o aviso de responsabilidade técnica", () => {
    expect(json).toMatch(/não dimensiona a estrutura/);
    expect(json).toMatch(/rigger habilitado/);
    expect(json).toMatch(/ART no CREA/);
  });

  it("declara que o peso ainda não foi conferido", () => {
    expect(json).toMatch(/Peso estimado/);
    expect(json).toMatch(/Auratec/);
  });

  // projeto sem estrutura não pode ganhar uma folha dizendo "0 peças"
  it("some do caderno quando não há estrutura", () => {
    const semEstrutura = JSON.stringify(buildRelatorioDoc({ project, tipo: "Completo", cfg, logo: null, gerado: "19/08/2026" }).content);
    expect(semEstrutura).not.toContain("BOX TRUSS");
  });

  it("a imagem entra quando é passada, e a folha vive sem ela", () => {
    const semImg = JSON.stringify(buildRelatorioDoc({ project: comEstrutura, tipo: "Completo", cfg, logo: null, gerado: "19/08/2026" }).content);
    expect(semImg).not.toContain("data:image/png");
    const comImg = JSON.stringify(buildRelatorioDoc({ project: comEstrutura, tipo: "Completo", cfg, logo: null, gerado: "19/08/2026", estruturaImg: "data:image/png;base64,AAA" }).content);
    expect(comImg).toContain("data:image/png;base64,AAA");
  });
});

describe("folha ESTRUTURA — os painéis pendurados (E4)", () => {
  const montagem = paraJSON(porticoDeExemplo());
  const viga = montagem.pecas.find((p) => p.catalogoId === "p30-b4000");
  const comPainel = (cols) => ({
    ...project,
    telas: [{ id: "t1", nome: "Frontal", cols, rows: 2, gabinete: { dimW: "500", dimH: "500", peso: "8" } }],
    estrutura: { ...montagem, paineis: [{ id: "pn1", telaId: "t1", de: viga.id, face: "BAIXO", olha: "N" }] },
  });
  const doc = (cols) => JSON.stringify(
    buildRelatorioDoc({ project: comPainel(cols), tipo: "Completo", cfg, logo: null, gerado: "20/08/2026" }).content,
  );

  // é o número que o rigger pede antes de içar, e hoje sai de planilha
  it("separa o peso da treliça do peso dos painéis e fecha o total suspenso", () => {
    const json = doc(6);
    expect(json).toContain("PESO DA TRELIÇA"); // o specBox sobe o rótulo
    expect(json).toContain("166 kg");
    expect(json).toContain("96 kg"); // 12 gabinetes × 8 kg
    expect(json).toContain("TOTAL SUSPENSO");
    expect(json).toContain("262 kg");
  });

  it("lista cada painel — é o que torna o total conferível", () => {
    const json = doc(6);
    expect(json).toContain("Painéis pendurados");
    expect(json).toContain("Frontal");
    expect(json).toContain("3,00 m × 1,00 m");
    expect(json).toContain("Barra P30 4 m");
  });

  it("o que não cabe vai IMPRESSO, e declarado como medida", () => {
    const json = doc(12); // 6 m de parede no vão de 4 m
    expect(json).toMatch(/não cabe no vão/);
    expect(json).toMatch(/É medida, não carga/);
  });

  it("sem painel, a folha não inventa seção nenhuma", () => {
    const json = JSON.stringify(
      buildRelatorioDoc({
        project: { ...project, estrutura: montagem },
        tipo: "Completo", cfg, logo: null, gerado: "20/08/2026",
      }).content,
    );
    expect(json).not.toContain("Painéis pendurados");
    expect(json).not.toContain("TOTAL SUSPENSO");
  });
});
