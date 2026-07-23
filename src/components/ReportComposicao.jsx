// components/ReportComposicao.jsx — render ESTÁTICO da Composição pro Relatório.
// Monta o test card de cada tela na sua posição (comp.pos salvo, ou lado-a-lado por
// padrão) num canvas único e embute como <img> — imprime SEMPRE (é foreground, não
// depende de "Gráficos de segundo plano"). O tamanho da caixa envolvente = a
// resolução total do projeto (soma das larguras em fila × altura máxima). Mesma
// lógica/estilo da aba Composição, pra ficar consistente.
import { useMemo } from "react";
import { useCablePalette } from "../hooks/useCablePalette.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import { telaPortSlices } from "../services/screenCabling.js";
import { draw, DEFAULTS } from "../services/testcardDraw.js";

// resolução real da tela em px (gabinete vazio = 128, igual ao draw/Composição)
const dimOf = (t) => ({
  w: (t.cols || 1) * (parseFloat(t.gabinete?.resX) || 128),
  h: (t.rows || 1) * (parseFloat(t.gabinete?.resY) || 128),
});

export default function ReportComposicao({ project, maxRender = 1800 }) {
  const { palette } = useCablePalette();
  const { prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const telas = project.telas || [];
  const comp = project.comp || {};
  const style = comp.style || { scheme: "cores", numbers: true, info: true };

  const out = useMemo(() => {
    if (!telas.length) return null;
    // posições: as salvas + default lado a lado pras telas sem posição (= "em fila")
    const pos = { ...(comp.pos || {}) };
    let cx = 0;
    for (const t of telas) {
      if (pos[t.id]) cx = Math.max(cx, pos[t.id].x + dimOf(t).w);
      else { pos[t.id] = { x: cx, y: 0 }; cx += dimOf(t).w; }
    }
    // caixa envolvente = tamanho total do projeto
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const t of telas) { const p = pos[t.id], d = dimOf(t); minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x + d.w); maxY = Math.max(maxY, p.y + d.h); }
    const bw = Math.max(1, maxX - minX), bh = Math.max(1, maxY - minY);
    const s = Math.min(1, maxRender / Math.max(bw, bh)); // limita a resolução do canvas (projeto grande = muitos px)
    const c = document.createElement("canvas");
    c.width = Math.max(1, Math.round(bw * s)); c.height = Math.max(1, Math.round(bh * s));
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#000"; ctx.fillRect(0, 0, c.width, c.height);
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = "high";
    for (const t of telas) {
      const p = pos[t.id], d = dimOf(t);
      const useMap = style.cableMap === "sinal" || style.cableMap === "ac";
      const slices = useMap ? telaPortSlices(project, t.id, style.cableMap, numbering) : null;
      const ports = (style.cableMap && style.cableMap !== "off" && parseFloat(t.gabinete?.resX) > 0) ? (slices || []).map((x) => x.cells) : null;
      const nums = slices ? slices.map((x) => x.n) : null;
      const oc = document.createElement("canvas");
      draw(oc, t, { ...DEFAULTS, ...style }, ports, palette, nums);
      ctx.drawImage(oc, 0, 0, oc.width, oc.height, (p.x - minX) * s, (p.y - minY) * s, d.w * s, d.h * s);
    }
    return { dataUrl: c.toDataURL("image/png"), w: Math.round(bw), h: Math.round(bh) };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, numbering, palette]);

  if (!out) return null;
  return (
    <div style={{ marginBottom: 16, breakInside: "avoid" }}>
      <img src={out.dataUrl} alt="Composição das telas" style={{ display: "block", maxWidth: "100%", maxHeight: 360, margin: "0 auto", borderRadius: 8, border: "1px solid #e2e8f0" }} />
      <div style={{ textAlign: "center", fontSize: 11, color: "#475569", marginTop: 8 }}>
        Composição das telas — resolução total <b style={{ color: "#0f172a" }}>{out.w.toLocaleString("pt-BR")} × {out.h.toLocaleString("pt-BR")} px</b>
      </div>
    </div>
  );
}
