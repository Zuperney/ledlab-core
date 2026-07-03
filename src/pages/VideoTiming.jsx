// pages/VideoTiming.jsx — Gerador de Timing de Vídeo (VESA CVT / Reduced Blanking),
// reproduzindo o gerador Novastar do MCTRL4K + verificação de banda do controlador.
// Entrada por pixels manuais ou por gabinete + grade (resolução total do painel).
import { useState } from "react";
import { ArrowLeftRight, TriangleAlert, CircleCheck } from "lucide-react";
import { T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import { cvtTiming, controllerCheck, CONTROLLERS } from "../services/videoTiming.js";

export default function VideoTiming() {
  const { cabs } = useLedLabContext();
  const [w, setW] = useState(1920);
  const [h, setH] = useState(1080);
  const [fr, setFr] = useState(60);
  const [rb, setRb] = useState(true);
  const [ctrl, setCtrl] = useState("MCTRL4K");
  const [cabId, setCabId] = useState(cabs[0]?.id);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(6);

  const W = Math.max(1, Math.round(w) || 1), H = Math.max(1, Math.round(h) || 1);
  const t = cvtTiming(W, H, fr, { reducedBlanking: rb });
  const chk = t ? controllerCheck(ctrl, W, H, t.pixelClock) : null;

  const seedPanel = () => { const c = cabs.find((x) => x.id === cabId) || cabs[0]; if (!c) return; setW((parseInt(c.resX) || 0) * cols); setH((parseInt(c.resY) || 0) * rows); };
  const swap = () => { setW(H); setH(W); };

  const inp = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 15, width: 110 };
  const lbl = { textTransform: "uppercase", fontSize: 11, color: T.mut, display: "block", marginBottom: 4 };
  const seg = (active) => ({ padding: "9px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${active ? T.acc : T.bd}`, background: active ? T.acc : T.card2, color: active ? "#fff" : T.mut });
  const stat = (l, v, c) => (<div><div style={{ fontSize: 10, textTransform: "uppercase", color: T.mut }}>{l}</div><div style={{ fontSize: 20, fontWeight: 800, color: c || T.txt }}>{v}</div></div>);
  const th = { textAlign: "left", padding: "8px 10px", borderBottom: `1px solid ${T.bd}`, color: T.mut, fontSize: 11, textTransform: "uppercase" };
  const td = { padding: "8px 10px", borderBottom: `1px solid ${T.bd}`, color: T.txt };

  const axisRow = (label, a) => (
    <tr>
      <td style={{ ...td, color: T.acM, fontWeight: 700 }}>{label}</td>
      <td style={td}>{a.active}</td><td style={td}>{a.front}</td><td style={td}>{a.sync}</td>
      <td style={td}>{a.back}</td><td style={td}>{a.blank}</td>
      <td style={{ ...td, fontWeight: 700 }}>{a.total}</td>
      <td style={{ ...td, color: a.polPos ? T.grn : T.amb }}>{a.polPos ? "POSITIVO" : "NEGATIVO"}</td>
    </tr>
  );

  return (
    <div>
      <SectionHeader title="Timing de Vídeo (CVT)" subtitle="Gera a resolução custom / timing (VESA CVT — Reduced Blanking) e verifica a banda do controlador." />

      {/* ENTRADAS */}
      <div style={card({ marginBottom: 16 })}>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div><label style={lbl}>Largura (px)</label><input type="number" value={w} onChange={(e) => setW(parseInt(e.target.value) || 0)} style={inp} /></div>
          <button onClick={swap} title="Trocar largura/altura" style={{ width: 38, height: 38, borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}`, color: T.txt, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 1 }}><ArrowLeftRight size={16} /></button>
          <div><label style={lbl}>Altura (px)</label><input type="number" value={h} onChange={(e) => setH(parseInt(e.target.value) || 0)} style={inp} /></div>
          <div><label style={lbl}>Refresh</label><select value={fr} onChange={(e) => setFr(parseInt(e.target.value))} style={{ ...inp, width: 100 }}>{[120, 60, 50, 30, 25, 24].map((r) => <option key={r} value={r}>{r} Hz</option>)}</select></div>
          <div><label style={lbl}>Blanking</label><button onClick={() => setRb((v) => !v)} style={seg(rb)}>{rb ? "Reduced" : "Padrão (CRT)"}</button></div>
          <div><label style={lbl}>Controlador</label><select value={ctrl} onChange={(e) => setCtrl(e.target.value)} style={{ ...inp, width: 180 }}>{Object.entries(CONTROLLERS).map(([k, v]) => <option key={k} value={k}>{v.name}</option>)}</select></div>
        </div>
        <div style={{ display: "flex", gap: 14, alignItems: "flex-end", flexWrap: "wrap", marginTop: 14, paddingTop: 14, borderTop: `1px solid ${T.bd}` }}>
          <span style={{ color: T.dim, fontSize: 12, alignSelf: "center" }}>ou puxar do painel:</span>
          <div><label style={lbl}>Gabinete</label><select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={{ ...inp, width: 180 }}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select></div>
          <div><label style={lbl}>Colunas</label><input type="number" value={cols} onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 78 }} /></div>
          <div><label style={lbl}>Linhas</label><input type="number" value={rows} onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 78 }} /></div>
          <button onClick={seedPanel} style={seg(false)}>Usar painel</button>
        </div>
      </div>

      {t && chk && (
        <>
          {/* VEREDITO DO CONTROLADOR */}
          <div style={card({ marginBottom: 16, borderColor: chk.ok ? T.bd : T.red, display: "flex", gap: 12, alignItems: "flex-start" })}>
            {chk.ok ? <CircleCheck size={22} color={T.grn} style={{ flexShrink: 0, marginTop: 1 }} /> : <TriangleAlert size={22} color={T.red} style={{ flexShrink: 0, marginTop: 1 }} />}
            <div>
              <div style={{ color: chk.ok ? T.grn : T.red, fontWeight: 700, marginBottom: 3 }}>
                {chk.ok ? `OK — cabe no ${chk.name}` : `Estoura o limite do ${chk.name}`}
              </div>
              {!chk.ok && (
                <div style={{ color: T.txt, fontSize: 13, marginBottom: 4 }}>
                  {chk.clockOver && "Banda (pixel clock) alta demais — reduza a resolução ou o refresh. "}
                  {chk.pxOver && "Resolução acima do máximo do controlador."}
                </div>
              )}
              <div style={{ color: T.dim, fontSize: 12 }}>
                Pixel clock: <b style={{ color: chk.clockOver ? T.red : T.txt }}>{t.pixelClock.toFixed(3)} MHz</b> · máx p/ este aspecto ≈ {chk.maxClock.toFixed(1)} MHz · máx {(chk.maxPixels / 1e6).toFixed(2)} Mpx (4096×2160)
              </div>
            </div>
          </div>

          {/* RESUMO */}
          <div style={card({ marginBottom: 16 })}>
            <div style={{ color: T.dim, fontSize: 12, marginBottom: 12 }}>Formato: <b style={{ color: T.txt }}>{W} × {H} @ {fr} Hz{rb ? " · Reduced Blanking" : " · CRT padrão"}</b> · aspecto {t.aspect}</div>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              {stat("Pixel clock", `${t.pixelClock.toFixed(3)} MHz`, chk.clockOver ? T.red : T.acM)}
              {stat("Total (H×V)", `${t.h.total} × ${t.v.total}`)}
              {stat("Freq. horizontal", `${t.hFreq.toFixed(2)} kHz`)}
              {stat("Freq. vertical", `${t.vFreq.toFixed(2)} Hz`)}
              {stat("Ativo", `${t.h.active} × ${t.v.active}`)}
            </div>
          </div>

          {/* TABELA DE TIMING */}
          <div style={card()}>
            <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", marginBottom: 4 }}>Parâmetros de timing</div>
            <div style={{ color: T.dim, fontSize: 12, marginBottom: 12 }}>Programe esses valores na resolução custom / EDID da fonte (placa de vídeo, media server).</div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, minWidth: 640 }}>
                <thead><tr>{["", "Ativo", "Front porch", "Sync", "Back porch", "Blanking", "Total", "Polaridade"].map((x, i) => <th key={i} style={th}>{x}</th>)}</tr></thead>
                <tbody>
                  {axisRow("Horizontal", t.h)}
                  {axisRow("Vertical", t.v)}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
