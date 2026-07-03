// services/worklogReport.js — recibo de Diárias: texto puro pra WhatsApp e helpers
// de descrição do cálculo. PURO — recebe os grupos já calculados (agruparPorDia do
// motor worklog.js). Sem CSV por decisão do usuário: só PDF (na tela) + texto.

const brl = (n) => `R$ ${(n || 0).toLocaleString("pt-BR")}`;
const pad = (n) => String(n).padStart(2, "0");
const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const hhmm = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 5); };

// "1 cachê", "2 cachês + 3h extra". Vazio quando não cobra (0 cachês).
// (Sem "fixo" aqui — "Fixo" é só o retainer mensal, pra não confundir.)
export function descBreakdown(bd) {
  if (!bd || !bd.cachês) return "";
  const ch = `${bd.cachês} cachê${bd.cachês > 1 ? "s" : ""}`;
  return bd.horasExtras ? `${ch} + ${bd.horasExtras}h extra` : ch;
}

// "03/07 (sex)"
export function diaLabelBR(dataRef) {
  const d = new Date(dataRef + "T12:00");
  if (isNaN(d.getTime())) return dataRef;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} (${WD[d.getDay()]})`;
}

// "14:00–04:00" / "desde 14:00" / "" (sem horário)
export function horarioLabel(e) {
  if (!e?.checkin) return "";
  return e.checkout ? `${hhmm(e.checkin)}–${hhmm(e.checkout)}` : `desde ${hhmm(e.checkin)}`;
}

// Texto formatado pra colar/mandar no WhatsApp (usa *negrito* do WhatsApp).
// grupos = [{ dataRef, total, itens:[{ entry, tipo, breakdown, cobrado }] }]
export function reciboWhatsApp({ grupos = [], tecnico, periodoLabel, clienteLabel, showCliente = true, total = 0, fixoValor = 0, fixoCliente = "" }) {
  const L = [];
  L.push("*RECIBO DE DIÁRIAS*");
  if (tecnico) L.push(`Técnico: ${tecnico}`);
  if (periodoLabel) L.push(`Período: ${periodoLabel}`);
  if (clienteLabel) L.push(`Cliente: ${clienteLabel}`);
  L.push("");

  if (!grupos.length && !fixoValor) {
    L.push("Nenhum lançamento no período.");
    return L.join("\n");
  }

  for (const g of grupos) {
    L.push(`*${diaLabelBR(g.dataRef)}*`);
    for (const it of g.itens) {
      const h = horarioLabel(it.entry);
      const dur = it.breakdown?.duracaoH != null ? ` (${it.breakdown.duracaoH.toFixed(1)}h)` : "";
      const val = it.cobrado ? brl(it.breakdown.total) : "não cobra";
      const cli = showCliente && it.entry.clienteLivre ? ` · ${it.entry.clienteLivre}` : "";
      const meio = [`${it.tipo?.nome || "?"}${h ? " " + h : ""}${dur}`, descBreakdown(it.breakdown), val].filter(Boolean).join(" — ");
      L.push(`• ${meio}${cli}`);
    }
    if (g.itens.length > 1) L.push(`Subtotal: ${brl(g.total)}`);
    L.push("");
  }

  // fixo mensal (retainer) somado às variáveis
  if (fixoValor > 0) {
    L.push(`Variáveis: ${brl(total)}`);
    L.push(`Fixo${fixoCliente ? " · " + fixoCliente : ""}: ${brl(fixoValor)}`);
    L.push(`*TOTAL: ${brl(total + fixoValor)}*`);
  } else {
    L.push(`*TOTAL: ${brl(total)}*`);
  }
  return L.join("\n");
}
