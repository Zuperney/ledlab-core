// pages/agenda/DiariasView.jsx — modo "Diárias" da Agenda: calendário do mês tocável
// para registrar atividades. Entrada manual (Fase 1) + check-in/checkout ao vivo com
// GPS e checkout tardio (Fase 2). Usa o motor via useWorklog — ver docs/diarias-spec.md.
import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2, ArrowLeft, Play, Square, MapPin, Clock, AlertTriangle } from "lucide-react";
import { MONTHS_LONG } from "../../services/projectCalc.js";
import { useWorklog } from "../../hooks/useWorklog.js";
import { useActivityTypes } from "../../hooks/useActivityTypes.js";
import { useConfirm, useToast } from "../../store/UIContext.jsx";
import { getPosition, mapsUrl } from "../../services/geo.js";
import { T } from "../../ui/tokens.js";
import { card, input, btn, label as lbl } from "../../ui/styles.js";
import BottomSheet from "../../components/BottomSheet.jsx";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const pad = (n) => String(n).padStart(2, "0");
const isoDay = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;
const brl = (n) => `R$ ${(n || 0).toLocaleString("pt-BR")}`;
const hhmm = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 5); };
const nowISO = () => new Date().toISOString();
const minutesSince = (iso) => Math.max(0, Math.round((Date.now() - Date.parse(iso)) / 60000));
const fmtDur = (min) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h${m ? " " + pad(m) : ""}` : `${m}min`; };
const diaCurto = (dataRef) => { try { return new Date(dataRef + "T12:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }); } catch { return dataRef; } };

// monta o instante ISO a partir de "YYYY-MM-DD" + "HH:MM" (hora local do device)
function toISO(dataRef, time) {
  if (!time) return undefined;
  const dt = new Date(`${dataRef}T${time}`);
  return isNaN(dt.getTime()) ? undefined : dt.toISOString();
}

export default function DiariasView() {
  const { worklog, addEntry, updateEntry, removeEntry, breakdown, dia, typesById } = useWorklog();
  const { activityTypes } = useActivityTypes();
  const confirm = useConfirm();
  const toast = useToast();
  const ativos = activityTypes.filter((t) => t.ativo);

  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });
  const [daySheet, setDaySheet] = useState(null);   // dataRef aberto (ou null)
  const [form, setForm] = useState(null);           // formulário de atividade (ou null)
  const [checkinForm, setCheckinForm] = useState(null); // sheet de check-in ao vivo (ou null)
  const [lateForm, setLateForm] = useState(null);   // sheet de checkout tardio (ou null)
  const [gpsBusy, setGpsBusy] = useState(false);    // capturando GPS
  const [, setTick] = useState(0);                  // atualiza o "há Xh" do turno aberto

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

  // ── turno ao vivo (check-in / checkout) ─────────────────────────────
  const abertos = worklog.filter((e) => e.checkin && !e.checkout).sort((a, b) => (a.checkin < b.checkin ? -1 : 1));
  const aberto = abertos[0] || null;                       // turno em andamento (o mais antigo aberto vem primeiro)
  const abertoTipo = aberto ? typesById[aberto.tipoId] : null;
  const abertoMin = aberto ? minutesSince(aberto.checkin) : 0;
  const abertoSuspeito = !!aberto && abertoMin > 18 * 60;  // provável esquecimento de checkout

  useEffect(() => {
    if (!aberto) return;
    const id = setInterval(() => setTick((t) => t + 1), 30000); // mantém o "há Xh" fresco
    return () => clearInterval(id);
  }, [aberto?.id]);

  const abrirCheckin = () => {
    if (!ativos.length) { toast("Cadastre um tipo em Configurações", "info"); return; }
    setCheckinForm({ tipoId: ativos[0].id, cliente: "", local: "" });
  };
  const fazerCheckin = async () => {
    if (!checkinForm.tipoId) { toast("Escolha um tipo", "info"); return; }
    setGpsBusy(true);
    const loc = await getPosition();
    setGpsBusy(false);
    addEntry({
      dataRef: todayISO, tipoId: checkinForm.tipoId, checkin: nowISO(),
      clienteLivre: checkinForm.cliente || undefined, localLivre: checkinForm.local || undefined,
      local: loc || undefined,
    });
    setCheckinForm(null);
    toast(loc ? "Check-in feito · local salvo 📍" : "Check-in feito");
  };
  const fazerCheckout = (entry, checkoutISO, late = false) => {
    updateEntry({ id: entry.id, checkout: checkoutISO, ...(late ? { lateCheckout: true } : {}) });
    const bd = breakdown({ ...entry, checkout: checkoutISO });
    setLateForm(null);
    toast(`Checkout · ${brl(bd.total)}`);
  };
  const abrirLate = () => setLateForm({ entry: aberto, data: aberto.dataRef, hora: "" });
  const confirmarLate = () => {
    const out = toISO(lateForm.data, lateForm.hora);
    if (!out) { toast("Informe a data e a hora de saída", "info"); return; }
    if (Date.parse(out) <= Date.parse(lateForm.entry.checkin)) { toast("A saída precisa ser depois do check-in", "info"); return; }
    fazerCheckout(lateForm.entry, out, true);
  };

  // autocomplete de clientes já usados + valor recorrente por (cliente, tipo)
  const clientesHist = [...new Set(worklog.map((e) => e.clienteLivre).filter(Boolean))].sort();
  const lembraValor = (cliente, tipoId) => {
    if (!cliente || !tipoId) return null;
    const m = worklog.filter((e) => e.clienteLivre === cliente && e.tipoId === tipoId && e.valorOverride != null);
    if (!m.length) return null;
    m.sort((a, b) => (a.dataRef < b.dataRef ? 1 : -1)); // mais recente primeiro
    return m[0].valorOverride;
  };

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
      {clientesHist.length > 0 && <datalist id="clientes-dl">{clientesHist.map((c) => <option key={c} value={c} />)}</datalist>}
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

      {/* turno ao vivo: check-in / em andamento / checkout tardio */}
      {!aberto ? (
        <button onClick={abrirCheckin}
          style={{ ...card({ marginBottom: 12, borderColor: T.bdA, cursor: "pointer" }), width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 10, color: T.acM, fontWeight: 700, fontSize: 15, fontFamily: "inherit" }}>
          <Play size={16} /> Check-in agora
        </button>
      ) : abertoSuspeito ? (
        <div style={card({ marginBottom: 12, borderColor: T.amb, background: T.ambBg, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AlertTriangle size={18} color={T.amb} style={{ flexShrink: 0 }} />
            <div>
              <div style={{ color: T.txt, fontWeight: 700 }}>Turno aberto — confira a saída</div>
              <div style={{ color: T.mut, fontSize: 12 }}>{abertoTipo?.nome || "?"} · check-in {diaCurto(aberto.dataRef)} {hhmm(aberto.checkin)} · há {fmtDur(abertoMin)}</div>
            </div>
          </div>
          <button style={btn("primary")} onClick={abrirLate}><Square size={14} /> Fazer checkout</button>
        </div>
      ) : (
        <div style={card({ marginBottom: 12, borderColor: T.acc, background: T.strip, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: T.grn, boxShadow: `0 0 0 4px ${T.grn}22`, flexShrink: 0 }} />
            <div>
              <div style={{ color: T.txt, fontWeight: 700 }}>Em andamento — {abertoTipo?.nome || "?"}</div>
              <div style={{ color: T.mut, fontSize: 12, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}><Clock size={11} /> desde {hhmm(aberto.checkin)} · há {fmtDur(abertoMin)}</span>
                {aberto.local && <a href={mapsUrl(aberto.local)} target="_blank" rel="noreferrer" style={{ color: T.acM, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 3 }}><MapPin size={11} /> local</a>}
              </div>
            </div>
          </div>
          <button style={btn("primary")} onClick={() => fazerCheckout(aberto, nowISO(), false)}><Square size={14} /> Checkout</button>
        </div>
      )}

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
                <select value={form.tipoId} onChange={(e) => { const tipoId = e.target.value; setForm((f) => { const next = { ...f, tipoId }; if (!f.valorOverride) { const v = lembraValor(f.cliente, tipoId); if (v != null) next.valorOverride = String(v); } return next; }); }} style={input()}>
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
                <div><div style={lbl}>Cliente</div><input list="clientes-dl" value={form.cliente} onChange={(e) => { const cliente = e.target.value; setForm((f) => { const next = { ...f, cliente }; if (!f.valorOverride) { const v = lembraValor(cliente, f.tipoId); if (v != null) next.valorOverride = String(v); } return next; }); }} style={input()} /></div>
              </div>
              <div><div style={lbl}>Local</div><input value={form.local} onChange={(e) => setForm({ ...form, local: e.target.value })} style={input()} /></div>
              <div><div style={lbl}>Observações</div><input value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} style={input()} /></div>

              {preview && (
                <div style={{ background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: T.mut, fontSize: 12 }}>
                    {`${preview.cachês} cachê${preview.cachês > 1 ? "s" : ""}${preview.horasExtras ? ` + ${preview.horasExtras}h extra` : ""}`}
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

      {/* folha de check-in ao vivo */}
      {checkinForm && (
        <BottomSheet title="Check-in agora" onClose={() => setCheckinForm(null)}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ color: T.mut, fontSize: 13 }}>Carimba a hora de agora e abre o turno. O checkout você faz ao terminar.</div>
            <div>
              <div style={lbl}>Tipo de atividade</div>
              <select value={checkinForm.tipoId} onChange={(e) => setCheckinForm({ ...checkinForm, tipoId: e.target.value })} style={input()}>
                {ativos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><div style={lbl}>Cliente (opcional)</div><input list="clientes-dl" value={checkinForm.cliente} onChange={(e) => setCheckinForm({ ...checkinForm, cliente: e.target.value })} style={input()} /></div>
              <div><div style={lbl}>Local (opcional)</div><input value={checkinForm.local} onChange={(e) => setCheckinForm({ ...checkinForm, local: e.target.value })} style={input()} /></div>
            </div>
            <div style={{ color: T.dim, fontSize: 12, display: "flex", alignItems: "center", gap: 6 }}>
              <MapPin size={12} /> Se você permitir, salvo o GPS junto — é opcional.
            </div>
            <button style={{ ...btn("primary"), justifyContent: "center", opacity: gpsBusy ? 0.6 : 1 }} disabled={gpsBusy} onClick={fazerCheckin}>
              <Play size={15} /> {gpsBusy ? "Pegando local…" : "Fazer check-in"}
            </button>
          </div>
        </BottomSheet>
      )}

      {/* folha de checkout tardio (turno esquecido em aberto) */}
      {lateForm && (
        <BottomSheet title="Fazer checkout" onClose={() => setLateForm(null)}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ color: T.mut, fontSize: 13 }}>
              Turno de <b style={{ color: T.txt }}>{typesById[lateForm.entry.tipoId]?.nome || "?"}</b>, check-in em {diaCurto(lateForm.entry.dataRef)} às {hhmm(lateForm.entry.checkin)}. Informe quando você saiu.
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div><div style={lbl}>Data da saída</div><input type="date" value={lateForm.data} onChange={(e) => setLateForm({ ...lateForm, data: e.target.value })} style={input()} /></div>
              <div><div style={lbl}>Hora da saída</div><input type="time" value={lateForm.hora} onChange={(e) => setLateForm({ ...lateForm, hora: e.target.value })} style={input()} /></div>
            </div>
            {(() => {
              const out = toISO(lateForm.data, lateForm.hora);
              if (!out || Date.parse(out) <= Date.parse(lateForm.entry.checkin)) return null;
              const bd = breakdown({ ...lateForm.entry, checkout: out });
              return (
                <div style={{ background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: T.mut, fontSize: 12 }}>
                    {bd.flat ? "Cachê fixo" : `${bd.cachês} cachê${bd.cachês > 1 ? "s" : ""}${bd.horasExtras ? ` + ${bd.horasExtras}h extra` : ""}`}
                    {bd.duracaoH != null && ` · ${bd.duracaoH.toFixed(1)}h`}
                  </span>
                  <b style={{ color: T.grn, fontSize: 18 }}>{brl(bd.total)}</b>
                </div>
              );
            })()}
            <button style={{ ...btn("primary"), justifyContent: "center" }} onClick={confirmarLate}><Square size={15} /> Confirmar saída</button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

const badgeAcc = { fontSize: 10, fontWeight: 700, color: T.acM, background: T.acc + "22", borderRadius: 999, padding: "1px 7px" };
const badgeAmb = { fontSize: 10, fontWeight: 700, color: T.amb, background: T.amb + "22", borderRadius: 999, padding: "1px 7px" };

function DayList({ data, onAdd, onEdit }) {
  const { total, itens } = data;
  return (
    <div style={{ display: "grid", gap: 8 }}>
      {itens.length === 0 && <div style={{ color: T.dim, fontSize: 13 }}>Nenhuma atividade nesse dia.</div>}
      {itens.map((it, i) => {
        const e = it.entry;
        const emAndamento = e.checkin && !e.checkout;
        const tempo = e.checkin ? (e.checkout ? `${hhmm(e.checkin)}–${hhmm(e.checkout)}` : `desde ${hhmm(e.checkin)}`) : "sem horário";
        const gps = mapsUrl(e.local);
        return (
          <div key={i} style={{ display: "flex", alignItems: "stretch", background: T.card2, border: `1px solid ${emAndamento ? T.acc : T.bd}`, borderLeft: `3px solid ${it.tipo?.cor || T.dim2}`, borderRadius: 8, overflow: "hidden" }}>
            <button onClick={() => onEdit(e)}
              style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 10, textAlign: "left", cursor: "pointer", background: "none", border: "none", padding: "10px 12px", color: "inherit", fontFamily: "inherit" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: T.txt, fontWeight: 600, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  {it.tipo?.nome || "?"}
                  {emAndamento && <span style={badgeAcc}>em andamento</span>}
                  {e.lateCheckout && <span style={badgeAmb}>saída tardia</span>}
                </div>
                <div style={{ color: T.dim, fontSize: 12 }}>
                  {tempo}
                  {it.breakdown.duracaoH != null && ` · ${it.breakdown.duracaoH.toFixed(1)}h`}
                  {e.clienteLivre ? ` · ${e.clienteLivre}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                {emAndamento
                  ? <span style={{ fontSize: 11, color: T.acM }}>em curso</span>
                  : it.cobrado
                    ? <b style={{ color: T.grn }}>{brl(it.breakdown.total)}</b>
                    : <span style={{ fontSize: 11, color: T.dim, border: `1px solid ${T.bd}`, borderRadius: 999, padding: "1px 8px" }}>não cobra</span>}
              </div>
            </button>
            {gps && (
              <a href={gps} target="_blank" rel="noreferrer" title="Ver no mapa"
                style={{ display: "flex", alignItems: "center", padding: "0 12px", color: T.acM, borderLeft: `1px solid ${T.bd}` }}>
                <MapPin size={15} />
              </a>
            )}
          </div>
        );
      })}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
        <button style={btn("primary")} onClick={onAdd}><Plus size={15} /> Adicionar atividade</button>
        {total > 0 && <span style={{ color: T.mut, fontSize: 13 }}>Total do dia: <b style={{ color: T.grn }}>{brl(total)}</b></span>}
      </div>
    </div>
  );
}

const navBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer" };
