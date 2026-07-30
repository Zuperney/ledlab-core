// pages/project/ProjectRelatorio.jsx — relatório imprimível (PDF via navegador).
// Completo inclui: visão geral, vídeo/resolução, elétrica, cabeamento de SINAL e de
// ENERGIA (AC) — cada um com descrição (nº de cabos, capacidade) e o MAPA DE CABOS
// no mesmo visual da aba Cabeamento (services/cabling.js).
import { useState, useRef, useEffect } from "react";
import { Printer, Download, LayoutGrid, Monitor, Zap, Network, Plug, BookOpen, Anchor } from "lucide-react";
import { useToast } from "../../store/UIContext.jsx";
import HelpTip from "../../components/HelpTip.jsx";
import Segmented from "../../components/Segmented.jsx";
import Select from "../../components/Select.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { aggregateElectrical, projectRollup, screenRollup, isoDate } from "../../services/projectCalc.js";
import { acTone } from "../../services/electricalCalc.js";
import { cableMeta, cablePorts, bboxArea, portOffset } from "../../services/cabling.js";
import { hasScreens, projectScreenReport, telasSemScreen } from "../../services/screenCabling.js";
import { pixelMapPorts } from "../../services/pixelMap.js";
import { formatRange, formatFull } from "../../services/dates.js";
import { GLOSSARIO, AVISO_AC, DISC, fmtPeso, portLabel, videoOf } from "../../services/reportContent.js";
import { AVISO_RIG, CHECK_SUBIR, RIG_SEM_DADO, RIG_SEM_PESO, rigGrupos, rigGrupoTitulo, rigGrupoMeta, rigTextoAcima, rigStatusTela, RIG_PILL, nRig } from "../../services/reportContent.js";
import { projectRigging, DEFAULT_RIG } from "../../services/rigging.js";
import { useCabinets } from "../../hooks/useCabinets.js";
import { STATUS } from "../../components/StatusBadge.jsx";
import CableMap from "../../components/CableMap.jsx";
import ScreenCableMap from "../../components/ScreenCableMap.jsx";
import ReportTelasCanvas from "../../components/ReportTelasCanvas.jsx";
import { ReportCoverPage, SectionHead, SubHead, Chip, DenseTable, WarnBox, StatRow } from "./reportUi.jsx";
import { T, PRINT } from "../../ui/tokens.js";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import { btn } from "../../ui/styles.js";
import { fileName, printAs } from "../../services/filenames.js";

const TYPES = ["Completo", "Resumido", "Elétrico", "Mapa de cabos", "Estrutural", "Design", "Gabinetes"];
// no CELULAR só o essencial de consulta (pedido do usuário): imprimir/tipos finos é fluxo de PC
const TYPES_MOBILE = ["Completo", "Resumido", "Mapa de cabos"];
// largura fixa "de impressão": no mobile o relatório é montado nela e escalado (zoom) p/ caber
const DOC_W = 800;
// tipo de montagem — rótulo de UI (código guarda "empilhado", que casa com o
// campo empilhadoMaxM da Biblioteca)
const MODO_LABEL = { voado: "Voada", empilhado: "Sentada (empilhada)" };
const selSty = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 13, fontWeight: 600, minHeight: 38 };

export default function ProjectRelatorio({ project, patch }) {
  const { prefs } = useLedLabContext();
  const { cabs } = useCabinets();
  const { colorOf, palette } = useCablePalette();
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
  // F1 do motor nativo: o pdfmake (pesado) só carrega no clique — chunk separado
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const toast = useToast();
  const baixarPdf = async () => {
    setGerandoPdf(true);
    try {
      const { baixarRelatorioPdf } = await import("../../services/pdf/pdfEngine.js");
      await baixarRelatorioPdf({ project, tipo: type, cfg, gerado: today, numbering, palette, render: prefs.cablingRender, cabs });
      toast("PDF gerado");
    } catch (e) {
      console.error(e);
      toast("Não deu pra gerar o PDF — tenta de novo", "info");
    }
    setGerandoPdf(false);
  };
  const showElec = ["Completo", "Resumido", "Elétrico"].includes(type);
  const showPhys = ["Completo", "Resumido", "Estrutural", "Gabinetes", "Design"].includes(type);
  const showVideo = ["Completo", "Resumido", "Design"].includes(type);
  const showSignal = ["Completo", "Mapa de cabos"].includes(type);
  const showAC = ["Completo", "Mapa de cabos"].includes(type); // AC saiu do Elétrico → foco em tabelas
  const showGloss = type === "Completo"; // glossário só no caderno completo (leitor leigo/cliente)
  // ESTRUTURA (F2) — peso e limites. `project.rigging` guarda a escolha do
  // usuário: `mostrar` (a seção entra no Completo?) e `modo` (voado × sentado).
  // No tipo "Estrutural" a seção sai sempre — pedir esse relatório JÁ é o opt-in.
  const rigCfg = { ...DEFAULT_RIG, ...(project.rigging || {}) };
  const setRig = (partial) => patch?.({ rigging: { ...rigCfg, ...partial } });
  const showRig = telas.length > 0 && (type === "Estrutural" || (type === "Completo" && rigCfg.mostrar !== false));
  // `cabs` entra pro limite do fabricante vir VIVO da biblioteca: o snapshot da
  // tela congela o que se sabia na criação, e o limite publicado é fato sobre o
  // modelo — confirmar o número hoje tem que valer pro caderno de ontem.
  const rp = showRig ? projectRigging(project, rigCfg, cabs) : null;

  const th = { textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 10, textTransform: "uppercase" };
  const td = { padding: "6px 10px", borderBottom: `1px solid ${PRINT.line}`, color: PRINT.ink };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${PRINT.line}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: PRINT.ink };
  const sw = (i) => ({ width: 10, height: 10, borderRadius: 2, background: colorOf(i), flexShrink: 0 });
  // pílula de status da cadeia: "sem dado" é CINZA, nunca verde — ausência de
  // limite publicado não é folga (docs/rigging-spec.md §3.2)
  const RIG_C = { ok: PRINT.grn, acima: PRINT.red, semDado: PRINT.dim };
  const rigPill = (status) => ({ display: "inline-block", padding: "1px 8px", borderRadius: 999, fontSize: 10, fontWeight: 700, border: `1px solid ${RIG_C[status]}`, color: RIG_C[status], whiteSpace: "nowrap" });

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
    return { resX, resY, cols: Math.round(s.size.w / resX), rows: Math.round(s.size.h / resY), hz: parseFloat(scr?.sinal?.hz) || 60, overclock: scr?.sinal?.overclock === true };
  };
  let secN = 0; const sec = () => ++secN; // numera as seções exibidas, na ordem

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {/* F1: tipo do relatório = Segmented (rolável); mobile mostra só os 3 de consulta */}
        <Segmented value={type} onChange={setType} size="sm"
          options={(isMobile ? TYPES_MOBILE : TYPES).map((t) => ({ value: t, label: t }))} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {/* ESTRUTURA: toggle de exibição (só no Completo — no Estrutural a seção
              é a razão do relatório) + tipo de montagem. Gravam project.rigging. */}
          {type === "Completo" && (
            <button aria-pressed={rigCfg.mostrar !== false} title="Peso e estrutura no relatório" aria-label="Peso e estrutura no relatório"
              onClick={() => setRig({ mostrar: rigCfg.mostrar === false })}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 38, height: 38, borderRadius: 8, background: rigCfg.mostrar !== false ? T.sel : "transparent", border: `1px solid ${rigCfg.mostrar !== false ? T.acc : T.bd}`, color: rigCfg.mostrar !== false ? T.acM : T.mut, cursor: "pointer", padding: 0 }}>
              <Anchor size={16} />
            </button>
          )}
          {showRig && (
            <Select value={rigCfg.modo} onChange={(e) => setRig({ modo: e.target.value })} title="Tipo de montagem" style={selSty}>
              <option value="voado">Voada</option>
              <option value="empilhado">Sentada (empilhada)</option>
            </Select>
          )}
          {/* MOTOR NATIVO (F1): gera o PDF no app — funciona no celular, com nome
              certo e sem "gráficos de segundo plano". Imprimir fica de fallback. */}
          <button style={btn("primary", gerandoPdf ? { opacity: 0.6, cursor: "wait" } : {})} disabled={gerandoPdf} onClick={baixarPdf}>
            <Download size={15} /> {gerandoPdf ? "Gerando…" : "Baixar PDF"}
          </button>
          <button style={btn("ghost")} onClick={() => printAs(fileName([project.name, "relatorio", type]))} title="Imprimir pelo navegador (fallback)"><Printer size={15} />{!isMobile && " Imprimir"}</button>
          <HelpTip title="Dica pro Imprimir do navegador">
            O <b style={{ color: T.txt }}>Baixar PDF</b> já sai pronto. Se usar o Imprimir do navegador, ative <b style={{ color: T.txt }}>“Gráficos de segundo plano”</b> — sem isso a capa e as cores saem apagadas.
          </HelpTip>
        </span>
      </div>

      <div ref={docWrapRef} style={{ overflow: "hidden" }}>
      <div className="report-doc" style={{ background: "#fff", color: PRINT.ink, border: "1px solid #cbd5e1", borderRadius: 16, padding: 40, fontSize: 13, margin: "0 auto", width: isMobile ? DOC_W : "100%", maxWidth: isMobile ? "none" : 1120, zoom: isMobile ? docZoom : undefined }}>
        <ReportCoverPage docType={type} name={project.name} generated={today} logo={project.logo}
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

        {showRig && (() => { const sn = sec(); const S = String(sn).padStart(2, "0"); const r0 = rp.telas[0].rig; const maiorAltura = rp.telas.reduce((m, r) => Math.max(m, r.rig.alturaM), 0); return (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sn} title="Peso e estrutura" tag={`Estrutura · parede ${r0.modo === "empilhado" ? "sentada" : "voada"}`} color={DISC.estr} Icon={Anchor} />
            <p style={{ color: PRINT.mut, fontSize: 12 }}>
              Peso da parede e a checagem contra os <b style={{ color: PRINT.ink }}>limites publicados pelo fabricante</b>, no tipo de montagem escolhido — aritmética sobre a grade e o peso do gabinete.
              O que o fabricante não publica sai como <b style={{ color: PRINT.ink }}>não informado</b>, nunca estimado.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, margin: "10px 0 4px" }}>
              <span style={chip}>Montagem <b style={{ marginLeft: 3 }}>{MODO_LABEL[r0.modo]}</b></span>
            </div>

            <StatRow items={[
              { label: "Peso total", value: rp.totalKg > 0 ? fmtPeso(rp.totalKg) : "—" },
              { label: "Gabinetes", value: roll.gab },
              { label: "Maior altura", value: maiorAltura > 0 ? `${nRig(maiorAltura)} m` : "—" },
            ]} />

            {rp.algumSemPeso && <WarnBox title={RIG_SEM_PESO.titulo} tone="amber">{RIG_SEM_PESO.partes.map((p, i) => (p.b ? <b key={i}>{p.t}</b> : <span key={i}>{p.t}</span>))}</WarnBox>}

            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Grade</th><th style={th}>Gabinete</th><th style={th}>Altura</th><th style={th}>Peso</th><th style={th}>Limite do fabricante</th></tr></thead>
              <tbody>
                {rp.telas.map(({ tela: t, rig }) => (
                  <tr key={t.id}>
                    <td style={td}>{t.nome}</td>
                    <td style={td}>{rig.cols}×{rig.rows}</td>
                    <td style={td}>{t.gabinete?.nome || "—"}</td>
                    <td style={td}>{rig.alturaM > 0 ? `${nRig(rig.alturaM)} m` : "—"}</td>
                    <td style={td}>{rig.semPeso ? "—" : fmtPeso(rig.totalKg)}</td>
                    <td style={td}><span style={rigPill(rigStatusTela(rig))}>{RIG_PILL[rigStatusTela(rig)]}</span></td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td style={td}>Total</td><td style={td}>{roll.gab} gab.</td><td style={td}></td><td style={td}></td>
                  <td style={td}>{rp.totalKg > 0 ? <>{fmtPeso(rp.totalKg)}{rp.algumSemPeso && <span style={{ fontWeight: 400, color: PRINT.amb }}> (parcial)</span>}</> : "—"}</td>
                  <td style={td}></td>
                </tr>
              </tbody>
            </table>

            {/* uma CADEIA por GRUPO de telas que contam a mesma história (rigGrupos) */}
            {rigGrupos(rp.telas).map((g, i) => {
              const { rig, travaExtra, cadeia } = g;
              return (
                <div key={i} className="rp-block" style={telaBlock}>
                  <SubHead n={`${S}.${i + 1}`} title={rigGrupoTitulo(g)} right={rigGrupoMeta(g)} />
                  {rig.limiteAcima && <WarnBox title="Acima do limite do fabricante" tone="red">{rigTextoAcima(rig).map((p, k) => (p.b ? <b key={k}>{p.t}</b> : <span key={k}>{p.t}</span>))}</WarnBox>}
                  {rig.limiteSemDado && <WarnBox title={RIG_SEM_DADO.titulo} tone="amber">{RIG_SEM_DADO.partes.map((p, k) => (p.b ? <b key={k}>{p.t}</b> : <span key={k}>{p.t}</span>))}</WarnBox>}
                  {travaExtra && (
                    <WarnBox title="Ferragem extra por altura" tone="amber">
                      <b>Acima de {rig.limites.travaExtraAcima} gabinetes de altura este fabricante pede trava extra entre gabinetes.</b> É regra que muda a ferragem, não o número — confira o manual e o material separado pela locadora.
                    </WarnBox>
                  )}
                  <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: PRINT.dim, textTransform: "uppercase", margin: "10px 0 6px" }}>A cadeia — o que trava primeiro</div>
                  <div style={{ border: `1px solid ${PRINT.line}`, borderRadius: 8, overflow: "hidden" }}>
                    {cadeia.map((e, k) => (
                      <div key={e.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "7px 12px", borderTop: k ? `1px solid ${PRINT.line}` : undefined, background: k % 2 ? "#f8f8f8" : "transparent" }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontSize: 12, fontWeight: 700, color: PRINT.ink }}>{e.titulo}</div>
                          <div style={{ fontSize: 10.5, color: PRINT.dim }}>{e.sub}</div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap" }}>
                          {e.valor && <span style={{ fontSize: 11.5, color: PRINT.mut, fontFamily: "ui-monospace, monospace" }}>{e.valor}</span>}
                          <span style={rigPill(e.status)}>{e.pill}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}

            {r0.modo === "voado" && (
              <div style={{ breakInside: "avoid", marginTop: 16 }}>
                <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: PRINT.dim, textTransform: "uppercase", marginBottom: 6 }}>Antes de subir</div>
                <ul style={{ margin: 0, paddingLeft: 18, color: PRINT.mut, fontSize: 11.5, lineHeight: 1.6 }}>
                  {CHECK_SUBIR.map((c, i) => <li key={i}><b style={{ color: PRINT.ink }}>{c.b}</b>{c.t}</li>)}
                </ul>
              </div>
            )}

            <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 8, background: PRINT.head, border: `1px solid ${PRINT.line}`, fontSize: 11, color: PRINT.mut, breakInside: "avoid" }}>
              <div style={{ fontWeight: 800, color: PRINT.ink, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 10, marginBottom: 3 }}>{AVISO_RIG.titulo}</div>
              {AVISO_RIG.partes.map((p, i) => (p.b ? <b key={i} style={{ color: PRINT.ink }}>{p.t}</b> : <span key={i}>{p.t}</span>))}
            </div>
          </section>
        ); })()}

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
                  {/* premissa declarada: documento datado registra que passar do nominal foi escolha */}
                  {sp.overclock && <span>Overclock <b style={{ color: PRINT.amb }}>ligado — porta pode passar da capacidade nominal</b></span>}
                </div>
                {screensById[s.id] && <div style={{ marginBottom: 10 }}><ScreenCableMap screen={screensById[s.id]} telas={telas} kind="sinal" numbering={numbering} /></div>}
                <DenseTable data={s.ports} maxCols={4} columns={[
                  { key: "n", label: "Porta", render: (p) => <><span style={{ ...sw(p.n - 1), display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />{p.n}</> },
                  { key: "count", label: "Gabinetes", align: "right", render: (p) => p.count },
                  { key: "pct", label: "Uso", align: "right", render: (p) => `${p.pct}%`, tdStyle: (p) => ({ fontWeight: 600, color: p.over ? PRINT.red : p.oc ? PRINT.amb : PRINT.ink }) },
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
            <WarnBox title={AVISO_AC.titulo} tone="amber">{AVISO_AC.partes.map((p, i) => (p.b ? <b key={i}>{p.t}</b> : <span key={i}>{p.t}</span>))}</WarnBox>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Cabos de energia <b>por Screen</b>, na mesma organização do sinal — carga por cabo × corrente do conector. Circuitos numerados 1..N por Screen.</p>
            {screenReportAc.map((s, i) => (
              <div key={s.id} className="rp-block" style={telaBlock}>
                <SubHead n={`${S}.${i + 1}`} title={s.nome} right={`${s.ports.length} ${s.ports.length === 1 ? "cabo" : "cabos"}`} />
                {screensById[s.id] && <div style={{ marginBottom: 10 }}><ScreenCableMap screen={screensById[s.id]} telas={telas} kind="ac" numbering={numbering} /></div>}
                <DenseTable data={s.ports} maxCols={4} columns={[
                  { key: "n", label: "Cabo", render: (p) => <><span style={{ ...sw(p.n - 1), display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />{p.n}</> },
                  { key: "count", label: "Gabinetes", align: "right", render: (p) => p.count },
                  { key: "load", label: "Carga", align: "right", render: (p) => `${p.load.toFixed(1)} A · ${p.pct}%`, tdStyle: (p) => ({ fontWeight: 600, color: p.over ? PRINT.red : p.warn ? PRINT.amb : PRINT.ink, whiteSpace: "nowrap" }) },
                ]} />
              </div>
            ))}
          </section>
        ); })()}

        {showAC && !usaScreens && (() => { const sn = sec(); const S = String(sn).padStart(2, "0"); return (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sn} title="Energia — Cabeamento AC" tag="Circuitos de força" color={DISC.elec} Icon={Plug} />
            <WarnBox title={AVISO_AC.titulo} tone="amber">{AVISO_AC.partes.map((p, i) => (p.b ? <b key={i}>{p.t}</b> : <span key={i}>{p.t}</span>))}</WarnBox>
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
                    {ports.map((p, i) => { const load = p.length * ampCab; const pct = Math.round((load / connRating) * 100); const tone = acTone(pct); return (
                      <span key={i} style={{ ...chip, borderColor: tone === "over" ? PRINT.red : tone === "warn" ? PRINT.amb : PRINT.line }}><span style={sw(off + i)} />Cabo {off + i + 1} · {load.toFixed(1)} A ({pct}%) · {p.length} gabinetes</span>
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
