// services/rigging.js
// ─────────────────────────────────────────────────────────────
// Motor PURO de rigging (F2) — peso por coluna, bumpers, carga por ponto e
// checagem contra a talha pra tela VOADA (flown). Espeque: docs/rigging-spec.md.
//
// ⚠️ Planejamento de referência: quem dimensiona e assina o rigging do evento
// é o rigger habilitado. O WLL da talha já embute o fator de projeto do
// fabricante — nunca passar do WLL.
//
// Modelado sobre a FROTA DA CASA (respostas do dono, 25/07/2026):
//   · bumpers em 2 tamanhos: 50 cm e 100 cm;
//   · 2 tipos de fixação: algema/garra OU ilhó + cinta de carga + manilha;
//   · talhas todas de 1 t e MANUAIS (não tem motor — a subida é na mão).
//
// Ground support (torre/ballast/vento) fica pra fase seguinte.

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Catálogo de bumpers da casa ──
// ⚠️ pesoKg com `estimado: true` = PLACEHOLDER esperando a pesagem real da frota;
// o Caderno tem que rotular como estimativa enquanto estiver assim.
export const BUMPERS = [
  { id: "b50", nome: "Bumper 50 cm", larguraMm: 500, pesoKg: 8, estimado: true },
  { id: "b100", nome: "Bumper 100 cm", larguraMm: 1000, pesoKg: 14, estimado: true },
];

export const getBumper = (id) => BUMPERS.find((b) => b.id === id) || BUMPERS[0];

// ── Fixação do bumper no ponto ──
// `kgPorPonto` = massa dos acessórios que sobem junto (entra na carga da talha).
export const FIXACOES = [
  {
    id: "garra",
    nome: "Algema/garra",
    kgPorPonto: 3,
    acessorios: ["Algema/garra"],
    estimado: true,
  },
  {
    id: "cinta",
    nome: "Ilhó + cinta + manilha",
    kgPorPonto: 5,
    acessorios: ["Cinta de carga", "Manilha"],
    estimado: true,
  },
];

export const getFixacao = (id) => FIXACOES.find((f) => f.id === id) || FIXACOES[0];

// ── Talha ──
// A frota é 100% talha MANUAL de 1 t. Lista aberta caso entre outro WLL depois.
export const TALHAS_KG = [1000];
export const TALHA_PADRAO_KG = 1000;

// Alerta em % do WLL, espelhando a regra dos 80% do elétrico (electricalCalc):
// acima de 80% = ATENÇÃO (laranja); acima de 100% = ESTOURO (vermelho).
export const RIG_WARN_PCT = 80;
export function rigTone(pct) {
  return pct > 100 ? "over" : pct > RIG_WARN_PCT ? "warn" : "ok";
}

export const DEFAULT_RIG = {
  bumperId: "b100", // 100 cm = 2 colunas de gabinete 500 mm
  fixacao: "cinta",
  colunasPorBumper: null, // null = DERIVA da largura do bumper ÷ largura do gabinete
  pontosPorBumper: 1, // 1 talha por bumper
  talhaWLL: TALHA_PADRAO_KG,
  extraKgPorPonto: 0, // extras da casa além dos acessórios da fixação
  utilizacao: 1, // fração do WLL admitida como limite DURO (o aviso de 80% vem do rigTone)
  maxRows: null, // empilhamento máx. voado do gabinete (datasheet); null = sem checagem
};

// quantas colunas cabem num bumper: quantos gabinetes inteiros a viga cobre.
// Gabinete mais largo que o bumper → 1 coluna (com aviso; ele sobra nas pontas).
export function colunasNoBumper(larguraBumperMm, larguraGabMm, override = null) {
  const ov = Math.trunc(num(override));
  if (ov > 0) return ov;
  const lb = num(larguraBumperMm);
  const lg = num(larguraGabMm);
  if (!(lb > 0) || !(lg > 0)) return 1;
  return Math.max(1, Math.floor(lb / lg));
}

// a talha aguenta? menor WLL da lista que cabe; null = acima de tudo que existe
export function sugereTalha(cargaKg, utilizacao = 1, talhas = TALHAS_KG) {
  if (!(cargaKg > 0)) return null;
  for (const wll of talhas) if (cargaKg <= wll * utilizacao) return wll;
  return null;
}

// rigging de UMA tela voada. Carga por ponto = PIOR caso (bumper cheio) —
// o último bumper pode carregar menos colunas, mas a talha se escolhe pro cheio.
export function riggingTela(tela, cfg = {}) {
  const c = { ...DEFAULT_RIG, ...cfg };
  const bumper = getBumper(c.bumperId);
  const fix = getFixacao(c.fixacao);
  const cols = Math.max(0, Math.trunc(num(tela?.cols)));
  const rows = Math.max(0, Math.trunc(num(tela?.rows)));
  const pesoGab = num(tela?.gabinete?.peso);
  const larguraGab = num(tela?.gabinete?.dimW);
  const pesoColuna = rows * pesoGab;

  const colunasPorBumper = colunasNoBumper(bumper.larguraMm, larguraGab, c.colunasPorBumper);
  const bumpers = cols > 0 ? Math.ceil(cols / colunasPorBumper) : 0;
  const pontosPorBumper = Math.max(1, Math.trunc(num(c.pontosPorBumper)) || 1);
  const pontos = bumpers * pontosPorBumper;

  const cargaBumperCheio = Math.min(cols, colunasPorBumper) * pesoColuna + bumper.pesoKg;
  const extras = fix.kgPorPonto + num(c.extraKgPorPonto);
  const cargaPorPonto = pontos > 0 ? cargaBumperCheio / pontosPorBumper + extras : 0;

  const talhaWLL = num(c.talhaWLL) || TALHA_PADRAO_KG;
  const pctTalha = talhaWLL > 0 ? (cargaPorPonto / talhaWLL) * 100 : 0;
  const talha = sugereTalha(cargaPorPonto, c.utilizacao);
  const totalKg = cols * pesoColuna + bumpers * bumper.pesoKg;

  const avisos = [];
  if (larguraGab > 0 && larguraGab > bumper.larguraMm)
    avisos.push(`Gabinete (${larguraGab} mm) é mais largo que o ${bumper.nome.toLowerCase()}`);
  if (bumper.estimado || fix.estimado) avisos.push("Pesos de bumper/acessórios ainda são estimativa");

  return {
    cols, rows, pesoGab, pesoColuna,
    bumper, fixacao: fix, colunasPorBumper,
    bumpers, pontosPorBumper, pontos,
    cargaPorPonto, totalKg,
    talhaWLL, pctTalha, tone: rigTone(pctTalha), talha,
    over: pontos > 0 && talha == null, // não cabe em nenhuma talha da frota
    empilhaOk: c.maxRows == null ? null : rows <= c.maxRows,
    avisos,
  };
}

// projeto inteiro (telas voadas): uma linha por tela + totais
export function projectRigging(project, cfg = {}) {
  const telas = (project?.telas || []).map((t) => ({ tela: t, rig: riggingTela(t, cfg) }));
  const totalKg = telas.reduce((s, r) => s + r.rig.totalKg, 0);
  const pontos = telas.reduce((s, r) => s + r.rig.pontos, 0);
  const bumpers = telas.reduce((s, r) => s + r.rig.bumpers, 0);
  const algumOver = telas.some((r) => r.rig.over);
  const algumWarn = telas.some((r) => r.rig.tone !== "ok");
  return {
    telas, totalKg, pontos, bumpers, algumOver,
    tone: algumOver ? "over" : algumWarn ? "warn" : "ok",
  };
}
