// pages/project/ProjectTestCard.jsx — gerador de test card (canvas + export PNG).
import { useRef, useEffect, useState } from "react";
import { Download, Monitor, ZoomIn, ZoomOut, Maximize, Save } from "lucide-react";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useToast } from "../../store/UIContext.jsx";
import { PALETTE, T } from "../../ui/tokens.js";
import { card, btn } from "../../ui/styles.js";
import Placeholder from "../../components/Placeholder.jsx";

const PX_PER_PORT = 655360;
const CONN_AMP = { "PowerCON Azul/Branco": 20, "PowerCON TRUE1": 16, "Neutrik True1": 16, "Neutrik True1 TOP": 20, "HangTon SD20": 20, PowerCON: 20 };
const BAR_COLORS = ["#ffffff", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff"];

const DEFAULTS = { scheme: "cores", numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, numScale: 1, colorBar: "off", cableMap: "off", info: true, infoPos: "inf-esq" };

const PRESETS = {
  map: { scheme: "cores", numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, colorBar: "off", cableMap: "off", info: true },
  align: { scheme: "cinza", numbers: false, junctions: true, circle: true, cross: true, corner: true, side: true, colorBar: "off", cableMap: "off", info: false },
  solid: { scheme: "solida", numbers: false, junctions: false, circle: false, cross: false, corner: false, side: false, colorBar: "off", cableMap: "off", info: false },
  bars: { scheme: "solida", numbers: false, junctions: false, circle: false, cross: false, corner: false, side: false, colorBar: "topo", cableMap: "off", info: false },
  cabsig: { scheme: "cores", numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, colorBar: "off", cableMap: "sinal", info: true },
};

function cellColor(scheme, i, total) {
  if (scheme === "solida") return "#ffffff";
  if (scheme === "arcoiris") return `hsl(${Math.round((i / Math.max(1, total)) * 360)},85%,55%)`;
  if (scheme === "cinza") return `hsl(0,0%,${20 + (i % 5) * 13}%)`;
  return PALETTE[i % PALETTE.length];
}

function serpentinePorts(cols, rows, perPort) {
  const cells = [];
  for (let r = 0; r < rows; r++) {
    const range = r % 2 === 0 ? [...Array(cols).keys()] : [...Array(cols).keys()].reverse();
    range.forEach((c) => cells.push({ c, r }));
  }
  const ports = [];
  for (let i = 0; i < cells.length; i += perPort) ports.push(cells.slice(i, i + perPort));
  return ports;
}

function draw(canvas, tela, o) {
  const cols = tela.cols || 1, rows = tela.rows || 1;
  const g = tela.gabinete || {};
  const resX = parseFloat(g.resX) || 128, resY = parseFloat(g.resY) || 128;
  const W = cols * resX, H = rows * resY;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const total = cols * rows;

  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

  // células
  let n = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * resX, y = r * resY;
      ctx.fillStyle = cellColor(o.scheme, r * cols + c, total);
      ctx.fillRect(x, y, resX, resY);
      if (o.junctions) { ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = Math.max(1, resX * 0.02); ctx.strokeRect(x, y, resX, resY); }
      if (o.numbers) {
        ctx.fillStyle = o.scheme === "solida" ? "#111" : "#fff";
        ctx.font = `700 ${resY * 0.28 * o.numScale}px system-ui, sans-serif`;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(String(n), x + resX * 0.08, y + resY * 0.06);
      }
      n++;
    }
  }

  // barras de cor
  if (o.colorBar !== "off") {
    const barH = H * 0.12, y0 = o.colorBar === "topo" ? 0 : H - barH, bw = W / BAR_COLORS.length;
    BAR_COLORS.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * bw, y0, bw, barH); });
  }

  // geometria
  ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = Math.max(2, W * 0.002);
  if (o.cross) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.moveTo(W, 0); ctx.lineTo(0, H); ctx.stroke(); }
  if (o.circle) { ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.45, 0, Math.PI * 2); ctx.stroke(); }
  const rr = Math.min(W, H) * 0.08;
  if (o.corner) { for (const [x, y] of [[rr, rr], [W - rr, rr], [rr, H - rr], [W - rr, H - rr]]) { ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke(); } }
  if (o.side) { for (const [x, y] of [[W / 2, rr], [W / 2, H - rr], [rr, H / 2], [W - rr, H / 2]]) { ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke(); } }

  // mapa de cabos (serpentina por porta)
  if (o.cableMap !== "off") {
    const pxPerCab = resX * resY;
    const fp = parseFloat(g.fp) || 0.9;
    const perPort = o.cableMap === "sinal"
      ? Math.max(1, Math.floor(PX_PER_PORT / pxPerCab))
      : Math.max(1, Math.floor((CONN_AMP[g.conector] || 16) / ((parseFloat(g.pwrMax) || 1) / (220 * fp))));
    const ports = serpentinePorts(cols, rows, perPort);
    const cx = (c) => c * resX + resX / 2, cy = (r) => r * resY + resY / 2;
    ctx.lineWidth = Math.max(3, resX * 0.06);
    ports.forEach((port, pi) => {
      const col = PALETTE[pi % PALETTE.length];
      ctx.strokeStyle = col; ctx.beginPath();
      port.forEach((cell, i) => { const x = cx(cell.c), y = cy(cell.r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      const f = port[0]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx(f.c), cy(f.r), resY * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff"; ctx.font = `700 ${resY * 0.26}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(pi + 1), cx(f.c), cy(f.r));
    });
  }

  // caixa de info
  if (o.info) {
    const lines = [tela.nome, `${W} x ${H} px`, `${cols} × ${rows} = ${total} gab`, `pitch ${(parseFloat(g.dimW) / resX).toFixed(2)} mm`, `${(cols * parseFloat(g.dimW) / 1000).toFixed(2)} x ${(rows * parseFloat(g.dimH) / 1000).toFixed(2)} m`];
    const fs = H * 0.03, pad = fs * 0.6;
    ctx.font = `600 ${fs}px ui-monospace, monospace`;
    const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
    const bh = lines.length * fs * 1.3 + pad;
    const top = o.infoPos.startsWith("sup"); const left = o.infoPos.endsWith("esq");
    const bx = left ? pad : W - bw - pad; const by = top ? pad : H - bh - pad;
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(bx, by, bw, bh);
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad / 2 + i * fs * 1.3));
  }
}

export default function ProjectTestCard({ project }) {
  const { tcPresets, setTcPresets } = useLedLabContext();
  const toast = useToast();
  const telas = project.telas || [];
  const [telaId, setTelaId] = useState(telas[0]?.id);
  const [o, setO] = useState({ ...DEFAULTS });
  const [zoom, setZoom] = useState(1);
  const [presetSel, setPresetSel] = useState("");
  const canvasRef = useRef(null);
  const tela = telas.find((t) => t.id === telaId) || telas[0];

  useEffect(() => { if (tela && canvasRef.current) draw(canvasRef.current, tela, o); }, [tela, o]);

  if (!tela) return <Placeholder icon={Monitor} title="Sem telas" description="Adicione uma tela na aba Dados para gerar o test card." />;

  const g = tela.gabinete || {};
  const W = (tela.cols || 1) * (parseFloat(g.resX) || 0), H = (tela.rows || 1) * (parseFloat(g.resY) || 0);
  const set = (patch) => setO((prev) => ({ ...prev, ...patch }));
  const toggle = (k) => setO((prev) => ({ ...prev, [k]: !prev[k] }));

  const applyPreset = (val) => {
    setPresetSel(val);
    if (!val) return;
    if (PRESETS[val]) set(PRESETS[val]);
    else { const p = tcPresets.find((x) => x.id === val); if (p) set(p.opts); }
  };
  const savePreset = () => {
    const name = `Predefinição ${tcPresets.length + 1}`;
    setTcPresets([...tcPresets, { id: `tc-${Date.now()}`, name, opts: { ...o } }]);
    toast("Predefinição salva");
  };

  const exportPng = () => {
    canvasRef.current.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `testcard-${(tela.nome || "tela").replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
    }, "image/png");
  };

  const zbtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 30, height: 30, borderRadius: 7, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <select value={telaId} onChange={(e) => setTelaId(e.target.value)} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" }}>
          {telas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <button style={btn("primary")} onClick={exportPng}><Download size={15} /> Exportar PNG ({W}×{H})</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", gap: 16, alignItems: "start" }} className="m-grid1">
        <div style={card()}>
          <Label>Predefinição</Label>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <select value={presetSel} onChange={(e) => applyPreset(e.target.value)} style={sel}>
              <option value="">— aplicar predefinição —</option>
              <option value="map">Mapa de gabinetes</option>
              <option value="align">Alinhamento / geometria</option>
              <option value="solid">Cor sólida (branco)</option>
              <option value="bars">Barras de cor</option>
              <option value="cabsig">Mapa de cabos (sinal)</option>
              {tcPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button style={btn("ghost", { padding: "8px 10px" })} title="Salvar predefinição" onClick={savePreset}><Save size={14} /></button>
          </div>

          <Label>Esquema de cor</Label>
          <select value={o.scheme} onChange={(e) => set({ scheme: e.target.value })} style={{ ...sel, width: "100%", marginBottom: 16 }}>
            <option value="cores">Cores</option><option value="arcoiris">Arco-íris</option><option value="cinza">Cinza</option><option value="solida">Sólida</option>
          </select>

          <Label>Elementos</Label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["numbers", "Numerar gab."], ["junctions", "Junções"], ["circle", "Círculo"], ["cross", "Cruz"], ["corner", "Círc. cantos"], ["side", "Círc. laterais"]].map(([k, l]) => (
              <Toggle key={k} on={o[k]} onClick={() => toggle(k)}>{l}</Toggle>
            ))}
          </div>

          <Label style={{ marginTop: 16 }}>Tamanho do número — {o.numScale.toFixed(1)}×</Label>
          <input type="range" min={0.5} max={2} step={0.1} value={o.numScale} onChange={(e) => set({ numScale: parseFloat(e.target.value) })} style={{ width: "100%", accentColor: T.acc }} />

          <Label style={{ marginTop: 16 }}>Color bar</Label>
          <Seg options={[["off", "Off"], ["topo", "Topo"], ["base", "Base"]]} value={o.colorBar} onChange={(v) => set({ colorBar: v })} />

          <Label style={{ marginTop: 16 }}>Mapa de cabos</Label>
          <Seg options={[["off", "Off"], ["sinal", "Sinal"], ["ac", "AC"]]} value={o.cableMap} onChange={(v) => set({ cableMap: v })} />

          <Label style={{ marginTop: 16 }}>Caixa de info</Label>
          <Toggle on={o.info} onClick={() => toggle("info")} full>Mostrar info</Toggle>
          {o.info && (
            <>
              <Label style={{ marginTop: 10 }}>Posição</Label>
              <Seg options={[["sup-esq", "Sup. esq"], ["sup-dir", "Sup. dir"], ["inf-esq", "Inf. esq"], ["inf-dir", "Inf. dir"]]} value={o.infoPos} onChange={(v) => set({ infoPos: v })} small />
            </>
          )}
        </div>

        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: T.dim, fontSize: 12, marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
            <b style={{ color: T.acM }}>{tela.nome}</b>
            <span>{W}×{H} px · {tela.cols * tela.rows} gab · pitch {(parseFloat(g.dimW) / (parseFloat(g.resX) || 1)).toFixed(2)} mm</span>
            <span style={{ display: "inline-flex", gap: 6 }}>
              <button style={zbtn} title="Diminuir" onClick={() => setZoom((z) => Math.max(0.25, z * 0.8))}><ZoomOut size={15} /></button>
              <button style={zbtn} title="Enquadrar" onClick={() => setZoom(1)}><Maximize size={15} /></button>
              <button style={zbtn} title="Aumentar" onClick={() => setZoom((z) => Math.min(4, z * 1.25))}><ZoomIn size={15} /></button>
            </span>
          </div>
          <div style={{ overflow: "auto", background: "#000", borderRadius: 6, maxHeight: "70vh" }} className="tbl-scroll">
            <canvas ref={canvasRef} style={{ width: `${zoom * 100}%`, height: "auto", display: "block", imageRendering: "pixelated" }} />
          </div>
          <div style={{ color: T.dim, fontSize: 11, marginTop: 8 }}>O preview é escalado; o PNG sai na resolução nativa ({W}×{H} px) para mapeamento 1:1 no processador.</div>
        </div>
      </div>
    </div>
  );
}

const sel = { flex: 1, background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 13 };
const Label = ({ children, style }) => <div style={{ textTransform: "uppercase", fontSize: 11, color: T.mut, marginBottom: 6, ...style }}>{children}</div>;

function Toggle({ on, onClick, children, full }) {
  return (
    <button onClick={onClick} style={{ gridColumn: full ? "1 / -1" : "auto", padding: "8px 6px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, border: `1px solid ${on ? T.acc : T.bd}`, background: on ? T.sel : T.card2, color: on ? T.acM : T.mut }}>
      {children} {on ? "ON" : "OFF"}
    </button>
  );
}

function Seg({ options, value, onChange, small }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${options.length},1fr)`, gap: 4 }}>
      {options.map(([v, l]) => {
        const active = v === value;
        return <button key={v} onClick={() => onChange(v)} style={{ padding: small ? "6px 2px" : "8px 4px", borderRadius: 6, cursor: "pointer", fontSize: small ? 11 : 12, fontWeight: 600, border: `1px solid ${active ? T.acc : T.bd}`, background: active ? T.acc : T.card2, color: active ? "#fff" : T.mut }}>{l}</button>;
      })}
    </div>
  );
}
