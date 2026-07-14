// pages/project/ProjectComposicao.jsx — monta várias telas do projeto numa composição
// (tipo mapeamento de slices do Resolume): cada tela vira um bloco do tamanho real em
// pixels, posicionado arrastando (com snap nas bordas) ou por X/Y numérico. O canvas é
// automático (envolve todas as telas) e a exportação gera UM PNG com o test card de cada
// tela na sua posição — ótimo pra telas pequenas (vê todas juntas num render só).
import { useRef, useState, useMemo, useEffect } from "react";
import { Download, LayoutGrid, Move, Copy } from "lucide-react";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useToast } from "../../store/UIContext.jsx";
import { T } from "../../ui/tokens.js";
import { card, btn, label as lbl } from "../../ui/styles.js";
import Placeholder from "../../components/Placeholder.jsx";
import NumField from "../../components/NumField.jsx";
import Select from "../../components/Select.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { cablePorts } from "../../services/cabling.js";
import { draw, DEFAULTS, PRESETS } from "./ProjectTestCard.jsx";
import { fileName } from "../../services/filenames.js";

// resolução real da tela em pixels (mesma regra do draw: gabinete vazio = 128)
const dimOf = (t) => ({
  w: (t.cols || 1) * (parseFloat(t.gabinete?.resX) || 128),
  h: (t.rows || 1) * (parseFloat(t.gabinete?.resY) || 128),
});

// encaixa a borda (v ou v+size) na borda-alvo mais próxima dentro do limiar
const snap = (v, size, targets, thr) => {
  for (const tgt of targets) {
    if (Math.abs(v - tgt) <= thr) return tgt;
    if (Math.abs(v + size - tgt) <= thr) return tgt - size;
  }
  return v;
};

export default function ProjectComposicao({ project, patch }) {
  const telas = useMemo(() => project.telas || [], [project.telas]);
  const comp = project.comp || {};
  const style = comp.style || { scheme: "cores", numbers: true, info: true };
  const isMobile = useIsMobile();
  const { palette } = useCablePalette();
  const { tcPresets, prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const toast = useToast();

  const wrapRef = useRef(null);
  const dragRef = useRef(null); // contexto do arraste ativo (fora do render)
  const [wrapW, setWrapW] = useState(320);
  const [drag, setDrag] = useState(null); // { id, x, y } durante o arraste
  const [sel, setSel] = useState(null); // tela selecionada (frente + destaque)
  const [presetSel, setPresetSel] = useState(""); // predefinição escolhida no seletor

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth));
    ro.observe(el);
    setWrapW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // posições: as salvas + default lado a lado pras telas ainda sem posição
  const positions = useMemo(() => {
    const pos = { ...(comp.pos || {}) };
    let cx = 0;
    for (const t of telas) {
      if (pos[t.id]) cx = Math.max(cx, pos[t.id].x + dimOf(t).w);
      else { pos[t.id] = { x: cx, y: 0 }; cx += dimOf(t).w; }
    }
    return pos;
  }, [telas, comp.pos]);

  const posOf = (t) => (drag && drag.id === t.id ? drag : positions[t.id]);

  // segurança: telas que se SOBREPÕEM (encostar nas bordas não conta) → borda vermelha
  const rectOf = (t) => { const p = posOf(t), d = dimOf(t); return { x: p.x, y: p.y, w: d.w, h: d.h }; };
  const overlapIds = (() => {
    const set = new Set();
    for (let i = 0; i < telas.length; i++) {
      const a = rectOf(telas[i]);
      for (let j = i + 1; j < telas.length; j++) {
        const b = rectOf(telas[j]);
        if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) { set.add(telas[i].id); set.add(telas[j].id); }
      }
    }
    return set;
  })();

  // caixa envolvente (canvas automático)
  const bbox = useMemo(() => {
    if (!telas.length) return { minX: 0, minY: 0, w: 0, h: 0 };
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of telas) {
      const p = positions[t.id], d = dimOf(t);
      minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
      maxX = Math.max(maxX, p.x + d.w); maxY = Math.max(maxY, p.y + d.h);
    }
    return { minX, minY, w: maxX - minX, h: maxY - minY };
  }, [telas, positions]);

  // thumbnails reais (render via draw) — recomputa só quando muda conteúdo/estilo, não a posição
  // portas de cabo por tela — só quando o estilo pede mapa de cabos e a tela tem gabinete
  const portsOf = (t) => (style.cableMap && style.cableMap !== "off" && parseFloat(t.gabinete?.resX) > 0 ? cablePorts(t, style.cableMap, numbering) : null);
  const thumbKey = telas.map((t) => `${t.id}:${t.cols}x${t.rows}:${parseFloat(t.gabinete?.resX) || 128}x${parseFloat(t.gabinete?.resY) || 128}:${t.nome}`).join("|") + JSON.stringify(style) + numbering;
  const thumbs = useMemo(() => {
    const map = {};
    for (const t of telas) {
      const c = document.createElement("canvas");
      draw(c, t, { ...DEFAULTS, ...style }, portsOf(t), palette);
      map[t.id] = c.toDataURL();
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thumbKey, palette]);

  if (!telas.length) return <Placeholder icon={LayoutGrid} title="Sem telas" description="Adicione telas na aba Dados para montar a composição." />;

  const maxH = isMobile ? 340 : 460;
  const scale = bbox.w && bbox.h ? Math.min(wrapW / bbox.w, maxH / bbox.h) : 1;

  const setPos = (id, x, y) => patch({ comp: { ...comp, pos: { ...positions, [id]: { x: Math.round(x), y: Math.round(y) } } } });
  const setStyle = (partial) => patch({ comp: { ...comp, style: { ...style, ...partial } } });
  const applyPreset = (val) => {
    setPresetSel(val);
    if (!val) return;
    const opts = PRESETS[val] || tcPresets.find((p) => p.id === val)?.opts;
    if (opts) setStyle(opts);
  };

  const dragAt = (c, ev) => ({
    x: snap(c.ox + (ev.clientX - c.startX) / scale, c.d.w, c.xs, c.thr),
    y: snap(c.oy + (ev.clientY - c.startY) / scale, c.d.h, c.ys, c.thr),
  });
  const onDown = (e, t) => {
    e.preventDefault();
    setSel(t.id);
    e.currentTarget.setPointerCapture(e.pointerId); // garante move/up no próprio bloco
    const p = positions[t.id], d = dimOf(t);
    const others = telas.filter((x) => x.id !== t.id).map((x) => ({ p: positions[x.id], d: dimOf(x) }));
    dragRef.current = {
      id: t.id, startX: e.clientX, startY: e.clientY, ox: p.x, oy: p.y, d,
      xs: [0, ...others.flatMap((o) => [o.p.x, o.p.x + o.d.w])],
      ys: [0, ...others.flatMap((o) => [o.p.y, o.p.y + o.d.h])],
      thr: 9 / scale, // ~9px de tela → px de composição
    };
  };
  const onMove = (e) => { const c = dragRef.current; if (c) setDrag({ id: c.id, ...dragAt(c, e) }); };
  const onUp = (e) => {
    const c = dragRef.current; if (!c) return;
    const f = dragAt(c, e);
    dragRef.current = null;
    setDrag(null);
    setPos(c.id, f.x, f.y);
  };

  // dispõe todas lado a lado (linha), encostadas
  const tile = () => {
    let cx = 0; const pos = {};
    for (const t of telas) { pos[t.id] = { x: cx, y: 0 }; cx += dimOf(t).w; }
    patch({ comp: { ...comp, pos } });
    toast("Telas dispostas lado a lado");
  };

  const exportPng = () => {
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bbox.w)); c.height = Math.max(1, Math.round(bbox.h));
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
    for (const t of telas) {
      const p = positions[t.id];
      const oc = document.createElement("canvas");
      draw(oc, t, { ...DEFAULTS, ...style }, portsOf(t), palette);
      ctx.drawImage(oc, Math.round(p.x - bbox.minX), Math.round(p.y - bbox.minY));
    }
    c.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName([project.name, "composicao"], "png");
      a.click();
    }, "image/png");
    toast("Composição exportada (PNG)");
  };

  // copia as regiões (posição e tamanho de cada tela no canvas da composição)
  const copyRegions = () => {
    const lines = [`Composição ${project.name || ""} — canvas ${Math.round(bbox.w)}×${Math.round(bbox.h)} px`.trim()];
    for (const t of telas) {
      const p = positions[t.id], d = dimOf(t);
      lines.push(`${t.nome}: x ${Math.round(p.x - bbox.minX)} · y ${Math.round(p.y - bbox.minY)} · ${d.w}×${d.h}`);
    }
    const text = lines.join("\n");
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(text).then(() => toast("Regiões copiadas")).catch(() => toast("Não foi possível copiar"));
    else toast("Copiar indisponível neste navegador");
  };

  const styleBtn = (on) => ({ ...btn(on ? "primary" : "ghost", { padding: "7px 12px", fontSize: 13 }) });

  return (
    <div>
      {/* controles: estilo do test card + ações */}
      <div style={card({ marginBottom: 14, padding: 12 })}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Select value={presetSel} onChange={(e) => applyPreset(e.target.value)} title="Predefinição" style={{ ...selSty, flex: "1 1 160px" }}>
            <option value="">Predefinição…</option>
            <option value="map">Mapa de gabinetes</option>
            <option value="align">Alinhamento / geometria</option>
            <option value="solid">Cor sólida</option>
            <option value="bars">Barras de cor</option>
            <option value="cabsig">Mapa de cabos (sinal)</option>
            {tcPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </Select>
          <Select value={style.scheme} onChange={(e) => setStyle({ scheme: e.target.value })} title="Padrão" style={{ ...selSty, flex: "1 1 140px" }}>
            <option value="cores">Cores (blocos)</option>
            <option value="arcoiris">Arco-íris</option>
            <option value="cinza">Escala de cinza</option>
            <option value="solida">Cor sólida</option>
          </Select>
          <button style={styleBtn(style.numbers)} onClick={() => setStyle({ numbers: !style.numbers })}>Números</button>
          <button style={styleBtn(style.info)} onClick={() => setStyle({ info: !style.info })}>Info</button>
          <div style={{ flex: 1 }} />
          <button style={btn("ghost", { padding: "7px 12px", fontSize: 13 })} onClick={tile}><LayoutGrid size={15} /> Lado a lado</button>
          <button style={btn("primary", { padding: "7px 12px", fontSize: 13 })} onClick={exportPng}><Download size={15} /> Exportar PNG</button>
        </div>
        <div style={{ color: T.dim, fontSize: 12, marginTop: 8, display: "flex", alignItems: "center", gap: 6 }}>
          <Move size={13} /> Arraste as telas pra posicionar (encaixam nas bordas). Canvas: <b style={{ color: T.mut }}>{Math.round(bbox.w)}×{Math.round(bbox.h)} px</b>
          {overlapIds.size > 0 && <span style={{ color: T.red, fontWeight: 700, marginLeft: 6 }}>⚠ telas sobrepostas</span>}
        </div>
      </div>

      {/* palco: canvas escalado com os blocos arrastáveis */}
      <div ref={wrapRef} style={{ ...card({ padding: 0 }), overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", minHeight: 120, background: T.bg, backgroundImage: `linear-gradient(${T.bd} 1px, transparent 1px), linear-gradient(90deg, ${T.bd} 1px, transparent 1px)`, backgroundSize: "24px 24px" }}>
        <div style={{ position: "relative", width: Math.max(1, bbox.w * scale), height: Math.max(1, bbox.h * scale), margin: 16 }}>
          {telas.map((t) => {
            const p = posOf(t), d = dimOf(t);
            const selected = sel === t.id;
            const over = overlapIds.has(t.id);
            return (
              <div
                key={t.id}
                onPointerDown={(e) => onDown(e, t)}
                onPointerMove={onMove}
                onPointerUp={onUp}
                title={t.nome}
                style={{
                  position: "absolute",
                  left: (p.x - bbox.minX) * scale,
                  top: (p.y - bbox.minY) * scale,
                  width: d.w * scale,
                  height: d.h * scale,
                  backgroundImage: `url(${thumbs[t.id]})`,
                  backgroundSize: "100% 100%",
                  border: `2px solid ${over ? T.red : selected ? T.acc : "rgba(255,255,255,0.35)"}`,
                  boxShadow: over ? `0 0 0 2px ${T.red}66` : selected ? `0 0 0 2px ${T.acc}55` : "none",
                  cursor: "move",
                  touchAction: "none",
                  zIndex: selected ? 2 : 1,
                  boxSizing: "border-box",
                }}
              >
                <span style={{ position: "absolute", top: 0, left: 0, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 10, padding: "1px 4px", borderBottomRightRadius: 4, pointerEvents: "none", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.nome}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* posição das telas */}
      <div style={card({ marginTop: 14, padding: 12 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={lbl}>Posição das telas</div>
          <button onClick={copyRegions} style={btn("ghost", { padding: "6px 11px", fontSize: 12.5 })}><Copy size={14} /> Copiar regiões</button>
        </div>
        <div style={{ color: T.dim, fontSize: 12, marginBottom: 10 }}>Canvas de fonte <b style={{ color: T.mut }}>{Math.round(bbox.w)}×{Math.round(bbox.h)} px</b>. Cada tela é uma região (x · y · largura × altura) pra usar no processador/media server.</div>
        <div style={{ display: "grid", gap: 8 }}>
          {telas.map((t) => {
            const p = positions[t.id], d = dimOf(t);
            return (
              <div key={t.id} onPointerDown={() => setSel(t.id)} style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "6px 8px", borderRadius: 8, background: sel === t.id ? T.sel : "transparent", border: `1px solid ${sel === t.id ? T.bdA : T.bd}` }}>
                <span style={{ flex: "1 1 110px", minWidth: 0, color: T.txt, fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.nome} <span style={{ color: T.dim, fontWeight: 400, fontFamily: "ui-monospace,monospace", fontSize: 12 }}>{d.w}×{d.h}</span>
                </span>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 5, color: T.mut, fontSize: 12 }}>X<NumField value={p.x} onChange={(n) => setPos(t.id, n, p.y)} style={{ ...numSty }} /></label>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 5, color: T.mut, fontSize: 12 }}>Y<NumField value={p.y} onChange={(n) => setPos(t.id, p.x, n)} style={{ ...numSty }} /></label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const selSty = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 14, fontWeight: 600 };
const numSty = { width: 74, background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "7px 9px", fontSize: 16, fontFamily: "ui-monospace, monospace" };
