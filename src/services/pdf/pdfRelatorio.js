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
import { screenMapSvg, telaMapSvg, telasLayoutSvg } from "./pdfCableMap.js";
import { formatRange } from "../dates.js";
import { GLOSSARIO, CRITERIOS, NORMAS, REFERENCIAS, AVISO_AC, DISC, STATUS_LABEL, fmtPeso, fmtFases, portLabel, videoOf } from "../reportContent.js";
import { acTone, voltFull, phaseOf, phaseBalance } from "../electricalCalc.js";

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
const statRow = (items) => ({
  columns: items.map(([l, v]) => ({
    width: "auto",
    stack: [
      { text: String(l).toUpperCase(), fontSize: 7.5, color: PRINT.dim, characterSpacing: 0.8 },
      { text: String(v), bold: true, fontSize: 19, color: PRINT.ink, margin: [0, 2, 0, 0] },
    ],
  })),
  columnGap: 34,
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
export function buildRelatorioDoc({ project, tipo = "Completo", cfg, logo, logoProjeto = null, assinatura = "", gerado, numbering = "row-tb-lr", palette, render }) {
  const pal = Array.isArray(palette) && palette.length ? palette : PALETTE;
  const colorOf = (i) => pal[(((i | 0) % pal.length) + pal.length) % pal.length];
  // render do mapa (setas/números/tamanho/canto) — mesmas prefs do DOM
  const cr = { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl", ...(render || {}) };
  // célula "porta/cabo": quadradinho na cor do cabo + número (paridade com o selo do DOM)
  const portCell = (idx, label) => ({
    columns: [
      { width: 9, canvas: [{ type: "rect", x: 0, y: 1.5, w: 7, h: 7, color: colorOf(idx) }] },
      { width: "auto", ...mono(String(label)) },
    ],
    columnGap: 2,
  });

  // tabela densa de portas: divide em grupos lado a lado (como o DenseTable do
  // DOM) — todas as linhas, na fração da altura; zebra contínua. Acima de 36
  // linhas entra a 5ª coluna, pro bloco de uma Screen grande caber numa página.
  function densePortTable(rows, columns) {
    // Nº de grupos lado a lado: a CONTAGEM DE LINHAS pede mais grupos (>24 → 5,
    // >60 → 6), mas a LARGURA manda por último — grupos são columns "auto" que o
    // pdfmake NÃO encolhe: um grupo do AC com Fase mede ~160 pt (chip + FASE +
    // GAB. + carga noWrap a fonte 8), então 4 colunas/grupo → máx 4 grupos em
    // 762 pt úteis (5 já estoura; caderno real 31/07: grupo dos cabos 55-64
    // inteiro pra fora da folha). Com 3 colunas (sinal, AC sem fase) o grupo é
    // ~100 pt → até 6. O excedente vertical FLUI com o header repetindo.
    const desired = rows.length > 60 ? 6 : rows.length > 24 ? 5 : 4;
    const maxByWidth = columns.length >= 4 ? 4 : 6;
    const nCols = Math.min(desired, maxByWidth, rows.length);
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
    if (nCols <= 1 || rows.length < 3) return build(rows, 0);
    const base = Math.floor(rows.length / nCols), rem = rows.length % nCols;
    const groups = []; let idx = 0;
    for (let i = 0; i < nCols; i++) { const size = base + (i < rem ? 1 : 0); groups.push(build(rows.slice(idx, idx + size), idx)); idx += size; }
    return { columns: groups, columnGap: small ? 8 : 12 };
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
  // specs de configuração de uma Screen (o que o operador precisa no processador)
  const screenSpec = (s) => {
    const scr = screensById[s.id];
    const g = (scr?.telaIds || []).map((id) => telas.find((t) => t.id === id)).filter(Boolean)[0]?.gabinete;
    const resX = parseFloat(g?.resX) || 128, resY = parseFloat(g?.resY) || 128;
    return { resX, resY, cols: Math.round(s.size.w / resX), rows: Math.round(s.size.h / resY), hz: parseFloat(scr?.sinal?.hz) || 60, overclock: scr?.sinal?.overclock === true };
  };
  let secN = 0; const sec = () => ++secN; // numera as seções exibidas, na ordem

  // ── CAPA (Folha Técnica) ──
  const fields = [
    ["Cliente", project.cliente],
    ["Local", project.local],
    ["Status", STATUS_LABEL[project.status] || project.status],
    ["Data de realização", dataEvento],
  ];
  const stats = [
    ["Área", `${roll.area_m2.toFixed(1)} m²`],
    ["Peso", fmtPeso(roll.peso_kg)],
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
            [th("Tela"), th("Dimensão"), th("Grade"), th("Resolução (px)"), th("Modelo"), th("Gabinetes", "right"), th("Peso", "right"), th(showElec ? "Carga" : "Peso por gabinete", "right")],
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
  const video = !showVideo ? [] : [
    sectionHead(sec(), "Vídeo / Resolução", "Sinal e proporção", DISC.video),
    { text: "As telas na disposição da Composição (nome de cada uma no seu bloco); a caixa envolvente é o canvas de conteúdo do projeto.", fontSize: 8.5, color: PRINT.mut, margin: [0, 0, 0, 6] },
    ...(fila ? [
      { svg: fila.svg, width: fila.width, margin: [0, 0, 0, 4] },
      { text: [{ text: "Canvas de conteúdo (caixa envolvente) — " }, { text: `${ptBR(fila.linW)} × ${ptBR(fila.linH)} px`, bold: true, color: PRINT.ink }], fontSize: 8, color: PRINT.dim, margin: [0, 0, 0, 8] },
    ] : []),
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto", "auto"],
        body: [
          [th("Tela"), th("Resolução (px)"), th("Aspecto"), th("Fração"), th("Grade"), th("Pixel por gabinete", "right")],
          ...telas.map((t) => {
            const v = videoOf(t);
            return [
              { text: t.nome, bold: true },
              mono(`${ptBR(v.pxW)} × ${ptBR(v.pxH)}`, { bold: true }),
              mono(v.ar, { color: PRINT.acc, bold: true }),
              mono(String(v.dec).replace(".", ",")),
              mono(`${t.cols}×${t.rows}`),
              mono(t.gabinete?.resX && t.gabinete?.resY ? `${t.gabinete.resX}×${t.gabinete.resY}` : "—", { alignment: "right" }),
            ];
          }),
        ],
      },
      layout: zebraLayout(),
    },
  ];

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
        { text: "Cabos de dados organizados por Screen — cada sistema abre na própria página, com o mapa e a tabela de portas.", fontSize: 9, color: PRINT.mut, margin: [0, 0, 0, 10] },
        statRow([
          ["Screens", screenReport.length],
          ["Telas", totTelas],
          ["Cabos de sinal", totCabos],
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
                  mono(`${ptBR(s.size.w)} × ${ptBR(s.size.h)} px`),
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
          // Screen com muitas portas: mapa mais baixo — o espaço vai pra tabela
          const mapa = screensById[s.id] ? screenMapSvg(screensById[s.id], telas, "sinal", numbering, colorOf, cr, s.ports.length > 48 ? { maxHeight: 100 } : s.ports.length > 36 ? { maxHeight: 130 } : undefined) : null;
          return bloco([
            subHead(`${S}.${i + 1}`, s.nome),
            specBox([
              ["Resolução da Screen", `${ptBR(s.size.w)} × ${ptBR(s.size.h)} px`],
              ["Frequência", `${sp.hz} Hz`],
              ["Gabinete", `${sp.resX} × ${sp.resY} px`],
              ["Grade da Screen", `${sp.cols} × ${sp.rows} gabinetes`],
              ["Total de cabos", String(s.ports.length)],
              // premissa declarada: passar do nominal foi ESCOLHA (documento datado)
              ...(sp.overclock ? [["Overclock", "ligado"]] : []),
            ]),
            ...mapNode(mapa),
            densePortTable(s.ports, [
              { label: "Porta", cell: (p) => portCell(p.n - 1, p.n) },
              { label: "Gab.", align: "right", cell: (p) => mono(String(p.count), { alignment: "right" }) },
              // laranja = overclock (acima do nominal por escolha); vermelho = estouro real
              { label: "Uso", align: "right", cell: (p) => mono(`${p.pct}%`, { alignment: "right", bold: true, color: p.over ? PRINT.red : p.oc ? PRINT.amb : PRINT.ink }) },
            ]),
          ]);
        }),
      ];
    }
    const portasDe = Object.fromEntries(telas.map((t) => [t.id, cablePorts(t, "sinal", numbering).length]));
    const totPortas = telas.reduce((n, t) => n + portasDe[t.id], 0);
    return [
      // ── página de ABERTURA da seção (modo legado, por tela) ──
      head,
      { text: "Portas de dados por tela — régua de pixels reais (processadores VX/série A/Colorlight) ou de área retangular (controlador básico), conforme a configuração da tela. Cada tela abre na própria página.", fontSize: 9, color: PRINT.mut, margin: [0, 0, 0, 10] },
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
        const mapa = telaMapSvg(t, "sinal", numbering, off, colorOf, cr);
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
            densePortTable(rows, [
              { label: "Porta", cell: (p) => portCell(p.idx, p.n) },
              { label: "Gab.", align: "right", cell: (p) => mono(String(p.count), { alignment: "right" }) },
              { label: "Uso", align: "right", cell: (p) => mono(`${p.pct}%`, { alignment: "right", bold: true, color: p.pct > 100 ? PRINT.red : PRINT.ink }) },
            ]),
          ]),
          ...(tipo === "Mapa de cabos" ? [
            { text: "Mapa de pixels — coordenada do 1º gabinete de cada porta (origem no canto superior-esquerdo) para transcrever no processador (NovaLCT / Tessera).", fontSize: 8, color: PRINT.mut, margin: [0, 6, 0, 3] },
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
        { text: `Cabos de energia por Screen, na mesma organização do sinal — carga por cabo × corrente do conector. Cada sistema abre na própria página, com circuitos numerados 1..N${phaseOf(1, agg.vc) ? `; a fase segue o rodízio (cabo 1→${phaseOf(1, agg.vc)}, 2→${phaseOf(2, agg.vc)}, 3→${phaseOf(3, agg.vc)}…), reiniciando a cada Screen` : ""}.`, fontSize: 9, color: PRINT.mut, margin: [0, 0, 0, 10] },
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
          // Screen com muitos cabos: mapa mais baixo — o espaço vai pra tabela
          // (senão o bloco estoura pra 2ª página; folhas 14-18 do caderno real).
          // Acima de 48 cabos o teto de 4 grupos deixa a tabela com 13+ linhas —
          // o mapa desce mais um degrau pra folha continuar fechando em UMA.
          const mapa = screensById[s.id] ? screenMapSvg(screensById[s.id], telas, "ac", numbering, colorOf, cr, s.ports.length > 48 ? { maxHeight: 100 } : s.ports.length > 36 ? { maxHeight: 130 } : undefined) : null;
          const bal = phaseBalance(s.ports, agg.vc);
          return bloco([
            subHead(`${S}.${i + 1}`, s.nome),
            specBox([
              ["Circuitos", String(s.ports.length)],
              ["Maior carga por cabo", `${cargaMax(s.ports).load.toFixed(1)} A · ${cargaMax(s.ports).pct}%`],
              ["Gabinetes", String(s.ports.reduce((n, p) => n + p.count, 0))],
              ...(bal.temRodizio ? [["Carga por fase", fmtFases(bal)]] : []),
            ]),
            ...mapNode(mapa),
            densePortTable(s.ports, [
              { label: "Cabo", cell: (p) => portCell(p.n - 1, p.n) },
              ...(bal.temRodizio ? [{ label: "Fase", cell: (p) => mono(phaseOf(p.n, agg.vc), { bold: true }) }] : []),
              { label: "Gab.", align: "right", cell: (p) => mono(String(p.count), { alignment: "right" }) },
              { label: "Carga", align: "right", cell: (p) => mono(`${p.load.toFixed(1)}A ${p.pct}%`, { alignment: "right", bold: true, noWrap: true, color: p.over ? PRINT.red : p.warn ? PRINT.amb : PRINT.ink }) },
            ]),
          ]);
        }),
      ];
    }
    const cabosDe = Object.fromEntries(telas.map((t) => [t.id, cablePorts(t, "ac", numbering).length]));
    const totCabosAc = telas.reduce((n, t) => n + cabosDe[t.id], 0);
    return [
      // ── página de ABERTURA da seção (modo legado, por tela) ──
      ...head,
      { text: "Cabos de energia por tela: quantidade, capacidade do conector e carga por cabo. Cada tela abre na própria página.", fontSize: 9, color: PRINT.mut, margin: [0, 0, 0, 10] },
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
        const mapa = telaMapSvg(t, "ac", numbering, off, colorOf, cr);
        const temFase = phaseOf(1, agg.vc) != null;
        return bloco([
          subHead(`${S}.${i + 1}`, t.nome),
          specBox([
            ["Cabos", portLabel(off, ports.length, "cabo")],
            ["Máx por cabo", `${acBudget} gabinetes`],
            ["Corrente", `${ampCab.toFixed(2)} A/gabinete`],
            ["Conector", `${connRating} A`],
          ]),
          ...mapNode(mapa),
          densePortTable(rows, [
            { label: "Cabo", cell: (p) => portCell(p.idx, p.n) },
            ...(temFase ? [{ label: "Fase", cell: (p) => mono(phaseOf(p.n, agg.vc), { bold: true }) }] : []),
            { label: "Gab.", align: "right", cell: (p) => mono(String(p.count), { alignment: "right" }) },
            { label: "Carga", align: "right", cell: (p) => mono(`${p.load.toFixed(1)}A ${p.pct}%`, { alignment: "right", bold: true, noWrap: true, color: acTone(p.pct) === "over" ? PRINT.red : acTone(p.pct) === "warn" ? PRINT.amb : PRINT.ink }) },
          ]),
        ]);
      }),
    ];
  })();

  // ── CRITÉRIOS DE CÁLCULO (normas + referências) — folha antes do Glossário ──
  // Pedido do dono (31/07): o caderno declara COMO os números foram calculados,
  // em que normas se apoia e quais fontes sustentam o motor. Conteúdo em
  // reportContent.js (compartilhado com o DOM); mesmo gate do glossário.
  const criterios = !showGloss ? [] : [
    sectionHead(sec(), "Critérios de Cálculo", "Normas e referências", DISC.elec),
    {
      columnGap: 26,
      columns: [
        {
          width: "*",
          stack: [
            { text: "COMO OS NÚMEROS SÃO CALCULADOS", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 0, 0, 5] },
            ...CRITERIOS.flatMap((g) => [
              { text: g.h, bold: true, fontSize: 9.5, color: PRINT.ink, margin: [0, 3, 0, 2] },
              // [...itens]: o pdfmake MUTA o array do `ul` (troca string por nó
              // com positions/_inlines) — passar o array compartilhado quebrava
              // o Caderno DOM depois de gerar um PDF (React: "Objects are not
              // valid as a child"). Clonar na fronteira é obrigatório.
              { ul: [...g.itens], fontSize: 8, color: PRINT.mut, lineHeight: 1.3, margin: [0, 0, 0, 4], markerColor: PRINT.dim },
            ]),
          ],
        },
        {
          width: "*",
          stack: [
            { text: "NORMAS E PRÁTICAS ADOTADAS", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 0, 0, 5] },
            ...NORMAS.flatMap(([n, d]) => [
              { text: n, bold: true, fontSize: 9.5, color: PRINT.ink, margin: [0, 3, 0, 1] },
              { text: d, fontSize: 8, color: PRINT.mut, lineHeight: 1.3, margin: [0, 0, 0, 3] },
            ]),
            { text: "REFERÊNCIAS", fontSize: 7, bold: true, color: PRINT.dim, characterSpacing: 0.8, margin: [0, 10, 0, 5] },
            { ul: [...REFERENCIAS], fontSize: 8, color: PRINT.mut, lineHeight: 1.3, markerColor: PRINT.dim }, // clone: ver nota acima
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
      const secoes = [visaoGeral, video, eletrica, sinal, ac, criterios, gloss].filter((s) => s.length);
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




