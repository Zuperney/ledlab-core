// pages/project/ProjectRelatorio.jsx — relatório imprimível (PDF via navegador).
// Completo inclui: visão geral, vídeo/resolução, elétrica, cabeamento de SINAL e de
// ENERGIA (AC) — cada um com descrição (nº de cabos, capacidade) e o MAPA DE CABOS
// no mesmo visual da aba Cabeamento (services/cabling.js).
import { useState, useRef, useEffect } from "react";
import { Printer, Download, LayoutGrid, Monitor, Zap, Network, Plug, BookOpen, Frame } from "lucide-react";
import { useToast } from "../../store/UIContext.jsx";
import HelpTip from "../../components/HelpTip.jsx";
import Segmented from "../../components/Segmented.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { aggregateElectrical, projectRollup, screenRollup, isoDate } from "../../services/projectCalc.js";
import { acTone, voltFull, phaseOf, phaseBalance } from "../../services/electricalCalc.js";
import { cableMeta, cablePorts, bboxArea, portOffset } from "../../services/cabling.js";
import { hasScreens, projectScreenReport, telasSemScreen, projectAcCabos } from "../../services/screenCabling.js";
import { pixelMapPorts } from "../../services/pixelMap.js";
import { formatRange, formatFull } from "../../services/dates.js";
import { GLOSSARIO, CRITERIOS, NORMAS, REFERENCIAS, AVISO_AC, DISC, fmtPeso, fmtFases, portLabel, videoOf, distVisaoGroups, canvasResumo, fichaPainel, fichaConteudo } from "../../services/reportContent.js";
import { videoSchemaSvg } from "../../services/pdf/pdfCableMap.js";
import { AVISO_ESTRUTURA, dadosDaFolha, plural, procedenciaDoPeso } from "../../services/estrutura/folha.js";
import { lerImagem } from "../../services/estrutura/imagem.js";
import { STATUS } from "../../components/StatusBadge.jsx";
import CableMap from "../../components/CableMap.jsx";
import ScreenCableMap from "../../components/ScreenCableMap.jsx";
import ReportTelasCanvas from "../../components/ReportTelasCanvas.jsx";
import ReportTestCards from "../../components/ReportTestCards.jsx";
import { ReportCoverPage, SectionHead, SubHead, Chip, DenseTable, WarnBox } from "./reportUi.jsx";
import { T, PRINT } from "../../ui/tokens.js";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import { tint } from "../../services/cableScene.js";
import { btn } from "../../ui/styles.js";
import { fileName, printAs } from "../../services/filenames.js";

// rigging saiu do app (decisão do dono, 02/08/2026 — reservado pro futuro 3D;
// pesquisa em docs/rigging-*.md). O peso físico segue na capa e na Visão Geral.
const TYPES = ["Completo", "Resumido", "Elétrico", "Mapa de cabos", "Design", "Gabinetes"];
// no CELULAR só o essencial de consulta (pedido do usuário): imprimir/tipos finos é fluxo de PC
const TYPES_MOBILE = ["Completo", "Resumido", "Mapa de cabos"];
// O caderno ESTRUTURA (decisão do dono, 19/08) é o que vai pra EQUIPE DE
// MONTAGEM: capa e a folha de estrutura, e nada mais — sem elétrica, sem vídeo,
// sem mapa de cabos. Quem sobe truss no galpão não precisa carregar 30 páginas
// de projeto de LED pra conferir a lista de peças.
//
// Só aparece quando HÁ estrutura montada: oferecer um tipo de caderno que sairia
// só com capa e uma folha vazia é oferecer papel em branco. Vale no celular
// também — a folha é leve, offline, e quem monta está com o telefone na mão.
const temEstrutura = (project) => (project?.estrutura?.pecas?.length ?? 0) > 0;
const tiposDe = (project, isMobile) => [
  ...(isMobile ? TYPES_MOBILE : TYPES),
  ...(temEstrutura(project) ? ["Estrutura"] : []),
];
// largura fixa "de impressão": no mobile o relatório é montado nela e escalado (zoom) p/ caber
const DOC_W = 800;

export default function ProjectRelatorio({ project }) {
  const { prefs } = useLedLabContext();
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
  // balanço por fase do projeto inteiro (seção elétrica): pico e típico por fase
  const acCabos = projectAcCabos(project, numbering);
  const balPico = phaseBalance(acCabos, agg.vc);
  const balTip = phaseBalance(acCabos.map((c) => ({ n: c.n, load: c.loadTip || 0 })), agg.vc);
  // F1 do motor nativo: o pdfmake (pesado) só carrega no clique — chunk separado
  const [gerandoPdf, setGerandoPdf] = useState(false);
  const toast = useToast();
  const baixarPdf = async () => {
    setGerandoPdf(true);
    try {
      const { baixarRelatorioPdf } = await import("../../services/pdf/pdfEngine.js");
      await baixarRelatorioPdf({ project, tipo: type, cfg, gerado: today, numbering, palette, render: prefs.cablingRender, assinatura: prefs.assinatura || "", coresEstrutura: prefs.estruturaCores });
      toast("PDF gerado");
    } catch (e) {
      console.error(e);
      toast("Não deu pra gerar o PDF — tenta de novo", "info");
    }
    setGerandoPdf(false);
  };
  // FOLHA DE TEST CARDS: export à parte (folha sem tamanho padrão, ver
  // services/pdf/folhaTestCards.js). Vive no Design, ao lado do "Baixar PDF" —
  // que segue sendo a única primária da aba (R1).
  const [gerandoFolha, setGerandoFolha] = useState(false);
  const baixarFolha = async () => {
    setGerandoFolha(true);
    try {
      const { baixarFolhaTestCardsPdf } = await import("../../services/pdf/pdfEngine.js");
      const f = await baixarFolhaTestCardsPdf({ project, palette, numbering, style: project.comp?.style, gerado: today });
      toast(`Folha de Test Cards exportada — ${f.largM.toFixed(2).replace(".", ",")} × ${f.altM.toFixed(2).replace(".", ",")} m · ${f.dpi} dpi`);
    } catch (e) {
      console.error(e);
      toast("Não deu pra gerar a Folha de Test Cards — tenta de novo", "info");
    }
    setGerandoFolha(false);
  };
  const showElec = ["Completo", "Resumido", "Elétrico"].includes(type);
  // A folha de Estrutura só existe se houver estrutura montada — imprimir
  // "0 peças" ocuparia folha sem informar nada (ver services/estrutura/folha.js).
  // A imagem vem do IndexedDB, não do projeto: ela é derivada e não sobe pro sync.
  const [estruturaImg, setEstruturaImg] = useState(null);
  useEffect(() => {
    let vivo = true;
    lerImagem(project?.id).then((v) => { if (vivo) setEstruturaImg(v); });
    return () => { vivo = false; };
  }, [project?.id, project?.estruturaImg?.em]);
  // A folha SAIU do Resumido e do Gabinetes (decisão do dono, 19/08): o Resumido
  // é a fotografia do projeto de LED, e o Gabinetes é do painel. Estrutura mora
  // no Completo e no caderno próprio dela.
  const estrutura = ["Completo", "Estrutura"].includes(type)
    ? dadosDaFolha(project, estruturaImg, { cores: prefs.estruturaCores })
    : null;
  const showPhys = ["Completo", "Resumido", "Gabinetes", "Design"].includes(type);
  const showVideo = ["Completo", "Resumido", "Design"].includes(type);
  // folha de referência de imagem: só no Design (o caderno que vai pra produção
  // e pro cliente ver COMO a tela fica, não só as medidas dela)
  const showCards = type === "Design";
  const showSignal = ["Completo", "Mapa de cabos"].includes(type);
  const showAC = ["Completo", "Mapa de cabos"].includes(type); // AC saiu do Elétrico → foco em tabelas
  const showGloss = type === "Completo"; // glossário só no caderno completo (leitor leigo/cliente)

  const th = { textAlign: "left", padding: "6px 10px", borderBottom: `2px solid ${PRINT.line}`, color: PRINT.mut, fontSize: 10, textTransform: "uppercase" };
  const td = { padding: "6px 10px", borderBottom: `1px solid ${PRINT.line}`, color: PRINT.ink };
  const chip = { display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${PRINT.line}`, borderRadius: 6, padding: "3px 8px", fontSize: 11, color: PRINT.ink };
  // chip de porta/cabo: miolo no PASTEL da região do mapa, borda na cor cheia
  // (cruza com o mapa SmartLCT; espelho do portCell do PDF)
  const sw = (i) => ({ width: 10, height: 10, borderRadius: 2, background: tint(colorOf(i)), border: `1px solid ${colorOf(i)}`, flexShrink: 0 });

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
  // specs de configuração de uma Screen (o que o operador precisa na controladora)
  const screenSpec = (s) => {
    const scr = screensById[s.id];
    const g = (scr?.telaIds || []).map((id) => telas.find((t) => t.id === id)).filter(Boolean)[0]?.gabinete;
    const resX = parseFloat(g?.resX) || 128, resY = parseFloat(g?.resY) || 128;
    return { resX, resY, hz: parseFloat(scr?.sinal?.hz) || 60, overclock: scr?.sinal?.overclock === true,
      // régua de área com porta atravessando vão: a escolha muda o número, então
      // vira premissa declarada no papel (mesma lei do overclock)
      vao: (scr?.sinal?.rule === "px" ? false : s.ports.some((p) => p.cruzaVao)) && (scr?.sinal?.vaoConta === true ? "conta" : "não conta") };
  };
  let secN = 0; const sec = () => ++secN; // numera as seções exibidas, na ordem

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
        {/* F1: tipo do relatório = Segmented (rolável); mobile mostra só os 3 de consulta */}
        <Segmented value={type} onChange={setType} size="sm"
          options={tiposDe(project, isMobile).map((t) => ({ value: t, label: t }))} />
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          {/* MOTOR NATIVO (F1): gera o PDF no app — funciona no celular, com nome
              certo e sem "gráficos de segundo plano". Imprimir fica de fallback. */}
          {/* a folha 1:1 é entrega do Design: ghost, sem disputar a primária */}
          {showCards && telas.length > 0 && (
            <button style={btn("ghost", gerandoFolha ? { opacity: 0.6, cursor: "wait" } : {})} disabled={gerandoFolha} onClick={baixarFolha}
              title="Folha de Test Cards — PDF de uma folha só, do tamanho do canvas (1,20 m no lado maior), com cada card em resolução nativa">
              <Download size={15} /> {gerandoFolha ? "Gerando…" : "Folha 1:1"}
            </button>
          )}
          <button style={btn("primary", gerandoPdf ? { opacity: 0.6, cursor: "wait" } : {})} disabled={gerandoPdf} onClick={baixarPdf}>
            <Download size={15} /> {gerandoPdf ? "Gerando…" : "Baixar PDF"}
          </button>
          <button style={btn("ghost")} onClick={() => printAs(fileName([project.name, "caderno", type]))} title="Imprimir pelo navegador (fallback)"><Printer size={15} />{!isMobile && " Imprimir"}</button>
          <HelpTip title="Dica pro Imprimir do navegador">
            O <b style={{ color: T.txt }}>Baixar PDF</b> já sai pronto. Se usar o Imprimir do navegador, ative <b style={{ color: T.txt }}>“Gráficos de segundo plano”</b> — sem isso a capa e as cores saem apagadas.
          </HelpTip>
        </span>
      </div>

      <div ref={docWrapRef} style={{ overflow: "hidden" }}>
      <div className="report-doc" style={{ background: "#fff", color: PRINT.ink, border: "1px solid #cbd5e1", borderRadius: 16, padding: 40, fontSize: 13, margin: "0 auto", width: isMobile ? DOC_W : "100%", maxWidth: isMobile ? "none" : 1120, zoom: isMobile ? docZoom : undefined }}>
        <ReportCoverPage docType={type} name={project.name} generated={today} rev={Math.max(0, Math.trunc(parseFloat(project.rev)) || 0)}
          fields={[
            { label: "Cliente", value: project.cliente },
            { label: "Local", value: project.local },
            { label: "Status", value: STATUS[project.status]?.l },
            { label: "Data de realização", value: formatRange(project.dataInicio, project.dataFim) },
          ]}
          stats={type === "Estrutura" ? [
            // A capa do caderno de ESTRUTURA fala de estrutura. Área e peso de
            // painel são o projeto de LED — quem recebe este caderno vai montar
            // truss, e os números que ele procura são estes.
            { label: "Peças", value: String(estrutura?.resumo.pecas ?? 0) },
            { label: "Peso", value: estrutura?.pesoTexto ?? "—" },
            ...(estrutura?.medidas ? [{ label: "Medida", value: estrutura.medidas.texto }] : []),
          ] : [
            { label: "Área", value: `${roll.area_m2.toFixed(1)} m²` },
            // capa do DESIGN troca PESO por RESOLUÇÃO: quem recebe esse caderno
            // monta conteúdo, não rigging — o número que ele procura é o do canvas
            ...(showCards
              ? [{ label: "Resolução", value: (() => { const c = canvasResumo(telas, project.comp?.pos); return `${c.w.toLocaleString("pt-BR")} × ${c.h.toLocaleString("pt-BR")} px`; })() }]
              : [{ label: "Peso", value: fmtPeso(roll.peso_kg) }]),
            ...(showElec ? [
              { label: "Pico", value: `${Math.round(parseFloat(agg.kVA))} kVA` },
              { label: "Gerador", value: `~${Math.round(parseFloat(agg.gerador))} kVA` },
            ] : []),
          ]} />

        {showPhys && (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Visão Geral" tag="Composição do painel" color={DISC.prod} Icon={LayoutGrid} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Dimensão</th><th style={th}>Grade</th><th style={th}>Resolução (px)</th><th style={th}>Modelo</th><th style={th}>Gabinetes</th><th style={th}>Peso</th><th style={th}>{showElec ? "Pico" : "Peso por gabinete"}</th></tr></thead>
              <tbody>
                {telas.map((t) => { const r = screenRollup(t); const v = videoOf(t); return (
                  <tr key={t.id}><td style={td}>{t.nome}</td><td style={td}>{r.dim.largura_m.toFixed(1)}×{r.dim.altura_m.toFixed(1)} m</td><td style={td}>{t.cols}×{t.rows}</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>{v.pxW && v.pxH ? `${v.pxW.toLocaleString("pt-BR")} × ${v.pxH.toLocaleString("pt-BR")}` : "—"}</td><td style={td}>{t.gabinete?.nome}</td><td style={td}>{r.gab}</td><td style={td}>{fmtPeso(r.peso_kg)}</td>{showElec ? <td style={{ ...td, color: PRINT.red }}>{(r.pwrMax_w / 1000).toFixed(1)} kW</td> : <td style={td}>{(parseFloat(t.gabinete?.peso) || 0).toFixed(1)} kg</td>}</tr>
                ); })}
                <tr style={{ fontWeight: 700 }}><td style={td}>Total</td><td style={td}>{roll.area_m2.toFixed(1)} m²</td><td style={td}></td><td style={td}></td><td style={td}></td><td style={td}>{roll.gab}</td><td style={td}>{fmtPeso(roll.peso_kg)}</td>{showElec ? <td style={{ ...td, color: PRINT.red }}>{(roll.pwrMax_w / 1000).toFixed(1)} kW</td> : <td style={td}></td>}</tr>
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
            <p style={{ color: PRINT.mut, fontSize: 12 }}>As telas na disposição da Composição (nome de cada uma no seu bloco); a caixa envolvente é o canvas de conteúdo do projeto.</p>
            <ReportTelasCanvas project={project} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Resolução (px)</th><th style={th}>Proporção</th><th style={th}>Fração</th><th style={th}>Pitch</th><th style={th}>Grade</th><th style={th}>Pixel por gabinete</th></tr></thead>
              <tbody>
                {telas.map((t) => { const v = videoOf(t); return (
                  <tr key={t.id}><td style={td}>{t.nome}</td><td style={{ ...td, fontWeight: 600 }}>{v.pxW} × {v.pxH}</td><td style={{ ...td, color: PRINT.acc, fontWeight: 600 }}>{v.ar}</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>{String(v.dec).replace(".", ",")}</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>{v.pitch ? `${v.pitch.toFixed(2).replace(".", ",")} mm` : "—"}</td><td style={td}>{t.cols}×{t.rows}</td><td style={td}>{t.gabinete?.resX && t.gabinete?.resY ? `${t.gabinete.resX}×${t.gabinete.resY}` : "—"}</td></tr>
                ); })}
              </tbody>
            </table>
            {/* Design troca as distâncias de visão pelo TAMANHO DO CANVAS: quem
                recebe essa folha monta o conteúdo, não dimensiona a plateia */}
            {showCards ? (() => { const cv = canvasResumo(telas, project.comp?.pos); return (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 28px", marginTop: 12, padding: "10px 14px", background: PRINT.head, borderRadius: 8, border: `1px solid ${PRINT.line}` }}>
                {[
                  ["Canvas de conteúdo", `${cv.w.toLocaleString("pt-BR")} × ${cv.h.toLocaleString("pt-BR")} px`],
                  ["Proporção", cv.ar],
                  ["Total", `${cv.mp.toFixed(1).replace(".", ",")} MP`],
                  ...(cv.largM ? [["Tamanho", `${cv.largM.toFixed(2).replace(".", ",")} × ${cv.altM.toFixed(2).replace(".", ",")} m`]] : []),
                  ["Área de LED", `${cv.areaM2.toFixed(1).replace(".", ",")} m²`],
                ].map(([r, v]) => (
                  <span key={r} style={{ display: "flex", flexDirection: "column" }}>
                    <span style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.07em", color: PRINT.dim }}>{r}</span>
                    <b style={{ fontFamily: "ui-monospace, monospace", fontSize: 15, color: PRINT.ink }}>{v}</b>
                  </span>
                ))}
              </div>
            ); })() : (() => { const grupos = distVisaoGroups(telas); return grupos.length ? (
              <div style={{ marginTop: 10 }}>
                <div style={{ ...th, borderBottom: "none", padding: "0 0 4px" }}>Distância de visão</div>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Telas</th><th style={th}>Pitch</th><th style={th}>Mínima</th><th style={th}>Ótima</th><th style={th}>Retina</th><th style={th}>Máxima</th></tr></thead>
                  <tbody>
                    {grupos.map((g, i) => (
                      <tr key={i}><td style={{ ...td, fontSize: 12 }}>{g.telas}</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>{g.pitch}</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>{g.min}</td><td style={{ ...td, fontFamily: "ui-monospace,monospace", color: PRINT.acc, fontWeight: 600 }}>{g.otima}</td><td style={{ ...td, fontFamily: "ui-monospace,monospace", fontWeight: 600 }}>{g.retina}</td><td style={{ ...td, fontFamily: "ui-monospace,monospace" }}>{g.max}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null; })()}
          </section>
        )}

        {showCards && (() => { const esquema = videoSchemaSvg(telas, { maxWidth: 1040, maxHeight: 340, fs: 9 }); return (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Conteúdo" tag="Manual de vídeo" color={DISC.video} Icon={Monitor} />
            <p style={{ color: PRINT.mut, fontSize: 12 }}>O painel como o conteúdo vai encontrar: cada tela em escala comum, com a resolução em cima e o tamanho em metros embaixo. As fichas fecham o combinado — o que existe no palco e o que precisa ser entregue.</p>
            {/* o MESMO desenho do PDF nativo (services/pdf/pdfCableMap.js) — nome de
                tela já sai escapado de lá; duplicar em JSX era o caminho pra divergir */}
            {esquema && <div style={{ margin: "8px 0 14px" }} dangerouslySetInnerHTML={{ __html: esquema.svg }} />}
            <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 14 }}>
              {[["Painel de LED", fichaPainel(project)], ["Manual de conteúdo", fichaConteudo(project)]].map(([titulo, linhas]) => (
                <div key={titulo} style={{ border: `1px solid ${PRINT.line}`, borderRadius: 8, padding: "10px 13px", breakInside: "avoid" }}>
                  <div style={{ ...th, borderBottom: "none", padding: "0 0 6px" }}>{titulo}</div>
                  {linhas.map(([r, v]) => (
                    <div key={r} style={{ display: "flex", gap: 10, alignItems: "baseline", padding: "3px 0" }}>
                      <span style={{ flex: "0 0 120px", fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", color: PRINT.dim }}>{r}</span>
                      <span style={{ flex: 1, fontFamily: "ui-monospace, monospace", fontSize: 12, color: PRINT.ink }}>{v}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </section>
        ); })()}

        {showCards && (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Test Card" tag="Referência de imagem" color={DISC.video} Icon={Monitor} />
            <p style={{ color: PRINT.mut, fontSize: 12 }}>O Test Card de cada tela como ele vai aparecer no painel — referência de imagem pra conferir grade, numeração de gabinete e cor antes da montagem. O arquivo em resolução real sai na aba Test Card.</p>
            <ReportTestCards project={project} />
          </section>
        )}

        {showElec && (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Informações Elétricas" tag="Energia · dimensionamento" color={DISC.elec} Icon={Zap} />
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Dimensionamento em <b style={{ color: PRINT.ink }}>{voltFull(agg.vc)}</b>. A potência de <b>pico</b> dimensiona a instalação (cabos, proteção e gerador); a <b>típica</b> (consumo médio em operação) estima a energia e a ocupação do gerador. A proteção do quadro é do projeto elétrico da casa/gerador.</p>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Tela</th><th style={th}>Gabinetes</th><th style={th}>Pico kW</th><th style={th}>Pico kVA</th><th style={th}>Pico A</th><th style={th}>Típico kVA</th><th style={th}>Típico A</th></tr></thead>
              <tbody>
                {agg.perTela.map(({ tela, gab, peak, typ }) => (
                  <tr key={tela.id}><td style={td}>{tela.nome}</td><td style={td}>{gab}</td><td style={{ ...td, color: PRINT.red }}>{(peak.W / 1000).toFixed(1)}</td><td style={td}>{peak.kVA}</td><td style={{ ...td, color: PRINT.amb }}>{peak.I}</td><td style={td}>{typ.kVA}</td><td style={td}>{typ.I}</td></tr>
                ))}
                <tr style={{ fontWeight: 700 }}><td style={td}>Total</td><td style={td}>{roll.gab}</td><td style={{ ...td, color: PRINT.red }}>{(agg.W / 1000).toFixed(1)}</td><td style={td}>{agg.kVA}</td><td style={{ ...td, color: PRINT.amb }}>{agg.I}</td><td style={td}>{agg.typKva}</td><td style={td}>{agg.typI}</td></tr>
              </tbody>
            </table>
            <p style={{ color: PRINT.mut, fontSize: 12, marginTop: 8 }}>Gerador mínimo (pico × 1,25): <b style={{ color: PRINT.acc }}>≥ {agg.gerador} kVA</b> — consumo típico ocupa <b>{agg.geradorPct}%</b> (janela saudável: 60–80%). Projetos grandes dividem a carga em setores, com mais de um gerador.</p>
            {balPico.temRodizio && acCabos.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: PRINT.ink, letterSpacing: 0.5, marginBottom: 4 }}>Balanço por fase</div>
                <table style={{ borderCollapse: "collapse", minWidth: 320 }}>
                  <thead><tr><th style={th}>Fase</th><th style={th}>Circuitos</th><th style={th}>Pico A</th><th style={th}>Típico A</th></tr></thead>
                  <tbody>
                    {balPico.fases.map((f, i) => (
                      <tr key={f.fase}><td style={{ ...td, fontFamily: "ui-monospace,monospace", fontWeight: 700 }}>{f.fase}</td><td style={td}>{f.cabos}</td><td style={{ ...td, color: PRINT.amb, fontWeight: 600 }}>{f.A.toFixed(1).replace(".", ",")}</td><td style={td}>{(balTip.fases[i]?.A ?? 0).toFixed(1).replace(".", ",")}</td></tr>
                    ))}
                  </tbody>
                </table>
                <p style={{ color: PRINT.mut, fontSize: 11, marginTop: 4 }}>Rodízio {usaScreens ? "reinicia a cada Screen (cada Screen é um quadro)" : "pela numeração do projeto"}; soma aritmética (leitura conservadora de quadro){agg.vc.g === "220" && agg.vc.ph === 3 ? " — o par F+F conta nas duas fases" : ""}.</p>
              </div>
            )}
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
                  {/* SEM O VÃO. O espaçamento que o técnico deixa no canvas é
                      referência visual de como as telas ficam separadas — não é
                      LED e não é processamento. É este número que alguém digita
                      no NovaLCT. */}
                  <span>Resolução da Screen <b style={{ color: PRINT.ink }}>{s.res.w.toLocaleString("pt-BR")} × {s.res.h.toLocaleString("pt-BR")} px</b></span>
                  {s.res.temVao && (
                    <span title="O espaçamento entre as telas no desenho é referência de montagem — não entra na resolução">
                      Disposição no desenho <b style={{ color: PRINT.ink }}>{s.size.w.toLocaleString("pt-BR")} × {s.size.h.toLocaleString("pt-BR")} px</b>
                    </span>
                  )}
                  <span>Frequência <b style={{ color: PRINT.ink }}>{sp.hz} Hz</b></span>
                  <span>Gabinete <b style={{ color: PRINT.ink }}>{sp.resX} × {sp.resY} px</b></span>
                  {/* contagem REAL: a bbox da Screen inclui o vão entre telas afastadas, então a grade só sai quando a Screen é um retângulo cheio */}
                  <span>Gabinetes <b style={{ color: PRINT.ink }}>{s.grid.gabs}</b></span>
                  {s.grid.exato && <span>Grade da Screen <b style={{ color: PRINT.ink }}>{s.grid.cols} × {s.grid.rows}</b></span>}
                  <span>Total de portas <b style={{ color: PRINT.ink }}>{s.ports.length}</b></span>
                  {/* premissas declaradas: documento datado registra o que foi escolha */}
                  {sp.vao && <span>Vão no retângulo <b style={{ color: PRINT.ink }}>{sp.vao}</b> na cota da porta</span>}
                  {sp.overclock && <span>Overclock <b style={{ color: PRINT.amb }}>ligado — porta pode passar da capacidade nominal</b></span>}
                </div>
                {screensById[s.id] && <div style={{ marginBottom: 10 }}><ScreenCableMap screen={screensById[s.id]} telas={telas} kind="sinal" numbering={numbering} /></div>}
                <DenseTable data={s.ports} maxCols={4} columns={[
                  { key: "n", label: "Porta", render: (p) => <><span style={{ ...sw(p.n - 1), display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />{p.n}</> },
                  { key: "count", label: "Gab.", align: "right", render: (p) => p.count },
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
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Portas de dados por tela — régua de <b>pixels reais</b> (controladoras VX/série A/Colorlight) ou de <b>área retangular</b> (controladora básica), conforme a configuração da tela. O selo numerado indica o início de cada porta.</p>
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
                      <div style={{ color: PRINT.mut, fontSize: 11, margin: "10px 0 4px" }}>Mapa de pixels — coordenada do 1º gabinete de cada porta (origem no canto superior-esquerdo) para transcrever no software da controladora (NovaLCT / Tessera).</div>
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
            <SectionHead n={sn} title="Cabeamento AC" tag="Circuitos de força" color={DISC.elec} Icon={Plug} />
            <WarnBox title={AVISO_AC.titulo} tone="amber">{AVISO_AC.partes.map((p, i) => (p.b ? <b key={i}>{p.t}</b> : <span key={i}>{p.t}</span>))}</WarnBox>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Cabos de energia <b>por Screen</b>, na mesma organização do sinal — carga por circuito × corrente do conector. Circuitos numerados 1..N por Screen{phaseOf(1, agg.vc) ? <>; a <b>fase</b> segue o rodízio (circuito 1→{phaseOf(1, agg.vc)}, 2→{phaseOf(2, agg.vc)}, 3→{phaseOf(3, agg.vc)}…), reiniciando a cada Screen</> : null}.</p>
            {screenReportAc.map((s, i) => {
              const bal = phaseBalance(s.ports, agg.vc);
              return (
              <div key={s.id} className="rp-block" style={telaBlock}>
                <SubHead n={`${S}.${i + 1}`} title={s.nome} right={`${s.ports.length} ${s.ports.length === 1 ? "circuito" : "circuitos"}`} />
                {bal.temRodizio && <div style={{ color: PRINT.mut, fontSize: 11, margin: "0 0 8px" }}>Carga por fase: <b style={{ color: PRINT.ink, fontFamily: "ui-monospace, monospace" }}>{fmtFases(bal)}</b> <span style={{ color: PRINT.dim }}>(soma aritmética — par conta nas duas fases)</span></div>}
                {screensById[s.id] && <div style={{ marginBottom: 10 }}><ScreenCableMap screen={screensById[s.id]} telas={telas} kind="ac" numbering={numbering} /></div>}
                <DenseTable data={s.ports} maxCols={4} columns={[
                  { key: "n", label: "Cabo", render: (p) => <><span style={{ ...sw(p.n - 1), display: "inline-block", marginRight: 5, verticalAlign: "middle" }} />{p.n}</> },
                  ...(bal.temRodizio ? [{ key: "fase", label: "Fase", render: (p) => <b style={{ fontFamily: "ui-monospace, monospace" }}>{phaseOf(p.n, agg.vc)}</b> }] : []),
                  { key: "count", label: "Gab.", align: "right", render: (p) => p.count },
                  { key: "load", label: "Carga", align: "right", render: (p) => `${p.load.toFixed(1)} A · ${p.pct}%`, tdStyle: (p) => ({ fontWeight: 600, color: p.over ? PRINT.red : p.warn ? PRINT.amb : PRINT.ink, whiteSpace: "nowrap" }) },
                ]} />
              </div>
            ); })}
          </section>
        ); })()}

        {showAC && !usaScreens && (() => { const sn = sec(); const S = String(sn).padStart(2, "0"); return (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sn} title="Cabeamento AC" tag="Circuitos de força" color={DISC.elec} Icon={Plug} />
            <WarnBox title={AVISO_AC.titulo} tone="amber">{AVISO_AC.partes.map((p, i) => (p.b ? <b key={i}>{p.t}</b> : <span key={i}>{p.t}</span>))}</WarnBox>
            <p style={{ color: PRINT.mut, fontSize: 12 }}>Cabos de energia por tela: quantidade, capacidade do conector e carga por circuito.</p>
            {telas.map((t, i) => {
              const { ampCab, connRating, acBudget } = cableMeta(t);
              const ports = cablePorts(t, "ac", numbering);
              const off = portOffset(telas, t.id, "ac", numbering); // circuitos 1..N do projeto
              return (
                <div key={t.id} className="rp-block" style={telaBlock}>
                  <SubHead n={`${S}.${i + 1}`} title={t.nome} right={`${portLabel(off, ports.length, "circuito")} · máx ${acBudget} gabinetes/circuito · ${ampCab.toFixed(2)} A/gabinete · conector ${connRating} A`} />
                  <CableMap tela={t} mode="ac" numbering={numbering} offset={off} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {ports.map((p, i) => { const load = p.length * ampCab; const pct = Math.round((load / connRating) * 100); const tone = acTone(pct); const fase = phaseOf(off + i + 1, agg.vc); return (
                      <span key={i} style={{ ...chip, borderColor: tone === "over" ? PRINT.red : tone === "warn" ? PRINT.amb : PRINT.line }}><span style={sw(off + i)} />Circuito {off + i + 1}{fase ? <> · fase <b style={{ fontFamily: "ui-monospace, monospace" }}>{fase}</b></> : null} · {load.toFixed(1)} A ({pct}%) · {p.length} gabinetes</span>
                    ); })}
                  </div>
                </div>
              );
            })}
          </section>
        ); })()}

        {estrutura && (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Estrutura" tag="Box truss · montagem" color={DISC.prod} Icon={Frame} />

            <div style={{ display: "flex", gap: 16, alignItems: "flex-start", marginBottom: 14, flexWrap: "wrap" }}>
              {estrutura.imagem && (
                <div style={{ flex: "1 1 420px", maxWidth: 620 }}>
                  <img
                    src={estrutura.imagem}
                    alt="Vista 3D da estrutura montada"
                    style={{ width: "100%", border: `1px solid ${PRINT.line}`, borderRadius: 10, display: "block" }}
                  />
                  {/* A LEGENDA do desenho. É a mesma paleta da cena: quem monta
                      identifica a peça pela cor antes de ler o nome. */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                    {estrutura.legenda.map((l) => (
                      <span key={l.catalogoId} style={{ ...chip, gap: 5, padding: "2px 7px", fontSize: 10.5 }}>
                        <span style={{ width: 9, height: 9, borderRadius: 2, background: l.cor, border: `1px solid ${PRINT.line}`, flexShrink: 0 }} />
                        <b>{l.qtd}×</b> {l.nome}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ flex: "1 1 240px", minWidth: 220 }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <tbody>
                    <tr><td style={td}>Peças</td><td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{estrutura.resumo.pecas}</td></tr>
                    <tr><td style={td}>Juntas</td><td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{estrutura.juntas}</td></tr>
                    <tr>
                      <td style={td}>{estrutura.paineis ? "Peso da treliça" : "Peso"}</td>
                      <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{estrutura.pesoTexto}</td>
                    </tr>
                    {/* O peso da treliça e o das TELAS saem separados, e o que
                        fecha embaixo é o SUSPENSO — tela apoiada no chão não
                        pendura em nada, e somá-la daria um número que ninguém
                        vai içar. O app segue sem dizer se aguenta. */}
                    {estrutura.paineis && (
                      <>
                        <tr>
                          <td style={td}>Telas ({estrutura.paineis.paineis})</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{estrutura.paineis.pesoTexto}</td>
                        </tr>
                        {estrutura.paineis.kgNoChao > 0 && (
                          <tr>
                            <td style={td}>Telas apoiadas no chão</td>
                            <td style={{ ...td, textAlign: "right" }}>{estrutura.paineis.noChaoTexto}</td>
                          </tr>
                        )}
                        <tr>
                          <td style={{ ...td, fontWeight: 700 }}>Total suspenso</td>
                          <td style={{ ...td, textAlign: "right", fontWeight: 700 }}>{estrutura.pesoSuspensoTexto}</td>
                        </tr>
                      </>
                    )}
                    {estrutura.medidas && (
                      <>
                        <tr><td style={td}>Largura</td><td style={{ ...td, textAlign: "right" }}>{estrutura.medidas.largura}</td></tr>
                        <tr><td style={td}>Altura</td><td style={{ ...td, textAlign: "right" }}>{estrutura.medidas.altura}</td></tr>
                        <tr><td style={td}>Profundidade</td><td style={{ ...td, textAlign: "right" }}>{estrutura.medidas.profundidade}</td></tr>
                      </>
                    )}
                  </tbody>
                </table>
                {estrutura.pesoNota && (
                  <div style={{ marginTop: 8, fontSize: 11, color: PRINT.amb, fontWeight: 600 }}>{estrutura.pesoNota}</div>
                )}
              </div>
            </div>

            <SubHead title="Lista de peças" right={plural(estrutura.resumo.pecas, "peça")} />
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead><tr><th style={th}>Peça</th><th style={th}>Linha</th><th style={th}>Qtd.</th><th style={th}>Peso unit.</th><th style={th}>Peso total</th></tr></thead>
              <tbody>
                {estrutura.lista.map((l) => (
                  <tr key={l.catalogoId}>
                    <td style={td}>{l.nome}</td>
                    <td style={td}>{l.linha ?? "—"}</td>
                    <td style={{ ...td, textAlign: "right" }}>{l.qtd}</td>
                    <td style={{ ...td, textAlign: "right" }}>{l.pesoUnitarioKg == null ? "—" : `${l.pesoUnitarioKg} kg`}</td>
                    <td style={{ ...td, textAlign: "right" }}>{l.pesoTotalKg == null ? "—" : `${l.pesoTotalKg} kg`}</td>
                  </tr>
                ))}
                <tr style={{ fontWeight: 700 }}>
                  <td style={td}>Total</td><td style={td}></td>
                  <td style={{ ...td, textAlign: "right" }}>{estrutura.resumo.pecas}</td>
                  <td style={td}></td>
                  <td style={{ ...td, textAlign: "right" }}>{estrutura.pesoTexto}</td>
                </tr>
              </tbody>
            </table>

            <SubHead title="Ferragem" right={plural(estrutura.juntas, "junta")} />
            <p style={{ color: PRINT.mut, fontSize: 11.5, margin: "0 0 6px" }}>
              Uma junta consome um jogo completo. A massa da ferragem {estrutura.parafusaria.massaInclusaNoPeso ? "já está inclusa no peso das peças" : "não está somada ao peso acima"} — esta lista é <b>contagem</b>, para conferir a caixa.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {estrutura.parafusaria.itens.map((i) => (
                <Chip key={i.id} title={`${i.qtd}×`} sub={i.spec} />
              ))}
            </div>

            {estrutura.paineis && (
              <>
                <SubHead title="Telas no desenho" right={plural(estrutura.paineis.paineis, "tela")} />
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead><tr><th style={th}>Tela</th><th style={th}>Medida</th><th style={th}>Onde começa</th><th style={th}>Gab.</th><th style={th}>Peso</th></tr></thead>
                  <tbody>
                    {estrutura.paineis.lista.map((p) => (
                      <tr key={p.id}>
                        <td style={td}>{p.nome}</td>
                        <td style={td}>{p.medida}</td>
                        <td style={td}>{p.em}</td>
                        <td style={{ ...td, textAlign: "right" }}>{p.gabinetes ?? "—"}</td>
                        <td style={{ ...td, textAlign: "right" }}>{p.pesoKg == null ? "—" : `${p.pesoKg} kg`}</td>
                      </tr>
                    ))}
                    <tr style={{ fontWeight: 700 }}>
                      <td style={td}>Total</td><td style={td}></td><td style={td}></td><td style={td}></td>
                      <td style={{ ...td, textAlign: "right" }}>{estrutura.paineis.pesoTexto}</td>
                    </tr>
                  </tbody>
                </table>
                {estrutura.paineis.problemas.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <WarnBox title="Tela fora de lugar" tone="amber">
                      {estrutura.paineis.problemas.join(" · ")}. É <b>medida</b>, não carga — confira o desenho antes de subir.
                    </WarnBox>
                  </div>
                )}
              </>
            )}

            {procedenciaDoPeso(estrutura).length > 0 && (
              <>
                <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: PRINT.dim, textTransform: "uppercase", margin: "14px 0 6px" }}>Procedência do peso</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {procedenciaDoPeso(estrutura).map((p) => (
                    <li key={p.fonte} style={{ color: PRINT.mut, fontSize: 11.5, lineHeight: 1.45 }}>
                      <b style={{ color: PRINT.ink }}>{p.fonte}</b> — {p.pecas.join(" · ")}
                    </li>
                  ))}
                </ul>
              </>
            )}

            {estrutura.conflitos.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <WarnBox title="Peças sobrepostas no modelo" tone="amber">
                  {plural(estrutura.conflitos.length, "par")} de peças ocupa o mesmo espaço no modelo 3D:{" "}
                  {estrutura.conflitos.slice(0, 4).map((c) => `${c.nomeA} × ${c.nomeB}`).join(" · ")}
                  {estrutura.conflitos.length > 4 ? ` · e mais ${estrutura.conflitos.length - 4}` : ""}.
                  {" "}No truss montado elas não entrariam — confira o desenho antes de separar o material.
                </WarnBox>
              </div>
            )}

            <div style={{ marginTop: 14 }}>
              <WarnBox title={AVISO_ESTRUTURA.titulo} tone="amber">
                {AVISO_ESTRUTURA.partes.map((p, i) => (typeof p === "string" ? p : <b key={i}>{p.texto}</b>))}
              </WarnBox>
            </div>
          </section>
        )}

        {showGloss && (
          <section style={{ marginBottom: 22 }}>
            <SectionHead n={sec()} title="Critérios de Cálculo" tag="Normas e referências" color={DISC.elec} Icon={BookOpen} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 30px" }}>
              <div>
                <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: PRINT.dim, textTransform: "uppercase", marginBottom: 8 }}>Como os números são calculados</div>
                {CRITERIOS.map((g) => (
                  <div key={g.h} style={{ marginBottom: 8 }}>
                    <div style={{ fontWeight: 700, color: PRINT.ink, fontSize: 12.5 }}>{g.h}</div>
                    <ul style={{ margin: "2px 0 0", paddingLeft: 18 }}>
                      {g.itens.map((t, i) => <li key={i} style={{ color: PRINT.mut, fontSize: 11.5, lineHeight: 1.45, marginBottom: 3 }}>{t}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
              <div>
                <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: PRINT.dim, textTransform: "uppercase", marginBottom: 8 }}>Normas e práticas adotadas</div>
                {NORMAS.map(([n, d]) => (
                  <div key={n} style={{ marginBottom: 6 }}>
                    <div style={{ fontWeight: 700, color: PRINT.ink, fontSize: 12.5 }}>{n}</div>
                    <div style={{ color: PRINT.mut, fontSize: 11.5, lineHeight: 1.45 }}>{d}</div>
                  </div>
                ))}
                <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: PRINT.dim, textTransform: "uppercase", margin: "14px 0 8px" }}>Referências</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {REFERENCIAS.map((t, i) => <li key={i} style={{ color: PRINT.mut, fontSize: 11.5, lineHeight: 1.45, marginBottom: 3 }}>{t}</li>)}
                </ul>
              </div>
            </div>
          </section>
        )}

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
