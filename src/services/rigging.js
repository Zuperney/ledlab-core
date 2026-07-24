// services/rigging.js
// ─────────────────────────────────────────────────────────────
// Motor PURO de rigging (F2) — peso por coluna, bumpers, carga por ponto e
// sugestão de talha/motor pra tela VOADA (flown). Espeque: docs/rigging-spec.md.
//
// ⚠️ Planejamento de referência: quem dimensiona e assina o rigging do evento
// é o rigger habilitado. O WLL das talhas já embute o fator de projeto do
// fabricante — nunca passar do WLL.
//
// Ground support (torre/ballast/vento) fica pra fase seguinte.

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// WLL usual das talhas de corrente de evento (kg)
export const MOTORES_KG = [250, 500, 1000, 2000];

export const DEFAULT_RIG = {
  colunasPorBumper: 2, // bumper de 2 posições é o comum p/ gabinete de 500 mm
  pontosPorBumper: 1, // 1 motor por bumper; 2 reparte a carga do bumper
  bumperPesoKg: 15, // peso típico de um bumper de 2 posições
  extraKgPorPonto: 5, // manilha/cinta/estropo somados no ponto
  utilizacao: 1, // fração do WLL admitida (0.8 = margem p/ carga dinâmica)
  maxRows: null, // empilhamento máx. voado do gabinete (datasheet); null = sem checagem
};

// menor motor cujo WLL × utilização aguenta a carga; null = acima do maior
export function sugereMotor(cargaKg, utilizacao = 1, motores = MOTORES_KG) {
  if (!(cargaKg > 0)) return null;
  for (const wll of motores) if (cargaKg <= wll * utilizacao) return wll;
  return null;
}

// rigging de UMA tela voada. Carga por ponto = PIOR caso (bumper cheio) —
// o último bumper pode carregar menos colunas, mas o motor se compra pro cheio.
export function riggingTela(tela, cfg = {}) {
  const c = { ...DEFAULT_RIG, ...cfg };
  const cols = Math.max(0, Math.trunc(num(tela?.cols)));
  const rows = Math.max(0, Math.trunc(num(tela?.rows)));
  const pesoGab = num(tela?.gabinete?.peso);
  const pesoColuna = rows * pesoGab;
  const bumpers = cols > 0 ? Math.ceil(cols / c.colunasPorBumper) : 0;
  const pontos = bumpers * c.pontosPorBumper;
  const cargaBumperCheio = Math.min(cols, c.colunasPorBumper) * pesoColuna + c.bumperPesoKg;
  const cargaPorPonto = pontos > 0 ? cargaBumperCheio / c.pontosPorBumper + c.extraKgPorPonto : 0;
  const totalKg = cols * pesoColuna + bumpers * c.bumperPesoKg;
  const motor = sugereMotor(cargaPorPonto, c.utilizacao);
  return {
    cols, rows, pesoGab, pesoColuna, bumpers, pontos,
    cargaPorPonto, totalKg, motor,
    over: pontos > 0 && motor == null, // acima do maior motor da lista
    empilhaOk: c.maxRows == null ? null : rows <= c.maxRows,
  };
}

// projeto inteiro (telas voadas): uma linha por tela + totais
export function projectRigging(project, cfg = {}) {
  const telas = (project?.telas || []).map((t) => ({ tela: t, rig: riggingTela(t, cfg) }));
  const totalKg = telas.reduce((s, r) => s + r.rig.totalKg, 0);
  const pontos = telas.reduce((s, r) => s + r.rig.pontos, 0);
  return { telas, totalKg, pontos, algumOver: telas.some((r) => r.rig.over) };
}
