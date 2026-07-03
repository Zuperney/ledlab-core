// pages/project/ProjectEnergia.jsx — aba Energia (AC): pico + típico por tela e total.
import { useLedLabContext } from "../../store/AppContext.jsx";
import { aggregateElectrical } from "../../services/projectCalc.js";
import { VOLT } from "../../services/electricalCalc.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { T } from "../../ui/tokens.js";
import { card } from "../../ui/styles.js";

export default function ProjectEnergia({ project, patch }) {
  const { prefs } = useLedLabContext();
  const isMobile = useIsMobile();
  const cfg = project.config || { vk: prefs.vk, brilho: prefs.brilho, conteudo: prefs.conteudo };
  const setCfg = (partial) => patch({ config: { ...cfg, ...partial } });

  const agg = aggregateElectrical(project, { vk: cfg.vk, brilho: cfg.brilho, conteudo: cfg.conteudo });

  return (
    <div>
      <div style={card({ display: "flex", gap: 24, alignItems: "center", marginBottom: 16, flexWrap: "wrap" })}>
        <div>
          <div style={{ textTransform: "uppercase", fontSize: 11, color: T.mut, marginBottom: 6 }}>Tensão do evento</div>
          <select value={cfg.vk} onChange={(e) => setCfg({ vk: e.target.value })} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px" }}>
            {Object.entries(VOLT).map(([k, v]) => <option key={k} value={k}>{v.g}V · {v.label}</option>)}
          </select>
        </div>
        <RangeInline label="Brilho de operação" value={cfg.brilho} onChange={(v) => setCfg({ brilho: v })} />
        <RangeInline label="Conteúdo (fração da potência)" value={cfg.conteudo} onChange={(v) => setCfg({ conteudo: v })} />
      </div>

      {agg.perTela.map(({ tela, peak, typ }) => (
        <div key={tela.id} style={card({ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", marginBottom: 10, flexWrap: "wrap", gap: 10, flexDirection: isMobile ? "column" : "row" })}>
          <div>
            <div style={{ color: T.txt, fontWeight: 600 }}>{tela.nome}</div>
            <div style={{ color: T.dim, fontSize: 12, fontFamily: "ui-monospace,monospace" }}>{tela.gabinete?.nome} · {tela.cols}×{tela.rows} = {tela.cols * tela.rows} gab · {tela.gabinete?.pwrMax}W máx.</div>
          </div>
          <div style={{ textAlign: isMobile ? "left" : "right", fontSize: 13, fontFamily: "ui-monospace,monospace" }}>
            <div><span style={{ color: T.mut }}>PICO </span><b style={{ color: T.acM }}>{peak.W.toLocaleString()} W</b> · <b style={{ color: T.grn }}>{peak.kVA} kVA</b> · <b style={{ color: T.amb }}>{peak.I} A</b> · <b style={{ color: T.red }}>disj {peak.breaker} A</b></div>
            <div style={{ color: T.dim }}>TÍP. {Math.round(typ.W).toLocaleString()} W · {typ.kVA} kVA · {typ.I} A</div>
          </div>
        </div>
      ))}

      <div style={card({ marginTop: 6 })}>
        <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12, marginBottom: 12 }}>Total do projeto · {agg.vc.label}</div>
        <Row tag="PICO" tagColor={T.red} isMobile={isMobile} cols={[["Carga", `${agg.W.toLocaleString()} W`, T.txt], ["kVA", agg.kVA, T.grn], ["A/fase", agg.I, T.amb], ["Disj. geral", `${agg.breaker} A`, T.red]]} />
        <Row tag="TÍPICO" tagColor={T.acM} isMobile={isMobile} cols={[["Carga", `${Math.round(agg.typW).toLocaleString()} W`, T.txt], ["kVA", agg.typKva, T.grn], ["A/fase", agg.typI, T.amb], ["Gerador ~", `${agg.gerador} kVA`, T.acM]]} />
      </div>
      <div style={{ color: T.dim, fontSize: 12, marginTop: 10 }}><b style={{ color: T.red }}>Pico</b> (consumo máximo) dimensiona disjuntor e cabo; <b style={{ color: T.grn }}>Típico</b> (black level + brilho × conteúdo) estima o gerador / consumo real.</div>
    </div>
  );
}

function Row({ tag, tagColor, cols, isMobile }) {
  const metric = ([l, v, c]) => (
    <div key={l}><div style={{ fontSize: 10, textTransform: "uppercase", color: T.dim }}>{l}</div><div style={{ fontWeight: 700, color: c }}>{v}</div></div>
  );
  if (isMobile) {
    return (
      <div style={{ padding: "8px 0", borderTop: `1px solid ${T.bd}` }}>
        <div style={{ color: tagColor, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{tag}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{cols.map(metric)}</div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px repeat(4,1fr)", gap: 8, alignItems: "center", padding: "6px 0" }}>
      <span style={{ color: tagColor, fontWeight: 700, fontSize: 12 }}>{tag}</span>
      {cols.map(metric)}
    </div>
  );
}

function RangeInline({ label, value, onChange }) {
  return (
    <div style={{ flex: 1, minWidth: 200 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.mut, marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: T.acM, fontWeight: 700 }}>{Math.round(value * 100)}%</span>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={value} onChange={(e) => onChange(parseFloat(e.target.value))} style={{ width: "100%", accentColor: T.acc }} />
    </div>
  );
}
