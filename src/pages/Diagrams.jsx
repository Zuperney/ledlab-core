// pages/Diagrams.jsx — Diagramação: planejador rápido de portas de sinal.
import { useState } from "react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { paletteColor, T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";

const PX_PER_PORT = 655360;

const serpentine = (cols, rows) => {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const range = r % 2 === 0 ? [...Array(cols).keys()] : [...Array(cols).keys()].reverse();
    range.forEach((c) => cells.push({ c, r }));
  }
  return cells;
};

export default function Diagrams() {
  const { cabs } = useLedLabContext();
  const [cabId, setCabId] = useState(cabs[0]?.id);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(6);
  const [hz, setHz] = useState(60);

  const cab = cabs.find((c) => c.id === cabId) || cabs[0];
  const pxPerCab = (parseFloat(cab?.resX) || 1) * (parseFloat(cab?.resY) || 1);
  const cap = Math.floor((PX_PER_PORT * 60) / hz);
  const perPort = Math.max(1, Math.floor(cap / pxPerCab));
  const cells = serpentine(cols, rows);
  const portsNeeded = Math.ceil(cells.length / perPort);

  const W = 820, H = Math.round((W / cols) * rows), cw = W / cols, ch = H / rows;
  const inp = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" };
  const lbl = { textTransform: "uppercase", fontSize: 11, color: T.mut, display: "block", marginBottom: 4 };

  return (
    <div>
      <SectionHeader title="Diagramação" subtitle="Planeje o fluxo de sinal (serpentina) e o número de portas por tela." />
      <div style={card({ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 })}>
        <div><label style={lbl}>Gabinete</label><select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={inp}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div><label style={lbl}>Colunas</label><input type="number" value={cols} onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 80 }} /></div>
        <div><label style={lbl}>Linhas</label><input type="number" value={rows} onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 80 }} /></div>
        <div><label style={lbl}>Refresh</label><select value={hz} onChange={(e) => setHz(parseInt(e.target.value))} style={inp}>{[60, 50, 30].map((r) => <option key={r} value={r}>{r} Hz</option>)}</select></div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div style={{ color: T.mut, fontSize: 12 }}>{cells.length} gabinetes · {perPort}/porta</div>
          <div style={{ color: T.acM, fontWeight: 800, fontSize: 22 }}>{portsNeeded} portas</div>
        </div>
      </div>

      <div style={card()}>
        <div style={{ overflow: "auto" }}>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, background: T.card2, borderRadius: 8 }}>
            {cells.map((cell, i) => {
              const col = paletteColor(Math.floor(i / perPort));
              return <rect key={i} x={cell.c * cw} y={cell.r * ch} width={cw - 2} height={ch - 2} fill={col + "22"} stroke={col} strokeWidth="1.5" rx="4" />;
            })}
            {Array.from({ length: portsNeeded }).map((_, pi) => {
              const port = cells.slice(pi * perPort, (pi + 1) * perPort);
              const pts = port.map((c) => `${c.c * cw + cw / 2},${c.r * ch + ch / 2}`).join(" ");
              const first = port[0];
              const col = paletteColor(pi);
              return (
                <g key={pi}>
                  <polyline points={pts} fill="none" stroke={col} strokeWidth="3" strokeLinejoin="round" />
                  <circle cx={first.c * cw + cw / 2} cy={first.r * ch + ch / 2} r={Math.min(cw, ch) * 0.22} fill={col} />
                  <text x={first.c * cw + cw / 2} y={first.r * ch + ch / 2} fill="#fff" fontSize={Math.min(cw, ch) * 0.26} fontWeight="700" textAnchor="middle" dominantBaseline="central">{pi + 1}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}
