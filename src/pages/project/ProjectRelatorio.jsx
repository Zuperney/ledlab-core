// pages/project/ProjectRelatorio.jsx — relatório imprimível (PDF via navegador).
// Completo inclui: visão geral, vídeo/resolução, elétrica, cabeamento de SINAL e de
// ENERGIA (AC) — cada um com descrição (nº de cabos, capacidade) e o MAPA DE CABOS
// no mesmo visual da aba Cabeamento (services/cabling.js).
import { useState } from "react";
import { Printer } from "lucide-react";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { aggregateElectrical, projectRollup, screenRollup, isoDate } from "../../services/projectCalc.js";
import { cableMeta, cablePorts, bboxArea } from "../../services/cabling.js";
import { formatRange, formatFull } from "../../services/dates.js";
import { STATUS } from "../../components/StatusBadge.jsx";
import CableMap from "../../components/CableMap.jsx";
import { paletteColor, T, PRINT } from "../../ui/tokens.js";
import { btn } from "../../ui/styles.js";

const TYPES = ["Completo", "Resumido", "Elétrico", "Estrutural", "Design", "Gabinetes"];

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const videoOf = (t) => {
  const g = t.gabinete || {};
  const pxW = (parseInt(g.resX) || 0) * (t.cols || 0), pxH = (parseInt(g.resY) || 0) * (t.rows || 0);
  const d = gcd(pxW, pxH) || 1;
  const arSimple = pxW && pxH && pxW / d <= 100 && pxH / d <= 100 ? `${pxW / d}:${pxH / d}` : null;
  const dec = pxH ? (pxW / pxH).toFixed(2) : "—";
  const pitch = parseFloat(g.dimW) && parseInt(g.resX) ? parseFloat(g.dimW) / parseInt(g.resX) : 0;
  return { pxW, pxH, mp: (pxW * pxH) / 1e6, ar: arSimple || `${dec}:1`, dec, pitch };
};

export default function ProjectRelatorio({ project }) {
  const { prefs } = useLedLabContext();
  const isMobile = useIsMobile();
  const [type, setType] = useState("Resumido");
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const cfg = project.config || { vk: prefs.vk, brilho: prefs.brilho, conteudo: prefs.conteudo };
  const agg = aggregateElectrical(project, cfg);
  const roll = projectRollup(project);
  const today = formatFull(isoDate()); // data LOCAL (evita virar o dia seguinte à noite)
  const telas = project.telas || [];
  const showElec = ["Completo", "Resumido", "Elétrico"].includes(type);
  const showPhys = ["Completo", "Resumido", "Estrutural", "Gabinetes", "Design"].includes(type);
  const showVideo = ["Completo", "Resumido", "Design"].includes(type);
  const showSignal = type === "Completo";
  const showAC = ["Completo", "Elétrico"].includes(type);

  const th = { textAlign: "left", padding: "8px 10px", borderBottom: `2px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 11, textTransform: "uppercase", background: "#f7f8fc", whiteSpace: "nowrap" };
  const td = { padding: "8px 10px", borderBottom: `1px solid ${PRINT.line}`, color: PRINT.ink, verticalAlign: "top" };
  const tdNum = { ...td, textAlign: "right", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" };
  const tdCenter = { ...td, textAlign: "center", whiteSpace: "nowrap" };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${PRINT.line}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: PRINT.ink };
  const sw = (i) => ({ width: 10, height: 10, borderRadius: 2, background: paletteColor(i), flexShrink: 0 });
  const h3 = { color: PRINT.acc, borderBottom: `1px solid ${PRINT.line}`, paddingBottom: 6 };
  const telaBlock = { marginBottom: 18, breakInside: "avoid" };
  const telaTitle = { fontWeight: 700, fontSize: 13, marginBottom: 6, color: PRINT.ink };
  const sectionNav = [
    showPhys && { id: "sec-overview", label: "Visão geral" },
    showVideo && { id: "sec-video", label: "Vídeo" },
    showElec && { id: "sec-elec", label: "Elétrica" },
    showSignal && { id: "sec-signal", label: "Sinal" },
    showAC && { id: "sec-ac", label: "Energia AC" },
  ].filter(Boolean);
  const jumpTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div>
      <div style={{ display: "grid", gap: 10, marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          {isMobile ? (
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              style={{ flex: "1 1 220px", minWidth: 0, background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 600 }}
            >
              {TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          ) : (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {TYPES.map((t) => (
                <button key={t} onClick={() => setType(t)} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${type === t ? T.acc : T.bd}`, background: type === t ? T.acc : "transparent", color: type === t ? "#fff" : T.mut }}>{t}</button>
              ))}
            </div>
          )}
          <button style={{ ...btn("primary"), width: isMobile ? "100%" : "auto", justifyContent: "center" }} onClick={() => window.print()}><Printer size={15} /> Imprimir / Salvar PDF</button>
        </div>
      </div>

      <div className="report-doc" style={{ background: "#fff", color: PRINT.ink, borderRadius: 8, padding: isMobile ? 18 : 40, maxWidth: 860, margin: "0 auto", fontSize: 13 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: `2px solid ${PRINT.ink}`, paddingBottom: 14, marginBottom: 16 }}>
          <div>
            <div style={{ color: PRINT.acc, fontWeight: 700, fontSize: 11, letterSpacing: "0.08em" }}>LEDLAB CORE — {type.toUpperCase()}</div>
            <h1 style={{ margin: "6px 0 4px", fontSize: 26 }}>{project.name}</h1>
            <div style={{ color: PRINT.mut }}>{[project.cliente, project.local, formatRange(project.dataInicio, project.dataFim), STATUS[project.status]?.l].filter(Boolean).join(" · ")}</div>
          </div>
          <div style={{ textAlign: "right", color: PRINT.dim, fontSize: 12 }}>
            <div>Gerado em {today}</div>
            <div>{agg.vc.label} · brilho {Math.round(cfg.brilho * 100)}% · conteúdo {Math.round(cfg.conteudo * 100)}%</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", marginBottom: 20 }}>
          {[
            ["Telas", roll.telas], ["Gabinetes", roll.gab], ["Área", `${roll.area_m2.toFixed(1)} m²`], ["Peso", `${roll.peso_kg.toFixed(1)} kg`],
            ...(showElec ? [["kVA pico", agg.kVA], ["kVA típico", agg.typKva], ["Gerador ~", `${agg.gerador} kVA`]] : []),
          ].map(([l, v]) => (
            <div key={l}><div style={{ fontSize: 10, textTransform: "uppercase", color: PRINT.mut }}>{l}</div><div style={{ fontSize: 18, fontWeight: 700 }}>{v}</div></div>
          ))}
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 16 }}>
          {sectionNav.map((s) => (
            <button
              key={s.id}
              onClick={() => jumpTo(s.id)}
              style={{ border: `1px solid ${PRINT.line}`, background: "#fff", color: PRINT.ink, borderRadius: 999, fontSize: 12, padding: "4px 10px", cursor: "pointer" }}
            >
              {s.label}
            </button>
          ))}
        </div>

        {showPhys && (
          <section id="sec-overview" style={{ marginBottom: 24, scrollMarginTop: 12 }}>
            <h3 style={h3}>Visão Geral</h3>
            <div className="tbl-scroll report-table-wrap" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 760, borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Tela</th><th className="m-hide" style={th}>Gabinete</th><th style={th}>Grade</th><th style={th}>Gab.</th><th className="m-hide" style={th}>Dimensão</th><th style={th}>Peso</th><th style={{ ...th, textAlign: "right" }}>{showElec ? "Carga" : "Peso/gab"}</th></tr></thead>
                <tbody>
                  {telas.map((t, i) => { const r = screenRollup(t); const zebra = i % 2 ? "#fbfbfe" : "#fff"; return (
                    <tr key={t.id} style={{ background: zebra }}><td style={td}>{t.nome}</td><td className="m-hide" style={td}>{t.gabinete?.nome}</td><td style={tdCenter}>{t.cols}×{t.rows}</td><td style={tdNum}>{r.gab}</td><td className="m-hide" style={tdNum}>{r.dim.largura_m.toFixed(1)}×{r.dim.altura_m.toFixed(1)} m</td><td style={tdNum}>{r.peso_kg.toFixed(1)} kg</td>{showElec ? <td style={{ ...tdNum, color: PRINT.red }}>{(r.pwrMax_w / 1000).toFixed(1)} kW</td> : <td style={tdNum}>{(parseFloat(t.gabinete?.peso) || 0).toFixed(1)} kg</td>}</tr>
                  ); })}
                  <tr style={{ fontWeight: 700, background: "#f3f5fb" }}><td style={td}>Total</td><td className="m-hide" style={td}></td><td style={td}></td><td style={tdNum}>{roll.gab}</td><td className="m-hide" style={tdNum}>{roll.area_m2.toFixed(1)} m²</td><td style={tdNum}>{roll.peso_kg.toFixed(1)} kg</td>{showElec ? <td style={{ ...tdNum, color: PRINT.red }}>{(roll.pwrMax_w / 1000).toFixed(1)} kW</td> : <td style={td}></td>}</tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showVideo && (
          <section id="sec-video" style={{ marginBottom: 24, scrollMarginTop: 12 }}>
            <h3 style={h3}>Vídeo / Resolução</h3>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Resolução total por tela (para configurar processador/mídia) e proporção de tela.</p>
            <div className="tbl-scroll report-table-wrap" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 620, borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Tela</th><th style={th}>Resolução (px)</th><th className="m-hide" style={{ ...th, textAlign: "right" }}>Total</th><th style={th}>Aspecto</th><th style={{ ...th, textAlign: "right" }}>Pitch</th></tr></thead>
                <tbody>
                  {telas.map((t, i) => { const v = videoOf(t); const zebra = i % 2 ? "#fbfbfe" : "#fff"; return (
                    <tr key={t.id} style={{ background: zebra }}><td style={td}>{t.nome}</td><td style={{ ...td, fontWeight: 600, whiteSpace: "nowrap" }}>{v.pxW} × {v.pxH}</td><td className="m-hide" style={tdNum}>{v.mp.toFixed(2)} Mpx</td><td style={{ ...td, color: PRINT.acc, fontWeight: 600, whiteSpace: "nowrap" }}>{v.ar}</td><td style={tdNum}>{v.pitch ? `${v.pitch.toFixed(2)} mm` : "—"}</td></tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {showElec && (
          <section id="sec-elec" style={{ marginBottom: 24, scrollMarginTop: 12 }}>
            <h3 style={h3}>Informações Elétricas</h3>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Pico (pwrMax) dimensiona disjuntor e cabo; típico estima o gerador. {agg.vc.label}.</p>
            <div className="tbl-scroll report-table-wrap" style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", minWidth: 820, borderCollapse: "collapse" }}>
                <thead><tr><th style={th}>Tela</th><th className="m-hide" style={{ ...th, textAlign: "right" }}>Gab.</th><th style={{ ...th, textAlign: "right" }}>Pico kW</th><th className="m-hide" style={{ ...th, textAlign: "right" }}>Pico kVA</th><th style={{ ...th, textAlign: "right" }}>Pico A</th><th style={{ ...th, textAlign: "right" }}>Disjuntor</th><th className="m-hide" style={{ ...th, textAlign: "right" }}>Típ. kVA</th><th style={{ ...th, textAlign: "right" }}>Típ. A</th></tr></thead>
                <tbody>
                  {agg.perTela.map(({ tela, gab, peak, typ }, i) => {
                    const zebra = i % 2 ? "#fbfbfe" : "#fff";
                    return (
                      <tr key={tela.id} style={{ background: zebra }}><td style={td}>{tela.nome}</td><td className="m-hide" style={tdNum}>{gab}</td><td style={{ ...tdNum, color: PRINT.red }}>{(peak.W / 1000).toFixed(1)}</td><td className="m-hide" style={tdNum}>{peak.kVA}</td><td style={{ ...tdNum, color: PRINT.amb }}>{peak.I}</td><td style={{ ...tdNum, color: PRINT.red }}>{peak.breaker} A</td><td className="m-hide" style={tdNum}>{typ.kVA}</td><td style={tdNum}>{typ.I}</td></tr>
                    );
                  })}
                  <tr style={{ fontWeight: 700, background: "#f3f5fb" }}><td style={td}>Total</td><td className="m-hide" style={tdNum}>{roll.gab}</td><td style={{ ...tdNum, color: PRINT.red }}>{(agg.W / 1000).toFixed(1)}</td><td className="m-hide" style={tdNum}>{agg.kVA}</td><td style={{ ...tdNum, color: PRINT.amb }}>{agg.I}</td><td style={{ ...tdNum, color: PRINT.red }}>{agg.breaker} A</td><td className="m-hide" style={tdNum}>{agg.typKva}</td><td style={tdNum}>{agg.typI}</td></tr>
                </tbody>
              </table>
            </div>
            <p style={{ color: PRINT.mut, fontSize: 12, marginTop: 8 }}>Gerador sugerido (típico + 25% de margem): <b style={{ color: PRINT.acc }}>~{agg.gerador} kVA</b>.</p>
          </section>
        )}

        {showSignal && (
          <section id="sec-signal" style={{ marginBottom: 24, scrollMarginTop: 12 }}>
            <h3 style={h3}>Cabeamento de Sinal</h3>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Portas de dados por tela (regra de área quadrada). O selo numerado indica o início de cada cabo (canto inferior-esquerdo).</p>
            {telas.map((t) => {
              const { sinalBudget } = cableMeta(t);
              const ports = cablePorts(t, "sinal", numbering);
              return (
                <div key={t.id} style={telaBlock}>
                  <div style={telaTitle}>{t.nome} — {ports.length} {ports.length === 1 ? "porta" : "portas"} · máx {sinalBudget} gab/porta</div>
                  <CableMap tela={t} mode="sinal" numbering={numbering} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {ports.map((p, i) => { const pct = Math.round((bboxArea(p) / sinalBudget) * 100); return (
                      <span key={i} style={{ ...chip, borderColor: pct > 100 ? PRINT.red : PRINT.line }}><span style={sw(i)} />Porta {i + 1} · {pct}% · {p.length} gab</span>
                    ); })}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {showAC && (
          <section id="sec-ac" style={{ marginBottom: 24, scrollMarginTop: 12 }}>
            <h3 style={h3}>Energia — Cabeamento AC</h3>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Cabos de energia por tela: quantidade, capacidade do conector e carga por cabo.</p>
            {telas.map((t) => {
              const { ampCab, connRating, acBudget } = cableMeta(t);
              const ports = cablePorts(t, "ac", numbering);
              return (
                <div key={t.id} style={telaBlock}>
                  <div style={telaTitle}>{t.nome} — {ports.length} {ports.length === 1 ? "cabo" : "cabos"} · {acBudget} gab/cabo · {ampCab.toFixed(2)} A/gab · conector {connRating} A</div>
                  <CableMap tela={t} mode="ac" numbering={numbering} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {ports.map((p, i) => { const load = p.length * ampCab; const pct = Math.round((load / connRating) * 100); return (
                      <span key={i} style={{ ...chip, borderColor: pct > 100 ? PRINT.red : PRINT.line }}><span style={sw(i)} />Cabo {i + 1} · {load.toFixed(1)} A ({pct}%) · {p.length} gab</span>
                    ); })}
                  </div>
                </div>
              );
            })}
          </section>
        )}
      </div>
    </div>
  );
}
