// pages/CalcAdv.jsx — Cálculos Avançados: portas/processadoras.
import { useState } from "react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";

const PX_PER_PORT = 650000;
const PROCESSORS = [
  { id: "mctrl300", nome: "Novastar MCTRL300", portas: 2 },
  { id: "mctrl660", nome: "Novastar MCTRL660 Pro", portas: 2 },
  { id: "mctrl4k", nome: "Novastar MCTRL4K", portas: 4 },
  { id: "vx400", nome: "Novastar VX400", portas: 4 },
  { id: "vx600", nome: "Novastar VX600", portas: 6 },
  { id: "vx1000", nome: "Novastar VX1000", portas: 10 },
];
const REFRESH = [50, 60, 100, 120, 144];
const fmt = (n) => Number(n).toLocaleString("pt-BR");

export default function CalcAdv() {
  const { cabs } = useLedLabContext();
  const [sel, setSel] = useState("manual");
  const [resX, setResX] = useState(192);
  const [resY, setResY] = useState(192);
  const [tiles, setTiles] = useState(48);
  const [procId, setProcId] = useState("mctrl4k");
  const [hz, setHz] = useState(60);

  const onCab = (id) => {
    setSel(id);
    const c = cabs.find((x) => String(x.id) === id);
    if (c) { setResX(parseFloat(c.resX)); setResY(parseFloat(c.resY)); }
  };

  const proc = PROCESSORS.find((p) => p.id === procId);
  const pxPerTile = resX * resY;
  const portCapacity = hz > 0 ? Math.round((60 / hz) * PX_PER_PORT) : PX_PER_PORT;
  const tilesPerPort = Math.max(1, Math.floor(portCapacity / pxPerTile));
  const portsNeeded = Math.ceil(tiles / tilesPerPort);
  const processorsNeeded = Math.ceil(portsNeeded / proc.portas);
  const util = Math.min(100, Math.round((tilesPerPort * pxPerTile) / portCapacity * 100));

  const inp = { width: "100%", background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", marginBottom: 14 };
  const lbl = { textTransform: "uppercase", fontSize: 11, color: T.mut, display: "block", marginBottom: 6 };

  return (
    <div>
      <SectionHeader title="Cálculos Avançados" subtitle="Limites de hardware, tiles por porta e dimensionamento de processadoras" />
      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px,1fr) minmax(320px,1fr)", gap: 16, alignItems: "start" }}>
        <div style={card()}>
          <label style={lbl}>Gabinete da Biblioteca</label>
          <select value={sel} onChange={(e) => onCab(e.target.value)} style={inp}>
            <option value="manual">Personalizado / Entrada Manual</option>
            {cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><label style={lbl}>Resolução X</label><input type="number" value={resX} onChange={(e) => setResX(parseFloat(e.target.value) || 0)} style={inp} /></div>
            <div><label style={lbl}>Resolução Y</label><input type="number" value={resY} onChange={(e) => setResY(parseFloat(e.target.value) || 0)} style={inp} /></div>
          </div>
          <label style={lbl}>Quantidade de tiles</label>
          <input type="number" value={tiles} onChange={(e) => setTiles(parseInt(e.target.value) || 0)} style={inp} />
          <label style={lbl}>Processadora</label>
          <select value={procId} onChange={(e) => setProcId(e.target.value)} style={inp}>{PROCESSORS.map((p) => <option key={p.id} value={p.id}>{p.nome} ({p.portas} portas)</option>)}</select>
          <label style={lbl}>Taxa de atualização (Hz)</label>
          <select value={hz} onChange={(e) => setHz(parseInt(e.target.value))} style={inp}>{REFRESH.map((r) => <option key={r} value={r}>{r} Hz</option>)}</select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <Stat label="Tiles por porta" value={fmt(tilesPerPort)} color={T.acM} hint={`capacidade ${fmt(portCapacity)} px @ ${hz}Hz`} />
          <Stat label="Portas necessárias" value={fmt(portsNeeded)} color={T.amb} hint={`${fmt(tiles)} tiles ÷ ${fmt(tilesPerPort)}`} />
          <Stat label="Processadoras" value={fmt(processorsNeeded)} color={T.red} hint={`⌈${portsNeeded} ÷ ${proc.portas}⌉`} />
          <div style={card()}>
            <div style={{ textTransform: "uppercase", fontSize: 11, color: T.mut }}>Utilização por porta</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: T.grn, margin: "6px 0" }}>{util}%</div>
            <div style={{ height: 8, background: T.card2, borderRadius: 4, overflow: "hidden" }}><div style={{ width: `${util}%`, height: "100%", background: T.acc }} /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, hint }) {
  return (
    <div style={card()}>
      <div style={{ textTransform: "uppercase", fontSize: 11, color: T.mut }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color, margin: "6px 0 2px" }}>{value}</div>
      <div style={{ fontSize: 12, color: T.dim }}>{hint}</div>
    </div>
  );
}
