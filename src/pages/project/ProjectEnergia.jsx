// pages/project/ProjectEnergia.jsx — aba Energia (AC): pico + típico por tela e total.
import { useState } from "react";
import { SlidersHorizontal, ChevronDown, ChevronUp } from "lucide-react";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useElectrical } from "../../hooks/useElectrical.js";
import { useDebouncedCallback } from "../../hooks/useDebouncedCallback.js";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { voltFull, phaseBalance, phaseOf } from "../../services/electricalCalc.js";
import { projectAcCabos, hasScreens } from "../../services/screenCabling.js";
import { T } from "../../ui/tokens.js";
import { card } from "../../ui/styles.js";
import Segmented from "../../components/Segmented.jsx";

export default function ProjectEnergia({ project, patch }) {
  const isMobile = useIsMobile();
  const { cfg, agg, VOLT } = useElectrical(project);
  const { prefs } = useLedLabContext();
  const setCfg = (partial) => patch({ config: { ...cfg, ...partial } });
  const [open, setOpen] = useState(null); // "brilho" | "conteudo" | null — qual slider está aberto
  const [telaOpen, setTelaOpen] = useState(null); // mobile: qual card de tela está expandido
  // BALANÇO POR FASE: rodízio dos cabos AC (por Screen; legado = numeração global)
  const acCabos = projectAcCabos(project, prefs.cableNumbering || "row-tb-lr");
  const balFases = phaseBalance(acCabos, agg.vc);
  const usaScreens = hasScreens(project);

  return (
    <div>
      <div style={card({ marginBottom: 16 })}>
        {/* LLC-04: a TENSÃO tem linha própria como barra segmentada (rolável) — o valor
            ativo é legível em 360dp, sem dropdown truncado em "38…" */}
        <div style={{ marginBottom: 8 }}>
          <Segmented value={cfg.vk} onChange={(vk) => setCfg({ vk })} size="sm"
            options={Object.entries(VOLT).map(([k, v]) => ({ value: k, label: v.s, title: `${v.g}V · ${v.label}` }))} />
          <div style={{ color: T.dim, fontSize: 11.5, marginTop: 4 }}>{agg.vc.label}{agg.vc.note ? ` · ${agg.vc.note}` : ""}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <ValueChip label={isMobile ? "BRI" : "Brilho"} title="Brilho de operação" pct={Math.round(cfg.brilho * 100)} active={open === "brilho"} onClick={() => setOpen((o) => (o === "brilho" ? null : "brilho"))} />
          <ValueChip label={isMobile ? "CONT" : "Conteúdo"} title="Conteúdo (fração da potência)" pct={Math.round(cfg.conteudo * 100)} active={open === "conteudo"} onClick={() => setOpen((o) => (o === "conteudo" ? null : "conteudo"))} />
        </div>
        {open === "brilho" && <SliderRow label="Brilho de operação" value={cfg.brilho} onChange={(v) => setCfg({ brilho: v })} />}
        {open === "conteudo" && <SliderRow label="Conteúdo (fração da potência)" value={cfg.conteudo} onChange={(v) => setCfg({ conteudo: v })} />}
      </div>

      {/* MOBILE: cards por tela RECOLHIDOS (pedido do usuário) — a linha fechada mostra o
          que manda no campo (kVA e corrente de pico); toque expande. Desktop segue tudo aberto. */}
      {agg.perTela.map(({ tela, peak, typ }) => {
        const aberto = !isMobile || telaOpen === tela.id;
        return (
          <div key={tela.id} style={card({ marginBottom: 10, padding: isMobile ? "4px 14px" : undefined })}>
            <div onClick={isMobile ? () => setTelaOpen((o) => (o === tela.id ? null : tela.id)) : undefined}
              role={isMobile ? "button" : undefined}
              style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, cursor: isMobile ? "pointer" : "default", minHeight: isMobile ? 44 : 0 }}>
              <div style={{ color: T.txt, fontWeight: 600, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tela.nome}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                {isMobile && !aberto && <span style={{ fontSize: 12.5, fontFamily: "ui-monospace,monospace", color: T.mut }}>{peak.kVA} kVA · <b style={{ color: T.amb }}>{peak.I} A</b></span>}
                {isMobile && (aberto ? <ChevronUp size={16} color={T.dim} /> : <ChevronDown size={16} color={T.dim} />)}
              </div>
            </div>
            {aberto && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: isMobile ? "flex-start" : "center", flexWrap: "wrap", gap: 10, flexDirection: isMobile ? "column" : "row", paddingBottom: isMobile ? 10 : 0 }}>
                <div style={{ color: T.dim, fontSize: 12, fontFamily: "ui-monospace,monospace" }}>{tela.gabinete?.nome} · {tela.cols}×{tela.rows} = {tela.cols * tela.rows} gab · {tela.gabinete?.pwrMax}W máx.</div>
                <div style={{ textAlign: isMobile ? "left" : "right", fontSize: 13, fontFamily: "ui-monospace,monospace" }}>
                  <div><span style={{ color: T.mut }}>PICO </span><b style={{ color: T.acM }}>{peak.W.toLocaleString()} W</b> · <b style={{ color: T.grn }}>{peak.kVA} kVA</b> · <b style={{ color: T.amb }}>{peak.I} A</b></div>
                  <div style={{ color: T.dim }}>TÍP. {Math.round(typ.W).toLocaleString()} W · {typ.kVA} kVA · {typ.I} A</div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <div style={card({ marginTop: 6 })}>
        <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12, marginBottom: 12 }}>Total do projeto · {voltFull(agg.vc)}</div>
        <Row tag="PICO" tagColor={T.red} isMobile={isMobile} cols={[["Carga", `${agg.W.toLocaleString()} W`, T.txt], ["kVA", agg.kVA, T.grn], ["A/fase", agg.I, T.amb], ["Gerador ≥", `${agg.gerador} kVA`, T.red]]} />
        <Row tag="TÍPICO" tagColor={T.acM} isMobile={isMobile} cols={[["Carga", `${Math.round(agg.typW).toLocaleString()} W`, T.txt], ["kVA", agg.typKva, T.grn], ["A/fase", agg.typI, T.amb], ["No gerador", `${agg.geradorPct}%`, T.acM]]} />
      </div>

      {/* BALANÇO POR FASE — o rodízio dos cabos AC (cabo 1→R, 2→S, 3→T…) somado
          por fase. Só aparece quando a tensão tem rodízio (tri / 380 bi) e há
          cabos. A soma é ARITMÉTICA: par (220 tri) conta nas duas fases. */}
      {balFases.temRodizio && acCabos.length > 0 && (
        <div style={card({ marginTop: 10 })}>
          <div style={{ color: T.acM, fontWeight: 700, textTransform: "uppercase", fontSize: 12, marginBottom: 10 }}>
            Balanço por fase · pico
          </div>
          <div style={{ display: "grid", gridTemplateColumns: `repeat(${balFases.fases.length}, 1fr)`, gap: 10 }}>
            {balFases.fases.map((f) => (
              <div key={f.fase} style={{ background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px" }}>
                <div style={{ fontFamily: "ui-monospace,monospace", fontWeight: 800, fontSize: 16, color: T.acM }}>{f.fase}</div>
                <div style={{ fontFamily: "ui-monospace,monospace", fontWeight: 700, color: T.amb, marginTop: 2 }}>{f.A.toFixed(1).replace(".", ",")} A</div>
                <div style={{ color: T.dim, fontSize: 11.5 }}>{f.cabos} {f.cabos === 1 ? "cabo" : "cabos"}</div>
              </div>
            ))}
          </div>
          <div style={{ color: T.dim, fontSize: 11.5, marginTop: 8, lineHeight: 1.5 }}>
            Rodízio {usaScreens ? "reinicia a cada Screen (cada Screen é um quadro)" : "pela numeração do projeto"}: cabo 1→{phaseOf(1, agg.vc)}, 2→{phaseOf(2, agg.vc)}, 3→{phaseOf(3, agg.vc)}…
            {agg.vc.g === "220" && agg.vc.ph === 3 ? " Em 220 V trifásico o circuito usa um PAR de fases (F+F) — a corrente conta nas duas." : ""} Soma aritmética (leitura conservadora de quadro).
          </div>
        </div>
      )}
      <div style={{ color: T.dim, fontSize: 12, marginTop: 10 }}><b style={{ color: T.red }}>Pico</b> (consumo máximo) dimensiona cabo, proteção e o gerador mínimo (×1,25 — projetos grandes dividem em setores/mais de um gerador); <b style={{ color: T.grn }}>Típico</b> (black level + brilho × conteúdo) estima o consumo real — saudável entre 60–80% do gerador. Bitolas e disjuntores: Base de Conhecimento.</div>
    </div>
  );
}

function Row({ tag, tagColor, cols, isMobile }) {
  const metric = ([l, v, c]) => (
    <div key={l}><div style={{ fontSize: 10, textTransform: "uppercase", color: T.dim }}>{l}</div><div style={{ fontWeight: 700, color: c }}>{v}</div></div>
  );
  if (isMobile) {
    return (
      <div style={{ padding: "8px 0", borderTop: `1px solid ${T.bd}` }}>
        <div style={{ color: tagColor, fontWeight: 700, fontSize: 12, marginBottom: 6 }}>{tag}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>{cols.map(metric)}</div>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gridTemplateColumns: "80px repeat(4,1fr)", gap: 8, alignItems: "center", padding: "6px 0" }}>
      <span style={{ color: tagColor, fontWeight: 700, fontSize: 12 }}>{tag}</span>
      {cols.map(metric)}
    </div>
  );
}

// chip compacto que mostra o valor e abre o slider ao tocar
function ValueChip({ label, title, pct, active, onClick }) {
  return (
    <button onClick={onClick} title={title || label}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 8, border: `1px solid ${active ? T.acc : T.bd}`, background: active ? T.sel : T.card2, color: T.txt, cursor: "pointer", fontSize: 13, fontFamily: "inherit" }}>
      <span style={{ color: T.mut }}>{label}</span>
      <b style={{ color: T.acM }}>{pct}%</b>
      <SlidersHorizontal size={13} style={{ color: T.dim }} />
    </button>
  );
}

function SliderRow({ label, value, onChange }) {
  const [v, setV] = useState(value);
  // espelha o valor externo durante o render (padrão "derived state" do React)
  const [prev, setPrev] = useState(value);
  if (prev !== value) { setPrev(value); setV(value); }
  const commit = useDebouncedCallback(onChange, 180); // persiste/recalcula só ao parar de arrastar
  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: T.mut, marginBottom: 4 }}>
        <span>{label}</span><span style={{ color: T.acM, fontWeight: 700 }}>{Math.round(v * 100)}%</span>
      </div>
      <input type="range" min={0} max={1} step={0.01} value={v} onChange={(e) => { const n = parseFloat(e.target.value); setV(n); commit(n); }} style={{ width: "100%", accentColor: T.acc }} />
    </div>
  );
}
