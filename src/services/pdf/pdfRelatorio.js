// services/pdf/pdfRelatorio.js — monta a docDefinition do Caderno Técnico pro
// motor pdfmake. F1 (MVP): capa Folha Técnica + Visão Geral + Informações
// Elétricas + rodapé "PÁG X DE Y" em toda página.
//
// PURO de propósito: (dados do projeto) → objeto docDefinition — testável sem
// pdfmake. O motor pesado (pdfmake + fontes) mora no pdfEngine.js, carregado
// preguiçoso só na hora de exportar. Leis do papel: manual §10 (oliva, zebra,
// mono nos dados, aviso laranja).
import { PRINT } from "../../ui/tokens.js";
import { aggregateElectrical, projectRollup, screenRollup } from "../projectCalc.js";
import { formatRange } from "../dates.js";

// cores da CAPA (Folha Técnica — a única área lime do papel; manual §2.4)
const LIME = "#ebf51e";
const COVER_BG = "#fafaf7";
const COVER_INK = "#14140e";
const HAIR = "#dad9d0";
const ZEBRA = "#f8f8f8";

const fmtPeso = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`);
const mono = (text, extra = {}) => ({ text, font: "Courier", ...extra });

// ── layout de tabela com ZEBRA (manual §10.3) ──
const zebraLayout = {
  hLineWidth: (i) => (i === 1 ? 1.2 : 0.4),
  hLineColor: (i) => (i === 1 ? PRINT.ink : PRINT.line),
  vLineWidth: () => 0,
  fillColor: (row) => (row > 0 && row % 2 === 0 ? ZEBRA : null),
  paddingTop: () => 3.5,
  paddingBottom: () => 3.5,
  paddingLeft: () => 6,
  paddingRight: () => 6,
};

// pdfmake não tem text-transform: o caps do cabeçalho entra aqui (paridade com o DOM)
const th = (text, align = "left") => ({ text: text.toUpperCase(), bold: true, fontSize: 7, color: PRINT.dim, characterSpacing: 0.6, alignment: align, margin: [0, 2, 0, 2] });

// cabeçalho de seção: badge numerado colorido + título + tag (como no Caderno DOM)
function sectionHead(n, titulo, tag, cor) {
  return {
    margin: [0, 14, 0, 8],
    columns: [
      {
        width: "auto",
        table: { body: [[{ text: String(n).padStart(2, "0"), bold: true, color: "#ffffff", fontSize: 10, font: "Courier", margin: [4, 2, 4, 2] }]] },
        layout: { hLineWidth: () => 0, vLineWidth: () => 0, fillColor: () => cor, paddingLeft: () => 2, paddingRight: () => 2, paddingTop: () => 0, paddingBottom: () => 0 },
      },
      { width: "auto", text: titulo.toUpperCase(), bold: true, fontSize: 12, color: PRINT.ink, margin: [8, 2, 0, 0], characterSpacing: 0.3 },
      { width: "*", text: tag.toUpperCase(), fontSize: 7, color: PRINT.dim, alignment: "right", characterSpacing: 0.8, margin: [0, 6, 0, 0] },
    ],
  };
}

// linha rotulada da capa (label mono caps + valor), com hairline entre linhas
const coverRow = (label, value, { bold = false, first = false } = {}) => ({
  margin: [0, 0, 0, 0],
  stack: [
    ...(first ? [] : [{ canvas: [{ type: "line", x1: 0, y1: 0, x2: 300, y2: 0, lineWidth: 0.6, lineColor: HAIR }], margin: [0, 5, 0, 5] }]),
    { text: label.toUpperCase(), font: "Courier", fontSize: 7, bold: true, characterSpacing: 1.1, color: "#8d8b7e" },
    { text: value || "—", fontSize: 13, bold, color: COVER_INK, margin: [0, 2, 0, 0] },
  ],
});

export function buildRelatorioDoc({ project, tipo = "Completo", cfg, logo, gerado }) {
  const telas = project.telas || [];
  const roll = projectRollup(project);
  const agg = aggregateElectrical(project, cfg);
  const docNo = (project.name || "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 22) || "—";
  const dataEvento = formatRange(project.inicio, project.fim);

  // ── CAPA (Folha Técnica) ──
  const fields = [
    ["Cliente", project.cliente],
    ["Local", project.local],
    ["Status", project.status],
    ["Data de realização", dataEvento],
  ];
  const stats = [
    ["Área", `${roll.area_m2.toFixed(1)} m²`],
    ["Peso", fmtPeso(roll.peso_kg)],
    ["Pico", `${Math.round(parseFloat(agg.kVA))} kVA`],
    ["Gerador", `~${Math.round(parseFloat(agg.gerador))} kVA`],
  ];
  const capa = [
    {
      columns: [
        { width: "*", text: [{ text: ` CADERNO TÉCNICO · ${tipo.toUpperCase()} `, font: "Courier", bold: true, fontSize: 9, characterSpacing: 1.8, color: COVER_INK, background: LIME }], margin: [0, 6, 0, 0] },
        ...(logo ? [{ width: 54, image: logo, fit: [54, 54] }] : []),
      ],
    },
    { text: project.name || "Sem nome", fontSize: 58, bold: true, characterSpacing: -1.2, color: COVER_INK, margin: [0, 26, 0, 0] },
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
            { text: [{ text: "Nº " }, { text: docNo, bold: true, color: COVER_INK }, { text: " · Rev " }, { text: "A", bold: true, color: COVER_INK }, { text: gerado ? ` · Gerado em ${gerado}` : "" }], font: "Courier", fontSize: 7.5, color: "#6c6a5d" },
            { text: [{ text: "LEDLAB CORE", bold: true, color: COVER_INK }, { text: " · ENGENHARIA DE LED", color: "#9b998c" }], font: "Courier", fontSize: 7.5, alignment: "right", characterSpacing: 0.5 },
          ],
        },
      ],
      pageBreak: "after",
    },
  ];

  // ── 01 · VISÃO GERAL ──
  const rowsVG = telas.map((t) => {
    const r = screenRollup(t);
    return [
      { text: t.nome, bold: true },
      mono(`${r.dim.largura_m.toFixed(1)}×${r.dim.altura_m.toFixed(1)} m`),
      mono(`${t.cols}×${t.rows}`),
      { text: t.gabinete?.nome || "—" },
      mono(String(r.gab), { alignment: "right" }),
      mono(fmtPeso(r.peso_kg), { alignment: "right" }),
      mono(`${(r.pwrMax_w / 1000).toFixed(1)} kW`, { alignment: "right", color: PRINT.red }),
    ];
  });
  const visaoGeral = [
    sectionHead(1, "Visão Geral", "Composição do painel", "#475569"),
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "*", "auto", "auto", "auto"],
        body: [
          [th("Tela"), th("Dimensão"), th("Grade"), th("Modelo"), th("Gabinetes", "right"), th("Peso", "right"), th("Carga", "right")],
          ...rowsVG,
          [
            { text: "Total", bold: true }, mono(`${roll.area_m2.toFixed(1)} m²`, { bold: true }), "", "",
            mono(String(roll.gab), { alignment: "right", bold: true }), mono(fmtPeso(roll.peso_kg), { alignment: "right", bold: true }),
            mono(`${(roll.pwrMax_w / 1000).toFixed(1)} kW`, { alignment: "right", bold: true, color: PRINT.red }),
          ],
        ],
      },
      layout: zebraLayout,
    },
  ];

  // ── 02 · INFORMAÇÕES ELÉTRICAS ──
  const rowsEl = agg.perTela.map(({ tela, gab, peak, typ }) => [
    { text: tela.nome, bold: true },
    mono(String(gab), { alignment: "right" }),
    mono((peak.W / 1000).toFixed(1), { alignment: "right", color: PRINT.red }),
    mono(String(peak.kVA), { alignment: "right" }),
    mono(String(peak.I), { alignment: "right", color: PRINT.amb }),
    mono(`${peak.breaker} A`, { alignment: "right", color: PRINT.red, bold: true }),
    mono(String(typ.kVA), { alignment: "right" }),
    mono(String(typ.I), { alignment: "right" }),
  ]);
  const eletrica = [
    sectionHead(2, "Informações Elétricas", "Energia · dimensionamento", "#c2410c"),
    { text: [{ text: `Dimensionamento em ${agg.vc.label}. ` }, { text: "A potência de pico define o disjuntor e a bitola dos cabos; a típica (consumo médio em operação) estima o gerador.", color: PRINT.mut }], fontSize: 8.5, margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
        body: [
          [th("Tela"), th("Gab.", "right"), th("Pico kW", "right"), th("Pico kVA", "right"), th("Pico A", "right"), th("Disjuntor", "right"), th("Típico kVA", "right"), th("Típico A", "right")],
          ...rowsEl,
          [
            { text: "Total", bold: true }, mono(String(roll.gab), { alignment: "right", bold: true }),
            mono((agg.W / 1000).toFixed(1), { alignment: "right", bold: true, color: PRINT.red }),
            mono(String(agg.kVA), { alignment: "right", bold: true }),
            mono(String(agg.I), { alignment: "right", bold: true, color: PRINT.amb }),
            mono(`${agg.breaker} A`, { alignment: "right", bold: true, color: PRINT.red }),
            mono(String(agg.typKva), { alignment: "right", bold: true }),
            mono(String(agg.typI), { alignment: "right", bold: true }),
          ],
        ],
      },
      layout: zebraLayout,
    },
    { text: [{ text: "Gerador sugerido (típico + 25% de margem): " }, { text: `~${agg.gerador} kVA`, bold: true, color: PRINT.acc }], fontSize: 8.5, margin: [0, 6, 0, 0] },
    {
      margin: [0, 6, 0, 0],
      table: {
        widths: ["*"],
        body: [[{
          stack: [
            mono("Típico por gabinete = base + (pico − base) × brilho × conteúdo", { fontSize: 8.5, color: PRINT.ink, margin: [0, 0, 0, 3] }),
            { text: `O consumo real fica entre tela preta (base) e branco pleno (pico); o brilho calibrado (${Math.round(agg.brilho * 100)}%) e o conteúdo médio do vídeo (${Math.round(agg.conteudo * 100)}%) escalam só a parcela dinâmica. Modelo baseado no estudo de consumo de painéis de LED da Barco.`, fontSize: 7.5, color: PRINT.mut },
          ],
          margin: [8, 6, 8, 6],
        }]],
      },
      layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => PRINT.line, vLineColor: () => PRINT.line, fillColor: () => PRINT.head },
    },
  ];

  return {
    pageSize: "A4",
    pageOrientation: "landscape",
    pageMargins: [40, 36, 40, 44],
    defaultStyle: { font: "Helvetica", fontSize: 9, color: PRINT.ink, lineHeight: 1.25 },
    info: { title: `${project.name || "Projeto"} — Caderno Técnico (${tipo})`, author: "LedLab Core" },
    // capa com fundo próprio (página 1 apenas)
    background: (page, pageSize) => (page === 1 ? { canvas: [{ type: "rect", x: 0, y: 0, w: pageSize.width, h: pageSize.height, color: COVER_BG }] } : null),
    // rodapé em TODA página (menos a capa): carimbo + PÁG X DE Y
    footer: (current, total) => (current === 1 ? null : {
      margin: [40, 14, 40, 0],
      columns: [
        { text: `${docNo} · REV A${gerado ? ` · GERADO EM ${gerado.toUpperCase()}` : ""}`, font: "Courier", fontSize: 6.5, color: PRINT.dim, characterSpacing: 0.5 },
        { text: `PÁG ${current} DE ${total}`, font: "Courier", fontSize: 6.5, bold: true, color: PRINT.acc, alignment: "right", characterSpacing: 0.8 },
      ],
    }),
    content: [...capa, ...visaoGeral, ...eletrica],
  };
}
