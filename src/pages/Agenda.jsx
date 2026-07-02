// pages/Agenda.jsx — projetos em ordem cronológica, agrupados por mês.
import { Activity, Clock, CircleCheck, CircleX, CalendarDays, MapPin, Layers } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { groupByMonth, projectRollup } from "../services/projectCalc.js";
import { formatRange } from "../services/dates.js";
import { T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import StatusBadge, { STATUS } from "../components/StatusBadge.jsx";
import Placeholder from "../components/Placeholder.jsx";

export default function Agenda() {
  const { projects } = useLedLabContext();
  const months = groupByMonth(projects);

  return (
    <div>
      <SectionHeader title="Agenda" subtitle={`${projects.length} projetos · visão cronológica por mês.`} />

      {months.length === 0 ? (
        <Placeholder icon={CalendarDays} title="Agenda vazia" description="Os projetos com data de início aparecem aqui, agrupados por mês. Crie projetos na aba Projetos / Eventos." />
      ) : (
        months.map((m) => (
          <div key={m.key} style={{ marginBottom: 20 }}>
            <div style={{ color: T.acM, fontWeight: 700, fontSize: 12, letterSpacing: "0.06em", marginBottom: 10 }}>{m.label}</div>
            {m.projects.map((p) => {
              const cfg = STATUS[p.status] || STATUS.planned;
              const Icon = cfg.Icon;
              return (
                <div key={p.id} style={card({ display: "flex", alignItems: "center", gap: 14, marginBottom: 10, borderLeft: `3px solid ${cfg.c}` })}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: cfg.bg, color: cfg.c, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icon size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ color: T.txt, fontWeight: 600 }}>{p.name}</div>
                    <div style={{ display: "flex", gap: 16, color: T.mut, fontSize: 12, marginTop: 3, flexWrap: "wrap" }}>
                      <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><CalendarDays size={13} /> {formatRange(p.dataInicio, p.dataFim)}</span>
                      <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><MapPin size={13} /> {p.local}</span>
                      <span style={{ display: "inline-flex", gap: 5, alignItems: "center" }}><Layers size={13} /> {projectRollup(p).gab} gabinetes</span>
                    </div>
                  </div>
                  <StatusBadge s={p.status} />
                </div>
              );
            })}
          </div>
        ))
      )}
    </div>
  );
}
