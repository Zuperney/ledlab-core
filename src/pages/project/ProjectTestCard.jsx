// pages/project/ProjectTestCard.jsx — gerador de test card (canvas + export PNG).
import { useRef, useEffect, useState } from "react";
import { Download, Monitor, ZoomIn, ZoomOut, Maximize, Save } from "lucide-react";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useToast, usePrompt } from "../../store/UIContext.jsx";
import { cablePorts } from "../../services/cabling.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback.js";
import { PALETTE, T } from "../../ui/tokens.js";
import { card, btn } from "../../ui/styles.js";
import Placeholder from "../../components/Placeholder.jsx";

const BAR_COLORS = ["#ffffff", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff"];
const DEFAULTS = { scheme: "cores", rainbowDir: "h", solidColor: "#ffffff", solidAlpha: false, numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, numScale: 1, colorBar: "off", cableMap: "off", info: true, infoPos: "inf-esq", infoInline: false };

const PRESETS = {
  map: { scheme: "cores", numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, colorBar: "off", cableMap: "off", info: true },
  align: { scheme: "cores", numbers: false, junctions: true, circle: true, cross: true, corner: true, side: true, colorBar: "off", cableMap: "off", info: false },
  solid: { scheme: "solida", solidColor: "#ffffff", solidAlpha: false, numbers: false, junctions: false, circle: false, cross: false, corner: false, side: false, colorBar: "off", cableMap: "off", info: false },
  bars: { scheme: "solida", solidColor: "#000000", numbers: false, junctions: false, circle: false, cross: false, corner: false, side: false, colorBar: "centro", cableMap: "off", info: false },
  cabsig: { scheme: "cores", numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, colorBar: "off", cableMap: "sinal", info: true },
};

function textOn(hex) {
  const h = (hex || "").replace("#", "");
  if (h.length < 6) return "#fff";
  const L = (0.299 * parseInt(h.slice(0, 2), 16) + 0.587 * parseInt(h.slice(2, 4), 16) + 0.114 * parseInt(h.slice(4, 6), 16)) / 255;
  return L > 0.6 ? "#111" : "#fff";
}

function cellColor(o, c, r, cols, rows) {
  if (o.scheme === "solida") return o.solidColor;
  if (o.scheme === "arcoiris") {
    const t = o.rainbowDir === "v" ? r / Math.max(1, rows - 1) : o.rainbowDir === "d" ? (c + r) / Math.max(1, cols - 1 + (rows - 1)) : c / Math.max(1, cols - 1);
    return `hsl(${Math.round(t * 360)},85%,55%)`;
  }
  if (o.scheme === "cinza") return `hsl(0,0%,${Math.round((c / Math.max(1, cols - 1)) * 100)}%)`; // preto→branco por coluna
  return PALETTE[(r * cols + c) % PALETTE.length];
}

function draw(canvas, tela, o, mapPorts) {
  const cols = tela.cols || 1, rows = tela.rows || 1;
  const g = tela.gabinete || {};
  const resX = parseFloat(g.resX) || 128, resY = parseFloat(g.resY) || 128;
  const W = cols * resX, H = rows * resY;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const locked = o.scheme === "cinza"; // predefinição de calibração: travada
  const transparent = o.scheme === "solida" && o.solidAlpha;

  ctx.clearRect(0, 0, W, H);
  if (!transparent) { ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H); }

  // células
  const numColor = o.scheme === "solida" ? (transparent ? "#fff" : textOn(o.solidColor)) : "#fff";
  let n = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * resX, y = r * resY;
      if (!transparent) { ctx.fillStyle = cellColor(o, c, r, cols, rows); ctx.fillRect(x, y, resX, resY); }
      if (!locked && o.junctions) { ctx.strokeStyle = "rgba(0,0,0,0.55)"; ctx.lineWidth = Math.max(1, resX * 0.02); ctx.strokeRect(x, y, resX, resY); }
      if (!locked && o.numbers) {
        ctx.fillStyle = numColor;
        ctx.font = `700 ${resY * 0.28 * o.numScale}px system-ui, sans-serif`;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(String(n), x + resX * 0.08, y + resY * 0.06);
      }
      n++;
    }
  }
  if (locked) return; // grayscale = só o gradiente

  // barras de cor (topo / base / centro)
  if (o.colorBar !== "off") {
    const barH = H * 0.12, bw = W / BAR_COLORS.length;
    const y0 = o.colorBar === "topo" ? 0 : o.colorBar === "centro" ? (H - barH) / 2 : H - barH;
    BAR_COLORS.forEach((col, i) => { ctx.fillStyle = col; ctx.fillRect(i * bw, y0, bw, barH); });
  }

  // geometria
  ctx.strokeStyle = "rgba(255,255,255,0.9)"; ctx.lineWidth = Math.max(2, W * 0.002);
  if (o.cross) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.moveTo(W, 0); ctx.lineTo(0, H); ctx.stroke(); }
  if (o.circle) { ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) / 2 - ctx.lineWidth, 0, Math.PI * 2); ctx.stroke(); } // ocupa o máximo
  const rr = Math.min(W, H) * 0.08;
  if (o.corner) { for (const [x, y] of [[rr, rr], [W - rr, rr], [rr, H - rr], [W - rr, H - rr]]) { ctx.beginPath(); ctx.arc(x, y, rr, 0, Math.PI * 2); ctx.stroke(); } }
  if (o.side) { // semicírculos: círculo centrado na borda; o canvas corta a metade externa
    const sr = Math.min(W, H) * 0.28;
    for (const [x, y] of [[W / 2, 0], [W / 2, H], [0, H / 2], [W, H / 2]]) { ctx.beginPath(); ctx.arc(x, y, sr, 0, Math.PI * 2); ctx.stroke(); }
  }

  // mapa de cabos (consistente com a aba Cabeamento)
  if (o.cableMap !== "off" && mapPorts) {
    const cx = (c) => c * resX + resX / 2, cy = (r) => r * resY + resY / 2;
    ctx.lineWidth = Math.max(3, resX * 0.06);
    mapPorts.forEach((port, pi) => {
      if (!port.length) return;
      const col = PALETTE[pi % PALETTE.length];
      ctx.strokeStyle = "#fff"; ctx.beginPath();
      port.forEach((cell, i) => { const x = cx(cell.c), y = cy(cell.r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      const f = port[0]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx(f.c), cy(f.r), resY * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(2, resX * 0.02); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = `700 ${resY * 0.26}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(pi + 1), cx(f.c), cy(f.r));
    });
  }

  // caixa de info
  if (o.info) {
    const lines = [tela.nome, `${W} x ${H} px`, `${cols} × ${rows} = ${cols * rows} gab`, `pitch ${(parseFloat(g.dimW) / resX).toFixed(2)} mm`, `${(cols * parseFloat(g.dimW) / 1000).toFixed(2)} x ${(rows * parseFloat(g.dimH) / 1000).toFixed(2)} m`];
    const fs = H * 0.03, pad = fs * 0.6;
    ctx.font = `600 ${fs}px ui-monospace, monospace`;
    const center = o.infoPos === "centro";
    const top = o.infoPos.startsWith("sup"), left = o.infoPos.endsWith("esq");
    if (o.infoInline) {
      const text = lines.join("   ·   ");
      const bw = ctx.measureText(text).width + pad * 2, bh = fs * 1.8;
      const bx = center ? (W - bw) / 2 : left ? pad : W - bw - pad;
      const by = center ? (H - bh) / 2 : top ? pad : H - bh - pad;
      ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "middle"; ctx.fillText(text, bx + pad, by + bh / 2);
    } else {
      const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
      const bh = lines.length * fs * 1.3 + pad;
      const bx = center ? (W - bw) / 2 : left ? pad : W - bw - pad;
      const by = center ? (H - bh) / 2 : top ? pad : H - bh - pad;
      ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(bx, by, bw, bh);
      ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
      lines.forEach((l, i) => ctx.fillText(l, bx + pad, by + pad / 2 + i * fs * 1.3));
    }
  }
}

export default function ProjectTestCard({ project }) {
  const { tcPresets, setTcPresets, prefs } = useLedLabContext();
  const isMobile = useIsMobile();
  const toast = useToast();
  const prompt = usePrompt();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const telas = project.telas || [];
  const [telaId, setTelaId] = useState(telas[0]?.id);
  const [o, setO] = useState({ ...DEFAULTS });
  const [zoom, setZoom] = useState(1);
  const [presetSel, setPresetSel] = useState("");
  const canvasRef = useRef(null);
  const tela = telas.find((t) => t.id === telaId) || telas[0];

  const mapPorts = tela && o.cableMap !== "off" ? cablePorts(tela, o.cableMap, numbering) : null;
  useEffect(() => { if (tela && canvasRef.current) draw(canvasRef.current, tela, o, mapPorts); });

  if (!tela) return <Placeholder icon={Monitor} title="Sem telas" description="Adicione uma tela na aba Dados para gerar o test card." />;

  const g = tela.gabinete || {};
  const W = (tela.cols || 1) * (parseFloat(g.resX) || 0), H = (tela.rows || 1) * (parseFloat(g.resY) || 0);
  const set = (patch) => setO((prev) => ({ ...prev, ...patch }));
  const toggle = (k) => setO((prev) => ({ ...prev, [k]: !prev[k] }));
  const locked = o.scheme === "cinza";

  const applyPreset = (val) => {
    setPresetSel(val);
    if (!val) return;
    if (PRESETS[val]) set(PRESETS[val]);
    else { const p = tcPresets.find((x) => x.id === val); if (p) set(p.opts); }
  };
  const savePreset = async () => {
    const name = await prompt({ title: "Salvar predefinição", message: "Dê um nome para esta predefinição:", placeholder: "Ex: Show — mapa de cabos" });
    if (!name || !name.trim()) return;
    setTcPresets([...tcPresets, { id: `tc-${Date.now()}`, name: name.trim(), opts: { ...o } }]);
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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "stretch" : "center", marginBottom: 16, gap: 10, flexWrap: "wrap", flexDirection: isMobile ? "column" : "row" }}>
        <select value={telaId} onChange={(e) => setTelaId(e.target.value)} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px", width: isMobile ? "100%" : undefined }}>
          {telas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <button style={btn("primary", isMobile ? { justifyContent: "center" } : {})} onClick={exportPng}><Download size={15} /> Exportar PNG ({W}×{H})</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 16, alignItems: "start" }} className="m-grid1">
        <div style={card()}>
          <Label>Predefinição</Label>
          <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
            <select value={presetSel} onChange={(e) => applyPreset(e.target.value)} style={sel}>
              <option value="">— aplicar predefinição —</option>
              <option value="map">Mapa de gabinetes</option>
              <option value="align">Alinhamento / geometria</option>
              <option value="solid">Cor sólida</option>
              <option value="bars">Barras de cor</option>
              <option value="cabsig">Mapa de cabos (sinal)</option>
              {tcPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <button style={btn("ghost", { padding: "8px 10px" })} title="Salvar predefinição" onClick={savePreset}><Save size={14} /></button>
          </div>

          <Label>Esquema de cor</Label>
          <select value={o.scheme} onChange={(e) => set({ scheme: e.target.value })} style={{ ...sel, width: "100%", marginBottom: 12 }}>
            <option value="cores">Cores</option><option value="arcoiris">Arco-íris</option><option value="cinza">Escala de cinza</option><option value="solida">Sólida</option>
          </select>

          {o.scheme === "arcoiris" && (<><Label>Direção</Label><Seg options={[["h", "Horizontal"], ["v", "Vertical"], ["d", "Diagonal"]]} value={o.rainbowDir} onChange={(v) => set({ rainbowDir: v })} /></>)}
          {o.scheme === "solida" && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <input type="color" value={o.solidColor} onChange={(e) => set({ solidColor: e.target.value })} style={{ width: 40, height: 32, background: "none", border: `1px solid ${T.bd}`, borderRadius: 8, cursor: "pointer" }} />
              <Toggle on={o.solidAlpha} onClick={() => toggle("solidAlpha")} full>Fundo transparente (alpha)</Toggle>
            </div>
          )}

          {locked ? (
            <div style={{ marginTop: 14, color: T.dim, fontSize: 12, background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 10 }}>
              Predefinição de calibração (preto→branco por coluna). Sem edições.
            </div>
          ) : (
            <>
              <Label style={{ marginTop: 16 }}>Elementos</Label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[["numbers", "Numerar gab."], ["junctions", "Junções"], ["circle", "Círculo"], ["cross", "Cruz"], ["corner", "Círc. cantos"], ["side", "Semicírc. laterais"]].map(([k, l]) => (
                  <Toggle key={k} on={o[k]} onClick={() => toggle(k)}>{l}</Toggle>
                ))}
              </div>

              <NumScaleSlider value={o.numScale} onChange={(n) => set({ numScale: n })} />

              <Label style={{ marginTop: 16 }}>Color bar</Label>
              <Seg options={[["off", "Off"], ["topo", "Topo"], ["centro", "Centro"], ["base", "Base"]]} value={o.colorBar} onChange={(v) => set({ colorBar: v })} small />

              <Label style={{ marginTop: 16 }}>Mapa de cabos</Label>
              <Seg options={[["off", "Off"], ["sinal", "Sinal"], ["ac", "AC"]]} value={o.cableMap} onChange={(v) => set({ cableMap: v })} />

              <Label style={{ marginTop: 16 }}>Caixa de info</Label>
              <Toggle on={o.info} onClick={() => toggle("info")} full>Mostrar info</Toggle>
              {o.info && (
                <>
                  <Toggle on={o.infoInline} onClick={() => toggle("infoInline")} full style={{ marginTop: 8 }}>Em linha</Toggle>
                  <Label style={{ marginTop: 10 }}>Posição</Label>
                  <Seg options={[["sup-esq", "Sup. esq"], ["sup-dir", "Sup. dir"], ["centro", "Centro"], ["inf-esq", "Inf. esq"], ["inf-dir", "Inf. dir"]]} value={o.infoPos} onChange={(v) => set({ infoPos: v })} small />
                </>
              )}
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
          <div style={{ overflow: "auto", background: "repeating-conic-gradient(#1a1a2e 0% 25%, #12122a 0% 50%) 50% / 24px 24px", borderRadius: 6, maxHeight: "70vh" }} className="tbl-scroll">
            <canvas ref={canvasRef} style={{ width: `${zoom * 100}%`, height: "auto", display: "block", imageRendering: "pixelated" }} />
          </div>
          <div style={{ color: T.dim, fontSize: 11, marginTop: 8 }}>O preview é escalado; o PNG sai na resolução nativa ({W}×{H} px). Fundo xadrez = área transparente (alpha).</div>
        </div>
      </div>
    </div>
  );
}

const sel = { flex: 1, background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 13 };
const Label = ({ children, style }) => <div style={{ textTransform: "uppercase", fontSize: 11, color: T.mut, marginBottom: 6, ...style }}>{children}</div>;

// slider próprio: re-renderiza só a si mesmo enquanto arrasta e comita (redesenho) com debounce
function NumScaleSlider({ value, onChange }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = useDebouncedCallback(onChange, 150);
  return (
    <>
      <Label style={{ marginTop: 16 }}>Tamanho do número — {v.toFixed(1)}×</Label>
      <input type="range" min={0.5} max={2} step={0.1} value={v} onChange={(e) => { const n = parseFloat(e.target.value); setV(n); commit(n); }} style={{ width: "100%", accentColor: T.acc }} />
    </>
  );
}

function Toggle({ on, onClick, children, full, style }) {
  return (
    <button onClick={onClick} style={{ gridColumn: full ? "1 / -1" : "auto", padding: "8px 6px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, border: `1px solid ${on ? T.acc : T.bd}`, background: on ? T.sel : T.card2, color: on ? T.acM : T.mut, ...style }}>
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
