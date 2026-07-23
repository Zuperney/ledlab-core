// components/ReportTelasCanvas.jsx — esquema das telas pro Relatório, no estilo da
// aba Screens: cada tela é um bloco colorido (cor do modelo, igual aos chips) com o
// NOME dentro, dispostas EM FILA na largura. A largura somada é a "resolução linear"
// do projeto; a altura é a da tela maior. SVG (foreground) → imprime sempre, sem
// depender de "Gráficos de segundo plano". Substitui o render de test card (que era
// pesado e detalhado demais pra um panorama).
import { useCablePalette } from "../hooks/useCablePalette.js";

const dimOf = (t) => ({
  w: (t.cols || 1) * (parseFloat(t.gabinete?.resX) || 128),
  h: (t.rows || 1) * (parseFloat(t.gabinete?.resY) || 128),
});

export default function ReportTelasCanvas({ project, maxWidth = 760, maxHeight = 300 }) {
  const { colorOf } = useCablePalette();
  const telas = project.telas || [];
  if (!telas.length) return null;

  // cor por MODELO de gabinete (mesma sequência dos chips "Gabinetes utilizados")
  const models = [...new Set(telas.filter((t) => t.gabinete?.nome).map((t) => t.gabinete.nome))];
  const colOf = (t) => colorOf(Math.max(0, models.indexOf(t.gabinete?.nome)));

  // fila: x = soma das larguras anteriores; base alinhada (chão); canvas = soma × altura máxima
  const dims = telas.map((t) => dimOf(t));
  const maxH = Math.max(...dims.map((d) => d.h), 1);
  const raw = telas.map((t, i) => ({ t, d: dims[i], x: dims.slice(0, i).reduce((s, d) => s + d.w, 0), y: maxH - dims[i].h }));
  const totalW = dims.reduce((s, d) => s + d.w, 0) || 1;
  const scale = Math.min(maxWidth / totalW, maxHeight / maxH);
  const W = totalW * scale, H = maxH * scale;

  return (
    <div style={{ marginBottom: 16, breakInside: "avoid" }}>
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{ display: "block", width: "100%", maxWidth: W, height: "auto", margin: "0 auto", borderRadius: 8 }}>
        <rect x={0} y={0} width={W} height={H} fill="#0d0d1a" />
        {raw.map((b) => {
          const x = b.x * scale, y = b.y * scale, w = b.d.w * scale, h = b.d.h * scale, col = colOf(b.t);
          const fs = Math.max(7, Math.min(18, Math.min(h * 0.26, w / (Math.max(4, b.t.nome.length) * 0.56))));
          return (
            <g key={b.t.id}>
              <rect x={x} y={y} width={w} height={h} fill={col} fillOpacity={0.2} stroke={col} strokeWidth={1.5} />
              {w > 22 && (
                <text x={x + w / 2} y={y + h / 2} textAnchor="middle" dominantBaseline="middle" fill="#fff" fontSize={fs} fontWeight="700" paintOrder="stroke" stroke="#0d0d1a" strokeWidth={fs * 0.14}>{b.t.nome}</text>
              )}
              {w > 22 && h > fs * 3.2 && (
                <text x={x + w / 2} y={y + h / 2 + fs * 1.15} textAnchor="middle" dominantBaseline="middle" fill="#cbd5e1" fontSize={fs * 0.72}>{b.d.w} × {b.d.h}</text>
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 8 }}>
        Telas em fila — resolução linear <b style={{ color: "#0f172a" }}>{Math.round(totalW).toLocaleString("pt-BR")} × {Math.round(maxH).toLocaleString("pt-BR")} px</b>
      </div>
    </div>
  );
}
