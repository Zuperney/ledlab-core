// pages/project/ProjectTestCard.jsx — gerador de test card (canvas + export PNG).
import { useRef, useEffect, useState } from "react";
import { Download, Monitor, ZoomIn, ZoomOut, Maximize, Save, Shapes, ChevronDown, ChevronUp } from "lucide-react";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useToast, usePrompt } from "../../store/UIContext.jsx";
import { cablePorts } from "../../services/cabling.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback.js";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import { PALETTE, T } from "../../ui/tokens.js";
import { card } from "../../ui/styles.js";
import Placeholder from "../../components/Placeholder.jsx";
import DropdownMenu from "../../components/DropdownMenu.jsx";
import Select from "../../components/Select.jsx";

const BAR_COLORS = ["#ffffff", "#ffff00", "#00ffff", "#00ff00", "#ff00ff", "#ff0000", "#0000ff"];
export const DEFAULTS = { scheme: "cores", rainbowDir: "h", solidColor: "#ffffff", solidAlpha: false, numbers: true, junctions: true, circle: false, cross: false, corner: false, side: false, numScale: 1, colorBar: "off", cableMap: "off", info: true, infoPos: "inf-esq", infoInline: false };

export const PRESETS = {
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

export function draw(canvas, tela, o, mapPorts, cablePal) {
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
      const col = cablePal[pi % cablePal.length];
      ctx.strokeStyle = "#fff"; ctx.beginPath();
      port.forEach((cell, i) => { const x = cx(cell.c), y = cy(cell.r); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
      ctx.stroke();
      const f = port[0]; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(cx(f.c), cy(f.r), resY * 0.22, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#fff"; ctx.lineWidth = Math.max(2, resX * 0.02); ctx.stroke();
      ctx.fillStyle = "#fff"; ctx.font = `700 ${resY * 0.26}px system-ui`; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(String(pi + 1), cx(f.c), cy(f.r));
    });
  }

  // caixa de info — layout DINÂMICO: quebra automaticamente em 1–5 linhas pra MAXIMIZAR
  // a fonte legível na resolução da tela. Telas achatadas/estreitas ganham menos linhas
  // (fonte maior); telas normais mantêm as 5 linhas. Empate de fonte → a caixa com
  // proporção mais parecida com a da tela. Nunca passa do teto (não domina telas grandes)
  // nem estoura o canvas. Resolve a info virar minúscula em telas de baixa resolução.
  if (o.info) {
    const SEP = "   ·   ";
    const fields = [tela.nome, `${W} x ${H} px`, `${cols} × ${rows} = ${cols * rows} gab`];
    if (parseFloat(g.dimW) > 0 && parseFloat(g.dimH) > 0) // só com gabinete definido (evita "NaN")
      fields.push(`pitch ${(parseFloat(g.dimW) / resX).toFixed(2)} mm`, `${(cols * parseFloat(g.dimW) / 1000).toFixed(2)} x ${(rows * parseFloat(g.dimH) / 1000).toFixed(2)} m`);
    // distribui os campos em k linhas equilibrando o comprimento de cada uma
    const groupInto = (k) => {
      if (k <= 1) return [fields.join(SEP)];
      if (k >= fields.length) return fields.slice();
      const len = (f) => f.length + 3;
      const per = fields.reduce((s, f) => s + len(f), 0) / k;
      const out = [], cur = []; let acc = 0;
      for (let i = 0; i < fields.length; i++) {
        cur.push(fields[i]); acc += len(fields[i]);
        if (out.length < k - 1 && acc >= per && fields.length - i - 1 > k - out.length - 1) { out.push(cur.join(SEP)); cur.length = 0; acc = 0; }
      }
      if (cur.length) out.push(cur.join(SEP));
      return out;
    };
    const measure = (arr, size) => {
      ctx.font = `600 ${size}px ui-monospace, monospace`;
      const pad = size * 0.6;
      return { bw: Math.max(...arr.map((l) => ctx.measureText(l).width)) + pad * 2, bh: arr.length * size * 1.3 + pad, pad };
    };
    const cap = Math.pow(W * H, 0.25) * 0.85; // teto da fonte: evita a caixa dominar telas grandes
    // maior fonte que cabe (≤ 90% do canvas) por candidato de nº de linhas, limitada ao teto
    const cands = (o.infoInline ? [1] : [5, 4, 3, 2, 1]).map((k) => {
      const arr = groupInto(k);
      const m = measure(arr, 100);
      return { arr, fs: Math.min(cap, 100 * Math.min((W * 0.9) / m.bw, (H * 0.9) / m.bh)) };
    });
    const maxFs = Math.max(...cands.map((c) => c.fs));
    const aspect = H / W;
    // entre os que empatam na maior fonte, escolhe a caixa de proporção mais parecida com a tela
    const best = cands
      .filter((c) => c.fs >= maxFs * 0.98)
      .map((c) => { const m = measure(c.arr, c.fs); return { arr: c.arr, fs: c.fs, m, d: Math.abs(Math.log(m.bh / m.bw / aspect)) }; })
      .sort((a, b) => a.d - b.d)[0];
    const lines = best.arr, fs = best.fs, b = best.m;
    ctx.font = `600 ${fs}px ui-monospace, monospace`;
    const center = o.infoPos === "centro";
    const top = o.infoPos.startsWith("sup"), left = o.infoPos.endsWith("esq");
    const bx = center ? (W - b.bw) / 2 : left ? b.pad : W - b.bw - b.pad;
    const by = center ? (H - b.bh) / 2 : top ? b.pad : H - b.bh - b.pad;
    ctx.fillStyle = "rgba(0,0,0,0.72)"; ctx.fillRect(bx, by, b.bw, b.bh);
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, bx + b.pad, by + b.pad / 2 + i * fs * 1.3));
  }
}

export default function ProjectTestCard({ project }) {
  const { tcPresets, setTcPresets, prefs } = useLedLabContext();
  const isMobile = useIsMobile();
  const { palette } = useCablePalette();
  const [controlsOpen, setControlsOpen] = useState(!isMobile); // no mobile começa fechado
  useEffect(() => setControlsOpen(!isMobile), [isMobile]);
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
  useEffect(() => { if (tela && canvasRef.current) draw(canvasRef.current, tela, o, mapPorts, palette); });

  if (!tela) return <Placeholder icon={Monitor} title="Sem telas" description="Adicione uma tela na aba Dados para gerar o test card." />;

  const g = tela.gabinete || {};
  const W = (tela.cols || 1) * (parseFloat(g.resX) || 0), H = (tela.rows || 1) * (parseFloat(g.resY) || 0);
  const set = (patch) => setO((prev) => ({ ...prev, ...patch }));
  const toggle = (k) => setO((prev) => ({ ...prev, [k]: !prev[k] }));
  const locked = o.scheme === "cinza";
  const elCount = [o.numbers, o.junctions, o.circle, o.cross, o.corner, o.side].filter(Boolean).length;

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
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Select value={telaId} onChange={(e) => setTelaId(e.target.value)} style={{ ...sel, flex: "2 1 130px", minWidth: 0 }}>
          {telas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </Select>
        <Select value={presetSel} onChange={(e) => applyPreset(e.target.value)} style={{ ...sel, flex: "2 1 150px", minWidth: 0 }}>
          <option value="">Predefinição…</option>
          <option value="map">Mapa de gabinetes</option>
          <option value="align">Alinhamento / geometria</option>
          <option value="solid">Cor sólida</option>
          <option value="bars">Barras de cor</option>
          <option value="cabsig">Mapa de cabos (sinal)</option>
          {tcPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        <button style={tbBtn} title="Salvar predefinição" onClick={savePreset}><Save size={16} /></button>
        <button style={{ ...tbBtn, background: T.acc, borderColor: T.acc, color: "#fff" }} title={`Exportar PNG (${W}×${H})`} onClick={exportPng}><Download size={16} />{!isMobile && " PNG"}</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "250px 1fr", gap: 16, alignItems: "start" }} className="m-grid1">
        <div style={card({ padding: isMobile ? "4px 14px 10px" : "4px 16px" })}>
          {isMobile && (
            <button onClick={() => setControlsOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "6px 2px", background: "transparent", border: "none", color: T.txt, cursor: "pointer", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
              Controles
              {controlsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
          {(!isMobile || controlsOpen) && (isMobile ? (
            /* MOBILE: controles pareados em linhas compactas (rótulo em cima, controle embaixo) */
            <>
              <GroupRow top>
                <Cell label="Esquema de cor" flex="1 1 130px">
                  <Select value={o.scheme} onChange={(e) => set({ scheme: e.target.value })} style={cellSel}>
                    <option value="cores">Cores</option><option value="arcoiris">Arco-íris</option><option value="cinza">Escala de cinza</option><option value="solida">Sólida</option>
                  </Select>
                </Cell>
                {o.scheme === "arcoiris" && (
                  <Cell label="Direção" flex="1 1 110px">
                    <Select value={o.rainbowDir} onChange={(e) => set({ rainbowDir: e.target.value })} style={cellSel}>
                      <option value="h">Horizontal</option><option value="v">Vertical</option><option value="d">Diagonal</option>
                    </Select>
                  </Cell>
                )}
                {o.scheme === "solida" && (
                  <>
                    <Cell label="Cor sólida" flex="0 0 auto"><input type="color" value={o.solidColor} onChange={(e) => set({ solidColor: e.target.value })} style={{ width: 48, height: 34, background: "none", border: `1px solid ${T.bd}`, borderRadius: 8, cursor: "pointer", padding: 0 }} /></Cell>
                    <Cell label="Transparente" flex="0 0 auto"><Switch on={o.solidAlpha} onClick={() => toggle("solidAlpha")} /></Cell>
                  </>
                )}
              </GroupRow>
              {locked ? (
                <div style={{ margin: "10px 0", color: T.dim, fontSize: 12, background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 10 }}>
                  Predefinição de calibração (preto→branco por coluna). Sem edições.
                </div>
              ) : (
                <>
                  <GroupRow>
                    <Cell label="Elementos" flex="1 1 130px">
                      <DropdownMenu triggerLabel={`${elCount} ativo${elCount === 1 ? "" : "s"}`} Icon={Shapes} align="left"
                        items={[["numbers", "Numerar gabinetes"], ["junctions", "Junções"], ["circle", "Círculo"], ["cross", "Cruz"], ["corner", "Círc. cantos"], ["side", "Semicírc. laterais"]].map(([k, l]) => ({ label: l, active: o[k], onClick: () => toggle(k) }))} />
                    </Cell>
                    <Cell label="Tamanho do nº" flex="1 1 150px"><NumScaleInline value={o.numScale} onChange={(n) => set({ numScale: n })} /></Cell>
                  </GroupRow>
                  <GroupRow>
                    <Cell label="Color bar" flex="1 1 140px">
                      <Select value={o.colorBar} onChange={(e) => set({ colorBar: e.target.value })} style={cellSel}>
                        <option value="off">Off</option><option value="topo">Topo</option><option value="centro">Centro</option><option value="base">Base</option>
                      </Select>
                    </Cell>
                    <Cell label="Mapa de cabos" flex="1 1 140px">
                      <Select value={o.cableMap} onChange={(e) => set({ cableMap: e.target.value })} style={cellSel}>
                        <option value="off">Off</option><option value="sinal">Sinal</option><option value="ac">AC</option>
                      </Select>
                    </Cell>
                  </GroupRow>
                  <GroupRow>
                    <Cell label="Caixa de info" flex="0 0 auto"><Switch on={o.info} onClick={() => toggle("info")} /></Cell>
                    {o.info && <Cell label="Info em linha" flex="0 0 auto"><Switch on={o.infoInline} onClick={() => toggle("infoInline")} /></Cell>}
                    {o.info && (
                      <Cell label="Posição" flex="1 1 130px">
                        <Select value={o.infoPos} onChange={(e) => set({ infoPos: e.target.value })} style={cellSel}>
                          <option value="sup-esq">Sup. esq</option><option value="sup-dir">Sup. dir</option><option value="centro">Centro</option><option value="inf-esq">Inf. esq</option><option value="inf-dir">Inf. dir</option>
                        </Select>
                      </Cell>
                    )}
                  </GroupRow>
                </>
              )}
            </>
          ) : (
            /* DESKTOP: lista linear (rótulo à esquerda, controle à direita) */
            <>
              <Row label="Esquema de cor" top>
                <Select value={o.scheme} onChange={(e) => set({ scheme: e.target.value })} style={rsel}>
                  <option value="cores">Cores</option><option value="arcoiris">Arco-íris</option><option value="cinza">Escala de cinza</option><option value="solida">Sólida</option>
                </Select>
              </Row>
              {o.scheme === "arcoiris" && (
                <Row label="Direção">
                  <Select value={o.rainbowDir} onChange={(e) => set({ rainbowDir: e.target.value })} style={rsel}>
                    <option value="h">Horizontal</option><option value="v">Vertical</option><option value="d">Diagonal</option>
                  </Select>
                </Row>
              )}
              {o.scheme === "solida" && (
                <>
                  <Row label="Cor sólida"><input type="color" value={o.solidColor} onChange={(e) => set({ solidColor: e.target.value })} style={{ width: 44, height: 30, background: "none", border: `1px solid ${T.bd}`, borderRadius: 8, cursor: "pointer", padding: 0 }} /></Row>
                  <Row label="Fundo transparente"><Switch on={o.solidAlpha} onClick={() => toggle("solidAlpha")} /></Row>
                </>
              )}
              {locked ? (
                <div style={{ margin: "10px 0", color: T.dim, fontSize: 12, background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 10 }}>
                  Predefinição de calibração (preto→branco por coluna). Sem edições.
                </div>
              ) : (
                <>
                  <Row label="Elementos">
                    <DropdownMenu triggerLabel={`${elCount} ativo${elCount === 1 ? "" : "s"}`} Icon={Shapes} align="right"
                      items={[["numbers", "Numerar gabinetes"], ["junctions", "Junções"], ["circle", "Círculo"], ["cross", "Cruz"], ["corner", "Círc. cantos"], ["side", "Semicírc. laterais"]].map(([k, l]) => ({ label: l, active: o[k], onClick: () => toggle(k) }))} />
                  </Row>
                  <NumScaleRow value={o.numScale} onChange={(n) => set({ numScale: n })} />
                  <Row label="Color bar">
                    <Select value={o.colorBar} onChange={(e) => set({ colorBar: e.target.value })} style={rsel}>
                      <option value="off">Off</option><option value="topo">Topo</option><option value="centro">Centro</option><option value="base">Base</option>
                    </Select>
                  </Row>
                  <Row label="Mapa de cabos">
                    <Select value={o.cableMap} onChange={(e) => set({ cableMap: e.target.value })} style={rsel}>
                      <option value="off">Off</option><option value="sinal">Sinal</option><option value="ac">AC</option>
                    </Select>
                  </Row>
                  <Row label="Caixa de info"><Switch on={o.info} onClick={() => toggle("info")} /></Row>
                  {o.info && (
                    <>
                      <Row label="Info em linha"><Switch on={o.infoInline} onClick={() => toggle("infoInline")} /></Row>
                      <Row label="Posição">
                        <Select value={o.infoPos} onChange={(e) => set({ infoPos: e.target.value })} style={rsel}>
                          <option value="sup-esq">Sup. esq</option><option value="sup-dir">Sup. dir</option><option value="centro">Centro</option><option value="inf-esq">Inf. esq</option><option value="inf-dir">Inf. dir</option>
                        </Select>
                      </Row>
                    </>
                  )}
                </>
              )}
            </>
          ))}
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
const tbBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, padding: "0 11px", borderRadius: 8, border: `1px solid ${T.bd}`, background: T.card2, color: T.txt, cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 };
const rsel = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "7px 9px", fontSize: 13, fontWeight: 600, cursor: "pointer", maxWidth: 190 };

// linha de ajuste: rótulo à esquerda, controle à direita (lista consistente, com divisória)
function Row({ label, children, top }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 46, padding: "6px 0", borderTop: top ? "none" : `1px solid ${T.bd}` }}>
      <span style={{ color: T.mut, fontSize: 13 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// interruptor (liga/desliga) — substitui os botões "ON/OFF"
function Switch({ on, onClick }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on}
      style={{ width: 42, height: 24, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: on ? T.acc : T.dim2, position: "relative", transition: "background .15s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

// tamanho do número: linha com slider inline (rótulo · slider · valor)
function NumScaleRow({ value, onChange }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = useDebouncedCallback(onChange, 150);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 46, padding: "6px 0", borderTop: `1px solid ${T.bd}` }}>
      <span style={{ color: T.mut, fontSize: 13, flexShrink: 0 }}>Tamanho do nº</span>
      <input type="range" min={0.5} max={2} step={0.1} value={v} onChange={(e) => { const n = parseFloat(e.target.value); setV(n); commit(n); }} style={{ flex: 1, accentColor: T.acc, minWidth: 60 }} />
      <span style={{ color: T.acM, fontWeight: 700, fontSize: 13, flexShrink: 0, width: 34, textAlign: "right" }}>{v.toFixed(1)}×</span>
    </div>
  );
}

// ---- Mobile: controles agrupados (várias células por linha) ----
const cellSel = { ...rsel, width: "100%", maxWidth: "none" };

// célula compacta: rótulo pequeno em cima, controle embaixo (altura fixa p/ alinhar vizinhos)
function Cell({ label, flex = "1 1 0", children }) {
  return (
    <div style={{ flex, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ minHeight: 34, display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
}

// linha que agrupa várias células lado a lado
function GroupRow({ children, top }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 12, padding: "12px 0", borderTop: top ? "none" : `1px solid ${T.bd}` }}>
      {children}
    </div>
  );
}

// slider + valor inline, sem rótulo (usado dentro de uma Cell)
function NumScaleInline({ value, onChange }) {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  const commit = useDebouncedCallback(onChange, 150);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <input type="range" min={0.5} max={2} step={0.1} value={v} onChange={(e) => { const n = parseFloat(e.target.value); setV(n); commit(n); }} style={{ flex: 1, accentColor: T.acc, minWidth: 40 }} />
      <span style={{ color: T.acM, fontWeight: 700, fontSize: 13, flexShrink: 0, width: 34, textAlign: "right" }}>{v.toFixed(1)}×</span>
    </div>
  );
}
