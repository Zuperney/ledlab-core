// services/worklogReport.js — recibo de Diárias: texto puro pra WhatsApp e helpers
// de descrição do cálculo. PURO — recebe os grupos já calculados (agruparPorDia do
// motor worklog.js). Sem CSV por decisão do usuário: só PDF (na tela) + texto.

const brl = (n) => `R$ ${(n || 0).toLocaleString("pt-BR")}`;
const pad = (n) => String(n).padStart(2, "0");
const WD = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];
const hhmm = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 5); };

// ── valor por extenso (reais inteiros — o motor arredonda sem centavos) ──
const UNI = ["zero", "um", "dois", "três", "quatro", "cinco", "seis", "sete", "oito", "nove", "dez", "onze", "doze", "treze", "quatorze", "quinze", "dezesseis", "dezessete", "dezoito", "dezenove"];
const DEZ = ["", "", "vinte", "trinta", "quarenta", "cinquenta", "sessenta", "setenta", "oitenta", "noventa"];
const CEM = ["", "cento", "duzentos", "trezentos", "quatrocentos", "quinhentos", "seiscentos", "setecentos", "oitocentos", "novecentos"];
function trio(n) { // 0..999
  if (n === 0) return "";
  if (n === 100) return "cem";
  const c = Math.floor(n / 100), resto = n % 100, d = Math.floor(resto / 10), u = resto % 10;
  let s = c ? CEM[c] : "";
  if (resto) {
    if (s) s += " e ";
    s += resto < 20 ? UNI[resto] : DEZ[d] + (u ? " e " + UNI[u] : "");
  }
  return s;
}
export function extenso(n) {
  n = Math.round(Math.abs(n || 0));
  if (n === 0) return "zero reais";
  const mi = Math.floor(n / 1000000), mil = Math.floor((n % 1000000) / 1000), r = n % 1000;
  const g = [];
  if (mi) g.push(mi === 1 ? "um milhão" : trio(mi) + " milhões");
  if (mil) g.push(mil === 1 ? "mil" : trio(mil) + " mil");
  if (r) g.push(trio(r));
  const useE = r > 0 && (r < 100 || r % 100 === 0) && g.length > 1; // "mil e quinhentos", "seis mil e cem"
  const s = useE ? g.slice(0, -1).join(" ") + " e " + g[g.length - 1] : g.join(" ");
  return `${s} ${n === 1 ? "real" : "reais"}`;
}

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
export function reciboWhatsApp({ grupos = [], titulo = "RECIBO DE MÃO DE OBRA", tecnico, periodoLabel, clienteLabel, showCliente = true, total = 0, fixoValor = 0, fixoCliente = "" }) {
  const L = [];
  L.push(`*${titulo}*`);
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
