// pages/project/ScreenSignal.jsx — cabeamento de SINAL por Screen.
//
// Você escolhe uma Screen (montada na aba Screens) e cabeia: AUTO (o app sugere,
// serpentina por modelo cortada em portas) ou LIVRE (você desenha cada cabo — é
// aqui que se faz a gambiarra dos 18 gab numa porta). Não dá pra ter um automático
// perfeito pra todo evento, então o livre é first-class. Numeração 1..N por Screen.
import { useState, useRef, useEffect, useCallback } from "react";
import { Layers, Plus, X, Download, Repeat2, Undo2, Eraser, ZoomIn, ZoomOut, Maximize } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { card, btn } from "../../ui/styles.js";
import Select from "../../components/Select.jsx";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useConfirm, useToast } from "../../store/UIContext.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { genId } from "../../services/ids.js";
import { fileName } from "../../services/filenames.js";
import { oneScreenPerTela, screenTelas } from "../../services/screens.js";
import { screenPorts, screenPortSummary, screenCells, cellPortIndex, assignCell, autoAsCables, unassignedCount, projectPixelMapCSV } from "../../services/screenCabling.js";

const key = (c) => `${c.telaId}:${c.c},${c.r}`;
const zb = { width: 34, height: 34, borderRadius: 8, background: T.card, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };
const ibtn = (extra = {}) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.bd}`, background: T.card2, color: T.txt, cursor: "pointer", ...extra });
const sep = { width: 1, height: 22, background: T.bd, margin: "0 2px" };

export default function ScreenSignal({ project, patch }) {
  const telas = project.telas || [];
  const screens = project.screens || [];
  const { colorOf } = useCablePalette();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const toast = useToast();
  const { prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";

  const [activeId, setActiveId] = useState(screens[0]?.id || null);
  const [activeCable, setActiveCable] = useState(null); // cabo em edição (modo livre)
  const [history, setHistory] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const stageRef = useRef(null);
  const drag = useRef(null);

  const active = screens.find((s) => s.id === activeId) || screens[0];
  const sinal = active?.sinal || { mode: "auto" };
  const mode = sinal.mode === "livre" ? "livre" : "auto";
  const bbox = active ? bboxOf(active, telas) : { w: 0, h: 0 };

  const fit = useCallback(() => {
    const el = stageRef.current; if (!el || !bbox.w) return;
    const z = Math.min(el.clientWidth / bbox.w, el.clientHeight / bbox.h) * 0.92 || 1;
    setZoom(z); setPan({ x: (el.clientWidth - bbox.w * z) / 2, y: (el.clientHeight - bbox.h * z) / 2 });
  }, [bbox.w, bbox.h]);
  const [prevId, setPrevId] = useState(activeId);
  if (prevId !== activeId) { setPrevId(activeId); setActiveCable(null); setHistory([]); }
  useEffect(() => { fit(); }, [fit, activeId]);

  const onWheel = (e) => {
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top, f = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(6, Math.max(0.05, z * f)));
    setPan((p) => ({ x: mx - (mx - p.x) * f, y: my - (my - p.y) * f }));
  };
  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }; setGrabbing(true); };
  const onMove = (e) => { if (drag.current) { drag.current.moved = true; setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); } };
  const onUp = () => { drag.current = null; setGrabbing(false); };
  const onTouchStart = (e) => { const t = e.touches[0]; if (t) { drag.current = { x: t.clientX, y: t.clientY, px: pan.x, py: pan.y, moved: false }; setGrabbing(true); } };
  const onTouchMove = (e) => { const t = e.touches[0]; if (!drag.current || !t) return; drag.current.moved = true; setPan({ x: drag.current.px + (t.clientX - drag.current.x), y: drag.current.py + (t.clientY - drag.current.y) }); };
  const zoomBy = (f) => { const el = stageRef.current, cw = el.clientWidth / 2, ch = el.clientHeight / 2; setZoom((z) => Math.min(6, Math.max(0.05, z * f))); setPan((p) => ({ x: cw - (cw - p.x) * f, y: ch - (ch - p.y) * f })); };

  if (!telas.length) return <Placeholderish text="Adicione telas na aba Dados para cabear o sinal." />;
  if (!screens.length) {
    return (
      <div style={card({ textAlign: "center", padding: "28px 20px" })}>
        <Layers size={28} color={T.acM} style={{ marginBottom: 8 }} />
        <div style={{ color: T.txt, fontWeight: 600, marginBottom: 6 }}>Nenhuma Screen pra cabear</div>
        <p style={{ color: T.mut, fontSize: 13, maxWidth: 420, margin: "0 auto 14px", lineHeight: 1.5 }}>
          O sinal é cabeado por Screen. Monte as Screens na aba <b style={{ color: T.txt }}>Screens</b> — ou crie uma por tela pra começar.
        </p>
        <button style={btn("ghost")} onClick={() => patch({ screens: oneScreenPerTela(telas, () => genId("screen")) })}>1 Screen por tela</button>
      </div>
    );
  }

  const setScreens = (next) => patch({ screens: next });
  const patchActive = (partial) => setScreens(screens.map((s) => (s.id === active.id ? { ...s, ...partial } : s)));
  const setSinal = (partial) => patchActive({ sinal: { ...sinal, ...partial } });
  const cables = sinal.cables || [];
  const setCables = (next) => { setHistory((h) => [...h.slice(-29), cables]); setSinal({ cables: next }); };
  const undo = () => { if (!history.length) return; setSinal({ cables: history[history.length - 1] }); setHistory(history.slice(0, -1)); };

  const ports = screenPorts(active, telas, numbering);
  const portIdx = cellPortIndex(ports);
  const summary = screenPortSummary(active, telas, numbering);
  const cells = screenCells(active, telas);
  const faltam = mode === "livre" ? unassignedCount(active, telas) : 0;
  const anyOver = summary.some((p) => p.over);
  const status = faltam ? { l: `Faltam ${faltam}`, c: T.amb } : anyOver ? { l: "Alerta", c: T.red } : { l: "OK", c: T.grn };

  const clickCell = (cell) => {
    if (mode !== "livre" || drag.current?.moved) return;
    if (activeCable == null || activeCable >= cables.length) return;
    setCables(assignCell(cables, activeCable, cell));
  };
  const goLivre = () => setSinal({ mode: "livre", cables: cables.length ? cables : [] });
  const goAuto = () => setSinal({ mode: "auto" });
  const importAuto = () => { setCables(autoAsCables(active, telas, numbering)); setActiveCable(null); };
  const novoCabo = () => { setActiveCable(cables.length); setCables([...cables, []]); };
  const removerCabo = (i) => { setCables(cables.filter((_, j) => j !== i)); setActiveCable(null); };
  const inverter = () => { if (cables[activeCable]?.length) setCables(cables.map((c, i) => (i === activeCable ? [...c].reverse() : c))); };
  const limpar = async () => { if (await confirm({ title: "Limpar cabeamento?", message: `Todos os cabos livres de ${active.nome} serão removidos.` })) { setCables([]); setActiveCable(null); } };
  // mapa de pixels desta Screen (X/Y na coordenada da Screen) — o que se digita no NovaLCT
  const exportCSV = () => {
    const csv = projectPixelMapCSV(project, numbering, active.id);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }); // BOM: Excel abre acento certo
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName([project.name, active.nome, "mapa-pixels"], "csv");
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Mapa de pixels: ${ports.length} portas, coordenada da Screen.`);
  };

  const R = (v) => v * zoom; // helper visual

  return (
    <div>
      {/* abas de Screen */}
      <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", alignItems: "center", marginBottom: 12 }}>
        {screens.map((s) => {
          const on = s.id === active.id;
          return (
            <button key={s.id} onClick={() => setActiveId(s.id)} style={{ flexShrink: 0, padding: "6px 12px", borderRadius: 8, cursor: "pointer", background: on ? T.sel : T.card2, border: `1px solid ${on ? T.acc : T.bd}`, color: on ? T.txt : T.mut, fontWeight: 600, fontSize: 13 }}>
              {s.nome} <span style={{ color: T.dim, fontWeight: 400 }}>· {(s.telaIds || []).length}</span>
            </button>
          );
        })}
      </div>

      {!screenTelas(active, telas).length ? (
        <div style={card({ color: T.dim, fontSize: 13, textAlign: "center", padding: "24px" })}>
          <b style={{ color: T.mut }}>{active.nome}</b> está sem telas. Adicione telas a ela na aba Screens.
        </div>
      ) : (
        <>
          <div style={card({ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: mode === "livre" ? 8 : 16 })}>
            <div style={{ display: "flex", gap: 4 }}>
              {[["auto", "Automático"], ["livre", "Livre"]].map(([v, l]) => {
                const on = mode === v;
                return <button key={v} onClick={() => (v === "livre" ? goLivre() : goAuto())} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${on ? T.acc : T.bd}`, background: on ? T.acc : T.card2, color: on ? "#fff" : T.mut }}>{l}</button>;
              })}
            </div>
            {mode === "auto" && <>
              <Drop label="Sentido" options={[["updown", "Sobe/desce"], ["zigzag", "Zig-zag"]]} value={sinal.routing || "updown"} onChange={(v) => setSinal({ routing: v })} />
              <Drop label="Início" title="Canto onde a corrente começa — case com a montagem física" options={[["bl", "Inf-esq"], ["br", "Inf-dir"], ["tl", "Sup-esq"], ["tr", "Sup-dir"]]} value={sinal.corner || "bl"} onChange={(v) => setSinal({ corner: v })} />
            </>}
            <span style={{ marginLeft: "auto", background: status.c + "22", color: status.c, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{status.l}</span>
          </div>

          {mode === "livre" && (
            <div style={card({ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 })}>
              <button onClick={importAuto} style={{ ...ibtn(), width: "auto", padding: "0 12px", gap: 6, fontSize: 13 }} title="Começa dos cabos que o automático sugere e edita"><Download size={15} /> Importar do auto</button>
              <span style={sep} />
              <button onClick={novoCabo} style={ibtn()} title="Novo cabo"><Plus size={16} /></button>
              <button onClick={inverter} style={ibtn()} title="Inverter início/fim do cabo"><Repeat2 size={15} /></button>
              <button onClick={() => setActiveCable(null)} disabled={activeCable == null} style={ibtn({ opacity: activeCable == null ? 0.4 : 1, cursor: activeCable == null ? "not-allowed" : "pointer" })} title="Sair da edição"><X size={15} /></button>
              <span style={sep} />
              <button onClick={undo} disabled={!history.length} style={ibtn({ opacity: history.length ? 1 : 0.4, cursor: history.length ? "pointer" : "not-allowed" })} title="Desfazer"><Undo2 size={15} /></button>
              <button onClick={limpar} style={ibtn()} title="Limpar cabos"><Eraser size={15} /></button>
              <span style={{ marginLeft: "auto", color: T.dim, fontSize: 12 }}>
                {activeCable != null ? <>Editando <b style={{ color: colorOf(activeCable) }}>Porta {activeCable + 1}</b> · clique nos gabinetes</> : cables.length ? "Selecione uma porta na legenda" : "Importe do auto ou clique “Novo cabo”"}
              </span>
            </div>
          )}

          <div style={card({ padding: 0, overflow: "hidden" })}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>{active.nome} · Sinal</div>
                <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>
                  {bbox.w.toLocaleString("pt-BR")} × {bbox.h.toLocaleString("pt-BR")} px · {ports.length} {ports.length === 1 ? "porta" : "portas"} · a corrente atravessa as telas do mesmo modelo
                </div>
              </div>
              <button onClick={exportCSV} title="Baixa o mapa de pixels desta Screen (gabinete → porta → X/Y) em CSV pro NovaLCT / Tessera"
                style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, borderRadius: 8, padding: "7px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                <Download size={14} /> Mapa de pixels
              </button>
            </div>

            <div ref={stageRef} onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onUp}
              style={{ position: "relative", height: isMobile ? 360 : 460, background: "#08080f", overflow: "hidden", cursor: grabbing ? "grabbing" : "grab", touchAction: "none" }}>
              <svg width="100%" height="100%" style={{ display: "block" }}>
                <g transform={`translate(${pan.x},${pan.y})`}>
                  {cells.map((cell) => {
                    const pi = portIdx[key(cell)];
                    const isAct = mode === "livre" && pi === activeCable;
                    const col = pi === undefined ? T.dim2 : colorOf(pi);
                    return <rect key={key(cell)} x={R(cell.x) + 2} y={R(cell.y) + 2} width={R(cell.w) - 4} height={R(cell.h) - 4} rx={3}
                      fill={pi === undefined ? "transparent" : col + (isAct ? "45" : "26")} stroke={col} strokeWidth={isAct ? 2.5 : 1.2} strokeDasharray={pi === undefined ? "4 4" : undefined}
                      onClick={() => clickCell(cell)} style={{ cursor: mode === "livre" ? "pointer" : "inherit" }} />;
                  })}
                  {ports.map((port, pi) => {
                    if (!port.length) return null;
                    const pts = port.map((c) => `${R(c.x + c.w / 2)},${R(c.y + c.h / 2)}`).join(" ");
                    const f = port[0];
                    const rad = Math.max(9, Math.min(16, R(Math.min(f.w, f.h)) * 0.3));
                    return (
                      <g key={pi} style={{ pointerEvents: "none" }}>
                        <polyline points={pts} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" opacity={mode === "livre" && activeCable != null && pi !== activeCable ? 0.5 : 0.92} />
                        <circle cx={R(f.x + f.w / 2)} cy={R(f.y + f.h / 2)} r={rad} fill={colorOf(pi)} stroke="#fff" strokeWidth={1.6} />
                        <text x={R(f.x + f.w / 2)} y={R(f.y + f.h / 2)} fill="#fff" fontSize={rad * 1.05} fontWeight="700" textAnchor="middle" dominantBaseline="central">{pi + 1}</text>
                      </g>
                    );
                  })}
                </g>
              </svg>
              <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
                <button title="Aumentar" onClick={() => zoomBy(1.2)} style={zb}><ZoomIn size={16} /></button>
                <button title="Enquadrar" onClick={fit} style={zb}><Maximize size={16} /></button>
                <button title="Diminuir" onClick={() => zoomBy(0.8)} style={zb}><ZoomOut size={16} /></button>
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 14, borderTop: `1px solid ${T.bd}` }}>
              {summary.map((p, i) => {
                const isAct = mode === "livre" && i === activeCable;
                return (
                  <div key={i} onClick={mode === "livre" ? () => setActiveCable(activeCable === i ? null : i) : undefined}
                    style={{ display: "flex", alignItems: "center", gap: 8, background: isAct ? T.sel : T.card2, border: `1px solid ${p.over ? T.red : isAct ? T.acc : T.bd}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: mode === "livre" ? "pointer" : "default" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: colorOf(i), flexShrink: 0 }} />
                    <span style={{ color: T.txt, fontWeight: 600 }}>Porta {p.n}</span>
                    <span style={{ color: p.over ? T.red : T.mut }}>{p.pct}%</span>
                    <span style={{ color: T.dim }}>· {p.count} gab{p.cruza ? ` · ${p.telas.join(" → ")}` : ""}</span>
                    {mode === "livre" && <X size={13} color={T.dim} onClick={(e) => { e.stopPropagation(); removerCabo(i); }} style={{ cursor: "pointer" }} />}
                  </div>
                );
              })}
              {mode === "livre" && <button onClick={novoCabo} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px dashed ${T.bd}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, color: T.mut, cursor: "pointer" }}><Plus size={13} /> Novo cabo</button>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function bboxOf(screen, telas) {
  let w = 0, h = 0;
  for (const cell of screenCells(screen, telas)) { w = Math.max(w, cell.x + cell.w); h = Math.max(h, cell.y + cell.h); }
  return { w, h };
}

function Placeholderish({ text }) {
  return <div style={card({ color: T.dim, fontSize: 13, textAlign: "center", padding: 24 })}>{text}</div>;
}

const dropSel = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "7px 9px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
function Drop({ label, options, value, onChange, title }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, textTransform: "uppercase", color: T.mut, fontWeight: 600 }} title={title}>
      {label}
      <Select value={String(value)} title={title || label} onChange={(e) => { const o = options.find(([v]) => String(v) === e.target.value); onChange(o ? o[0] : e.target.value); }} style={dropSel}>
        {options.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
      </Select>
    </span>
  );
}
