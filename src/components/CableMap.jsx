// components/CableMap.jsx — mapa de cabos ESTÁTICO (sem zoom/pan), do mesmo jeito
// que aparece na aba Cabeamento: célula colorida por cabo, linha branca e selo
// numerado no canto inferior-esquerdo. Usa a lógica compartilhada (services/cabling.js),
// então reflete exatamente o cabeamento configurado na tela. Usado no Relatório.
import { T } from "../ui/tokens.js";
import { key, cablePorts } from "../services/cabling.js";
import { useCablePalette } from "../hooks/useCablePalette.js";

const CELL = 40;

export default function CableMap({ tela, mode, numbering = "row-tb-lr", maxWidth = 760, offset = 0 }) {
  const { colorOf } = useCablePalette();
  const cols = tela?.cols || 1, rows = tela?.rows || 1;
  const ports = cablePorts(tela, mode, numbering);

  const portOf = {};
  ports.forEach((p, i) => p.forEach((cell) => { portOf[key(cell.c, cell.r)] = i; }));

  const W = cols * CELL, H = rows * CELL;
  const r = CELL * 0.28, fs = CELL * 0.34;

  return (
    <svg viewBox={`-8 -8 ${W + 16} ${H + 16}`} width={W + 16}
      style={{ width: "100%", maxWidth: Math.min(maxWidth, W + 16), height: "auto", background: "#0d0d1a", borderRadius: 8, display: "block" }}>
      {Array.from({ length: rows }).map((_, rr) => Array.from({ length: cols }).map((_, c) => {
        const pi = portOf[key(c, rr)];
        const col = pi === undefined ? T.dim2 : colorOf(offset + pi);
        return <rect key={key(c, rr)} x={c * CELL + 2} y={rr * CELL + 2} width={CELL - 4} height={CELL - 4} rx={4}
          fill={pi === undefined ? "transparent" : col + "26"} stroke={col} strokeWidth={1.2} strokeDasharray={pi === undefined ? "4 4" : undefined} />;
      }))}
      {ports.map((port, pi) => {
        if (!port.length) return null;
        const pts = port.map((cell) => `${cell.c * CELL + CELL / 2},${cell.r * CELL + CELL / 2}`).join(" ");
        const f = port[0];
        return (
          <g key={pi}>
            <polyline points={pts} fill="none" stroke="#fff" strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" opacity={0.95} />
            <circle cx={f.c * CELL + CELL / 2} cy={f.r * CELL + CELL / 2} r={r} fill={colorOf(offset + pi)} stroke="#fff" strokeWidth={1.6} />
            <text x={f.c * CELL + CELL / 2} y={f.r * CELL + CELL / 2} fill="#fff" fontSize={fs} fontWeight="700" textAnchor="middle" dominantBaseline="central">{offset + pi + 1}</text>
          </g>
        );
      })}
    </svg>
  );
}
