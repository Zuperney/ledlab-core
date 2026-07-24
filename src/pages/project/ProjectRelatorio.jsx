// pages/project/ProjectRelatorio.jsx — relatório imprimível (PDF via navegador).
// Completo inclui: visão geral, vídeo/resolução, elétrica, cabeamento de SINAL e de
// ENERGIA (AC) — cada um com descrição (nº de cabos, capacidade) e o MAPA DE CABOS
// no mesmo visual da aba Cabeamento (services/cabling.js).
import { useState, useRef, useEffect } from "react";
import { Printer, LayoutGrid, Monitor, Zap, Network, Plug, BookOpen } from "lucide-react";
import HelpTip from "../../components/HelpTip.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { aggregateElectrical, projectRollup, screenRollup, isoDate } from "../../services/projectCalc.js";
import { cableMeta, cablePorts, bboxArea, portOffset } from "../../services/cabling.js";
import { hasScreens, projectScreenReport, telasSemScreen } from "../../services/screenCabling.js";
import { pixelMapPorts } from "../../services/pixelMap.js";
import { formatRange, formatFull } from "../../services/dates.js";
import { STATUS } from "../../components/StatusBadge.jsx";
import CableMap from "../../components/CableMap.jsx";
import ScreenCableMap from "../../components/ScreenCableMap.jsx";
import ReportTelasCanvas from "../../components/ReportTelasCanvas.jsx";
import { ReportCoverPage, SectionHead, SubHead, Chip, DenseTable, WarnBox } from "./reportUi.jsx";
import { T, PRINT } from "../../ui/tokens.js";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import { btn } from "../../ui/styles.js";
import { fileName, printAs } from "../../services/filenames.js";

const TYPES = ["Completo", "Resumido", "Elétrico", "Mapa de cabos", "Estrutural", "Design", "Gabinetes"];
// largura fixa "de impressão": no mobile o relatório é montado nela e escalado (zoom) p/ caber
const DOC_W = 800;

// disciplinas do caderno técnico: cor de índice por seção (produção / vídeo / elétrica)
const DISC = { prod: "#475569", video: "#1d4ed8", elec: "#c2410c" };
// peso legível: ≥ 1 tonelada vira "t"
const fmtPeso = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`);

// glossário do caderno técnico (leitor leigo/cliente) — termos que aparecem no doc
const GLOSSARIO = [
  { t: "Pico × Típico", d: "Pico = branco pleno, dimensiona disjuntor e cabo. Típico = consumo médio real do conteúdo, estima energia e gerador." },
  { t: "kVA × kW", d: "kW é a potência real; kVA a aparente (kW ÷ FP). Disjuntor e gerador se dimensionam em kVA/corrente." },
  { t: "FP (fator de potência)", d: "Relação entre potência real e aparente do gabinete (ex.: 0,90). Entra na corrente e no kVA." },
  { t: "Pitch", d: "Distância entre centros de LEDs (mm). Menor pitch = mais resolução por m² e menor distância mínima de visão." },
  { t: "APL / conteúdo", d: "Nível médio da imagem — quanto do branco pleno o vídeo acende, em média. Escala o consumo típico." },
  { t: "Gabinete", d: "Módulo físico de LED (cabinet + receiving card). Menor unidade de montagem e cabeamento." },
  { t: "Tela", d: "Bloco de gabinetes iguais montados juntos — a unidade de projeto do app." },
  { t: "Screen", d: "O sistema como a controladora enxerga, onde correm as portas 1..N. Pode reunir várias telas." },
  { t: "Porta × Circuito", d: "Porta = saída de dados Gigabit da controladora. Circuito = cabo de energia (AC)." },
  { t: "Disjuntor", d: "Proteção do circuito, dimensionada acima da corrente de pico (margem de carga contínua)." },
  { t: "Trifásico (F+F+F+N)", d: "Alimentação em 3 fases + neutro — distribui a carga e reduz a corrente por fase." },
  { t: "Serpentina", d: "Roteamento em zigue-zague dos cabos para minimizar comprimento e cruzamentos." },
];

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
  const showGloss = type === "Completo"; // glossário só no caderno completo (leitor leigo/cliente)

  const th = { textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 10, textTransform: "uppercase" };
  const td = { padding: "6px 10px", borderBottom: `1px solid ${PRINT.line}`, color: PRINT.ink };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${PRINT.line}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: PRINT.ink };
  const sw = (i) => ({ width: 10, height: 10, borderRadius: 2, background: colorOf(i), flexShrink: 0 });
  // "porta 7" · "portas 7–12" · "sem portas" — a faixa que a tela ocupa na numeração
  // global do projeto. Tela vazia tem 0 portas: sem isso sairia o intervalo "1–0".
  const portLabel = (off, n, sing) => (n === 0 ? `sem ${sing}s` : n === 1 ? `${sing} ${off + 1}` : `${sing}s ${off + 1}–${off + n}`);

  // com Screens, o SINAL vem delas (uma seção por Screen, portas 1..N por Screen).
  // Sem Screens, segue por tela (legado). O AC não muda: segue o físico, por tela.
  const usaScreens = hasScreens(project);
  const screenReport = usaScreens ? projectScreenReport(project, "sinal", numbering) : [];
  const screenReportAc = usaScreens ? projectScreenReport(project, "ac", numbering) : [];
  const semScreen = usaScreens ? telasSemScreen(project) : [];
  const screensById = Object.fromEntries((project.screens || []).map((s) => [s.id, s])); // p/ o mapa visual por Screen
  const gabsUsados = [...new Map(telas.filter((t) => t.gabinete?.nome).map((t) => [t.gabinete.nome, t.gabinete])).values()]; // modelos distintos p/ chips
  const fpLabel = [...new Set(gabsUsados.map((g) => parseFloat(g.fp) || 0.85))].sort((a, b) => a - b).map((f) => f.toFixed(2).replace(".", ",")).join(" · "); // FP dos gabinetes do projeto
  const telaBlock = { marginBottom: 16, breakInside: "avoid" };
  // specs de configuração de uma Screen (o que o operador precisa no processador)
  const screenSpec = (s) => {
    const scr = screensById[s.id];
    const g = (scr?.telaIds || []).map((id) => telas.find((t) => t.id === id)).filter(Boolean)[0]?.gabinete;
    const resX = parseFloat(g?.resX) || 128, resY = parseFloat(g?.resY) || 128;
    return { resX, resY, cols: Math.round(s.size.w / resX), rows: Math.round(s.size.h / resY), hz: parseFloat(scr?.sinal?.hz) || 60 };
  };
  let secN = 0; const sec = () => ++secN; // numera as seções exibidas, na ordem

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {TYPES.map((t) => (
            <button key={t} onClick={() => setType(t)} style={{ padding: "6px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${type === t ? T.acc : T.bd}`, background: type === t ? T.acc : "transparent", color: type === t ? "#fff" : T.mut }}>{t}</button>
          ))}
        </div>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <button style={btn("primary")} onClick={() => printAs(fileName([project.name, "relatorio", type]))}><Printer size={15} /> Imprimir / Salvar PDF</button>
          {/* o aviso do PDF virou "?" ao lado do botão que ele explica (era um box fixo) */}
          <HelpTip title="Dica pro PDF sair certo">
            Ao salvar o PDF, ative <b style={{ color: T.txt }}>“Gráficos de segundo plano”</b> na janela de impressão — sem isso a capa e as cores dos cabos saem apagadas.
          </HelpTip>
        </span>
      </div>

      <div ref={docWrapRef} style={{ overflow: "hidden" }}>
      <div className="report-doc" style={{ background: "#fff", color: PRINT.ink, border: "1px solid #cbd5e1", borderRadius: 16, padding: 40, fontSize: 13, margin: "0 auto", width: isMobile ? DOC_W : "100%", maxWidth: isMobile ? "none" : 1120, zoom: isMobile ? docZoom : undefined }}>
        <ReportCoverPage docType={type} name={project.name} generated={today}
          fields={[
            { label: "Cliente", value: project.cliente },
            { label: "Local", value: project.local },
            { label: "Status", value: STATUS[project.status]?.l },
            { label: "Data de realização", value: formatRange(project.dataInicio, project.dataFim) },
          ]}
          stats={[
            { label: "Área", value: `${roll.area_m2.toFixed(1)} m²` },
            { label: "Peso", value: fmtPeso(roll.peso_kg) },
            ...(showElec ? [
              { label: "Pico", value: `${Math.round(parseFloat(agg.kVA))} kVA` },
              { label: "Gerador", value: `~${Math.round(parseFloat(agg.gerador))} kVA` },
            ] : []),
          ]} />

        {showPhys && (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Visão Geral" tag="Composição do painel" color={DISC.prod} Icon={LayoutGrid} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Dimensão</th><th style={th}>Grade</th><th style={th}>Modelo</th><th style={th}>Gabinetes</th><th style={th}>Peso</th><th style={th}>{showElec ? "Carga" : "Peso por gabinete"}</th></tr></thead>
              <tbody>
                {telas.map((t) => { const r = screenRollup(t); return (
                  <tr key={t.id}><td style={td}>{t.nome}</td><td style={td}>{r.dim.largura_m.toFixed(1)}×{r.dim.altura_m.toFixed(1)} m</td><td style={td}>{t.cols}×{t.rows}</td><td style={td}>{t.gabinete?.nome}</td><td style={td}>{r.gab}</td><td style={td}>{fmtPeso(r.peso_kg)}</td>{showElec ? <td style={{ ...td, color: PRINT.red }}>{(r.pwrMax_w / 1000).toFixed(1)} kW</td> : <td style={td}>{(parseFloat(t.gabinete?.peso) || 0).toFixed(1)} kg</td>}</tr>
                ); })}
                <tr style={{ fontWeight: 700 }}><td style={td}>Total</td><td style={td}>{roll.area_m2.toFixed(1)} m²</td><td style={td}></td><td style={td}></td><td style={td}>{roll.gab}</td><td style={td}>{fmtPeso(roll.peso_kg)}</td>{showElec ? <td style={{ ...td, color: PRINT.red }}>{(roll.pwrMax_w / 1000).toFixed(1)} kW</td> : <td style={td}></td>}</tr>
              </tbody>
            </table>
            {gabsUsados.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: PRINT.dim, textTransform: "uppercase", marginBottom: 8 }}>Gabinetes utilizados</div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {gabsUsados.map((g, i) => <Chip key={g.nome} color={colorOf(i)} title={g.nome} sub={g.pitch ? `${parseFloat(g.pitch).toFixed(1)} mm` : g.resX && g.resY ? `${g.resX}×${g.resY}px` : undefined} />)}
                </div>
              </div>
            )}
          </section>
        )}

        {showVideo && (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Vídeo / Resolução" tag="Sinal e proporção" color={DISC.video} Icon={Monitor} />
            <p style={{ color: PRINT.mut, fontSize: 12 }}>As telas em fila (nome de cada uma no seu bloco) — a largura somada é a resolução linear do projeto, pela altura da tela maior.</p>
            <ReportTelasCanvas project={project} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Resolução (px)</th><th style={th}>Aspecto</th><th style={th}>Grade</th><th style={th}>Pixel por gabinete</th></tr></thead>
              <tbody>
                {telas.map((t) => { const v = videoOf(t); return (
                  <tr key={t.id}><td style={td}>{t.nome}</td><td style={{ ...td, fontWeight: 600 }}>{v.pxW} × {v.pxH}</td><td style={{ ...td, color: PRINT.acc, fontWeight: 600 }}>{v.ar}</td><td style={td}>{t.cols}×{t.rows}</td><td style={td}>{t.gabinete?.resX && t.gabinete?.resY ? `${t.gabinete.resX}×${t.gabinete.resY}` : "—"}</td></tr>
                ); })}
              </tbody>
            </table>
          </section>
        )}

        {showElec && (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Informações Elétricas" tag="Energia · dimensionamento" color={DISC.elec} Icon={Zap} />
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Dimensionamento em <b style={{ color: PRINT.ink }}>{agg.vc.label}</b>. A potência de <b>pico</b> define o disjuntor e a bitola dos cabos; a potência <b>típica</b> (consumo médio em operação) estima o gerador.</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Gabinetes</th><th style={th}>Pico kW</th><th style={th}>Pico kVA</th><th style={th}>Pico A</th><th style={th}>Disjuntor</th><th style={th}>Típico kVA</th><th style={th}>Típico A</th></tr></thead>
              <tbody>
                {agg.perTela.map(({ tela, gab, peak, typ }) => (
                  <tr key={tela.id}><td style={td}>{tela.nome}</td><td style={td}>{gab}</td><td style={{ ...td, color: PRINT.red }}>{(peak.W / 1000).toFixed(1)}</td><td style={td}>{peak.kVA}</td><td style={{ ...td, color: PRINT.amb }}>{peak.I}</td><td style={{ ...td, color: PRINT.red }}>{peak.breaker} A</td><td style={td}>{typ.kVA}</td><td style={td}>{typ.I}</td></tr>
                ))}
                <tr style={{ fontWeight: 700 }}><td style={td}>Total</td><td style={td}>{roll.gab}</td><td style={{ ...td, color: PRINT.red }}>{(agg.W / 1000).toFixed(1)}</td><td style={td}>{agg.kVA}</td><td style={{ ...td, color: PRINT.amb }}>{agg.I}</td><td style={{ ...td, color: PRINT.red }}>{agg.breaker} A</td><td style={td}>{agg.typKva}</td><td style={td}>{agg.typI}</td></tr>
              </tbody>
            </table>
            <p style={{ color: PRINT.mut, fontSize: 12, marginTop: 8 }}>Gerador sugerido (típico + 25% de margem): <b style={{ color: PRINT.acc }}>~{agg.gerador} kVA</b>.</p>
            <div style={{ marginTop: 6, padding: "10px 12px", borderRadius: 8, background: PRINT.head, border: `1px solid ${PRINT.line}`, fontSize: 11, color: PRINT.mut }}>
              <div style={{ fontFamily: "ui-monospace, monospace", color: PRINT.ink, fontSize: 12, marginBottom: 5 }}>Típico por gabinete = base + (pico − base) × brilho × conteúdo</div>
              O consumo real fica entre <b>tela preta</b> (base) e <b>branco pleno</b> (pico); o <b>brilho</b> calibrado ({Math.round(agg.brilho * 100)}%) e o <b>conteúdo</b> médio do vídeo ({Math.round(agg.conteudo * 100)}%) escalam só a parcela dinâmica.{fpLabel ? <> Fator de potência dos gabinetes: <b>{fpLabel}</b>.</> : null} Modelo baseado no estudo de consumo de painéis de LED da Barco.
            </div>
          </section>
        )}

        {showSignal && usaScreens && (() => { const sn = sec(); const S = String(sn).padStart(2, "0"); return (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sn} title="Cabeamento de Sinal" tag="Portas de dados" color={DISC.video} Icon={Network} />
            {screenReport.map((s, i) => { const sp = screenSpec(s); return (
              <div key={s.id} className="rp-block" style={telaBlock}>
                <SubHead n={`${S}.${i + 1}`} title={s.nome} />
                <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 20px", fontSize: 11.5, color: PRINT.mut, margin: "0 0 10px", padding: "9px 13px", background: PRINT.head, borderRadius: 8, border: `1px solid ${PRINT.line}` }}>
                  <span>Resolução da Screen <b style={{ color: PRINT.ink }}>{s.size.w.toLocaleString("pt-BR")} × {s.size.h.toLocaleString("pt-BR")} px</b></span>
                  <span>Frequência <b style={{ color: PRINT.ink }}>{sp.hz} Hz</b></span>
                  <span>Gabinete <b style={{ color: PRINT.ink }}>{sp.resX} × {sp.resY} px</b></span>
                  <span>Grade da Screen <b style={{ color: PRINT.ink }}>{sp.cols} × {sp.rows} gabinetes</b></span>
                  <span>Total de cabos <b style={{ color: PRINT.ink }}>{s.ports.length}</b></span>
                </div>
                {screensById[s.id] && <div style={{ marginBottom: 10 }}><ScreenCableMap screen={screensById[s.id]} telas={telas} kind="sinal" numbering={numbering} /></div>}
                <DenseTable data={s.ports} maxCols={4} columns={[
                  { key: "n", label: "Porta", render: (p) => <><span style={{ ...sw(p.n - 1), display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />{p.n}</> },
                  { key: "count", label: "Gabinetes", align: "right", render: (p) => p.count },
                  { key: "pct", label: "Uso", align: "right", render: (p) => `${p.pct}%`, tdStyle: (p) => ({ fontWeight: 600, color: p.pct > 100 ? PRINT.red : PRINT.ink }) },
                ]} />
              </div>
            ); })}
            {semScreen.length > 0 && (
              <p style={{ color: PRINT.amb, fontSize: 11.5, marginTop: 4 }}>
                <b>{semScreen.length} tela(s) fora de qualquer Screen</b> ({semScreen.map((t) => t.nome).join(", ")}) — não entraram em nenhum sistema, então não têm cabeamento de sinal.
              </p>
            )}
          </section>
        ); })()}

        {showSignal && !usaScreens && (() => { const sn = sec(); const S = String(sn).padStart(2, "0"); return (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sn} title="Cabeamento de Sinal" tag="Portas de dados" color={DISC.video} Icon={Network} />
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Portas de dados por tela — régua de <b>pixels reais</b> (processadores VX/série A/Colorlight) ou de <b>área retangular</b> (controlador básico), conforme a configuração da tela. O selo numerado indica o início de cada cabo.</p>
            {telas.map((t, i) => {
              const { sinalBudget, sinalRule, sinalBits, pxPort } = cableMeta(t);
              const ports = cablePorts(t, "sinal", numbering);
              const off = portOffset(telas, t.id, "sinal", numbering); // portas 1..N do projeto
              return (
                <div key={t.id} className="rp-block" style={telaBlock}>
                  <SubHead n={`${S}.${i + 1}`} title={t.nome} right={`${portLabel(off, ports.length, "porta")} · máx ${sinalBudget} gabinetes/porta · ${sinalRule === "px" ? `pixels reais: ${pxPort.toLocaleString("pt-BR")} px (${sinalBits}-bit)` : "área quadrada"}`} />
                  <CableMap tela={t} mode="sinal" numbering={numbering} offset={off} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {ports.map((p, i) => { const pct = Math.round(((sinalRule === "px" ? p.length : bboxArea(p)) / sinalBudget) * 100); return (
                      <span key={i} style={{ ...chip, borderColor: pct > 100 ? PRINT.red : PRINT.line }}><span style={sw(off + i)} />Porta {off + i + 1} · {pct}% · {p.length} gabinetes</span>
                    ); })}
                  </div>
                  {type === "Mapa de cabos" && (
                    <>
                      <div style={{ color: PRINT.mut, fontSize: 11, margin: "10px 0 4px" }}>Mapa de pixels — coordenada do 1º gabinete de cada porta (origem no canto superior-esquerdo) para transcrever no processador (NovaLCT / Tessera).</div>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead><tr>
                          <th style={th}>Porta</th><th style={th}>Gab.</th><th style={th}>Início (col, lin)</th><th style={th}>Início X, Y (px)</th><th style={th}>Área C×L</th>
                        </tr></thead>
                        <tbody>
                          {pixelMapPorts(t, numbering, off).map((p) => (
                            <tr key={p.port}>
                              <td style={td}>{p.port}</td>
                              <td style={td}>{p.count}</td>
                              <td style={td}>{p.startCol}, {p.startRow}</td>
                              <td style={td}>{p.startX}, {p.startY}</td>
                              <td style={td}>{p.bboxCols}×{p.bboxRows}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </>
                  )}
                </div>
              );
            })}
          </section>
        ); })()}

        {showAC && usaScreens && (() => { const sn = sec(); const S = String(sn).padStart(2, "0"); return (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sn} title="Energia — Cabeamento AC" tag="Circuitos de força" color={DISC.elec} Icon={Plug} />
            <WarnBox title="Atenção — energização" tone="amber">Conectores <b>powerCON azuis NÃO podem ser (des)conectados sob carga</b>. Cabo de 1,5 mm² limita cada circuito em <b>16 A</b> (cálculo a 220 V) — confira a corrente por cabo na tabela antes de energizar.</WarnBox>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Cabos de energia <b>por Screen</b>, na mesma organização do sinal — carga por cabo × corrente do conector. Circuitos numerados 1..N por Screen.</p>
            {screenReportAc.map((s, i) => (
              <div key={s.id} className="rp-block" style={telaBlock}>
                <SubHead n={`${S}.${i + 1}`} title={s.nome} right={`${s.ports.length} ${s.ports.length === 1 ? "cabo" : "cabos"}`} />
                {screensById[s.id] && <div style={{ marginBottom: 10 }}><ScreenCableMap screen={screensById[s.id]} telas={telas} kind="ac" numbering={numbering} /></div>}
                <DenseTable data={s.ports} maxCols={4} columns={[
                  { key: "n", label: "Cabo", render: (p) => <><span style={{ ...sw(p.n - 1), display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />{p.n}</> },
                  { key: "count", label: "Gabinetes", align: "right", render: (p) => p.count },
                  { key: "load", label: "Carga", align: "right", render: (p) => `${p.load.toFixed(1)} A · ${p.pct}%`, tdStyle: (p) => ({ fontWeight: 600, color: p.over ? PRINT.red : PRINT.ink, whiteSpace: "nowrap" }) },
                ]} />
              </div>
            ))}
          </section>
        ); })()}

        {showAC && !usaScreens && (() => { const sn = sec(); const S = String(sn).padStart(2, "0"); return (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sn} title="Energia — Cabeamento AC" tag="Circuitos de força" color={DISC.elec} Icon={Plug} />
            <WarnBox title="Atenção — energização" tone="amber">Conectores <b>powerCON azuis NÃO podem ser (des)conectados sob carga</b>. Cabo de 1,5 mm² limita cada circuito em <b>16 A</b> (cálculo a 220 V) — confira a corrente por cabo na tabela antes de energizar.</WarnBox>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Cabos de energia por tela: quantidade, capacidade do conector e carga por cabo.</p>
            {telas.map((t, i) => {
              const { ampCab, connRating, acBudget } = cableMeta(t);
              const ports = cablePorts(t, "ac", numbering);
              const off = portOffset(telas, t.id, "ac", numbering); // circuitos 1..N do projeto
              return (
                <div key={t.id} className="rp-block" style={telaBlock}>
                  <SubHead n={`${S}.${i + 1}`} title={t.nome} right={`${portLabel(off, ports.length, "cabo")} · máx ${acBudget} gabinetes/cabo · ${ampCab.toFixed(2)} A/gabinete · conector ${connRating} A`} />
                  <CableMap tela={t} mode="ac" numbering={numbering} offset={off} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {ports.map((p, i) => { const load = p.length * ampCab; const pct = Math.round((load / connRating) * 100); return (
                      <span key={i} style={{ ...chip, borderColor: pct > 100 ? PRINT.red : PRINT.line }}><span style={sw(off + i)} />Cabo {off + i + 1} · {load.toFixed(1)} A ({pct}%) · {p.length} gabinetes</span>
                    ); })}
                  </div>
                </div>
              );
            })}
          </section>
        ); })()}

        {showGloss && (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Glossário" tag="Termos técnicos" color={DISC.prod} Icon={BookOpen} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "11px 30px" }}>
              {GLOSSARIO.map((g, i) => (
                <div key={i} style={{ breakInside: "avoid" }}>
                  <div style={{ fontWeight: 700, color: PRINT.ink, fontSize: 12.5 }}>{g.t}</div>
                  <div style={{ color: PRINT.mut, fontSize: 11.5, lineHeight: 1.5 }}>{g.d}</div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
      </div>
    </div>
  );
}
