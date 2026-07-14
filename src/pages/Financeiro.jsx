// pages/Financeiro.jsx — fechamento das Diárias (Fase 3): filtros por período e
// cliente, recibo por evento AGRUPADO POR DIA (subtotal quando há +1 no dia) e
// export via PDF (window.print sobre .report-doc) + texto puro pra WhatsApp.
// Sem CSV (decisão do usuário). Ver docs/diarias-spec.md §8.
import { useEffect, useMemo, useRef, useState } from "react";
import { Printer, Copy, MessageCircle } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { useToast } from "../store/UIContext.jsx";
import { useWorklog } from "../hooks/useWorklog.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { reciboWhatsApp, descBreakdown, diaLabelBR, horarioLabel, extenso } from "../services/worklogReport.js";
import { T, PRINT } from "../ui/tokens.js";
import { card, btn, input, label as lbl } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import { DateField } from "../components/PickerField.jsx";
import Select from "../components/Select.jsx";
import { fileName, printAs } from "../services/filenames.js";

const pad = (n) => String(n).padStart(2, "0");
const isoOf = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const monthStart = (d) => isoOf(new Date(d.getFullYear(), d.getMonth(), 1));
const monthEnd = (d) => isoOf(new Date(d.getFullYear(), d.getMonth() + 1, 0));
const brl = (n) => `R$ ${(n || 0).toLocaleString("pt-BR")}`;
const fmtBR = (iso) => { const d = new Date(iso + "T12:00"); return isNaN(d.getTime()) ? iso : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };
const fmtHoras = (min) => { const h = Math.floor(min / 60), m = min % 60; return `${h}h${m ? " " + m + "min" : ""}`; };

const PRESETS = [
  { id: "mes", label: "Este mês" },
  { id: "mesPassado", label: "Mês passado" },
  { id: "30d", label: "Últimos 30 dias" },
];

// largura fixa "de impressão": no mobile o recibo é montado nessa largura (layout igual
// ao do desktop/PDF) e escalado com zoom p/ caber na tela — mini-preview fiel, não reflow.
const DOC_W = 800;

export default function Financeiro() {
  const { prefs, setPrefs } = useLedLabContext();
  const { worklog, porDia } = useWorklog();
  const toast = useToast();
  const isMobile = useIsMobile();

  // no mobile, mede a largura disponível e calcula o zoom p/ o recibo (DOC_W) caber
  const docWrapRef = useRef(null);
  // mede a largura via ResizeObserver (dispara já ao observar) e DERIVA o zoom —
  // sem setState no corpo do effect; o callback do RO é evento de sistema externo.
  const [docW, setDocW] = useState(0);
  useEffect(() => {
    const el = docWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setDocW(el.clientWidth || 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const docZoom = isMobile && docW ? Math.min(1, docW / DOC_W) : 1;

  const now = new Date();
  const [preset, setPreset] = useState("mes");
  const [range, setRange] = useState({ from: monthStart(now), to: monthEnd(now) });
  const [cliente, setCliente] = useState("");
  const [incluirFixo, setIncluirFixo] = useState(true);
  const [docTipo, setDocTipo] = useState("planilha"); // "planilha" (p/ aprovar) | "recibo" (validado)

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
  const totalMin = grupos.reduce((s, g) => s + g.itens.reduce((a, it) => a + (it.breakdown.duracaoH != null ? Math.round(it.breakdown.duracaoH * 60) : 0), 0), 0);

  // fixo mensal (retainer): só quando configurado e o filtro de cliente casa (ou é "Todos")
  const fixoCfg = prefs.fixo || { valor: 0, cliente: "" };
  const fixoAtivo = (Number(fixoCfg.valor) || 0) > 0 && (cliente === "" || cliente === fixoCfg.cliente);
  const fixoValor = fixoAtivo && incluirFixo ? Number(fixoCfg.valor) : 0;
  const grandTotal = total + fixoValor;
  const temConteudo = nDias > 0 || fixoValor > 0;

  const periodoLabel = `${fmtBR(range.from)} a ${fmtBR(range.to)}`;
  const docTitulo = docTipo === "recibo" ? "Recibo de mão de obra" : "Planilha de pagamento";
  const texto = reciboWhatsApp({ grupos, titulo: docTitulo.toUpperCase(), tecnico: prefs.tecnico, periodoLabel, clienteLabel: cliente, showCliente: cliente === "", total, fixoValor, fixoCliente: fixoCfg.cliente });

  // emitente (prestador) — dados legais do recibo
  const emit = prefs.emitente || {};
  const temEmitente = !!(emit.razaoSocial || emit.nomeFantasia || emit.cnpj || emit.endereco);
  const nomeAssina = prefs.tecnico || emit.razaoSocial || emit.nomeFantasia || "";

  // pagador (tomador) — quem paga; lembrado por cliente do filtro
  const pagadores = prefs.pagadores || {};
  const loadPag = (cli) => { const saved = pagadores[cli] || {}; return { nome: saved.nome ?? (cli || ""), doc: saved.doc ?? "" }; };
  const [pagNome, setPagNome] = useState(() => loadPag(cliente).nome);
  const [pagDoc, setPagDoc] = useState(() => loadPag(cliente).doc);
  // trocou o cliente do filtro: recarrega o pagador salvo durante o render (sem effect)
  const [prevCliente, setPrevCliente] = useState(cliente);
  if (cliente !== prevCliente) { setPrevCliente(cliente); const p = loadPag(cliente); setPagNome(p.nome); setPagDoc(p.doc); }
  const savePagador = (nome, doc) => {
    setPagNome(nome); setPagDoc(doc);
    if (cliente) setPrefs({ ...prefs, pagadores: { ...pagadores, [cliente]: { nome, doc } } });
  };

  const copiar = async () => {
    try { await navigator.clipboard.writeText(texto); toast("Recibo copiado — é só colar no WhatsApp"); }
    catch { toast("Não consegui copiar automaticamente", "info"); }
  };
  const abrirWhats = () => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");

  const th = { textAlign: "left", padding: "6px 8px", borderBottom: `2px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" };
  const td = { padding: "6px 8px", borderBottom: `1px solid ${PRINT.line}`, color: PRINT.ink, fontSize: 12.5 };
  const footRow = { display: "flex", justifyContent: "space-between", color: PRINT.mut, fontSize: 13, padding: "3px 0" };
  // larguras de coluna (5) iguais em todo dia — layout de impressão, idêntico no mobile (com zoom)
  const COLW = ["38%", "16%", "11%", "20%", "15%"];
  const stat = (l, v, c = PRINT.ink) => (
    <div><div style={{ fontSize: 11, textTransform: "uppercase", color: PRINT.mut }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800, color: c }}>{v}</div></div>
  );

  return (
    <div>
      <SectionHeader title="Financeiro" subtitle="Fechamento dos cachês por período — recibo pra mandar pro contratante (PDF ou WhatsApp)." />

      {/* filtros */}
      <div style={card({ maxWidth: 860, marginBottom: 16 })}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
          {PRESETS.map((p) => (
            <button key={p.id} onClick={() => applyPreset(p.id)}
              style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${preset === p.id ? T.acc : T.bd}`, background: preset === p.id ? T.acc : "transparent", color: preset === p.id ? "#fff" : T.mut }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
          <div><div style={lbl}>De</div><DateField value={range.from} onChange={setFrom} /></div>
          <div><div style={lbl}>Até</div><DateField value={range.to} onChange={setTo} /></div>
          <div>
            <div style={lbl}>Cliente</div>
            <Select value={cliente} title="Cliente" onChange={(e) => setCliente(e.target.value)} style={input()}>
              <option value="">Todos os clientes</option>
              {clientes.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
          <div><div style={lbl}>Seu nome (no recibo)</div><input value={prefs.tecnico || ""} onChange={(e) => setPrefs({ ...prefs, tecnico: e.target.value })} placeholder="Ex.: seu nome ou empresa" style={input()} /></div>
        </div>
        <div className="m-grid1" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12, marginTop: 12 }}>
          <div><div style={lbl}>Pagador — quem paga (Recebi de)</div><input value={pagNome} onChange={(e) => savePagador(e.target.value, pagDoc)} placeholder="Nome / razão social do cliente" style={input()} /></div>
          <div><div style={lbl}>CPF / CNPJ do pagador</div><input value={pagDoc} onChange={(e) => savePagador(pagNome, e.target.value)} placeholder="Opcional" style={input()} /></div>
        </div>
        {fixoAtivo && (
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12, color: T.txt, fontSize: 14, cursor: "pointer" }}>
            <input type="checkbox" checked={incluirFixo} onChange={(e) => setIncluirFixo(e.target.checked)} style={{ width: 16, height: 16, accentColor: T.acc, cursor: "pointer" }} />
            Incluir fixo mensal{fixoCfg.cliente ? ` (${fixoCfg.cliente})` : ""} — <b>{brl(fixoCfg.valor)}</b>
          </label>
        )}
      </div>

      {/* tipo de documento */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10, alignItems: "center" }}>
        {[["planilha", "Planilha (p/ aprovar)"], ["recibo", "Recibo (validado)"]].map(([k, l]) => (
          <button key={k} onClick={() => setDocTipo(k)}
            style={{ padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${docTipo === k ? T.acc : T.bd}`, background: docTipo === k ? T.acc : "transparent", color: docTipo === k ? "#fff" : T.mut }}>{l}</button>
        ))}
        <span style={{ color: T.dim, fontSize: 12 }}>{docTipo === "planilha" ? "lista pra o cliente conferir e aprovar" : "recibo com quitação, após validado"}</span>
      </div>

      {/* ações */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        <button style={btn("primary")} onClick={() => printAs(fileName(["recibo", cliente]))} disabled={!temConteudo}><Printer size={15} /> Imprimir / Salvar PDF</button>
        <button style={btn("ghost")} onClick={copiar} disabled={!temConteudo}><Copy size={15} /> Copiar texto</button>
        <button style={btn("ghost")} onClick={abrirWhats} disabled={!temConteudo}><MessageCircle size={15} /> WhatsApp</button>
      </div>

      {/* recibo imprimível — no mobile, montado em DOC_W e escalado (zoom) p/ caber, virando
          um mini-preview fiel do PDF em vez de reflow. O zoom é resetado no @media print. */}
      <div ref={docWrapRef} style={{ overflow: "hidden" }}>
      <div className="report-doc" style={{ background: "#fff", color: PRINT.ink, borderRadius: 8, padding: 40, fontSize: 13, margin: "0 auto", width: isMobile ? DOC_W : "100%", maxWidth: isMobile ? "none" : 860, zoom: isMobile ? docZoom : undefined }}>
        {/* emitente (prestador) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
          <div>
            {temEmitente ? (
              <>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{emit.razaoSocial || emit.nomeFantasia}</div>
                {emit.nomeFantasia && emit.razaoSocial && emit.nomeFantasia !== emit.razaoSocial && <div style={{ color: PRINT.mut, fontSize: 13 }}>{emit.nomeFantasia}</div>}
                {(emit.cnpj || emit.cpf) && <div style={{ color: PRINT.mut, fontSize: 12 }}>{emit.cnpj ? `CNPJ: ${emit.cnpj}` : `CPF: ${emit.cpf}`}</div>}
                {(emit.endereco || emit.cep || emit.cidade) && <div style={{ color: PRINT.mut, fontSize: 12 }}>{[emit.endereco, emit.cep && `CEP ${emit.cep}`, emit.cidade].filter(Boolean).join(" · ")}</div>}
                {(emit.telefone || emit.email) && <div style={{ color: PRINT.mut, fontSize: 12 }}>{[emit.telefone, emit.email].filter(Boolean).join(" · ")}</div>}
              </>
            ) : (
              <div style={{ color: PRINT.acc, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>LEDLAB CORE</div>
            )}
          </div>
          <div style={{ textAlign: "right", color: PRINT.dim, fontSize: 12 }}>Emitido em {fmtBR(isoOf(now))}</div>
        </div>

        {/* título */}
        <div style={{ borderTop: `2px solid ${PRINT.ink}`, borderBottom: `1px solid ${PRINT.line}`, padding: "12px 0", marginBottom: 16 }}>
          <h1 style={{ margin: 0, fontSize: 22 }}>{docTitulo}</h1>
          <div style={{ color: PRINT.mut, fontSize: 13, marginTop: 4 }}>{[prefs.tecnico && `Prestador: ${prefs.tecnico}`, `Período: ${periodoLabel}`, cliente && `Cliente: ${cliente}`].filter(Boolean).join(" · ")}</div>
        </div>

        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginBottom: 20 }}>
          {stat("Dias", nDias)}
          {stat("Cachês", nCaches)}
          {stat("Horas trabalhadas", fmtHoras(totalMin))}
        </div>

        {!temConteudo ? (
          <div style={{ color: PRINT.mut, padding: "24px 0", textAlign: "center" }}>Nenhum lançamento no período selecionado.</div>
        ) : (
          grupos.map((g) => {
            // evento(s) do dia (localLivre) — para o contratante distribuir custos por evento
            const locais = [...new Set(g.itens.map((it) => it.entry.localLivre).filter(Boolean))];
            const mistura = locais.length > 1; // dia com +1 evento → local por lançamento
            return (
            <div key={g.dataRef} style={{ marginBottom: 18, breakInside: "avoid" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4, gap: 12 }}>
                <div style={{ fontWeight: 700, fontSize: 14, color: PRINT.ink }}>{diaLabelBR(g.dataRef)}{locais.length ? <span style={{ color: PRINT.acc, fontWeight: 600 }}> · {locais.join(", ")}</span> : ""}</div>
                {g.itens.length > 1 && <div style={{ color: PRINT.mut, fontSize: 12, whiteSpace: "nowrap" }}>subtotal <b style={{ color: PRINT.ink }}>{brl(g.total)}</b></div>}
              </div>
              <div className="tbl-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                  <colgroup>{COLW.map((w, i) => <col key={i} style={{ width: w }} />)}</colgroup>
                  <thead><tr><th style={th}>Atividade</th><th style={th}>Horário</th><th style={th}>Duração</th><th style={th}>Cálculo</th><th style={{ ...th, textAlign: "right" }}>Valor</th></tr></thead>
                  <tbody>
                    {g.itens.map((it, i) => (
                      <tr key={i}>
                        <td style={td}>{it.tipo?.nome || "?"}{it.entry.clienteLivre && cliente === "" ? <span style={{ color: PRINT.dim }}> · {it.entry.clienteLivre}</span> : ""}{mistura && it.entry.localLivre ? <span style={{ color: PRINT.acc }}> · {it.entry.localLivre}</span> : ""}{it.entry.lateCheckout ? <span style={{ color: PRINT.amb, fontSize: 11 }}> · saída tardia</span> : ""}</td>
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
            );
          })
        )}

        {temConteudo && (
          <div style={{ borderTop: `2px solid ${PRINT.ink}`, paddingTop: 12, marginTop: 8 }}>
            {fixoValor > 0 && (
              <>
                <div style={footRow}><span>Variáveis{nDias ? ` · ${nDias} ${nDias === 1 ? "dia" : "dias"}` : ""}</span><span>{brl(total)}</span></div>
                <div style={footRow}><span>Fixo mensal{fixoCfg.cliente ? ` · ${fixoCfg.cliente}` : ""}</span><span>{brl(fixoValor)}</span></div>
              </>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: fixoValor > 0 ? 8 : 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15 }}>Total do período</div>
              <div style={{ fontWeight: 800, fontSize: 22, color: PRINT.grn }}>{brl(grandTotal)}</div>
            </div>

            {/* corpo final: recibo (quitação + assinatura do prestador) ou planilha (aprovação) */}
            {docTipo === "recibo" ? (
              <>
                <div style={{ marginTop: 22, fontSize: 13, lineHeight: 1.7 }}>
                  Recebi{pagNome ? <> de <b>{pagNome}</b>{pagDoc ? ` (CPF/CNPJ: ${pagDoc})` : ""}</> : ""} a importância de <b>{brl(grandTotal)}</b> ({extenso(grandTotal)}), referente a serviços de mão de obra prestados no período de {periodoLabel}, dando plena, rasa e geral quitação.
                </div>
                <div style={{ marginTop: 18, fontSize: 13 }}>{emit.cidade ? `${emit.cidade}, ` : ""}{fmtBR(isoOf(now))}.</div>
                <div style={{ marginTop: 44, textAlign: "center" }}>
                  <div style={{ borderTop: `1px solid ${PRINT.ink}`, width: 320, maxWidth: "100%", margin: "0 auto", paddingTop: 6, fontSize: 13 }}>
                    {nomeAssina || "Assinatura do prestador"}
                    {(emit.cnpj || emit.cpf) && <div style={{ color: PRINT.mut, fontSize: 12 }}>{emit.cnpj ? `CNPJ: ${emit.cnpj}` : `CPF: ${emit.cpf}`}</div>}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ marginTop: 22, fontSize: 13, lineHeight: 1.7 }}>
                  Relação de serviços prestados no período{pagNome ? <> para <b>{pagNome}</b></> : ""}, enviada para <b>conferência e aprovação</b>. Havendo divergência, favor apontar antes de aprovar. Total a pagar: <b>{brl(grandTotal)}</b> ({extenso(grandTotal)}).
                </div>
                <div style={{ marginTop: 18, fontSize: 13 }}>{emit.cidade ? `${emit.cidade}, ` : ""}{fmtBR(isoOf(now))}.</div>
                <div style={{ display: "flex", gap: 40, justifyContent: "space-between", marginTop: 48, flexWrap: "wrap" }}>
                  <div style={{ flex: 1, minWidth: 200, textAlign: "center" }}>
                    <div style={{ borderTop: `1px solid ${PRINT.ink}`, paddingTop: 6, fontSize: 13 }}>{nomeAssina || "Prestador"}<div style={{ color: PRINT.mut, fontSize: 12 }}>Prestador</div></div>
                  </div>
                  <div style={{ flex: 1, minWidth: 200, textAlign: "center" }}>
                    <div style={{ borderTop: `1px solid ${PRINT.ink}`, paddingTop: 6, fontSize: 13 }}>{pagNome || "Contratante"}<div style={{ color: PRINT.mut, fontSize: 12 }}>De acordo — contratante</div></div>
                  </div>
                </div>
              </>
            )}
            {(emit.pix || emit.banco) && (
              <div style={{ marginTop: 22, paddingTop: 10, borderTop: `1px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 12 }}>
                <b style={{ color: PRINT.ink }}>Dados para pagamento:</b> {[emit.pix && `PIX: ${emit.pix}`, emit.banco].filter(Boolean).join(" · ")}
              </div>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
