// services/reportContent.js — conteúdo e helpers COMPARTILHADOS entre o Caderno
// Técnico do DOM (ProjectRelatorio) e o motor de PDF nativo (services/pdf/*).
// Fonte única de propósito: dois renderizadores, um só texto — se divergir em 3
// meses, o bug é aqui, não em dois lugares.

// disciplinas do caderno técnico: cor de índice por seção (produção / vídeo / elétrica)
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
  const dec = pxH ? (pxW / pxH).toFixed(2) : "—";
  const pitch = parseFloat(g.dimW) && parseInt(g.resX) ? parseFloat(g.dimW) / parseInt(g.resX) : 0;
  return { pxW, pxH, mp: (pxW * pxH) / 1e6, ar: arSimple || `${dec}:1`, dec, pitch };
};

// glossário do caderno técnico (leitor leigo/cliente) — termos que aparecem no doc
export const GLOSSARIO = [
  { t: "Pico × Típico", d: "Pico = branco pleno, dimensiona disjuntor e cabo. Típico = consumo médio real do conteúdo, estima energia e gerador." },
  { t: "kVA × kW", d: "kW é a potência real; kVA a aparente (kW ÷ FP). Disjuntor e gerador se dimensionam em kVA/corrente." },
  { t: "FP (fator de potência)", d: "Relação entre potência real e aparente do gabinete (ex.: 0,90). Entra na corrente e no kVA." },
  { t: "Pitch", d: "Distância entre centros de LEDs (mm). Menor pitch = mais resolução por m² e menor distância mínima de visão." },
  { t: "APL / conteúdo", d: "Nível médio da imagem — quanto do branco pleno o vídeo acende, em média. Escala o consumo típico." },
  { t: "Gabinete", d: "Módulo físico de LED (cabinet + receiving card). Menor unidade de montagem e cabeamento." },
  { t: "Tela", d: "Bloco de gabinetes iguais montados juntos — a unidade de projeto do app." },
  { t: "Screen", d: "O sistema como a controladora enxerga, onde correm as portas 1..N. Pode reunir várias telas." },
  { t: "Porta × Circuito", d: "Porta = saída de dados Gigabit da controladora. Circuito = cabo de energia (AC)." },
  { t: "Disjuntor", d: "Proteção do circuito, dimensionada acima da corrente de pico (margem de carga contínua)." },
  { t: "Trifásico (F+F+F+N)", d: "Alimentação em 3 fases + neutro — distribui a carga e reduz a corrente por fase." },
  { t: "Serpentina", d: "Roteamento em zigue-zague dos cabos para minimizar comprimento e cruzamentos." },
];

// aviso de segurança da seção de AC — texto único do campo (DOM e PDF)
export const AVISO_AC = {
  titulo: "Atenção — energização",
  partes: [
    { t: "Conectores " }, { t: "powerCON azuis NÃO podem ser (des)conectados sob carga", b: true },
    { t: ". Cabo de 1,5 mm² limita cada circuito em " }, { t: "16 A", b: true },
    { t: " (cálculo a 220 V) — confira a corrente por cabo na tabela antes de energizar." },
  ],
};
