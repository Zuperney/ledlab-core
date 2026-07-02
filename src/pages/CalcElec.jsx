// pages/CalcElec.jsx — Cálculos Elétricos (rascunho rápido, não salva em projeto).
import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { calcScreen, typicalPerTile, VOLT } from "../services/electricalCalc.js";
import { T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";

function Slider({ label, value, min, max, step, suffix, onChange, valueColor }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: T.mut }}>{label}</span>
        <span style={{ fontWeight: 700, color: valueColor || T.txt }}>{value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: "100%", accentColor: T.acc }} />
    </div>
  );
}

function Toggle({ options, value, onChange }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},1fr)`, gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button key={o.value} onClick={() => onChange(o.value)}
            style={{
              padding: "10px 8px", borderRadius: 8, cursor: "pointer", fontWeight: 600, fontSize: 14,
              background: active ? T.acc : T.card2, color: active ? "#fff" : T.mut,
              border: `1px solid ${active ? T.acc : T.bd}`,
            }}>
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function OutCard({ label, value, valueColor, hint, accent }) {
  return (
    <div style={card({ borderColor: accent ? T.acc : T.bd })}>
      <div style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: T.mut }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: valueColor || T.txt, margin: "6px 0 2px" }}>{value}</div>
      {hint && <div style={{ fontSize: 12, color: T.dim }}>{hint}</div>}
    </div>
  );
}

export default function CalcElec() {
  const { cabs } = useLedLabContext();
  const [sel, setSel] = useState("manual");
  const [tiles, setTiles] = useState(48);
  const [pwrPerTile, setPwrPerTile] = useState(300);
  const [pwrBlack, setPwrBlack] = useState(0);
  const [pf, setPf] = useState(0.8);
  const [brilho, setBrilho] = useState(0.7);
  const [conteudo, setConteudo] = useState(0.33);
  const [grupo, setGrupo] = useState("220");
  const [vk, setVk] = useState("220_tri");

  const onSelectCab = (id) => {
    setSel(id);
    if (id === "manual") return;
    const c = cabs.find((x) => String(x.id) === String(id));
    if (c) {
      setPwrPerTile(parseFloat(c.pwrMax) || 0);
      setPf(parseFloat(c.fp) || 0.8);
      setPwrBlack(parseFloat(c.pwrBlack) || 0);
    }
  };

  const setGroup = (g) => {
    setGrupo(g);
    setVk(g === "220" ? "220_tri" : "380_tri");
  };

  const peak = calcScreen({ tiles, pwrPerTile, pf, vk });
  const typPerTile = typicalPerTile(pwrPerTile, pwrBlack, brilho, conteudo);
  const typ = calcScreen({ tiles, pwrPerTile: typPerTile, pf, vk });

  const phaseOptions =
    grupo === "220"
      ? [{ value: "220_bi", label: "Bifásico" }, { value: "220_tri", label: "Trifásico" }]
      : [{ value: "380_mono", label: "Monofásico" }, { value: "380_bi", label: "Bifásico" }, { value: "380_tri", label: "Trifásico" }];

  return (
    <div>
      <SectionHeader title="Cálculos Elétricos" subtitle="Dimensionamento de carga: pico (disjuntor/cabo) e consumo típico (gerador)" />

      <div style={{ display: "flex", alignItems: "center", gap: 10, background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, color: T.mut, fontSize: 13 }}>
        <FlaskConical size={16} color={T.acM} />
        <span><b style={{ color: T.txt }}>Rascunho rápido.</b> Para testar e estudar — não salva em nenhum projeto. Para um evento real, abra um <b style={{ color: T.acM }}>Projeto</b>.</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(340px, 1fr) minmax(320px, 1fr)", gap: 16, alignItems: "start" }}>
        {/* inputs */}
        <div style={card()}>
          <div style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: T.mut, marginBottom: 6 }}>Gabinete da Biblioteca</div>
          <select value={sel} onChange={(e) => onSelectCab(e.target.value)}
            style={{ width: "100%", background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px", fontSize: 14, marginBottom: 18 }}>
            <option value="manual">Personalizado / Entrada Manual</option>
            {cabs.map((c) => <option key={c.id} value={c.id}>{c.nome} — {c.pwrMax}W máx.</option>)}
          </select>

          <Slider label="Quantidade de tiles" value={tiles} min={1} max={500} step={1} suffix=" tiles" onChange={setTiles} />
          <Slider label="Potência máx. por tile (W)" value={pwrPerTile} min={50} max={600} step={10} suffix="W" onChange={setPwrPerTile} />
          <Slider label="Fator de potência" value={pf} min={0.7} max={1} step={0.01} suffix="" onChange={setPf} />

          <div style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: T.mut, margin: "10px 0 8px" }}>Consumo de evento (típico)</div>
          <Slider label="Brilho de operação" value={Math.round(brilho * 100)} min={0} max={100} step={1} suffix="%" valueColor={T.acM} onChange={(v) => setBrilho(v / 100)} />
          <Slider label="Conteúdo (fração da potência)" value={Math.round(conteudo * 100)} min={0} max={100} step={1} suffix="%" valueColor={T.acM} onChange={(v) => setConteudo(v / 100)} />
          <div style={{ fontSize: 12, color: T.dim, marginBottom: 18 }}>Black level: ~15% do máx. (estimado).</div>

          <div style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: T.mut, marginBottom: 8 }}>Tipo de alimentação</div>
          <div style={{ marginBottom: 8 }}>
            <Toggle options={[{ value: "220", label: "220V" }, { value: "380", label: "380V" }]} value={grupo} onChange={setGroup} />
          </div>
          <Toggle options={phaseOptions} value={vk} onChange={setVk} />
        </div>

        {/* outputs */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <OutCard label="Carga (pico)" value={`${(peak.W / 1000).toFixed(1)} kW`} valueColor={T.acM} hint={`${tiles} × ${pwrPerTile}W máx.`} />
          <OutCard label="kVA (pico)" value={`${peak.kVA} kVA`} valueColor={T.grn} hint="S ÷ 1000" />
          <OutCard label="Corrente por fase (pico)" value={`${peak.I} A`} valueColor={T.amb} hint={VOLT[vk].label} />
          <OutCard label="Disjuntor sugerido" value={`${peak.breaker} A`} valueColor={T.red} hint="margem de segurança 25%" />

          <div style={card({ borderColor: T.acc })}>
            <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12, marginBottom: 10 }}>Consumo típico (gerador)</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
              {[["Carga", `${(typ.W / 1000).toFixed(1)} kW`, T.acM], ["kVA", typ.kVA, T.grn], ["A / fase", `${typ.I} A`, T.amb], ["Gerador ~", `${(parseFloat(typ.kVA) * 1.25).toFixed(1)} kVA`, T.txt]].map(([l, v, c]) => (
                <div key={l}>
                  <div style={{ fontSize: 10, textTransform: "uppercase", color: T.dim }}>{l}</div>
                  <div style={{ fontWeight: 700, color: c }}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 11, color: T.dim, marginTop: 10 }}>Modelo Barco: black level + (máx − preto) × brilho × conteúdo. Use o pico (acima) p/ disjuntor e cabo.</div>
          </div>

          <div style={card()}>
            <div style={{ color: T.acM, fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Como foi calculado (pico)</div>
            <div style={{ fontFamily: "ui-monospace, monospace", fontSize: 12, color: T.mut, lineHeight: 1.9 }}>
              {peak.steps.map((s, i) => <div key={i}>{s}</div>)}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
