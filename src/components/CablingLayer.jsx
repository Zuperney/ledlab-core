// components/CablingLayer.jsx — camada SVG do mapa de cabos, COMPARTILHADA pelo
// Cabeamento (ScreenCabling), pela Diagramação e pelo CableMap do Relatório. Desenha:
//   • gabinetes QUADRADOS e ENCOSTADOS (sem gap, sem arredondamento);
//   • o NÚMERO da ordem no cabo, num CANTO do gabinete (fora da linha) — opcional;
//   • o trajeto branco com SETAS de direção — opcional;
//   • o selo de INÍCIO (o "1" no círculo colorido; o fim não é marcado, de propósito).
// Recebe células/portas já em coordenadas de DESENHO; o chamador aplica o <g transform>
// (zoom/pan) e decide `showNumbers` pelo tamanho na tela. Setas/números/tamanho/canto
// vêm das Configurações globais (prefs.cablingRender). Cores e linha seguem como eram.
//
// `simple` (Caderno impresso — decisão do dono, 31/07): o mapa vira ORIENTAÇÃO
// DE MONTAGEM — só a região de cada cabo (contorno forte), o selo de entrada e
// a contagem de gabinetes. Sem números por gabinete, sem trajeto, sem setas.
import { T } from "../ui/tokens.js";
import { regionEdges } from "../services/layout.js";

const cxOf = (c) => c.x + c.w / 2;
const cyOf = (c) => c.y + c.h / 2;

const NSIZE = { sm: 0.26, md: 0.34, lg: 0.42 }; // fração do gabinete → tamanho da fonte
// posição do número num CANTO do gabinete (com respiro p) → ponto + âncora/baseline
const NUM_POS = {
  tl: (c, p) => ({ x: c.x + p, y: c.y + p, a: "start", b: "hanging" }),
  tr: (c, p) => ({ x: c.x + c.w - p, y: c.y + p, a: "end", b: "hanging" }),
  bl: (c, p) => ({ x: c.x + p, y: c.y + c.h - p, a: "start", b: "alphabetic" }),
  br: (c, p) => ({ x: c.x + c.w - p, y: c.y + c.h - p, a: "end", b: "alphabetic" }),
};

// seta preenchida apontando de a→b, centrada no ponto médio do segmento
function Arrow({ a, b, size }) {
  const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
  const ang = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
  return <path d={`M ${-size} ${-size * 0.85} L ${size} 0 L ${-size} ${size * 0.85} Z`} fill="#fff" transform={`translate(${mx},${my}) rotate(${ang})`} />;
}

export default function CablingLayer({ cells, ports, colorOf, showNumbers = true, arrows = true, numberSize = "sm", numberPos = "bl", portOffset = 0, onCellClick, activeCable = null, simple = false }) {
  const seqOf = {};
  ports.forEach((port) => port.forEach((cell, i) => { seqOf[cell.k] = i + 1; }));
  const nsize = NSIZE[numberSize] ?? NSIZE.sm;
  const posOf = NUM_POS[numberPos] ?? NUM_POS.bl;

  return (
    <>
      {/* gabinetes — quadrados e encostados; no simple a grade interna é suave */}
      {cells.map((cell) => {
        const assigned = cell.port != null;
        const col = assigned ? colorOf(cell.port) : T.dim2;
        const act = activeCable != null && cell.port === activeCable;
        return (
          <rect key={cell.k} x={cell.x} y={cell.y} width={cell.w} height={cell.h}
            fill={assigned ? col + (act ? "45" : "26") : "transparent"} stroke={col} strokeWidth={act ? 2 : simple && assigned ? 0.5 : 1}
            strokeOpacity={simple && assigned ? 0.35 : 1}
            strokeDasharray={assigned ? undefined : "4 4"}
            onClick={onCellClick ? () => onCellClick(cell) : undefined}
            style={onCellClick ? { cursor: "pointer" } : undefined} />
        );
      })}

      {/* número da ordem no cabo, num canto — em TODO gabinete (inclusive o de início, que
          também leva o selo da PORTA no centro; um é a ordem no cabo, o outro é o nº da porta) */}
      {!simple && showNumbers && cells.map((cell) => {
        if (cell.port == null) return null;
        const u = Math.min(cell.w, cell.h);
        const fs = u * nsize;
        const pos = posOf(cell, u * 0.16);
        return (
          <text key={`n${cell.k}`} x={pos.x} y={pos.y} fill="#fff" fontSize={fs} fontWeight="700"
            textAnchor={pos.a} dominantBaseline={pos.b}
            stroke="#0a0a14" strokeWidth={fs * 0.16} paintOrder="stroke" style={{ pointerEvents: "none" }}>
            {seqOf[cell.k]}
          </text>
        );
      })}

      {/* trajeto + setas (modo denso) OU contorno de região + contagem (simple); selo de início sempre */}
      {ports.map((port, pi) => {
        if (!port.length) return null;
        const pts = port.map((c) => [cxOf(c), cyOf(c)]);
        const d = pts.map((p, i) => (i ? "L" : "M") + `${p[0]} ${p[1]}`).join(" ");
        const f = port[0];
        const u = Math.min(f.w, f.h);
        const rad = u * (simple ? 0.32 : 0.28);
        const dim = activeCable != null && pi !== activeCable;
        const m = port[Math.floor(port.length / 2)]; // célula do meio — sempre dentro da região
        const cfs = Math.max(6, u * 0.3);
        return (
          <g key={pi} style={{ pointerEvents: "none" }} opacity={dim ? 0.45 : 1}>
            {simple
              ? regionEdges(port).map((e, i) => <line key={`e${i}`} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2} stroke={colorOf(pi)} strokeWidth={2} strokeLinecap="square" />)
              : <path d={d} fill="none" stroke="#fff" strokeWidth={Math.max(1.6, u * 0.06)} strokeLinejoin="round" strokeLinecap="round" opacity={0.92} />}
            {!simple && arrows && pts.slice(0, -1).map((p, i) => <Arrow key={`a${i}`} a={p} b={pts[i + 1]} size={u * 0.14} />)}
            {simple && port.length > 1 && u >= 12 && (
              <text x={cxOf(m)} y={cyOf(m)} fill="#fff" fontSize={cfs} fontWeight="700" textAnchor="middle" dominantBaseline="central"
                stroke="#0a0a14" strokeWidth={cfs * 0.16} paintOrder="stroke">{port.length} gab</text>
            )}
            <circle cx={cxOf(f)} cy={cyOf(f)} r={rad} fill={colorOf(pi)} stroke="#fff" strokeWidth={Math.max(1.2, u * 0.045)} />
            <text x={cxOf(f)} y={cyOf(f)} fill="#fff" fontSize={rad * 1.05} fontWeight="700" textAnchor="middle" dominantBaseline="central">{portOffset + pi + 1}</text>
          </g>
        );
      })}
    </>
  );
}
