// components/ScreenCableMap.jsx — mapa de cabos VISUAL de uma Screen, pro Relatório.
// Estático: escala os gabinetes da Screen (coord de canvas, que podem ser milhares de px)
// pra caber na largura do documento e desenha com a camada compartilhada CablingLayer —
// mesmo visual do Cabeamento/Diagramação. Traz de volta o mapa que sumia no relatório de
// projetos com Screen (que só mostrava tabelas). Config em prefs.cablingRender.
import { screenCells, screenPorts, cellPortIndex } from "../services/screenCabling.js";
import { useCablePalette } from "../hooks/useCablePalette.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import CablingLayer from "./CablingLayer.jsx";

const cellKey = (c) => `${c.telaId}:${c.c},${c.r}`;

export default function ScreenCableMap({ screen, telas, kind = "sinal", numbering = "row-tb-lr", maxWidth = 1040, maxHeight = 300 }) {
  const { colorOf } = useCablePalette();
  const { prefs } = useLedLabContext();
  const cr = { arrows: true, numbers: true, numberSize: "sm", numberPos: "bl", ...(prefs.cablingRender || {}) };

  const cells = screenCells(screen, telas);
  const ports = screenPorts(screen, telas, kind, numbering);
  if (!cells.length) return null;
  const portOf = cellPortIndex(ports);

  // bounding box da Screen em coord de canvas → escala pra caber na largura do documento
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const c of cells) { minX = Math.min(minX, c.x); minY = Math.min(minY, c.y); maxX = Math.max(maxX, c.x + c.w); maxY = Math.max(maxY, c.y + c.h); }
  const bw = maxX - minX || 1, bh = maxY - minY || 1;
  const scale = Math.min(maxWidth / bw, maxHeight / bh); // teto de largura E altura (mapa não come página inteira)
  const W = bw * scale, H = bh * scale;

  const put = (c) => ({ k: cellKey(c), x: (c.x - minX) * scale, y: (c.y - minY) * scale, w: c.w * scale, h: c.h * scale });
  const drawCells = cells.map((c) => ({ ...put(c), port: portOf[cellKey(c)] ?? null }));
  const drawPorts = ports.map((port) => port.map(put));
  const cellPx = (cells[0]?.w || 128) * scale; // esconde os números quando o gabinete fica miúdo

  return (
    <svg viewBox={`-6 -6 ${W + 12} ${H + 12}`} width={W + 12}
      style={{ width: "100%", maxWidth: W + 12, height: "auto", background: "#0d0d1a", borderRadius: 8, display: "block" }}>
      <CablingLayer cells={drawCells} ports={drawPorts} colorOf={colorOf}
        showNumbers={(cr.numbers ?? true) && cellPx >= 14} arrows={cr.arrows ?? true}
        numberSize={cr.numberSize} numberPos={cr.numberPos} />
    </svg>
  );
}
