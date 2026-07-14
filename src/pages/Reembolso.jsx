// pages/Reembolso.jsx — despesas para reembolso (Fase 3). Dois modos:
//  • Lançamentos: registra despesa por dia com foto do comprovante (comprimida,
//    guardada LOCAL no IndexedDB — NÃO vai pro sync/Supabase).
//  • Relatório: documento imprimível (PDF via window.print) com a tabela de
//    despesas + total + comprovantes embutidos, e envio por WhatsApp. Reaproveita
//    a máquina de impressão do Financeiro (.report-doc + @media print + PRINT).
import { useState, useEffect } from "react";
import { Plus, Trash2, Camera, ChevronLeft, ChevronRight, Wallet, Printer, MessageCircle, Copy } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { useToast, useConfirm } from "../store/UIContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { MONTHS_LONG } from "../services/projectCalc.js";
import { compressImage, saveFoto, getFoto, delFoto } from "../services/fotos.js";
import { genId } from "../services/ids.js";
import { T, PRINT } from "../ui/tokens.js";
import { card, btn, input, label as lbl } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import BottomSheet from "../components/BottomSheet.jsx";
import { DateField } from "../components/PickerField.jsx";
import Select from "../components/Select.jsx";
import { fileName, printAs } from "../services/filenames.js";

const pad = (n) => String(n).padStart(2, "0");
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const brl = (n) => `R$ ${(Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBR = (iso) => { if (!iso) return ""; const d = new Date(iso + "T12:00"); return isNaN(d.getTime()) ? iso : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };
const fmtBRfull = (iso) => { if (!iso) return ""; const d = new Date(iso + "T12:00"); return isNaN(d.getTime()) ? iso : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`; };

const CATEGORIAS = ["Combustível", "Pedágio", "Estacionamento", "Alimentação", "Hospedagem", "Material", "Outros"];
const navBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer" };

// texto simples pra colar no WhatsApp (as fotos vão no PDF, não dá pra mandar no texto)
function reembolsoTexto(lista, { periodoLabel, tecnico, total }) {
  const linhas = lista.map((d) => `${fmtBR(d.data)} · ${d.categoria}${d.descricao ? ` (${d.descricao})` : ""} — ${brl(d.valor)}`);
  const nFotos = lista.filter((d) => d.fotoId).length;
  return [
    "RELATÓRIO DE REEMBOLSO",
    tecnico ? `Prestador: ${tecnico}` : null,
    `Período: ${periodoLabel}`,
    "",
    ...linhas,
    "",
    `TOTAL A REEMBOLSAR: ${brl(total)}`,
    nFotos ? `(${nFotos} comprovante${nFotos > 1 ? "s" : ""} no PDF)` : null,
  ].filter((x) => x != null).join("\n");
}

// thumbnail (lista/form) que lê o Blob do IndexedDB e cria/revoga o objectURL
function FotoThumb({ fotoId, size = 44 }) {
  const [url, setUrl] = useState(null);
  useEffect(() => {
    let u = null, alive = true;
    if (fotoId) getFoto(fotoId).then((blob) => { if (alive && blob) { u = URL.createObjectURL(blob); setUrl(u); } });
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [fotoId]);
  return url
    ? <img src={url} alt="comprovante" style={{ width: size, height: size, objectFit: "cover", borderRadius: 8, border: `1px solid ${T.bd}`, flexShrink: 0 }} />
    : <div style={{ width: size, height: size, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, flexShrink: 0 }} />;
}

export default function Reembolso() {
  const { despesas, setDespesas, prefs } = useLedLabContext();
  const toast = useToast();
  const confirm = useConfirm();
  const isMobile = useIsMobile();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [mode, setMode] = useState("lancamentos");   // "lancamentos" | "relatorio"
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [fotoUrls, setFotoUrls] = useState({});      // { fotoId: objectURL } p/ o relatório

  const { y, m } = cursor;
  const prefix = `${y}-${pad(m + 1)}`;
  const mes = despesas.filter((d) => (d.data || "").startsWith(prefix)).sort((a, b) => (a.data < b.data ? 1 : -1));
  const total = mes.reduce((s, d) => s + (Number(d.valor) || 0), 0);
  const go = (delta) => setCursor(() => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  // carrega os comprovantes do período (Blob → objectURL) quando entra no Relatório
  useEffect(() => {
    if (mode !== "relatorio") return undefined;
    let alive = true; const urls = {};
    const comFoto = despesas.filter((d) => (d.data || "").startsWith(prefix) && d.fotoId);
    Promise.all(comFoto.map((d) => getFoto(d.fotoId).then((b) => { if (b) urls[d.fotoId] = URL.createObjectURL(b); }).catch(() => {})))
      .then(() => { if (alive) setFotoUrls({ ...urls }); });
    return () => { alive = false; Object.values(urls).forEach((u) => URL.revokeObjectURL(u)); };
  }, [mode, prefix, despesas]);

  const openNew = () => setForm({ id: null, data: isoToday(), categoria: CATEGORIAS[0], valor: "", descricao: "", cliente: "", fotoId: null, _blob: null, _preview: null });
  const openEdit = (d) => setForm({ ...d, valor: String(d.valor ?? ""), _blob: null, _preview: null });
  const closeForm = () => { if (form?._preview) URL.revokeObjectURL(form._preview); setForm(null); };

  const pickFoto = async (file) => {
    if (!file) return;
    setBusy(true);
    try {
      const blob = await compressImage(file);
      setForm((f) => { if (f._preview) URL.revokeObjectURL(f._preview); return { ...f, _blob: blob, _preview: URL.createObjectURL(blob) }; });
    } catch { toast("Não consegui processar a foto", "info"); }
    setBusy(false);
  };

  const salvar = async () => {
    if (!form.valor || Number(form.valor) <= 0) { toast("Informe o valor", "info"); return; }
    let fotoId = form.fotoId || null;
    if (form._blob) { fotoId = fotoId || genId(); await saveFoto(fotoId, form._blob); }
    const desp = {
      id: form.id || genId(), data: form.data, categoria: form.categoria, valor: Number(form.valor),
      descricao: form.descricao || undefined, cliente: form.cliente || undefined, fotoId: fotoId || undefined,
    };
    setDespesas(form.id ? despesas.map((d) => (d.id === form.id ? desp : d)) : [...despesas, desp]);
    closeForm();
    toast(form.id ? "Despesa atualizada" : "Despesa adicionada");
  };

  const excluir = async () => {
    if (!form.id) return;
    if (await confirm({ title: "Excluir despesa?", message: "A despesa e o comprovante serão removidos. Não pode ser desfeito." })) {
      if (form.fotoId) delFoto(form.fotoId);
      setDespesas(despesas.filter((d) => d.id !== form.id));
      closeForm();
      toast("Despesa excluída");
    }
  };

  const periodoLabel = `${MONTHS_LONG[m]} ${y}`;
  const emit = prefs.emitente || {};
  const temEmitente = !!(emit.razaoSocial || emit.nomeFantasia || emit.cnpj || emit.endereco);
  const texto = reembolsoTexto(mes, { periodoLabel, tecnico: prefs.tecnico, total });
  const copiar = async () => { try { await navigator.clipboard.writeText(texto); toast("Copiado — é só colar no WhatsApp"); } catch { toast("Não consegui copiar", "info"); } };
  const abrirWhats = () => window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener");
  const comFoto = mes.filter((d) => d.fotoId);

  const th = { textAlign: "left", padding: "6px 8px", borderBottom: `2px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.04em" };
  const td = { padding: "6px 8px", borderBottom: `1px solid ${PRINT.line}`, color: PRINT.ink, fontSize: 12.5 };

  return (
    <div style={{ maxWidth: 820 }}>
      <SectionHeader title="Reembolso" subtitle="Despesas do evento com comprovante + relatório de reembolso." />

      {/* mês + total */}
      <div style={card({ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 })}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={navBtn} onClick={() => go(-1)}><ChevronLeft size={16} /></button>
          <div style={{ color: T.txt, fontWeight: 700, fontSize: 16, minWidth: 150, textAlign: "center" }}>{MONTHS_LONG[m]} {y}</div>
          <button style={navBtn} onClick={() => go(1)}><ChevronRight size={16} /></button>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: isMobile ? 12 : 11, textTransform: "uppercase", color: T.mut }}>Total do mês</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.acM }}>{brl(total)}</div>
        </div>
      </div>

      {/* modo: lançamentos | relatório */}
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["lancamentos", "Lançamentos"], ["relatorio", "Relatório"]].map(([k, l]) => (
          <button key={k} onClick={() => setMode(k)}
            style={{ padding: "7px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${mode === k ? T.acc : T.bd}`, background: mode === k ? T.acc : "transparent", color: mode === k ? "#fff" : T.mut }}>{l}</button>
        ))}
      </div>

      {mode === "lancamentos" ? (
        <>
          <button onClick={openNew} style={{ ...btn("primary"), marginBottom: 12 }}><Plus size={15} /> Adicionar despesa</button>
          {mes.length === 0 ? (
            <div style={card({ textAlign: "center", color: T.dim, padding: "28px 16px" })}>
              <Wallet size={26} style={{ opacity: 0.5, marginBottom: 8 }} />
              <div>Nenhuma despesa em {MONTHS_LONG[m]}. Toque em “Adicionar despesa”.</div>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {mes.map((d) => (
                <button key={d.id} onClick={() => openEdit(d)}
                  style={{ display: "flex", alignItems: "center", gap: 12, textAlign: "left", background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 10, padding: 10, cursor: "pointer", fontFamily: "inherit" }}>
                  {d.fotoId
                    ? <FotoThumb fotoId={d.fotoId} />
                    : <div style={{ width: 44, height: 44, borderRadius: 8, background: T.card, border: `1px dashed ${T.bd}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Camera size={16} color={T.dim} /></div>}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: T.txt, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.categoria}{d.descricao ? <span style={{ color: T.dim, fontWeight: 400 }}> · {d.descricao}</span> : ""}</div>
                    <div style={{ color: T.mut, fontSize: 12 }}>{fmtBR(d.data)}{d.cliente ? ` · ${d.cliente}` : ""}</div>
                  </div>
                  <div style={{ color: T.txt, fontWeight: 700, flexShrink: 0 }}>{brl(d.valor)}</div>
                </button>
              ))}
            </div>
          )}
        </>
      ) : (
        <>
          {/* ações do relatório (fora do .report-doc → não saem na impressão) */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
            <button style={btn("primary")} onClick={() => printAs(fileName(["reembolso", periodoLabel]))} disabled={!mes.length}><Printer size={15} /> Imprimir / Salvar PDF</button>
            <button style={btn("ghost")} onClick={copiar} disabled={!mes.length}><Copy size={15} /> Copiar texto</button>
            <button style={btn("ghost")} onClick={abrirWhats} disabled={!mes.length}><MessageCircle size={15} /> WhatsApp</button>
          </div>

          <div className="report-doc" style={{ background: "#fff", color: PRINT.ink, borderRadius: 8, padding: 40, fontSize: 13, maxWidth: 860 }}>
            {/* emitente */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 12 }}>
              <div>
                {temEmitente ? (
                  <>
                    <div style={{ fontSize: 18, fontWeight: 800 }}>{emit.razaoSocial || emit.nomeFantasia}</div>
                    {(emit.cnpj || emit.cpf) && <div style={{ color: PRINT.mut, fontSize: 12 }}>{emit.cnpj ? `CNPJ: ${emit.cnpj}` : `CPF: ${emit.cpf}`}</div>}
                  </>
                ) : (
                  <div style={{ color: PRINT.acc, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>LEDLAB CORE</div>
                )}
              </div>
              <div style={{ textAlign: "right", color: PRINT.dim, fontSize: 12 }}>Emitido em {fmtBRfull(isoToday())}</div>
            </div>

            <div style={{ borderTop: `2px solid ${PRINT.ink}`, borderBottom: `1px solid ${PRINT.line}`, padding: "12px 0", marginBottom: 16 }}>
              <h1 style={{ margin: 0, fontSize: 22 }}>Relatório de Reembolso</h1>
              <div style={{ color: PRINT.mut, fontSize: 13, marginTop: 4 }}>{[prefs.tecnico && `Prestador: ${prefs.tecnico}`, `Período: ${periodoLabel}`, `${mes.length} despesa${mes.length === 1 ? "" : "s"}`].filter(Boolean).join(" · ")}</div>
            </div>

            {mes.length === 0 ? (
              <div style={{ color: PRINT.mut, padding: "24px 0", textAlign: "center" }}>Nenhuma despesa em {periodoLabel}.</div>
            ) : (
              <>
                <div className="tbl-scroll" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
                    <colgroup><col style={{ width: "16%" }} /><col style={{ width: "24%" }} /><col style={{ width: "40%" }} /><col style={{ width: "20%" }} /></colgroup>
                    <thead><tr><th style={th}>Data</th><th style={th}>Categoria</th><th style={th}>Descrição</th><th style={{ ...th, textAlign: "right" }}>Valor</th></tr></thead>
                    <tbody>
                      {mes.map((d) => (
                        <tr key={d.id}>
                          <td style={td}>{fmtBRfull(d.data)}</td>
                          <td style={td}>{d.categoria}</td>
                          <td style={{ ...td, color: PRINT.mut }}>{[d.descricao, d.cliente].filter(Boolean).join(" · ") || "—"}</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{brl(d.valor)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `2px solid ${PRINT.ink}`, paddingTop: 12, marginTop: 10 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>Total a reembolsar</div>
                  <div style={{ fontWeight: 800, fontSize: 22, color: PRINT.grn }}>{brl(total)}</div>
                </div>

                {comFoto.length > 0 && (
                  <div style={{ marginTop: 24, breakInside: "avoid" }}>
                    <h3 style={{ fontSize: 14, margin: "0 0 10px", color: PRINT.ink }}>Comprovantes ({comFoto.length})</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
                      {comFoto.map((d) => (
                        <div key={d.id} style={{ breakInside: "avoid", border: `1px solid ${PRINT.line}`, borderRadius: 8, overflow: "hidden" }}>
                          {fotoUrls[d.fotoId]
                            ? <img src={fotoUrls[d.fotoId]} alt={`comprovante ${d.categoria}`} style={{ display: "block", width: "100%", height: 200, objectFit: "contain", background: "#fff" }} />
                            : <div style={{ width: "100%", height: 200, background: PRINT.head, display: "flex", alignItems: "center", justifyContent: "center", color: PRINT.dim, fontSize: 12 }}>carregando…</div>}
                          <div style={{ padding: "6px 8px", borderTop: `1px solid ${PRINT.line}`, fontSize: 11.5, color: PRINT.mut }}>
                            {fmtBR(d.data)} · {d.categoria} · <b style={{ color: PRINT.ink }}>{brl(d.valor)}</b>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </>
      )}

      {form && (
        <BottomSheet title={form.id ? "Editar despesa" : "Nova despesa"} onClose={closeForm}>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="m-grid1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><div style={lbl}>Data</div><DateField value={form.data} onChange={(v) => setForm({ ...form, data: v })} /></div>
              <div><div style={lbl}>Valor (R$)</div><input type="number" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" style={input()} /></div>
            </div>
            <div>
              <div style={lbl}>Categoria</div>
              <Select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={input()} title="Categoria">
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div><div style={lbl}>Descrição (opcional)</div><input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Ex.: gasolina ida e volta" style={input()} /></div>
            <div><div style={lbl}>Cliente / evento (opcional)</div><input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} style={input()} /></div>

            <div>
              <div style={lbl}>Comprovante</div>
              {(form._preview || form.fotoId) ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {form._preview
                    ? <img src={form._preview} alt="prévia" style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8, border: `1px solid ${T.bd}` }} />
                    : <FotoThumb fotoId={form.fotoId} size={64} />}
                  <label style={{ ...btn("subtle"), cursor: "pointer" }}>
                    <Camera size={14} /> Trocar foto
                    <input type="file" accept="image/*" capture="environment" onChange={(e) => pickFoto(e.target.files?.[0])} style={{ display: "none" }} />
                  </label>
                </div>
              ) : (
                <label style={{ ...btn("ghost"), cursor: "pointer", justifyContent: "center", opacity: busy ? 0.6 : 1 }}>
                  <Camera size={15} /> {busy ? "Processando…" : "Tirar / anexar foto"}
                  <input type="file" accept="image/*" capture="environment" disabled={busy} onChange={(e) => pickFoto(e.target.files?.[0])} style={{ display: "none" }} />
                </label>
              )}
              <div style={{ color: T.dim, fontSize: 11, marginTop: 4 }}>A foto é comprimida e guardada só neste aparelho.</div>
            </div>

            <div style={{ display: "flex", gap: 8, justifyContent: "space-between", marginTop: 4 }}>
              {form.id ? <button style={btn("danger")} onClick={excluir}><Trash2 size={15} /> Excluir</button> : <span />}
              <button style={btn("primary")} onClick={salvar} disabled={busy}>Salvar</button>
            </div>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
