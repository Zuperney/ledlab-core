// pages/project/ScreenCabling.jsx — cabeamento de uma Screen, SINAL ou AC (kind).
//
// Mesma tela pros dois, pra contabilizar cabos do mesmo jeito: escolhe a Screen e
// cabeia em AUTO (o app sugere) ou LIVRE (desenha à mão — a gambiarra é aqui). AC
// ganha ainda o "Atrelar ao sinal" (energia acompanha a rota de dados) e a nota de
// segurança do powerCON. Numeração 1..N por Screen. Estouro em vermelho: mostra, não
// bloqueia (sinal = px/porta; AC = corrente do conector).
import { useState, useRef, useEffect, useCallback } from "react";
import { Layers, Plus, X, Download, Repeat2, Undo2, Eraser, TriangleAlert, ChevronsUp } from "lucide-react";
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
import { screenPorts, screenPortSummary, screenCells, cellPortIndex, assignCell, autoAsCables, unassignedCount, projectPixelMapCSV, neighborCell, linhasDeCorte } from "../../services/screenCabling.js";
import { equipSnapshot, screenEquipStatus } from "../../services/equipamentos.js";
import { buildLoomexExport } from "../../services/loomex.js";
import { downloadJSON } from "../../services/storage.js";
import { VOLT, phaseOf, phaseBalance } from "../../services/electricalCalc.js";
import { fmtFases } from "../../services/reportContent.js";
import { PrefToggle } from "../../components/CablingPrefs.jsx";

const key = (c) => `${c.telaId}:${c.c},${c.r}`;
const ibtn = (extra = {}) => ({ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 34, height: 34, borderRadius: 8, border: `1px solid ${T.bd}`, background: T.card2, color: T.txt, cursor: "pointer", ...extra });
const sep = { width: 1, height: 22, background: T.bd, margin: "0 2px" };

export default function ScreenCabling({ project, patch, kind = "sinal", advOpen = false, onAdvClose }) {
  const isAc = kind === "ac";
  const word = isAc ? "Circuito" : "Porta"; // vocabulário §12.1: sinal = Porta, AC = Circuito
  const novoWord = isAc ? "Novo circuito" : "Nova porta";
  const telas = project.telas || [];
  const screens = project.screens || [];
  const { colorOf } = useCablePalette();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const toast = useToast();
  const { prefs, equips } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const cr = { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl", ...(prefs.cablingRender || {}) };

  const [activeId, setActiveId] = useState(screens[0]?.id || null);
  const [activeCable, setActiveCable] = useState(null);
  const [history, setHistory] = useState([]);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);
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

  // (os retornos antecipados de "sem telas"/"sem Screens" moram no fim do
  //  componente, DEPOIS de todos os hooks — o do teclado incluído. Daqui pra
  //  baixo `active` pode ser undefined; o que dereferencia na hora tem guard.)
  const setScreens = (next) => patch({ screens: next });
  const patchActive = (partial) => setScreens(screens.map((s) => (s.id === active.id ? { ...s, ...partial } : s)));
  const setCfg = (partial) => patchActive({ [kind]: { ...cfg, ...partial } });
  const cables = cfg.cables || [];
  const setCables = (next) => { setHistory((h) => [...h.slice(-29), cables]); setCfg({ cables: next }); };
  const undo = () => { if (!history.length) return; setCfg({ cables: history[history.length - 1] }); setHistory(history.slice(0, -1)); };

  const ports = active ? screenPorts(active, telas, kind, numbering) : [];
  const portIdx = cellPortIndex(ports);
  const summary = active ? screenPortSummary(active, telas, kind, numbering) : [];
  // FASES (só AC): rodízio por Screen conforme a tensão do projeto (aba Energia)
  const vc = VOLT[(project.config || {}).vk] || VOLT["220_tri"];
  const balFases = isAc ? phaseBalance(summary, vc) : { temRodizio: false };
  const cells = active ? screenCells(active, telas) : [];
  // o CORTE de processamento (aba Screens) desenhado aqui: é o limite que faz a
  // porta parar no meio da parede, e sem a linha isso parece bug
  const cortes = active ? linhasDeCorte(active, telas) : [];
  const faltam = mode === "livre" && active ? unassignedCount(active, telas, kind) : 0;
  const anyOver = summary.some((p) => p.over);
  const anyOc = summary.some((p) => p.oc); // overclock: acima do nominal POR ESCOLHA
  // regra dos 80%: cabo AC acima da margem de carga contínua = atenção (laranja)
  const anyWarn = summary.some((p) => p.warn);
  const status = faltam ? { l: `Faltam ${faltam}`, c: T.amb } : anyOver ? { l: "Alerta", c: T.red } : anyOc ? { l: "Overclock", c: T.amb } : anyWarn ? { l: "Acima de 80%", c: T.amb } : { l: "OK", c: T.grn };

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
  const limpar = async () => { if (await confirm({ title: "Limpar cabeamento?", message: `${isAc ? "Todos os circuitos livres" : "Todas as portas livres"} de ${active.nome} serão removid${isAc ? "os" : "as"}.` })) { setCables([]); setActiveCable(null); } };
  // o handshake com o Loomex: baixa o .loomex.json do PROJETO inteiro (todas as
  // Screens + equipamentos vinculados), pronto pro Importar de lá — o projeto
  // nasce no Loomex com blocos e conexões desenhadas.
  const exportLoomex = () => {
    const out = buildLoomexExport(project, numbering);
    downloadJSON(fileName([project.name || "projeto", "loomex"], "loomex.json"), out);
    const aConfirmar = out.conexoes.filter((c) => c.estilo === "dashed").length;
    toast(`Loomex: ${out.blocos.length} blocos, ${out.conexoes.length} conexões${aConfirmar ? ` (${aConfirmar} a confirmar)` : ""}.`);
  };
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

  // ── teclado do modo livre — o fluxo clique-por-clique vira seta-por-seta ──
  // Clique escolhe o 1º gabinete; daí as SETAS estendem o cabo ativo pro vizinho
  // geométrico (atravessa telas encostadas). Seta pra um gabinete que JÁ está no
  // cabo = volta um passo (backtrack). Backspace tira o último; N abre um cabo
  // novo; Ctrl+Z desfaz; Esc sai da edição. Ignora foco em campo de texto e o
  // Avançado aberto (o modal tem o próprio Esc). Sem array de deps de propósito:
  // re-assina a cada render pra fechar sempre sobre os valores atuais.
  useEffect(() => {
    if (mode !== "livre" || advOpen || !active) return undefined;
    const onKey = (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) return;
      const dirKey = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }[e.key];
      if (dirKey) {
        if (activeCable == null || activeCable >= cables.length) return;
        const cabo = cables[activeCable] || [];
        if (!cabo.length) return; // o primeiro gabinete é escolhido no clique
        e.preventDefault();
        const next = neighborCell(cells, cabo[cabo.length - 1], dirKey);
        if (!next) return;
        const inActive = cabo.some((c) => c.telaId === next.telaId && c.c === next.c && c.r === next.r);
        if (inActive) setCables(cables.map((c, i) => (i === activeCable ? c.slice(0, -1) : c)));
        else setCables(assignCell(cables, activeCable, next));
        return;
      }
      if ((e.key === "Backspace" || e.key === "Delete") && activeCable != null && cables[activeCable]?.length) {
        e.preventDefault();
        setCables(cables.map((c, i) => (i === activeCable ? c.slice(0, -1) : c)));
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") { e.preventDefault(); undo(); return; }
      if (e.key.toLowerCase() === "n" && !e.ctrlKey && !e.metaKey && !e.altKey) { e.preventDefault(); novoCabo(); return; }
      if (e.key === "Escape" && activeCable != null) setActiveCable(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const R = (v) => v * zoom;
  // disposições disponíveis conforme régua/kind (px não tem Linha/Coluna/Área; AC tem "Atrelar ao sinal")
  const dispOpts = isAc
    ? [["area", "Área"], ["linha", "Linha"], ["coluna", "Coluna"], ["sinal", "Atrelar ao sinal"], ["livre", "Livre"]]
    : rule === "px"
      ? [["auto", "Automática"], ["livre", "Livre"]]
      : [["area", "Área"], ["linha", "Linha"], ["coluna", "Coluna"], ["livre", "Livre"]];

  // estados vazios — depois de TODOS os hooks (regra de hooks), antes do render
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

  return (
    <div>
      {/* F3: chips de Screen (contexto criável) + status SÓ quando há problema — o "OK"
          verde permanente era ruído (feedback do usuário); silêncio = tudo certo */}
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
        {status.c !== T.grn && <StatusPill color={status.c} label={status.l} />}
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
              <button onClick={novoCabo} style={ibtn()} title={`${novoWord} (N)`}><Plus size={16} /></button>
              <button onClick={inverter} style={ibtn()} title="Inverter início/fim da cadeia"><Repeat2 size={15} /></button>
              <button onClick={() => setActiveCable(null)} disabled={activeCable == null} style={ibtn({ opacity: activeCable == null ? 0.4 : 1, cursor: activeCable == null ? "not-allowed" : "pointer" })} title="Sair da edição (Esc)"><X size={15} /></button>
              <span style={sep} />
              <button onClick={undo} disabled={!history.length} style={ibtn({ opacity: history.length ? 1 : 0.4, cursor: history.length ? "pointer" : "not-allowed" })} title="Desfazer (Ctrl+Z)"><Undo2 size={15} /></button>
              <button onClick={limpar} style={ibtn()} title={isAc ? "Limpar circuitos" : "Limpar portas"}><Eraser size={15} /></button>
              <span style={{ marginLeft: "auto", color: T.dim, fontSize: 12 }}>
                {activeCable != null
                  ? <>Editando <b style={{ color: colorOf(activeCable) }}>{word} {activeCable + 1}</b>{isMobile ? " · toque nos gabinetes" : " · clique no 1º gabinete e estenda com as setas ↑↓←→ · Backspace volta"}</>
                  : cables.length ? `Selecione ${isAc ? "um circuito" : "uma porta"} na legenda` : `Importe do auto ou clique “${novoWord}”`}
              </span>
            </div>
          )}

          <div style={card({ padding: 0, overflow: "hidden" })}>
            <div style={{ padding: "12px 16px", borderBottom: `1px solid ${T.bd}`, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12 }}>{active.nome} · {isAc ? "Energia AC" : "Sinal"}</div>
                <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>
                  {bbox.w.toLocaleString("pt-BR")} × {bbox.h.toLocaleString("pt-BR")} px · {ports.length} {isAc ? (ports.length === 1 ? "circuito" : "circuitos") : (ports.length === 1 ? "porta" : "portas")}
                  {mode === "sinal" ? " · seguindo a rota do sinal" : " · a cadeia atravessa as telas do mesmo modelo"}
                </div>
                {isAc && balFases.temRodizio && (
                  <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>
                    Fases <b style={{ color: T.mut, fontFamily: "ui-monospace,monospace" }}>{fmtFases(balFases)}</b> · rodízio por Screen
                  </div>
                )}
              </div>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {/* OVERCLOCK (só sinal): arredonda gabinetes/porta PRA CIMA — escolha
                    explícita do técnico, gravada na Screen (screen.sinal.overclock) */}
                {!isAc && (
                  <button onClick={() => setCfg({ overclock: !cfg.overclock })} aria-pressed={cfg.overclock === true}
                    aria-label="Overclock" title="Arredonda gabinetes por porta pra cima — a porta pode passar da capacidade nominal. Teste no ensaio."
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, background: cfg.overclock ? T.sel : T.card2, border: `1px solid ${cfg.overclock ? T.acc : T.bd}`, color: cfg.overclock ? T.acM : T.mut, borderRadius: 8, padding: "7px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    <ChevronsUp size={14} />{!isMobile && " Overclock"}
                  </button>
                )}
                {/* CSV é fluxo de BANCADA (NovaLCT/Tessera no PC) — no celular sai da frente */}
                {!isAc && !isMobile && (
                  <button onClick={exportCSV} title="Baixa o mapa de pixels desta Screen (gabinete → porta → X/Y) em CSV pro NovaLCT / Tessera"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, borderRadius: 8, padding: "7px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    <Download size={14} /> Mapa de pixels
                  </button>
                )}
                {!isAc && !isMobile && (
                  <button onClick={exportLoomex} title="Baixa o projeto como .loomex.json — abre no Loomex (Importar) já com equipamentos, Screens e conexões desenhadas"
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, minHeight: 38, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, borderRadius: 8, padding: "7px 11px", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                    <Download size={14} /> Loomex
                  </button>
                )}
              </span>
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
                    activeCable={mode === "livre" ? activeCable : null}
                    limites={cortes.map((l) => ({ x1: R(l.x1), y1: R(l.y1), x2: R(l.x2), y2: R(l.y2) }))} />
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
                    title={p.oc ? "Overclock: acima da capacidade nominal por escolha" : p.cruza ? "Única cadeia que atravessa entre telas" : undefined}
                    style={{ display: "flex", alignItems: "center", gap: 8, background: isAct ? T.sel : T.card2, border: `1px solid ${p.over ? T.red : p.oc || p.warn ? T.amb : isAct ? T.acc : T.bd}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, cursor: mode === "livre" ? "pointer" : "default" }}>
                    <span style={{ width: 12, height: 12, borderRadius: 3, background: colorOf(i), flexShrink: 0 }} />
                    <span style={{ color: T.txt, fontWeight: 600 }}>{word} {p.n}</span>
                    {isAc && balFases.temRodizio && <span style={{ fontFamily: "ui-monospace,monospace", fontSize: 11, fontWeight: 700, color: T.acM, background: T.sel, borderRadius: 5, padding: "1px 6px" }}>{phaseOf(p.n, vc)}</span>}
                    {p.oc && <ChevronsUp size={13} color={T.amb} style={{ flexShrink: 0 }} />}
                    <span style={{ color: p.over ? T.red : p.oc || p.warn ? T.amb : T.mut }}>{isAc ? `${p.load.toFixed(1)} A (${p.pct}%)` : `${p.pct}%`}</span>
                    <span style={{ color: T.dim }}>· {p.count} gab{p.cruza || p.partida ? ` · ${p.telas.join(" → ")}` : ""}</span>
                    {mode === "livre" && <X size={13} color={T.dim} onClick={(e) => { e.stopPropagation(); removerCabo(i); }} style={{ cursor: "pointer" }} />}
                  </div>
                );
              })}
              {mode === "livre" && <button onClick={novoCabo} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px dashed ${T.bd}`, borderRadius: 8, padding: "5px 10px", fontSize: 12, color: T.mut, cursor: "pointer" }}><Plus size={13} /> {novoWord}</button>}
            </div>
          </div>
        </>
      )}

      {/* Avançado da Screen: modal LEVE (não preenche a tela) — botão mora na linha
          das sub-abas (ProjectCabeamento); o modal fica aqui, onde vive o contexto */}
      {advOpen && (
        <LightModal title={`Avançado · ${active.nome} · ${isAc ? "AC" : "Sinal"}`} onClose={onAdvClose}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {/* vínculo equipamento→Screen: link vivo (id) + snapshot congelado —
                mesmo padrão cabId+gabinete das telas. Reselecionar = atualizar. */}
            {!isAc && (
              <span style={{ gridColumn: "1 / -1" }}>
                <Drop fluid label="Equipamento" title="Quem alimenta esta Screen — as saídas de dados dele viram as conexões do export Loomex"
                  options={[["", "— sem equipamento"], ...equips.map((e) => [e.id, e.nome])]}
                  value={active.equipamentoId || ""}
                  onChange={(v) => { const eq = equips.find((e) => e.id === v); patchActive({ equipamentoId: eq ? eq.id : undefined, equipamento: equipSnapshot(eq) }); }} />
                <EquipStatus st={screenEquipStatus(active, telas, numbering)} />
              </span>
            )}
            {!isAc && <Drop fluid label="Régua" title="Área = regra do retângulo (a porta reserva o retângulo; a mais usada). Pixels = Free Topology (conta o gabinete real; exige controladora com a função)." options={[["area", "Área (retângulo)"], ["px", "Pixels (real)"]]} value={rule} onChange={setRegua} />}
            <Drop fluid label="Disposição" title={`Como a cadeia é cortada em ${isAc ? "circuitos" : "portas"}`} options={dispOpts} value={disp} onChange={setDisp} />
            {mode === "auto" && <>
              <Drop fluid label="Sentido" options={[["updown", "Sobe/desce"], ["zigzag", "Zig-zag"]]} value={cfg.routing || "updown"} onChange={(v) => setCfg({ routing: v })} />
              <Drop fluid label="Início" title="Canto onde a cadeia começa — case com a montagem física" options={[["bl", "Inf-esq"], ["br", "Inf-dir"], ["tl", "Sup-esq"], ["tr", "Sup-dir"]]} value={cfg.corner || "bl"} onChange={(v) => setCfg({ corner: v })} />
            </>}
            {!isAc && <Drop fluid label="Cor" title="10-bit dobra os dados por pixel — metade dos px por porta" options={[[8, "8-bit"], [10, "10-bit"]]} value={cfg.bits === 10 ? 10 : 8} onChange={(v) => setCfg({ bits: Number(v) })} />}
            {!isAc && (
              <span style={{ gridColumn: "1 / -1" }} title="Ceil em vez de floor na conta de gabinetes por porta. Acima da capacidade nominal — teste no ensaio.">
                <PrefToggle on={cfg.overclock === true} onClick={() => setCfg({ overclock: !cfg.overclock })}
                  titulo="Overclock" desc="Arredonda gabinetes/porta pra cima — a porta pode passar da capacidade nominal" />
              </span>
            )}
            {/* régua de ÁREA: o vão entre painéis separados entra ou não na cota da
                porta. Padrão NÃO (região por painel — Unico, SmartLCT, Complex Screen);
                quem monta retângulo simples na controladora liga e paga o vazio. */}
            {!isAc && rule === "area" && (
              <span style={{ gridColumn: "1 / -1" }} title="Ligado, a porta reserva um retângulo só, do primeiro ao último gabinete — o vão entre painéis vai junto. Desligado, cada painel encostado é um retângulo, e o vão fica de fora.">
                <PrefToggle on={cfg.vaoConta === true} onClick={() => setCfg({ vaoConta: !cfg.vaoConta })}
                  titulo="Vão conta no retângulo" desc="Desligado: um retângulo por painel encostado (região por painel). Ligado: retângulo único — o vão gasta cota da porta" />
              </span>
            )}
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

// feedback do vínculo: precisa N × tem M — informa, não bloqueia (padrão da casa)
function EquipStatus({ st }) {
  const color = !st ? T.dim : st.ok ? T.grn : T.amb;
  const texto = !st
    ? "Sem equipamento — a régua segue manual."
    : `Portas de dados: precisa ${st.necessarias} · o equipamento tem ${st.disponiveis} saída${st.disponiveis === 1 ? "" : "s"}.`;
  return <div style={{ color, fontSize: 11.5, marginTop: 6, fontWeight: 500, textTransform: "none" }}>{texto}</div>;
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
