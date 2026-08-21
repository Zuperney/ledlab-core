// pages/project/ProjectScreens.jsx — o técnico monta as Screens à mão.
//
// Uma Screen = o que você decide que vai no MESMO sistema (a "Screen" do NovaLCT):
// você cria, dá nome, coloca só as telas que quer e arruma como configuraria. O app
// NÃO agrupa sozinho — quem junta é você, e o motivo muitas vezes é a logística do
// evento (o que é montado quando), não a geometria. Um projeto pode ter 1 Screen com
// tudo ou várias; cada uma tem origem própria (0,0), igual no NovaLCT.
//
// Aqui é só o AGRUPAMENTO e o LAYOUT. O cabeamento de cada Screen fica na aba Cabos.
import { useRef, useState, useMemo, useEffect } from "react";
import { Layers, Plus, Wand2, Trash2, X, AlertTriangle, Scissors, Merge } from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useConfirm } from "../../store/UIContext.jsx";
import { T } from "../../ui/tokens.js";
import { card, btn, input, label as lbl } from "../../ui/styles.js";
import Placeholder from "../../components/Placeholder.jsx";
import NumField from "../../components/NumField.jsx";
import HelpTip from "../../components/HelpTip.jsx";
import { genId } from "../../services/ids.js";
import { overlappingIds, snapAxis, gapsAround } from "../../services/layout.js";
import { dimOf, modelKey } from "../../services/canvasCabling.js";
import { makeScreen, unassignedTelas, screenTelas, screenSize, screenResolucao, arrangeScreen, addTela, removeTela, oneScreenPerTela, vaoOf, cortesDe, quantasPartes, partirTela, juntarTela } from "../../services/screens.js";

// cor por modelo de gabinete (estável no projeto): mesma cor = a cadeia pode
// encadear entre as telas. Numa Screen que mistura modelos, isso mostra o que junta.
const MODEL_COLORS = [T.acM, T.grn, T.amb, "#60a5fa", "#f472b6", "#2dd4bf"];
const iconBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 36, height: 36, borderRadius: 8, background: "transparent", border: `1px solid ${T.bd}`, color: T.mut, cursor: "pointer", padding: 0, flexShrink: 0 };

export default function ProjectScreens({ project, patch }) {
  const telas = useMemo(() => project.telas || [], [project.telas]);
  const screens = useMemo(() => project.screens || [], [project.screens]);
  const isMobile = useIsMobile();
  const confirm = useConfirm();

  const [activeId, setActiveId] = useState(screens[0]?.id || null);
  const [sel, setSel] = useState(null);
  const [wrapW, setWrapW] = useState(320);
  const [drag, setDrag] = useState(null);
  // modo Partir: enquanto ligado, o clique corta em vez de arrastar
  const [partindo, setPartindo] = useState(false);
  const [mira, setMira] = useState(null); // a divisão sob o ponteiro, no modo Partir
  const wrapRef = useRef(null);
  const dragRef = useRef(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth));
    ro.observe(el);
    setWrapW(el.clientWidth);
    return () => ro.disconnect();
  }, [activeId]);

  const models = useMemo(() => [...new Set(telas.map(modelKey))], [telas]);
  const colorOfModel = (t) => MODEL_COLORS[models.indexOf(modelKey(t)) % MODEL_COLORS.length];

  const setScreens = (next) => patch({ screens: next });
  const patchScreen = (id, partial) => setScreens(screens.map((s) => (s.id === id ? { ...s, ...partial } : s)));

  const createScreen = () => {
    const id = genId("screen");
    setScreens([...screens, makeScreen(id, `Screen ${screens.length + 1}`)]);
    setActiveId(id);
    setSel(null);
  };
  const perTela = () => {
    const next = oneScreenPerTela(telas, () => genId("screen"));
    setScreens(next);
    setActiveId(next[0]?.id || null);
  };

  if (!telas.length) return <Placeholder icon={Layers} title="Sem telas" description="Adicione telas na aba Dados para montar as Screens." />;

  if (!screens.length) {
    return (
      <div style={card({ textAlign: "center", padding: "32px 20px" })}>
        <Layers size={30} color={T.acM} style={{ marginBottom: 10 }} />
        <div style={{ color: T.txt, fontWeight: 600, marginBottom: 6 }}>Nenhuma Screen ainda</div>
        <p style={{ color: T.mut, fontSize: 13, maxWidth: 460, margin: "0 auto 16px", lineHeight: 1.5 }}>
          Uma Screen é o que você decide que vai no mesmo sistema — como você montaria no NovaLCT.
          Junte as telas que quer, do jeito que faz sentido pro evento.
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
          <button style={btn("primary")} onClick={createScreen}><Plus size={15} /> Nova Screen</button>
          <button style={btn("ghost")} onClick={perTela} title="Cada tela vira uma Screen sozinha — pra quem não quer agrupar">1 Screen por tela</button>
        </div>
      </div>
    );
  }

  const active = screens.find((s) => s.id === activeId) || screens[0];
  const membros = screenTelas(active, telas);
  const disponiveis = unassignedTelas(screens, telas);
  const posOf = (t) => (drag && drag.id === t.id ? drag : active.pos?.[t.id] || { x: 0, y: 0 });
  const overlapIds = overlappingIds(membros.map((t) => { const p = posOf(t), d = dimOf(t); return { id: t.id, x: p.x, y: p.y, w: d.w, h: d.h }; }));
  // bbox reagindo ao arraste em andamento (pro canvas não "pular"); screenSize é barato, sem hook
  const emArraste = drag ? { ...active, pos: { ...active.pos, [drag.id]: { x: drag.x, y: drag.y } } } : active;
  const size = screenSize(emArraste, telas);
  // ⚠️ DUAS MEDIDAS, DOIS NOMES. `size` é a caixa que o DESENHO ocupa — é ela que
  // dimensiona o canvas aqui. `res` é a RESOLUÇÃO, sem o vão: o vão é referência
  // visual de como as telas ficam separadas no palco, não é LED e não é
  // processamento. Mostrar a caixa com cara de resolução fazia o técnico levar
  // pro NovaLCT um número maior que a Screen.
  const res = screenResolucao(emArraste, telas);

  const maxH = isMobile ? 260 : 380;
  const scale = size.w && size.h ? Math.min(wrapW / size.w, maxH / size.h, 1) : 1;

  // VÃO: a folga padrão da Screen. Entra no encaixe do arraste (toda folga sai do
  // mesmo tamanho), no auto-arrumar e na entrada de tela nova.
  const vao = vaoOf(active);

  // ── PARTIR A TELA (corte de processamento) ──────────────────
  // A tela é uma só no palco; o corte diz onde o PROCESSAMENTO divide ela. É o
  // que substitui o velho truque de duplicar a tela e chamar de "parte 1" e
  // "parte 2" — que funcionava no desenho e mentia no peso, na área e na
  // elétrica. Ver `services/screens.js`.
  const telaSel = sel ? membros.find((t) => t.id === sel) : null;
  const cortesSel = telaSel ? cortesDe(active, telaSel) : null;
  const cortar = (telaId, eixo, indice) =>
    setScreens(screens.map((s) => (s.id === active.id ? partirTela(s, telaId, eixo, indice) : s)));
  const juntar = (telaId) =>
    setScreens(screens.map((s) => (s.id === active.id ? juntarTela(s, telaId) : s)));

  /**
   * Onde o clique quer cortar: a divisão entre gabinetes mais próxima do
   * ponteiro, na vertical OU na horizontal — a que estiver mais perto.
   *
   * Divisão de BORDA não conta (0 e cols/rows): cortar na borda não parte nada,
   * e oferecer isso seria um clique que não faz nada.
   */
  const cortePerto = (tela, e) => {
    const p = posOf(tela);
    const el = e.currentTarget.getBoundingClientRect();
    const resX = parseFloat(tela.gabinete?.resX) || 128;
    const resY = parseFloat(tela.gabinete?.resY) || 128;
    const px = (e.clientX - el.left) / scale, py = (e.clientY - el.top) / scale;
    const cx = Math.round(px / resX), cy = Math.round(py / resY);
    const dx = Math.abs(px - cx * resX), dy = Math.abs(py - cy * resY);
    const valeX = cx > 0 && cx < (tela.cols || 1);
    const valeY = cy > 0 && cy < (tela.rows || 1);
    if (valeX && (!valeY || dx <= dy)) return { eixo: "x", indice: cx, pos: p.x + cx * resX };
    if (valeY) return { eixo: "y", indice: cy, pos: p.y + cy * resY };
    return null;
  };
  // cotas de px do vão: da tela em arraste (ou da selecionada) pros vizinhos que
  // ela encara — é o que responde "quanto de folga tem aqui" sem contar gabinete.
  const rectOf = (t) => { const p = posOf(t), d = dimOf(t); return { x: p.x, y: p.y, w: d.w, h: d.h }; };
  const cotaId = drag?.id || sel;
  const cotaAlvo = cotaId ? membros.find((t) => t.id === cotaId) : null;
  const cotas = cotaAlvo ? gapsAround(rectOf(cotaAlvo), membros.filter((t) => t.id !== cotaId).map(rectOf)) : [];

  const deleteScreen = async (id) => {
    if (!(await confirm({ title: "Excluir Screen?", message: "As telas voltam pra lista de disponíveis — não são apagadas." }))) return;
    const next = screens.filter((s) => s.id !== id);
    setScreens(next);
    if (activeId === id) setActiveId(next[0]?.id || null);
    setSel(null);
  };
  const addToActive = (telaId) => setScreens(addTela(screens, active.id, telaId, telas));
  const removeFromActive = (telaId) => { setScreens(removeTela(screens, active.id, telaId)); if (sel === telaId) setSel(null); };
  const arrangeActive = () => patchScreen(active.id, { pos: arrangeScreen(active, telas) });
  const setPos = (telaId, x, y) => patchScreen(active.id, { pos: { ...active.pos, [telaId]: { x: Math.round(x), y: Math.round(y) } } });

  const dragAt = (c, ev) => ({
    x: Math.max(0, snapAxis(c.ox + (ev.clientX - c.startX) / scale, c.d.w, c.xs, c.vao, c.thr)),
    y: Math.max(0, snapAxis(c.oy + (ev.clientY - c.startY) / scale, c.d.h, c.ys, c.vao, c.thr)),
  });
  const onDown = (e, t) => {
    e.preventDefault();
    setSel(t.id);
    // NO MODO PARTIR O CLIQUE CORTA, não arrasta: sem isso o gesto de cortar
    // mexeria a tela de lugar junto, e o técnico perderia a montagem por tentar
    // partir uma parede.
    if (partindo) {
      const alvo = cortePerto(t, e);
      if (alvo) cortar(t.id, alvo.eixo, alvo.indice);
      return;
    }
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = posOf(t), d = dimOf(t);
    const others = membros.filter((x) => x.id !== t.id).map((x) => ({ p: posOf(x), d: dimOf(x) }));
    dragRef.current = {
      id: t.id, startX: e.clientX, startY: e.clientY, ox: p.x, oy: p.y, d, vao,
      xs: others.map((o) => [o.p.x, o.p.x + o.d.w]),
      ys: others.map((o) => [o.p.y, o.p.y + o.d.h]),
      thr: 9 / scale,
    };
  };
  const onMove = (e, t) => {
    // a MIRA: no modo Partir o ponteiro realça a divisão que o clique vai cortar
    if (partindo) { setMira(t ? { telaId: t.id, ...(cortePerto(t, e) || {}) } : null); return; }
    const c = dragRef.current;
    if (c) setDrag({ id: c.id, ...dragAt(c, e) });
  };
  const onUp = (e) => {
    if (partindo) return;
    const c = dragRef.current; if (!c) return;
    const f = dragAt(c, e);
    dragRef.current = null;
    setDrag(null);
    setPos(c.id, f.x, f.y);
  };

  const selTela = membros.find((t) => t.id === sel);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* abas de Screen */}
      <div className="no-scrollbar" style={{ display: "flex", gap: 6, overflowX: "auto", alignItems: "center" }}>
        {screens.map((s) => {
          const on = s.id === active.id;
          return (
            <button key={s.id} onClick={() => { setActiveId(s.id); setSel(null); }}
              style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0, padding: "6px 12px", borderRadius: 8, cursor: "pointer",
                background: on ? T.sel : T.card2, border: `1px solid ${on ? T.acc : T.bd}`, color: on ? T.txt : T.mut, fontWeight: 600, fontSize: 13 }}>
              {s.nome} <span style={{ color: T.dim, fontWeight: 400 }}>· {(s.telaIds || []).length}</span>
            </button>
          );
        })}
        {/* R1: criar a Screen é a razão da aba — primária roxa */}
        <button style={{ ...btn("primary"), flexShrink: 0 }} onClick={createScreen}><Plus size={15} /> Nova</button>
      </div>

      <div style={card()}>
        {/* nome + auto-arrumar (ícone) + excluir NUMA linha (pedido do usuário) */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <input value={active.nome} onChange={(e) => patchScreen(active.id, { nome: e.target.value })}
            style={{ flex: 1, minWidth: 0, background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 8, color: T.txt, fontWeight: 600, fontSize: 15, padding: "7px 10px" }} />
          {/* PARTIR: o corte de processamento. Só aparece com tela selecionada —
              botão que não pode agir é botão que ensina errado. */}
          <button
            style={{ ...iconBtn, ...(partindo ? { borderColor: T.acc, color: T.acM } : {}) }}
            onClick={() => { setPartindo((v) => !v); setMira(null); }}
            disabled={!telaSel}
            aria-pressed={partindo}
            title={telaSel
              ? "Partir a tela: clique na divisão entre gabinetes pra cortar. O processamento trata cada parte como um sistema à parte."
              : "Selecione uma tela para partir"}
            aria-label="Partir a tela"
          ><Scissors size={15} /></button>
          {cortesSel && (
            <button style={iconBtn} onClick={() => juntar(telaSel.id)}
              title={`Juntar ${telaSel.nome}: tira todos os cortes e ela volta a ser uma parte só`}
              aria-label="Juntar a tela"><Merge size={15} /></button>
          )}
          <button style={iconBtn} onClick={arrangeActive} disabled={!membros.length} title="Auto-arrumar: agrupa por modelo, empilha as faixas e aplica o vão — você ajusta arrastando" aria-label="Auto-arrumar"><Wand2 size={15} /></button>
          <button style={{ ...iconBtn, color: T.red }} onClick={() => deleteScreen(active.id)} title="Excluir esta Screen" aria-label="Excluir Screen"><Trash2 size={15} /></button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <span
            style={{ color: T.dim, fontSize: 11.5, fontFamily: "ui-monospace, monospace" }}
            title={res.temVao
              ? "Resolução = só o LED. O vão entre as telas é referência de montagem e não entra na conta."
              : "Resolução da Screen"}
          >
            <b style={{ color: T.mut }}>{res.w.toLocaleString("pt-BR")} × {res.h.toLocaleString("pt-BR")} px</b>
            {res.temVao && ` · ${size.w.toLocaleString("pt-BR")} × ${size.h.toLocaleString("pt-BR")} no desenho`}
          </span>
          {/* o vão muda O QUE A SCREEN É (a montagem), então mora aqui no conteúdo —
              não em ajustes de exibição. Arrastar encaixa nele; o auto-arrumar aplica.
              Ele é DESENHO: separa as telas na figura e no papel, e nunca vira pixel. */}
          {/* quantas PARTES a Screen tem, quando alguma tela é partida — é o
              chip que torna o corte visível sem abrir o mapa */}
          {membros.some((t) => quantasPartes(active, t) > 1) && (
            <span style={{ color: T.acM, fontSize: 11.5, whiteSpace: "nowrap" }}>
              {membros.filter((t) => quantasPartes(active, t) > 1)
                .map((t) => `${t.nome} · partida em ${quantasPartes(active, t)}`)
                .join(" · ")}
            </span>
          )}
          {partindo && (
            <span style={{ color: T.dim, fontSize: 11.5, whiteSpace: "nowrap" }}>
              clique na divisão entre gabinetes — de novo no corte pra tirar
            </span>
          )}
          <label style={{ marginLeft: "auto", display: "inline-flex", alignItems: "center", gap: 6, color: T.mut, fontSize: 12, whiteSpace: "nowrap" }}>
            Vão (px)
            <NumField value={vao} onChange={(v) => patchScreen(active.id, { vao: Math.max(0, v) })}
              style={input({ width: 86, fontFamily: "ui-monospace, monospace", textAlign: "right" })} />
          </label>
        </div>

        {/* telas disponíveis ACIMA do canvas — embaixo elas somem quando entra tela grande */}
        {disponiveis.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10 }}>
            <span style={{ color: T.dim, fontSize: 11, textTransform: "uppercase", letterSpacing: "0.05em" }}>Adicionar:</span>
            {disponiveis.map((t) => (
              <button key={t.id} onClick={() => addToActive(t.id)} title={`Adicionar ${t.nome} a ${active.nome}`}
                style={{ display: "flex", alignItems: "center", gap: 6, background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "6px 10px", fontSize: 12, cursor: "pointer", color: T.txt }}>
                <Plus size={13} color={T.acM} /> {t.nome} <span style={{ color: T.dim }}>{t.cols}×{t.rows}</span>
              </button>
            ))}
          </div>
        )}

        {overlapIds.size > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: T.card2, border: `1px solid ${T.red}`, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
            <AlertTriangle size={15} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: T.mut, fontSize: 12 }}>Telas sobrepostas ocupam a mesma coordenada — a controladora não aceita. Arraste até encostarem sem invadir.</span>
          </div>
        )}

        <div ref={wrapRef} style={{ background: "#08080f", border: `1px solid ${T.bd}`, borderRadius: 8, padding: 8, overflow: "hidden" }}>
          {membros.length ? (
            <div style={{ position: "relative", width: size.w * scale, height: size.h * scale, margin: "0 auto", background: T.bg, outline: `1px dashed ${T.dim2}` }}>
              {membros.map((t) => {
                const p = posOf(t), d = dimOf(t), col = colorOfModel(t), over = overlapIds.has(t.id);
                const small = d.w * scale < 60;
                return (
                  <div key={t.id} onPointerDown={(e) => onDown(e, t)} onPointerMove={(e) => onMove(e, t)} onPointerUp={onUp}
                    onPointerLeave={() => partindo && setMira(null)}
                    style={{ position: "absolute", left: p.x * scale, top: p.y * scale, width: d.w * scale, height: d.h * scale,
                      background: (over ? T.red : col) + "26", border: `1.5px solid ${over ? T.red : col}`,
                      outline: sel === t.id ? `2px solid ${T.acL}` : "none", borderRadius: 3,
                      cursor: partindo ? "crosshair" : "grab", touchAction: "none",
                      overflow: "hidden", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 1 }}>
                    {/* a GRADE de gabinetes só aparece no modo Partir: é a régua
                        do gesto, e fora dele seria ruído em cima do desenho */}
                    {partindo && (
                      <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
                        backgroundImage: `linear-gradient(to right, ${T.dim2} 1px, transparent 1px), linear-gradient(to bottom, ${T.dim2} 1px, transparent 1px)`,
                        backgroundSize: `${(parseFloat(t.gabinete?.resX) || 128) * scale}px ${(parseFloat(t.gabinete?.resY) || 128) * scale}px`,
                        opacity: 0.5 }} />
                    )}
                    {!small && <span style={{ color: T.txt, fontSize: 11, fontWeight: 600, padding: "0 3px", textAlign: "center", lineHeight: 1.15 }}>{t.nome}</span>}
                    {!small && d.h * scale > 34 && <span style={{ color: T.mut, fontSize: 9 }}>{t.cols}×{t.rows}</span>}
                  </div>
                );
              })}
              {/* OS CORTES DE PROCESSAMENTO, sempre visíveis. Eles continuam
                  desenhados fora do modo Partir porque são parte do que a Screen
                  É — some a linha, some a explicação de por que a porta para ali. */}
              {membros.flatMap((t) => {
                const c = cortesDe(active, t);
                if (!c) return [];
                const p = posOf(t), d = dimOf(t);
                const resX = parseFloat(t.gabinete?.resX) || 128, resY = parseFloat(t.gabinete?.resY) || 128;
                const linha = (k, st) => (
                  <div key={k} style={{ position: "absolute", pointerEvents: "none", zIndex: 4, background: T.acc, ...st }} />
                );
                return [
                  ...c.x.map((cx) => linha(`${t.id}x${cx}`, {
                    left: (p.x + cx * resX) * scale - 1, top: p.y * scale, width: 2, height: d.h * scale,
                  })),
                  ...c.y.map((cy) => linha(`${t.id}y${cy}`, {
                    left: p.x * scale, top: (p.y + cy * resY) * scale - 1, width: d.w * scale, height: 2,
                  })),
                ];
              })}

              {/* A MIRA: a divisão que o próximo clique corta. Sem ela, cortar é
                  adivinhar onde o ponteiro caiu. */}
              {partindo && mira?.eixo && (() => {
                const t = membros.find((x) => x.id === mira.telaId);
                if (!t) return null;
                const p = posOf(t), d = dimOf(t);
                const vert = mira.eixo === "x";
                return (
                  <div style={{ position: "absolute", pointerEvents: "none", zIndex: 5, background: T.acM, opacity: 0.85,
                    left: vert ? mira.pos * scale - 1.5 : p.x * scale,
                    top: vert ? p.y * scale : mira.pos * scale - 1.5,
                    width: vert ? 3 : d.w * scale,
                    height: vert ? d.h * scale : 3 }} />
                );
              })()}

              {/* cota do vão: linha tracejada + o número em px, no meio da folga */}
              {cotas.map((g) => (
                <div key={g.dir} style={{ position: "absolute", pointerEvents: "none", zIndex: 3,
                  left: g.x * scale, top: g.y * scale,
                  width: g.axis === "x" ? g.len * scale : 0, height: g.axis === "y" ? g.len * scale : 0,
                  borderTop: g.axis === "x" ? `1px dashed ${T.mut}` : undefined,
                  borderLeft: g.axis === "y" ? `1px dashed ${T.mut}` : undefined }}>
                  <span style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%, -50%)",
                    background: T.card, border: `1px solid ${T.bd}`, borderRadius: 999, padding: "1px 6px",
                    color: T.txt, fontSize: 10, fontFamily: "ui-monospace, monospace", whiteSpace: "nowrap" }}>
                    {Math.round(g.gap).toLocaleString("pt-BR")} px
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: T.dim, fontSize: 13, textAlign: "center", padding: "28px 12px" }}>Screen vazia — adicione telas acima.</div>
          )}
        </div>

        {models.length > 1 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
            {models.map((m, i) => (
              <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: T.mut, fontSize: 11 }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: MODEL_COLORS[i % MODEL_COLORS.length] }} />{m} px
              </span>
            ))}
            <span style={{ color: T.dim, fontSize: 11, marginLeft: "auto" }}>Mesma cor = a cadeia pode continuar entre as telas</span>
          </div>
        )}
      </div>

      {selTela && (
        <div style={card()}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
            <span style={lbl}>{selTela.nome}</span>
            <button style={btn("ghost", { color: T.red })} onClick={() => removeFromActive(selTela.id)}><X size={13} /> Tirar desta Screen</button>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <NumField lbl="X (px)" value={active.pos?.[selTela.id]?.x || 0} onChange={(v) => setPos(selTela.id, v, active.pos?.[selTela.id]?.y || 0)} />
            <NumField lbl="Y (px)" value={active.pos?.[selTela.id]?.y || 0} onChange={(v) => setPos(selTela.id, active.pos?.[selTela.id]?.x || 0, v)} />
            <div style={{ color: T.dim, fontSize: 12, alignSelf: "flex-end", paddingBottom: 8 }}>{dimOf(selTela).w} × {dimOf(selTela).h} px · gabinete {modelKey(selTela)}</div>
          </div>
        </div>
      )}

      {/* didática sob demanda (o parágrafo fixo era teto permanente) */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, color: T.dim, fontSize: 11 }}>
        Screens do jeito da controladora
        <HelpTip title="Como montar as Screens" align="left">
          Você monta as Screens do jeito que configuraria na controladora — junte só o que vai no <b style={{ color: T.txt }}>mesmo sistema</b>. O cabeamento de cada Screen fica na aba Cabeamento. A montagem física fica no galpão; o canvas de conteúdo, na aba Composição.
          <br /><br />
          <b style={{ color: T.txt }}>Partir a tela</b> (tesoura) é pra quando o <b style={{ color: T.txt }}>processamento</b> divide a parede: selecione a tela, ligue a tesoura e clique na <b style={{ color: T.txt }}>divisão entre gabinetes</b> — clicar de novo no corte tira. A partir daí <b style={{ color: T.txt }}>nenhuma porta atravessa o corte</b>: o cabeamento trata cada parte como um sistema à parte, e o mapa desenha a linha. O corte pode ser desigual (10 + 6), e dá pra cortar na vertical e na horizontal.
          <br /><br />
          A tela continua <b style={{ color: T.txt }}>inteira no cadastro</b> — peso, área e elétrica seguem falando de uma parede só, porque no palco ela é uma só. O corte é de <b style={{ color: T.txt }}>vídeo</b>: os circuitos de AC continuam correndo pela tela toda. No Caderno as partes aparecem como <b style={{ color: T.txt }}>P1</b>, <b style={{ color: T.txt }}>P2</b>, na porta e no mapa de pixels.
          <br /><br />
          <b style={{ color: T.txt }}>Vão (px)</b> é a folga padrão entre telas: com ele definido, arrastar encaixa exatamente nessa distância (ou em encostado), o auto-arrumar separa tudo por ela e a tela nova entra respeitando-a — é o que evita três vãos parecidos e nenhum igual. A cota em px aparece no canvas na tela selecionada, medindo a folga até os vizinhos que ela encara. Os campos numéricos aceitam conta: <b style={{ color: T.txt }}>1920/2</b>, <b style={{ color: T.txt }}>192*3</b>.
        </HelpTip>
      </div>
    </div>
  );
}
