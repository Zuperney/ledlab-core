// pages/project/ProjectTestCard.jsx — gerador de test card (canvas + export PNG).
import { useRef, useEffect, useState } from "react";
import { Download, Monitor } from "lucide-react";
import { PALETTE, T } from "../../ui/tokens.js";
import { card, btn } from "../../ui/styles.js";
import Placeholder from "../../components/Placeholder.jsx";

const SCHEMES = {
  cores: PALETTE,
  frio: ["#0f766e", "#2563eb", "#7c3aed", "#0891b2", "#059669", "#4f46e5"],
  quente: ["#dc2626", "#ea580c", "#ca8a04", "#db2777", "#e11d48", "#f59e0b"],
  mono: ["#374151", "#4b5563", "#6b7280", "#9ca3af"],
};

function draw(canvas, tela, opts) {
  const cols = tela.cols || 1, rows = tela.rows || 1;
  const g = tela.gabinete || {};
  const resX = parseFloat(g.resX) || 128, resY = parseFloat(g.resY) || 128;
  const W = cols * resX, H = rows * resY;
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext("2d");
  const scheme = SCHEMES[opts.scheme] || PALETTE;

  ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);
  let n = 1;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * resX, y = r * resY;
      ctx.fillStyle = scheme[(r * cols + c) % scheme.length];
      ctx.fillRect(x, y, resX, resY);
      if (opts.junctions) { ctx.strokeStyle = "rgba(0,0,0,0.5)"; ctx.lineWidth = Math.max(1, resX * 0.02); ctx.strokeRect(x, y, resX, resY); }
      if (opts.numbers) {
        ctx.fillStyle = "#fff"; ctx.font = `700 ${resY * 0.28 * opts.numScale}px system-ui, sans-serif`;
        ctx.textAlign = "left"; ctx.textBaseline = "top";
        ctx.fillText(String(n), x + resX * 0.08, y + resY * 0.06);
      }
      n++;
    }
  }
  ctx.strokeStyle = "rgba(255,255,255,0.85)"; ctx.lineWidth = Math.max(2, W * 0.002);
  if (opts.cross) { ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(W, H); ctx.moveTo(W, 0); ctx.lineTo(0, H); ctx.stroke(); }
  if (opts.circle) { ctx.beginPath(); ctx.arc(W / 2, H / 2, Math.min(W, H) * 0.45, 0, Math.PI * 2); ctx.stroke(); }
  if (opts.info) {
    const lines = [tela.nome, `${W} x ${H} px`, `${cols} × ${rows} = ${cols * rows} gab`, `pitch ${(parseFloat(g.dimW) / resX).toFixed(2)} mm`, `${(cols * parseFloat(g.dimW) / 1000).toFixed(2)} x ${(rows * parseFloat(g.dimH) / 1000).toFixed(2)} m`];
    const fs = H * 0.03, pad = fs * 0.6;
    ctx.font = `600 ${fs}px ui-monospace, monospace`;
    const bw = Math.max(...lines.map((l) => ctx.measureText(l).width)) + pad * 2;
    const bh = lines.length * fs * 1.3 + pad;
    ctx.fillStyle = "rgba(0,0,0,0.7)"; ctx.fillRect(pad, H - bh - pad, bw, bh);
    ctx.fillStyle = "#fff"; ctx.textAlign = "left"; ctx.textBaseline = "top";
    lines.forEach((l, i) => ctx.fillText(l, pad * 1.6, H - bh + i * fs * 1.3));
  }
}

export default function ProjectTestCard({ project }) {
  const telas = project.telas || [];
  const [telaId, setTelaId] = useState(telas[0]?.id);
  const [opts, setOpts] = useState({ scheme: "cores", numbers: true, junctions: true, circle: true, cross: true, info: true, numScale: 1 });
  const canvasRef = useRef(null);
  const tela = telas.find((t) => t.id === telaId) || telas[0];

  useEffect(() => { if (tela && canvasRef.current) draw(canvasRef.current, tela, opts); }, [tela, opts]);

  if (!tela) return <Placeholder icon={Monitor} title="Sem telas" description="Adicione uma tela na aba Dados para gerar o test card." />;

  const g = tela.gabinete || {};
  const W = (tela.cols || 1) * (parseFloat(g.resX) || 0), H = (tela.rows || 1) * (parseFloat(g.resY) || 0);
  const toggle = (k) => setOpts({ ...opts, [k]: !opts[k] });

  const exportPng = () => {
    canvasRef.current.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `testcard-${tela.nome.replace(/\s+/g, "-").toLowerCase()}.png`;
      a.click();
    }, "image/png");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <select value={telaId} onChange={(e) => setTelaId(e.target.value)} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" }}>
          {telas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
        <button style={btn("primary")} onClick={exportPng}><Download size={15} /> Exportar PNG ({W}×{H})</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 16, alignItems: "start" }}>
        <div style={card()}>
          <div style={{ textTransform: "uppercase", fontSize: 11, color: T.mut, marginBottom: 6 }}>Esquema de cor</div>
          <select value={opts.scheme} onChange={(e) => setOpts({ ...opts, scheme: e.target.value })} style={{ width: "100%", background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", marginBottom: 16 }}>
            <option value="cores">Cores</option><option value="frio">Frio</option><option value="quente">Quente</option><option value="mono">Mono</option>
          </select>
          <div style={{ textTransform: "uppercase", fontSize: 11, color: T.mut, marginBottom: 8 }}>Elementos</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[["numbers", "Numerar gab."], ["junctions", "Junções"], ["circle", "Círculo"], ["cross", "Cruz"], ["info", "Caixa de info"]].map(([k, l]) => (
              <button key={k} onClick={() => toggle(k)} style={{ padding: "8px 6px", borderRadius: 7, cursor: "pointer", fontSize: 12, fontWeight: 600, border: `1px solid ${opts[k] ? T.acc : T.bd}`, background: opts[k] ? T.sel : T.card2, color: opts[k] ? T.acM : T.mut }}>
                {l} {opts[k] ? "ON" : "OFF"}
              </button>
            ))}
          </div>
          <div style={{ textTransform: "uppercase", fontSize: 11, color: T.mut, margin: "16px 0 6px" }}>Tamanho do número — {opts.numScale.toFixed(1)}×</div>
          <input type="range" min={0.5} max={2} step={0.1} value={opts.numScale} onChange={(e) => setOpts({ ...opts, numScale: parseFloat(e.target.value) })} style={{ width: "100%", accentColor: T.acc }} />
        </div>

        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", color: T.dim, fontSize: 12, marginBottom: 8 }}>
            <b style={{ color: T.acM }}>{tela.nome}</b>
            <span>{W}×{H} px · {tela.cols * tela.rows} gab · pitch {(parseFloat(g.dimW) / (parseFloat(g.resX) || 1)).toFixed(2)} mm</span>
          </div>
          <canvas ref={canvasRef} style={{ width: "100%", height: "auto", borderRadius: 6, imageRendering: "pixelated" }} />
          <div style={{ color: T.dim, fontSize: 11, marginTop: 8 }}>O preview é escalado; o PNG sai na resolução nativa ({W}×{H} px) para mapeamento 1:1 no processador.</div>
        </div>
      </div>
    </div>
  );
}
