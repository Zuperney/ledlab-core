// pages/project/ProjectCabeamento.jsx — roteamento de sinal/AC num canvas com zoom/pan/fit.
//
// Regra de SINAL (Novastar básico): a capacidade da porta é limitada pela ÁREA
// RETANGULAR (bounding box) dos gabinetes atendidos — ao pular de linha, o sistema
// conta o retângulo inteiro. Ex.: 10 numa linha + 1 na linha de cima = conta 20.
// (Sistemas novos, ex. VX2000 + receiving cards série A, mudam isso — fica p/ depois.)
import { useState, useRef, useEffect, useCallback } from "react";
import { Monitor, Eraser, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { paletteColor, T } from "../../ui/tokens.js";
import { card } from "../../ui/styles.js";
import Placeholder from "../../components/Placeholder.jsx";

const PX_PER_PORT = 655360; // sinal (Gigabit) @60Hz
const FASE_V = 220;
const CONN_AMP = { "PowerCON Azul/Branco": 20, "PowerCON TRUE1": 16, "Neutrik True1": 16, "Neutrik True1 TOP": 20, "HangTon SD20": 20, PowerCON: 20 };
const CELL = 64;

const range = (n) => [...Array(Math.max(0, n)).keys()];
const key = (c, r) => `${r},${c}`;

function serpentine(cols, rows, vertical) {
  const cells = [];
  if (vertical) for (let c = 0; c < cols; c++) (c % 2 ? range(rows).reverse() : range(rows)).forEach((r) => cells.push({ c, r }));
  else for (let r = 0; r < rows; r++) (r % 2 ? range(cols).reverse() : range(cols)).forEach((c) => cells.push({ c, r }));
  return cells;
}

// agrupa por ÁREA do retângulo envolvente (regra Novastar de sinal)
function portsByArea(order, maxArea) {
  const ports = []; let cur = null, box = null;
  for (const cell of order) {
    if (!cur) { cur = [cell]; box = { minC: cell.c, maxC: cell.c, minR: cell.r, maxR: cell.r }; continue; }
    const nb = { minC: Math.min(box.minC, cell.c), maxC: Math.max(box.maxC, cell.c), minR: Math.min(box.minR, cell.r), maxR: Math.max(box.maxR, cell.r) };
    if ((nb.maxC - nb.minC + 1) * (nb.maxR - nb.minR + 1) > maxArea) { ports.push(cur); cur = [cell]; box = { minC: cell.c, maxC: cell.c, minR: cell.r, maxR: cell.r }; }
    else { cur.push(cell); box = nb; }
  }
  if (cur) ports.push(cur);
  return ports;
}
// agrupa por contagem (AC — soma de corrente, sem regra de área)
function portsByCount(order, n) { const o = []; for (let i = 0; i < order.length; i += n) o.push(order.slice(i, i + n)); return o; }
// telha em blocos retangulares (estratégia Área)
function rectangleTiles(cols, rows, maxArea) {
  const bh = Math.max(1, Math.min(rows, Math.floor(Math.sqrt(maxArea))));
  const bw = Math.max(1, Math.min(cols, Math.floor(maxArea / bh)));
  const ports = [];
  for (let by = 0; by < rows; by += bh)
    for (let bx = 0; bx < cols; bx += bw) {
      const block = [];
      range(Math.min(bh, rows - by)).forEach((i, ri) => {
        const r = by + i;
        const cs = range(Math.min(bw, cols - bx)).map((k) => bx + k);
        (ri % 2 ? cs.reverse() : cs).forEach((c) => block.push({ c, r }));
      });
      if (block.length) ports.push(block);
    }
  return ports;
}

export default function ProjectCabeamento({ project }) {
  const telas = project.telas || [];
  const [telaId, setTelaId] = useState(telas[0]?.id);
  const [mode, setMode] = useState("sinal");
  const [strategy, setStrategy] = useState("linha");
  const [hz, setHz] = useState(60);
  const [manual, setManual] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const drag = useRef(null);

  const tela = telas.find((t) => t.id === telaId) || telas[0];
  const cols = tela?.cols || 1, rows = tela?.rows || 1;
  const panelW = cols * CELL, panelH = rows * CELL;

  const fit = useCallback(() => {
    const el = stageRef.current; if (!el) return;
    const cw = el.clientWidth, ch = el.clientHeight;
    const z = Math.min(cw / panelW, ch / panelH) * 0.9 || 1;
    setZoom(z); setPan({ x: (cw - panelW * z) / 2, y: (ch - panelH * z) / 2 });
  }, [panelW, panelH]);

  useEffect(() => { fit(); }, [fit, telaId]);

  const onWheel = (e) => {
    e.preventDefault();
    const el = stageRef.current; const rect = el.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const f = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(6, Math.max(0.1, z * f)));
    setPan((p) => ({ x: mx - (mx - p.x) * f, y: my - (my - p.y) * f }));
  };
  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; };
  const onMove = (e) => { if (!drag.current) return; setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); };
  const onUp = () => { drag.current = null; };
  const zoomBy = (f) => { const el = stageRef.current, cw = el.clientWidth / 2, ch = el.clientHeight / 2; setZoom((z) => Math.min(6, Math.max(0.1, z * f))); setPan((p) => ({ x: cw - (cw - p.x) * f, y: ch - (ch - p.y) * f })); };

  if (!tela) return <Placeholder icon={Monitor} title="Sem telas" description="Adicione uma tela na aba Dados para gerar o cabeamento." />;

  const g = tela.gabinete || {};
  const pxPerCab = (parseFloat(g.resX) || 1) * (parseFloat(g.resY) || 1);
  const fp = parseFloat(g.fp) || 0.9;
  const ampCab = (parseFloat(g.pwrMax) || 0) / (FASE_V * fp);
  const connRating = CONN_AMP[g.conector] || 16;

  const maxUnit = mode === "sinal"
    ? Math.max(1, Math.floor(Math.floor((PX_PER_PORT * 60) / hz) / pxPerCab))   // área máx. (gab) por porta
    : Math.max(1, Math.floor(connRating / (ampCab || 1)));                       // gab por cabo (AC)

  const order = strategy === "livre"
    ? manual.map((k) => { const [r, c] = k.split(",").map(Number); return { c, r }; })
    : serpentine(cols, rows, strategy === "coluna");

  let ports;
  if (strategy === "area") ports = rectangleTiles(cols, rows, maxUnit);
  else ports = (mode === "sinal" ? portsByArea : portsByCount)(order, maxUnit);

  const portOf = {};
  ports.forEach((p, i) => p.forEach((cell) => { portOf[key(cell.c, cell.r)] = i; }));
  const assigned = Object.keys(portOf).length;
  const incomplete = strategy === "livre" && assigned < cols * rows;
  const status = incomplete ? { l: "Incompleto", c: T.amb } : mode === "ac" && ampCab * maxUnit > connRating ? { l: "Alerta", c: T.amb } : { l: "OK", c: T.grn };

  const toggleCell = (c, r) => { if (strategy !== "livre") return; const k = key(c, r); setManual((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k])); };

  return (
    <div>
      <div style={card({ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 16 })} className="m-controlbar">
        <select value={telaId} onChange={(e) => setTelaId(e.target.value)} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" }}>
          {telas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <Seg label="Modo" options={[["sinal", "Sinal"], ["ac", "AC"]]} value={mode} onChange={setMode} />
        <Seg label="Disp." options={[["linha", "Linha"], ["coluna", "Coluna"], ["area", "Área"], ["livre", "Livre"]]} value={strategy} onChange={setStrategy} />
        {mode === "sinal" && <Seg label="Freq" options={[[60, "60"], [50, "50"], [30, "30"]]} value={hz} onChange={setHz} />}
        {strategy === "livre" && <button onClick={() => setManual([])} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 8, border: `1px solid ${T.bd}`, background: "transparent", color: T.mut, cursor: "pointer", fontSize: 13 }}><Eraser size={14} /> Limpar</button>}
        <span style={{ marginLeft: "auto", background: status.c + "22", color: status.c, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{status.l}</span>
      </div>

      <div style={card({ padding: 0, overflow: "hidden" })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: `1px solid ${T.bd}`, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>{tela.nome} · {mode === "sinal" ? "Sinal" : "Energia AC"}</div>
            <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>
              {ports.length} {mode === "sinal" ? "portas" : "circuitos"} · máx {maxUnit} gab/{mode === "sinal" ? "porta (área quadrada)" : "cabo"}
              {mode === "ac" && ` · ${ampCab.toFixed(2)} A/gab · conector ${connRating} A`}
              {strategy === "livre" && ` · clique nos gabinetes (${assigned}/${cols * rows})`}
            </div>
          </div>
        </div>

        {/* CANVAS (stage) com zoom / pan / fit */}
        <div ref={stageRef} onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          style={{ position: "relative", height: 460, background: "#08080f", overflow: "hidden", cursor: drag.current ? "grabbing" : "grab" }}>
          <svg width="100%" height="100%" style={{ display: "block" }}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              <rect x={-8} y={-8} width={panelW + 16} height={panelH + 16} rx={10} fill="#0d0d1a" stroke={T.bd} strokeWidth={1.5} />
              {range(rows).map((r) => range(cols).map((c) => {
                const pi = portOf[key(c, r)];
                const col = pi === undefined ? T.dim2 : paletteColor(pi);
                return (
                  <rect key={key(c, r)} x={c * CELL + 3} y={r * CELL + 3} width={CELL - 6} height={CELL - 6} rx={6}
                    fill={pi === undefined ? "transparent" : col + "26"} stroke={col} strokeWidth={1.5} strokeDasharray={pi === undefined ? "5 5" : undefined}
                    onClick={() => toggleCell(c, r)} style={{ cursor: strategy === "livre" ? "pointer" : "inherit" }} />
                );
              }))}
              {/* linha do cabo — BRANCA */}
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

          {/* controles de zoom */}
          <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {[[ZoomIn, () => zoomBy(1.2), "Aumentar"], [Maximize, fit, "Enquadrar"], [ZoomOut, () => zoomBy(0.8), "Diminuir"]].map(([Ic, fn, t], i) => (
              <button key={i} title={t} onClick={fn} style={{ width: 34, height: 34, borderRadius: 8, background: T.card, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic size={16} /></button>
            ))}
          </div>
          <div style={{ position: "absolute", left: 12, bottom: 12, color: T.dim, fontSize: 11, background: "rgba(0,0,0,0.4)", padding: "4px 8px", borderRadius: 6 }}>
            {mode === "sinal" ? "Novastar: capacidade por área retangular" : "AC: soma de corrente por circuito"} · arraste p/ mover · scroll p/ zoom
          </div>
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
          const active = v === value;
          return <button key={String(v)} onClick={() => onChange(v)} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${active ? T.acc : T.bd}`, background: active ? T.acc : T.card2, color: active ? "#fff" : T.mut }}>{l}</button>;
        })}
      </div>
    </div>
  );
}
