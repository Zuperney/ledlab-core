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
      <div style={subDesc}><b>Zigzag</b> recomeça toda faixa do mesmo lado; <b>Serpente</b> flui contínuo, invertendo o sentido a cada faixa (padrão do NovaLCT).</div>
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
      <PrefToggle on={cr.arrows} onClick={() => setCr({ arrows: !cr.arrows })} titulo="Setas de direção" desc="Mostra pra onde a corrente corre em cada cabo." />
      <div style={{ height: 8 }} />
      <PrefToggle on={cr.numbers} onClick={() => setCr({ numbers: !cr.numbers })} titulo="Numerar gabinetes" desc="Número da ordem no cabo dentro de cada gabinete (some quando fica miúdo no zoom)." />
      {cr.numbers && (<>
        <div style={{ ...subLabel, marginTop: 16 }}>Tamanho do número</div>
        <div style={segRow}>
          {[["sm", "Pequeno"], ["md", "Médio"], ["lg", "Grande"]].map(([k, l]) => (
            <button key={k} type="button" onClick={() => setCr({ numberSize: k })} style={segBtn(cr.numberSize === k)}>{l}</button>
          ))}
        </div>
        <div style={{ ...subLabel, marginTop: 16 }}>Posição no gabinete</div>
        <CornerPicker value={cr.numberPos} onChange={(v) => setCr({ numberPos: v })} />
      </>)}
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
      <div style={subDesc}>Cor de cada cabo/porta na ordem (1, 2, 3…). Toque num quadrado pra trocar.</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, margin: "12px 0 14px" }}>
        {palette.map((c, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
            <div style={{ position: "relative" }}>
              <input type="color" value={c} onChange={(e) => setColor(i, e.target.value)} title={`Cabo ${i + 1}`}
                style={{ width: 42, height: 42, border: `1px solid ${T.bd}`, borderRadius: 8, background: "none", cursor: "pointer", padding: 2 }} />
              {palette.length > 2 && (
                <button onClick={() => removeColor(i)} title="Remover cor"
                  style={{ position: "absolute", top: -7, right: -7, width: 20, height: 20, borderRadius: "50%", background: T.card, border: `1px solid ${T.bd}`, color: T.mut, cursor: "pointer", fontSize: 13, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 0 }}>×</button>
              )}
            </div>
            <span style={{ color: T.dim, fontSize: 10 }}>{i + 1}</span>
          </div>
        ))}
        <button onClick={addColor} title="Adicionar cor"
          style={{ width: 42, height: 42, marginTop: 1, borderRadius: 8, border: `1px dashed ${T.bd}`, background: "transparent", color: T.mut, cursor: "pointer", fontSize: 22, display: "flex", alignItems: "center", justifyContent: "center" }}>+</button>
      </div>
      <button style={btn("subtle")} onClick={resetPalette}><RotateCcw size={14} /> Restaurar padrão</button>
    </div>
  );
}

// interruptor de preferência (liga/desliga) com título e descrição
export function PrefToggle({ on, onClick, titulo, desc }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on}
      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, width: "100%", textAlign: "left", background: T.card2, border: `1px solid ${on ? T.acc : T.bd}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer", fontFamily: "inherit" }}>
      <span><span style={{ color: T.txt, fontWeight: 600, fontSize: 14 }}>{titulo}</span><br /><span style={{ color: T.dim, fontSize: 12 }}>{desc}</span></span>
      <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: on ? T.acM : T.mut }}>{on ? "SIM" : "NÃO"}</span>
    </button>
  );
}

// seletor visual do canto do número (2×2): um mini-gabinete com o "1" no canto escolhido
function CornerPicker({ value, onChange }) {
  const corners = [["tl", "Sup-esq"], ["tr", "Sup-dir"], ["bl", "Inf-esq"], ["br", "Inf-dir"]];
  const at = { tl: { top: 6, left: 6 }, tr: { top: 6, right: 6 }, bl: { bottom: 6, left: 6 }, br: { bottom: 6, right: 6 } };
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 46px)", gap: 8 }}>
      {corners.map(([k, label]) => {
        const active = value === k;
        return (
          <button key={k} type="button" onClick={() => onChange(k)} title={label} aria-label={label}
            style={{ position: "relative", width: 46, height: 46, borderRadius: 6, cursor: "pointer", background: active ? T.sel : T.card2, border: `1px solid ${active ? T.acc : T.bd}` }}>
            <span style={{ position: "absolute", ...at[k], width: 13, height: 13, borderRadius: 3, background: active ? T.acc : T.dim2, color: "#fff", fontSize: 9, fontWeight: 700, display: "grid", placeItems: "center" }}>1</span>
          </button>
        );
      })}
    </div>
  );
}

const subLabel = { color: T.txt, fontWeight: 600, fontSize: 13.5, marginBottom: 2 };
const subDesc = { color: T.dim, fontSize: 12.5, marginBottom: 8 };
const segRow = { display: "inline-flex", background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 3, gap: 3 };
const segBtn = (active) => ({ padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, background: active ? T.acc : "transparent", color: active ? "#fff" : T.mut });
