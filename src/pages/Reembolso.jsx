// pages/Reembolso.jsx — despesas para reembolso (Fase 3). Lança despesa por dia com
// foto do comprovante (comprimida, guardada LOCAL no IndexedDB — NÃO vai pro sync/Supabase).
// MVP: lançar + lista + total do mês. Relatório em PDF vem depois.
import { useState, useEffect } from "react";
import { Plus, Trash2, Camera, ChevronLeft, ChevronRight, Wallet } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { useToast, useConfirm } from "../store/UIContext.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { MONTHS_LONG } from "../services/projectCalc.js";
import { compressImage, saveFoto, getFoto, delFoto } from "../services/fotos.js";
import { genId } from "../services/ids.js";
import { T } from "../ui/tokens.js";
import { card, btn, input, label as lbl } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import BottomSheet from "../components/BottomSheet.jsx";
import { DateField } from "../components/PickerField.jsx";

const pad = (n) => String(n).padStart(2, "0");
const isoToday = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };
const brl = (n) => `R$ ${(Number(n) || 0).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtBR = (iso) => { if (!iso) return ""; const d = new Date(iso + "T12:00"); return isNaN(d.getTime()) ? iso : `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`; };

const CATEGORIAS = ["Combustível", "Pedágio", "Estacionamento", "Alimentação", "Hospedagem", "Material", "Outros"];
const navBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer" };

// thumbnail que lê o Blob da foto do IndexedDB e cria/revoga o objectURL
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
  const { despesas, setDespesas } = useLedLabContext();
  const toast = useToast();
  const confirm = useConfirm();
  const isMobile = useIsMobile();
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [form, setForm] = useState(null);
  const [busy, setBusy] = useState(false);

  const { y, m } = cursor;
  const prefix = `${y}-${pad(m + 1)}`;
  const mes = despesas.filter((d) => (d.data || "").startsWith(prefix)).sort((a, b) => (a.data < b.data ? 1 : -1));
  const total = mes.reduce((s, d) => s + (Number(d.valor) || 0), 0);
  const go = (delta) => setCursor(() => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

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

  return (
    <div style={{ maxWidth: 760 }}>
      <SectionHeader title="Reembolso" subtitle="Lance as despesas do evento com foto do comprovante — o comprovante fica só neste aparelho." />

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

      {form && (
        <BottomSheet title={form.id ? "Editar despesa" : "Nova despesa"} onClose={closeForm}>
          <div style={{ display: "grid", gap: 12 }}>
            <div className="m-grid1" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><div style={lbl}>Data</div><DateField value={form.data} onChange={(v) => setForm({ ...form, data: v })} /></div>
              <div><div style={lbl}>Valor (R$)</div><input type="number" inputMode="decimal" value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="0,00" style={input()} /></div>
            </div>
            <div>
              <div style={lbl}>Categoria</div>
              <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} style={input()}>
                {CATEGORIAS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
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
