// pages/project/ProjectEnergia.jsx — aba Energia (AC): pico + típico por tela e total.
import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useElectrical } from "../../hooks/useElectrical.js";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback.js";
import { T } from "../../ui/tokens.js";
import { card } from "../../ui/styles.js";
import Select from "../../components/Select.jsx";

export default function ProjectEnergia({ project, patch }) {
  const isMobile = useIsMobile();
  const { cfg, agg, VOLT } = useElectrical(project);
  const setCfg = (partial) => patch({ config: { ...cfg, ...partial } });
  const [open, setOpen] = useState(null); // "brilho" | "conteudo" | null — qual slider está aberto
  const [telaOpen, setTelaOpen] = useState(null); // mobile: qual card de tela está expandido

  return (
    <div>
      <div style={card({ marginBottom: 16 })}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Select value={cfg.vk} onChange={(e) => setCfg({ vk: e.target.value })} title="Tensão do evento"
            style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 600 }}>
            {Object.entries(VOLT).map(([k, v]) => <option key={k} value={k}>{v.g}V · {v.label}</option>)}
          </Select>
          <ValueChip label="Brilho" pct={Math.round(cfg.brilho * 100)} active={open === "brilho"} onClick={() => setOpen((o) => (o === "brilho" ? null : "brilho"))} />
          <ValueChip label="Conteúdo" pct={Math.round(cfg.conteudo * 100)} active={open === "conteudo"} onClick={() => setOpen((o) => (o === "conteudo" ? null : "conteudo"))} />
        </div>
        {open === "brilho" && <SliderRow label="Brilho de operação" value={cfg.brilho} onChange={(v) => setCfg({ brilho: v })} />}
        {open === "conteudo" && <SliderRow label="Conteúdo (fração da potência)" value={cfg.conteudo} onChange={(v) => setCfg({ conteudo: v })} />}
      </div>

      {/* MOBILE: cards por tela RECOLHIDOS (pedido do usuário) — a linha fechada mostra o
          que manda no campo (disjuntor); toque expande. Desktop segue tudo aberto. */}
      {agg.perTela.map(({ tela, peak, typ }) => {
        const aberto = !isMobile || telaOpen === tela.id;
        return (
          <div key={tela.id} style={card({ marginBottom: 10, padding: isMobile ? "4px 14px" : undefined })}>
            <div onClick={isMobile ? () => setTelaOpen((o) => (o === tela.id ? null : tela.id)) : undefined}
              role={isMobile ? "button" : undefined}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: isMobile ? "pointer" : "default", minHeight: isMobile ? 44 : 0 }}>
              <div style={{ color: T.txt, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tela.nome}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {isMobile && !aberto && <span style={{ fontSize: 12.5, fontFamily: "ui-monospace,monospace", color: T.mut }}>{peak.kVA} kVA · <b style={{ color: T.red }}>disj {peak.breaker} A</b></span>}
                {isMobile && (aberto ? <ChevronUp size={16} color={T.dim} /> : <ChevronDown size={16} color={T.dim} />)}
              </div>
            </div>
            {aberto && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexWrap: "wrap", gap: 10, flexDirection: isMobile ? "column" : "row", paddingBottom: isMobile ? 10 : 0 }}>
                <div style={{ color: T.dim, fontSize: 12, fontFamily: "ui-monospace,monospace" }}>{tela.gabinete?.nome} · {tela.cols}×{tela.rows} = {tela.cols * tela.rows} gab · {tela.gabinete?.pwrMax}W máx.</div>
                <div style={{ textAlign: isMobile ? "left" : "right", fontSize: 13, fontFamily: "ui-monospace,monospace" }}>
                  <div><span style={{ color: T.mut }}>PICO </span><b style={{ color: T.acM }}>{peak.W.toLocaleString()} W</b> · <b style={{ color: T.grn }}>{peak.kVA} kVA</b> · <b style={{ color: T.amb }}>{peak.I} A</b> · <b style={{ color: T.red }}>disj {peak.breaker} A</b></div>
                  <div style={{ color: T.dim }}>TÍP. {Math.round(typ.W).toLocaleString()} W · {typ.kVA} kVA · {typ.I} A</div>
                </div>
              </div>
            )}
          </div>
        );
      })}

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

// chip compacto que mostra o valor e abre o slider ao tocar
function ValueChip({ label, pct, active, onClick }) {
  return (
    <button onClick={onClick} title={label}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: `1px solid ${active ? T.acc : T.bd}`, background: active ? T.sel : T.card2, color: T.txt, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
      <span style={{ color: T.mut }}>{label}</span>
      <b style={{ color: T.acM }}>{pct}%</b>
      <SlidersHorizontal size={13} style={{ color: T.dim }} />
    </button>
  );
}

function SliderRow({ label, value, onChange }) {
  const [v, setV] = useState(value);
  // espelha o valor externo durante o render (padrão "derived state" do React)
  const [prev, setPrev] = useState(value);
  if (prev !== value) { setPrev(value); setV(value); }
  const commit = useDebouncedCallback(onChange, 180); // persiste/recalcula só ao parar de arrastar
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.mut, marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: T.acM, fontWeight: 700 }}>{Math.round(v * 100)}%</span>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={v} onChange={(e) => { const n = parseFloat(e.target.value); setV(n); commit(n); }} style={{ width: "100%", accentColor: T.acc }} />
    </div>
  );
}
