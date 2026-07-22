// pages/Agenda.jsx — agenda de eventos com 3 visualizações (Linha, Coluna, Grade/calendário),
// filtros, status automático por data e clique no evento abrindo o projeto.
import { useState, useMemo } from "react";
import { Rows3, Columns3, CalendarDays, ChevronLeft, ChevronRight, MapPin, Layers, Search, SlidersHorizontal } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { recomputeStatus, projectRollup, groupByMonth, MONTHS_LONG, isoDate } from "../services/projectCalc.js";
import { formatRange } from "../services/dates.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { T, paletteColor } from "../ui/tokens.js";
import { card, input, btn } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import StatusBadge, { STATUS, STATUS_ORDER } from "../components/StatusBadge.jsx";
import Placeholder from "../components/Placeholder.jsx";
import BottomSheet from "../components/BottomSheet.jsx";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const pad = (n) => String(n).padStart(2, "0");
const toISO = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export default function Agenda({ nav }) {
  const { projects } = useLedLabContext();
  const isMobile = useIsMobile();
  const [view, setView] = useState("linha");
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const now = new Date();
  const [cursor, setCursor] = useState({ y: now.getFullYear(), m: now.getMonth() });

  // cor estável por projeto (ordem original)
  const colorOf = (id) => paletteColor(Math.max(0, projects.findIndex((p) => p.id === id)));
  const open = (id) => nav?.openProject?.(id);

  // status sempre derivado da data
  const withStatus = useMemo(
    () => projects.map((p) => ({ ...p, status: recomputeStatus(p, isoDate()) })),
    [projects]
  );
  const list = useMemo(
    () => withStatus.filter((p) =>
      (statusFilter === "all" || p.status === statusFilter) &&
      `${p.name} ${p.cliente} ${p.local}`.toLowerCase().includes(q.toLowerCase())
    ),
    [withStatus, statusFilter, q]
  );

  const views = [
    { id: "linha", label: "Linha", Icon: Rows3 },
    { id: "coluna", label: "Coluna", Icon: Columns3 },
    { id: "grade", label: "Grade", Icon: CalendarDays },
  ];

  const statusItems = [{ k: "all", l: "Todos" }, ...STATUS_ORDER.map((s) => ({ k: s, l: STATUS[s].l }))];
  const statusChip = (f) => {
    const active = statusFilter === f.k;
    const n = f.k === "all" ? withStatus.length : withStatus.filter((p) => p.status === f.k).length;
    const isAll = f.k === "all";
    const col = isAll ? T.acc : STATUS[f.k].c;      // cor do status
    const bgcol = isAll ? T.sel : STATUS[f.k].bg;   // fundo tonalizado
    return (
      <button key={f.k} onClick={() => { setStatusFilter(f.k); setFilterOpen(false); }}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: isMobile ? "9px 14px" : "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${active ? col : T.bd}`, background: active ? bgcol : "transparent", color: active ? col : T.mut }}>
        {!isAll && <span style={{ width: 8, height: 8, borderRadius: 999, background: col, flexShrink: 0 }} />}
        {f.l} <span style={{ opacity: 0.7 }}>{n}</span>
      </button>
    );
  };

  const segBox = { display: "flex", gap: 4, background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 3 };
  const segBtn = (active) => ({ display: "flex", alignItems: "center", gap: 6, padding: isMobile ? "8px 12px" : "6px 12px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 13, fontWeight: 600, background: active ? T.acc : "transparent", color: active ? "#fff" : T.mut });

  return (
    <div>
      <SectionHeader title="Agenda" subtitle={`${projects.length} projetos · o status acompanha a data do evento.`}>
        <div style={segBox}>
          {views.map((v) => { const Icon = v.Icon; return (
            <button key={v.id} onClick={() => setView(v.id)} title={v.label} style={segBtn(view === v.id)}>
              <Icon size={15} />{!isMobile && ` ${v.label}`}
            </button>
          ); })}
        </div>
      </SectionHeader>

      {/* filtros */}
      {isMobile ? (
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <div style={{ position: "relative", flex: 1 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.dim }} />
            <input placeholder="Buscar evento…" value={q} onChange={(e) => setQ(e.target.value)} style={input({ paddingLeft: 32 })} />
          </div>
          <button style={btn("ghost", { flexShrink: 0, borderColor: statusFilter !== "all" ? T.acc : T.bd })} onClick={() => setFilterOpen(true)}>
            <SlidersHorizontal size={16} /> {statusFilter === "all" ? "Filtros" : STATUS[statusFilter].l}
          </button>
        </div>
      ) : (
        <div style={card({ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 })}>
          <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
            <Search size={15} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: T.dim }} />
            <input placeholder="Buscar evento, cliente, local…" value={q} onChange={(e) => setQ(e.target.value)} style={input({ paddingLeft: 32 })} />
          </div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>{statusItems.map(statusChip)}</div>
        </div>
      )}

      {isMobile && filterOpen && (
        <BottomSheet title="Filtrar por status" onClose={() => setFilterOpen(false)}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>{statusItems.map(statusChip)}</div>
        </BottomSheet>
      )}

      {view === "linha" && <LinhaView list={list} colorOf={colorOf} open={open} />}
      {view === "coluna" && <ColunaView list={list} colorOf={colorOf} open={open} />}
      {view === "grade" && <GradeView list={list} colorOf={colorOf} open={open} cursor={cursor} setCursor={setCursor} />}
    </div>
  );
}

/* ── Linha: lista agrupada por mês ── */
function LinhaView({ list, colorOf, open }) {
  const months = groupByMonth(list);
  if (!months.length) return <Empty />;
  return months.map((m) => (
    <div key={m.key} style={{ marginBottom: 20 }}>
      <div style={{ color: T.acM, fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", marginBottom: 10 }}>{m.label}</div>
      {m.projects.map((p) => (
        <div key={p.id} style={card({ display: "flex", alignItems: "center", gap: 14, marginBottom: 10, borderLeft: `3px solid ${colorOf(p.id)}` })}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <button onClick={() => open(p.id)} style={{ background: "none", border: "none", color: T.txt, fontWeight: 600, fontSize: 15, cursor: "pointer", padding: 0, textAlign: "left" }}>{p.name}</button>
            <div style={{ display: "flex", gap: 16, color: T.mut, fontSize: 12, marginTop: 3, flexWrap: "wrap" }}>
              <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><CalendarDays size={13} /> {formatRange(p.dataInicio, p.dataFim)}</span>
              <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><MapPin size={13} /> {p.local}</span>
              <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Layers size={13} /> {projectRollup(p).gab} gabinetes</span>
            </div>
          </div>
          <StatusBadge s={p.status} />
        </div>
      ))}
    </div>
  ));
}

/* ── Coluna: kanban agrupado por status ── */
function ColunaView({ list, colorOf, open }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${STATUS_ORDER.length}, minmax(220px, 1fr))`, gap: 12, alignItems: "start", overflowX: "auto" }}>
      {STATUS_ORDER.map((s) => {
        const cfg = STATUS[s];
        const items = list.filter((p) => p.status === s);
        return (
          <div key={s} style={{ background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 12, padding: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 6px 10px", color: cfg.c, fontWeight: 700, fontSize: 13 }}>
              <cfg.Icon size={15} /> {cfg.l} <span style={{ marginLeft: "auto", color: T.dim }}>{items.length}</span>
            </div>
            {items.map((p) => (
              <button key={p.id} onClick={() => open(p.id)}
                style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", background: T.card, border: `1px solid ${T.bd}`, borderLeft: `3px solid ${colorOf(p.id)}`, borderRadius: 8, padding: 10, marginBottom: 8 }}>
                <div style={{ color: T.txt, fontWeight: 600, fontSize: 14 }}>{p.name}</div>
                <div style={{ color: T.dim, fontSize: 12, marginTop: 4 }}>{formatRange(p.dataInicio, p.dataFim)}</div>
                <div style={{ color: T.dim, fontSize: 12 }}>{p.local} · {projectRollup(p).gab} gab</div>
              </button>
            ))}
            {!items.length && <div style={{ color: T.dim2, fontSize: 12, padding: "6px 6px 10px" }}>—</div>}
          </div>
        );
      })}
    </div>
  );
}

/* ── Grade: calendário mensal ── */
function GradeView({ list, colorOf, open, cursor, setCursor }) {
  const { y, m } = cursor;
  const first = new Date(y, m, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(y, m, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const todayISO = toISO(new Date());
  const eventsOn = (date) => {
    const iso = toISO(date);
    return list.filter((p) => p.dataInicio && iso >= p.dataInicio && iso <= (p.dataFim || p.dataInicio));
  };
  const go = (delta) => setCursor(() => { const d = new Date(y, m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });

  const btn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 44, height: 44, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer" };

  return (
    <div style={card()}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 16, marginBottom: 14 }}>
        <button style={btn} onClick={() => go(-1)}><ChevronLeft size={16} /></button>
        <div style={{ color: T.txt, fontWeight: 700, fontSize: 16, minWidth: 180, textAlign: "center" }}>{MONTHS_LONG[m]} {y}</div>
        <button style={btn} onClick={() => go(1)}><ChevronRight size={16} /></button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, minmax(0, 1fr))", gap: 6 }}>
        {WEEKDAYS.map((w) => <div key={w} style={{ textAlign: "center", color: T.mut, fontSize: 11, textTransform: "uppercase", fontWeight: 600, padding: "2px 0" }}>{w}</div>)}
        {cells.map((date, i) => {
          if (!date) return <div key={i} style={{ minHeight: 96, background: "transparent" }} />;
          const iso = toISO(date);
          const evs = eventsOn(date);
          const isToday = iso === todayISO;
          return (
            <div key={i} style={{ minHeight: 96, background: T.card2, border: `1px solid ${isToday ? T.acc : T.bd}`, borderRadius: 8, padding: 6, display: "flex", flexDirection: "column", gap: 4, overflow: "hidden" }}>
              <div style={{ fontSize: 12, fontWeight: isToday ? 700 : 500, color: isToday ? T.acM : T.dim, textAlign: "right" }}>{date.getDate()}</div>
              {evs.map((p) => {
                const col = colorOf(p.id);
                return (
                  <button key={p.id} onClick={() => open(p.id)} title={p.name}
                    style={{ display: "block", width: "100%", textAlign: "left", cursor: "pointer", background: col + "2e", color: "#fff", borderLeft: `3px solid ${col}`, border: "none", borderRadius: 4, padding: "3px 6px", fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Empty() {
  return <Placeholder icon={CalendarDays} title="Nenhum evento" description="Ajuste os filtros ou crie projetos na aba Projetos / Eventos." />;
}
