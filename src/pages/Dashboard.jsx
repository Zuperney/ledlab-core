// pages/Dashboard.jsx — visão geral: evento atual, contadores e próximos.
import { CalendarDays, MapPin, Layers, ChevronRight, Receipt, Square, Clock } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { projectRollup, MONTHS_LONG } from "../services/projectCalc.js";
import { formatRange } from "../services/dates.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { useWorklog } from "../hooks/useWorklog.js";
import { useToast } from "../store/UIContext.jsx";
import { T } from "../ui/tokens.js";
import { card, btn } from "../ui/styles.js";
import StatusBadge from "../components/StatusBadge.jsx";

const brl = (n) => `R$ ${(n || 0).toLocaleString("pt-BR")}`;
const pad2 = (n) => String(n).padStart(2, "0");
const hhmm = (iso) => { if (!iso) return ""; const d = new Date(iso); return isNaN(d.getTime()) ? "" : d.toTimeString().slice(0, 5); };
const fmtDur = (min) => { const h = Math.floor(min / 60), m = min % 60; return h ? `${h}h${m ? " " + String(m).padStart(2, "0") : ""}` : `${m}min`; };

const gabCount = (p) => projectRollup(p).gab;

function MetaLine({ p }) {
  return (
    <div style={{ display: "flex", gap: 16, color: T.mut, fontSize: 13, flexWrap: "wrap" }}>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><CalendarDays size={14} /> {formatRange(p.dataInicio, p.dataFim)}</span>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><MapPin size={14} /> {p.local}</span>
      <span style={{ display: "inline-flex", gap: 6, alignItems: "center" }}><Layers size={14} /> {gabCount(p)} gabinetes</span>
    </div>
  );
}

export default function Dashboard({ nav }) {
  const { projects, prefs } = useLedLabContext();
  const { worklog, porDia, updateEntry, typesById } = useWorklog();
  const toast = useToast();
  const isMobile = useIsMobile();
  const active = projects.filter((p) => p.status === "active");
  const planned = projects.filter((p) => p.status === "planned");
  const done = projects.filter((p) => p.status === "done");
  const hero = active[0];
  const limit = isMobile ? 3 : (prefs.dashUpcoming || 5);
  const upcoming = planned.slice(0, limit);

  const stats = [
    { l: "Em andamento", s: "Andamento", v: active.length, c: T.acM },
    { l: "Próximos eventos", s: "Próximos", v: planned.length, c: T.amb },
    { l: "Concluídos", s: "Concluídos", v: done.length, c: T.grn },
  ];

  // diárias do mês corrente (módulo Diárias)
  const nowD = new Date();
  const mesPrefix = `${nowD.getFullYear()}-${pad2(nowD.getMonth() + 1)}`;
  const mesEntries = worklog.filter((e) => (e.dataRef || "").startsWith(mesPrefix));
  const gruposMes = porDia(mesEntries);
  const diariasVar = gruposMes.reduce((s, g) => s + g.total, 0);
  const diariasDias = gruposMes.length;
  const diariasCaches = gruposMes.reduce((s, g) => s + g.itens.reduce((a, it) => a + (it.cobrado ? (it.breakdown.cachês || 0) : 0), 0), 0);
  const fixoVal = Number(prefs.fixo?.valor) || 0;
  const diariasTotal = diariasVar + fixoVal;
  const mostraDiarias = mesEntries.length > 0 || fixoVal > 0;
  const ocultar = !!prefs.dashOcultarValor; // esconde o card de cachês (privacidade; toggle no topbar)

  // turno ao vivo: mesmo dado das Diárias (check-in sem checkout) — checkout rápido daqui
  const aberto = worklog.filter((e) => e.checkin && !e.checkout).sort((a, b) => (a.checkin < b.checkin ? -1 : 1))[0] || null;
  const abertoTipo = aberto ? typesById[aberto.tipoId] : null;
  const abertoMin = aberto ? Math.max(0, Math.round((Date.now() - Date.parse(aberto.checkin)) / 60000)) : 0;
  const doCheckout = () => { updateEntry({ id: aberto.id, checkout: new Date().toISOString() }); toast("Checkout feito ✓"); };

  return (
    <div>
      {aberto && (
        <div style={card({ marginBottom: 16, borderColor: T.acc, background: T.strip, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" })}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
            <span style={{ width: 10, height: 10, borderRadius: 999, background: T.grn, boxShadow: `0 0 0 4px ${T.grn}22`, flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: T.txt, fontWeight: 700 }}>Turno em andamento — {abertoTipo?.nome || "?"}</div>
              <div style={{ color: T.mut, fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}><Clock size={11} /> desde {hhmm(aberto.checkin)} · há {fmtDur(abertoMin)}{aberto.localLivre ? ` · ${aberto.localLivre}` : ""}</div>
            </div>
          </div>
          <button style={btn("primary")} onClick={doCheckout}><Square size={14} /> Checkout</button>
        </div>
      )}
      {hero && (
        <div style={card({ background: `linear-gradient(100deg, ${T.strip}, ${T.hero} 42%)`, marginBottom: 16 })}>
          <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.08em", marginBottom: 6 }}>Evento em andamento</div>
          <h2 style={{ color: T.txt, margin: "0 0 10px", fontSize: 24 }}>{hero.name}</h2>
          <MetaLine p={hero} />
        </div>
      )}

      <div className="dash-stats-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: isMobile ? 8 : 16, marginBottom: 16 }}>
        {stats.map((s) => (
          <div key={s.l} style={card(isMobile ? { padding: "9px 6px" } : {})}>
            <div style={{ textTransform: "uppercase", fontSize: isMobile ? 9.5 : 11, letterSpacing: "0.04em", color: T.mut, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{isMobile ? s.s : s.l}</div>
            <div className="dash-stat-value" style={{ fontSize: isMobile ? 24 : 34, fontWeight: 800, color: s.c, marginTop: isMobile ? 2 : 8 }}>{s.v}</div>
          </div>
        ))}
      </div>

      {mostraDiarias && !ocultar && (
        <button onClick={() => nav?.setPage?.("financeiro")}
          style={{ ...card({ marginBottom: 16, cursor: "pointer", background: `linear-gradient(100deg, ${T.strip}, ${T.hero} 60%)`, borderColor: T.bdA }), width: "100%", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16, fontFamily: "inherit" }}>
          <div>
            <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 6 }}><Receipt size={13} /> Cachês · {MONTHS_LONG[nowD.getMonth()]}</div>
            <div style={{ fontSize: 30, fontWeight: 800, color: T.grn, margin: "6px 0 2px" }}>{brl(diariasTotal)}</div>
            <div style={{ color: T.mut, fontSize: 13 }}>
              {diariasDias} {diariasDias === 1 ? "dia" : "dias"} · {diariasCaches} cachê{diariasCaches === 1 ? "" : "s"}
              {fixoVal > 0 ? ` · inclui fixo ${brl(fixoVal)}` : ""}
            </div>
          </div>
          <ChevronRight size={20} color={T.mut} style={{ flexShrink: 0 }} />
        </button>
      )}

      <div style={card()}>
        <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12, marginBottom: 12 }}>Próximos eventos</div>
        {upcoming.length === 0 && <div style={{ color: T.dim, fontSize: 13 }}>Nenhum evento futuro planejado.</div>}
        {upcoming.map((p, i) => (
          <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderTop: i ? `1px solid ${T.bd}` : "none" }}>
            <div>
              <div style={{ color: T.txt, fontWeight: 600 }}>{p.name}</div>
              <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>{formatRange(p.dataInicio, p.dataFim)} · {gabCount(p)} gabinetes · {p.local}</div>
            </div>
            <StatusBadge s={p.status} />
          </div>
        ))}
        {planned.length > limit && (
          <button onClick={() => nav?.setPage?.("projects")}
            style={{ display: "inline-flex", alignItems: "center", gap: 4, marginTop: 12, background: "none", border: "none", color: T.acM, fontWeight: 600, cursor: "pointer", fontSize: 13, padding: 0 }}>
            Ver todos ({planned.length}) <ChevronRight size={15} />
          </button>
        )}
      </div>
    </div>
  );
}
