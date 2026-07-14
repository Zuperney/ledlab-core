// services/worklog.js — motor de cálculo do módulo "Diárias" (PURO e testável).
// Regras completas em docs/diarias-spec.md (§5). Resumo:
//  - Cobrança POR EVENTO (nunca por dia); jornada/janela/tolerância GLOBAIS.
//  - Duração vem da diferença de INSTANTES (ISO com offset) → à prova de fuso.
//  - Hora extra em horas inteiras; fração só conta passando da tolerância (50 min).
//  - Passou da janela → +1 cachê (dobra/triplica). Tipos "flat" = 1 cachê, sem extra.
//  - Sem horários (só o cachê) → 1 cachê base.
// Nada de dependências: recebe `cfg` e o `tipo` por parâmetro.

export const DEFAULT_WORKLOG_CFG = { jornadaH: 12, janelaExtraH: 4, toleranciaExtraMin: 50 };

// arredonda pra cima ao inteiro (com epsilon p/ não estourar em valores já inteiros)
export const ceilInt = (x) => Math.ceil(x - 1e-9);

// duração humana a partir de MINUTOS: "9h55" · "4h" · "55min" · "—" (sem horários).
// NUNCA exibir hora decimal: "9.9h" se lia como 9h e 9 décimos, quando 14:00–23:55
// é 9h55. Fonte única de formato — Financeiro, Diárias, Dashboard e relatório usam esta.
export function fmtDur(min) {
  if (min == null || Number.isNaN(min)) return "—";
  const t = Math.max(0, Math.round(min));
  const h = Math.floor(t / 60), m = t % 60;
  if (!h) return `${m}min`;
  return m ? `${h}h${String(m).padStart(2, "0")}` : `${h}h`;
}

// duração em MINUTOS inteiros entre dois instantes ISO (com offset). TZ-safe.
export function durationMin(checkin, checkout) {
  if (!checkin || !checkout) return null;
  const a = Date.parse(checkin), b = Date.parse(checkout);
  if (Number.isNaN(a) || Number.isNaN(b) || b <= a) return null;
  return Math.round((b - a) / 60000);
}

// valor da hora extra = arredonda pra cima (cachê / jornada)
export function valorHora(C, jornadaH) {
  return ceilInt(C / jornadaH);
}

// "empilha?" (gera cachê próprio no dia): override do lançamento vence o padrão do tipo
export function empilha(entry, tipo) {
  if (typeof entry?.cobrarSeparado === "boolean") return entry.cobrarSeparado;
  return !!tipo?.podeSegundoCache;
}

// Detalhamento do valor de UM evento. Retorna { cachês, horasExtras, base, extra, total, duracaoH, flat }.
export function breakdownEvento(entry, tipo, cfg = DEFAULT_WORKLOG_CFG) {
  const C = Number(entry?.valorOverride ?? tipo?.valorBase ?? 0);
  const Jm = cfg.jornadaH * 60, Wm = cfg.janelaExtraH * 60, TOL = cfg.toleranciaExtraMin;
  const m = durationMin(entry?.checkin, entry?.checkout);

  // flat (tipo sem hora extra) OU sem horários → 1 cachê base
  if (!tipo?.geraHoraExtra || m == null) {
    const total = ceilInt(C);
    return { cachês: 1, horasExtras: 0, base: total, extra: 0, total, duracaoMin: m, duracaoH: m == null ? null : m / 60, flat: true };
  }

  const r = valorHora(C, cfg.jornadaH);
  let cachês, horasExtras = 0, extra = 0, total;

  if (m <= Jm) {
    cachês = 1; total = C;
  } else {
    const blocos = Math.floor(m / Jm);
    const restoMin = m - blocos * Jm;
    const cheias = Math.floor(restoMin / 60);
    const fracMin = restoMin - cheias * 60;
    if (restoMin <= Wm) {
      horasExtras = cheias + (fracMin > TOL ? 1 : 0); // regra dos 50 min
      cachês = blocos; extra = horasExtras * r; total = blocos * C + extra;
    } else {
      cachês = blocos + 1; total = cachês * C; // passou da janela → +1 cachê
    }
  }
  total = ceilInt(total);
  return { cachês, horasExtras, base: total - extra, extra, total, duracaoMin: m, duracaoH: m / 60, flat: false };
}

// Agrega os eventos de UM dia (mesmo dataRef). Aplica a regra do deslocamento (§5.5):
// deslocamento (não empilha) só cobra se for a única atividade do dia (ida+volta = 1 cachê).
// tiposById: { [id]: tipo }. Retorna { total, itens:[{ entry, tipo, breakdown, cobrado }] } (ordem preservada).
export function valorDia(entries, tiposById, cfg = DEFAULT_WORKLOG_CFG) {
  const temTrabalho = entries.some((e) => empilha(e, tiposById[e.tipoId]));
  let deslocamentoCobrado = false;
  let total = 0;
  const itens = entries.map((e) => {
    const tipo = tiposById[e.tipoId];
    const b = breakdownEvento(e, tipo, cfg);
    let cobrado = true;
    if (!empilha(e, tipo)) {
      if (temTrabalho) cobrado = false;             // já há trabalho no dia → deslocamento não cobra
      else if (deslocamentoCobrado) cobrado = false; // já cobrou 1 deslocamento hoje (ida+volta = 1)
      else deslocamentoCobrado = true;
    }
    const breakdown = cobrado ? b : { ...b, base: 0, extra: 0, total: 0, cachês: 0, horasExtras: 0 };
    total += breakdown.total;
    return { entry: e, tipo, breakdown, cobrado };
  });
  return { total: ceilInt(total), itens };
}

// Agrupa uma lista de eventos por dia (ordenado por data). Retorna [{ dataRef, total, itens }].
export function agruparPorDia(entries, tiposById, cfg = DEFAULT_WORKLOG_CFG) {
  const dias = {};
  for (const e of entries) (dias[e.dataRef] ||= []).push(e);
  return Object.keys(dias).sort().map((dataRef) => ({ dataRef, ...valorDia(dias[dataRef], tiposById, cfg) }));
}

// Total de um período (soma dos dias).
export function totalPeriodo(entries, tiposById, cfg = DEFAULT_WORKLOG_CFG) {
  return agruparPorDia(entries, tiposById, cfg).reduce((s, d) => s + d.total, 0);
}
