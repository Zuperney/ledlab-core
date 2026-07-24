// pages/project/ScreenCabling.jsx — cabeamento de uma Screen, SINAL ou AC (kind).
//
// Mesma tela pros dois, pra contabilizar cabos do mesmo jeito: escolhe a Screen e
// cabeia em AUTO (o app sugere) ou LIVRE (desenha à mão — a gambiarra é aqui). AC
// ganha ainda o "Atrelar ao sinal" (energia acompanha a rota de dados) e a nota de
// segurança do powerCON. Numeração 1..N por Screen. Estouro em vermelho: mostra, não
// bloqueia (sinal = px/porta; AC = corrente do conector).
import { useState, useRef, useEffect, useCallback } from "react";
import { Layers, Plus, X, Download, Repeat2, Undo2, Eraser, TriangleAlert, Settings2 } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { card, btn } from "../../ui/styles.js";
import Select from "../../components/Select.jsx";
import CablingLayer from "../../components/CablingLayer.jsx";
import LightModal from "../../components/LightModal.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import ZoomTrio from "../../components/ZoomTrio.jsx";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useConfirm, useToast } from "../../store/UIContext.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { genId } from "../../services/ids.js";
import { fileName } from "../../services/filenames.js";
import { oneScreenPerTela, screenTelas } from "../../services/screens.js";
import { screenPorts, screenPortSummary, screenCells, cellPortIndex, assignCell, autoAsCables, unassignedCount, projectPixelMapCSV } from "../../services/screenCabling.js";

const key = (c) => `${c.telaId}:${c.c},${c.r}`;
const ibtn = (extra = {}) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.bd}`, background: T.card2, color: T.txt, cursor: "pointer", ...extra });
const sep = { width: 1, height: 22, background: T.bd, margin: "0 2px" };

export default function ScreenCabling({ project, patch, kind = "sinal" }) {
  const isAc = kind === "ac";
  const word = isAc ? "Cabo" : "Porta";
  const telas = project.telas || [];
  const screens = project.screens || [];
  const { colorOf } = useCablePalette();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const toast = useToast();
  const { prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const cr = { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl", ...(prefs.cablingRender || {}) };

  const [activeId, setActiveId] = useState(screens[0]?.id || null);
  const [activeCable, setActiveCable] = useState(null);
  const [history, setHistory] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
  const [advOpen, setAdvOpen] = useState(false); // Avançado da Screen — abre em modal LEVE
  const stageRef = useRef(null);
  const drag = useRef(null);

  const active = screens.find((s) => s.id === activeId) || screens[0];
  const cfg = (active && (isAc ? active.ac : active.sinal)) || {};
  // sinal tem régua (px/área); AC é sempre por área (conta por corrente). A régua
  // padrão é ÁREA (regra do retângulo) — a mais usada; px = Free Topology.
  const rule = isAc ? "area" : (cfg.rule === "px" ? "px" : "area");
  // disposição (estratégia): default sensato conforme a régua
  const defDisp = isAc ? "area" : (rule === "px" ? "auto" : "area");
  const disp = cfg.strategy || defDisp;
  const mode = disp === "livre" ? "livre" : (isAc && disp === "sinal") ? "sinal" : "auto";
  const bbox = active ? bboxOf(active, telas) : { w: 0, h: 0 };

  const fit = useCallback(() => {
    const el = stageRef.current; if (!el || !bbox.w) return;
    const z = Math.min(el.clientWidth / bbox.w, el.clientHeight / bbox.h) * 0.92 || 1;
    setZoom(z); setPan({ x: (el.clientWidth - bbox.w * z) / 2, y: (el.clientHeight - bbox.h * z) / 2 });
  }, [bbox.w, bbox.h]);
  const [prevKey, setPrevKey] = useState(activeId + kind);
  if (prevKey !== activeId + kind) { setPrevKey(activeId + kind); setActiveCable(null); setHistory([]); }
  useEffect(() => { fit(); }, [fit, activeId, kind]);

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

  if (!telas.length) return <Info text="Adicione telas na aba Dados para cabear." />;
  if (!screens.length) {
    return (
      <div style={card({ textAlign: "center", padding: "28px 20px" })}>
        <Layers size={28} color={T.acM} style={{ marginBottom: 8 }} />
        <div style={{ color: T.txt, fontWeight: 600, marginBottom: 6 }}>Nenhuma Screen pra cabear</div>
        <p style={{ color: T.mut, fontSize: 13, maxWidth: 420, margin: "0 auto 14px", lineHeight: 1.5 }}>
          O cabeamento é por Screen. Monte as Screens na aba <b style={{ color: T.txt }}>Screens</b> — ou crie uma por tela pra começar.
        </p>
        <button style={btn("ghost")} onClick={() => patch({ screens: oneScreenPerTela(telas, () => genId("screen")) })}>1 Screen por tela</button>
      </div>
    );
  }

  const setScreens = (next) => patch({ screens: next });
  const patchActive = (partial) => setScreens(screens.map((s) => (s.id === active.id ? { ...s, ...partial } : s)));
  const setCfg = (partial) => patchActive({ [kind]: { ...cfg, ...partial } });
  const cables = cfg.cables || [];
  const setCables = (next) => { setHistory((h) => [...h.slice(-29), cables]); setCfg({ cables: next }); };
  const undo = () => { if (!history.length) return; setCfg({ cables: history[history.length - 1] }); setHistory(history.slice(0, -1)); };

  const ports = screenPorts(active, telas, kind, numbering);
  const portIdx = cellPortIndex(ports);
  const summary = screenPortSummary(active, telas, kind, numbering);
  const cells = screenCells(active, telas);
  const faltam = mode === "livre" ? unassignedCount(active, telas, kind) : 0;
  const anyOver = summary.some((p) => p.over);
  const status = faltam ? { l: `Faltam ${faltam}`, c: T.amb } : anyOver ? { l: "Alerta", c: T.red } : { l: "OK", c: T.grn };

  const clickCell = (cell) => {
    if (mode !== "livre" || drag.current?.moved) return;
    if (activeCable == null || activeCable >= cables.length) return;
    setCables(assignCell(cables, activeCable, cell));
  };
  // trocar a régua reseta a disposição pro padrão válido daquela régua (px não tem
  // Linha/Coluna/Área; área não tem "Automática")
  const setRegua = (v) => setCfg({ rule: v, strategy: v === "px" ? "auto" : "area" });
  const setDisp = (v) => setCfg({ strategy: v });
  const importAuto = () => { setCables(autoAsCables(active, telas, kind, numbering)); setActiveCable(null); };
  const novoCabo = () => { setActiveCable(cables.length); setCables([...cables, []]); };
  const removerCabo = (i) => { setCables(cables.filter((_, j) => j !== i)); setActiveCable(null); };
  const inverter = () => { if (cables[activeCable]?.length) setCables(cables.map((c, i) => (i === activeCable ? [...c].reverse() : c))); };
  const limpar = async () => { if (await confirm({ title: "Limpar cabeamento?", message: `Todos os cabos livres de ${active.nome} serão removidos.` })) { setCables([]); setActiveCable(null); } };
  const exportCSV = () => {
    const csv = projectPixelMapCSV(project, numbering, active.id);
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = fileName([project.name, active.nome, "mapa-pixels"], "csv");
    a.click();
    URL.revokeObjectURL(a.href);
    toast(`Mapa de pixels: ${ports.length} portas, coordenada da Screen.`);
  };

  const R = (v) => v * zoom;
  // disposições disponíveis conforme régua/kind (px não tem Linha/Coluna/Área; AC tem "Atrelar ao sinal")
  const dispOpts = isAc
    ? [["area", "Área"], ["linha", "Linha"], ["coluna", "Coluna"], ["sinal", "Atrelar ao sinal"], ["livre", "Livre"]]
    : rule === "px"
      ? [["auto", "Automática"], ["livre", "Livre"]]
      : [["area", "Área"], ["linha", "Linha"], ["coluna", "Coluna"], ["livre", "Livre"]];
  const dispLabel = (dispOpts.find(([v]) => v === disp) || [])[1] || disp;
  const resumo = [isAc ? null : (rule === "px" ? "Pixels reais" : "Área"), dispLabel, isAc ? null : `${cfg.bits === 10 ? 10 : 8}-bit`].filter(Boolean).join(" · ");

  return (
    <div>
      {/* F2/F3: chips de Screen (contexto criável) + status + Avançado (ícone → modal leve) */}
      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 12 }}>
        <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", alignItems: "center", minWidth: 0, flex: 1 }}>
          {screens.map((s) => {
            const on = s.id === active.id;
            return (
              <button key={s.id} onClick={() => setActiveId(s.id)} style={{ flexShrink: 0, padding: "6px 12px", minHeight: 36, borderRadius: 8, cursor: "pointer", background: on ? T.sel : T.card2, border: `1px solid ${on ? T.acc : T.bd}`, color: on ? T.txt : T.mut, fontWeight: 600, fontSize: 13 }}>
                {s.nome} <span style={{ color: T.dim, fontWeight: 400 }}>· {(s.telaIds || []).length}</span>
              </button>
            );
          })}
        </div>
        <StatusPill color={status.c} label={status.l} />
        <button onClick={() => setAdvOpen(true)} title={`Avançado — ${resumo}`} aria-label="Avançado da Screen"
          style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, cursor: "pointer", border: `1px solid ${advOpen ? T.acc : T.bd}`, background: advOpen ? T.sel : T.card2, color: advOpen ? T.acM : T.mut, flexShrink: 0, padding: 0 }}>
          <Settings2 size={16} />
        </button>
      </div>

      {!screenTelas(active, telas).length ? (
        <div style={card({ color: T.dim, fontSize: 13, textAlign: "center", padding: "24px" })}>
          <b style={{ color: T.mut }}>{active.nome}</b> está sem telas. Adicione telas a ela na aba Screens.
        </div>
      ) : (
        <>

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
                {activeCable != null ? <>Editando <b style={{ color: colorOf(activeCable) }}>{word} {activeCable + 1}</b> · clique nos gabinetes</> : cables.length ? `Selecione ${isAc ? "um cabo" : "uma porta"} na legenda` : "Importe do auto ou clique “Novo cabo”"}
              </span>
            </div>
          )}

          <div style={card({ padding: 0, overflow: "hidden" })}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>{active.nome} · {isAc ? "Energia AC" : "Sinal"}</div>
                <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>
                  {bbox.w.toLocaleString("pt-BR")} × {bbox.h.toLocaleString("pt-BR")} px · {ports.length} {isAc ? (ports.length === 1 ? "cabo" : "cabos") : (ports.length === 1 ? "porta" : "portas")}
                  {mode === "sinal" ? " · seguindo a rota do sinal" : " · a corrente atravessa as telas do mesmo modelo"}
                </div>
              </div>
              {/* CSV é fluxo de BANCADA (NovaLCT/Tessera no PC) — no celular sai da frente */}
              {!isAc && !isMobile && (
                <button onClick={exportCSV} title="Baixa o mapa de pixels desta Screen (gabinete → porta → X/Y) em CSV pro NovaLCT / Tessera"
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, borderRadius: 8, padding: "7px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", flexShrink: 0 }}>
                  <Download size={14} /> Mapa de pixels
                </button>
              )}
            </div>

            {isAc && (
              <div style={{ padding: "8px 16px", borderBottom: `1px solid ${T.bd}`, color: T.dim, fontSize: 11.5, lineHeight: 1.5, display: "flex", gap: 7, alignItems: "flex-start" }}>
                <TriangleAlert size={13} color={T.amb} style={{ flexShrink: 0, marginTop: 2 }} />
                <span><b style={{ color: T.mut }}>Segurança:</b> powerCON azul não pode ser (des)conectado sob carga — desligue o disjuntor antes. Cabo 1,5 mm² limita em 16 A e o cálculo assume 220 V. Mais em Base de Conhecimento › Segurança elétrica.</span>
              </div>
            )}

            <div ref={stageRef} onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
              onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onUp}
              style={{ position: "relative", height: isMobile ? 360 : 460, background: "#08080f", overflow: "hidden", cursor: grabbing ? "grabbing" : "grab", touchAction: "none" }}>
              <svg width="100%" height="100%" style={{ display: "block" }}>
                <g transform={`translate(${pan.x},${pan.y})`}>
                  <CablingLayer
                    cells={cells.map((cell) => ({ k: key(cell), x: R(cell.x), y: R(cell.y), w: R(cell.w), h: R(cell.h), port: portIdx[key(cell)] ?? null, orig: cell }))}
                    ports={ports.map((port) => port.map((cell) => ({ k: key(cell), x: R(cell.x), y: R(cell.y), w: R(cell.w), h: R(cell.h) })))}
                    colorOf={colorOf}
                    showNumbers={(cr.numbers ?? true) && R(cells[0]?.w || 128) >= 22}
                    arrows={cr.arrows ?? true} numberSize={cr.numberSize} numberPos={cr.numberPos}
                    onCellClick={mode === "livre" ? (c) => clickCell(c.orig) : undefined}
                    activeCable={mode === "livre" ? activeCable : null} />
                </g>
              </svg>
              <div style={{ position: "absolute", right: 12, bottom: 12 }}>
                <ZoomTrio onOut={() => zoomBy(0.8)} onFit={fit} onIn={() => zoomBy(1.2)} />
              </div>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 14, borderTop: `1px solid ${T.bd}` }}>
              {summary.map((p, i) => {
                const isAct = mode === "livre" && i === activeCable;
                return (
                  <div key={i} onClick={mode === "livre" ? () => setActiveCable(activeCable === i ? null : i) : undefined}
                    style={{ display: "flex", alignItems: "center", gap: 8, background: isAct ? T.sel : T.card2, border: `1px solid ${p.over ? T.red : isAct ? T.acc : T.bd}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: mode === "livre" ? "pointer" : "default" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: colorOf(i), flexShrink: 0 }} />
                    <span style={{ color: T.txt, fontWeight: 600 }}>{word} {p.n}</span>
                    <span style={{ color: p.over ? T.red : T.mut }}>{isAc ? `${p.load.toFixed(1)} A (${p.pct}%)` : `${p.pct}%`}</span>
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

      {/* Avançado da Screen: modal LEVE (não preenche a tela) — pedido do usuário */}
      {advOpen && (
        <LightModal title={`Avançado · ${active.nome} · ${isAc ? "AC" : "Sinal"}`} onClose={() => setAdvOpen(false)}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {!isAc && <Drop fluid label="Régua" title="Área = regra do retângulo (a porta reserva o retângulo; a mais usada). Pixels = Free Topology (conta o gabinete real; exige controlador com a função)." options={[["area", "Área (retângulo)"], ["px", "Pixels (real)"]]} value={rule} onChange={setRegua} />}
            <Drop fluid label="Disposição" title="Como a corrente é cortada em cabos" options={dispOpts} value={disp} onChange={setDisp} />
            {mode === "auto" && <>
              <Drop fluid label="Sentido" options={[["updown", "Sobe/desce"], ["zigzag", "Zig-zag"]]} value={cfg.routing || "updown"} onChange={(v) => setCfg({ routing: v })} />
              <Drop fluid label="Início" title="Canto onde a corrente começa — case com a montagem física" options={[["bl", "Inf-esq"], ["br", "Inf-dir"], ["tl", "Sup-esq"], ["tr", "Sup-dir"]]} value={cfg.corner || "bl"} onChange={(v) => setCfg({ corner: v })} />
            </>}
            {!isAc && <Drop fluid label="Cor" title="10-bit dobra os dados por pixel — metade dos px por porta" options={[[8, "8-bit"], [10, "10-bit"]]} value={cfg.bits === 10 ? 10 : 8} onChange={(v) => setCfg({ bits: Number(v) })} />}
          </div>
          <div style={{ color: T.dim, fontSize: 11, marginTop: 12, lineHeight: 1.5 }}>{isAc ? "Circuito segue o físico; a régua de porta (Free Topology) é coisa de sinal." : "Régua e Free Topology explicados na Base de Conhecimento › Sinal."}</div>
        </LightModal>
      )}
    </div>
  );
}

function bboxOf(screen, telas) {
  let w = 0, h = 0;
  for (const cell of screenCells(screen, telas)) { w = Math.max(w, cell.x + cell.w); h = Math.max(h, cell.y + cell.h); }
  return { w, h };
}

function Info({ text }) {
  return <div style={card({ color: T.dim, fontSize: 13, textAlign: "center", padding: 24 })}>{text}</div>;
}

const dropSel = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "7px 9px", fontSize: 13, fontWeight: 600, cursor: "pointer" };
function Drop({ label, options, value, onChange, title, fluid }) {
  return (
    // `fluid` (células do grid mobile): rótulo em cima e select na largura toda da célula
    <span style={{ display: fluid ? "flex" : "inline-flex", flexDirection: fluid ? "column" : "row", alignItems: fluid ? "stretch" : "center", gap: 6, fontSize: 11, textTransform: "uppercase", color: T.mut, fontWeight: 600, minWidth: 0 }} title={title}>
      {label}
      <Select value={String(value)} title={title || label} onChange={(e) => { const o = options.find(([v]) => String(v) === e.target.value); onChange(o ? o[0] : e.target.value); }} style={{ ...dropSel, ...(fluid ? { width: "100%", minWidth: 0 } : {}) }}>
        {options.map(([v, l]) => <option key={String(v)} value={String(v)}>{l}</option>)}
      </Select>
    </span>
  );
}
