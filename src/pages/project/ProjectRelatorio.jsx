// pages/project/ProjectRelatorio.jsx — relatório imprimível (PDF via navegador).
// Completo inclui: visão geral, vídeo/resolução, elétrica, cabeamento de SINAL e de
// ENERGIA (AC) — cada um com descrição (nº de cabos, capacidade) e o MAPA DE CABOS
// no mesmo visual da aba Cabeamento (services/cabling.js).
import { useState, useRef, useEffect } from "react";
import { Printer } from "lucide-react";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { aggregateElectrical, projectRollup, screenRollup, isoDate } from "../../services/projectCalc.js";
import { cableMeta, cablePorts, bboxArea } from "../../services/cabling.js";
import { formatRange, formatFull } from "../../services/dates.js";
import { STATUS } from "../../components/StatusBadge.jsx";
import CableMap from "../../components/CableMap.jsx";
import { T, PRINT } from "../../ui/tokens.js";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import { btn } from "../../ui/styles.js";
import { fileName, printAs } from "../../services/filenames.js";

const TYPES = ["Completo", "Resumido", "Elétrico", "Mapa de cabos", "Estrutural", "Design", "Gabinetes"];
// largura fixa "de impressão": no mobile o relatório é montado nela e escalado (zoom) p/ caber
const DOC_W = 800;

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
  const { colorOf } = useCablePalette();
  const isMobile = useIsMobile();
  const [type, setType] = useState("Completo");
  // no mobile, mede a largura disponível e calcula o zoom p/ o relatório (DOC_W) caber
  const docWrapRef = useRef(null);
  // mede a largura via ResizeObserver (dispara já ao observar) e DERIVA o zoom —
  // sem setState no corpo do effect; o callback do RO é evento de sistema externo.
  const [docW, setDocW] = useState(0);
  useEffect(() => {
    const el = docWrapRef.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(() => setDocW(el.clientWidth || 0));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const docZoom = isMobile && docW ? Math.min(1, docW / DOC_W) : 1;
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const cfg = project.config || { vk: prefs.vk, brilho: prefs.brilho, conteudo: prefs.conteudo };
  const agg = aggregateElectrical(project, cfg);
  const roll = projectRollup(project);
  const today = formatFull(isoDate()); // data LOCAL (evita virar o dia seguinte à noite)
  const telas = project.telas || [];
  const showElec = ["Completo", "Resumido", "Elétrico"].includes(type);
  const showPhys = ["Completo", "Resumido", "Estrutural", "Gabinetes", "Design"].includes(type);
  const showVideo = ["Completo", "Resumido", "Design"].includes(type);
  const showSignal = ["Completo", "Mapa de cabos"].includes(type);
  const showAC = ["Completo", "Mapa de cabos"].includes(type); // AC saiu do Elétrico → foco em tabelas

  const th = { textAlign: "left", padding: "8px 10px", borderBottom: `2px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 11, textTransform: "uppercase" };
  const td = { padding: "8px 10px", borderBottom: `1px solid ${PRINT.line}`, color: PRINT.ink };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${PRINT.line}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: PRINT.ink };
  const sw = (i) => ({ width: 10, height: 10, borderRadius: 2, background: colorOf(i), flexShrink: 0 });
  const h3 = { color: PRINT.acc, borderBottom: `1px solid ${PRINT.line}`, paddingBottom: 6 };
  const telaBlock = { marginBottom: 18, breakInside: "avoid" };
  const telaTitle = { fontWeight: 700, fontSize: 13, marginBottom: 6, color: PRINT.ink };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${type === t ? T.acc : T.bd}`, background: type === t ? T.acc : "transparent", color: type === t ? "#fff" : T.mut }}>{t}</button>
          ))}
        </div>
        <button style={btn("primary")} onClick={() => printAs(fileName([project.name, "relatorio", type]))}><Printer size={15} /> Imprimir / Salvar PDF</button>
      </div>

      <div ref={docWrapRef} style={{ overflow: "hidden" }}>
      <div className="report-doc" style={{ background: "#fff", color: PRINT.ink, borderRadius: 8, padding: 40, fontSize: 13, margin: "0 auto", width: isMobile ? DOC_W : "100%", maxWidth: isMobile ? "none" : 860, zoom: isMobile ? docZoom : undefined }}>
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

        {showPhys && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={h3}>Visão Geral</h3>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Gabinete</th><th style={th}>Grade</th><th style={th}>Gab.</th><th style={th}>Dimensão</th><th style={th}>Peso</th><th style={th}>{showElec ? "Carga" : "Peso/gab"}</th></tr></thead>
              <tbody>
                {telas.map((t) => { const r = screenRollup(t); return (
                  <tr key={t.id}><td style={td}>{t.nome}</td><td style={td}>{t.gabinete?.nome}</td><td style={td}>{t.cols}×{t.rows}</td><td style={td}>{r.gab}</td><td style={td}>{r.dim.largura_m.toFixed(1)}×{r.dim.altura_m.toFixed(1)} m</td><td style={td}>{r.peso_kg.toFixed(1)} kg</td>{showElec ? <td style={{ ...td, color: PRINT.red }}>{(r.pwrMax_w / 1000).toFixed(1)} kW</td> : <td style={td}>{(parseFloat(t.gabinete?.peso) || 0).toFixed(1)} kg</td>}</tr>
                ); })}
                <tr style={{ fontWeight: 700 }}><td style={td}>Total</td><td style={td}></td><td style={td}></td><td style={td}>{roll.gab}</td><td style={td}>{roll.area_m2.toFixed(1)} m²</td><td style={td}>{roll.peso_kg.toFixed(1)} kg</td>{showElec ? <td style={{ ...td, color: PRINT.red }}>{(roll.pwrMax_w / 1000).toFixed(1)} kW</td> : <td style={td}></td>}</tr>
              </tbody>
            </table>
          </section>
        )}

        {showVideo && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={h3}>Vídeo / Resolução</h3>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Resolução total por tela (para configurar processador/mídia) e proporção de tela.</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Resolução (px)</th><th style={th}>Total</th><th style={th}>Aspecto</th><th style={th}>Pitch</th></tr></thead>
              <tbody>
                {telas.map((t) => { const v = videoOf(t); return (
                  <tr key={t.id}><td style={td}>{t.nome}</td><td style={{ ...td, fontWeight: 600 }}>{v.pxW} × {v.pxH}</td><td style={td}>{v.mp.toFixed(2)} Mpx</td><td style={{ ...td, color: PRINT.acc, fontWeight: 600 }}>{v.ar}</td><td style={td}>{v.pitch ? `${v.pitch.toFixed(2)} mm` : "—"}</td></tr>
                ); })}
              </tbody>
            </table>
          </section>
        )}

        {showElec && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={h3}>Informações Elétricas</h3>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Pico (pwrMax) dimensiona disjuntor e cabo; típico estima o gerador. {agg.vc.label}.</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Gab.</th><th style={th}>Pico kW</th><th style={th}>Pico kVA</th><th style={th}>Pico A</th><th style={th}>Disjuntor</th><th style={th}>Típ. kVA</th><th style={th}>Típ. A</th></tr></thead>
              <tbody>
                {agg.perTela.map(({ tela, gab, peak, typ }) => (
                  <tr key={tela.id}><td style={td}>{tela.nome}</td><td style={td}>{gab}</td><td style={{ ...td, color: PRINT.red }}>{(peak.W / 1000).toFixed(1)}</td><td style={td}>{peak.kVA}</td><td style={{ ...td, color: PRINT.amb }}>{peak.I}</td><td style={{ ...td, color: PRINT.red }}>{peak.breaker} A</td><td style={td}>{typ.kVA}</td><td style={td}>{typ.I}</td></tr>
                ))}
                <tr style={{ fontWeight: 700 }}><td style={td}>Total</td><td style={td}>{roll.gab}</td><td style={{ ...td, color: PRINT.red }}>{(agg.W / 1000).toFixed(1)}</td><td style={td}>{agg.kVA}</td><td style={{ ...td, color: PRINT.amb }}>{agg.I}</td><td style={{ ...td, color: PRINT.red }}>{agg.breaker} A</td><td style={td}>{agg.typKva}</td><td style={td}>{agg.typI}</td></tr>
              </tbody>
            </table>
            <p style={{ color: PRINT.mut, fontSize: 12, marginTop: 8 }}>Gerador sugerido (típico + 25% de margem): <b style={{ color: PRINT.acc }}>~{agg.gerador} kVA</b>.</p>
          </section>
        )}

        {showSignal && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={h3}>Cabeamento de Sinal</h3>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Portas de dados por tela — régua de <b>pixels reais</b> (processadores VX/série A/Colorlight) ou de <b>área retangular</b> (controlador básico), conforme a configuração da tela. O selo numerado indica o início de cada cabo (canto inferior-esquerdo).</p>
            {telas.map((t) => {
              const { sinalBudget, sinalRule, sinalBits, pxPort } = cableMeta(t);
              const ports = cablePorts(t, "sinal", numbering);
              return (
                <div key={t.id} style={telaBlock}>
                  <div style={telaTitle}>{t.nome} — {ports.length} {ports.length === 1 ? "porta" : "portas"} · máx {sinalBudget} gab/porta · {sinalRule === "px" ? `pixels reais: ${pxPort.toLocaleString("pt-BR")} px (${sinalBits}-bit)` : "área quadrada"}</div>
                  <CableMap tela={t} mode="sinal" numbering={numbering} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {ports.map((p, i) => { const pct = Math.round(((sinalRule === "px" ? p.length : bboxArea(p)) / sinalBudget) * 100); return (
                      <span key={i} style={{ ...chip, borderColor: pct > 100 ? PRINT.red : PRINT.line }}><span style={sw(i)} />Porta {i + 1} · {pct}% · {p.length} gab</span>
                    ); })}
                  </div>
                </div>
              );
            })}
          </section>
        )}

        {showAC && (
          <section style={{ marginBottom: 24 }}>
            <h3 style={h3}>Energia — Cabeamento AC</h3>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Cabos de energia por tela: quantidade, capacidade do conector e carga por cabo.</p>
            {telas.map((t) => {
              const { ampCab, connRating, acBudget } = cableMeta(t);
              const ports = cablePorts(t, "ac", numbering);
              return (
                <div key={t.id} style={telaBlock}>
                  <div style={telaTitle}>{t.nome} — {ports.length} {ports.length === 1 ? "cabo" : "cabos"} · máx {acBudget} gab/cabo · {ampCab.toFixed(2)} A/gab · conector {connRating} A</div>
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
    </div>
  );
}
