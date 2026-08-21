// components/ReportTelasCanvas.jsx — esquema das telas pro Relatório: cada tela é
// um bloco colorido (cor do modelo, igual aos chips) com o NOME dentro, na
// DISPOSIÇÃO REAL da Composição (project.comp.pos via compLayout; sem posição
// salva o fallback é a fila lado a lado). Tela sobreposta = contorno vermelho
// (mesma segurança da aba Composição). SVG (foreground) → imprime sempre, sem
// depender de "Gráficos de segundo plano".
import { useCablePalette } from "../hooks/useCablePalette.js";
import { compLayout, overlappingIds } from "../services/layout.js";
import { canvasResumo } from "../services/reportContent.js";

export default function ReportTelasCanvas({ project, maxWidth = 1040, maxHeight = 340 }) {
  const { colorOf } = useCablePalette();
  const telas = project.telas || [];
  if (!telas.length) return null;

  // cor por MODELO de gabinete (mesma sequência dos chips "Gabinetes utilizados")
  const models = [...new Set(telas.filter((t) => t.gabinete?.nome).map((t) => t.gabinete.nome))];
  const colOf = (t) => colorOf(Math.max(0, models.indexOf(t.gabinete?.nome)));

  const { pos, dims, bbox } = compLayout(telas, project.comp?.pos);
  // ⚠️ O DESENHO mostra o vão (é disposição); a LEGENDA conta só o LED. O
  // espaçamento entre as telas é referência visual de como elas ficam separadas
  // no palco — não é pixel, e não entra em conta de resolução.
  const cv = canvasResumo(telas, project.comp?.pos);
  const overlap = overlappingIds(telas.map((t) => ({ id: t.id, ...pos[t.id], ...dims[t.id] })));
  const bw = bbox.w || 1, bh = bbox.h || 1;
  const scale = Math.min(maxWidth / bw, maxHeight / bh);
  const W = bw * scale, H = bh * scale;

  return (
    <div style={{ marginBottom: 16, breakInside: "avoid" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", width: "100%", maxWidth: W, height: "auto", margin: "0 auto", borderRadius: 8 }}>
        <rect x={0} y={0} width={W} height={H} fill="#0d0d1a" />
        {telas.map((t) => {
          const d = dims[t.id], p = pos[t.id];
          const x = (p.x - bbox.minX) * scale, y = (p.y - bbox.minY) * scale, w = d.w * scale, h = d.h * scale;
          const col = overlap.has(t.id) ? "#ef4444" : colOf(t);
          const fs = Math.max(7, Math.min(18, Math.min(h * 0.26, w / (Math.max(4, (t.nome || "Tela").length) * 0.62))));
          const showRes = w > 64 && h > fs * 3.4; // resolução só quando cabe no bloco (senão transborda no estreito)
          return (
            <g key={t.id}>
              <rect x={x} y={y} width={w} height={h} fill={col} fillOpacity={0.2} stroke={col} strokeWidth={1.5} />
              {w > 22 && (
                <text x={x + w / 2} y={y + (showRes ? h / 2 - fs * 0.2 : h / 2)} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={fs} fontWeight="700" paintOrder="stroke" stroke="#0d0d1a" strokeWidth={fs * 0.14}>{t.nome}</text>
              )}
              {showRes && (
                <text x={x + w / 2} y={y + h / 2 + fs * 1.05} textAnchor="middle" dominantBaseline="middle" fill="#cbd5e1" fontSize={fs * 0.72}>{d.w} × {d.h}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 8 }}>
        Canvas de conteúdo — <b style={{ color: "#0f172a" }}>{cv.w.toLocaleString("pt-BR")} × {cv.h.toLocaleString("pt-BR")} px</b>
        {cv.temVao && ` · ${cv.caixa.w.toLocaleString("pt-BR")} × ${cv.caixa.h.toLocaleString("pt-BR")} px de disposição no desenho`}
      </div>
    </div>
  );
}
