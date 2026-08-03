// services/reportContent.js — conteúdo e helpers COMPARTILHADOS entre o Caderno
// Técnico do DOM (ProjectRelatorio) e o motor de PDF nativo (services/pdf/*).
// Fonte única de propósito: dois renderizadores, um só texto — se divergir em 3
// meses, o bug é aqui, não em dois lugares.

import { viewingOf } from "./viewing.js";

// disciplinas do caderno técnico: cor de índice por seção (produção / vídeo /
// elétrica)
export const DISC = { prod: "#475569", video: "#1d4ed8", elec: "#c2410c" };

// rótulos de status de projeto — espelho dos de components/StatusBadge.jsx (que
// carrega ícones/tema e não entra no chunk puro do PDF). Novo status? Muda lá E cá.
export const STATUS_LABEL = { active: "Em andamento", planned: "Planejamento", done: "Concluído", cancelled: "Cancelado" };

// peso legível: ≥ 1 tonelada vira "t"
export const fmtPeso = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`);

// "porta 7" · "portas 7–12" · "sem portas" — a faixa que a tela ocupa na numeração
// global do projeto. Tela vazia tem 0 portas: sem isso sairia o intervalo "1–0".
export const portLabel = (off, n, sing) => (n === 0 ? `sem ${sing}s` : n === 1 ? `${sing} ${off + 1}` : `${sing}s ${off + 1}–${off + n}`);

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
// resolução/aspecto/pitch de uma tela a partir do gabinete e da grade
export const videoOf = (t) => {
  const g = t.gabinete || {};
  const pxW = (parseInt(g.resX) || 0) * (t.cols || 0), pxH = (parseInt(g.resY) || 0) * (t.rows || 0);
  const d = gcd(pxW, pxH) || 1;
  const arSimple = pxW && pxH && pxW / d <= 100 && pxH / d <= 100 ? `${pxW / d}:${pxH / d}` : null;
  const dec = pxH ? (pxW / pxH).toFixed(3) : "—"; // fração decimal do aspecto (ex.: 3:7 → 0.429)
  const pitch = parseFloat(g.dimW) && parseInt(g.resX) ? parseFloat(g.dimW) / parseInt(g.resX) : 0;
  return { pxW, pxH, mp: (pxW * pxH) / 1e6, ar: arSimple || `${pxH ? (pxW / pxH).toFixed(2) : "—"}:1`, dec, pitch };
};

// distância de visão da seção Vídeo, AGRUPADA (DOM+PDF — fonte única): telas
// com o mesmo pitch e a mesma altura têm as mesmas quatro réguas — listar por
// tela repetia os mesmos números N vezes e virava parede de texto (dono,
// 02/08). Uma linha por combinação; tela sem pitch (gabinete sem dimW) é
// omitida. Números já formatados (vírgula) pros dois renderizadores.
export const fmtDistM = (n) => (n >= 100 ? `${Math.round(n)} m` : `${n.toFixed(1).replace(".", ",")} m`);
export const distVisaoGroups = (telas) => {
  const grupos = new Map();
  for (const t of telas || []) {
    const v = videoOf(t);
    if (!v.pitch) continue;
    const alturaM = ((parseFloat(t.gabinete?.dimH) || 0) * (t.rows || 0)) / 1000;
    const key = `${v.pitch.toFixed(3)}|${alturaM.toFixed(2)}`;
    if (!grupos.has(key)) grupos.set(key, { nomes: [], d: viewingOf(v.pitch, alturaM), pitch: v.pitch });
    grupos.get(key).nomes.push(t.nome || "Tela");
  }
  return [...grupos.values()].map((g) => ({
    telas: g.nomes.join(", "),
    pitch: `${g.pitch.toFixed(2).replace(".", ",")} mm`,
    min: fmtDistM(g.d.minM),
    otima: fmtDistM(g.d.otimaM),
    retina: fmtDistM(g.d.retinaM),
    max: g.d.maxM ? fmtDistM(g.d.maxM) : "—",
  }));
};

// Tamanho do NOME do projeto na capa, em cqi (1cqi = 1% da largura da capa).
// A capa impressa tem 186 mm úteis de altura (A4 paisagem, margem 12 mm) e o
// corpo dela já ocupa ~177. Em 13.5cqi cabem ~12 caracteres por linha, então um
// nome comum de 20 quebrava em duas linhas e a capa ia pra uma SEGUNDA PÁGINA no
// Imprimir do navegador (231,8 mm medidos). O título encolhe pra caber — mesmo
// princípio do PDF nativo (LLC-01), que já fazia isso e o DOM não.
// ~171 = largura útil ÷ avanço médio da grotesca bold com letter-spacing -0.035em.
export const capaNomeCqi = (nome) => Math.max(5.5, Math.min(13.5, 171 / Math.max((nome || "").length || 1, 1)));

// glossário do caderno técnico (leitor leigo/cliente) — termos que aparecem no doc.
// Enxuto por decisão do dono (31/07): só o vocabulário que o caderno realmente usa.
export const GLOSSARIO = [
  { t: "Pico × Típico", d: "Pico = branco pleno, dimensiona cabo, proteção e gerador. Típico = consumo médio real do conteúdo, estima energia e a ocupação do gerador." },
  { t: "kVA × kW", d: "kW é a potência real; kVA a aparente (kW ÷ FP). Proteção e gerador se dimensionam em kVA/corrente." },
  { t: "FP (fator de potência)", d: "Relação entre potência real e aparente do gabinete (ex.: 0,90). Entra na corrente e no kVA." },
  { t: "Pitch", d: "Distância entre centros de LEDs (mm). Menor pitch = mais resolução por m² e menor distância mínima de visão." },
  { t: "APL / conteúdo", d: "Nível médio da imagem — quanto do branco pleno o vídeo acende, em média. Escala o consumo típico." },
  { t: "Gabinete", d: "Módulo físico de LED (cabinet + receiving card). Menor unidade de montagem e cabeamento." },
  { t: "Tela", d: "Bloco de gabinetes iguais montados juntos — a unidade de projeto do app." },
  { t: "Screen", d: "O sistema como a controladora enxerga, onde correm as portas 1..N. Pode reunir várias telas." },
  { t: "Porta × Circuito", d: "Porta = saída de dados Gigabit da controladora que alimenta uma cadeia de gabinetes (sinal). Circuito = cabo de energia (AC) que alimenta outra cadeia. São contagens independentes: o mesmo gabinete pertence a uma porta E a um circuito, e as duas cadeias não precisam coincidir." },
  { t: "Trifásico (F+F+F+N)", d: "Alimentação em 3 fases + neutro — distribui a carga e reduz a corrente por fase." },
  { t: "Fases R/S/T", d: "As 3 fases do sistema. Os cabos AC seguem um rodízio (1→R, 2→S, 3→T…) pra equilibrar a carga entre elas; em 220 V trifásico o circuito usa um PAR de fases (RS/ST/TR)." },
];

// ── CRITÉRIOS DE CÁLCULO (folha antes do Glossário, só no Completo) ──
// As regras do motor, as normas e as fontes que sustentam os números do
// caderno — a auditoria de engenharia (07/2026) virando papel. Compartilhado
// DOM+PDF. Detalhamento completo: Base de Conhecimento do app.
export const CRITERIOS = [
  { h: "Potência e corrente", itens: [
    "Todo dimensionamento usa o PICO (pwrMax = branco pleno a 100% de brilho): proteção, cabo, fonte e gerador. O típico nunca dimensiona — estima energia e ocupação.",
    "Potência aparente S = W ÷ FP (fator de potência do gabinete; sem cadastro, 0,85). Corrente por fase I = S ÷ (√3 × V de linha) no trifásico; cada configuração de tensão (220/380 V) tem seu divisor.",
    "Consumo típico por gabinete = base + (pico − base) × brilho × conteúdo (modelo Barco). Sem black level cadastrado, base = 15% do pico.",
  ] },
  { h: "Cabos AC e fases", itens: [
    "Corrente por gabinete = pico ÷ (220 V × FP) — o circuito de alimentação é 220 V em qualquer rede brasileira (F+N na rede 380/220; F+F na 127/220).",
    "Regra dos 80%: cabo/conector de carga contínua satura em 80% do nominal (prática NEC de carga contínua).",
    "Fases em rodízio (R/S/T) reiniciando a cada Screen — cada Screen é um quadro. Em 220 V trifásico o circuito usa um PAR de fases e a corrente conta nas duas; o balanço soma aritmético (leitura conservadora: nunca subestima).",
  ] },
  { h: "Gerador e proteção", itens: [
    "Gerador mínimo = kVA de pico × 1,25; o consumo típico saudável ocupa 60–80% da capacidade. Projetos grandes dividem a carga em setores, com mais de um gerador.",
    "O caderno entrega corrente e kVA; o DISJUNTOR é dimensionado pelo eletricista do quadro — critério da NBR 5410: Ib ≤ In ≤ Iz (a proteção nunca excede a capacidade do cabo).",
  ] },
  { h: "Sinal", itens: [
    "Porta Gigabit: 655.360 px a 8-bit/60 Hz — a capacidade escala com a profundidade de cor (10-bit = metade) e com o refresh (× 60 ÷ Hz). Porta acima do teto só por OVERCLOCK declarado.",
  ] },
  { h: "Vídeo e distância de visão", itens: [
    "Quatro réguas sobre o pitch (mm): MÍNIMA = pitch em metros (fusão de cores, regra 1×) · ÓTIMA = pitch × 10 pés (≈ × 3,05 m) · RETINA = pitch × 3,438 (1 minuto de arco, visão 20/20 — o pixel some) · MÁXIMA = altura da tela × 30.",
    "O critério AVIXA DISCAS (6–8× a altura) responde outra pergunta — LER texto na tela, não ver imagem — e por isso não entra no motor. O caderno entrega as réguas; o \"fica bom\" final é do diretor de vídeo.",
  ] },
];

export const NORMAS = [
  ["ABNT NBR 5410", "Instalações elétricas de baixa tensão: Ib ≤ In ≤ Iz, capacidade de condução e queda de tensão."],
  ["NEC / UL (EUA)", "Origem da margem de 125% e da regra dos 80% para carga contínua — adotadas como boa prática."],
  ["IEC 60898-1 · IEC 60947-2", "Valores padronizados de disjuntores (MCB até 125 A; MCCB/ACB acima)."],
  ["EN 60320 / Neutrik", "Ratings de conector no regime IEC: powerCON 20 A · powerCON TRUE1 16 A."],
];

export const REFERENCIAS = [
  "Barco — “The truth about the power consumption of LED walls” (LEDTalks, 2020): o modelo do consumo típico.",
  "Absen — HC Series User Manual: dimensionamento pelo consumo máximo e gabinetes por cabo de energia.",
  "Neutrik — datasheets BDA 452 (powerCON) e BDA 697 (powerCON TRUE1).",
  "Novastar / Colorlight — capacidade de porta Gigabit por profundidade de cor e refresh.",
  "Mean Well — corrente de inrush de fontes chaveadas e partida sequencial.",
  "Planar — “Understanding Viewing Distance”: a distância retina (pitch × 3.438, 1 arcminuto).",
  "Daktronics (KB 000030569) e Linsn — regra 10× e réguas práticas de distância de visão.",
  "AVIXA — DISCAS: dimensionamento de imagem pra leitura de conteúdo (6–8× a altura).",
  "Auditoria de engenharia LedLab (07/2026): fórmulas do motor confrontadas com as fontes acima — artigos completos na Base de Conhecimento do app.",
];

// balanço de fases formatado ("R 120,0 A · S 118,0 A · T 121,0 A") — fonte única
// pros dois renderizadores e pra aba Energia
export const fmtFases = (bal) => (bal?.fases || []).map((f) => `${f.fase} ${f.A.toFixed(1).replace(".", ",")} A`).join(" · ");

// aviso de segurança da seção de AC — texto único do campo (DOM e PDF)
export const AVISO_AC = {
  titulo: "Atenção — energização",
  partes: [
    { t: "Conectores " }, { t: "powerCON azuis NÃO podem ser (des)conectados sob carga", b: true },
    { t: ". Cabo de 1,5 mm² limita cada circuito em " }, { t: "16 A", b: true },
    { t: " (cálculo a 220 V) — confira a corrente por cabo na tabela antes de energizar." },
  ],
};
