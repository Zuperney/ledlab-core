// pages/AspectRatio.jsx — Calculadora de Aspect Ratio (proporção de tela) com
// visualização e comparação com resoluções padrão de vídeo. Ferramenta avulsa:
// parte de pixels manuais OU de um gabinete + grade (resolução total do painel).
import { useState, useEffect } from "react";
import { ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";
import { T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const ratioStr = (w, h) => { const g = gcd(w, h) || 1; return `${w / g}:${h / g}`; };

// formatos nomeados (nome comercial + valor decimal) — cinema, TV/vídeo e displays.
// Usados para nomear a proporção e achar o formato mais próximo.
const NAMED = [
  ["32:9", 32 / 9], ["2.39:1", 2.39], ["2.35:1", 2.35], ["21:9", 21 / 9],
  ["2:1", 2], ["1.9:1", 1.9], ["1.85:1", 1.85], ["16:9", 16 / 9],
  ["1.66:1", 5 / 3], ["16:10", 16 / 10], ["3:2", 3 / 2], ["1.43:1", 1.43],
  ["4:3", 4 / 3], ["5:4", 5 / 4], ["1:1", 1], ["4:5", 4 / 5], ["9:16", 9 / 16],
];
const TILES = ["32:9", "2.39:1", "21:9", "16:9", "16:10", "4:3", "1:1", "9:16"];

// nome comercial exato quando bate com um formato conhecido; senão, a razão simplificada (GCD)
const friendly = (w, h) => { const d = w / h; const n = NAMED.find((x) => Math.abs(x[1] - d) < 0.004); return n ? n[0] : ratioStr(w, h); };

// resoluções padrão de referência (ar = nome comercial do formato)
const STD = [
  { name: "nHD", w: 640, h: 360, ar: "16:9" },
  { name: "HD 720p", w: 1280, h: 720, ar: "16:9" },
  { name: "FHD 1080p", w: 1920, h: 1080, ar: "16:9" },
  { name: "QHD 1440p", w: 2560, h: 1440, ar: "16:9" },
  { name: "4K UHD", w: 3840, h: 2160, ar: "16:9" },
  { name: "8K UHD", w: 7680, h: 4320, ar: "16:9" },
  { name: "WUXGA", w: 1920, h: 1200, ar: "16:10" },
  { name: "UW-FHD", w: 2560, h: 1080, ar: "21:9" },
  { name: "UW-QHD", w: 3440, h: 1440, ar: "21:9" },
  { name: "XGA", w: 1024, h: 768, ar: "4:3" },
  { name: "SXGA", w: 1280, h: 1024, ar: "5:4" },
  { name: "DCI 4K", w: 4096, h: 2160, ar: "1.9:1" },
  { name: "Quadrado HD", w: 1080, h: 1080, ar: "1:1" },
];

export default function AspectRatio() {
  const { cabs } = useLedLabContext();
  const isMobile = useIsMobile();
  const [controlsOpen, setControlsOpen] = useState(!isMobile);
  useEffect(() => { setControlsOpen(!isMobile); }, [isMobile]);
  const [w, setW] = useState(1920);
  const [h, setH] = useState(1080);
  const [cabId, setCabId] = useState(cabs[0]?.id);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(6);

  const W = Math.max(1, Math.round(w) || 1), H = Math.max(1, Math.round(h) || 1);
  const dec = W / H;
  const mp = (W * H) / 1e6;
  const orient = dec > 1.02 ? "Paisagem" : dec < 0.98 ? "Retrato" : "Quadrado";
  const named = NAMED.reduce((a, b) => (Math.abs(b[1] - dec) < Math.abs(a[1] - dec) ? b : a));
  const namedExact = Math.abs(named[1] - dec) < 0.005;
  const nearestRes = STD.reduce((a, b) => (Math.abs(b.w * b.h - W * H) < Math.abs(a.w * a.h - W * H) ? b : a));

  const seedPanel = () => {
    const c = cabs.find((x) => x.id === cabId) || cabs[0]; if (!c) return;
    setW((parseInt(c.resX) || 0) * cols); setH((parseInt(c.resY) || 0) * rows);
  };
  const swap = () => { setW(H); setH(W); };

  const inp = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 15, width: 120 };
  const lbl = { textTransform: "uppercase", fontSize: 11, color: T.mut, display: "block", marginBottom: 4 };
  const stat = (l, v, c) => (<div><div style={{ fontSize: 10, textTransform: "uppercase", color: T.mut }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800, color: c || T.txt }}>{v}</div></div>);
  const cellTd = { padding: "8px 10px", borderBottom: `1px solid ${T.bd}` };

  // preview: painel (preenchido) vs referência 16:9/9:16 (tracejada), mesma altura
  const boxW = 460, boxH = 240, pad = 20;
  const ref = dec >= 1 ? 16 / 9 : 9 / 16;
  const h0 = Math.min(boxH - pad * 2, (boxW - pad * 2) / Math.max(dec, ref));
  const pr = { w: h0 * dec, h: h0 }, rr = { w: h0 * ref, h: h0 };
  const cx = boxW / 2, cy = boxH / 2;

  const tile = (name) => {
    const r = NAMED.find((n) => n[0] === name)[1];
    const bw = 64, bh = 42, ip = 6;
    const hh = Math.min(bh - ip * 2, (bw - ip * 2) / Math.max(r, 0.001));
    const ww = hh * r, match = Math.abs(r - dec) < 0.005;
    return (
      <div key={name} style={{ textAlign: "center" }}>
        <svg width={bw} height={bh} style={{ display: "block" }}>
          <rect x={(bw - ww) / 2} y={(bh - hh) / 2} width={ww} height={hh} rx={2} fill={match ? T.acc : "transparent"} stroke={match ? T.acc : T.dim2} strokeWidth={1.5} />
        </svg>
        <div style={{ fontSize: 11, color: match ? T.acM : T.mut, fontWeight: match ? 700 : 500, marginTop: 2 }}>{name}</div>
      </div>
    );
  };

  return (
    <div>
      <SectionHeader title="Calculadora de Aspect Ratio" subtitle="Proporção da tela, visualização e comparação com resoluções padrão de vídeo." />

      {/* ENTRADAS + RESULTADO */}
      <div style={card({ marginBottom: 16 })}>
        {isMobile && (
          <button onClick={() => setControlsOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "2px 2px 8px", background: "transparent", border: "none", color: T.txt, cursor: "pointer", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
            Controles
            {controlsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        {(!isMobile || controlsOpen) && (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label style={lbl}>Largura (px)</label><input type="number" value={w} onChange={(e) => setW(parseInt(e.target.value) || 0)} style={inp} /></div>
          <button onClick={swap} title="Trocar largura/altura" style={{ width: 38, height: 38, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 1 }}><ArrowLeftRight size={16} /></button>
          <div><label style={lbl}>Altura (px)</label><input type="number" value={h} onChange={(e) => setH(parseInt(e.target.value) || 0)} style={inp} /></div>
          <div style={{ width: 1, height: 44, background: T.bd, margin: "0 6px" }} />
          <div><label style={lbl}>Gabinete</label><select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={{ ...inp, width: 180 }}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div><label style={lbl}>Colunas</label><input type="number" value={cols} onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 78 }} /></div>
          <div><label style={lbl}>Linhas</label><input type="number" value={rows} onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 78 }} /></div>
          <button onClick={seedPanel} style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${T.acc}`, background: T.acc, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 1 }}>Usar painel</button>
        </div>
        )}
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.bd}` }}>
          {stat("Proporção", friendly(W, H), T.acM)}
          {stat("Decimal", `${dec.toFixed(3)}:1`)}
          {stat("Formato", `${namedExact ? "" : "≈ "}${named[0]}`, namedExact ? T.grn : T.txt)}
          {stat("Resolução", `${W} × ${H}`)}
          {stat("Pixels", `${mp.toFixed(2)} Mpx`)}
          {stat("Orientação", orient)}
        </div>
      </div>

      {/* VISUALIZAÇÃO */}
      <div style={card({ marginBottom: 16 })}>
        <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", marginBottom: 12 }}>Visualização</div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
          <svg viewBox={`0 0 ${boxW} ${boxH}`} width={boxW} height={boxH} style={{ background: T.card2, borderRadius: 8, maxWidth: "100%", height: "auto" }}>
            <rect x={cx - rr.w / 2} y={cy - rr.h / 2} width={rr.w} height={rr.h} fill="none" stroke={T.dim2} strokeWidth={1.5} strokeDasharray="5 4" />
            <rect x={cx - pr.w / 2} y={cy - pr.h / 2} width={pr.w} height={pr.h} rx={3} fill={T.acc + "33"} stroke={T.acc} strokeWidth={2} />
            <text x={cx} y={cy - 5} fill={T.txt} fontSize={16} fontWeight="800" textAnchor="middle">{friendly(W, H)}</text>
            <text x={cx} y={cy + 15} fill={T.mut} fontSize={12} textAnchor="middle">{W} × {H}</text>
          </svg>
          <div>
            <div style={{ color: T.dim, fontSize: 12, marginBottom: 10 }}>Formatos <span style={{ color: T.dim2 }}>(tracejado no preview = {dec >= 1 ? "16:9" : "9:16"})</span></div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>{TILES.map(tile)}</div>
          </div>
        </div>
      </div>

      {/* COMPARAÇÃO COM RESOLUÇÕES PADRÃO */}
      <div style={card()}>
        <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>Resoluções padrão</div>
        <div style={{ color: T.dim, fontSize: 12, marginBottom: 12 }}>Destacadas = mesmo aspecto do seu painel. Mais próxima em nº de pixels: <b style={{ color: T.acM }}>{nearestRes.name} ({nearestRes.w}×{nearestRes.h})</b>.</div>
        <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", minWidth: 460, borderCollapse: "collapse", fontSize: 13 }}>
          <thead><tr>{["Nome", "Resolução", "Aspecto", "Pixels", ""].map((x, i) => <th key={i} style={{ textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${T.bd}`, color: T.mut, fontSize: 11, textTransform: "uppercase" }}>{x}</th>)}</tr></thead>
          <tbody>
            {STD.map((s) => {
              const sdec = s.w / s.h, match = Math.abs(sdec - dec) < 0.01;
              return (
                <tr key={s.name} style={{ background: match ? T.sel : "transparent" }}>
                  <td style={{ ...cellTd, color: T.txt, fontWeight: 600 }}>{s.name}</td>
                  <td style={{ ...cellTd, color: T.mut }}>{s.w} × {s.h}</td>
                  <td style={{ ...cellTd, color: match ? T.acM : T.mut, fontWeight: match ? 700 : 400 }}>{s.ar}</td>
                  <td style={{ ...cellTd, color: T.dim }}>{(s.w * s.h / 1e6).toFixed(2)} Mpx</td>
                  <td style={cellTd}>{match && <span style={{ color: T.grn, fontSize: 12, fontWeight: 700 }}>✓ mesmo aspecto</span>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
