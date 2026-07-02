// pages/Dashboard.jsx — visão geral: evento atual, contadores e próximos.
import { CalendarDays, MapPin, Layers } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { projectRollup } from "../services/projectCalc.js";
import { formatRange } from "../services/dates.js";
import { T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import StatusBadge from "../components/StatusBadge.jsx";

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

export default function Dashboard() {
  const { projects, prefs } = useLedLabContext();
  const active = projects.filter((p) => p.status === "active");
  const planned = projects.filter((p) => p.status === "planned");
  const done = projects.filter((p) => p.status === "done");
  const hero = active[0];
  const upcoming = planned.slice(0, prefs.dashUpcoming || 5);

  const stats = [
    { l: "Em andamento", v: active.length, c: T.acM },
    { l: "Próximos eventos", v: planned.length, c: T.amb },
    { l: "Concluídos", v: done.length, c: T.grn },
  ];

  return (
    <div>
      <SectionHeader title="Dashboard" />

      {hero && (
        <div style={card({ background: T.hero, marginBottom: 16 })}>
          <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 11, letterSpacing: "0.08em", marginBottom: 6 }}>Evento em andamento</div>
          <h2 style={{ color: T.txt, margin: "0 0 10px", fontSize: 24 }}>{hero.name}</h2>
          <MetaLine p={hero} />
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16, marginBottom: 16 }}>
        {stats.map((s) => (
          <div key={s.l} style={card()}>
            <div style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: T.mut }}>{s.l}</div>
            <div style={{ fontSize: 34, fontWeight: 800, color: s.c, marginTop: 8 }}>{s.v}</div>
          </div>
        ))}
      </div>

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
      </div>
    </div>
  );
}
