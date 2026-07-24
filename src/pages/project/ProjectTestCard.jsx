// pages/project/ProjectTestCard.jsx — gerador de test card (canvas + export PNG).
import { useRef, useEffect, useState } from "react";
import { Download, Monitor, Save, Shapes, SlidersHorizontal, Trash2 } from "lucide-react";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useToast, usePrompt, useConfirm } from "../../store/UIContext.jsx";
import { telaPortSlices } from "../../services/screenCabling.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback.js";
import { useCablePalette } from "../../hooks/useCablePalette.js";
import { T } from "../../ui/tokens.js";
import { card } from "../../ui/styles.js";
import { draw, DEFAULTS, PRESETS } from "../../services/testcardDraw.js";
import Placeholder from "../../components/Placeholder.jsx";
import DropdownMenu from "../../components/DropdownMenu.jsx";
import Select from "../../components/Select.jsx";
import BottomSheet from "../../components/BottomSheet.jsx";
import ZoomTrio from "../../components/ZoomTrio.jsx";
import { fileName } from "../../services/filenames.js";

export default function ProjectTestCard({ project }) {
  const { tcPresets, setTcPresets, prefs } = useLedLabContext();
  const isMobile = useIsMobile();
  const { palette } = useCablePalette();
  // MOBILE: os controles moram na folha "Ajustes do test card" (padrão do Cabeamento) —
  // a tela fica pra o que importa: o card. Desktop mantém o painel lateral fixo.
  const [ajustesOpen, setAjustesOpen] = useState(false);
  const toast = useToast();
  const prompt = usePrompt();
  const confirm = useConfirm();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const telas = project.telas || [];
  const [telaId, setTelaId] = useState(telas[0]?.id);
  const [o, setO] = useState({ ...DEFAULTS });
  const [zoom, setZoom] = useState(1);
  const [presetSel, setPresetSel] = useState("");
  const canvasRef = useRef(null);
  const tela = telas.find((t) => t.id === telaId) || telas[0];

  // sinal: telaPortSlices resolve Screen-ou-legado — o selo mostra a PORTA DE VERDADE
  // (número real por Screen, mesmo que a corrente tenha entrado vinda de outra tela;
  // ou numeração local se a tela não está em nenhuma Screen). AC segue por tela.
  // sinal E ac vêm de telaPortSlices (Screen-ou-legado): o selo mostra a PORTA REAL
  // (número por Screen; ou local se a tela não está em Screen).
  const slices = tela && (o.cableMap === "sinal" || o.cableMap === "ac") ? telaPortSlices(project, tela.id, o.cableMap, numbering) : null;
  const mapPorts = slices ? slices.map((s) => s.cells) : null;
  const mapNums = slices ? slices.map((s) => s.n) : null;
  useEffect(() => { if (tela && canvasRef.current) draw(canvasRef.current, tela, o, mapPorts, palette, mapNums); });

  if (!tela) return <Placeholder icon={Monitor} title="Sem telas" description="Adicione uma tela na aba Dados para gerar o test card." />;

  const g = tela.gabinete || {};
  // mesmo fallback do draw (128 px/gabinete): tela sem gabinete não mostra "0×0"
  const W = (tela.cols || 1) * (parseFloat(g.resX) || 128), H = (tela.rows || 1) * (parseFloat(g.resY) || 128);
  const pitchMm = parseFloat(g.dimW) > 0 && parseFloat(g.resX) > 0 ? parseFloat(g.dimW) / parseFloat(g.resX) : null;
  const set = (patch) => setO((prev) => ({ ...prev, ...patch }));
  const toggle = (k) => setO((prev) => ({ ...prev, [k]: !prev[k] }));
  const locked = o.scheme === "cinza";
  const elCount = [o.numbers, o.junctions, o.circle, o.cross, o.corner, o.side].filter(Boolean).length;

  const applyPreset = (val) => {
    setPresetSel(val);
    if (!val) return;
    if (PRESETS[val]) set(PRESETS[val]);
    else { const p = tcPresets.find((x) => x.id === val); if (p) set(p.opts); }
  };
  const savePreset = async () => {
    const name = await prompt({ title: "Salvar predefinição", message: "Dê um nome para esta predefinição:", placeholder: "Ex: Show — mapa de cabos" });
    if (!name || !name.trim()) return;
    setTcPresets([...tcPresets, { id: `tc-${Date.now()}`, name: name.trim(), opts: { ...o } }]);
    toast("Predefinição salva");
  };
  // gerenciar preset NO CONTEXTO (antes só nas Configurações): selecionou um salvo → pode excluir aqui
  const savedSel = tcPresets.find((x) => x.id === presetSel);
  const deletePreset = async () => {
    if (!savedSel) return;
    if (!(await confirm({ title: "Excluir predefinição?", message: `"${savedSel.name}" será removida.` }))) return;
    setTcPresets(tcPresets.filter((x) => x.id !== savedSel.id));
    setPresetSel("");
    toast("Predefinição excluída");
  };

  const exportPng = () => {
    canvasRef.current.toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = fileName([project.name, tela.nome, "testcard"], "png");
      a.click();
    }, "image/png");
  };

  // controles (formato mobile) — moram na folha de Ajustes
  const controlesMobile = (
    <>
      <GroupRow top>
        <Cell label="Esquema de cor" flex="1 1 130px">
          <Select value={o.scheme} onChange={(e) => set({ scheme: e.target.value })} style={cellSel}>
            <option value="cores">Cores</option><option value="arcoiris">Arco-íris</option><option value="cinza">Escala de cinza</option><option value="solida">Sólida</option>
          </Select>
        </Cell>
        {o.scheme === "arcoiris" && (
          <Cell label="Direção" flex="1 1 110px">
            <Select value={o.rainbowDir} onChange={(e) => set({ rainbowDir: e.target.value })} style={cellSel}>
              <option value="h">Horizontal</option><option value="v">Vertical</option><option value="d">Diagonal</option>
            </Select>
          </Cell>
        )}
        {o.scheme === "solida" && (
          <>
            <Cell label="Cor sólida" flex="0 0 auto"><input type="color" value={o.solidColor} onChange={(e) => set({ solidColor: e.target.value })} style={{ width: 48, height: 34, background: "none", border: `1px solid ${T.bd}`, borderRadius: 8, cursor: "pointer", padding: 0 }} /></Cell>
            <Cell label="Transparente" flex="0 0 auto"><Switch on={o.solidAlpha} onClick={() => toggle("solidAlpha")} /></Cell>
          </>
        )}
      </GroupRow>
      {locked ? (
        <div style={{ margin: "10px 0", color: T.dim, fontSize: 12, background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 10 }}>
          Predefinição de calibração (preto→branco por coluna). Sem edições.
        </div>
      ) : (
        <>
          <GroupRow>
            <Cell label="Elementos" flex="1 1 130px">
              <DropdownMenu triggerLabel={`${elCount} ativo${elCount === 1 ? "" : "s"}`} Icon={Shapes} align="left"
                items={[["numbers", "Numerar gabinetes"], ["junctions", "Junções"], ["circle", "Círculo"], ["cross", "Cruz"], ["corner", "Círc. cantos"], ["side", "Semicírc. laterais"]].map(([k, l]) => ({ label: l, active: o[k], onClick: () => toggle(k) }))} />
            </Cell>
            <Cell label="Tamanho do nº" flex="1 1 150px"><NumScaleInline value={o.numScale} onChange={(n) => set({ numScale: n })} /></Cell>
          </GroupRow>
          <GroupRow>
            <Cell label="Color bar" flex="1 1 140px">
              <Select value={o.colorBar} onChange={(e) => set({ colorBar: e.target.value })} style={cellSel}>
                <option value="off">Off</option><option value="topo">Topo</option><option value="centro">Centro</option><option value="base">Base</option>
              </Select>
            </Cell>
            <Cell label="Mapa de cabos" flex="1 1 140px">
              <Select value={o.cableMap} onChange={(e) => set({ cableMap: e.target.value })} style={cellSel}>
                <option value="off">Off</option><option value="sinal">Sinal</option><option value="ac">AC</option>
              </Select>
            </Cell>
          </GroupRow>
          <GroupRow>
            <Cell label="Caixa de info" flex="0 0 auto"><Switch on={o.info} onClick={() => toggle("info")} /></Cell>
            {o.info && <Cell label="Info em linha" flex="0 0 auto"><Switch on={o.infoInline} onClick={() => toggle("infoInline")} /></Cell>}
            {o.info && (
              <Cell label="Posição" flex="1 1 130px">
                <Select value={o.infoPos} onChange={(e) => set({ infoPos: e.target.value })} style={cellSel}>
                  <option value="sup-esq">Sup. esq</option><option value="sup-dir">Sup. dir</option><option value="centro">Centro</option><option value="inf-esq">Inf. esq</option><option value="inf-dir">Inf. dir</option>
                </Select>
              </Cell>
            )}
          </GroupRow>
        </>
      )}
    </>
  );

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        <Select value={telaId} onChange={(e) => setTelaId(e.target.value)} style={{ ...sel, flex: isMobile ? "1 1 100px" : "2 1 130px", minWidth: 0 }}>
          {telas.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </Select>
        <Select value={presetSel} onChange={(e) => applyPreset(e.target.value)} style={{ ...sel, flex: isMobile ? "1 1 110px" : "2 1 150px", minWidth: 0 }}>
          <option value="">Predefinição…</option>
          <option value="map">Mapa de gabinetes</option>
          <option value="align">Alinhamento / geometria</option>
          <option value="solid">Cor sólida</option>
          <option value="bars">Barras de cor</option>
          <option value="cabsig">Mapa de cabos (sinal)</option>
          {tcPresets.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
        {isMobile ? (
          <button style={{ ...tbBtn, ...(ajustesOpen ? { background: T.sel, borderColor: T.acc, color: T.acM } : {}) }} title="Ajustes do test card" aria-label="Ajustes do test card" onClick={() => setAjustesOpen(true)}><SlidersHorizontal size={16} /></button>
        ) : (<>
          <button style={tbBtn} title="Salvar predefinição" onClick={savePreset}><Save size={16} /></button>
          {savedSel && <button style={tbBtn} title={`Excluir predefinição "${savedSel.name}"`} onClick={deletePreset}><Trash2 size={16} /></button>}
        </>)}
        <button style={{ ...tbBtn, background: T.acc, borderColor: T.acc, color: "#fff" }} title={`Exportar PNG (${W}×${H})`} onClick={exportPng}><Download size={16} />{!isMobile && " PNG"}</button>
      </div>


      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "250px 1fr", gap: 16, alignItems: "start" }} className="m-grid1">
        {/* DESKTOP: painel lateral fixo. No mobile os controles moram na folha de Ajustes. */}
        {!isMobile && (
        <div style={card({ padding: "4px 16px" })}>
          {(
            /* DESKTOP: lista linear (rótulo à esquerda, controle à direita) */
            <>
              <Row label="Esquema de cor" top>
                <Select value={o.scheme} onChange={(e) => set({ scheme: e.target.value })} style={rsel}>
                  <option value="cores">Cores</option><option value="arcoiris">Arco-íris</option><option value="cinza">Escala de cinza</option><option value="solida">Sólida</option>
                </Select>
              </Row>
              {o.scheme === "arcoiris" && (
                <Row label="Direção">
                  <Select value={o.rainbowDir} onChange={(e) => set({ rainbowDir: e.target.value })} style={rsel}>
                    <option value="h">Horizontal</option><option value="v">Vertical</option><option value="d">Diagonal</option>
                  </Select>
                </Row>
              )}
              {o.scheme === "solida" && (
                <>
                  <Row label="Cor sólida"><input type="color" value={o.solidColor} onChange={(e) => set({ solidColor: e.target.value })} style={{ width: 44, height: 30, background: "none", border: `1px solid ${T.bd}`, borderRadius: 8, cursor: "pointer", padding: 0 }} /></Row>
                  <Row label="Fundo transparente"><Switch on={o.solidAlpha} onClick={() => toggle("solidAlpha")} /></Row>
                </>
              )}
              {locked ? (
                <div style={{ margin: "10px 0", color: T.dim, fontSize: 12, background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 10 }}>
                  Predefinição de calibração (preto→branco por coluna). Sem edições.
                </div>
              ) : (
                <>
                  <Row label="Elementos">
                    <DropdownMenu triggerLabel={`${elCount} ativo${elCount === 1 ? "" : "s"}`} Icon={Shapes} align="right"
                      items={[["numbers", "Numerar gabinetes"], ["junctions", "Junções"], ["circle", "Círculo"], ["cross", "Cruz"], ["corner", "Círc. cantos"], ["side", "Semicírc. laterais"]].map(([k, l]) => ({ label: l, active: o[k], onClick: () => toggle(k) }))} />
                  </Row>
                  <NumScaleRow value={o.numScale} onChange={(n) => set({ numScale: n })} />
                  <Row label="Color bar">
                    <Select value={o.colorBar} onChange={(e) => set({ colorBar: e.target.value })} style={rsel}>
                      <option value="off">Off</option><option value="topo">Topo</option><option value="centro">Centro</option><option value="base">Base</option>
                    </Select>
                  </Row>
                  <Row label="Mapa de cabos">
                    <Select value={o.cableMap} onChange={(e) => set({ cableMap: e.target.value })} style={rsel}>
                      <option value="off">Off</option><option value="sinal">Sinal</option><option value="ac">AC</option>
                    </Select>
                  </Row>
                  <Row label="Caixa de info"><Switch on={o.info} onClick={() => toggle("info")} /></Row>
                  {o.info && (
                    <>
                      <Row label="Info em linha"><Switch on={o.infoInline} onClick={() => toggle("infoInline")} /></Row>
                      <Row label="Posição">
                        <Select value={o.infoPos} onChange={(e) => set({ infoPos: e.target.value })} style={rsel}>
                          <option value="sup-esq">Sup. esq</option><option value="sup-dir">Sup. dir</option><option value="centro">Centro</option><option value="inf-esq">Inf. esq</option><option value="inf-dir">Inf. dir</option>
                        </Select>
                      </Row>
                    </>
                  )}
                </>
              )}
            </>
          )}
        </div>
        )}

        <div style={card()}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", color: T.dim, fontSize: 12, marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
            <b style={{ color: T.acM }}>{tela.nome}</b>
            <span>{W}×{H} px · {tela.cols * tela.rows} gab{pitchMm ? ` · pitch ${pitchMm.toFixed(2)} mm` : ""}</span>
            <ZoomTrio onOut={() => setZoom((z) => Math.max(0.25, z * 0.8))} onFit={() => setZoom(1)} onIn={() => setZoom((z) => Math.min(4, z * 1.25))} />
          </div>
          <div style={{ overflow: "auto", background: "repeating-conic-gradient(#1a1a2e 0% 25%, #12122a 0% 50%) 50% / 24px 24px", borderRadius: 6, maxHeight: "70vh" }} className="tbl-scroll">
            <canvas ref={canvasRef} style={{ width: `${zoom * 100}%`, height: "auto", display: "block", imageRendering: "pixelated" }} />
          </div>
          <div style={{ color: T.dim, fontSize: 11, marginTop: 8 }}>O preview é escalado; o PNG sai na resolução nativa ({W}×{H} px). Fundo xadrez = área transparente (alpha).</div>
        </div>
      </div>

      {/* folha de ajustes (mobile) — todos os controles + salvar/excluir predefinição */}
      {isMobile && ajustesOpen && (
        <BottomSheet title="Ajustes do test card" onClose={() => setAjustesOpen(false)}>
          {controlesMobile}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", borderTop: `1px solid ${T.bd}`, paddingTop: 12, marginTop: 4 }}>
            {savedSel && <button style={tbBtn} onClick={deletePreset}><Trash2 size={15} /> Excluir predef.</button>}
            <button style={{ ...tbBtn, background: T.acc, borderColor: T.acc, color: "#fff" }} onClick={savePreset}><Save size={15} /> Salvar predefinição</button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}

const sel = { flex: 1, background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 13 };
const tbBtn = { display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, padding: "0 11px", borderRadius: 8, border: `1px solid ${T.bd}`, background: T.card2, color: T.txt, cursor: "pointer", fontSize: 13, fontWeight: 600, flexShrink: 0 };
const rsel = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "7px 9px", fontSize: 13, fontWeight: 600, cursor: "pointer", maxWidth: 190 };

// linha de ajuste: rótulo à esquerda, controle à direita (lista consistente, com divisória)
function Row({ label, children, top }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, minHeight: 46, padding: "6px 0", borderTop: top ? "none" : `1px solid ${T.bd}` }}>
      <span style={{ color: T.mut, fontSize: 13 }}>{label}</span>
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>{children}</div>
    </div>
  );
}

// interruptor (liga/desliga) — substitui os botões "ON/OFF"
function Switch({ on, onClick }) {
  return (
    <button onClick={onClick} role="switch" aria-checked={on}
      style={{ width: 42, height: 24, borderRadius: 999, border: "none", padding: 0, cursor: "pointer", background: on ? T.acc : T.dim2, position: "relative", transition: "background .15s", flexShrink: 0 }}>
      <span style={{ position: "absolute", top: 3, left: on ? 21 : 3, width: 18, height: 18, borderRadius: "50%", background: "#fff", transition: "left .15s" }} />
    </button>
  );
}

// tamanho do número: linha com slider inline (rótulo · slider · valor)
function NumScaleRow({ value, onChange }) {
  const [v, setV] = useState(value);
  // espelha o valor externo durante o render (padrão "derived state" do React)
  const [prev, setPrev] = useState(value);
  if (prev !== value) { setPrev(value); setV(value); }
  const commit = useDebouncedCallback(onChange, 150);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, minHeight: 46, padding: "6px 0", borderTop: `1px solid ${T.bd}` }}>
      <span style={{ color: T.mut, fontSize: 13, flexShrink: 0 }}>Tamanho do nº</span>
      <input type="range" min={0.5} max={2} step={0.1} value={v} onChange={(e) => { const n = parseFloat(e.target.value); setV(n); commit(n); }} style={{ flex: 1, accentColor: T.acc, minWidth: 60 }} />
      <span style={{ color: T.acM, fontWeight: 700, fontSize: 13, flexShrink: 0, width: 34, textAlign: "right" }}>{v.toFixed(1)}×</span>
    </div>
  );
}

// ---- Mobile: controles agrupados (várias células por linha) ----
const cellSel = { ...rsel, width: "100%", maxWidth: "none" };

// célula compacta: rótulo pequeno em cima, controle embaixo (altura fixa p/ alinhar vizinhos)
function Cell({ label, flex = "1 1 0", children }) {
  return (
    <div style={{ flex, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
      <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", letterSpacing: ".04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</span>
      <div style={{ minHeight: 34, display: "flex", alignItems: "center" }}>{children}</div>
    </div>
  );
}

// linha que agrupa várias células lado a lado
function GroupRow({ children, top }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", flexWrap: "wrap", gap: 12, padding: "12px 0", borderTop: top ? "none" : `1px solid ${T.bd}` }}>
      {children}
    </div>
  );
}

// slider + valor inline, sem rótulo (usado dentro de uma Cell)
function NumScaleInline({ value, onChange }) {
  const [v, setV] = useState(value);
  // espelha o valor externo durante o render (padrão "derived state" do React)
  const [prev, setPrev] = useState(value);
  if (prev !== value) { setPrev(value); setV(value); }
  const commit = useDebouncedCallback(onChange, 150);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%" }}>
      <input type="range" min={0.5} max={2} step={0.1} value={v} onChange={(e) => { const n = parseFloat(e.target.value); setV(n); commit(n); }} style={{ flex: 1, accentColor: T.acc, minWidth: 40 }} />
      <span style={{ color: T.acM, fontWeight: 700, fontSize: 13, flexShrink: 0, width: 34, textAlign: "right" }}>{v.toFixed(1)}×</span>
    </div>
  );
}
