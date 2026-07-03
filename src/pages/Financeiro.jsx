// pages/Financeiro.jsx — fechamento das Diárias (Fase 3): filtros por período e
// cliente, recibo por evento AGRUPADO POR DIA (subtotal quando há +1 no dia) e
// export via PDF (window.print sobre .report-doc) + texto puro pra WhatsApp.
// Sem CSV (decisão do usuário). Ver docs/diarias-spec.md §8.
import { useMemo, useState } from "react";
import { Printer, Copy, MessageCircle } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { useToast } from "../store/UIContext.jsx";
import { useWorklog } from "../hooks/useWorklog.js";
import { reciboWhatsApp, descBreakdown, diaLabelBR, horarioLabel } from "../services/worklogReport.js";
import { T, PRINT } from "../ui/tokens.js";
import { card, btn, input, label as lbl } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";

const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthStart = (d) => isoOf(new Date(d.getFullYear(), d.getMonth(), 1));
const monthEnd = (d) => isoOf(new Date(d.getFullYear(), d.getMonth() + 1, 0));
const brl = (n) => `R$ ${(n || 0).toLocaleString("pt-BR")}`;
const fmtBR = (iso) => { const d = new Date(iso + "T12:00"); return isNaN(d.getTime()) ? iso : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

const PRESETS = [
  { id: "mes", label: "Este mês" },
  { id: "mesPassado", label: "Mês passado" },
  { id: "30d", label: "Últimos 30 dias" },
];

export default function Financeiro() {
  const { prefs, setPrefs } = useLedLabContext();
  const { worklog, porDia } = useWorklog();
  const toast = useToast();

  const now = new Date();
  const [preset, setPreset] = useState("mes");
  const [range, setRange] = useState({ from: monthStart(now), to: monthEnd(now) });
  const [cliente, setCliente] = useState("");

  const applyPreset = (p) => {
    setPreset(p);
    const d = new Date();
    if (p === "mes") setRange({ from: monthStart(d), to: monthEnd(d) });
    else if (p === "mesPassado") { const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1); setRange({ from: monthStart(pm), to: monthEnd(pm) }); }
    else if (p === "30d") { const ini = new Date(d); ini.setDate(ini.getDate() - 29); setRange({ from: isoOf(ini), to: isoOf(d) }); }
  };
  const setFrom = (v) => { setPreset("custom"); setRange((r) => ({ ...r, from: v })); };
  const setTo = (v) => { setPreset("custom"); setRange((r) => ({ ...r, to: v })); };

  const clientes = useMemo(() => [...new Set(worklog.map((e) => e.clienteLivre).filter(Boolean))].sort(), [worklog]);

  const grupos = useMemo(() => {
    const filtered = worklog.filter((e) =>
      (e.dataRef || "") >= range.from && (e.dataRef || "") <= range.to &&
      (cliente === "" || (e.clienteLivre || "") === cliente)
    );
    return porDia(filtered);
  }, [worklog, range.from, range.to, cliente, porDia]);

  const total = grupos.reduce((s, g) => s + g.total, 0);
  const nDias = grupos.length;
  const nCaches = grupos.reduce((s, g) => s + g.itens.reduce((a, it) => a + (it.cobrado ? (it.breakdown.cachês || 0) : 0), 0), 0);

  const periodoLabel = `${fmtBR(range.from)} a ${fmtBR(range.to)}`;
  const clienteLabel = cliente || "Todos";
  const texto = reciboWhatsApp({ grupos, tecnico: prefs.tecnico, periodoLabel, clienteLabel, showCliente: cliente === "", total });

  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); toast("Recibo copiado — é só colar no WhatsApp"); }
    catch { toast("Não consegui copiar automaticamente", "info"); }
  };
  const abrirWhats = () => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");

  const th = { textAlign: "left", padding: "6px 8px", borderBottom: `2px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.04em" };
  const td = { padding: "6px 8px", borderBottom: `1px solid ${PRINT.line}`, color: PRINT.ink, fontSize: 12.5 };
  const stat = (l, v, c = PRINT.ink) => (
    <div><div style={{ fontSize: 10, textTransform: "uppercase", color: PRINT.mut }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div></div>
  );

  return (
    <div>
      <SectionHeader title="Financeiro" subtitle="Fechamento das diárias por período — recibo pra mandar pro contratante (PDF ou WhatsApp)." />

      {/* filtros */}
      <div style={card({ maxWidth: 860, marginBottom: 16 })}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${preset === p.id ? T.acc : T.bd}`, background: preset === p.id ? T.acc : "transparent", color: preset === p.id ? "#fff" : T.mut }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <div><div style={lbl}>De</div><input type="date" value={range.from} onChange={(e) => setFrom(e.target.value)} style={input()} /></div>
          <div><div style={lbl}>Até</div><input type="date" value={range.to} onChange={(e) => setTo(e.target.value)} style={input()} /></div>
          <div>
            <div style={lbl}>Cliente</div>
            <select value={cliente} onChange={(e) => setCliente(e.target.value)} style={input()}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div><div style={lbl}>Seu nome (no recibo)</div><input value={prefs.tecnico || ""} onChange={(e) => setPrefs({ ...prefs, tecnico: e.target.value })} placeholder="Ex.: Ney" style={input()} /></div>
        </div>
      </div>

      {/* ações */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button style={btn("primary")} onClick={() => window.print()} disabled={!nDias}><Printer size={15} /> Imprimir / Salvar PDF</button>
        <button style={btn("ghost")} onClick={copiar} disabled={!nDias}><Copy size={15} /> Copiar texto</button>
        <button style={btn("ghost")} onClick={abrirWhats} disabled={!nDias}><MessageCircle size={15} /> WhatsApp</button>
      </div>

      {/* recibo imprimível */}
      <div className="report-doc" style={{ background: "#fff", color: PRINT.ink, borderRadius: 8, padding: 40, maxWidth: 860, margin: "0 auto", fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${PRINT.ink}`, paddingBottom: 14, marginBottom: 16, gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: PRINT.acc, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>LEDLAB CORE — DIÁRIAS</div>
            <h1 style={{ margin: "6px 0 4px", fontSize: 24 }}>Recibo de diárias</h1>
            <div style={{ color: PRINT.mut }}>{[prefs.tecnico, `Período: ${periodoLabel}`, `Cliente: ${clienteLabel}`].filter(Boolean).join(" · ")}</div>
          </div>
          <div style={{ textAlign: "right", color: PRINT.dim, fontSize: 12 }}>
            <div>Gerado em {fmtBR(isoOf(now))}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 20 }}>
          {stat("Total do período", brl(total), PRINT.grn)}
          {stat("Dias", nDias)}
          {stat("Cachês", nCaches)}
        </div>

        {!nDias ? (
          <div style={{ color: PRINT.mut, padding: "24px 0", textAlign: "center" }}>Nenhum lançamento no período selecionado.</div>
        ) : (
          grupos.map((g) => (
            <div key={g.dataRef} style={{ marginBottom: 18, breakInside: "avoid" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: PRINT.ink }}>{diaLabelBR(g.dataRef)}</div>
                {g.itens.length > 1 && <div style={{ color: PRINT.mut, fontSize: 12 }}>subtotal <b style={{ color: PRINT.ink }}>{brl(g.total)}</b></div>}
              </div>
              <div className="tbl-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Atividade</th><th style={th}>Horário</th><th style={th}>Duração</th><th style={th}>Cálculo</th><th style={{ ...th, textAlign: "right" }}>Valor</th></tr></thead>
                  <tbody>
                    {g.itens.map((it, i) => (
                      <tr key={i}>
                        <td style={td}>{it.tipo?.nome || "?"}{it.entry.clienteLivre && cliente === "" ? <span style={{ color: PRINT.dim }}> · {it.entry.clienteLivre}</span> : ""}{it.entry.lateCheckout ? <span style={{ color: PRINT.amb, fontSize: 11 }}> · saída tardia</span> : ""}</td>
                        <td style={td}>{horarioLabel(it.entry) || "—"}</td>
                        <td style={td}>{it.breakdown.duracaoH != null ? `${it.breakdown.duracaoH.toFixed(1)}h` : "—"}</td>
                        <td style={{ ...td, color: PRINT.mut }}>{descBreakdown(it.breakdown)}</td>
                        <td style={{ ...td, textAlign: "right", fontWeight: 700, color: it.cobrado ? PRINT.ink : PRINT.dim }}>{it.cobrado ? brl(it.breakdown.total) : "não cobra"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))
        )}

        {nDias > 0 && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${PRINT.ink}`, paddingTop: 12, marginTop: 8 }}>
            <div style={{ fontWeight: 700, fontSize: 15 }}>Total do período</div>
            <div style={{ fontWeight: 800, fontSize: 22, color: PRINT.grn }}>{brl(total)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
