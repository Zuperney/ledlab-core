// pages/project/ProjectRelatorio.jsx — relatório imprimível (PDF via navegador).
import { useState } from "react";
import { Printer } from "lucide-react";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { aggregateElectrical, projectRollup, screenRollup } from "../../services/projectCalc.js";
import { formatRange, formatFull } from "../../services/dates.js";
import { STATUS } from "../../components/StatusBadge.jsx";
import { T, PRINT } from "../../ui/tokens.js";
import { btn } from "../../ui/styles.js";

const TYPES = ["Completo", "Resumido", "Elétrico", "Estrutural", "Design", "Gabinetes"];

export default function ProjectRelatorio({ project }) {
  const { prefs } = useLedLabContext();
  const [type, setType] = useState("Completo");
  const cfg = project.config || { vk: prefs.vk, brilho: prefs.brilho, conteudo: prefs.conteudo };
  const agg = aggregateElectrical(project, cfg);
  const roll = projectRollup(project);
  const today = formatFull(new Date().toISOString().slice(0, 10));
  const showElec = ["Completo", "Resumido", "Elétrico"].includes(type);
  const showPhys = ["Completo", "Resumido", "Estrutural", "Gabinetes", "Design"].includes(type);

  const th = { textAlign: "left", padding: "8px 10px", borderBottom: `2px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 11, textTransform: "uppercase" };
  const td = { padding: "8px 10px", borderBottom: `1px solid ${PRINT.line}`, color: PRINT.ink };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${type === t ? T.acc : T.bd}`, background: type === t ? T.acc : "transparent", color: type === t ? "#fff" : T.mut }}>{t}</button>
          ))}
        </div>
        <button style={btn("primary")} onClick={() => window.print()}><Printer size={15} /> Imprimir / Salvar PDF</button>
      </div>

      <div className="report-doc" style={{ background: "#fff", color: PRINT.ink, borderRadius: 8, padding: 40, maxWidth: 860, margin: "0 auto", fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${PRINT.ink}`, paddingBottom: 14, marginBottom: 16 }}>
          <div>
            <div style={{ color: PRINT.acc, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>LEDLAB CORE — {type.toUpperCase()}</div>
            <h1 style={{ margin: "6px 0 4px", fontSize: 26 }}>{project.name}</h1>
            <div style={{ color: PRINT.mut }}>{[project.cliente, project.local, formatRange(project.dataInicio, project.dataFim), STATUS[project.status]?.l].filter(Boolean).join(" · ")}</div>
          </div>
          <div style={{ textAlign: "right", color: PRINT.dim, fontSize: 12 }}>
            <div>Gerado em {today}</div>
            <div>{agg.vc.label} · brilho {Math.round(cfg.brilho * 100)}% · conteúdo {Math.round(cfg.conteudo * 100)}%</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
          {[["Telas", roll.telas], ["Gabinetes", roll.gab], ["Área", `${roll.area_m2.toFixed(1)} m²`], ["Peso", `${roll.peso_kg.toFixed(1)} kg`], ["kVA pico", agg.kVA], ["kVA típico", agg.typKva], ["Gerador ~", `${agg.gerador} kVA`]].map(([l, v]) => (
            <div key={l}><div style={{ fontSize: 10, textTransform: "uppercase", color: PRINT.mut }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div></div>
          ))}
        </div>

        {showPhys && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={{ color: PRINT.acc, borderBottom: `1px solid ${PRINT.line}`, paddingBottom: 6 }}>Visão Geral</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Gabinete</th><th style={th}>Grade</th><th style={th}>Gab.</th><th style={th}>Dimensão</th><th style={th}>Peso</th><th style={th}>Carga</th></tr></thead>
              <tbody>
                {project.telas.map((t) => { const r = screenRollup(t); return (
                  <tr key={t.id}><td style={td}>{t.nome}</td><td style={td}>{t.gabinete?.nome}</td><td style={td}>{t.cols}×{t.rows}</td><td style={td}>{r.gab}</td><td style={td}>{r.dim.largura_m.toFixed(1)}×{r.dim.altura_m.toFixed(1)} m</td><td style={td}>{r.peso_kg.toFixed(1)} kg</td><td style={{ ...td, color: PRINT.red }}>{(r.pwrMax_w / 1000).toFixed(1)} kW</td></tr>
                ); })}
                <tr style={{ fontWeight: 700 }}><td style={td}>Total</td><td style={td}></td><td style={td}></td><td style={td}>{roll.gab}</td><td style={td}>{roll.area_m2.toFixed(1)} m²</td><td style={td}>{roll.peso_kg.toFixed(1)} kg</td><td style={{ ...td, color: PRINT.red }}>{(roll.pwrMax_w / 1000).toFixed(1)} kW</td></tr>
              </tbody>
            </table>
          </section>
        )}

        {showElec && (
          <section>
            <h3 style={{ color: PRINT.acc, borderBottom: `1px solid ${PRINT.line}`, paddingBottom: 6 }}>Informações Elétricas</h3>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Pico (pwrMax) dimensiona disjuntor e cabo; típico estima o gerador. {agg.vc.label}.</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Gab.</th><th style={th}>Pico kW</th><th style={th}>Pico kVA</th><th style={th}>Pico A</th><th style={th}>Disjuntor</th><th style={th}>Típ. kVA</th><th style={th}>Típ. A</th></tr></thead>
              <tbody>
                {agg.perTela.map(({ tela, gab, peak, typ }) => (
                  <tr key={tela.id}><td style={td}>{tela.nome}</td><td style={td}>{gab}</td><td style={{ ...td, color: PRINT.red }}>{(peak.W / 1000).toFixed(1)}</td><td style={td}>{peak.kVA}</td><td style={{ ...td, color: PRINT.amb }}>{peak.I}</td><td style={{ ...td, color: PRINT.red }}>{peak.breaker} A</td><td style={td}>{typ.kVA}</td><td style={td}>{typ.I}</td></tr>
                ))}
                <tr style={{ fontWeight: 700 }}><td style={td}>Total</td><td style={td}>{roll.gab}</td><td style={{ ...td, color: PRINT.red }}>{(agg.W / 1000).toFixed(1)}</td><td style={td}>{agg.kVA}</td><td style={{ ...td, color: PRINT.amb }}>{agg.I}</td><td style={{ ...td, color: PRINT.red }}>{agg.breaker} A</td><td style={td}>{agg.typKva}</td><td style={td}>{agg.typI}</td></tr>
              </tbody>
            </table>
            <p style={{ color: PRINT.mut, fontSize: 12, marginTop: 8 }}>Gerador sugerido (típico + 25% de margem): <b style={{ color: PRINT.acc }}>~{agg.gerador} kVA</b>.</p>
          </section>
        )}
      </div>
    </div>
  );
}
