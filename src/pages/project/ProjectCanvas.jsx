// pages/project/ProjectCanvas.jsx — o canvas do PROCESSADOR: onde as telas ficam
// na parede que a controladora enxerga (a "Screen" do NovaLCT / Unico).
//
// Por que existe uma aba só pra isso: "tela" é invenção nossa — um bloco de
// gabinetes iguais, ótimo pra montar e pra lista de material, mas que NÃO existe no
// NovaLCT. Lá existe a Screen: uma parede só, com as portas 1..N da controladora
// correndo por cima dela. Enquanto cada tela for uma ilha, o cabo não atravessa e a
// conta de porta sai errada.
//
// E não dá pra reaproveitar a Composição: ela é o canvas de CONTEÚDO (o que o media
// server renderiza), que é outro layout. Exemplo real: 4 tiras encostadas aqui = 1
// porta a 60%; as mesmas 4 tiras espalhadas no canvas de conteúdo = 210% e estoura.
// Mesma corrente, veredito oposto — quem manda é ESTE canvas.
//
// Opcional: projeto sem canvas segue funcionando como antes.
import { useRef, useState, useMemo, useEffect } from "react";
import { LayoutGrid, Wand2, AlertTriangle, RotateCcw } from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { T } from "../../ui/tokens.js";
import { card, btn, label as lbl } from "../../ui/styles.js";
import Placeholder from "../../components/Placeholder.jsx";
import NumField from "../../components/NumField.jsx";
import { overlappingIds, packByModel } from "../../services/layout.js";

// resolução real da tela em pixels (mesma regra do draw: gabinete vazio = 128)
const dimOf = (t) => ({
  w: (t.cols || 1) * (parseFloat(t.gabinete?.resX) || 128),
  h: (t.rows || 1) * (parseFloat(t.gabinete?.resY) || 128),
});

// duas telas são do mesmo MODELO quando o gabinete tem a mesma resolução — é isso
// que decide se uma corrente pode passar de uma pra outra.
const modelOf = (t) => `${parseFloat(t.gabinete?.resX) || 128}x${parseFloat(t.gabinete?.resY) || 128}`;

// cor por modelo de gabinete: o agrupamento por modelo é a regra do canvas, então
// ele precisa estar VISÍVEL — mesma cor = pode encadear junto.
const MODEL_COLORS = [T.acM, T.grn, T.amb, "#60a5fa", "#f472b6", "#2dd4bf"];

// encaixa a borda (v ou v+size) na borda-alvo mais próxima dentro do limiar
const snap = (v, size, targets, thr) => {
  for (const tgt of targets) {
    if (Math.abs(v - tgt) <= thr) return tgt;
    if (Math.abs(v + size - tgt) <= thr) return tgt - size;
  }
  return v;
};

export default function ProjectCanvas({ project, patch }) {
  const telas = useMemo(() => project.telas || [], [project.telas]);
  const canvas = useMemo(() => project.canvas || {}, [project.canvas]);
  const isMobile = useIsMobile();

  const wrapRef = useRef(null);
  const dragRef = useRef(null);
  const [wrapW, setWrapW] = useState(320);
  const [drag, setDrag] = useState(null);
  const [sel, setSel] = useState(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setWrapW(el.clientWidth));
    ro.observe(el);
    setWrapW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // modelos distintos, na ordem das telas → índice de cor estável
  const models = useMemo(() => [...new Set(telas.map(modelOf))], [telas]);

  // posições salvas; tela ainda sem posição entra pelo empacotador (o padrão já é
  // o layout que o operador montaria na mão, não uma pilha em cima da origem)
  const positions = useMemo(() => {
    const saved = canvas.pos || {};
    const faltantes = telas.filter((t) => !saved[t.id]);
    if (!faltantes.length) return saved;
    const auto = packByModel(telas.map((t) => ({ id: t.id, ...dimOf(t), model: modelOf(t) })));
    const pos = { ...saved };
    for (const t of faltantes) pos[t.id] = auto.pos[t.id] || { x: 0, y: 0 };
    return pos;
  }, [telas, canvas.pos]);

  const posOf = (t) => (drag && drag.id === t.id ? drag : positions[t.id]);

  // sobreposição = dois gabinetes na mesma coordenada: o processador não aceita
  const overlapIds = overlappingIds(telas.map((t) => { const p = posOf(t), d = dimOf(t); return { id: t.id, x: p.x, y: p.y, w: d.w, h: d.h }; }));

  // o canvas é a caixa envolvente de tudo — igual ao NovaLCT, origem no sup-esq
  const bbox = useMemo(() => {
    if (!telas.length) return { w: 0, h: 0 };
    let maxX = 0, maxY = 0;
    for (const t of telas) {
      const p = positions[t.id], d = dimOf(t);
      maxX = Math.max(maxX, p.x + d.w); maxY = Math.max(maxY, p.y + d.h);
    }
    return { w: maxX, h: maxY };
  }, [telas, positions]);

  if (!telas.length) return <Placeholder icon={LayoutGrid} title="Sem telas" description="Adicione telas na aba Dados para montar o canvas do processador." />;

  const maxH = isMobile ? 300 : 420;
  const scale = bbox.w && bbox.h ? Math.min(wrapW / bbox.w, maxH / bbox.h, 1) : 1;

  const setPos = (id, x, y) => patch({ canvas: { ...canvas, pos: { ...positions, [id]: { x: Math.round(x), y: Math.round(y) } } } });
  const autoArrumar = () => {
    const { pos } = packByModel(telas.map((t) => ({ id: t.id, ...dimOf(t), model: modelOf(t) })));
    patch({ canvas: { ...canvas, pos } });
  };
  const limpar = () => patch({ canvas: { ...canvas, pos: {} } });

  const dragAt = (c, ev) => ({
    x: Math.max(0, snap(c.ox + (ev.clientX - c.startX) / scale, c.d.w, c.xs, c.thr)),
    y: Math.max(0, snap(c.oy + (ev.clientY - c.startY) / scale, c.d.h, c.ys, c.thr)),
  });
  const onDown = (e, t) => {
    e.preventDefault();
    setSel(t.id);
    e.currentTarget.setPointerCapture(e.pointerId);
    const p = positions[t.id], d = dimOf(t);
    const others = telas.filter((x) => x.id !== t.id).map((x) => ({ p: positions[x.id], d: dimOf(x) }));
    dragRef.current = {
      id: t.id, startX: e.clientX, startY: e.clientY, ox: p.x, oy: p.y, d,
      xs: [0, ...others.flatMap((o) => [o.p.x, o.p.x + o.d.w])],
      ys: [0, ...others.flatMap((o) => [o.p.y, o.p.y + o.d.h])],
      thr: 9 / scale,
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

  const selTela = telas.find((t) => t.id === sel);
  const status = overlapIds.size ? { l: `${overlapIds.size} sobrepostas`, c: T.red } : { l: "OK", c: T.grn };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={card()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
          <div>
            <div style={{ color: T.acM, fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.4 }}>Canvas do processador</div>
            <div style={{ color: T.dim, fontSize: 12, marginTop: 2 }}>
              {bbox.w.toLocaleString("pt-BR")} × {bbox.h.toLocaleString("pt-BR")} px · a parede como a controladora enxerga · origem no canto superior-esquerdo
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <span style={{ color: status.c, fontSize: 12, fontWeight: 600 }}>{status.l}</span>
            <button style={btn("ghost")} onClick={autoArrumar} title="Agrupa por modelo de gabinete e empilha as faixas"><Wand2 size={14} /> Auto-arrumar</button>
            <button style={btn("ghost")} onClick={limpar} title="Volta ao arranjo automático"><RotateCcw size={14} /></button>
          </div>
        </div>

        {overlapIds.size > 0 && (
          <div style={{ display: "flex", gap: 8, alignItems: "flex-start", background: T.card2, border: `1px solid ${T.red}`, borderRadius: 8, padding: "8px 10px", marginBottom: 10 }}>
            <AlertTriangle size={15} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />
            <span style={{ color: T.mut, fontSize: 12 }}>Telas sobrepostas ocupam a mesma coordenada no processador — ele não aceita. Arraste até encostarem sem invadir.</span>
          </div>
        )}

        <div ref={wrapRef} style={{ background: "#08080f", border: `1px solid ${T.bd}`, borderRadius: 8, padding: 8, overflow: "hidden" }}>
          <div style={{ position: "relative", width: bbox.w * scale, height: bbox.h * scale, margin: "0 auto", background: T.bg, outline: `1px dashed ${T.dim2}` }}>
            {telas.map((t) => {
              const p = posOf(t), d = dimOf(t);
              const col = MODEL_COLORS[models.indexOf(modelOf(t)) % MODEL_COLORS.length];
              const over = overlapIds.has(t.id);
              const small = d.w * scale < 60;
              return (
                <div key={t.id} onPointerDown={(e) => onDown(e, t)} onPointerMove={onMove} onPointerUp={onUp}
                  style={{
                    position: "absolute", left: p.x * scale, top: p.y * scale, width: d.w * scale, height: d.h * scale,
                    background: (over ? T.red : col) + "26", border: `1.5px solid ${over ? T.red : col}`,
                    outline: sel === t.id ? `2px solid ${T.acL}` : "none",
                    borderRadius: 3, cursor: "grab", touchAction: "none", overflow: "hidden",
                    display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", gap: 1,
                  }}>
                  {!small && <span style={{ color: T.txt, fontSize: 11, fontWeight: 600, padding: "0 3px", textAlign: "center", lineHeight: 1.15 }}>{t.nome}</span>}
                  {!small && d.h * scale > 34 && <span style={{ color: T.mut, fontSize: 9 }}>{t.cols}×{t.rows}</span>}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, alignItems: "center" }}>
          <span style={{ color: T.dim, fontSize: 11 }}>Modelo de gabinete:</span>
          {models.map((m, i) => (
            <span key={m} style={{ display: "inline-flex", alignItems: "center", gap: 5, color: T.mut, fontSize: 11 }}>
              <span style={{ width: 9, height: 9, borderRadius: 2, background: MODEL_COLORS[i % MODEL_COLORS.length] }} />{m} px
            </span>
          ))}
          <span style={{ color: T.dim, fontSize: 11, marginLeft: "auto" }}>Mesma cor = a corrente pode encadear entre as telas</span>
        </div>
      </div>

      {selTela && (
        <div style={card()}>
          <div style={{ ...lbl, marginBottom: 8 }}>Posição de {selTela.nome}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <NumField lbl="X (px)" value={positions[selTela.id].x} onChange={(v) => setPos(selTela.id, v, positions[selTela.id].y)} />
            <NumField lbl="Y (px)" value={positions[selTela.id].y} onChange={(v) => setPos(selTela.id, positions[selTela.id].x, v)} />
            <div style={{ color: T.dim, fontSize: 12, alignSelf: "flex-end", paddingBottom: 8 }}>
              {dimOf(selTela).w} × {dimOf(selTela).h} px · gabinete {modelOf(selTela)}
            </div>
          </div>
        </div>
      )}

      <div style={{ color: T.dim, fontSize: 11, lineHeight: 1.5 }}>
        O <b style={{ color: T.mut }}>Auto-arrumar</b> agrupa por modelo de gabinete e empilha as faixas — a corrente só encadeia gabinetes iguais, então juntar o mesmo modelo é o que permite uma porta atravessar telas.
        Este canvas é <b style={{ color: T.mut }}>outro</b> layout: a montagem física fica no galpão e o canvas de conteúdo fica na aba Composição.
      </div>
    </div>
  );
}
