// pages/TestCards.jsx — Test Cards avulso (escolhe projeto/tela ou grade manual).
import { useState, useMemo } from "react";
import { SlidersHorizontal } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { T } from "../ui/tokens.js";
import { card, btn } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import ProjectTestCard from "./project/ProjectTestCard.jsx";
import { useIsMobile } from "../hooks/useIsMobile.js";
import BottomSheet from "../components/BottomSheet.jsx";

export default function TestCards() {
  const { projects, cabs } = useLedLabContext();
  const isMobile = useIsMobile();
  const [mode, setMode] = useState("projeto");
  const [projId, setProjId] = useState(projects[0]?.id);
  const [cabId, setCabId] = useState(cabs[0]?.id);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(6);
  const [selectorOpen, setSelectorOpen] = useState(false);

  const manualProject = useMemo(() => {
    const c = cabs.find((x) => x.id === cabId) || cabs[0] || {};
    return { id: "manual", name: "Manual", telas: [{ id: "m1", nome: "Grade manual", cols, rows, gabinete: { nome: c.nome, resX: c.resX, resY: c.resY, dimW: c.dimW, dimH: c.dimH, pwrMax: c.pwrMax, fp: c.fp, conector: c.conector } }] };
  }, [cabs, cabId, cols, rows]);

  const project = mode === "projeto" ? projects.find((p) => p.id === projId) : manualProject;

  const inp = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" };
  const summary = mode === "projeto"
    ? projects.find((p) => p.id === projId)?.name || "Selecione um projeto"
    : `${(cabs.find((c) => c.id === cabId)?.nome) || "Gabinete"} · ${cols}x${rows}`;

  return (
    <div>
      <SectionHeader title="Test Cards" subtitle="Gere cartões de teste a partir de um projeto ou de uma grade manual." />
      {isMobile ? (
        <div style={card({ marginBottom: 16 })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div>
              <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Modo</div>
              <div style={{ color: T.txt, fontWeight: 700, fontSize: 14 }}>{mode === "projeto" ? "De um projeto" : "Grade manual"}</div>
              <div style={{ color: T.dim, fontSize: 12, marginTop: 4 }}>{summary}</div>
            </div>
            <button style={btn("ghost")} onClick={() => setSelectorOpen(true)}><SlidersHorizontal size={15} /> Configurar</button>
          </div>
        </div>
      ) : (
        <div style={card({ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 })}>
          {[["projeto", "De um projeto"], ["manual", "Grade manual"]].map(([v, l]) => (
            <button key={v} onClick={() => setMode(v)} style={{ padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${mode === v ? T.acc : T.bd}`, background: mode === v ? T.acc : T.card2, color: mode === v ? "#fff" : T.mut }}>{l}</button>
          ))}
          {mode === "projeto" ? (
            <select value={projId} onChange={(e) => setProjId(e.target.value)} style={inp}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
          ) : (
            <>
              <select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={inp}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
              <label style={{ color: T.mut, fontSize: 12 }}>Cols <input type="number" value={cols} onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 70, marginLeft: 6 }} /></label>
              <label style={{ color: T.mut, fontSize: 12 }}>Linhas <input type="number" value={rows} onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: 70, marginLeft: 6 }} /></label>
            </>
          )}
        </div>
      )}

      {isMobile && selectorOpen && (
        <BottomSheet title="Selecionar fonte do Test Card" onClose={() => setSelectorOpen(false)}>
          <div style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 8 }}>
              {[["projeto", "De um projeto"], ["manual", "Grade manual"]].map(([v, l]) => (
                <button key={v} onClick={() => setMode(v)} style={{ flex: 1, padding: "8px 10px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${mode === v ? T.acc : T.bd}`, background: mode === v ? T.acc : T.card2, color: mode === v ? "#fff" : T.mut }}>{l}</button>
              ))}
            </div>
            {mode === "projeto" ? (
              <div>
                <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>Projeto</div>
                <select value={projId} onChange={(e) => setProjId(e.target.value)} style={{ ...inp, width: "100%" }}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
              </div>
            ) : (
              <>
                <div>
                  <div style={{ color: T.mut, fontSize: 11, textTransform: "uppercase", marginBottom: 6 }}>Gabinete</div>
                  <select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={{ ...inp, width: "100%" }}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</select>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <label style={{ color: T.mut, fontSize: 12 }}>Cols <input type="number" value={cols} onChange={(e) => setCols(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: "100%", marginTop: 6 }} /></label>
                  <label style={{ color: T.mut, fontSize: 12 }}>Linhas <input type="number" value={rows} onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))} style={{ ...inp, width: "100%", marginTop: 6 }} /></label>
                </div>
              </>
            )}
            <button style={btn("primary", { justifyContent: "center" })} onClick={() => setSelectorOpen(false)}>Aplicar</button>
          </div>
        </BottomSheet>
      )}
      {project ? <ProjectTestCard project={project} /> : <div style={{ color: T.dim }}>Selecione um projeto.</div>}
    </div>
  );
}
