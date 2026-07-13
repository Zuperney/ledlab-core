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
import Select from "../components/Select.jsx";
import NumField from "../components/NumField.jsx";
import { fillCrop } from "../services/crop.js";

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
  const [sw, setSw] = useState(1920); // fonte de vídeo p/ o cálculo de crop
  const [sh, setSh] = useState(1080);
  const [offFrac, setOffFrac] = useState(0.5); // deslocamento do crop (0..1) no eixo com sobra

  const W = Math.max(1, Math.round(w) || 1), H = Math.max(1, Math.round(h) || 1);
  const dec = W / H;
  const orient = dec > 1.02 ? "Paisagem" : dec < 0.98 ? "Retrato" : "Quadrado";
  const named = NAMED.reduce((a, b) => (Math.abs(b[1] - dec) < Math.abs(a[1] - dec) ? b : a));
  const namedExact = Math.abs(named[1] - dec) < 0.005;
  const nearestRes = STD.reduce((a, b) => (Math.abs(b.w * b.h - W * H) < Math.abs(a.w * a.h - W * H) ? b : a));

  // crop / encaixe de vídeo: fonte (SW×SH) → tela (W×H)
  const SW = Math.max(1, Math.round(sw) || 1), SH = Math.max(1, Math.round(sh) || 1);
  const kFit = Math.min(W / SW, H / SH); // "encaixar" (contain): mostra tudo, cria barras
  const fitW = Math.round(SW * kFit), fitH = Math.round(SH * kFit);
  const barX = Math.round((W - fitW) / 2), barY = Math.round((H - fitH) / 2);
  const fc = fillCrop(SW, SH, W, H, offFrac); // "preencher" (cover): recorte da fonte + deslocamento
  const cropSlack = fc.axis === "x" ? fc.slackX : fc.axis === "y" ? fc.slackY : 0;
  const cropOff = fc.axis === "x" ? fc.x : fc.axis === "y" ? fc.y : 0;
  const setCropOff = (px) => setOffFrac(cropSlack > 0 ? Math.min(1, Math.max(0, px / cropSlack)) : 0.5);

  const seedPanel = () => {
    const c = cabs.find((x) => x.id === cabId) || cabs[0]; if (!c) return;
    setW((parseInt(c.resX) || 0) * cols); setH((parseInt(c.resY) || 0) * rows);
  };
  const swap = () => { setW(H); setH(W); };

  const inp = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 15, width: 120 };
  const lbl = { textTransform: "uppercase", fontSize: 11, color: T.mut, display: "block", marginBottom: 4 };
  const stat = (l, v, c) => (<div><div style={{ fontSize: 10, textTransform: "uppercase", color: T.mut }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800, color: c || T.txt }}>{v}</div></div>);
  const cellTd = { padding: "8px 10px", borderBottom: `1px solid ${T.bd}` };

  // visualização do crop: a FONTE (X + círculo no centro) com a janela de crop revelando a parte usada
  const boxW = 460, boxH = 240, vpad = 18;
  const vscale = Math.min((boxW - vpad * 2) / SW, (boxH - vpad * 2) / SH); // escala fonte → svg
  const svW = SW * vscale, svH = SH * vscale;
  const svX = (boxW - svW) / 2, svY = (boxH - svH) / 2;
  const cwv = fc.cropW * vscale, chv = fc.cropH * vscale; // janela do crop em coords do svg
  const cxv = svX + fc.x * vscale, cyv = svY + fc.y * vscale;
  const clampSvg = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

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
          <div><label style={lbl}>Largura (px)</label><NumField value={w} onChange={(n) => setW(Math.max(0, n))} style={inp} /></div>
          <button onClick={swap} title="Trocar largura/altura" style={{ width: 38, height: 38, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 1 }}><ArrowLeftRight size={16} /></button>
          <div><label style={lbl}>Altura (px)</label><NumField value={h} onChange={(n) => setH(Math.max(0, n))} style={inp} /></div>
          <div style={{ width: 1, height: 44, background: T.bd, margin: "0 6px" }} />
          <div><label style={lbl}>Gabinete</label><Select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={{ ...inp, width: 180 }}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select></div>
          <div><label style={lbl}>Colunas</label><NumField value={cols} onChange={(n) => setCols(Math.max(1, n))} style={{ ...inp, width: 78 }} /></div>
          <div><label style={lbl}>Linhas</label><NumField value={rows} onChange={(n) => setRows(Math.max(1, n))} style={{ ...inp, width: 78 }} /></div>
          <button onClick={seedPanel} style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${T.acc}`, background: T.acc, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 1 }}>Usar painel</button>
        </div>
        )}
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.bd}` }}>
          {stat("Proporção", friendly(W, H), T.acM)}
          {stat("Decimal", `${dec.toFixed(3)}:1`)}
          {stat("Formato", `${namedExact ? "" : "≈ "}${named[0]}`, namedExact ? T.grn : T.txt)}
          {stat("Resolução", `${W} × ${H}`)}
          {stat("Orientação", orient)}
        </div>
      </div>

      {/* CROP / ENCAIXE DE VÍDEO */}
      <div style={card({ marginBottom: 16 })}>
        <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>Crop / encaixe de vídeo</div>
        <div style={{ color: T.dim, fontSize: 12, marginBottom: 14 }}>Como uma fonte de vídeo entra na sua tela <b style={{ color: T.mut }}>{W}×{H}</b> ({friendly(W, H)}): encaixando (mostra tudo, com barras) ou preenchendo (enche a tela, cortando a fonte).</div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 }}>
          <div><label style={lbl}>Fonte — largura</label><NumField value={sw} onChange={(n) => setSw(Math.max(0, n))} style={{ ...inp, width: 120 }} /></div>
          <div><label style={lbl}>Fonte — altura</label><NumField value={sh} onChange={(n) => setSh(Math.max(0, n))} style={{ ...inp, width: 120 }} /></div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
          <div style={{ background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 10, padding: 14 }}>
            <div style={{ color: T.acM, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Encaixar · mostra tudo</div>
            <div style={{ fontSize: 13, color: T.txt, lineHeight: 1.7 }}>
              <div>Conteúdo: <b style={{ fontFamily: "ui-monospace,monospace" }}>{fitW} × {fitH}</b> · escala {(kFit * 100).toFixed(1)}%</div>
              <div style={{ color: T.mut }}>{barX > 0 ? `Barras: ${barX}px nas laterais (pillarbox)` : barY > 0 ? `Barras: ${barY}px topo e base (letterbox)` : "Sem barras — mesmo aspecto"}</div>
            </div>
          </div>
          <div style={{ background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 10, padding: 14 }}>
            <div style={{ color: T.acM, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Preencher · corta (crop)</div>
            <div style={{ fontSize: 13, color: T.txt, lineHeight: 1.7 }}>
              <div>Recorte da fonte: <b style={{ fontFamily: "ui-monospace,monospace" }}>{fc.cropW} × {fc.cropH}</b> · escala {(fc.scale * 100).toFixed(1)}%</div>
              <div style={{ color: T.mut }}>Região: <span style={{ fontFamily: "ui-monospace,monospace", color: T.txt }}>x {fc.x} · y {fc.y}</span></div>
            </div>
            {fc.axis ? (
              <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, color: T.mut, textTransform: "uppercase" }}>Deslocar {fc.axis.toUpperCase()}</span>
                <NumField value={cropOff} onChange={setCropOff} style={{ ...inp, width: 88, fontSize: 14 }} />
                <span style={{ fontSize: 12, color: T.dim }}>0–{cropSlack}px</span>
                <button onClick={() => setOffFrac(0.5)} style={{ padding: "6px 10px", borderRadius: 7, border: `1px solid ${T.bd}`, background: T.card, color: T.txt, cursor: "pointer", fontSize: 12 }}>Centralizar</button>
              </div>
            ) : (
              <div style={{ marginTop: 8, fontSize: 12, color: T.dim }}>Sem sobra pra deslocar — mesmo aspecto.</div>
            )}
          </div>
        </div>
      </div>

      {/* VISUALIZAÇÃO */}
      <div style={card({ marginBottom: 16 })}>
        <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", marginBottom: 12 }}>Visualização</div>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", alignItems: "center" }}>
          <svg viewBox={`0 0 ${boxW} ${boxH}`} width={boxW} height={boxH} style={{ background: T.card2, borderRadius: 8, maxWidth: "100%", height: "auto" }}>
            {/* fonte: fundo + conteúdo de referência (X nas diagonais + círculo no centro) */}
            <rect x={svX} y={svY} width={svW} height={svH} rx={3} fill="#0d0d1a" stroke={T.dim2} strokeWidth={1} />
            <line x1={svX} y1={svY} x2={svX + svW} y2={svY + svH} stroke={T.dim} strokeWidth={1.2} />
            <line x1={svX + svW} y1={svY} x2={svX} y2={svY + svH} stroke={T.dim} strokeWidth={1.2} />
            <circle cx={svX + svW / 2} cy={svY + svH / 2} r={Math.min(svW, svH) * 0.4} fill="none" stroke={T.dim} strokeWidth={1.2} />
            {/* escurece o que fica FORA do crop (a parte que fica escondida) */}
            <g fill="rgba(13,13,26,0.76)">
              <rect x={svX} y={svY} width={Math.max(0, cxv - svX)} height={svH} />
              <rect x={cxv + cwv} y={svY} width={Math.max(0, svX + svW - (cxv + cwv))} height={svH} />
              <rect x={cxv} y={svY} width={cwv} height={Math.max(0, cyv - svY)} />
              <rect x={cxv} y={cyv + chv} width={cwv} height={Math.max(0, svY + svH - (cyv + chv))} />
            </g>
            {/* linha tracejada na posição do deslocamento */}
            {fc.axis === "x" && <line x1={cxv} y1={svY} x2={cxv} y2={svY + svH} stroke={T.acM} strokeWidth={1} strokeDasharray="4 3" />}
            {fc.axis === "y" && <line x1={svX} y1={cyv} x2={svX + svW} y2={cyv} stroke={T.acM} strokeWidth={1} strokeDasharray="4 3" />}
            {/* janela do crop (área revelada) + rótulos */}
            <rect x={cxv} y={cyv} width={cwv} height={chv} fill="none" stroke={T.acc} strokeWidth={2} />
            <text x={clampSvg(cxv + cwv / 2, svX + 30, svX + svW - 30)} y={cyv + chv / 2 + 4} fill="#fff" fontSize={12} fontWeight="700" textAnchor="middle">{fc.cropW}×{fc.cropH}</text>
            {fc.axis && <text x={svX + 5} y={svY + 13} fill={T.acM} fontSize={11} fontWeight="700">desloc. {fc.axis} {fc.axis === "x" ? fc.x : fc.y}px</text>}
            <text x={svX + svW - 5} y={svY + svH - 6} fill={T.mut} fontSize={10} textAnchor="end">fonte {SW}×{SH}</text>
          </svg>
          <div>
            <div style={{ color: T.dim, fontSize: 12, marginBottom: 10 }}>A janela roxa mostra o que aparece na tela; o resto da fonte fica escondido. Formatos padrão (destaca o aspecto da sua tela):</div>
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
