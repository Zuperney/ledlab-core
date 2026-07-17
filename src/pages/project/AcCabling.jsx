// pages/project/AcCabling.jsx — cabeamento de ENERGIA (AC) por tela, num canvas com
// zoom/pan/fit. Circuito elétrico segue o FÍSICO, e a tela é um bloco físico — por
// isso o AC continua por tela (não sobe pra Screen, como o sinal).
//
// Estratégias: Linha/Coluna/Área (blocos retangulares), "Atrelar sinal" (segue a rota
// do sinal da tela, em segmentos de carga balanceada) ou Livre (o técnico desenha).
import { useState, useRef, useEffect, useCallback } from "react";
import { Monitor, Eraser, ZoomIn, ZoomOut, Maximize, Plus, X, Download, Repeat2, Undo2, ArrowUpDown, ArrowLeftRight, ChevronDown, ChevronUp, TriangleAlert } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import Select from "../../components/Select.jsx";
import { card } from "../../ui/styles.js";
import { useConfirm } from "../../store/UIContext.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { range, key, parseKey, mkBlock, buildAuto, acRouteFromSignal, cablePorts, cableMeta, portOffset } from "../../services/cabling.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { FLAGS } from "../../config/featureFlags.js";
import Placeholder from "../../components/Placeholder.jsx";
import DropdownMenu from "../../components/DropdownMenu.jsx";

const CELL = 64;
const plural = (n, s) => (n === 1 ? s : `${s}s`);
const CORNER_LABEL = { bl: "inferior-esquerdo", br: "inferior-direito", tl: "superior-esquerdo", tr: "superior-direito" };
const zb = { width: 34, height: 34, borderRadius: 8, background: T.card, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" };

export default function AcCabling({ project, patchTela }) {
  const telas = project.telas || [];
  const [telaId, setTelaId] = useState(telas[0]?.id);
  const [active, setActive] = useState(null);
  const [history, setHistory] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const drag = useRef(null);
  const isMobile = useIsMobile();
  const { colorOf } = useCablePalette();
  const [controlsOpen, setControlsOpen] = useState(!isMobile);
  const [prevMobile, setPrevMobile] = useState(isMobile);
  if (prevMobile !== isMobile) { setPrevMobile(isMobile); setControlsOpen(!isMobile); }

  const tela = telas.find((t) => t.id === telaId) || telas[0];
  const cols = tela?.cols || 1, rows = tela?.rows || 1;
  const panelW = cols * CELL, panelH = rows * CELL;

  const confirm = useConfirm();
  const { prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const cabling = tela?.cabling || {};
  const cfg = cabling.ac || {};
  const strategy = cfg.strategy || "linha";
  const routing = cfg.routing || "updown";
  const corner = cfg.corner || "bl";
  const allowAdvanced = !isMobile || FLAGS.advancedCablingOnMobile;
  const livreEdit = strategy === "livre" && allowAdvanced;
  const cables = cfg.cables || [];
  const offset = portOffset(telas, tela?.id, "ac", numbering); // circuitos 1..N do projeto
  const setCfg = (partial) => patchTela?.(tela.id, { cabling: { ...cabling, ac: { ...cfg, ...partial } } });
  const setStrategy = (v) => setCfg({ strategy: v });
  const setRouting = (v) => setCfg({ routing: v });
  const setCorner = (v) => setCfg({ corner: v });

  const fit = useCallback(() => {
    const el = stageRef.current; if (!el) return;
    const z = Math.min(el.clientWidth / panelW, el.clientHeight / panelH) * 0.9 || 1;
    setZoom(z); setPan({ x: (el.clientWidth - panelW * z) / 2, y: (el.clientHeight - panelH * z) / 2 });
  }, [panelW, panelH]);
  const [prevTelaId, setPrevTelaId] = useState(telaId);
  if (prevTelaId !== telaId) { setPrevTelaId(telaId); setActive(null); setHistory([]); }
  useEffect(() => { fit(); }, [fit, telaId]);

  const onWheel = (e) => {
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top, f = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(6, Math.max(0.1, z * f)));
    setPan((p) => ({ x: mx - (mx - p.x) * f, y: my - (my - p.y) * f }));
  };
  const [grabbing, setGrabbing] = useState(false);
  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }; setGrabbing(true); };
  const onMove = (e) => { if (drag.current) { drag.current.moved = true; setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); } };
  const onUp = () => { drag.current = null; setGrabbing(false); };
  const onTouchStart = (e) => { const t = e.touches[0]; if (t) { drag.current = { x: t.clientX, y: t.clientY, px: pan.x, py: pan.y, moved: false }; setGrabbing(true); } };
  const onTouchMove = (e) => { const t = e.touches[0]; if (!drag.current || !t) return; drag.current.moved = true; setPan({ x: drag.current.px + (t.clientX - drag.current.x), y: drag.current.py + (t.clientY - drag.current.y) }); };
  const zoomBy = (f) => { const el = stageRef.current, cw = el.clientWidth / 2, ch = el.clientHeight / 2; setZoom((z) => Math.min(6, Math.max(0.1, z * f))); setPan((p) => ({ x: cw - (cw - p.x) * f, y: ch - (ch - p.y) * f })); };

  if (!tela) return <Placeholder icon={Monitor} title="Sem telas" description="Adicione uma tela na aba Dados para gerar o cabeamento AC." />;

  const { ampCab, connRating, acBudget } = cableMeta(tela);
  const ports = cablePorts(tela, "ac", numbering);

  const portOf = {};
  ports.forEach((p, i) => p.forEach((cell) => { portOf[key(cell.c, cell.r)] = i; }));
  const assigned = Object.keys(portOf).length;
  const usage = (port) => (port.length * ampCab) / connRating;
  const anyOver = ports.some((p) => usage(p) > 1.001);
  const incomplete = strategy === "livre" && assigned < cols * rows;
  const status = incomplete ? { l: `Faltam ${cols * rows - assigned}`, c: T.amb } : anyOver ? { l: "Alerta", c: T.red } : { l: "OK", c: T.grn };

  const setCables = (next) => { setHistory((h) => [...h.slice(-29), cables]); setCfg({ cables: next }); };
  const undo = () => { if (!history.length) return; setCfg({ cables: history[history.length - 1] }); setHistory(history.slice(0, -1)); };
  const clickCell = (c, r) => {
    if (!livreEdit || drag.current?.moved) return;
    if (active == null || active >= cables.length) return;
    const k = key(c, r);
    const wasInActive = cables[active]?.includes(k);
    const next = cables.map((cbl) => cbl.filter((x) => x !== k));
    if (!wasInActive) next[active] = [...(next[active] || []), k];
    setCables(next);
  };
  const importFrom = (strat) => {
    const src = strat === "sinal" ? acRouteFromSignal(tela, numbering) : buildAuto(cols, rows, strat, acBudget, routing, numbering, "area", corner);
    setCables(src.map((p) => p.map((cell) => key(cell.c, cell.r)))); setActive(null);
  };
  const novoCabo = () => { setActive(cables.length); setCables([...cables, []]); };
  const removerCabo = (i) => { setCables(cables.filter((_, j) => j !== i)); setActive(null); };
  const inverterCabo = () => { if (cables[active]?.length) setCables(cables.map((c, i) => (i === active ? [...c].reverse() : c))); };
  const reorderActive = (rout) => {
    const cab0 = cables[active];
    if (!cab0?.length) return;
    let a = 1e9, b = -1, c = 1e9, d = -1;
    for (const x of cab0.map(parseKey)) { a = Math.min(a, x.c); b = Math.max(b, x.c); c = Math.min(c, x.r); d = Math.max(d, x.r); }
    const inSet = new Set(cab0);
    const seq = mkBlock(a, c, b - a + 1, d - c + 1, rout).map((cell) => key(cell.c, cell.r)).filter((k) => inSet.has(k));
    setCables(cables.map((cc, i) => (i === active ? seq : cc)));
  };
  const limparCabos = async () => { if (await confirm({ title: "Limpar cabeamento?", message: "Todos os cabos AC desta tela (modo livre) serão removidos." })) { setCables([]); setActive(0); } };

  return (
    <div>
      <div style={card({ marginBottom: livreEdit ? 8 : 16 })}>
        {isMobile && (
          <button onClick={() => setControlsOpen((v) => !v)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 2px", background: "transparent", border: "none", color: T.txt, cursor: "pointer", fontSize: 13, fontWeight: 700, textTransform: "uppercase" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Controles <span style={{ background: status.c + "22", color: status.c, padding: "2px 10px", borderRadius: 999, fontSize: 11 }}>{status.l}</span></span>
            {controlsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        )}
        {(!isMobile || controlsOpen) && (
          <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }} className="m-controlbar">
            <Select value={telaId} onChange={(e) => setTelaId(e.target.value)} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" }}>
              {telas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
            </Select>
            <Drop label="Disp." options={[["linha", "Linha"], ["coluna", "Coluna"], ["area", "Área"], ["sinal", "Atrelar sinal"], ...(allowAdvanced ? [["livre", "Livre"]] : [])]} value={strategy} onChange={setStrategy} />
            {["linha", "coluna", "area"].includes(strategy) && <Drop label="Sentido" options={[["updown", "Sobe/desce"], ["zigzag", "Zig-zag"]]} value={routing} onChange={setRouting} />}
            {["linha", "coluna", "area"].includes(strategy) && <Drop label="Início" title="Canto onde o circuito começa — case com a montagem física" options={[["bl", "Inf-esq"], ["br", "Inf-dir"], ["tl", "Sup-esq"], ["tr", "Sup-dir"]]} value={corner} onChange={setCorner} />}
            {!isMobile && <span style={{ marginLeft: "auto", background: status.c + "22", color: status.c, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{status.l}</span>}
          </div>
        )}
      </div>

      {livreEdit && (
        <div style={card({ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 16 })}>
          <DropdownMenu triggerLabel="Importar" Icon={Download} align="left" label="Importar do automático"
            items={[["linha", "Linha"], ["coluna", "Coluna"], ["area", "Área"], ["sinal", "Sinal"]].map(([v, l]) => ({ label: l, Icon: Download, onClick: () => importFrom(v) }))} />
          <span style={sep} />
          <button onClick={novoCabo} style={ibtn()} title="Novo cabo"><Plus size={16} /></button>
          <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Cabo ativo</span>
          <button onClick={() => reorderActive("updown")} style={ibtn()} title="Reordenar em sobe/desce"><ArrowUpDown size={15} /></button>
          <button onClick={() => reorderActive("zigzag")} style={ibtn()} title="Reordenar em zig-zag"><ArrowLeftRight size={15} /></button>
          <button onClick={inverterCabo} style={ibtn()} title="Inverter início/fim"><Repeat2 size={15} /></button>
          <button onClick={() => setActive(null)} disabled={active == null} style={ibtn({ opacity: active == null ? 0.4 : 1, cursor: active == null ? "not-allowed" : "pointer" })} title="Sair da edição do cabo"><X size={15} /></button>
          <span style={sep} />
          <button onClick={undo} disabled={!history.length} style={ibtn({ opacity: history.length ? 1 : 0.4, cursor: history.length ? "pointer" : "not-allowed" })} title="Desfazer"><Undo2 size={15} /></button>
          <button onClick={limparCabos} style={ibtn()} title="Limpar cabos"><Eraser size={15} /></button>
          <span style={{ marginLeft: "auto", color: T.dim, fontSize: 12 }}>
            {active != null ? <>Editando <b style={{ color: colorOf(offset + active) }}>Cabo {offset + active + 1}</b> · clique nos gabinetes</> : cables.length ? "Selecione um cabo na legenda" : "Importe ou clique “Novo cabo”"}
          </span>
        </div>
      )}

      <div style={card({ padding: 0, overflow: "hidden" })}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>{tela.nome} · Energia AC</div>
            <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>
              {ports.length} {plural(ports.length, "circuito")} · máx {acBudget} gab/cabo · {ampCab.toFixed(2)} A/gab · conector {connRating} A
              {strategy === "sinal" && " · seguindo a rota do sinal · carga balanceada entre cabos"}
              {strategy === "livre" && ` · ${assigned}/${cols * rows} atribuídos`}
            </div>
          </div>
        </div>

        <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.bd}`, color: T.dim, fontSize: 11.5, lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
          <TriangleAlert size={13} color={T.amb} style={{ flexShrink: 0, marginTop: 2 }} />
          <span><b style={{ color: T.mut }}>Segurança:</b> powerCON azul não pode ser (des)conectado sob carga — desligue o disjuntor antes. Cabo 1,5 mm² limita em 16 A e o cálculo assume 220 V. Mais em Base de Conhecimento › Segurança elétrica.</span>
        </div>

        <div ref={stageRef} onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onUp}
          style={{ position: "relative", height: isMobile ? 380 : 460, background: "#08080f", overflow: "hidden", cursor: grabbing ? "grabbing" : "grab", touchAction: "none" }}>
          <svg width="100%" height="100%" style={{ display: "block" }}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              <rect x={-8} y={-8} width={panelW + 16} height={panelH + 16} rx={10} fill="#0d0d1a" stroke={T.bd} strokeWidth={1.5} />
              {range(rows).map((r) => range(cols).map((c) => {
                const pi = portOf[key(c, r)];
                const isActive = strategy === "livre" && pi === active;
                const col = pi === undefined ? T.dim2 : colorOf(offset + pi);
                return <rect key={key(c, r)} x={c * CELL + 3} y={r * CELL + 3} width={CELL - 6} height={CELL - 6} rx={6}
                  fill={pi === undefined ? "transparent" : col + (isActive ? "45" : "26")} stroke={col} strokeWidth={isActive ? 3 : 1.5} strokeDasharray={pi === undefined ? "5 5" : undefined}
                  onClick={() => clickCell(c, r)} style={{ cursor: livreEdit ? "pointer" : "inherit" }} />;
              }))}
              {ports.map((port, pi) => {
                if (!port.length) return null;
                const pts = port.map((cell) => `${cell.c * CELL + CELL / 2},${cell.r * CELL + CELL / 2}`).join(" ");
                const f = port[0];
                return (
                  <g key={pi} style={{ pointerEvents: "none" }}>
                    <polyline points={pts} fill="none" stroke="#fff" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={strategy === "livre" && active != null && pi !== active ? 0.55 : 0.95} />
                    <circle cx={f.c * CELL + CELL / 2} cy={f.r * CELL + CELL / 2} r={14} fill={colorOf(offset + pi)} stroke="#fff" strokeWidth={2} />
                    <text x={f.c * CELL + CELL / 2} y={f.r * CELL + CELL / 2} fill="#fff" fontSize={14} fontWeight="700" textAnchor="middle" dominantBaseline="central">{offset + pi + 1}</text>
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
          <div style={{ position: "absolute", left: 12, bottom: 12, color: T.dim, fontSize: 11, background: "rgba(0,0,0,0.4)", padding: "4px 8px", borderRadius: 6 }}>
            início {CORNER_LABEL[corner]} · arraste p/ mover · scroll p/ zoom
          </div>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 14, borderTop: `1px solid ${T.bd}` }}>
          {ports.map((port, i) => {
            const load = port.length * ampCab;
            const pct = Math.round(usage(port) * 100);
            const over = pct > 100;
            const isActive = livreEdit && i === active;
            return (
              <div key={i} onClick={livreEdit ? () => setActive(active === i ? null : i) : undefined}
                style={{ display: "flex", alignItems: "center", gap: 8, background: isActive ? T.sel : T.card2, border: `1px solid ${over ? T.red : isActive ? T.acc : T.bd}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: livreEdit ? "pointer" : "default" }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: colorOf(offset + i), flexShrink: 0 }} />
                <span style={{ color: T.txt, fontWeight: 600 }}>Cabo {offset + i + 1}</span>
                <span style={{ color: over ? T.red : T.mut }}>{load.toFixed(1)} A ({pct}%)</span>
                <span style={{ color: T.dim }}>· {port.length} gab</span>
                {livreEdit && <X size={13} color={T.dim} onClick={(e) => { e.stopPropagation(); removerCabo(i); }} style={{ cursor: "pointer" }} />}
              </div>
            );
          })}
          {livreEdit && (
            <button onClick={novoCabo} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px dashed ${T.bd}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, color: T.mut, cursor: "pointer" }}><Plus size={13} /> Novo cabo</button>
          )}
        </div>
      </div>
    </div>
  );
}

const ibtn = (extra = {}) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.bd}`, background: T.card2, color: T.txt, cursor: "pointer", ...extra });
const sep = { width: 1, height: 22, background: T.bd, margin: "0 2px" };
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
