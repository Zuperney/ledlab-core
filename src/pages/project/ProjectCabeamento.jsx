// pages/project/ProjectCabeamento.jsx — roteamento de sinal/AC num canvas com zoom/pan/fit.
//
// SINAL (Novastar básico): capacidade da porta limitada pela ÁREA RETANGULAR
// (bounding box). Cada cabo é um bloco retangular que INICIA no canto inferior-
// esquerdo. Ordem cima→baixo, esquerda→direita. Parte principal vira cabos "retos";
// a sobra combina o eixo perpendicular. (VX2000 + série A muda isso — fica p/ depois.)
//
// LIVRE: editor manual. Nada é dividido automaticamente — o usuário escolhe o cabo
// ativo, clica p/ atribuir/reatribuir gabinetes e cria novo cabo quando quiser.
// Pode IMPORTAR o cabeamento automático (Linha/Coluna/Área) e editar só o necessário.
import { useState, useRef, useEffect, useCallback } from "react";
import { Monitor, Eraser, ZoomIn, ZoomOut, Maximize, Plus, X, Download, Repeat2, Undo2, ArrowUpDown, ArrowLeftRight } from "lucide-react";
import { paletteColor, T } from "../../ui/tokens.js";
import { card } from "../../ui/styles.js";
import { useConfirm } from "../../store/UIContext.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { range, key, parseKey, bboxArea, chunkArr, mkBlock, buildAuto, signalRoute, cablePorts, cableMeta } from "../../services/cabling.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { FLAGS } from "../../config/featureFlags.js";
import Placeholder from "../../components/Placeholder.jsx";

const CELL = 64; // tamanho da célula no canvas (o zoom escala)

export default function ProjectCabeamento({ project, patchTela }) {
  const telas = project.telas || [];
  const [telaId, setTelaId] = useState(telas[0]?.id);
  const [active, setActive] = useState(null); // cabo em edição (null = nenhum)
  const [history, setHistory] = useState([]); // undo do modo livre
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stageRef = useRef(null);
  const drag = useRef(null);
  const isMobile = useIsMobile();

  const tela = telas.find((t) => t.id === telaId) || telas[0];
  const cols = tela?.cols || 1, rows = tela?.rows || 1;
  const panelW = cols * CELL, panelH = rows * CELL;

  // cabeamento PERSISTIDO por tela; SINAL e AC têm configs SEPARADAS (mexer no AC não muda o sinal)
  const confirm = useConfirm();
  const { prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr"; // ordem global de numeração dos cabos
  const cabling = tela?.cabling || {};
  const mode = cabling.mode || "sinal";
  const sinalCfg = cabling.sinal || {};
  const acCfg = cabling.ac || {};
  const cfg = mode === "ac" ? acCfg : sinalCfg;
  const strategy = cfg.strategy || "linha";
  const routing = cfg.routing || "updown"; // "updown" (sobe/desce) | "zigzag"
  // no celular, edição avançada (modo Livre) fica oculta — foco em visualização/estatísticas
  const allowAdvanced = !isMobile || FLAGS.advancedCablingOnMobile;
  const livreEdit = strategy === "livre" && allowAdvanced;
  const hz = sinalCfg.hz || 60; // frequência é conceito do sinal
  const cables = cfg.cables || [];
  const setMode = (v) => patchTela?.(tela.id, { cabling: { ...cabling, mode: v } });
  const setCfg = (partial) => patchTela?.(tela.id, { cabling: { ...cabling, [mode]: { ...cfg, ...partial } } });
  const setStrategy = (v) => setCfg({ strategy: v });
  const setRouting = (v) => setCfg({ routing: v });
  const setHz = (v) => patchTela?.(tela.id, { cabling: { ...cabling, sinal: { ...sinalCfg, hz: v } } });

  const fit = useCallback(() => {
    const el = stageRef.current; if (!el) return;
    const z = Math.min(el.clientWidth / panelW, el.clientHeight / panelH) * 0.9 || 1;
    setZoom(z); setPan({ x: (el.clientWidth - panelW * z) / 2, y: (el.clientHeight - panelH * z) / 2 });
  }, [panelW, panelH]);
  useEffect(() => { fit(); setActive(null); setHistory([]); }, [fit, telaId]);

  const onWheel = (e) => {
    e.preventDefault();
    const rect = stageRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top, f = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.min(6, Math.max(0.1, z * f)));
    setPan((p) => ({ x: mx - (mx - p.x) * f, y: my - (my - p.y) * f }));
  };
  const onDown = (e) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y, moved: false }; };
  const onMove = (e) => { if (drag.current) { drag.current.moved = true; setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) }); } };
  const onUp = () => { drag.current = null; };
  // pan por toque (mobile)
  const onTouchStart = (e) => { const t = e.touches[0]; if (t) drag.current = { x: t.clientX, y: t.clientY, px: pan.x, py: pan.y, moved: false }; };
  const onTouchMove = (e) => { const t = e.touches[0]; if (!drag.current || !t) return; drag.current.moved = true; setPan({ x: drag.current.px + (t.clientX - drag.current.x), y: drag.current.py + (t.clientY - drag.current.y) }); };
  const zoomBy = (f) => { const el = stageRef.current, cw = el.clientWidth / 2, ch = el.clientHeight / 2; setZoom((z) => Math.min(6, Math.max(0.1, z * f))); setPan((p) => ({ x: cw - (cw - p.x) * f, y: ch - (ch - p.y) * f })); };

  if (!tela) return <Placeholder icon={Monitor} title="Sem telas" description="Adicione uma tela na aba Dados para gerar o cabeamento." />;

  const { ampCab, connRating, acBudget, sinalBudget } = cableMeta(tela);
  const budget = mode === "sinal" ? sinalBudget : acBudget;
  const ports = cablePorts(tela, mode, numbering); // mesma lógica usada pelo Test Card

  const portOf = {};
  ports.forEach((p, i) => p.forEach((cell) => { portOf[key(cell.c, cell.r)] = i; }));
  const assigned = Object.keys(portOf).length;
  const usage = (port) => mode === "sinal" ? bboxArea(port) / budget : (port.length * ampCab) / connRating;
  const anyOver = ports.some((p) => usage(p) > 1.001);
  const incomplete = strategy === "livre" && assigned < cols * rows;
  const status = incomplete ? { l: `Faltam ${cols * rows - assigned}`, c: T.amb } : anyOver ? { l: "Alerta", c: T.red } : { l: "OK", c: T.grn };

  // ── modo livre: edição manual ──
  // grava o estado atual no histórico (undo) antes de alterar
  const setCables = (next) => { setHistory((h) => [...h.slice(-29), cables]); setCfg({ cables: next }); };
  const undo = () => { if (!history.length) return; setCfg({ cables: history[history.length - 1] }); setHistory(history.slice(0, -1)); };

  const clickCell = (c, r) => {
    if (!livreEdit || drag.current?.moved) return;
    if (active == null || active >= cables.length) return; // precisa de um cabo selecionado
    const k = key(c, r);
    const wasInActive = cables[active]?.includes(k);
    const next = cables.map((cbl) => cbl.filter((x) => x !== k)); // tira de qualquer cabo
    if (!wasInActive) next[active] = [...(next[active] || []), k]; // adiciona ao cabo selecionado
    setCables(next);
  };
  const importFrom = (strat) => {
    const src = strat === "sinal" ? signalRoute(tela, numbering).flatMap((p) => chunkArr(p, acBudget)) : buildAuto(cols, rows, strat, budget, routing, numbering);
    setCables(src.map((p) => p.map((cell) => key(cell.c, cell.r)))); setActive(null);
  };
  const novoCabo = () => { setActive(cables.length); setCables([...cables, []]); };
  const removerCabo = (i) => { setCables(cables.filter((_, j) => j !== i)); setActive(null); };
  const inverterCabo = () => { if (cables[active]?.length) setCables(cables.map((c, i) => (i === active ? [...c].reverse() : c))); };
  // reordena o cabo ATIVO no padrão escolhido (dentro do seu bounding box)
  const reorderActive = (routing) => {
    const cab0 = cables[active];
    if (!cab0?.length) return;
    let a = 1e9, b = -1, c = 1e9, d = -1;
    for (const x of cab0.map(parseKey)) { a = Math.min(a, x.c); b = Math.max(b, x.c); c = Math.min(c, x.r); d = Math.max(d, x.r); }
    const inSet = new Set(cab0);
    const seq = mkBlock(a, c, b - a + 1, d - c + 1, routing).map((cell) => key(cell.c, cell.r)).filter((k) => inSet.has(k));
    setCables(cables.map((cc, i) => (i === active ? seq : cc)));
  };
  const limparCabos = async () => { if (await confirm({ title: "Limpar cabeamento?", message: "Todos os cabos desta tela (modo livre) serão removidos." })) { setCables([]); setActive(0); } };

  return (
    <div>
      <div style={card({ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap", marginBottom: livreEdit ? 8 : 16 })} className="m-controlbar">
        <select value={telaId} onChange={(e) => setTelaId(e.target.value)} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" }}>
          {telas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <Seg label="Modo" options={[["sinal", "Sinal"], ["ac", "AC"]]} value={mode} onChange={setMode} />
        <Seg label="Disp." options={[["linha", "Linha"], ["coluna", "Coluna"], ["area", "Área"], ...(mode === "ac" ? [["sinal", "Atrelar sinal"]] : []), ...(allowAdvanced ? [["livre", "Livre"]] : [])]} value={strategy} onChange={setStrategy} />
        {["linha", "coluna", "area"].includes(strategy) && <Seg label="Sentido" options={[["updown", "Sobe/desce"], ["zigzag", "Zig-zag"]]} value={routing} onChange={setRouting} />}
        {mode === "sinal" && <Seg label="Freq" options={[[60, "60"], [50, "50"], [30, "30"]]} value={hz} onChange={setHz} />}
        <span style={{ marginLeft: "auto", background: status.c + "22", color: status.c, padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 700 }}>{status.l}</span>
      </div>

      {/* barra do modo livre */}
      {livreEdit && (
        <div style={card({ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 16 })}>
          <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Importar do automático</span>
          {(mode === "ac" ? [["linha", "Linha"], ["coluna", "Coluna"], ["area", "Área"], ["sinal", "Sinal"]] : [["linha", "Linha"], ["coluna", "Coluna"], ["area", "Área"]]).map(([v, l]) => (
            <button key={v} onClick={() => importFrom(v)} style={pill(false)}><Download size={13} /> {l}</button>
          ))}
          <span style={{ width: 1, height: 22, background: T.bd, margin: "0 2px" }} />
          <button onClick={novoCabo} style={pill(false)}><Plus size={14} /> Novo cabo</button>
          <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Cabo ativo</span>
          <button onClick={() => reorderActive("updown")} style={pill(false)} title="Reordenar cabo em sobe/desce"><ArrowUpDown size={13} /> Sobe/desce</button>
          <button onClick={() => reorderActive("zigzag")} style={pill(false)} title="Reordenar cabo em zig-zag"><ArrowLeftRight size={13} /> Zig-zag</button>
          <button onClick={inverterCabo} style={pill(false)} title="Inverter início/fim"><Repeat2 size={13} /> Inverter</button>
          <button onClick={() => setActive(null)} disabled={active == null} style={{ ...pill(false), opacity: active == null ? 0.4 : 1, cursor: active == null ? "not-allowed" : "pointer" }} title="Sair da edição do cabo"><X size={13} /> Sair da edição</button>
          <span style={{ width: 1, height: 22, background: T.bd, margin: "0 2px" }} />
          <button onClick={undo} disabled={!history.length} style={{ ...pill(false), opacity: history.length ? 1 : 0.4, cursor: history.length ? "pointer" : "not-allowed" }}><Undo2 size={13} /> Desfazer</button>
          <button onClick={limparCabos} style={pill(false)}><Eraser size={13} /> Limpar</button>
          <span style={{ marginLeft: "auto", color: T.dim, fontSize: 12 }}>
            {active != null ? <>Editando <b style={{ color: paletteColor(active) }}>Cabo {active + 1}</b> · clique nos gabinetes</> : cables.length ? "Selecione um cabo na legenda para editar" : "Importe do automático ou clique “Novo cabo”"}
          </span>
        </div>
      )}

      <div style={card({ padding: 0, overflow: "hidden" })}>
        <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bd}` }}>
          <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>{tela.nome} · {mode === "sinal" ? "Sinal" : "Energia AC"}</div>
          <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>
            {ports.length} {mode === "sinal" ? "portas" : "circuitos"} · máx {budget} gab/{mode === "sinal" ? "porta (área quadrada)" : "cabo"}
            {mode === "ac" && ` · ${ampCab.toFixed(2)} A/gab · conector ${connRating} A`}
            {mode === "ac" && strategy === "sinal" && " · seguindo a rota do sinal"}
            {strategy === "livre" && ` · ${assigned}/${cols * rows} atribuídos`}
          </div>
        </div>

        {/* CANVAS */}
        <div ref={stageRef} onWheel={onWheel} onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onUp}
          style={{ position: "relative", height: isMobile ? 380 : 460, background: "#08080f", overflow: "hidden", cursor: drag.current ? "grabbing" : "grab", touchAction: "none" }}>
          <svg width="100%" height="100%" style={{ display: "block" }}>
            <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
              <rect x={-8} y={-8} width={panelW + 16} height={panelH + 16} rx={10} fill="#0d0d1a" stroke={T.bd} strokeWidth={1.5} />
              {range(rows).map((r) => range(cols).map((c) => {
                const pi = portOf[key(c, r)];
                const isActive = strategy === "livre" && pi === active;
                const col = pi === undefined ? T.dim2 : paletteColor(pi);
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
                    <circle cx={f.c * CELL + CELL / 2} cy={f.r * CELL + CELL / 2} r={14} fill={paletteColor(pi)} stroke="#fff" strokeWidth={2} />
                    <text x={f.c * CELL + CELL / 2} y={f.r * CELL + CELL / 2} fill="#fff" fontSize={14} fontWeight="700" textAnchor="middle" dominantBaseline="central">{pi + 1}</text>
                  </g>
                );
              })}
            </g>
          </svg>
          <div style={{ position: "absolute", right: 12, bottom: 12, display: "flex", flexDirection: "column", gap: 6 }}>
            {[[ZoomIn, () => zoomBy(1.2), "Aumentar"], [Maximize, fit, "Enquadrar"], [ZoomOut, () => zoomBy(0.8), "Diminuir"]].map(([Ic, fn, t], i) => (
              <button key={i} title={t} onClick={fn} style={{ width: 34, height: 34, borderRadius: 8, background: T.card, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><Ic size={16} /></button>
            ))}
          </div>
          <div style={{ position: "absolute", left: 12, bottom: 12, color: T.dim, fontSize: 11, background: "rgba(0,0,0,0.4)", padding: "4px 8px", borderRadius: 6 }}>
            início inferior-esquerdo · arraste p/ mover · scroll p/ zoom
          </div>
        </div>

        {/* LEGENDA (clicável no modo livre para escolher o cabo) */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8, padding: 14, borderTop: `1px solid ${T.bd}` }}>
          {ports.map((port, i) => {
            const pct = Math.round(usage(port) * 100);
            const over = pct > 100;
            const isActive = livreEdit && i === active;
            return (
              <div key={i} onClick={livreEdit ? () => setActive(active === i ? null : i) : undefined}
                style={{ display: "flex", alignItems: "center", gap: 8, background: isActive ? T.sel : T.card2, border: `1px solid ${over ? T.red : isActive ? T.acc : T.bd}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: livreEdit ? "pointer" : "default" }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: paletteColor(i), flexShrink: 0 }} />
                <span style={{ color: T.txt, fontWeight: 600 }}>{mode === "sinal" ? "Porta" : "Cabo"} {i + 1}</span>
                <span style={{ color: over ? T.red : T.mut }}>{pct}%</span>
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

const pill = (active) => ({ display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 12px", borderRadius: 8, border: `1px solid ${active ? T.acc : T.bd}`, background: active ? T.acc : T.card2, color: active ? "#fff" : T.mut, cursor: "pointer", fontSize: 13, fontWeight: 600 });

function Seg({ label, options, value, onChange }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>{label}</span>
      <div style={{ display: "flex", gap: 4 }}>
        {options.map(([v, l]) => {
          const act = v === value;
          return <button key={String(v)} onClick={() => onChange(v)} style={{ padding: "6px 12px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${act ? T.acc : T.bd}`, background: act ? T.acc : T.card2, color: act ? "#fff" : T.mut }}>{l}</button>;
        })}
      </div>
    </div>
  );
}
