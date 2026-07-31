// components/CableMap.jsx — mapa de cabos ESTÁTICO (sem zoom/pan) do CADERNO, no
// modo SIMPLIFICADO (orientação de montagem, decisão do dono 31/07): região de
// cada cabo com contorno, selo de entrada e contagem — sem números por gabinete
// nem setas (esses ficam na aba Cabeamento/Diagramação). Reflete o cabeamento
// da tela (services/cabling.js). Usado só no Relatório. `offset` numera/colore
// as portas na sequência global do projeto.
import { key, cablePorts } from "../services/cabling.js";
import { useCablePalette } from "../hooks/useCablePalette.js";
import CablingLayer from "./CablingLayer.jsx";

const CELL = 40;

export default function CableMap({ tela, mode, numbering = "row-tb-lr", maxWidth = 760, offset = 0 }) {
  const { colorOf } = useCablePalette();
  const cols = tela?.cols || 1, rows = tela?.rows || 1;
  const ports = cablePorts(tela, mode, numbering);

  const portOf = {};
  ports.forEach((p, i) => p.forEach((cell) => { portOf[key(cell.c, cell.r)] = i; }));

  const W = cols * CELL, H = rows * CELL;
  const cells = [];
  for (let rr = 0; rr < rows; rr++)
    for (let c = 0; c < cols; c++)
      cells.push({ k: key(c, rr), x: c * CELL, y: rr * CELL, w: CELL, h: CELL, port: portOf[key(c, rr)] ?? null });
  const drawPorts = ports.map((port) => port.map((cell) => ({ k: key(cell.c, cell.r), x: cell.c * CELL, y: cell.r * CELL, w: CELL, h: CELL })));

  return (
    <svg viewBox={`-8 -8 ${W + 16} ${H + 16}`} width={W + 16}
      style={{ width: "100%", maxWidth: Math.min(maxWidth, W + 16), height: "auto", background: "#0d0d1a", borderRadius: 8, display: "block" }}>
      <CablingLayer cells={cells} ports={drawPorts} colorOf={(pi) => colorOf(offset + pi)} portOffset={offset} simple />
    </svg>
  );
}
