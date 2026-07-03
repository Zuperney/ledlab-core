// pages/agenda/DiariasView.jsx — modo "Diárias" da Agenda: calendário do mês tocável
// para registrar atividades (entrada manual). Usa o motor via useWorklog (Fase 1 do
// módulo Diárias — ver docs/diarias-spec.md). Sem GPS ainda (Fase 2).
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeft } from "lucide-react";
import { MONTHS_LONG } from "../../services/projectCalc.js";
import { useWorklog } from "../../hooks/useWorklog.js";
import { useActivityTypes } from "../../hooks/useActivityTypes.js";
import { useConfirm, useToast } from "../../store/UIContext.jsx";
import { T } from "../../ui/tokens.js";
import { card, input, btn, label as lbl } from "../../ui/styles.js";
import BottomSheet from "../../components/BottomSheet.jsx";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const pad = (n) => String(n).padStart(2, "0");
const isoDay = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const brl = (n) => `R$ ${(n || 0).toLocaleString("pt-BR")}`;
const hhmm = (iso) => { try { return new Date(iso).toTimeString().slice(0, 5); } catch { return ""; } };

// monta o instante ISO a partir de "YYYY-MM-DD" + "HH:MM" (hora local do device)
function toISO(dataRef, time) {
  if (!time) return undefined;
  const dt = new Date(`${dataRef}T${time}`);
  return isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

export default function DiariasView() {
  const { worklog, addEntry, updateEntry, removeEntry, breakdown, dia } = useWorklog();
  const { activityTypes } = useActivityTypes();
  const confirm = useConfirm();
  const toast = useToast();
  const ativos = activityTypes.filter((t) => t.ativo);

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [daySheet, setDaySheet] = useState(null); // dataRef aberto (ou null)
  const [form, setForm] = useState(null);         // formulário de atividade (ou null)

  const { y, m } = cursor;
  const prefix = `${y}-${pad(m + 1)}`;
  const mesEntries = worklog.filter((e) => (e.dataRef || "").startsWith(prefix));
  const porDataRef = {};
  for (const e of mesEntries) (porDataRef[e.dataRef] ||= []).push(e);
  const totalDiaOf = (dataRef) => (porDataRef[dataRef] ? dia(porDataRef[dataRef]) : { total: 0, itens: [] });
  const mesTotal = Object.keys(porDataRef).reduce((s, k) => s + totalDiaOf(k).total, 0);

  // grade do calendário
  const first = new Date(y, m, 1);
  const cells = [];
  for (let i = 0; i < first.getDay(); i++) cells.push(null);
  const diasNoMes = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= diasNoMes; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  const todayISO = isoDay(now.getFullYear(), now.getMonth(), now.getDate());
  const go = (delta) => setCursor(() => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const openNew = (dataRef) => setForm({ id: null, dataRef, tipoId: ativos[0]?.id || "", inicio: "", fim: "", valorOverride: "", cliente: "", local: "", obs: "" });
  const openEdit = (e) => setForm({ id: e.id, dataRef: e.dataRef, tipoId: e.tipoId, inicio: hhmm(e.checkin), fim: hhmm(e.checkout), valorOverride: e.valorOverride ?? "", cliente: e.clienteLivre ?? "", local: e.localLivre ?? "", obs: e.obs ?? "" });

  const buildEntry = (f) => {
    let checkin = toISO(f.dataRef, f.inicio);
    let checkout = toISO(f.dataRef, f.fim);
    if (checkin && checkout && Date.parse(checkout) <= Date.parse(checkin)) checkout = new Date(Date.parse(checkout) + 86400000).toISOString(); // virou a meia-noite
    return {
      dataRef: f.dataRef, tipoId: f.tipoId, checkin, checkout,
      valorOverride: f.valorOverride === "" ? undefined : Number(f.valorOverride),
      clienteLivre: f.cliente || undefined, localLivre: f.local || undefined, obs: f.obs || undefined,
    };
  };
  const salvar = () => {
    const e = buildEntry(form);
    if (form.id) updateEntry({ ...e, id: form.id }); else addEntry(e);
    setForm(null);
    toast(form.id ? "Atividade atualizada" : "Atividade adicionada");
  };
  const excluir = async () => {
    if (!form.id) return;
    if (await confirm({ title: "Excluir atividade?", message: "Este lançamento será removido do seu registro. Não pode ser desfeito." })) {
      removeEntry(form.id);
      setForm(null);
      toast("Atividade excluída");
    }
  };

  const preview = form ? breakdown(buildEntry(form)) : null;
  const chip = { fontSize: 10, fontWeight: 700, borderRadius: 4, padding: "1px 4px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" };

  return (
    <div>
      {/* cabeçalho do mês */}
      <div style={card({ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12, flexWrap: "wrap", gap: 10 })}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button style={navBtn} onClick={() => go(-1)}><ChevronLeft size={16} /></button>
          <div style={{ color: T.txt, fontWeight: 700, fontSize: 16, minWidth: 150, textAlign: "center" }}>{MONTHS_LONG[m]} {y}</div>
          <button style={navBtn} onClick={() => go(1)}><ChevronRight size={16} /></button>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 10, textTransform: "uppercase", color: T.mut }}>Total do mês</div>
          <div style={{ fontSize: 20, fontWeight: 800, color: T.grn }}>{brl(mesTotal)}</div>
        </div>
      </div>

      {/* calendário */}
      <div style={card({ padding: 12 })}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 5 }}>
          {WEEKDAYS.map((w) => <div key={w} style={{ textAlign: "center", color: T.mut, fontSize: 11, textTransform: "uppercase", fontWeight: 600 }}>{w}</div>)}
          {cells.map((d, i) => {
            if (!d) return <div key={i} style={{ minHeight: 74 }} />;
            const dataRef = isoDay(y, m, d);
            const { total, itens } = totalDiaOf(dataRef);
            const isToday = dataRef === todayISO;
            return (
              <button key={i} onClick={() => setDaySheet(dataRef)}
                style={{ minHeight: 74, textAlign: "left", cursor: "pointer", background: T.card2, border: `1px solid ${isToday ? T.acc : T.bd}`, borderRadius: 8, padding: 5, display: "flex", flexDirection: "column", gap: 3, overflow: "hidden" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? T.acM : T.dim }}>{d}</span>
                  {total > 0 && <span style={{ fontSize: 9, fontWeight: 700, color: T.grn }}>{brl(total)}</span>}
                </div>
                {itens.slice(0, 3).map((it, j) => (
                  <span key={j} style={{ ...chip, background: (it.tipo?.cor || T.dim2) + "2e", color: "#fff", opacity: it.cobrado ? 1 : 0.5 }}>{it.tipo?.nome || "?"}</span>
                ))}
                {itens.length > 3 && <span style={{ fontSize: 9, color: T.dim }}>+{itens.length - 3}</span>}
              </button>
            );
          })}
        </div>
        <div style={{ color: T.dim, fontSize: 12, marginTop: 10 }}>Toque num dia para registrar uma atividade.</div>
      </div>

      {/* folha do dia / formulário */}
      {daySheet && (
        <BottomSheet
          title={form ? (form.id ? "Editar atividade" : "Nova atividade") : new Date(daySheet + "T12:00").toLocaleDateString("pt-BR", { weekday: "long", day: "2-digit", month: "long" })}
          onClose={() => { setDaySheet(null); setForm(null); }}
        >
          {!form ? (
            <DayList dataRef={daySheet} data={totalDiaOf(daySheet)} onAdd={() => openNew(daySheet)} onEdit={openEdit} />
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <button onClick={() => setForm(null)} style={{ ...btn("subtle"), alignSelf: "flex-start" }}><ArrowLeft size={14} /> Voltar ao dia</button>
              <div>
                <div style={lbl}>Tipo de atividade</div>
                <select value={form.tipoId} onChange={(e) => setForm({ ...form, tipoId: e.target.value })} style={input()}>
                  {ativos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                <div><div style={lbl}>Data</div><input type="date" value={form.dataRef} onChange={(e) => setForm({ ...form, dataRef: e.target.value })} style={input()} /></div>
                <div><div style={lbl}>Início</div><input type="time" value={form.inicio} onChange={(e) => setForm({ ...form, inicio: e.target.value })} style={input()} /></div>
                <div><div style={lbl}>Fim</div><input type="time" value={form.fim} onChange={(e) => setForm({ ...form, fim: e.target.value })} style={input()} /></div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <div><div style={lbl}>Valor (opcional)</div><input type="number" placeholder={`Padrão ${brl(preview?.total ?? 0)}`} value={form.valorOverride} onChange={(e) => setForm({ ...form, valorOverride: e.target.value })} style={input()} /></div>
                <div><div style={lbl}>Cliente</div><input value={form.cliente} onChange={(e) => setForm({ ...form, cliente: e.target.value })} style={input()} /></div>
              </div>
              <div><div style={lbl}>Local</div><input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} style={input()} /></div>
              <div><div style={lbl}>Observações</div><input value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} style={input()} /></div>

              {preview && (
                <div style={{ background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: T.mut, fontSize: 12 }}>
                    {preview.flat ? "Cachê fixo" : `${preview.cachês} cachê${preview.cachês > 1 ? "s" : ""}${preview.horasExtras ? ` + ${preview.horasExtras}h extra` : ""}`}
                    {preview.duracaoH != null && ` · ${preview.duracaoH.toFixed(1)}h`}
                  </span>
                  <b style={{ color: T.grn, fontSize: 18 }}>{brl(preview.total)}</b>
                </div>
              )}

              <div style={{ display: "flex", gap: 8, justifyContent: "space-between" }}>
                {form.id ? <button style={btn("danger")} onClick={excluir}><Trash2 size={15} /> Excluir</button> : <span />}
                <button style={btn("primary")} onClick={salvar}>Salvar</button>
              </div>
            </div>
          )}
        </BottomSheet>
      )}
    </div>
  );
}

function DayList({ data, onAdd, onEdit }) {
  const { total, itens } = data;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {itens.length === 0 && <div style={{ color: T.dim, fontSize: 13 }}>Nenhuma atividade nesse dia.</div>}
      {itens.map((it, i) => (
        <button key={i} onClick={() => onEdit(it.entry)}
          style={{ display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer", background: T.card2, border: `1px solid ${T.bd}`, borderLeft: `3px solid ${it.tipo?.cor || T.dim2}`, borderRadius: 8, padding: "10px 12px" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: T.txt, fontWeight: 600 }}>{it.tipo?.nome || "?"}</div>
            <div style={{ color: T.dim, fontSize: 12 }}>
              {it.entry.checkin ? `${new Date(it.entry.checkin).toTimeString().slice(0, 5)}${it.entry.checkout ? `–${new Date(it.entry.checkout).toTimeString().slice(0, 5)}` : ""}` : "sem horário"}
              {it.breakdown.duracaoH != null && ` · ${it.breakdown.duracaoH.toFixed(1)}h`}
              {it.entry.clienteLivre ? ` · ${it.entry.clienteLivre}` : ""}
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            {it.cobrado
              ? <b style={{ color: T.grn }}>{brl(it.breakdown.total)}</b>
              : <span style={{ fontSize: 11, color: T.dim, border: `1px solid ${T.bd}`, borderRadius: 999, padding: "1px 8px" }}>não cobra</span>}
          </div>
        </button>
      ))}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <button style={btn("primary")} onClick={onAdd}><Plus size={15} /> Adicionar atividade</button>
        {total > 0 && <span style={{ color: T.mut, fontSize: 13 }}>Total do dia: <b style={{ color: T.grn }}>{brl(total)}</b></span>}
      </div>
    </div>
  );
}

const navBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer" };
