// pages/AspectRatio.jsx — Calculadora de Aspect Ratio (proporção de tela) com
// visualização e comparação com resoluções padrão de vídeo, e o modo DISTÂNCIA
// (Fase 02: recomendador pitch × distância — as quatro réguas de visão).
// Ferramenta avulsa: parte de valores manuais OU de um gabinete + grade.
import { useState } from "react";
import { ArrowLeftRight, ChevronDown, ChevronUp } from "lucide-react";
import { T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import HelpTip from "../components/HelpTip.jsx";
import Segmented from "../components/Segmented.jsx";
import StatusPill from "../components/StatusPill.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import Select from "../components/Select.jsx";
import NumField from "../components/NumField.jsx";
import { fillCrop } from "../services/crop.js";
import { pitchMm, viewingOf, faixa, pitchFor, sugerirGabinete } from "../services/viewing.js";

// LLC-08: didática dos números mora no tooltip do rótulo (R4 — zero parágrafo fixo)
const STAT_TIP = {
  "Proporção": "Razão largura:altura simplificada (ou o nome comercial quando bate).",
  "Decimal": "Largura ÷ altura — o número que processadores e media servers usam.",
  "Formato": "O formato de vídeo conhecido mais próximo (≈ quando não é exato).",
  "Resolução": "Pixels reais do painel: largura × altura.",
  "Orientação": "Paisagem (deitado), retrato (em pé) ou quadrado.",
  "Mínima": "Regra 1×: o pitch em milímetros vira metros — mais perto que isso as cores não fundem.",
  "Ótima": "Regra 10×: pitch × 10 pés (≈ ×3 m) — distância confortável de assistir.",
  "Retina": "Pitch × 3,438 (1 minuto de arco, visão 20/20) — daqui o pixel deixa de existir.",
  "Máxima": "Altura da tela × 30 — de mais longe a imagem perde presença (regra de outdoor).",
};

// rótulo e cor do veredito da primeira fila (a chave semântica vem do motor)
const FAIXA_UI = {
  "muito-perto": { c: "red", l: "Pixel visível" },
  "aceitavel": { c: "amb", l: "Aceitável" },
  "ideal": { c: "grn", l: "Confortável" },
  "retina": { c: "grn", l: "Retina" },
  "longe-demais": { c: "amb", l: "Longe demais" },
};

const fmtM = (n) => (n >= 100 ? String(Math.round(n)) : n.toFixed(1).replace(".", ","));

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
  const [mode, setMode] = useState("prop"); // F1: "prop" (proporção/crop) | "dist" (distância de visão)
  const [w, setW] = useState(1920);
  const [h, setH] = useState(1080);
  const [cabId, setCabId] = useState(cabs[0]?.id);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(6);
  const [sw, setSw] = useState(1920); // fonte de vídeo p/ o cálculo de crop
  const [sh, setSh] = useState(1080);
  const [offFrac, setOffFrac] = useState(0.5); // deslocamento do crop (0..1) no eixo com sobra
  const [vizMode, setVizMode] = useState("crop"); // "crop" (preencher) | "fit" (encaixar dentro)
  // modo distância: manual-sempre-visível; "Usar painel" semeia do gabinete + grade
  const [pitchIn, setPitchIn] = useState(3.9); // mm
  const [alturaIn, setAlturaIn] = useState(0); // m — 0 = não informada (sem "máxima")
  const [filaM, setFilaM] = useState(5); // primeira fila (m)

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

  // a MESMA primária nos dois modos (R1) — o handler ramifica: proporção semeia
  // pixels; distância semeia pitch (dimW/resX) e altura (linhas × dimH)
  const seedPanel = () => {
    const c = cabs.find((x) => x.id === cabId) || cabs[0]; if (!c) return;
    if (mode === "dist") {
      const p = pitchMm(c); if (p) setPitchIn(p);
      setAlturaIn(((parseFloat(c.dimH) || 0) * rows) / 1000);
    } else {
      setW((parseInt(c.resX) || 0) * cols); setH((parseInt(c.resY) || 0) * rows);
    }
  };
  const swap = () => { setW(H); setH(W); };

  // distância de visão (motor puro em services/viewing.js — fórmulas com fonte)
  const vd = viewingOf(pitchIn, alturaIn);
  const fx = faixa(filaM, vd);
  const pf = pitchFor(filaM);
  const sug = sugerirGabinete(filaM, cabs);

  const inp = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 15, width: 120 };
  const lbl = { textTransform: "uppercase", fontSize: 11, color: T.mut, display: "block", marginBottom: 4 };
  // LLC-08: resultado vira CHIP passivo numa linha compacta (R5); toque/hover no
  // rótulo explica (title) e o "?" concentra a didática no mobile
  const chipStat = (l, v, c) => (
    <span key={l} title={STAT_TIP[l]} style={{ display: "inline-flex", alignItems: "baseline", gap: 6, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "5px 10px", background: T.card2 }}>
      <span style={{ fontSize: 10, textTransform: "uppercase", color: T.mut }}>{l}</span>
      <b style={{ fontSize: 14, color: c || T.txt }}>{v}</b>
    </span>
  );

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

  return (
    <div>
      <SectionHeader title="Calculadora de Aspect Ratio" subtitle="Proporção da tela, crop do sinal e distância de visão pelo pitch." />

      {/* F1 · MODO — fora do acordeão mobile de propósito */}
      <div style={{ marginBottom: 14 }}>
        <Segmented value={mode} onChange={setMode}
          options={[{ value: "prop", label: "Proporção" }, { value: "dist", label: "Distância" }]} />
      </div>

      {/* ENTRADAS + RESULTADO */}
      <div style={card({ marginBottom: 16 })}>
        {isMobile && (
          <button onClick={() => setControlsOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "2px 2px 8px", background: "transparent", border: "none", color: T.txt, cursor: "pointer", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
            Controles
            {controlsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        {(!isMobile || controlsOpen) && (mode === "prop" ? (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label style={lbl}>Largura (px)</label><NumField value={w} onChange={(n) => setW(Math.max(0, n))} style={inp} /></div>
          <button onClick={swap} title="Trocar largura/altura" style={{ width: 38, height: 38, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 1 }}><ArrowLeftRight size={16} /></button>
          <div><label style={lbl}>Altura (px)</label><NumField value={h} onChange={(n) => setH(Math.max(0, n))} style={inp} /></div>
          <div style={{ width: 1, height: 44, background: T.bd, margin: "0 6px" }} />
          <div><label style={lbl}>Gabinete</label><Select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={{ ...inp, width: 180 }}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select></div>
          <div><label style={lbl}>Colunas</label><NumField value={cols} onChange={(n) => setCols(Math.max(1, n))} style={{ ...inp, width: 78 }} /></div>
          <div><label style={lbl}>Linhas</label><NumField value={rows} onChange={(n) => setRows(Math.max(1, n))} style={{ ...inp, width: 78 }} /></div>
          <button onClick={seedPanel} style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${T.acc}`, background: T.acc, color: T.accInk, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 1 }}>Usar painel</button>
        </div>
        ) : (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label style={lbl}>Pitch (mm)</label><NumField fmt="dec2" value={pitchIn} onChange={(n) => setPitchIn(Math.max(0, n))} style={{ ...inp, width: 96 }} /></div>
          <div><label style={lbl}>Altura da tela (m)</label><NumField fmt="dec2" value={alturaIn} onChange={(n) => setAlturaIn(Math.max(0, n))} style={{ ...inp, width: 96 }} /></div>
          <div><label style={lbl}>Primeira fila (m)</label><NumField fmt="dec2" value={filaM} onChange={(n) => setFilaM(Math.max(0, n))} style={{ ...inp, width: 96 }} /></div>
          <div style={{ width: 1, height: 44, background: T.bd, margin: "0 6px" }} />
          {/* sem "Colunas": no modo distância só a ALTURA (linhas × dimH) entra na conta */}
          <div><label style={lbl}>Gabinete</label><Select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={{ ...inp, width: 180 }}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select></div>
          <div><label style={lbl}>Linhas</label><NumField value={rows} onChange={(n) => setRows(Math.max(1, n))} style={{ ...inp, width: 78 }} /></div>
          <button onClick={seedPanel} style={{ padding: "9px 14px", borderRadius: 8, border: `1px solid ${T.acc}`, background: T.acc, color: T.accInk, cursor: "pointer", fontSize: 13, fontWeight: 600, marginBottom: 1 }}>Usar painel</button>
        </div>
        ))}
        {mode === "prop" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.bd}` }}>
          {chipStat("Proporção", friendly(W, H), T.acM)}
          {chipStat("Decimal", `${dec.toFixed(3)}:1`)}
          {chipStat("Formato", `${namedExact ? "" : "≈ "}${named[0]}`, namedExact ? T.grn : undefined)}
          {chipStat("Resolução", `${W} × ${H}`)}
          {chipStat("Orientação", orient)}
          <HelpTip title="Os números da proporção">
            <b style={{ color: T.txt }}>Proporção</b> — razão simplificada (ou nome comercial). <b style={{ color: T.txt }}>Decimal</b> — largura ÷ altura. <b style={{ color: T.txt }}>Formato</b> — o padrão de vídeo mais próximo (≈ quando aproximado). <b style={{ color: T.txt }}>Resolução</b> — pixels reais do painel. <b style={{ color: T.txt }}>Orientação</b> — paisagem, retrato ou quadrado.
          </HelpTip>
        </div>
        ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginTop: 14, paddingTop: 12, borderTop: `1px solid ${T.bd}` }}>
          {vd && chipStat("Mínima", `${fmtM(vd.minM)} m`)}
          {vd && chipStat("Ótima", `${fmtM(vd.otimaM)} m`, T.acM)}
          {vd && chipStat("Retina", `${fmtM(vd.retinaM)} m`, T.grn)}
          {vd && chipStat("Máxima", vd.maxM ? `${fmtM(vd.maxM)} m` : "—")}
          {fx && <StatusPill color={T[FAIXA_UI[fx].c]} label={`1ª fila: ${FAIXA_UI[fx].l}`} />}
          <HelpTip title="As quatro réguas de distância">
            <b style={{ color: T.txt }}>Mínima</b> — regra 1×: pitch em mm vira metros; antes disso as cores não fundem. <b style={{ color: T.txt }}>Ótima</b> — regra 10×: pitch × 10 pés (≈ ×3 m). <b style={{ color: T.txt }}>Retina</b> — pitch × 3,438 (1 minuto de arco, visão 20/20): o pixel some. <b style={{ color: T.txt }}>Máxima</b> — altura da tela × 30 (regra de outdoor). Fórmulas com fontes no artigo <b style={{ color: T.txt }}>Pixel pitch e distância de visão</b> da Base de Conhecimento.
          </HelpTip>
        </div>
        )}
      </div>

      {/* LLC-08: o CROP é a primeira coisa abaixo do seletor de proporção — preview
          gráfico + números no MESMO card; modo exclusivo = Segmented (R2) */}
      {mode === "prop" && (
      <div style={card({ marginBottom: 16 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Encaixar / Preencher (crop)</div>
          <Segmented size="sm" value={vizMode} onChange={setVizMode}
            options={[{ value: "crop", label: "Preencher (corta)" }, { value: "fit", label: "Encaixar (barras)" }]} />
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 12 }}>
          <div><label style={lbl}>Fonte — largura</label><NumField value={sw} onChange={(n) => setSw(Math.max(0, n))} style={{ ...inp, width: 110 }} /></div>
          <div><label style={lbl}>Fonte — altura</label><NumField value={sh} onChange={(n) => setSh(Math.max(0, n))} style={{ ...inp, width: 110 }} /></div>
          <div style={{ color: T.dim, fontSize: 12, paddingBottom: 9 }}>→ tela <b style={{ color: T.mut }}>{W}×{H}</b> ({friendly(W, H)})</div>
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
        {/* números dos dois modos, abaixo do preview */}
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14, marginTop: 14 }}>
          <div style={{ background: T.card2, border: `1px solid ${vizMode === "fit" ? T.acc : T.bd}`, borderRadius: 10, padding: 14 }}>
            <div style={{ color: T.acM, fontWeight: 700, fontSize: 14, marginBottom: 8 }}>Encaixar · mostra tudo</div>
            <div style={{ fontSize: 13, color: T.txt, lineHeight: 1.7 }}>
              <div>Conteúdo: <b style={{ fontFamily: "ui-monospace,monospace" }}>{fitW} × {fitH}</b> · escala {(kFit * 100).toFixed(1)}%</div>
              <div style={{ color: T.mut }}>{barX > 0 ? `Barras: ${barX}px nas laterais (pillarbox)` : barY > 0 ? `Barras: ${barY}px topo e base (letterbox)` : "Sem barras — mesmo aspecto"}</div>
            </div>
          </div>
          <div style={{ background: T.card2, border: `1px solid ${vizMode === "crop" ? T.acc : T.bd}`, borderRadius: 10, padding: 14 }}>
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
      )}

      {/* F4 do modo DISTÂNCIA — a régua das quatro distâncias + a recomendação.
          100% tokens T (a régua vive nos DOIS temas; nada de hex solto aqui). */}
      {mode === "dist" && (
      <div style={card({ marginBottom: 16 })}>
        <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", marginBottom: 12 }}>Régua de distância</div>
        {vd ? (() => {
          const RW = 460, RH = 118, pad = 14;
          const dom = 1.12 * Math.max(vd.retinaM, filaM || 0, vd.maxM || 0);
          const X = (m) => pad + (m / dom) * (RW - pad * 2);
          const bandY = 48, bandH = 26;
          const bands = [
            [0, vd.minM, T.red + "33"],
            [vd.minM, vd.otimaM, T.amb + "33"],
            [vd.otimaM, vd.retinaM, T.grn + "44"],
            [vd.retinaM, vd.maxM ?? dom, T.grn + "22"],
            ...(vd.maxM ? [[vd.maxM, dom, T.dim2 + "22"]] : []),
          ];
          const ticks = [["mín", vd.minM], ["ótima", vd.otimaM], ["retina", vd.retinaM], ...(vd.maxM ? [["máx", vd.maxM]] : [])];
          return (
            <>
              <svg viewBox={`0 0 ${RW} ${RH}`} width={RW} style={{ maxWidth: "100%", height: "auto", display: "block" }}>
                {bands.map(([a, b, f], i) => <rect key={i} x={X(a)} y={bandY} width={Math.max(0, X(b) - X(a))} height={bandH} fill={f} />)}
                <rect x={X(0)} y={bandY} width={RW - pad * 2} height={bandH} rx={3} fill="none" stroke={T.bd} />
                {/* rótulos dos ticks alternam de linha — réguas vizinhas (ótima/retina) colidiriam */}
                {ticks.map(([l, m], i) => (
                  <g key={l}>
                    <line x1={X(m)} y1={bandY - 4} x2={X(m)} y2={bandY + bandH + 4} stroke={T.mut} strokeWidth={1} />
                    <text x={X(m)} y={bandY + bandH + (i % 2 ? 31 : 17)} fill={T.mut} fontSize={10} textAnchor="middle">{l} {fmtM(m)} m</text>
                  </g>
                ))}
                {filaM > 0 && (
                  <g>
                    <path d={`M ${X(filaM)} ${bandY - 6} l -5 -9 h 10 z`} fill={T.acc} />
                    <text x={Math.min(Math.max(X(filaM), 34), RW - 34)} y={bandY - 21} fill={T.acM} fontSize={10.5} fontWeight="700" textAnchor="middle">1ª fila {fmtM(filaM)} m</text>
                  </g>
                )}
              </svg>
              <div style={{ marginTop: 12, fontSize: 13, color: T.txt, lineHeight: 1.8 }}>
                {pf && (
                  <div>Pitch pra ficar <b style={{ color: T.grn }}>retina</b> a {fmtM(filaM)} m: <b style={{ fontFamily: "ui-monospace,monospace" }}>≤ {pf.retinaMm.toFixed(2).replace(".", ",")} mm</b> <span style={{ color: T.mut }}>(teto aceitável {pf.tetoMm.toFixed(2).replace(".", ",")} mm — regra 1×)</span></div>
                )}
                {pf && sug && (
                  <div style={{ color: T.mut }}>Do seu cadastro: <b style={{ color: T.txt }}>{sug.cab.nome}</b> ({sug.pitchMm.toFixed(2).replace(".", ",")} mm) {sug.atende ? <b style={{ color: T.grn }}>atende</b> : <><b style={{ color: T.amb }}>não atende</b> — é o mais próximo</>}.</div>
                )}
              </div>
            </>
          );
        })() : (
          <div style={{ color: T.dim, fontSize: 13 }}>Informe um pitch maior que zero — ou use um gabinete do cadastro no botão Usar painel.</div>
        )}
      </div>
      )}
    </div>
  );
}
