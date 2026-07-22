// components/CableMap.jsx — mapa de cabos ESTÁTICO (sem zoom/pan), do mesmo jeito que
// a aba Cabeamento: usa a camada compartilhada CablingLayer (gabinete quadrado, número
// por gabinete, seta) com a config global (prefs.cablingRender). Reflete o cabeamento
// da tela (services/cabling.js). Usado no Relatório. `offset` numera/colore as portas na
// sequência global do projeto (contando as portas das telas anteriores).
import { key, cablePorts } from "../services/cabling.js";
import { useCablePalette } from "../hooks/useCablePalette.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import CablingLayer from "./CablingLayer.jsx";

const CELL = 40;

export default function CableMap({ tela, mode, numbering = "row-tb-lr", maxWidth = 760, offset = 0 }) {
  const { colorOf } = useCablePalette();
  const { prefs } = useLedLabContext();
  const cr = { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl", ...(prefs.cablingRender || {}) };
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
      <CablingLayer cells={cells} ports={drawPorts} colorOf={(pi) => colorOf(offset + pi)} portOffset={offset}
        showNumbers={cr.numbers ?? true} arrows={cr.arrows ?? true} numberSize={cr.numberSize} numberPos={cr.numberPos} />
    </svg>
  );
}
