// components/CablingPrefs.jsx — os controles de preferência do CABEAMENTO
// (numeração, render do mapa e cores), compartilhados entre as Configurações
// globais e o ajuste CONTEXTUAL na aba Cabeamento.
//
// Por que existir: "ação frequente não mora em Configurações — mora contextual à
// feature que afeta" (guia oficial do Android; NN/g). Estas decisões são tomadas
// OLHANDO o mapa de cabos; o drawer global fica a 3+ toques de distância. Um
// componente só = mesmas prefs, zero estado duplicado.
import { RotateCcw } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { T, PALETTE } from "../ui/tokens.js";
import { btn } from "../ui/styles.js";
import NumberingPicker from "./NumberingPicker.jsx";

// ── Numeração dos cabos (zigzag/serpente + 8 ordens) ──
export function NumeracaoPrefs() {
  const { prefs, setPrefs } = useLedLabContext();
  return (
    <div>
      <div style={subDesc}><b>Zigzag</b> recomeça do mesmo lado; <b>Serpente</b> inverte a cada faixa (NovaLCT).</div>
      <NumberingPicker value={prefs.cableNumbering || "row-tb-lr"} onChange={(v) => setPrefs({ ...prefs, cableNumbering: v })} />
    </div>
  );
}

// ── Render do mapa (setas, numeração por gabinete, tamanho e canto do número) ──
export function MapaCabosPrefs() {
  const { prefs, setPrefs } = useLedLabContext();
  const cr = { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl", ...(prefs.cablingRender || {}) };
  const setCr = (patch) => setPrefs({ ...prefs, cablingRender: { ...cr, ...patch } });
  return (
    <div>
      <PrefToggle on={cr.arrows} onClick={() => setCr({ arrows: !cr.arrows })} titulo="Setas de direção" desc="O sentido da corrente no cabo." />
      <div style={{ height: 6 }} />
      <PrefToggle on={cr.numbers} onClick={() => setCr({ numbers: !cr.numbers })} titulo="Numerar gabinetes" desc="Ordem no cabo, dentro do gabinete." />
      {cr.numbers && (
        <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flexWrap: "wrap", marginTop: 12 }}>
          <div>
            <div style={subLabel}>Tamanho</div>
            <div style={segRow}>
              {[["sm", "P"], ["md", "M"], ["lg", "G"]].map(([k, l]) => (
                <button key={k} type="button" onClick={() => setCr({ numberSize: k })} title={{ sm: "Pequeno", md: "Médio", lg: "Grande" }[k]} style={segBtn(cr.numberSize === k)}>{l}</button>
              ))}
            </div>
          </div>
          <div>
            <div style={subLabel}>Posição</div>
            <CornerPicker value={cr.numberPos} onChange={(v) => setCr({ numberPos: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cores dos cabos (paleta configurável; cai na PALETTE padrão quando não customizada) ──
export function CoresPrefs() {
  const { prefs, setPrefs } = useLedLabContext();
  const palette = Array.isArray(prefs.cablePalette) && prefs.cablePalette.length ? prefs.cablePalette : PALETTE;
  const setPalette = (arr) => setPrefs({ ...prefs, cablePalette: arr });
  const setColor = (i, c) => setPalette(palette.map((x, j) => (j === i ? c : x)));
  const addColor = () => setPalette([...palette, "#7c3aed"]);
  const removeColor = (i) => { if (palette.length > 2) setPalette(palette.filter((_, j) => j !== i)); };
  const resetPalette = () => setPrefs({ ...prefs, cablePalette: undefined });
  return (
    <div>
      <div style={subDesc}>Um quadrado por cabo, na ordem — toque pra trocar.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 10, margin: "10px 0 10px", alignItems: "flex-start" }}>
        {palette.map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3 }}>
            <div style={{ position: "relative" }}>
              <input type="color" value={c} onChange={(e) => setColor(i, e.target.value)} title={`Cabo ${i + 1}`}
                style={{ width: 34, height: 34, border: `1px solid ${T.bd}`, borderRadius: 7, background: "none", cursor: "pointer", padding: 2 }} />
              {palette.length > 2 && (
                <button onClick={() => removeColor(i)} title="Remover cor"
                  style={{ position: "absolute", top: -6, right: -6, width: 17, height: 17, borderRadius: "50%", background: T.card, border: `1px solid ${T.bd}`, color: T.mut, cursor: "pointer", fontSize: 11, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>×</button>
              )}
            </div>
            <span style={{ color: T.dim, fontSize: 9 }}>{i + 1}</span>
          </div>
        ))}
        <button onClick={addColor} title="Adicionar cor"
          style={{ width: 34, height: 34, borderRadius: 7, border: `1px dashed ${T.bd}`, background: "transparent", color: T.mut, cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
        <button style={{ ...btn("subtle", { padding: "7px 10px", fontSize: 12 }), marginLeft: "auto" }} onClick={resetPalette} title="Restaurar paleta padrão"><RotateCcw size={13} /> Padrão</button>
      </div>
    </div>
  );
}

// interruptor de preferência (liga/desliga) com título e descrição
export function PrefToggle({ on, onClick, titulo, desc }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left", background: T.card2, border: `1px solid ${on ? T.acc : T.bd}`, borderRadius: 8, padding: "8px 11px", cursor: "pointer", fontFamily: "inherit" }}>
      <span><span style={{ color: T.txt, fontWeight: 600, fontSize: 13 }}>{titulo}</span>{desc && <><br /><span style={{ color: T.dim, fontSize: 11 }}>{desc}</span></>}</span>
      <span style={{ flexShrink: 0, fontSize: 11, fontWeight: 700, color: on ? T.acM : T.mut }}>{on ? "SIM" : "NÃO"}</span>
    </button>
  );
}

// seletor visual do canto do número (2×2): um mini-gabinete com o "1" no canto escolhido
function CornerPicker({ value, onChange }) {
  const corners = [["tl", "Sup-esq"], ["tr", "Sup-dir"], ["bl", "Inf-esq"], ["br", "Inf-dir"]];
  const at = { tl: { top: 5, left: 5 }, tr: { top: 5, right: 5 }, bl: { bottom: 5, left: 5 }, br: { bottom: 5, right: 5 } };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 36px)", gap: 6 }}>
      {corners.map(([k, label]) => {
        const active = value === k;
        return (
          <button key={k} type="button" onClick={() => onChange(k)} title={label} aria-label={label}
            style={{ position: "relative", width: 36, height: 36, borderRadius: 6, cursor: "pointer", background: active ? T.sel : T.card2, border: `1px solid ${active ? T.acc : T.bd}` }}>
            <span style={{ position: "absolute", ...at[k], width: 11, height: 11, borderRadius: 3, background: active ? T.acc : T.dim2, color: active ? T.accInk : "#fff", fontSize: 8, fontWeight: 700, display: "grid", placeItems: "center" }}>1</span>
          </button>
        );
      })}
    </div>
  );
}

const subLabel = { color: T.txt, fontWeight: 600, fontSize: 12, marginBottom: 4 };
const subDesc = { color: T.dim, fontSize: 11.5, marginBottom: 6, lineHeight: 1.45 };
const segRow = { display: "inline-flex", background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 3, gap: 3 };
const segBtn = (active) => ({ width: 30, padding: "6px 0", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: active ? T.acc : "transparent", color: active ? T.accInk : T.mut });
