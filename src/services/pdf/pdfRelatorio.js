// services/pdf/pdfRelatorio.js — monta a docDefinition do Caderno Técnico pro
// motor pdfmake. F2: paridade de CONTEÚDO com o Caderno do DOM — capa Folha
// Técnica, Visão Geral (+ gabinetes utilizados), Vídeo/Resolução, Elétrica,
// Sinal (por Screen ou legado por tela), AC (aviso de energização + tabelas),
// mapa de pixels (tipo "Mapa de cabos") e Glossário, respeitando o TIPO do
// caderno. Os desenhos de mapa de cabos (grade visual) ficam pra F3.
//
// PURO de propósito: (dados do projeto) → objeto docDefinition — testável sem
// pdfmake. O motor pesado (pdfmake + fontes) mora no pdfEngine.js, carregado
// preguiçoso só na hora de exportar. Leis do papel: manual §10 (oliva, zebra,
// mono nos dados, aviso laranja).
import { PRINT, PALETTE } from "../../ui/tokens.js";
import { aggregateElectrical, projectRollup, screenRollup } from "../projectCalc.js";
import { cableMeta, cablePorts, bboxArea, portOffset } from "../cabling.js";
import { hasScreens, projectScreenReport, telasSemScreen, projectAcCabos } from "../screenCabling.js";
import { pixelMapPorts } from "../pixelMap.js";
import { screenMapSvg, telaMapSvg, telasLayoutSvg, videoSchemaSvg } from "./pdfCableMap.js";
import { tint } from "../cableScene.js";
import { formatRange } from "../dates.js";
import { GLOSSARIO, CRITERIOS, NORMAS, REFERENCIAS, AVISO_AC, DISC, STATUS_LABEL, FICHA_ABAIXO, fmtPeso, fmtFases, portLabel, videoOf, distVisaoGroups, canvasResumo, fichaPainel, fichaConteudo } from "../reportContent.js";
import { acTone, voltFull, phaseOf, phaseBalance } from "../electricalCalc.js";
import { avisoEstruturaPdf, dadosDaFolha, plural, procedenciaDoPeso } from "../estrutura/folha.js";

// cores da CAPA (Folha Técnica — a única área lime do papel; manual §2.4)
const LIME = "#ebf51e";
const COVER_BG = "#fafaf7";
const COVER_INK = "#14140e";
const HAIR = "#dad9d0";
const ZEBRA = "#f8f8f8";

const mono = (text, extra = {}) => ({ text, font: "PlexMono", ...extra });
const ptBR = (n) => (n || 0).toLocaleString("pt-BR");

// ── layout de tabela com ZEBRA (manual §10.3) ──
// `start` = índice global da 1ª linha do grupo: tabelas divididas em colunas
// lado a lado mantêm a alternância contínua (como o DenseTable do DOM)
const zebraLayout = (start = 0, pad = 2.5) => ({
  hLineWidth: (i) => (i === 1 ? 1.2 : 0.4),
  hLineColor: (i) => (i === 1 ? PRINT.ink : PRINT.line),
  vLineWidth: () => 0,
  fillColor: (row) => (row > 0 && (start + row - 1) % 2 === 1 ? ZEBRA : null),
  paddingTop: () => pad,
  paddingBottom: () => pad,
  paddingLeft: () => 6,
  paddingRight: () => 6,
});

// pdfmake não tem text-transform: o caps do cabeçalho entra aqui (paridade com o DOM)
const th = (text, align = "left") => ({ text: text.toUpperCase(), bold: true, fontSize: 7, color: PRINT.dim, characterSpacing: 0.6, alignment: align, margin: [0, 2, 0, 2] });

// cabeçalho de seção: badge numerado colorido + título + tag (como no Caderno DOM);
// o stack carrega junto o marcador invisível que registra a seção no SUMÁRIO
function sectionHead(n, titulo, tag, cor) {
  return {
    margin: [0, 14, 0, 8],
    stack: [tocMarker(n, titulo, cor), { columns: [
      {
        width: "auto",
        table: { body: [[{ text: String(n).padStart(2, "0"), bold: true, color: "#ffffff", fontSize: 10, font: "PlexMono", margin: [4, 2, 4, 2] }]] },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => cor, paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 0, paddingBottom: () => 0 },
      },
      { width: "auto", text: titulo.toUpperCase(), bold: true, fontSize: 12, color: PRINT.ink, margin: [8, 2, 0, 0], characterSpacing: 0.3 },
      { width: "*", text: tag.toUpperCase(), fontSize: 7, color: PRINT.dim, alignment: "right", characterSpacing: 0.8, margin: [0, 6, 0, 0] },
    ] }],
  };
}

// registra a seção no SUMÁRIO sem mexer no visual do cabeçalho: um marcador de
// texto INVISÍVEL (0.1pt) carrega a linha "01 · TÍTULO" na cor da disciplina.
// Inofensivo quando o caderno não tem nó toc (tipos que não são o Completo).
function tocMarker(n, titulo, cor) {
  return {
    text: `${String(n).padStart(2, "0")}  ·  ${titulo.toUpperCase()}`, fontSize: 0.1, opacity: 0, margin: [0, 0, 0, 0],
    tocItem: true, tocStyle: { bold: true, color: cor, fontSize: 9.5, characterSpacing: 0.4 }, tocMargin: [0, 0, 0, 7],
  };
}

// sub-cabeçalho de subdivisão ("04.1 · Screen 1") com meta à direita
function subHead(num, title, right) {
  return {
    margin: [0, 6, 0, 4],
    columns: [
      { width: "*", text: [{ text: num, bold: true, color: PRINT.acc, fontSize: 9.5 }, { text: `  ${title}`, bold: true, fontSize: 11, color: PRINT.ink }] },
      ...(right ? [{ width: "auto", text: right, fontSize: 7.5, color: PRINT.dim, alignment: "right", margin: [0, 3, 0, 0] }] : []),
    ],
  };
}

// box de especificações (fundo neutro) — pares rótulo/valor numa linha corrida.
// Compacto de propósito (fonte/gaps menores desde 31/07): o box compete pelo
// orçamento vertical da página da Screen com o mapa e a tabela densa.
function specBox(pairs) {
  return {
    margin: [0, 2, 0, 8],
    table: {
      widths: ["*"],
      body: [[{
        columns: pairs.map(([l, v]) => ({
          width: "auto",
          stack: [
            { text: l.toUpperCase(), fontSize: 7, color: PRINT.dim, characterSpacing: 0.7 },
            { text: v, bold: true, fontSize: 10.5, color: PRINT.ink, margin: [0, 2, 0, 0] },
          ],
        })),
        columnGap: 12,
        margin: [9, 4, 9, 5],
      }]],
    },
    layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => PRINT.line, vLineColor: () => PRINT.line, fillColor: () => PRINT.head },
  };
}

// linha de STATS da página de abertura de seção (rótulo caps + número grande)
// terceiro item opcional = cor do VALOR: só pra número que carrega veredito
// (carga apertada em laranja, estouro em vermelho). Sem ele, tinta normal —
// a régua da casa é colorir quando há o que avisar, não o tempo todo.
// `fs` menor pra faixa com muitos números longos (o canvas do Design tem 5): em
// 19 pt, cinco valores de duas dezenas de caracteres passam dos 762 pt úteis e a
// última coluna cai fora da folha
const statRow = (items, fs = 19) => ({
  columns: items.map(([l, v, cor]) => ({
    width: "auto",
    stack: [
      { text: String(l).toUpperCase(), fontSize: 7.5, color: PRINT.dim, characterSpacing: 0.8 },
      { text: String(v), bold: true, fontSize: fs, color: cor || PRINT.ink, margin: [0, 2, 0, 0] },
    ],
  })),
  columnGap: fs > 16 ? 34 : 26,
  margin: [0, 4, 0, 14],
});

// box de AVISO de segurança (manual: aviso é LARANJA) — borda forte + título caps.
// tone "red" = ESTOURO (limite passado), reservado pro que impede a montagem.
function warnBox({ titulo, partes }, tone = "amber") {
  const c = tone === "red" ? { bd: PRINT.red, bg: "#fef2f2" } : { bd: PRINT.amb, bg: "#fffbeb" };
  return {
    margin: [0, 0, 0, 8],
    table: {
      widths: ["*"],
      body: [[{
        stack: [
          { text: titulo.toUpperCase(), bold: true, color: c.bd, fontSize: 8.5, characterSpacing: 0.5, margin: [0, 0, 0, 3] },
          { text: partes.map((p) => ({ text: p.t, bold: !!p.b })), fontSize: 9, color: PRINT.ink, lineHeight: 1.3 },
        ],
        margin: [10, 7, 10, 7],
      }]],
    },
    layout: { hLineWidth: () => 1.5, vLineWidth: () => 1.5, hLineColor: () => c.bd, vLineColor: () => c.bd, fillColor: () => c.bg },
  };
}

// bloco de Screen/tela (subtítulo + specs + mapa + tabela): abre SEMPRE em
// página própria. SEM unbreakable, de
// propósito — unbreakable que não cabe na página vira PÁGINA EM BRANCO e o
// pdfmake DESCARTA o conteúdo (aconteceu 2× com a Screen 2 do caderno real,
// com estimativa de altura sempre no fio). Em vez disso o bloco é COMPACTO o
// bastante pra caber numa página (tabela densa vira 5-6 colunas quando há muitos
// cabos, mapa com teto de altura); se um dia passar, ele FLUI pra página
// seguinte com o header da tabela repetindo — nunca some, nunca deixa buraco.
// A quebra é CONDICIONAL (headlineLevel + pageBreakBefore no docDefinition):
// só quebra se a página atual tem conteúdo — pageBreak:"before" incondicional
// gerava página em branco quando a seção anterior estourava só a margem
// (folha 08/22 vazia no caderno real, 31/07).
const bloco = (nodes) => ({ stack: nodes, headlineLevel: 1, margin: [0, 0, 0, 4] });

// nó de mapa pro conteúdo: o gerador devolve {svg,width,height} ou null (sem células)
const mapNode = (m) => (m ? [{ svg: m.svg, width: m.width, margin: [0, 0, 0, 6] }] : []);

// linha rotulada da capa (label mono caps + valor), com hairline entre linhas
const coverRow = (label, value, { bold = false, first = false } = {}) => ({
  margin: [0, 0, 0, 0],
  stack: [
    ...(first ? [] : [{ canvas: [{ type: "line", x1: 0, y1: 0, x2: 300, y2: 0, lineWidth: 0.6, lineColor: HAIR }], margin: [0, 5, 0, 5] }]),
    { text: label.toUpperCase(), font: "PlexMono", fontSize: 7, bold: true, characterSpacing: 1.1, color: "#8d8b7e" },
    { text: value || "—", fontSize: 13, bold, color: COVER_INK, margin: [0, 2, 0, 0] },
  ],
});

// `logo` = marca LedLab (capa e fallback do carimbo) · `logoProjeto` = logo
// cadastrado em Dados (bloco de marca do carimbo) · `assinatura` = "Projetou"
// do carimbo (Configurações › Conta — global de propósito: o nome não pode
// mudar de impressão pra impressão).
export function buildRelatorioDoc({ project, tipo = "Completo", cfg, logo, logoProjeto = null, assinatura = "", gerado, numbering = "row-tb-lr", palette, render, testCards = [], estruturaImg = null, coresEstrutura = null }) {
  const pal = Array.isArray(palette) && palette.length ? palette : PALETTE;
  const colorOf = (i) => pal[(((i | 0) % pal.length) + pal.length) % pal.length];
  // render do mapa (setas/números/tamanho/canto) — mesmas prefs do DOM
  const cr = { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl", ...(render || {}) };
  // célula "porta/cabo": quadradinho no PASTEL da região do mapa (miolo cruza
  // com o mapa, borda saturada distingue pasteis parecidos) + número
  const portCell = (idx, label) => ({
    columns: [
      { width: 9, canvas: [{ type: "rect", x: 0, y: 1.5, w: 7, h: 7, color: tint(colorOf(idx)), lineColor: colorOf(idx), lineWidth: 0.75 }] },
      { width: "auto", ...mono(String(label)) },
    ],
    columnGap: 2,
  });

  // tabela densa de portas: divide em grupos lado a lado (como o DenseTable do
  // DOM) — todas as linhas, na fração da altura; zebra contínua. Acima de 36
  // linhas entra a 5ª coluna, pro bloco de uma Screen grande caber numa página.
  // Nº de grupos lado a lado: a CONTAGEM DE LINHAS pede mais grupos (>24 → 5,
  // >60 → 6), mas a LARGURA manda por último — grupos são columns "auto" que o
  // pdfmake NÃO encolhe: um grupo do AC com Fase mede ~160 pt (chip + FASE +
  // GAB. + carga noWrap a fonte 8), então 4 colunas/grupo → máx 4 grupos em
  // 762 pt úteis (5 já estoura; caderno real 31/07: grupo dos cabos 55-64
  // inteiro pra fora da folha). Com 3 colunas (sinal, AC sem fase) o grupo é
  // ~100 pt → até 6. O excedente vertical FLUI com o header repetindo.
  const denseColsOf = (nRows, nColsTable) => {
    const desired = nRows > 60 ? 6 : nRows > 24 ? 5 : 4;
    const maxByWidth = nColsTable >= 4 ? 4 : 6;
    return Math.max(1, Math.min(desired, maxByWidth, nRows));
  };
  // regra do dono (02/08): a coluna de cabos não passa de 15 LINHAS na página
  // do mapa — acima disso a folha vira só o mapa (grande) e a tabela inteira
  // abre na página seguinte (antes, 2-3 linhas órfãs vazavam pra outra folha)
  const denseAlto = (nRows, nColsTable) => Math.ceil(nRows / denseColsOf(nRows, nColsTable)) > 15;
  // MAPA SOZINHO NA PÁGINA: ocupa a folha inteira (pedido do dono, 13/08).
  // Orçamento vertical da folha A4 paisagem: 595,3 − 36 (topo) − 94 (carimbo)
  // = 465 pt úteis. Acima do mapa moram subHead (~24) e specBox (~44), e o
  // próprio mapa tem margem de 6 embaixo → sobram ~391. O SVG ainda soma 12 de
  // padding interno (6 por lado), então maxHeight 360 renderiza 372 e fecha em
  // ~446: cabe com folga. Subir mais que isso é tentador e perigoso — se o
  // bloco não couber, o pdfmake joga o mapa pra folha seguinte e sobra uma
  // página só com o cabeçalho. Largura: 761,9 úteis − 12 de padding → 748.
  const MAPA_CHEIO = { maxWidth: 748, maxHeight: 360, upscale: true };

  function densePortTable(rows, columns) {
    const nCols = denseColsOf(rows.length, columns.length);
    const brk = denseAlto(rows.length, columns.length) ? { pageBreak: "before" } : {};
    const small = nCols >= 5 || columns.length >= 4;
    // grupos em largura de CONTEÚDO ("auto") — a coluna Gabinetes esticada
    // criava um vão entre o nº do cabo e a quantidade E empurrava o resto
    const fit = (node) => (small ? { ...node, fontSize: 8, lineHeight: 1 } : node);
    const build = (slice, start) => ({
      table: {
        headerRows: 1,
        widths: columns.map(() => "auto"),
        body: [columns.map((c) => th(c.label, c.align)), ...slice.map((r, i) => columns.map((c) => fit(c.cell(r, start + i))))],
      },
      layout: zebraLayout(start, small ? 1.8 : 2.5), // linhas mais baixas quando denso
      width: "auto",
    });
    if (nCols <= 1 || rows.length < 3) return { ...build(rows, 0), ...brk };
    const base = Math.floor(rows.length / nCols), rem = rows.length % nCols;
    const groups = []; let idx = 0;
    for (let i = 0; i < nCols; i++) { const size = base + (i < rem ? 1 : 0); groups.push(build(rows.slice(idx, idx + size), idx)); idx += size; }
    return { columns: groups, columnGap: small ? 8 : 12, ...brk };
  }

  const telas = project.telas || [];
  const roll = projectRollup(project);
  const agg = aggregateElectrical(project, cfg);
  const docNo = (project.name || "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 22) || "—";
  const dataEvento = formatRange(project.dataInicio, project.dataFim);
  // REVISÃO do documento (project.rev, campo manual da aba Dados): 0 na primeira
  // emissão; o técnico sobe quando reemite um caderno que já circulou com
  // mudanças — o app não adivinha revisão (mesma regra do "não estima")
  const rev = Math.max(0, Math.trunc(parseFloat(project.rev)) || 0);

  // mesmos filtros de seção por TIPO do Caderno DOM. Rigging saiu do app
  // (decisão do dono, 02/08/2026 — reservado pro futuro 3D); o peso físico
  // segue na capa e na Visão Geral.
  const showElec = ["Completo", "Resumido", "Elétrico"].includes(tipo);
  const showPhys = ["Completo", "Resumido", "Gabinetes", "Design"].includes(tipo);
  const showVideo = ["Completo", "Resumido", "Design"].includes(tipo);
  // folha de referência de imagem: só no Design, e só se o chamador desenhou os
  // cards (o builder é puro — quem tem canvas é o pdfEngine, no browser)
  const cards = tipo === "Design" ? testCards || [] : [];
  // o caderno de Design troca as distâncias de visão pelo tamanho do canvas
  const showCanvas = showVideo && tipo === "Design";
  const showSignal = ["Completo", "Mapa de cabos"].includes(tipo);
  const showAC = ["Completo", "Mapa de cabos"].includes(tipo);
  const showGloss = tipo === "Completo";

  const usaScreens = hasScreens(project);
  const screenReport = usaScreens && showSignal ? projectScreenReport(project, "sinal", numbering) : [];
  const screenReportAc = usaScreens && showAC ? projectScreenReport(project, "ac", numbering) : [];
  const semScreen = usaScreens ? telasSemScreen(project) : [];
  const screensById = Object.fromEntries((project.screens || []).map((s) => [s.id, s]));
  const gabsUsados = [...new Map(telas.filter((t) => t.gabinete?.nome).map((t) => [t.gabinete.nome, t.gabinete])).values()];
  const fpLabel = [...new Set(gabsUsados.map((g) => parseFloat(g.fp) || 0.85))].sort((a, b) => a - b).map((f) => f.toFixed(2).replace(".", ",")).join(" · ");
  // specs de configuração de uma Screen (o que o operador precisa na controladora)
  const screenSpec = (s) => {
    const scr = screensById[s.id];
    const g = (scr?.telaIds || []).map((id) => telas.find((t) => t.id === id)).filter(Boolean)[0]?.gabinete;
    const resX = parseFloat(g?.resX) || 128, resY = parseFloat(g?.resY) || 128;
    return { resX, resY, hz: parseFloat(scr?.sinal?.hz) || 60, overclock: scr?.sinal?.overclock === true,
      // régua de área com porta atravessando vão: a escolha muda o número, então
      // vira premissa declarada no papel (mesma lei do overclock)
      // cabo DESENHADO à mão atravessando o corte de processamento: no
      // automático isso não acontece, então é escolha de quem desenhou — e
      // escolha vai declarada no papel, não corrigida em silêncio
      cruzaCorte: s.ports.some((p) => p.cruzaParte),
      vao: (scr?.sinal?.rule === "px" ? false : s.ports.some((p) => p.cruzaVao)) && (scr?.sinal?.vaoConta === true ? "conta" : "não conta") };
  };
  let secN = 0; const sec = () => ++secN; // numera as seções exibidas, na ordem

  // ── CAPA (Folha Técnica) ──
  const fields = [
    ["Cliente", project.cliente],
    ["Local", project.local],
    ["Status", STATUS_LABEL[project.status] || project.status],
    ["Data de realização", dataEvento],
  ];
  // capa do DESIGN troca PESO por RESOLUÇÃO: quem recebe esse caderno monta
  // conteúdo, não rigging — o número que ele procura é o do canvas.
  const capaCanvas = canvasResumo(telas, project.comp?.pos);
  // Saiu do Resumido e do Gabinetes (decisão do dono, 19/08) e ganhou caderno
  // próprio: o "Estrutura" é capa + esta folha, e é o que vai pra equipe de
  // montagem — sem elétrica, sem vídeo, sem mapa de cabos. Fica calculado AQUI,
  // antes da capa, porque a capa desse caderno mostra os números dele.
  const estruturaDados = ["Completo", "Estrutura"].includes(tipo)
    ? dadosDaFolha(project, estruturaImg, { cores: coresEstrutura })
    : null;
  const stats = tipo === "Estrutura" ? [
    // capa de estrutura fala de estrutura: área e peso de painel são o projeto
    // de LED, e quem recebe este caderno vai montar truss
    ["Peças", String(estruturaDados?.resumo.pecas ?? 0)],
    ["Peso", estruturaDados?.pesoTexto ?? "—"],
    ...(estruturaDados?.medidas ? [["Medida", estruturaDados.medidas.texto]] : []),
  ] : [
    ["Área", `${roll.area_m2.toFixed(1)} m²`],
    ...(tipo === "Design"
      ? [["Resolução", `${ptBR(capaCanvas.w)} × ${ptBR(capaCanvas.h)} px`]]
      : [["Peso", fmtPeso(roll.peso_kg)]]),
    ...(showElec ? [
      ["Pico", `${Math.round(parseFloat(agg.kVA))} kVA`],
      ["Gerador", `~${Math.round(parseFloat(agg.gerador))} kVA`],
    ] : []),
  ];
  const capa = [
    {
      columns: [
        { width: "*", text: [{ text: ` CADERNO TÉCNICO · ${tipo.toUpperCase()} `, font: "PlexMono", bold: true, fontSize: 9, characterSpacing: 1.8, color: COVER_INK, background: LIME }], margin: [0, 6, 0, 0] },
        // capa é da MARCA (decisão do dono, 30/07): LedLab aqui; o logo do
        // projeto mora no carimbo das pranchas
        ...(logo ? [{ width: 54, image: "marcaLedlab", fit: [54, 54] }] : []),
      ],
    },
    // LLC-01: o título auto-encolhe pra caber numa linha — nome de 40+ caracteres
    // não empurra a capa nem vaza pra uma página em branco (~1320 ≈ largura útil
    // da paisagem ÷ avanço médio da Plex Sans bold, em pt por caractere)
    { text: project.name || "Sem nome", fontSize: Math.max(24, Math.min(58, Math.floor(1320 / Math.max((project.name || "Sem nome").length, 1)))), bold: true, characterSpacing: -1.2, color: COVER_INK, margin: [0, 26, 0, 0] },
    { canvas: [{ type: "rect", x: 0, y: 0, w: 170, h: 4, color: LIME }], margin: [0, 10, 0, 22] },
    {
      columns: [
        { width: "*", stack: fields.map(([l, v], i) => coverRow(l, v, { first: i === 0 })) },
        { width: 24, canvas: [{ type: "line", x1: 12, y1: 0, x2: 12, y2: 150, lineWidth: 0.6, lineColor: HAIR }] },
        { width: "*", stack: stats.map(([l, v], i) => coverRow(l, v, { bold: true, first: i === 0 })) },
      ],
    },
    {
      margin: [0, 40, 0, 0],
      stack: [
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 762, y2: 0, lineWidth: 0.6, lineColor: HAIR }], margin: [0, 0, 0, 6] },
        {
          columns: [
            { text: [{ text: "Nº " }, { text: docNo, bold: true, color: COVER_INK }, { text: " · Rev " }, { text: String(rev), bold: true, color: COVER_INK }, { text: gerado ? ` · Gerado em ${gerado}` : "" }], font: "PlexMono", fontSize: 7.5, color: "#6c6a5d" },
            { text: [{ text: "LEDLAB CORE", bold: true, color: COVER_INK }, { text: " · ENGENHARIA DE LED", color: "#9b998c" }], font: "PlexMono", fontSize: 7.5, alignment: "right", characterSpacing: 0.5 },
          ],
        },
      ],
      pageBreak: "after",
    },
  ];

  // ── VISÃO GERAL ──
  const visaoGeral = !showPhys ? [] : (() => {
    const rows = telas.map((t) => {
      const r = screenRollup(t);
      const v = videoOf(t);
      return [
        { text: t.nome, bold: true },
        mono(`${r.dim.largura_m.toFixed(1)}×${r.dim.altura_m.toFixed(1)} m`),
        mono(`${t.cols}×${t.rows}`),
        mono(v.pxW && v.pxH ? `${v.pxW.toLocaleString("pt-BR")} × ${v.pxH.toLocaleString("pt-BR")}` : "—"),
        { text: t.gabinete?.nome || "—" },
        mono(String(r.gab), { alignment: "right" }),
        mono(fmtPeso(r.peso_kg), { alignment: "right" }),
        showElec ? mono(`${(r.pwrMax_w / 1000).toFixed(1)} kW`, { alignment: "right", color: PRINT.red })
          : mono(`${(parseFloat(t.gabinete?.peso) || 0).toFixed(1)} kg`, { alignment: "right" }),
      ];
    });
    return [
      sectionHead(sec(), "Visão Geral", "Composição do painel", DISC.prod),
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto", "*", "auto", "auto", "auto"],
          body: [
            [th("Tela"), th("Dimensão"), th("Grade"), th("Resolução (px)"), th("Modelo"), th("Gabinetes", "right"), th("Peso", "right"), th(showElec ? "Pico" : "Peso por gabinete", "right")],
            ...rows,
            [
              { text: "Total", bold: true }, mono(`${roll.area_m2.toFixed(1)} m²`, { bold: true }), "", "", "",
              mono(String(roll.gab), { alignment: "right", bold: true }), mono(fmtPeso(roll.peso_kg), { alignment: "right", bold: true }),
              showElec ? mono(`${(roll.pwrMax_w / 1000).toFixed(1)} kW`, { alignment: "right", bold: true, color: PRINT.red }) : "",
            ],
          ],
        },
        layout: zebraLayout(),
      },
      ...(gabsUsados.length ? [
        { text: "GABINETES UTILIZADOS", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 10, 0, 4] },
        {
          columns: gabsUsados.map((g, i) => ({
            width: "auto",
            columns: [
              { width: 9, canvas: [{ type: "rect", x: 0, y: 1.5, w: 7, h: 7, color: colorOf(i) }] },
              { width: "auto", text: [{ text: g.nome, bold: true, fontSize: 9 }, { text: g.pitch ? `  ${parseFloat(g.pitch).toFixed(1)} mm` : g.resX && g.resY ? `  ${g.resX}×${g.resY}px` : "", fontSize: 8, color: PRINT.dim }] },
            ],
            columnGap: 3,
          })),
          columnGap: 16,
        },
      ] : []),
    ];
  })();

  // ── VÍDEO / RESOLUÇÃO ──
  const fila = showVideo ? telasLayoutSvg(telas, project.comp?.pos, colorOf) : null;
  // o SVG desenha a disposição (com o vão); a legenda conta só o LED
  const videoCanvas = canvasResumo(telas, project.comp?.pos);
  const video = !showVideo ? [] : [
    sectionHead(sec(), "Vídeo / Resolução", "Sinal e proporção", DISC.video),
    { text: "As telas na disposição da Composição (nome de cada uma no seu bloco). O canvas de conteúdo conta só o LED — o espaço entre as telas é referência de montagem, não é pixel.", fontSize: 8.5, color: PRINT.mut, margin: [0, 0, 0, 6] },
    ...(fila ? [
      { svg: fila.svg, width: fila.width, margin: [0, 0, 0, 4] },
      {
        text: [
          { text: "Canvas de conteúdo — " },
          { text: `${ptBR(videoCanvas.w)} × ${ptBR(videoCanvas.h)} px`, bold: true, color: PRINT.ink },
          ...(videoCanvas.temVao
            ? [{ text: ` · ${ptBR(videoCanvas.caixa.w)} × ${ptBR(videoCanvas.caixa.h)} px de disposição no desenho` }]
            : []),
        ],
        fontSize: 8, color: PRINT.dim, margin: [0, 0, 0, 8],
      },
    ] : []),
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto"],
        body: [
          [th("Tela"), th("Resolução (px)"), th("Proporção"), th("Fração"), th("Pitch"), th("Grade"), th("Pixel por gabinete", "right")],
          ...telas.map((t) => {
            const v = videoOf(t);
            return [
              { text: t.nome, bold: true },
              mono(`${ptBR(v.pxW)} × ${ptBR(v.pxH)}`, { bold: true }),
              mono(v.ar, { color: PRINT.acc, bold: true }),
              mono(String(v.dec).replace(".", ",")),
              mono(v.pitch ? `${v.pitch.toFixed(2).replace(".", ",")} mm` : "—"),
              mono(`${t.cols}×${t.rows}`),
              mono(t.gabinete?.resX && t.gabinete?.resY ? `${t.gabinete.resX}×${t.gabinete.resY}` : "—", { alignment: "right" }),
            ];
          }),
        ],
      },
      layout: zebraLayout(),
    },
    // Design troca as distâncias de visão pelo TAMANHO DO CANVAS: quem recebe
    // essa folha monta o conteúdo, não dimensiona a plateia
    ...(!showCanvas ? [] : (() => {
      const cv = canvasResumo(telas, project.comp?.pos);
      return [statRow([
        ["Canvas de conteúdo", `${ptBR(cv.w)} × ${ptBR(cv.h)} px`],
        ...(cv.temVao ? [["Disposição no desenho", `${ptBR(cv.caixa.w)} × ${ptBR(cv.caixa.h)} px`]] : []),
        ["Proporção", cv.ar],
        ["Total", `${cv.mp.toFixed(1).replace(".", ",")} MP`],
        ...(cv.largM ? [["Tamanho", `${cv.largM.toFixed(2).replace(".", ",")} × ${cv.altM.toFixed(2).replace(".", ",")} m`]] : []),
        ["Área de LED", `${cv.areaM2.toFixed(1).replace(".", ",")} m²`],
      ], 15)];
    })()),
    // as quatro réguas de distância (regras na folha de Critérios), AGRUPADAS
    // por pitch × altura — listar por tela repetia os mesmos números N vezes
    ...(showCanvas ? [] : (() => {
      const grupos = distVisaoGroups(telas);
      return grupos.length ? [
        { text: "DISTÂNCIA DE VISÃO", fontSize: 8, bold: true, color: PRINT.mut, margin: [0, 8, 0, 2] },
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto", "auto", "auto"],
            body: [
              [th("Telas"), th("Pitch"), th("Mínima"), th("Ótima"), th("Retina"), th("Máxima", "right")],
              ...grupos.map((g) => [
                { text: g.telas, fontSize: 8.5 },
                mono(g.pitch),
                mono(g.min),
                mono(g.otima, { color: PRINT.acc, bold: true }),
                mono(g.retina, { bold: true }),
                mono(g.max, { alignment: "right" }),
              ]),
            ],
          },
          layout: zebraLayout(),
        },
      ] : [];
    })()),
  ];

  // ── CONTEÚDO · MANUAL DE VÍDEO — só no Design ──
  // A folha que vai pro pessoal que MONTA o vídeo: o esquema dos painéis em
  // escala comum (resolução em cima, tamanho embaixo) e as duas fichas — o que
  // existe no palco e o que tem que ser entregue. Modelo de rider, de propósito:
  // é o formato que designer de conteúdo já sabe ler.
  const fichaBox = (titulo, linhas) => ({
    width: "*",
    stack: [
      { text: titulo.toUpperCase(), bold: true, fontSize: 8, color: PRINT.ink, characterSpacing: 0.8, margin: [0, 0, 0, 5] },
      ...linhas.map(([r, v]) => ({
        columns: [
          { width: 96, text: r, fontSize: 7.5, color: PRINT.dim, characterSpacing: 0.4, margin: [0, 1.5, 0, 0] },
          { width: "*", text: v, font: "PlexMono", fontSize: 8.5, color: PRINT.ink },
        ],
        margin: [0, 2.5, 0, 2.5],
      })),
    ],
    margin: [10, 8, 10, 8],
  });
  const conteudoSecao = !showCanvas ? [] : (() => {
    const sn = sec();
    const esquema = videoSchemaSvg(telas, { maxWidth: 748, maxHeight: 260 });
    return [
      sectionHead(sn, "Conteúdo", "Manual de vídeo", DISC.video),
      { text: "O painel como o conteúdo vai encontrar: cada tela em escala comum, com a resolução em cima e o tamanho em metros embaixo. As fichas fecham o combinado — o que existe no palco e o que precisa ser entregue.", fontSize: 8.5, color: PRINT.mut, margin: [0, 0, 0, 10] },
      ...(esquema ? [{ svg: esquema.svg, width: esquema.width, margin: [0, 0, 0, 12] }] : []),
      {
        columns: [fichaBox("Painel de LED", fichaPainel(project)), fichaBox("Manual de conteúdo", fichaConteudo(project))],
        columnGap: 16,
      },
    ];
  })();

  // ── TEST CARD (referência de imagem) — só no Design ──
  // UM BLOCO POR CARD, cada um abrindo em página própria: numa lista, o card
  // ficava com 190 pt de altura e o painel grande virava selo. Sozinho na folha
  // ele usa o orçamento inteiro da prancha — a mesma conta do MAPA_CHEIO:
  // 595,3 − 36 (topo) − 94 (carimbo) = 465 úteis, menos o subHead (~24) = 441;
  // 360 de teto mantém a folga conservadora que impede o bloco de vazar.
  //
  // A ficha técnica fica à DIREITA, onde sobra espaço. Card fita (12.768 × 168 px
  // da testeira) toma a largura inteira e a ficha desce — ao lado, ela deixaria a
  // fita com espessura de fio (limiar FICHA_ABAIXO, em services/reportContent.js).
  //
  // Sempre `fit`, nunca `width` cru: card mais alto que largo estouraria a folha.
  // `bloco()` (stack + headlineLevel) dá a quebra CONDICIONAL do docDefinition —
  // nada de `unbreakable`, que DESCARTA o conteúdo quando não cabe. As imagens
  // entram pelo dicionário `images` por NOME (ver o comentário do dicionário).
  const cardBlocos = (S) => {
    const FICHA = 168, GAP = 14; // largura da coluna da ficha e o respiro
    const LARG = 748;            // largura útil da prancha (mesma sarjeta do mapa cheio)
    // Teto de altura do card, em duas medidas. Folha inteira: 465,3 úteis − 24 do
    // subHead − 4 da margem do bloco = 437; 408 deixa 29 de folga (13 quando a
    // ficha vai embaixo). O PRIMEIRO card divide a folha com o cabeçalho da seção
    // (~40) e o parágrafo de abertura (~29), então cabe menos: 340.
    const ALT = 408, ALT_P1 = 340;
    const linhaFicha = (rot, val) => ({
      columns: [
        { width: "*", text: rot.toUpperCase(), fontSize: 7, color: PRINT.dim, characterSpacing: 0.6, margin: [0, 2, 0, 0] },
        { width: "auto", text: val, font: "PlexMono", fontSize: 9, color: PRINT.ink, alignment: "right" },
      ],
      margin: [0, 3.5, 0, 3.5],
    });
    const dados = (c) => [["Resolução", `${ptBR(c.pxW)} × ${ptBR(c.pxH)} px`], ["Grade", `${c.cols} × ${c.rows} gab.`], ["Gabinete", c.gabinete || "—"]];
    return cards.map((c, i) => {
      const abaixo = c.pxW / c.pxH > FICHA_ABAIXO;
      const alt = i === 0 ? ALT_P1 : ALT;
      const corpo = abaixo
        ? { stack: [
            { image: `tc_${c.telaId}`, fit: [LARG, alt - 20] }, // 20 pt reservados pra ficha embaixo
            { text: dados(c).flatMap(([r, v], k) => [
              { text: k ? "  ·  " : "", fontSize: 8, color: PRINT.line },
              { text: `${r} `, fontSize: 7, color: PRINT.dim, characterSpacing: 0.6 },
              { text: v, font: "PlexMono", fontSize: 8.5, color: PRINT.ink },
            ]), margin: [0, 6, 0, 0] },
          ] }
        : { columns: [
            { width: "auto", image: `tc_${c.telaId}`, fit: [LARG - FICHA - GAP, alt] },
            { width: FICHA, margin: [GAP, 2, 0, 0], stack: dados(c).map(([r, v]) => linhaFicha(r, v)) },
          ] };
      // nome longo em 2 linhas comeria a folga do bloco — o subHead não quebra
      const cabeca = subHead(`${S}.${i + 1}`, c.nome, `${ptBR(c.pxW)} × ${ptBR(c.pxH)} px`);
      // o PRIMEIRO card NÃO marca headlineLevel: com ele, o pageBreakBefore
      // dispararia logo depois do cabeçalho da seção e sobraria uma folha só com
      // título e parágrafo. Os demais abrem em página própria.
      return i === 0 ? { stack: [cabeca, corpo], margin: [0, 0, 0, 4] } : bloco([cabeca, corpo]);
    });
  };

  const cardsSecao = !cards.length ? [] : (() => {
    const sn = sec(); const S = String(sn).padStart(2, "0");
    return [
      sectionHead(sn, "Test Card", "Referência de imagem", DISC.video),
      { text: "O Test Card de cada tela como ele vai aparecer no painel — referência de imagem pra conferir grade, numeração de gabinete e cor antes da montagem. Uma tela por folha; o arquivo em resolução real sai na aba Test Card.", fontSize: 8.5, color: PRINT.mut, margin: [0, 0, 0, 8] },
      ...cardBlocos(S),
    ];
  })();

  // ── INFORMAÇÕES ELÉTRICAS ──
  // balanço por fase do projeto inteiro: pico e típico (rodízio por Screen)
  const acCabosEl = showElec ? projectAcCabos(project, numbering) : [];
  const balPicoEl = phaseBalance(acCabosEl, agg.vc);
  const balTipEl = phaseBalance(acCabosEl.map((c) => ({ n: c.n, load: c.loadTip || 0 })), agg.vc);
  const eletrica = !showElec ? [] : [
    sectionHead(sec(), "Informações Elétricas", "Energia · dimensionamento", DISC.elec),
    { text: [{ text: `Dimensionamento em ${voltFull(agg.vc)}. ` }, { text: "A potência de pico dimensiona a instalação (cabos, proteção e gerador); a típica (consumo médio em operação) estima a energia e a ocupação do gerador. A proteção do quadro é do projeto elétrico da casa/gerador.", color: PRINT.mut }], fontSize: 8.5, margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto"],
        body: [
          [th("Tela"), th("Gab.", "right"), th("Pico kW", "right"), th("Pico kVA", "right"), th("Pico A", "right"), th("Típico kVA", "right"), th("Típico A", "right")],
          ...agg.perTela.map(({ tela, gab, peak, typ }) => [
            { text: tela.nome, bold: true },
            mono(String(gab), { alignment: "right" }),
            mono((peak.W / 1000).toFixed(1), { alignment: "right", color: PRINT.red }),
            mono(String(peak.kVA), { alignment: "right" }),
            mono(String(peak.I), { alignment: "right", color: PRINT.amb }),
            mono(String(typ.kVA), { alignment: "right" }),
            mono(String(typ.I), { alignment: "right" }),
          ]),
          [
            { text: "Total", bold: true }, mono(String(roll.gab), { alignment: "right", bold: true }),
            mono((agg.W / 1000).toFixed(1), { alignment: "right", bold: true, color: PRINT.red }),
            mono(String(agg.kVA), { alignment: "right", bold: true }),
            mono(String(agg.I), { alignment: "right", bold: true, color: PRINT.amb }),
            mono(String(agg.typKva), { alignment: "right", bold: true }),
            mono(String(agg.typI), { alignment: "right", bold: true }),
          ],
        ],
      },
      layout: zebraLayout(),
    },
    { text: [{ text: "Gerador mínimo (pico × 1,25): " }, { text: `≥ ${agg.gerador} kVA`, bold: true, color: PRINT.acc }, { text: ` — consumo típico ocupa ${agg.geradorPct}% (janela saudável: 60–80%). Projetos grandes dividem a carga em setores, com mais de um gerador.`, color: PRINT.mut }], fontSize: 8.5, margin: [0, 6, 0, 0] },
    ...(balPicoEl.temRodizio && acCabosEl.length ? [
      { text: "Balanço por fase", bold: true, fontSize: 8.5, color: PRINT.ink, margin: [0, 8, 0, 2], characterSpacing: 0.5 },
      {
        table: {
          headerRows: 1,
          widths: ["auto", "auto", "auto", "auto"],
          body: [
            [th("Fase"), th("Cabos", "right"), th("Pico A", "right"), th("Típico A", "right")],
            ...balPicoEl.fases.map((f, i) => [
              mono(f.fase, { bold: true }),
              mono(String(f.cabos), { alignment: "right" }),
              mono(f.A.toFixed(1).replace(".", ","), { alignment: "right", color: PRINT.amb, bold: true }),
              mono((balTipEl.fases[i]?.A ?? 0).toFixed(1).replace(".", ","), { alignment: "right" }),
            ]),
          ],
        },
        layout: zebraLayout(),
      },
      { text: `Rodízio ${usaScreens ? "reinicia a cada Screen (cada Screen é um quadro)" : "pela numeração do projeto"}; soma aritmética (leitura conservadora de quadro)${agg.vc.g === "220" && agg.vc.ph === 3 ? " — o par F+F conta nas duas fases" : ""}.`, fontSize: 7.5, color: PRINT.mut, margin: [0, 3, 0, 0] },
    ] : []),
    {
      margin: [0, 6, 0, 0],
      table: {
        widths: ["*"],
        body: [[{
          stack: [
            mono("Típico por gabinete = base + (pico − base) × brilho × conteúdo", { fontSize: 8.5, color: PRINT.ink, margin: [0, 0, 0, 3] }),
            { text: `O consumo real fica entre tela preta (base) e branco pleno (pico); o brilho calibrado (${Math.round(agg.brilho * 100)}%) e o conteúdo médio do vídeo (${Math.round(agg.conteudo * 100)}%) escalam só a parcela dinâmica.${fpLabel ? ` Fator de potência dos gabinetes: ${fpLabel}.` : ""} Modelo baseado no estudo de consumo de painéis de LED da Barco.`, fontSize: 7.5, color: PRINT.mut },
          ],
          margin: [8, 6, 8, 6],
        }]],
      },
      layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => PRINT.line, vLineColor: () => PRINT.line, fillColor: () => PRINT.head },
    },
  ];

  // ── LISTAGEM DE CABOS: sai das páginas de mapa, vira seção própria ──
  // Pedido do dono (13/08): a folha do mapa fica SÓ com o mapa (grande, fácil
  // de ler em obra) e as tabelas de porta/circuito se juntam numa seção no
  // fim. As seções de sinal e AC empurram suas tabelas pra cá enquanto montam
  // as páginas — assim a linha de cada cabo continua sendo construída UMA vez,
  // no lugar que já tem os dados; recalcular na outra ponta abriria espaço pros
  // números divergirem dentro do mesmo caderno. As IIFEs de `sinal` e `ac`
  // rodam antes da de `cabos`, então quando ela lê, isto aqui já está cheio.
  const tabelasCabo = { sinal: [], ac: [] };

  // ── CABEAMENTO DE SINAL ──
  const sinal = !showSignal ? [] : (() => {
    const sn = sec(); const S = String(sn).padStart(2, "0");
    const head = sectionHead(sn, "Cabeamento de Sinal", "Portas de dados", DISC.video);
    if (usaScreens) {
      // telas VIVAS de uma Screen (ids órfãos fora — LLC-11)
      const telasDe = (sid) => (screensById[sid]?.telaIds || []).map((id) => telas.find((t) => t.id === id)).filter(Boolean);
      const specsDe = Object.fromEntries(screenReport.map((s) => [s.id, screenSpec(s)]));
      const totCabos = screenReport.reduce((n, s) => n + s.ports.length, 0);
      const totTelas = screenReport.reduce((n, s) => n + telasDe(s.id).length, 0);
      const hzs = [...new Set(screenReport.map((s) => specsDe[s.id].hz))].join(" · ");
      return [
        // ── página de ABERTURA da seção: o resumo geral do sinal ──
        head,
        { text: "Portas de dados organizadas por Screen — cada sistema abre na própria página, com o mapa e a tabela de portas.", fontSize: 9, color: PRINT.mut, margin: [0, 0, 0, 10] },
        statRow([
          ["Screens", screenReport.length],
          ["Telas", totTelas],
          ["Portas de sinal", totCabos],
          ["Frequência", `${hzs} Hz`],
        ]),
        {
          table: {
            headerRows: 1,
            widths: ["auto", "*", "auto", "auto", "auto"],
            body: [
              [th("Screen"), th("Telas"), th("Resolução"), th("Frequência", "right"), th("Cabos", "right")],
              ...screenReport.map((s, i) => {
                const sp = specsDe[s.id];
                const nomes = telasDe(s.id).map((t) => t.nome || "sem nome");
                return [
                  { text: `${S}.${i + 1}  ${s.nome}`, bold: true },
                  { text: nomes.join(", "), fontSize: 8.5, color: PRINT.mut },
                  mono(`${ptBR(s.res.w)} × ${ptBR(s.res.h)} px`),
                  mono(`${sp.hz} Hz`, { alignment: "right" }),
                  mono(String(s.ports.length), { alignment: "right", bold: true }),
                ];
              }),
            ],
          },
          layout: zebraLayout(),
        },
        ...(semScreen.length ? [{
          text: [{ text: `${semScreen.length} tela(s) fora de qualquer Screen `, bold: true }, { text: `(${semScreen.map((t) => t.nome).join(", ")}) — não entraram em nenhum sistema, então não têm cabeamento de sinal.` }],
          fontSize: 8.5, color: PRINT.amb, margin: [0, 8, 0, 0],
        }] : []),
        // ── uma página por Screen ──
        ...screenReport.map((s, i) => {
          const sp = specsDe[s.id];
          // a folha é do MAPA: sem a tabela dividindo o espaço, ele usa sempre
          // o tamanho cheio (a listagem foi pra seção de Cabos)
          const mapa = screensById[s.id] ? screenMapSvg(screensById[s.id], telas, "sinal", numbering, colorOf, cr, MAPA_CHEIO) : null;
          tabelasCabo.sinal.push({
            titulo: `${S}.${i + 1}  ${s.nome}`,
            nota: `${s.ports.length} porta(s)`,
            tabela: densePortTable(s.ports, [
              { label: "Porta", cell: (p) => portCell(p.n - 1, p.n) },
              { label: "Gab.", align: "right", cell: (p) => mono(String(p.count), { alignment: "right" }) },
              // laranja = overclock (acima do nominal por escolha); vermelho = estouro real
              { label: "Uso", align: "right", cell: (p) => mono(`${p.pct}%`, { alignment: "right", bold: true, color: p.over ? PRINT.red : p.oc ? PRINT.amb : PRINT.ink }) },
            ]),
          });
          return bloco([
            subHead(`${S}.${i + 1}`, s.nome),
            specBox([
              // SEM O VÃO: o espaçamento do desenho é referência de montagem,
              // não é LED e não é processamento (ver `screenResolucao`)
              ["Resolução da Screen", `${ptBR(s.res.w)} × ${ptBR(s.res.h)} px`],
              ...(s.res.temVao
                ? [["Disposição no desenho", `${ptBR(s.size.w)} × ${ptBR(s.size.h)} px`]]
                : []),
              ["Frequência", `${sp.hz} Hz`],
              ["Gabinete", `${sp.resX} × ${sp.resY} px`],
              // contagem REAL: a bbox da Screen inclui o vão entre telas
              // afastadas, então a grade só sai quando é um retângulo cheio
              ["Gabinetes", String(s.grid.gabs)],
              ...(s.grid.exato ? [["Grade da Screen", `${s.grid.cols} × ${s.grid.rows}`]] : []),
              // a tela é uma só no palco, mas o processamento divide ela — e
              // nenhuma porta atravessa o corte (ver `screens.js`)
              ...(s.grid.partes > 0 ? [["Partes", String(s.grid.partes)]] : []),
              ["Total de portas", String(s.ports.length)],
              // premissas declaradas: o que foi ESCOLHA sai no documento datado
              ...(sp.vao ? [["Vão no retângulo", sp.vao]] : []),
              ...(sp.cruzaCorte ? [["Cabo desenhado", "atravessa o corte"]] : []),
              ...(sp.overclock ? [["Overclock", "ligado"]] : []),
            ]),
            ...mapNode(mapa),
          ]);
        }),
      ];
    }
    const portasDe = Object.fromEntries(telas.map((t) => [t.id, cablePorts(t, "sinal", numbering).length]));
    const totPortas = telas.reduce((n, t) => n + portasDe[t.id], 0);
    return [
      // ── página de ABERTURA da seção (modo legado, por tela) ──
      head,
      { text: "Portas de dados por tela — régua de pixels reais (controladoras VX/série A/Colorlight) ou de área retangular (controladora básica), conforme a configuração da tela. Cada tela abre na própria página.", fontSize: 9, color: PRINT.mut, margin: [0, 0, 0, 10] },
      statRow([["Telas", telas.length], ["Portas de sinal", totPortas]]),
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto"],
          body: [
            [th("Tela"), th("Gabinete"), th("Resolução"), th("Portas", "right")],
            ...telas.map((t, i) => {
              const v = videoOf(t);
              return [
                { text: `${S}.${i + 1}  ${t.nome || "sem nome"}`, bold: true },
                { text: t.gabinete?.nome || "—", fontSize: 8.5, color: PRINT.mut },
                mono(`${ptBR(v.pxW)} × ${ptBR(v.pxH)} px`),
                mono(String(portasDe[t.id]), { alignment: "right", bold: true }),
              ];
            }),
          ],
        },
        layout: zebraLayout(),
      },
      // ── uma página por tela ──
      ...telas.flatMap((t, i) => {
        const { sinalBudget, sinalRule, sinalBits, pxPort } = cableMeta(t);
        const ports = cablePorts(t, "sinal", numbering);
        const off = portOffset(telas, t.id, "sinal", numbering);
        const rows = ports.map((p, pi) => ({ n: off + pi + 1, idx: off + pi, count: p.length, pct: Math.round(((sinalRule === "px" ? p.length : bboxArea(p)) / sinalBudget) * 100) }));
        const mapa = telaMapSvg(t, "sinal", numbering, off, colorOf, cr, MAPA_CHEIO);
        tabelasCabo.sinal.push({
          titulo: `${S}.${i + 1}  ${t.nome}`,
          nota: portLabel(off, ports.length, "porta"),
          tabela: densePortTable(rows, [
            { label: "Porta", cell: (p) => portCell(p.idx, p.n) },
            { label: "Gab.", align: "right", cell: (p) => mono(String(p.count), { alignment: "right" }) },
            { label: "Uso", align: "right", cell: (p) => mono(`${p.pct}%`, { alignment: "right", bold: true, color: p.pct > 100 ? PRINT.red : PRINT.ink }) },
          ]),
        });
        return [
          bloco([
            subHead(`${S}.${i + 1}`, t.nome),
            specBox([
              ["Portas", portLabel(off, ports.length, "porta")],
              ["Máx por porta", `${sinalBudget} gabinetes`],
              ["Régua", sinalRule === "px" ? `${ptBR(pxPort)} px (${sinalBits}-bit)` : "área quadrada"],
              ["Grade", `${t.cols} × ${t.rows} gabinetes`],
            ]),
            ...mapNode(mapa),
          ]),
          ...(tipo === "Mapa de cabos" ? [
            { text: "Mapa de pixels — coordenada do 1º gabinete de cada porta (origem no canto superior-esquerdo) para transcrever no software da controladora (NovaLCT / Tessera).", fontSize: 8, color: PRINT.mut, margin: [0, 6, 0, 3] },
            {
              table: {
                headerRows: 1,
                widths: ["auto", "auto", "auto", "auto", "*"],
                body: [
                  [th("Porta"), th("Gab.", "right"), th("Início (col, lin)"), th("Início X, Y (px)"), th("Área C×L")],
                  ...pixelMapPorts(t, numbering, off).map((p) => [
                    mono(String(p.port)), mono(String(p.count), { alignment: "right" }),
                    mono(`${p.startCol}, ${p.startRow}`), mono(`${p.startX}, ${p.startY}`), mono(`${p.bboxCols}×${p.bboxRows}`),
                  ]),
                ],
              },
              layout: zebraLayout(),
            },
          ] : []),
        ];
      }),
    ];
  })();

  // ── ENERGIA — CABEAMENTO AC ──
  const ac = !showAC ? [] : (() => {
    const sn = sec(); const S = String(sn).padStart(2, "0");
    const head = [sectionHead(sn, "Cabeamento AC", "Circuitos de força", DISC.elec), warnBox(AVISO_AC)];
    if (usaScreens) {
      const totCirc = screenReportAc.reduce((n, s) => n + s.ports.length, 0);
      const cargaMax = (ports) => ports.reduce((m, p) => (p.load > m.load ? p : m), { load: 0, pct: 0 });
      const pior = cargaMax(screenReportAc.flatMap((s) => s.ports));
      const temEstouro = screenReportAc.some((s) => s.ports.some((p) => p.over));
      return [
        // ── página de ABERTURA da seção: aviso de segurança + resumo geral do AC ──
        ...head,
        { text: `Cabos de energia por Screen, na mesma organização do sinal — carga por circuito × corrente do conector. Cada sistema abre na própria página, com circuitos numerados 1..N${phaseOf(1, agg.vc) ? `; a fase segue o rodízio (circuito 1→${phaseOf(1, agg.vc)}, 2→${phaseOf(2, agg.vc)}, 3→${phaseOf(3, agg.vc)}…), reiniciando a cada Screen` : ""}.`, fontSize: 9, color: PRINT.mut, margin: [0, 0, 0, 10] },
        statRow([
          ["Screens", screenReportAc.length],
          ["Circuitos AC", totCirc],
          ["Maior carga por cabo", `${pior.load.toFixed(1)} A · ${pior.pct}%`],
        ]),
        {
          table: {
            headerRows: 1,
            widths: ["auto", "*", "auto", "auto"],
            body: [
              [th("Screen"), th("Telas"), th("Cabos", "right"), th("Maior carga", "right")],
              ...screenReportAc.map((s, i) => {
                const nomes = ((screensById[s.id]?.telaIds || []).map((id) => telas.find((t) => t.id === id)).filter(Boolean)).map((t) => t.nome || "sem nome");
                const m = cargaMax(s.ports);
                return [
                  { text: `${S}.${i + 1}  ${s.nome}`, bold: true },
                  { text: nomes.join(", "), fontSize: 8.5, color: PRINT.mut },
                  mono(String(s.ports.length), { alignment: "right", bold: true }),
                  mono(`${m.load.toFixed(1)} A · ${m.pct}%`, { alignment: "right", bold: true, color: m.over ? PRINT.red : m.warn ? PRINT.amb : PRINT.ink }),
                ];
              }),
            ],
          },
          layout: zebraLayout(),
        },
        ...(temEstouro ? [{ text: "Há circuito ACIMA da capacidade do conector — confira as linhas em vermelho antes de energizar.", fontSize: 8.5, bold: true, color: PRINT.red, margin: [0, 8, 0, 0] }] : []),
        // ── uma página por Screen ──
        ...screenReportAc.map((s, i) => {
          const bal = phaseBalance(s.ports, agg.vc);
          // folha do mapa, tamanho cheio: a listagem de circuitos foi pra
          // seção de Cabos (dono, 13/08)
          const mapa = screensById[s.id] ? screenMapSvg(screensById[s.id], telas, "ac", numbering, colorOf, cr, MAPA_CHEIO) : null;
          tabelasCabo.ac.push({
            titulo: `${S}.${i + 1}  ${s.nome}`,
            nota: `${s.ports.length} circuito(s)${bal.temRodizio ? ` · ${fmtFases(bal)}` : ""}`,
            tabela: densePortTable(s.ports, [
              { label: "Circuito", cell: (p) => portCell(p.n - 1, p.n) },
              ...(bal.temRodizio ? [{ label: "Fase", cell: (p) => mono(phaseOf(p.n, agg.vc), { bold: true }) }] : []),
              { label: "Gab.", align: "right", cell: (p) => mono(String(p.count), { alignment: "right" }) },
              { label: "Carga", align: "right", cell: (p) => mono(`${p.load.toFixed(1)}A ${p.pct}%`, { alignment: "right", bold: true, noWrap: true, color: p.over ? PRINT.red : p.warn ? PRINT.amb : PRINT.ink }) },
            ]),
          });
          return bloco([
            subHead(`${S}.${i + 1}`, s.nome),
            specBox([
              ["Circuitos", String(s.ports.length)],
              ["Maior carga por cabo", `${cargaMax(s.ports).load.toFixed(1)} A · ${cargaMax(s.ports).pct}%`],
              ["Gabinetes", String(s.ports.reduce((n, p) => n + p.count, 0))],
              ...(bal.temRodizio ? [["Carga por fase", fmtFases(bal)]] : []),
            ]),
            ...mapNode(mapa),
          ]);
        }),
      ];
    }
    const cabosDe = Object.fromEntries(telas.map((t) => [t.id, cablePorts(t, "ac", numbering).length]));
    const totCabosAc = telas.reduce((n, t) => n + cabosDe[t.id], 0);
    return [
      // ── página de ABERTURA da seção (modo legado, por tela) ──
      ...head,
      { text: "Cabos de energia por tela: quantidade, capacidade do conector e carga por circuito. Cada tela abre na própria página.", fontSize: 9, color: PRINT.mut, margin: [0, 0, 0, 10] },
      statRow([["Telas", telas.length], ["Circuitos AC", totCabosAc]]),
      {
        table: {
          headerRows: 1,
          widths: ["auto", "*", "auto", "auto"],
          body: [
            [th("Tela"), th("Gabinete"), th("Conector"), th("Cabos", "right")],
            ...telas.map((t, i) => {
              const m = cableMeta(t);
              return [
                { text: `${S}.${i + 1}  ${t.nome || "sem nome"}`, bold: true },
                { text: t.gabinete?.nome || "—", fontSize: 8.5, color: PRINT.mut },
                mono(`${m.connRating} A`),
                mono(String(cabosDe[t.id]), { alignment: "right", bold: true }),
              ];
            }),
          ],
        },
        layout: zebraLayout(),
      },
      // ── uma página por tela ──
      ...telas.flatMap((t, i) => {
        const { ampCab, connRating, acBudget } = cableMeta(t);
        const ports = cablePorts(t, "ac", numbering);
        const off = portOffset(telas, t.id, "ac", numbering);
        const rows = ports.map((p, pi) => {
          const load = p.length * ampCab;
          return { n: off + pi + 1, idx: off + pi, count: p.length, load, pct: Math.round((load / connRating) * 100) };
        });
        const temFase = phaseOf(1, agg.vc) != null;
        const mapa = telaMapSvg(t, "ac", numbering, off, colorOf, cr, MAPA_CHEIO);
        tabelasCabo.ac.push({
          titulo: `${S}.${i + 1}  ${t.nome}`,
          nota: portLabel(off, ports.length, "circuito"),
          tabela: densePortTable(rows, [
            { label: "Circuito", cell: (p) => portCell(p.idx, p.n) },
            ...(temFase ? [{ label: "Fase", cell: (p) => mono(phaseOf(p.n, agg.vc), { bold: true }) }] : []),
            { label: "Gab.", align: "right", cell: (p) => mono(String(p.count), { alignment: "right" }) },
            { label: "Carga", align: "right", cell: (p) => mono(`${p.load.toFixed(1)}A ${p.pct}%`, { alignment: "right", bold: true, noWrap: true, color: acTone(p.pct) === "over" ? PRINT.red : acTone(p.pct) === "warn" ? PRINT.amb : PRINT.ink }) },
          ]),
        });
        return bloco([
          subHead(`${S}.${i + 1}`, t.nome),
          specBox([
            ["Circuitos", portLabel(off, ports.length, "circuito")],
            ["Máx por circuito", `${acBudget} gabinetes`],
            ["Corrente", `${ampCab.toFixed(2)} A/gabinete`],
            ["Conector", `${connRating} A`],
          ]),
          ...mapNode(mapa),
        ]);
      }),
    ];
  })();

  // ── ESTRUTURA (box truss) ──
  // A folha que o dono pediu no primeiro dia: lista de peças, peso e medidas
  // reais. A IMAGEM não é gerada aqui — o PDF roda no celular e offline, e o
  // chunk 3D não está lá; ela vem capturada da aba e guardada no projeto (§7.2).
  const estrutura = !estruturaDados ? [] : (() => {
    const d = estruturaDados;
    const proc = procedenciaDoPeso(d);

    // A LEGENDA do desenho, na mesma paleta da cena — quem monta identifica a
    // peça pela cor antes de ler o nome. Em tabela de 3 colunas porque `columns`
    // do pdfmake não quebra linha, e dez peças numa linha só estourariam a
    // largura da imagem.
    const legendaCel = (l) => ({
      columns: [
        { width: 9, canvas: [{ type: "rect", x: 0, y: 1.5, w: 7, h: 7, color: l.cor, lineColor: PRINT.line, lineWidth: 0.4 }] },
        { width: "auto", text: [{ text: `${l.qtd}× `, bold: true }, { text: l.nome }], fontSize: 7.5, color: PRINT.ink },
      ],
      columnGap: 3,
    });
    const legendaTabela = !d.imagem || !d.legenda.length ? [] : (() => {
      const linhas = [];
      for (let i = 0; i < d.legenda.length; i += 3) {
        const linha = d.legenda.slice(i, i + 3).map(legendaCel);
        while (linha.length < 3) linha.push({ text: "" });
        linhas.push(linha);
      }
      return [{
        table: { widths: ["*", "*", "*"], body: linhas },
        layout: "noBorders",
        margin: [0, 6, 0, 0],
      }];
    })();

    return [
      sectionHead(sec(), "Estrutura", "Box truss · montagem", DISC.prod),
      {
        columns: [
          ...(d.imagem ? [{ width: "*", stack: [{ image: d.imagem, fit: [430, 268] }, ...legendaTabela] }] : []),
          {
            width: d.imagem ? 250 : "*",
            stack: [
              specBox([
                ["Peças", String(d.resumo.pecas)],
                ["Juntas", String(d.juntas)],
                // o peso da treliça e o do que ela CARREGA saem separados, e o
                // total fecha embaixo: é o número que o rigger pede antes de içar
                [d.paineis ? "Peso da treliça" : "Peso", d.pesoTexto],
                ...(d.paineis ? [
                  [`Telas (${d.paineis.paineis})`, d.paineis.pesoTexto],
                  ...(d.paineis.kgNoChao > 0
                    ? [["Telas apoiadas no chão", d.paineis.noChaoTexto]] : []),
                  ["Total suspenso", d.pesoSuspensoTexto],
                ] : []),
              ]),
              ...(d.medidas ? [specBox([
                ["Largura", d.medidas.largura],
                ["Altura", d.medidas.altura],
                ["Profund.", d.medidas.profundidade],
              ])] : []),
              ...(d.pesoNota ? [{ text: d.pesoNota, fontSize: 8, bold: true, color: PRINT.amb, margin: [0, 2, 0, 0] }] : []),
            ],
          },
        ],
        columnGap: 14,
        margin: [0, 0, 0, 10],
      },
      subHead(null, "Lista de peças", plural(d.resumo.pecas, "peça")),
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto", "auto"],
          body: [
            [th("Peça"), th("Linha"), th("Qtd.", "right"), th("Peso unit.", "right"), th("Peso total", "right")],
            ...d.lista.map((l) => [
              { text: l.nome },
              { text: l.linha ?? "—" },
              mono(String(l.qtd), { alignment: "right" }),
              mono(l.pesoUnitarioKg == null ? "—" : `${l.pesoUnitarioKg} kg`, { alignment: "right" }),
              mono(l.pesoTotalKg == null ? "—" : `${l.pesoTotalKg} kg`, { alignment: "right" }),
            ]),
            [
              { text: "Total", bold: true }, "",
              mono(String(d.resumo.pecas), { alignment: "right", bold: true }), "",
              mono(d.pesoTexto, { alignment: "right", bold: true }),
            ],
          ],
        },
        layout: zebraLayout(),
      },
      subHead(null, "Ferragem", plural(d.juntas, "junta")),
      {
        text: `Uma junta consome um jogo completo. A massa da ferragem ${d.parafusaria.massaInclusaNoPeso ? "já está inclusa no peso das peças" : "não está somada ao peso acima"} — esta lista é CONTAGEM, para conferir a caixa.`,
        fontSize: 8.5, color: PRINT.mut, margin: [0, 0, 0, 5],
      },
      {
        columns: d.parafusaria.itens.map((i) => ({
          width: "auto",
          text: [{ text: `${i.qtd}× `, bold: true, fontSize: 9.5 }, { text: i.spec, fontSize: 8, color: PRINT.dim }],
        })),
        columnGap: 16,
        margin: [0, 0, 0, 8],
      },
      // AS TELAS NO DESENHO. A lista é o que torna o total conferível — sem
      // ela, o peso suspenso é palavra.
      ...(!d.paineis ? [] : [
        subHead(null, "Telas no desenho", plural(d.paineis.paineis, "tela")),
        {
          table: {
            headerRows: 1,
            widths: ["*", "auto", "auto", "auto", "auto"],
            body: [
              [th("Tela"), th("Medida"), th("Onde começa"), th("Gab.", "right"), th("Peso", "right")],
              ...d.paineis.lista.map((p) => [
                { text: p.nome },
                { text: p.medida },
                { text: p.em },
                mono(p.gabinetes == null ? "—" : String(p.gabinetes), { alignment: "right" }),
                mono(p.pesoKg == null ? "—" : `${p.pesoKg} kg`, { alignment: "right" }),
              ]),
              [
                { text: "Total", bold: true }, "", "", "",
                mono(d.paineis.pesoTexto, { alignment: "right", bold: true }),
              ],
            ],
          },
          layout: zebraLayout(),
        },
        ...(d.paineis.problemas.length ? [{
          ...warnBox({
            titulo: "Tela fora de lugar",
            partes: [
              { t: `${d.paineis.problemas.join(" · ")}. ` },
              { t: "É medida, não carga", b: true },
              { t: " — confira o desenho antes de subir." },
            ],
          }),
          margin: [0, 8, 0, 0],
        }] : []),
      ]),
      ...(proc.length ? [
        { text: "PROCEDÊNCIA DO PESO", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 6, 0, 3] },
        ...proc.map((p) => ({
          text: [{ text: p.fonte, bold: true, fontSize: 8.5 }, { text: ` — ${p.pecas.join(" · ")}`, fontSize: 8.5, color: PRINT.mut }],
          margin: [0, 0, 0, 2],
        })),
      ] : []),
      // PEÇA DENTRO DE PEÇA vai IMPRESSO: quem separa material segue o papel, e
      // uma montagem que não fecha no 3D também não fecha no truss.
      ...(d.conflitos.length ? [{
        ...warnBox({
          titulo: "Peças sobrepostas no modelo",
          partes: [
            { t: `${plural(d.conflitos.length, "par")} de peças ocupa o mesmo espaço no modelo 3D: ` },
            { t: d.conflitos.slice(0, 4).map((c) => `${c.nomeA} × ${c.nomeB}`).join(" · "), b: true },
            { t: d.conflitos.length > 4 ? ` · e mais ${d.conflitos.length - 4}` : "" },
            { t: ". No truss montado elas não entrariam — confira o desenho antes de separar o material." },
          ],
        }),
        margin: [0, 10, 0, 0],
      }] : []),
      { ...warnBox(avisoEstruturaPdf()), margin: [0, 10, 0, 0] },
    ];
  })();

  // ── CRITÉRIOS DE CÁLCULO (normas + referências) — folha antes do Glossário ──
  // Pedido do dono (31/07): o caderno declara COMO os números foram calculados,
  // em que normas se apoia e quais fontes sustentam o motor. Conteúdo em
  // reportContent.js (compartilhado com o DOM); mesmo gate do glossário.
  // ── CABOS — a seção de fecho (pedido do dono, 13/08) ──
  // Reúne o que saiu das páginas de mapa: a listagem cabo a cabo de sinal e de
  // energia. Abre com a RÉGUA que gerou aqueles números — capacidade nominal
  // por MODELO de gabinete (cada modelo tem resolução e consumo próprios, logo
  // capacidade própria), o cabo/conector que se leva pra obra e o pior caso do
  // projeto — porque é ela que explica os % das tabelas logo abaixo.
  const cabos = (!showSignal && !showAC) || !telas.length ? [] : (() => {
    // Agrupa por modelo + configuração de sinal: o mesmo gabinete em duas
    // telas com réguas diferentes TEM capacidades diferentes, e esconder isso
    // numa linha só seria mentir. As colunas de régua/bits/Hz explicam a
    // duplicata pra quem lê.
    const grupos = new Map();
    for (const t of telas) {
      const m = cableMeta(t);
      const nome = t.gabinete?.nome || "sem gabinete";
      const chave = `${nome}|${m.sinalRule}|${m.sinalBits}|${m.pxPort}|${m.overclock}|${m.connRating}|${m.ampCab.toFixed(3)}`;
      const g = grupos.get(chave) || { nome, meta: m, tela: t, gabs: 0 };
      g.gabs += (t.cols || 1) * (t.rows || 1);
      grupos.set(chave, g);
    }
    const linhas = [...grupos.values()];

    // pior caso do projeto: a porta/circuito mais carregado de todos. Sai das
    // MESMAS fontes das seções de sinal e AC — recalcular por fora abriria
    // espaço pros dois números divergirem no mesmo documento.
    const pctsSinal = usaScreens
      ? screenReport.flatMap((s) => s.ports.map((p) => p.pct))
      : telas.flatMap((t) => {
        const { sinalBudget, sinalRule } = cableMeta(t);
        return cablePorts(t, "sinal", numbering).map((p) => Math.round(((sinalRule === "px" ? p.length : bboxArea(p)) / sinalBudget) * 100));
      });
    const pctsAc = usaScreens
      ? screenReportAc.flatMap((s) => s.ports.map((p) => p.pct))
      : telas.flatMap((t) => {
        const { ampCab, connRating } = cableMeta(t);
        return cablePorts(t, "ac", numbering).map((p) => Math.round(((p.length * ampCab) / connRating) * 100));
      });
    const pior = (arr) => (arr.length ? Math.max(...arr) : 0);
    const piorSinal = pior(pctsSinal), piorAc = pior(pctsAc);

    // tom do pior caso: mesma semântica do resto do caderno (laranja = apertado,
    // vermelho = passou). Folga é o que sobra da porta mais carregada — é ela
    // que limita quanto ainda dá pra crescer sem repuxar cabo.
    const tomPct = (p) => (p > 100 ? PRINT.red : p >= 80 ? PRINT.amb : PRINT.ink);
    const folga = (p) => (p >= 100 ? "0%" : `${100 - p}%`);

    const tabela = (cols, body) => ({
      table: { headerRows: 1, widths: cols.map((c) => c.w || "auto"), body: [cols.map((c) => th(c.label, c.align)), ...body] },
      layout: zebraLayout(),
      margin: [0, 0, 0, 4],
    });

    const blocoSinal = !showSignal ? [] : [
      { text: "SINAL — CAPACIDADE POR PORTA", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 10, 0, 4] },
      tabela(
        [{ label: "Gabinete", w: "*" }, { label: "Resolução" }, { label: "Régua" }, { label: "Capacidade da porta", align: "right" }, { label: "Máx gab./porta", align: "right" }],
        linhas.map((g) => {
          const m = g.meta;
          return [
            { text: g.nome, bold: true, fontSize: 8.5 },
            mono(`${ptBR(parseFloat(g.tela.gabinete?.resX) || 0)} × ${ptBR(parseFloat(g.tela.gabinete?.resY) || 0)} px`, { fontSize: 8 }),
            { text: m.sinalRule === "px" ? `pixels reais · ${m.sinalBits}-bit` : "área quadrada", fontSize: 8, color: PRINT.mut },
            mono(m.sinalRule === "px" ? `${ptBR(m.pxPort)} px` : "—", { alignment: "right", fontSize: 8 }),
            mono(`${m.sinalBudget}${m.overclock ? " *" : ""}`, { alignment: "right", bold: true, fontSize: 8, color: m.overclock ? PRINT.amb : PRINT.ink }),
          ];
        }),
      ),
      ...(linhas.some((g) => g.meta.overclock)
        ? [{ text: "* overclock ligado: a última fatia vira gabinete inteiro e a porta pode passar da capacidade nominal — escolha registrada neste caderno.", fontSize: 7.5, color: PRINT.amb, margin: [0, 0, 0, 2] }]
        : []),
    ];

    const blocoAc = !showAC ? [] : [
      { text: "ENERGIA — CAPACIDADE POR CIRCUITO", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 10, 0, 4] },
      tabela(
        [{ label: "Gabinete", w: "*" }, { label: "Consumo" }, { label: "Cabo / conector" }, { label: "Teto do conector", align: "right" }, { label: "Máx gab./circuito", align: "right" }],
        linhas.map((g) => {
          const m = g.meta;
          return [
            { text: g.nome, bold: true, fontSize: 8.5 },
            mono(`${m.ampCab.toFixed(2)} A/gab.`, { fontSize: 8 }),
            { text: g.tela.gabinete?.conector || "não informado", fontSize: 8, color: g.tela.gabinete?.conector ? PRINT.mut : PRINT.amb },
            mono(`${m.connRating} A`, { alignment: "right", fontSize: 8 }),
            mono(String(m.acBudget), { alignment: "right", bold: true, fontSize: 8 }),
          ];
        }),
      ),
      { text: `Dimensionamento em ${voltFull(agg.vc)}; corrente por gabinete = potência de pico ÷ (tensão de fase × fator de potência). O máximo por circuito já aplica a margem de segurança configurada.`, fontSize: 7.5, color: PRINT.mut, margin: [0, 0, 0, 2] },
    ];

    // as listagens que saíram das páginas de mapa. Elas FLUEM (sem bloco/
    // headlineLevel): marcar cada tabela como bloco gastaria uma folha por
    // Screen, e essas tabelas são baixas — várias cabem na mesma página. Se
    // uma passar do fim da folha, o pdfmake continua na seguinte repetindo o
    // cabeçalho, que é o comportamento que a densePortTable já assume.
    const listagem = (titulo, itens) => (!itens.length ? [] : [
      { text: titulo, fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 12, 0, 2] },
      ...itens.flatMap((it) => [
        {
          columns: [
            { width: "*", text: it.titulo, bold: true, fontSize: 10, color: PRINT.ink },
            { width: "auto", text: it.nota, fontSize: 8, color: PRINT.dim, alignment: "right", margin: [0, 2, 0, 0] },
          ],
          margin: [0, 6, 0, 3],
        },
        it.tabela,
      ]),
    ]);

    return [
      sectionHead(sec(), "Cabos", "Portas de sinal e circuitos de energia", DISC.elec),
      { text: "A lista completa de cabos do projeto: cada porta de sinal e cada circuito de energia, com a carga que leva. Os mapas de montagem estão nas seções anteriores, um por folha.", fontSize: 9, color: PRINT.mut, margin: [0, 0, 0, 10] },
      statRow([
        ...(showSignal ? [["Porta mais cheia", `${piorSinal}%`, tomPct(piorSinal)], ["Folga de sinal", folga(piorSinal)]] : []),
        ...(showAC ? [["Circuito mais carregado", `${piorAc}%`, tomPct(piorAc)], ["Folga de energia", folga(piorAc)]] : []),
        ["Modelos", String(new Set(linhas.map((g) => g.nome)).size)],
      ]),
      ...(piorSinal > 100 || piorAc > 100
        ? [warnBox({ titulo: "Capacidade excedida", partes: [{ t: "Há " }, { t: piorSinal > 100 && piorAc > 100 ? "porta de sinal e circuito de energia" : piorSinal > 100 ? "porta de sinal" : "circuito de energia", b: true }, { t: " acima do nominal neste projeto. Confira as páginas do sistema antes de fechar a montagem." }] }, "red")]
        : []),
      ...blocoSinal,
      ...blocoAc,
      ...listagem("PORTAS DE SINAL, CABO A CABO", tabelasCabo.sinal),
      ...listagem("CIRCUITOS DE ENERGIA, CABO A CABO", tabelasCabo.ac),
    ];
  })();

  // Tipografia apertada de propósito (dono, 13/08): a folha vinha quebrando em
  // DUAS e a segunda página ficava com um resto órfão de referências. O
  // conteúdo é de consulta — cabe reduzir corpo (8 → 7) e entrelinha (1,3 →
  // 1,15) pra fechar numa folha só, mantendo os títulos legíveis. Se um dia o
  // texto crescer a ponto de estourar de novo, o próximo passo é a terceira
  // coluna, não encolher mais a fonte: abaixo de 7 pt o impresso sofre.
  const criterios = !showGloss ? [] : [
    sectionHead(sec(), "Critérios de Cálculo", "Normas e referências", DISC.elec),
    {
      columnGap: 22,
      columns: [
        {
          width: "*",
          stack: [
            { text: "COMO OS NÚMEROS SÃO CALCULADOS", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 0, 0, 4] },
            ...CRITERIOS.flatMap((g) => [
              { text: g.h, bold: true, fontSize: 8.5, color: PRINT.ink, margin: [0, 2, 0, 1] },
              // [...itens]: o pdfmake MUTA o array do `ul` (troca string por nó
              // com positions/_inlines) — passar o array compartilhado quebrava
              // o Caderno DOM depois de gerar um PDF (React: "Objects are not
              // valid as a child"). Clonar na fronteira é obrigatório.
              { ul: [...g.itens], fontSize: 7, color: PRINT.mut, lineHeight: 1.15, margin: [0, 0, 0, 3], markerColor: PRINT.dim },
            ]),
          ],
        },
        {
          width: "*",
          stack: [
            { text: "NORMAS E PRÁTICAS ADOTADAS", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 0, 0, 4] },
            ...NORMAS.flatMap(([n, d]) => [
              { text: n, bold: true, fontSize: 8.5, color: PRINT.ink, margin: [0, 2, 0, 1] },
              { text: d, fontSize: 7, color: PRINT.mut, lineHeight: 1.15, margin: [0, 0, 0, 2] },
            ]),
            { text: "REFERÊNCIAS", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 7, 0, 4] },
            { ul: [...REFERENCIAS], fontSize: 7, color: PRINT.mut, lineHeight: 1.15, markerColor: PRINT.dim }, // clone: ver nota acima
          ],
        },
      ],
    },
  ];

  // ── GLOSSÁRIO ──
  const gloss = !showGloss ? [] : (() => {
    const meio = Math.ceil(GLOSSARIO.length / 2);
    const col = (items) => ({
      width: "*",
      stack: items.map((g) => ({
        stack: [
          { text: g.t, bold: true, fontSize: 9.5, color: PRINT.ink },
          { text: g.d, fontSize: 8.5, color: PRINT.mut, lineHeight: 1.35, margin: [0, 1, 0, 7] },
        ],
      })),
    });
    return [
      sectionHead(sec(), "Glossário", "Termos técnicos", DISC.prod),
      { columns: [col(GLOSSARIO.slice(0, meio)), col(GLOSSARIO.slice(meio))], columnGap: 30 },
    ];
  })();

  // ── PRANCHA (moldura + carimbo) — em toda página menos a capa ──
  // Referência: prancha clássica de arquitetura (docs do dono, 30/07/2026).
  // A moldura vive no `background` (canvas por página); o carimbo é o `footer`
  // do pdfmake — é ele que entrega página/total pro "FOLHA 03/12".
  const FR = 16; // inset da moldura (pt) — a caixa externa da prancha
  const CAR_H = 52; // altura da faixa do carimbo (≈18 mm), dentro da moldura
  const BOT = 94; // margem inferior da página = FR + carimbo + respiro
  // ⚠️ GEOMETRIA BLINDADA: `heights` do pdfmake é altura MÍNIMA — se um valor
  // quebrar de linha, a faixa cresce pra baixo e a borda vaza pra fora da
  // moldura (aconteceu com "Nº · REV A" no caderno real de 30/07). Por isso
  // TODO valor do carimbo é truncado pra caber numa linha só.
  const trunc = (t, n) => { const s = String(t || "").trim(); return s.length > n ? `${s.slice(0, n - 1)}…` : s; };
  // ⚠️ lineHeight: 1 em TUDO — o defaultStyle do documento usa 1.25, que
  // inflava cada linha do carimbo em 25% e estourava a faixa (caderno de 30/07)
  const carLbl = (t) => ({ text: t.toUpperCase(), font: "PlexMono", fontSize: 5, bold: true, characterSpacing: 0.7, color: PRINT.dim, lineHeight: 1 });
  const carLinha = (l, v, vExtra = {}) => ({
    columns: [
      { width: 33, ...carLbl(l), margin: [0, 1.4, 0, 0] },
      { width: "*", text: v || "—", bold: true, fontSize: 7, color: PRINT.ink, lineHeight: 1, ...vExtra },
    ],
    columnGap: 4,
    margin: [7, 0, 7, 3.4],
  });
  const carimbo = (current, total) => ({
    // a borda de baixo do carimbo CASA com a linha da moldura (uma linha só,
    // não duas): topo = fundo da página − moldura − faixa − bordas da tabela
    margin: [FR, BOT - FR - CAR_H - 2.4, FR, 0],
    table: {
      widths: [118, "*", 176, 72],
      heights: [CAR_H],
      body: [[
        // bloco da MARCA: 100% do cliente — logo do projeto sozinho, centrado
        // (a autoria LedLab mora no cabeçalho dos campos, ao lado do chip;
        // legenda embaixo do logo ALHEIO lia como assinatura dele — dono, 30/07)
        {
          stack: [
            logoProjeto
              ? { image: "logoProjeto", fit: [104, 34], alignment: "center", margin: [0, 9, 0, 0] }
              : (logo ? { image: "marcaLedlab", fit: [34, 34], alignment: "center", margin: [0, 9, 0, 0] } : { text: "LEDLAB CORE", bold: true, fontSize: 10, alignment: "center", lineHeight: 1, margin: [0, 22, 0, 0] }),
          ],
          margin: [4, 0, 4, 0],
        },
        // campos do projeto (valores truncados: 1 linha SEMPRE)
        {
          stack: [
            {
              text: [
                { text: ` CADERNO TÉCNICO · ${tipo.toUpperCase()} `, font: "PlexMono", bold: true, fontSize: 5.8, characterSpacing: 1.2, color: "#fdfdfb", background: PRINT.ink },
                { text: `  LEDLAB CORE · ENGENHARIA DE LED`, font: "PlexMono", bold: true, fontSize: 4.8, characterSpacing: 0.8, color: PRINT.dim },
              ],
              lineHeight: 1,
              margin: [7, 4, 7, 4.6],
            },
            carLinha("Evento", trunc(project.name, 72)),
            carLinha("Cliente", trunc(project.cliente, 72)),
            carLinha("Local", trunc([project.local, dataEvento].filter(Boolean).join(" · "), 72)),
          ],
        },
        // responsável e datas — REV junto do GERADO; o Nº fica sozinho na linha
        // dele, em mono menor (nome de projeto longo vira Nº de 22 caracteres).
        // Alinhado com o bloco do meio: PROJETOU nasce na altura do EVENTO.
        {
          stack: [
            carLinha("Projetou", trunc(assinatura, 32)),
            carLinha("Gerado", [gerado, `REV ${rev}`].filter(Boolean).join(" · ")),
            carLinha("Nº doc", docNo, { font: "PlexMono", fontSize: 6.2, characterSpacing: 0.2 }),
          ],
          margin: [0, 15, 0, 0],
        },
        // FOLHA grande (página / total). Margens apertadas de propósito: o
        // número de 21pt tem caixa de linha alta — "A4 · S/ ESC." precisa
        // sobrar folga da borda de baixo (ajuste fino do dono, 30/07)
        {
          stack: [
            { ...carLbl("Folha"), alignment: "center", margin: [0, 5, 0, 0] },
            {
              text: [
                { text: String(current).padStart(2, "0"), font: "PlexMono", bold: true, fontSize: 19, color: PRINT.ink, characterSpacing: -0.5 },
                { text: ` /${total}`, font: "PlexMono", bold: true, fontSize: 8, color: PRINT.dim },
              ],
              alignment: "center",
              lineHeight: 1,
              margin: [0, 2, 0, 1.5],
            },
            { text: "A4 · S/ ESC.", font: "PlexMono", fontSize: 4.6, characterSpacing: 0.6, color: PRINT.dim, alignment: "center", lineHeight: 1 },
          ],
        },
      ]],
    },
    layout: {
      hLineWidth: () => 1.2,
      vLineWidth: () => 0.7,
      hLineColor: () => PRINT.ink,
      vLineColor: () => PRINT.ink,
      paddingLeft: () => 0, paddingRight: () => 0, paddingTop: () => 0, paddingBottom: () => 0,
    },
  });

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    // fundo maior embaixo: é a faixa do carimbo (a prancha come ~50 pt a mais)
    pageMargins: [40, 36, 40, BOT],
    // Logos por NOME no dicionário `images` — nunca dataURL inline nos nós:
    // a chave nomeada é estável entre passadas de layout (o pageBreakBefore
    // re-layouta N vezes) e entre páginas, então o PDF embute a imagem UMA vez.
    // Inline, cada medição registrava um $$pdfmake$$ novo — caderno real foi de
    // 236 KB pra 1,4 MB (75 embeds do mesmo logo) antes deste dicionário.
    images: {
      ...(logo ? { marcaLedlab: logo } : {}),
      ...(logoProjeto ? { logoProjeto } : {}),
      ...Object.fromEntries(cards.map((c) => [`tc_${c.telaId}`, c.url])),
    },
    defaultStyle: { font: "PlexSans", fontSize: 9, color: PRINT.ink, lineHeight: 1.25 },
    info: { title: `${project.name || "Projeto"} — Caderno Técnico (${tipo})`, author: "LedLab Core" },
    // página 1 = fundo da capa; demais = a MOLDURA da prancha (o carimbo fecha
    // a caixa por dentro, no footer)
    background: (page, pageSize) => (page === 1
      ? { canvas: [{ type: "rect", x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: COVER_BG }] }
      : { canvas: [{ type: "rect", x: FR, y: FR, w: pageSize.width - 2 * FR, h: pageSize.height - 2 * FR, lineWidth: 1.4, lineColor: PRINT.ink }] }),
    // rodapé em TODA página (menos a capa): o CARIMBO da prancha
    footer: (current, total) => (current === 1 ? null : carimbo(current, total)),
    content: (() => {
      const secoes = [visaoGeral, video, conteudoSecao, cardsSecao, eletrica, sinal, ac, cabos, estrutura, criterios, gloss].filter((s) => s.length);
      // SUMÁRIO (só no Completo): página própria logo após a capa, com número de
      // página por seção (o pdfmake resolve num 2º passe de layout) — as entradas
      // coloridas por disciplina vêm dos marcadores plantados pelo sectionHead
      const sumario = tipo === "Completo" && secoes.length > 1 ? [
        { text: "SUMÁRIO", bold: true, fontSize: 12, color: PRINT.ink, characterSpacing: 0.3, margin: [0, 14, 0, 2] },
        { text: "CONTEÚDO DO CADERNO", fontSize: 7, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 0, 0, 4] },
        { canvas: [{ type: "line", x1: 0, y1: 0, x2: 762, y2: 0, lineWidth: 1.2, lineColor: PRINT.ink }], margin: [0, 0, 0, 12] },
        { toc: { numberStyle: { bold: true, color: PRINT.acc, font: "PlexMono", fontSize: 9.5 } } },
      ] : [];
      // UM TÓPICO POR PÁGINA (manual §10.6): toda seção marca headlineLevel e a
      // quebra real é decidida pelo pageBreakBefore (só quebra se a página atual
      // tem conteúdo) — ver comentário do `bloco`. Com sumário, a 1ª seção também
      // quebra (o sumário ocupa a página pós-capa); sem, a 1ª já nasce em página
      // limpa depois do "after" da capa e o pageBreakBefore não dispara nela.
      secoes.slice(sumario.length ? 0 : 1).forEach((s) => { s[0] = { ...s[0], headlineLevel: 1 }; });
      return [...capa, ...sumario, ...secoes.flat()];
    })(),
    // Quebra condicional: nó marcado (headlineLevel 1 = início de seção/bloco)
    // quebra SÓ quando a página atual já tem conteúdo — nunca nasce página vazia.
    // Assinatura do pdfmake atual: (nodeInfo, { getPreviousNodesOnPage, ... }) —
    // getters preguiçosos, NÃO os quatro arrays posicionais da doc antiga.
    pageBreakBefore: (cur, ctx) =>
      cur.headlineLevel === 1 && ((ctx && ctx.getPreviousNodesOnPage ? ctx.getPreviousNodesOnPage() : []) || []).length > 0,
  };
}




