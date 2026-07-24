// components/NumberingPicker.jsx — seletor VISUAL e compacto da numeração dos cabos,
// no estilo "Quick Topo" (grid de ícones só, sem legenda em cada um; a descrição vem
// no tooltip). Toggle Zigzag/Serpente + os 8 cenários como ícones. Uma legenda só — o
// nome do cenário ativo, ao lado do toggle — cobre o mobile (sem hover, tooltip some).
// Compõe prefs.cableNumbering: "eixo-d1-d2" (zigzag) ou "eixo-d1-d2-serp" (serpente).
import NumberingIcon from "./NumberingIcon.jsx";
import { T } from "../ui/tokens.js";

// os 8 cenários possíveis (2 eixos × 2 sentidos H × 2 V) = 4 Coluna + 4 Linha. Os 2
// últimos de cada grupo fecham as 8 combinações (estavam comentados no gerador do pack).
const SCHEMES = [
  ["col-lr-bt", "Coluna · esq→dir · baixo↑"],
  ["col-lr-tb", "Coluna · esq→dir · cima↓"],
  ["col-rl-bt", "Coluna · dir→esq · baixo↑"],
  ["col-rl-tb", "Coluna · dir→esq · cima↓"],
  ["row-bt-lr", "Linha · baixo↑ · esq→dir"],
  ["row-tb-lr", "Linha · cima↓ · esq→dir"],
  ["row-bt-rl", "Linha · baixo↑ · dir→esq"],
  ["row-tb-rl", "Linha · cima↓ · dir→esq"],
];

const compose = (base, mode) => (mode === "serp" ? `${base}-serp` : base);

export default function NumberingPicker({ value = "row-tb-lr", onChange }) {
  const serp = value.endsWith("-serp");
  const base = serp ? value.slice(0, -5) : value; // tira o "-serp"
  const mode = serp ? "serp" : "zig";
  const atual = SCHEMES.find(([s]) => s === base)?.[1] || "";

  return (
    <div>
      {/* linha de topo: toggle Zigzag/Serpente + nome do cenário ativo (única legenda) */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <div style={{ display: "inline-flex", background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 3, gap: 3 }}>
          {[["zig", "Zigzag"], ["serp", "Serpente"]].map(([m, label]) => (
            <button key={m} type="button" onClick={() => onChange(compose(base, m))} aria-pressed={mode === m}
              style={{ padding: "5px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12.5, fontWeight: 600, background: mode === m ? T.acc : "transparent", color: mode === m ? T.accInk : T.mut }}>
              {label}
            </button>
          ))}
        </div>
        <span style={{ fontSize: 12, color: T.mut, minWidth: 0 }}>{atual}</span>
      </div>

      {/* grid compacto de ícones (4 col → 4 Coluna em cima, 4 Linha embaixo) — sem
          legenda por ícone; a descrição vem no title/tooltip */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 52px)", gap: 6 }}>
        {SCHEMES.map(([slug, desc]) => {
          const active = base === slug;
          return (
            <button key={slug} type="button" onClick={() => onChange(compose(slug, mode))} aria-pressed={active}
              title={desc} aria-label={desc}
              style={{ display: "grid", placeItems: "center", width: 52, height: 52, padding: 0, borderRadius: 8, cursor: "pointer", background: active ? T.sel : T.card2, border: `1px solid ${active ? T.acc : T.bd}`, color: active ? T.acL : T.mut, transition: "border-color .12s, background .12s" }}>
              <NumberingIcon scheme={compose(slug, mode)} size={40} />
            </button>
          );
        })}
      </div>
    </div>
  );
}
