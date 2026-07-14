// pages/AspectRatio.jsx — Calculadora de Aspect Ratio (proporção de tela) com
// visualização e comparação com resoluções padrão de vídeo. Ferramenta avulsa:
// parte de pixels manuais OU de um gabinete + grade (resolução total do painel).
import { useState } from "react";
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

// nome comercial exato quando bate com um formato conhecido; senão, a razão simplificada (GCD)
const friendly = (w, h) => { const d = w / h; const n = NAMED.find((x) => Math.abs(x[1] - d) < 0.004); return n ? n[0] : ratioStr(w, h); };

export default function AspectRatio() {
  const { cabs } = useLedLabContext();
  const isMobile = useIsMobile();
  const [controlsOpen, setControlsOpen] = useState(!isMobile);
  // desktop↔mobile mudou: reajusta o padrão DURANTE o render (sem setState em effect)
  const [prevMobile, setPrevMobile] = useState(isMobile);
  if (prevMobile !== isMobile) { setPrevMobile(isMobile); setControlsOpen(!isMobile); }
  const [w, setW] = useState(1920);
  const [h, setH] = useState(1080);
  const [cabId, setCabId] = useState(cabs[0]?.id);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(6);
  const [sw, setSw] = useState(1920); // fonte de vídeo p/ o cálculo de crop
  const [sh, setSh] = useState(1080);
  const [offFrac, setOffFrac] = useState(0.5); // deslocamento do crop (0..1) no eixo com sobra
  const [vizMode, setVizMode] = useState("crop"); // "crop" (preencher) | "fit" (encaixar dentro)

  const W = Math.max(1, Math.round(w) || 1), H = Math.max(1, Math.round(h) || 1);
  const dec = W / H;
  const orient = dec > 1.02 ? "Paisagem" : dec < 0.98 ? "Retrato" : "Quadrado";
  const named = NAMED.reduce((a, b) => (Math.abs(b[1] - dec) < Math.abs(a[1] - dec) ? b : a));
  const namedExact = Math.abs(named[1] - dec) < 0.005;

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

  // visualização do crop: a FONTE (X + círculo no centro) com a janela de crop revelando a parte usada
  const boxW = 460, boxH = 240, vpad = 18;
  const vscale = Math.min((boxW - vpad * 2) / SW, (boxH - vpad * 2) / SH); // escala fonte → svg
  const svW = SW * vscale, svH = SH * vscale;
  const svX = (boxW - svW) / 2, svY = (boxH - svH) / 2;
  const cwv = fc.cropW * vscale, chv = fc.cropH * vscale; // janela do crop em coords do svg
  const cxv = svX + fc.x * vscale, cyv = svY + fc.y * vscale;
  const clampSvg = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

  // modo "encaixar" (inside): o PAINEL é a moldura; a fonte encaixa dentro preservando o ratio (barras em volta)
  const pvS = Math.min((boxW - vpad * 2) / W, (boxH - vpad * 2) / H);
  const pvW = W * pvS, pvH = H * pvS;
  const pvX = (boxW - pvW) / 2, pvY = (boxH - pvH) / 2;
  const srcAsp = SW / SH;
  let ctW = pvW, ctH = pvW / srcAsp;
  if (ctH > pvH) { ctH = pvH; ctW = pvH * srcAsp; }
  const ctX = pvX + (pvW - ctW) / 2, ctY = pvY + (pvH - ctH) / 2;
  const vizBtn = (on) => ({ padding: "5px 11px", borderRadius: 7, cursor: "pointer", fontSize: 12.5, fontWeight: 600, border: `1px solid ${on ? T.acc : T.bd}`, background: on ? T.acc : "transparent", color: on ? "#fff" : T.mut, fontFamily: "inherit" });

  return (
    <div>
      <SectionHeader title="Calculadora de Aspect Ratio" subtitle="Proporção da tela e visualização do crop do sinal de vídeo." />

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
        <div style={{ color: T.dim, fontSize: 12, marginBottom: 14 }}>Como a fonte entra na tela <b style={{ color: T.mut }}>{W}×{H}</b> ({friendly(W, H)}): encaixar (mostra tudo, com barras) ou preencher (enche, cortando).</div>
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Visualização</div>
          <div style={{ display: "flex", gap: 6 }}>
            <button onClick={() => setVizMode("crop")} style={vizBtn(vizMode === "crop")}>Preencher (corta)</button>
            <button onClick={() => setVizMode("fit")} style={vizBtn(vizMode === "fit")}>Encaixar (dentro)</button>
          </div>
        </div>
        <div>
          <svg viewBox={`0 0 ${boxW} ${boxH}`} width={boxW} height={boxH} style={{ background: T.card2, borderRadius: 8, maxWidth: "100%", height: "auto" }}>
            {vizMode === "crop" ? (
              <>
                {/* fonte: fundo + X (diagonais) + círculo no centro */}
                <rect x={svX} y={svY} width={svW} height={svH} rx={3} fill="#0d0d1a" stroke={T.dim2} strokeWidth={1} />
                <line x1={svX} y1={svY} x2={svX + svW} y2={svY + svH} stroke={T.dim} strokeWidth={1.2} />
                <line x1={svX + svW} y1={svY} x2={svX} y2={svY + svH} stroke={T.dim} strokeWidth={1.2} />
                <circle cx={svX + svW / 2} cy={svY + svH / 2} r={Math.min(svW, svH) * 0.4} fill="none" stroke={T.dim} strokeWidth={1.2} />
                {/* escurece o que fica FORA do crop */}
                <g fill="rgba(13,13,26,0.76)">
                  <rect x={svX} y={svY} width={Math.max(0, cxv - svX)} height={svH} />
                  <rect x={cxv + cwv} y={svY} width={Math.max(0, svX + svW - (cxv + cwv))} height={svH} />
                  <rect x={cxv} y={svY} width={cwv} height={Math.max(0, cyv - svY)} />
                  <rect x={cxv} y={cyv + chv} width={cwv} height={Math.max(0, svY + svH - (cyv + chv))} />
                </g>
                {fc.axis === "x" && <line x1={cxv} y1={svY} x2={cxv} y2={svY + svH} stroke={T.acM} strokeWidth={1} strokeDasharray="4 3" />}
                {fc.axis === "y" && <line x1={svX} y1={cyv} x2={svX + svW} y2={cyv} stroke={T.acM} strokeWidth={1} strokeDasharray="4 3" />}
                <rect x={cxv} y={cyv} width={cwv} height={chv} fill="none" stroke={T.acc} strokeWidth={2} />
                <text x={clampSvg(cxv + cwv / 2, svX + 30, svX + svW - 30)} y={cyv + chv / 2 + 4} fill="#fff" fontSize={12} fontWeight="700" textAnchor="middle">{fc.cropW}×{fc.cropH}</text>
                {fc.axis && <text x={svX + 5} y={svY + 13} fill={T.acM} fontSize={11} fontWeight="700">desloc. {fc.axis} {fc.axis === "x" ? fc.x : fc.y}px</text>}
                <text x={svX + svW - 5} y={svY + svH - 6} fill={T.mut} fontSize={10} textAnchor="end">fonte {SW}×{SH}</text>
              </>
            ) : (
              <>
                {/* painel (moldura) — o preto em volta são as barras */}
                <rect x={pvX} y={pvY} width={pvW} height={pvH} rx={3} fill="#050510" stroke={T.acc} strokeWidth={2} />
                {/* conteúdo (fonte) encaixado preservando o ratio: X + círculo */}
                <rect x={ctX} y={ctY} width={ctW} height={ctH} fill="#0d0d1a" stroke={T.dim2} strokeWidth={1} />
                <line x1={ctX} y1={ctY} x2={ctX + ctW} y2={ctY + ctH} stroke={T.dim} strokeWidth={1.2} />
                <line x1={ctX + ctW} y1={ctY} x2={ctX} y2={ctY + ctH} stroke={T.dim} strokeWidth={1.2} />
                <circle cx={ctX + ctW / 2} cy={ctY + ctH / 2} r={Math.min(ctW, ctH) * 0.4} fill="none" stroke={T.dim} strokeWidth={1.2} />
                <text x={ctX + ctW / 2} y={ctY + ctH / 2 + 4} fill="#fff" fontSize={12} fontWeight="700" textAnchor="middle">{fitW}×{fitH}</text>
                {(barX > 0 || barY > 0) && <text x={pvX + pvW / 2} y={pvY + pvH - 6} fill={T.acM} fontSize={11} textAnchor="middle">barras {barX > 0 ? `${barX}px laterais` : `${barY}px topo/base`}</text>}
                <text x={pvX + 5} y={pvY + 13} fill={T.mut} fontSize={10}>painel {W}×{H}</text>
              </>
            )}
          </svg>
          <div style={{ color: T.dim, fontSize: 12, marginTop: 10 }}>{vizMode === "crop" ? "A janela roxa mostra o que aparece na tela; o resto da fonte fica escondido. A linha tracejada marca o deslocamento." : "A imagem inteira cabe no painel preservando a proporção; o preto em volta são as barras (letterbox/pillarbox)."}</div>
        </div>
      </div>
    </div>
  );
}
