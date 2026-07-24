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
import { hasScreens, projectScreenReport, telasSemScreen } from "../screenCabling.js";
import { pixelMapPorts } from "../pixelMap.js";
import { formatRange } from "../dates.js";
import { GLOSSARIO, AVISO_AC, DISC, STATUS_LABEL, fmtPeso, portLabel, videoOf } from "../reportContent.js";

// cores da CAPA (Folha Técnica — a única área lime do papel; manual §2.4)
const LIME = "#ebf51e";
const COVER_BG = "#fafaf7";
const COVER_INK = "#14140e";
const HAIR = "#dad9d0";
const ZEBRA = "#f8f8f8";

const mono = (text, extra = {}) => ({ text, font: "Courier", ...extra });
const ptBR = (n) => (n || 0).toLocaleString("pt-BR");

// ── layout de tabela com ZEBRA (manual §10.3) ──
// `start` = índice global da 1ª linha do grupo: tabelas divididas em colunas
// lado a lado mantêm a alternância contínua (como o DenseTable do DOM)
const zebraLayout = (start = 0) => ({
  hLineWidth: (i) => (i === 1 ? 1.2 : 0.4),
  hLineColor: (i) => (i === 1 ? PRINT.ink : PRINT.line),
  vLineWidth: () => 0,
  fillColor: (row) => (row > 0 && (start + row - 1) % 2 === 1 ? ZEBRA : null),
  paddingTop: () => 3.5,
  paddingBottom: () => 3.5,
  paddingLeft: () => 6,
  paddingRight: () => 6,
});

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

// sub-cabeçalho de subdivisão ("04.1 · Screen 1") com meta à direita
function subHead(num, title, right) {
  return {
    margin: [0, 8, 0, 4],
    columns: [
      { width: "*", text: [{ text: num, bold: true, color: PRINT.acc, fontSize: 9.5 }, { text: `  ${title}`, bold: true, fontSize: 11, color: PRINT.ink }] },
      ...(right ? [{ width: "auto", text: right, fontSize: 7.5, color: PRINT.dim, alignment: "right", margin: [0, 3, 0, 0] }] : []),
    ],
  };
}

// box de especificações (fundo neutro) — pares rótulo/valor numa linha corrida
function specBox(pairs) {
  const parts = [];
  pairs.forEach(([l, v], i) => {
    if (i) parts.push({ text: "   ·   ", color: PRINT.line });
    parts.push({ text: `${l} `, color: PRINT.mut }, { text: v, bold: true, color: PRINT.ink });
  });
  return {
    margin: [0, 0, 0, 6],
    table: { widths: ["*"], body: [[{ text: parts, fontSize: 8.5, margin: [8, 5, 8, 5] }]] },
    layout: { hLineWidth: () => 0.6, vLineWidth: () => 0.6, hLineColor: () => PRINT.line, vLineColor: () => PRINT.line, fillColor: () => PRINT.head },
  };
}

// box de AVISO de segurança (manual: aviso é LARANJA) — borda forte + título caps
function warnBox({ titulo, partes }) {
  return {
    margin: [0, 0, 0, 8],
    table: {
      widths: ["*"],
      body: [[{
        stack: [
          { text: titulo.toUpperCase(), bold: true, color: PRINT.amb, fontSize: 8.5, characterSpacing: 0.5, margin: [0, 0, 0, 3] },
          { text: partes.map((p) => ({ text: p.t, bold: !!p.b })), fontSize: 9, color: PRINT.ink, lineHeight: 1.3 },
        ],
        margin: [10, 7, 10, 7],
      }]],
    },
    layout: { hLineWidth: () => 1.5, vLineWidth: () => 1.5, hLineColor: () => PRINT.amb, vLineColor: () => PRINT.amb, fillColor: () => "#fffbeb" },
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

export function buildRelatorioDoc({ project, tipo = "Completo", cfg, logo, gerado, numbering = "row-tb-lr", palette }) {
  const pal = Array.isArray(palette) && palette.length ? palette : PALETTE;
  const colorOf = (i) => pal[(((i | 0) % pal.length) + pal.length) % pal.length];
  // célula "porta/cabo": quadradinho na cor do cabo + número (paridade com o selo do DOM)
  const portCell = (idx, label) => ({
    columns: [
      { width: 9, canvas: [{ type: "rect", x: 0, y: 1.5, w: 7, h: 7, color: colorOf(idx) }] },
      { width: "auto", ...mono(String(label)) },
    ],
    columnGap: 2,
  });

  // tabela densa de portas: divide em até 4 grupos lado a lado (como o DenseTable
  // do DOM) — todas as linhas, na metade/quarto da altura; zebra contínua
  function densePortTable(rows, columns) {
    const build = (slice, start) => ({
      table: {
        headerRows: 1,
        widths: columns.map((c) => c.width || "auto"),
        body: [columns.map((c) => th(c.label, c.align)), ...slice.map((r, i) => columns.map((c) => c.cell(r, start + i)))],
      },
      layout: zebraLayout(start),
      width: "*",
    });
    const nCols = Math.min(4, rows.length);
    if (nCols <= 1 || rows.length < 3) return build(rows, 0);
    const base = Math.floor(rows.length / nCols), rem = rows.length % nCols;
    const groups = []; let idx = 0;
    for (let i = 0; i < nCols; i++) { const size = base + (i < rem ? 1 : 0); groups.push(build(rows.slice(idx, idx + size), idx)); idx += size; }
    return { columns: groups, columnGap: 14 };
  }

  const telas = project.telas || [];
  const roll = projectRollup(project);
  const agg = aggregateElectrical(project, cfg);
  const docNo = (project.name || "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 22) || "—";
  const dataEvento = formatRange(project.dataInicio, project.dataFim);

  // mesmos filtros de seção por TIPO do Caderno DOM
  const showElec = ["Completo", "Resumido", "Elétrico"].includes(tipo);
  const showPhys = ["Completo", "Resumido", "Estrutural", "Gabinetes", "Design"].includes(tipo);
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
    return { resX, resY, cols: Math.round(s.size.w / resX), rows: Math.round(s.size.h / resY), hz: parseFloat(scr?.sinal?.hz) || 60 };
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
        { width: "*", text: [{ text: ` CADERNO TÉCNICO · ${tipo.toUpperCase()} `, font: "Courier", bold: true, fontSize: 9, characterSpacing: 1.8, color: COVER_INK, background: LIME }], margin: [0, 6, 0, 0] },
        ...(logo ? [{ width: 54, image: logo, fit: [54, 54] }] : []),
      ],
    },
    // LLC-01: o título auto-encolhe pra caber numa linha — nome de 40+ caracteres
    // não empurra a capa nem vaza pra uma página em branco (~1385 ≈ largura útil
    // da paisagem ÷ avanço médio da Helvetica bold, em pt por caractere)
    { text: project.name || "Sem nome", fontSize: Math.max(24, Math.min(58, Math.floor(1385 / Math.max((project.name || "Sem nome").length, 1)))), bold: true, characterSpacing: -1.2, color: COVER_INK, margin: [0, 26, 0, 0] },
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

  // ── VISÃO GERAL ──
  const visaoGeral = !showPhys ? [] : (() => {
    const rows = telas.map((t) => {
      const r = screenRollup(t);
      return [
        { text: t.nome, bold: true },
        mono(`${r.dim.largura_m.toFixed(1)}×${r.dim.altura_m.toFixed(1)} m`),
        mono(`${t.cols}×${t.rows}`),
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
          widths: ["*", "auto", "auto", "*", "auto", "auto", "auto"],
          body: [
            [th("Tela"), th("Dimensão"), th("Grade"), th("Modelo"), th("Gabinetes", "right"), th("Peso", "right"), th(showElec ? "Carga" : "Peso por gabinete", "right")],
            ...rows,
            [
              { text: "Total", bold: true }, mono(`${roll.area_m2.toFixed(1)} m²`, { bold: true }), "", "",
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
  const video = !showVideo ? [] : [
    sectionHead(sec(), "Vídeo / Resolução", "Sinal e proporção", DISC.video),
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto"],
        body: [
          [th("Tela"), th("Resolução (px)"), th("Aspecto"), th("Grade"), th("Pixel por gabinete", "right")],
          ...telas.map((t) => {
            const v = videoOf(t);
            return [
              { text: t.nome, bold: true },
              mono(`${ptBR(v.pxW)} × ${ptBR(v.pxH)}`, { bold: true }),
              mono(v.ar, { color: PRINT.acc, bold: true }),
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
  const eletrica = !showElec ? [] : [
    sectionHead(sec(), "Informações Elétricas", "Energia · dimensionamento", DISC.elec),
    { text: [{ text: `Dimensionamento em ${agg.vc.label}. ` }, { text: "A potência de pico define o disjuntor e a bitola dos cabos; a típica (consumo médio em operação) estima o gerador.", color: PRINT.mut }], fontSize: 8.5, margin: [0, 0, 0, 6] },
    {
      table: {
        headerRows: 1,
        widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto", "auto"],
        body: [
          [th("Tela"), th("Gab.", "right"), th("Pico kW", "right"), th("Pico kVA", "right"), th("Pico A", "right"), th("Disjuntor", "right"), th("Típico kVA", "right"), th("Típico A", "right")],
          ...agg.perTela.map(({ tela, gab, peak, typ }) => [
            { text: tela.nome, bold: true },
            mono(String(gab), { alignment: "right" }),
            mono((peak.W / 1000).toFixed(1), { alignment: "right", color: PRINT.red }),
            mono(String(peak.kVA), { alignment: "right" }),
            mono(String(peak.I), { alignment: "right", color: PRINT.amb }),
            mono(`${peak.breaker} A`, { alignment: "right", color: PRINT.red, bold: true }),
            mono(String(typ.kVA), { alignment: "right" }),
            mono(String(typ.I), { alignment: "right" }),
          ]),
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
      layout: zebraLayout(),
    },
    { text: [{ text: "Gerador sugerido (típico + 25% de margem): " }, { text: `~${agg.gerador} kVA`, bold: true, color: PRINT.acc }], fontSize: 8.5, margin: [0, 6, 0, 0] },
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
      return [
        head,
        ...screenReport.flatMap((s, i) => {
          const sp = screenSpec(s);
          return [
            subHead(`${S}.${i + 1}`, s.nome),
            specBox([
              ["Resolução da Screen", `${ptBR(s.size.w)} × ${ptBR(s.size.h)} px`],
              ["Frequência", `${sp.hz} Hz`],
              ["Gabinete", `${sp.resX} × ${sp.resY} px`],
              ["Grade da Screen", `${sp.cols} × ${sp.rows} gabinetes`],
              ["Total de cabos", String(s.ports.length)],
            ]),
            densePortTable(s.ports, [
              { label: "Porta", cell: (p) => portCell(p.n - 1, p.n) },
              { label: "Gabinetes", align: "right", width: "*", cell: (p) => mono(String(p.count), { alignment: "right" }) },
              { label: "Uso", align: "right", cell: (p) => mono(`${p.pct}%`, { alignment: "right", bold: true, color: p.pct > 100 ? PRINT.red : PRINT.ink }) },
            ]),
          ];
        }),
        ...(semScreen.length ? [{
          text: [{ text: `${semScreen.length} tela(s) fora de qualquer Screen `, bold: true }, { text: `(${semScreen.map((t) => t.nome).join(", ")}) — não entraram em nenhum sistema, então não têm cabeamento de sinal.` }],
          fontSize: 8.5, color: PRINT.amb, margin: [0, 6, 0, 0],
        }] : []),
      ];
    }
    return [
      head,
      { text: "Portas de dados por tela — régua de pixels reais (processadores VX/série A/Colorlight) ou de área retangular (controlador básico), conforme a configuração da tela.", fontSize: 8.5, color: PRINT.mut, margin: [0, 0, 0, 4] },
      ...telas.flatMap((t, i) => {
        const { sinalBudget, sinalRule, sinalBits, pxPort } = cableMeta(t);
        const ports = cablePorts(t, "sinal", numbering);
        const off = portOffset(telas, t.id, "sinal", numbering);
        const rows = ports.map((p, pi) => ({ n: off + pi + 1, idx: off + pi, count: p.length, pct: Math.round(((sinalRule === "px" ? p.length : bboxArea(p)) / sinalBudget) * 100) }));
        return [
          subHead(`${S}.${i + 1}`, t.nome, `${portLabel(off, ports.length, "porta")} · máx ${sinalBudget} gabinetes/porta · ${sinalRule === "px" ? `pixels reais: ${ptBR(pxPort)} px (${sinalBits}-bit)` : "área quadrada"}`),
          densePortTable(rows, [
            { label: "Porta", cell: (p) => portCell(p.idx, p.n) },
            { label: "Gabinetes", align: "right", width: "*", cell: (p) => mono(String(p.count), { alignment: "right" }) },
            { label: "Uso", align: "right", cell: (p) => mono(`${p.pct}%`, { alignment: "right", bold: true, color: p.pct > 100 ? PRINT.red : PRINT.ink }) },
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
    const head = [sectionHead(sn, "Energia — Cabeamento AC", "Circuitos de força", DISC.elec), warnBox(AVISO_AC)];
    if (usaScreens) {
      return [
        ...head,
        { text: "Cabos de energia por Screen, na mesma organização do sinal — carga por cabo × corrente do conector. Circuitos numerados 1..N por Screen.", fontSize: 8.5, color: PRINT.mut, margin: [0, 0, 0, 4] },
        ...screenReportAc.flatMap((s, i) => [
          subHead(`${S}.${i + 1}`, s.nome, `${s.ports.length} ${s.ports.length === 1 ? "cabo" : "cabos"}`),
          densePortTable(s.ports, [
            { label: "Cabo", cell: (p) => portCell(p.n - 1, p.n) },
            { label: "Gabinetes", align: "right", width: "*", cell: (p) => mono(String(p.count), { alignment: "right" }) },
            { label: "Carga", align: "right", cell: (p) => mono(`${p.load.toFixed(1)} A · ${p.pct}%`, { alignment: "right", bold: true, color: p.over ? PRINT.red : PRINT.ink }) },
          ]),
        ]),
      ];
    }
    return [
      ...head,
      { text: "Cabos de energia por tela: quantidade, capacidade do conector e carga por cabo.", fontSize: 8.5, color: PRINT.mut, margin: [0, 0, 0, 4] },
      ...telas.flatMap((t, i) => {
        const { ampCab, connRating, acBudget } = cableMeta(t);
        const ports = cablePorts(t, "ac", numbering);
        const off = portOffset(telas, t.id, "ac", numbering);
        const rows = ports.map((p, pi) => {
          const load = p.length * ampCab;
          return { n: off + pi + 1, idx: off + pi, count: p.length, load, pct: Math.round((load / connRating) * 100) };
        });
        return [
          subHead(`${S}.${i + 1}`, t.nome, `${portLabel(off, ports.length, "cabo")} · máx ${acBudget} gabinetes/cabo · ${ampCab.toFixed(2)} A/gabinete · conector ${connRating} A`),
          densePortTable(rows, [
            { label: "Cabo", cell: (p) => portCell(p.idx, p.n) },
            { label: "Gabinetes", align: "right", width: "*", cell: (p) => mono(String(p.count), { alignment: "right" }) },
            { label: "Carga", align: "right", cell: (p) => mono(`${p.load.toFixed(1)} A · ${p.pct}%`, { alignment: "right", bold: true, color: p.pct > 100 ? PRINT.red : PRINT.ink }) },
          ]),
        ];
      }),
    ];
  })();

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
    content: [...capa, ...visaoGeral, ...video, ...eletrica, ...sinal, ...ac, ...gloss],
  };
}
