// components/NumberingIcon.jsx — ícone da ordem de numeração dos cabos.
// Grade 3×3: bolinha VERDE = início, VERMELHA = fim, a linha liga na ordem. Dois modos
// por cenário — zigzag (raster, recomeça do mesmo lado, tem o "salto de volta") e
// serpente (contínuo, inverte o sentido a cada faixa). É o mesmo trajeto do motor
// (services/cabling.js · orderPorts/serpOrder) e do gerador do pack (generate-icons.py),
// pra o ícone dizer a verdade sobre a numeração. Linha e pontos neutros usam
// currentColor (tema-agnóstico); só verde/vermelho são fixos.
const GREEN = "#22c55e", RED = "#ef4444";
const px = (c, r) => [24 + c * 24, 24 + r * 24]; // centro do ponto na grade 3×3, viewBox 96

// trajeto (col,row) do cenário. scheme = "eixo-d1-d2" (zigzag) ou "…-serp" (serpente).
function numberingPath(scheme) {
  const [axis, d1, d2, serpTok] = (scheme || "row-tb-lr").split("-");
  const serp = serpTok === "serp";
  const colDir = axis === "col" ? d1 : d2; // lr|rl
  const rowDir = axis === "col" ? d2 : d1; // tb|bt
  const cols = colDir === "lr" ? [0, 1, 2] : [2, 1, 0];
  const rows = rowDir === "tb" ? [0, 1, 2] : [2, 1, 0];
  const out = [];
  if (axis === "col") {
    cols.forEach((c, i) => (serp && i % 2 ? [...rows].reverse() : rows).forEach((r) => out.push([c, r])));
  } else {
    rows.forEach((r, i) => (serp && i % 2 ? [...cols].reverse() : cols).forEach((c) => out.push([c, r])));
  }
  return out;
}

export default function NumberingIcon({ scheme = "row-tb-lr", size = 48, style }) {
  const pts = numberingPath(scheme).map(([c, r]) => px(c, r));
  const poly = pts.map(([x, y]) => `${x},${y}`).join(" ");
  const [sx, sy] = pts[0];
  const [ex, ey] = pts[pts.length - 1];
  return (
    <svg viewBox="0 0 96 96" width={size} height={size} fill="none" role="img" aria-hidden="true" style={style}>
      <polyline points={poly} stroke="currentColor" strokeOpacity="0.4" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
      {pts.slice(1, -1).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5" fill="currentColor" fillOpacity="0.35" />
      ))}
      <circle cx={sx} cy={sy} r="9.5" fill={GREEN} fillOpacity="0.18" />
      <circle cx={sx} cy={sy} r="6.5" fill={GREEN} />
      <circle cx={ex} cy={ey} r="9.5" fill={RED} fillOpacity="0.18" />
      <circle cx={ex} cy={ey} r="6.5" fill={RED} />
    </svg>
  );
}
