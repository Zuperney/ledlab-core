// pages/Diagrams.jsx — Diagramação: planejador rápido de portas de SINAL.
//
// Usa o MESMO motor de cabeamento (services/cabling.js) da aba Cabeamento e do
// Test Card, então a contagem de portas (regra de ÁREA quadrada da Novastar), o
// desenho (linha branca + selo no canto inferior-esquerdo) e a numeração global
// dos cabos ficam CONSISTENTES em todo o app. Ferramenta avulsa: escolhe um
// gabinete e uma grade, sem precisar de projeto (não persiste).
import { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { paletteColor, T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import { key, bboxArea, cableMeta, cablePorts } from "../services/cabling.js";
import SectionHeader from "../components/SectionHeader.jsx";

const CELL = 64; // tamanho da célula no canvas (o zoom escala)

export default function Diagrams() {
  const { cabs, prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr"; // ordem global de numeração
  const [cabId, setCabId] = useState(cabs[0]?.id);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(6);
  const [hz, setHz] = useState(60);
  const [strategy, setStrategy] = useState("linha");
  const [routing, setRouting] = useState("updown");

  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const drag = useRef(null);

  const cab = cabs.find((c) => c.id === cabId) || cabs[0];
  const panelW = cols * CELL, panelH = rows * CELL;

  // tela sintética -> reaproveita exatamente a lógica compartilhada
  const tela = { cols, rows, gabinete: cab, cabling: { sinal: { strategy, routing, hz } } };
  const { sinalBudget } = cableMeta(tela);
  const ports = cablePorts(tela, "sinal", numbering);

  const portOf = {};
  ports.forEach((p, i) => p.forEach((cell) => { portOf[key(cell.c, cell.r)] = i; }));
  const usage = (port) => bboxArea(port) / sinalBudget; // regra de área (bounding box)
  const anyOver = ports.some((p) => usage(p) > 1.001);
  const status = anyOver ? { l: "Alerta", c: T.red } : { l: "OK", c: T.grn };

  const fit = useCallback(() => {
    const el = stageRef.current; if (!el) return;
    const z = Math.min(el.clientWidth / panelW, el.clientHeight / panelH) * 0.9 || 1;
    setZoom(z); setPan({ x: (el.clientWidth - panelW * z) / 2, y: (el.clientHeight - panelH * z) / 2 });
  }, [panelW, panelH]);
  useEffect(() => { fit(); }, [fit]); // re-enquadra quando a grade muda

  const onWheel = (e) => {
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top, f = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(6, Math.max(0.1, z * f)));
    setPan((p) => ({ x: mx - (mx - p.x) * f, y: my - (my - p.y) * f }));
  };
  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; };
  const onMove = (e) => { if (drag.current) setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); };
  const onUp = () => { drag.current = null; };
  const onTouchStart = (e) => { const t = e.touches[0]; if (t) drag.current = { x: t.clientX, y: t.clientY, px: pan.x, py: pan.y }; };
  const onTouchMove = (e) => { const t = e.touches[0]; if (drag.current && t) setPan({ x: drag.current.px + (t.clientX - drag.current.x), y: drag.current.py + (t.clientY - drag.current.y) }); };
  const zoomBy = (f) => { const el = stageRef.current, cw = el.clientWidth / 2, ch = el.clientHeight / 2; setZoom((z) => Math.min(6, Math.max(0.1, z * f))); setPan((p) => ({ x: cw - (cw - p.x) * f, y: ch - (ch - p.y) * f })); };

  const inp = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" };
  const lbl = { textTransform: "uppercase", fontSize: 11, color: T.mut, display: "block", marginBottom: 4 };

  return (
    <div>
      <SectionHeader title="Diagramação" subtitle="Planeje as portas de sinal por tela (regra de área Novastar), consistente com o Cabeamento." />

      <div style={card({ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 16 })}>
        <div><label style={lbl}>Gabinete</label><select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={inp}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
        <div><label style={lbl}>Colunas</label><input type="number" value={cols} onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 80 }} /></div>
        <div><label style={lbl}>Linhas</label><input type="number" value={rows} onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 80 }} /></div>
        <div><label style={lbl}>Refresh</label><select value={hz} onChange={(e) => setHz(parseInt(e.target.value))} style={inp}>{[60, 50, 30].map((r) => <option key={r} value={r}>{r} Hz</option>)}</select></div>
        <Seg label="Disposição" options={[["linha", "Linha"], ["coluna", "Coluna"], ["area", "Área"]]} value={strategy} onChange={setStrategy} />
        <Seg label="Sentido" options={[["updown", "Sobe/desce"], ["zigzag", "Zig-zag"]]} value={routing} onChange={setRouting} />
      </div>

      <div style={card({ padding: 0, overflow: "hidden" })}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>{cab?.nome || "—"} · Sinal</div>
            <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>{cols * rows} gabinetes · máx {sinalBudget} gab/porta (área quadrada) · {ports.length} portas</div>
          </div>
          <span style={{ background: status.c + "22", color: status.c, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{status.l}</span>
        </div>

        {/* CANVAS */}
        <div ref={stageRef} onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onUp}
          style={{ position: "relative", height: 460, background: "#08080f", overflow: "hidden", cursor: drag.current ? "grabbing" : "grab", touchAction: "none" }}>
          <svg width="100%" height="100%" style={{ display: "block" }}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              <rect x={-8} y={-8} width={panelW + 16} height={panelH + 16} rx={10} fill="#0d0d1a" stroke={T.bd} strokeWidth={1.5} />
              {Array.from({ length: rows }).map((_, r) => Array.from({ length: cols }).map((_, c) => {
                const pi = portOf[key(c, r)];
                const col = pi === undefined ? T.dim2 : paletteColor(pi);
                return <rect key={key(c, r)} x={c * CELL + 3} y={r * CELL + 3} width={CELL - 6} height={CELL - 6} rx={6}
                  fill={pi === undefined ? "transparent" : col + "26"} stroke={col} strokeWidth={1.5} strokeDasharray={pi === undefined ? "5 5" : undefined} />;
              }))}
              {ports.map((port, pi) => {
                if (!port.length) return null;
                const pts = port.map((cell) => `${cell.c * CELL + CELL / 2},${cell.r * CELL + CELL / 2}`).join(" ");
                const f = port[0];
                return (
                  <g key={pi} style={{ pointerEvents: "none" }}>
                    <polyline points={pts} fill="none" stroke="#fff" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />
                    <circle cx={f.c * CELL + CELL / 2} cy={f.r * CELL + CELL / 2} r={14} fill={paletteColor(pi)} stroke="#fff" strokeWidth={2} />
                    <text x={f.c * CELL + CELL / 2} y={f.r * CELL + CELL / 2} fill="#fff" fontSize={14} fontWeight="700" textAnchor="middle" dominantBaseline="central">{pi + 1}</text>
                  </g>
                );
              })}
            </g>
          </svg>
          <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {[[ZoomIn, () => zoomBy(1.2), "Aumentar"], [Maximize, fit, "Enquadrar"], [ZoomOut, () => zoomBy(0.8), "Diminuir"]].map(([Ic, fn, t], i) => (
              <button key={i} title={t} onClick={fn} style={{ width: 34, height: 34, borderRadius: 8, background: T.card, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic size={16} /></button>
            ))}
          </div>
          <div style={{ position: "absolute", left: 12, bottom: 12, color: T.dim, fontSize: 11, background: "rgba(0,0,0,0.4)", padding: "4px 8px", borderRadius: 6 }}>
            início inferior-esquerdo · arraste p/ mover · scroll p/ zoom
          </div>
        </div>

        {/* LEGENDA — % de uso por porta (regra de área) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 14, borderTop: `1px solid ${T.bd}` }}>
          {ports.map((port, i) => {
            const pct = Math.round(usage(port) * 100);
            const over = pct > 100;
            return (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, background: T.card2, border: `1px solid ${over ? T.red : T.bd}`, borderRadius: 8, padding: "5px 10px", fontSize: 12 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: paletteColor(i), flexShrink: 0 }} />
                <span style={{ color: T.txt, fontWeight: 600 }}>Porta {i + 1}</span>
                <span style={{ color: over ? T.red : T.mut }}>{pct}%</span>
                <span style={{ color: T.dim }}>· {port.length} gab</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Seg({ label, options, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {options.map(([v, l]) => {
          const act = v === value;
          return <button key={String(v)} onClick={() => onChange(v)} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${act ? T.acc : T.bd}`, background: act ? T.acc : T.card2, color: act ? "#fff" : T.mut }}>{l}</button>;
        })}
      </div>
    </div>
  );
}
