// pages/project/ProjectCabeamento.jsx — roteamento de sinal/AC.
// Estratégias de disposição: Linha, Coluna, Área e Livre (manual, clicando nos gabinetes).
import { useState } from "react";
import { Monitor, Eraser } from "lucide-react";
import { paletteColor, T } from "../../ui/tokens.js";
import { card, btn } from "../../ui/styles.js";
import Placeholder from "../../components/Placeholder.jsx";

const PX_PER_PORT = 655360; // sinal (Gigabit)
const FASE_V = 220;
const CONN_AMP = { "PowerCON Azul/Branco": 20, "PowerCON TRUE1": 16, "Neutrik True1": 16, "Neutrik True1 TOP": 20, "HangTon SD20": 20, PowerCON: 20 };

const key = (c, r) => `${r},${c}`;

// serpentina (boustrophedon)
function serpentine(cols, rows, vertical) {
  const cells = [];
  if (vertical) {
    for (let c = 0; c < cols; c++) (c % 2 === 0 ? range(rows) : range(rows).reverse()).forEach((r) => cells.push({ c, r }));
  } else {
    for (let r = 0; r < rows; r++) (r % 2 === 0 ? range(cols) : range(cols).reverse()).forEach((c) => cells.push({ c, r }));
  }
  return cells;
}
const range = (n) => [...Array(n).keys()];
const chunk = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };

// blocos retangulares que cabem em perPort
function areaPorts(cols, rows, perPort) {
  const bh = Math.max(1, Math.min(rows, Math.round(Math.sqrt((perPort * rows) / cols))));
  const bw = Math.max(1, Math.floor(perPort / bh));
  const ports = [];
  for (let by = 0; by < rows; by += bh) {
    for (let bx = 0; bx < cols; bx += bw) {
      const cells = [];
      for (let r = by; r < Math.min(by + bh, rows); r++)
        for (let c = bx; c < Math.min(bx + bw, cols); c++) cells.push({ c, r });
      if (cells.length) ports.push(cells);
    }
  }
  return ports;
}

export default function ProjectCabeamento({ project, patchTela }) {
  const telas = project.telas || [];
  const [telaId, setTelaId] = useState(telas[0]?.id);
  const [mode, setMode] = useState("sinal");
  const [strategy, setStrategy] = useState("linha");
  const [vertical, setVertical] = useState(false);
  const [hz, setHz] = useState(60);
  const [manual, setManual] = useState([]); // chaves "r,c" na ordem de clique

  const tela = telas.find((t) => t.id === telaId) || telas[0];
  if (!tela) return <Placeholder icon={Monitor} title="Sem telas" description="Adicione uma tela na aba Dados para gerar o cabeamento." />;

  const g = tela.gabinete || {};
  const cols = tela.cols || 1, rows = tela.rows || 1;
  const pxPerCab = (parseFloat(g.resX) || 1) * (parseFloat(g.resY) || 1);
  const fp = parseFloat(g.fp) || 0.9;
  const ampCab = (parseFloat(g.pwrMax) || 0) / (FASE_V * fp);
  const connRating = CONN_AMP[g.conector] || 16;

  const perPort = mode === "sinal"
    ? Math.max(1, Math.floor(Math.floor((PX_PER_PORT * 60) / hz) / pxPerCab))
    : Math.max(1, Math.floor(connRating / (ampCab || 1)));

  // monta as portas conforme a estratégia
  let ports;
  if (strategy === "area") ports = areaPorts(cols, rows, perPort);
  else if (strategy === "livre") ports = chunk(manual.map((k) => { const [r, c] = k.split(",").map(Number); return { c, r }; }), perPort);
  else ports = chunk(serpentine(cols, rows, strategy === "coluna" ? !vertical : vertical), perPort);

  // mapa célula -> porta
  const portOf = {};
  ports.forEach((port, pi) => port.forEach((cell) => { portOf[key(cell.c, cell.r)] = pi; }));

  const assigned = Object.keys(portOf).length;
  const overload = mode === "ac" && ampCab * perPort > connRating;
  const incomplete = strategy === "livre" && assigned < cols * rows;
  const status = overload ? { l: "Alerta", c: T.amb } : incomplete ? { l: "Incompleto", c: T.amb } : { l: "OK", c: T.grn };

  const toggleCell = (c, r) => {
    if (strategy !== "livre") return;
    const k = key(c, r);
    setManual((m) => (m.includes(k) ? m.filter((x) => x !== k) : [...m, k]));
  };

  const W = 900, H = Math.round((W / cols) * rows), cw = W / cols, ch = H / rows;
  const cx = (c) => c * cw + cw / 2, cy = (r) => r * ch + ch / 2;

  return (
    <div>
      <div style={card({ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: 16 })} className="m-controlbar">
        <select value={telaId} onChange={(e) => setTelaId(e.target.value)} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" }}>
          {telas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <Seg label="Modo" options={[["sinal", "Sinal"], ["ac", "AC"]]} value={mode} onChange={setMode} />
        <Seg label="Disp." options={[["linha", "Linha"], ["coluna", "Coluna"], ["area", "Área"], ["livre", "Livre"]]} value={strategy} onChange={setStrategy} />
        {(strategy === "linha" || strategy === "coluna") && <Seg label="Sentido" options={[[false, "Horiz."], [true, "Vert."]]} value={vertical} onChange={setVertical} />}
        {mode === "sinal" && <Seg label="Freq" options={[[60, "60"], [50, "50"], [30, "30"]]} value={hz} onChange={setHz} />}
        {strategy === "livre" && <button style={btn("subtle")} onClick={() => setManual([])}><Eraser size={14} /> Limpar</button>}
        <span style={{ marginLeft: "auto", background: status.c + "22", color: status.c, padding: "4px 10px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>Status: {status.l}</span>
      </div>

      <div style={card()}>
        <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12, marginBottom: 4 }}>{tela.nome} · Cabeamento de {mode === "sinal" ? "sinal" : "AC"}</div>
        <div style={{ color: T.dim, fontSize: 12, marginBottom: 14 }}>
          {ports.length} {mode === "sinal" ? "portas" : "circuitos"} · até {perPort} gabinetes por {mode === "sinal" ? "porta" : "cabo"}
          {mode === "ac" && ` · ${ampCab.toFixed(2)} A/gab · conector ${connRating} A`}
          {strategy === "livre" && ` · clique nos gabinetes na ordem desejada (${assigned}/${cols * rows} atribuídos)`}
        </div>
        <div style={{ overflow: "auto" }} className="tbl-scroll">
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ maxWidth: W, background: T.card2, borderRadius: 8 }}>
            {range(rows).map((r) => range(cols).map((c) => {
              const pi = portOf[key(c, r)];
              const col = pi === undefined ? T.dim2 : paletteColor(pi);
              return (
                <rect key={key(c, r)} x={c * cw} y={r * ch} width={cw - 2} height={ch - 2}
                  fill={pi === undefined ? "transparent" : col + "22"}
                  stroke={col} strokeWidth="1.5" strokeDasharray={pi === undefined ? "4 4" : undefined} rx="4"
                  style={{ cursor: strategy === "livre" ? "pointer" : "default" }}
                  onClick={() => toggleCell(c, r)} />
              );
            }))}
            {ports.map((port, pi) => {
              const col = paletteColor(pi);
              const pts = port.map((cell) => `${cx(cell.c)},${cy(cell.r)}`).join(" ");
              const first = port[0];
              if (!first) return null;
              return (
                <g key={pi} style={{ pointerEvents: "none" }}>
                  <polyline points={pts} fill="none" stroke={col} strokeWidth="3" strokeLinejoin="round" opacity="0.9" />
                  <circle cx={cx(first.c)} cy={cy(first.r)} r={Math.min(cw, ch) * 0.22} fill={col} />
                  <text x={cx(first.c)} y={cy(first.r)} fill="#fff" fontSize={Math.min(cw, ch) * 0.28} fontWeight="700" textAnchor="middle" dominantBaseline="central">{pi + 1}</text>
                </g>
              );
            })}
          </svg>
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
