// pages/TestCards.jsx — Test Cards avulso (escolhe projeto/tela ou grade manual).
import { useState, useMemo } from "react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { T } from "../ui/tokens.js";
import { card } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import ProjectTestCard from "./project/ProjectTestCard.jsx";
import Select from "../components/Select.jsx";
import NumField from "../components/NumField.jsx";

export default function TestCards() {
  const { projects, cabs } = useLedLabContext();
  const [mode, setMode] = useState("projeto");
  const [projId, setProjId] = useState(projects[0]?.id);
  const [cabId, setCabId] = useState(cabs[0]?.id);
  const [cols, setCols] = useState(8);
  const [rows, setRows] = useState(6);

  const manualProject = useMemo(() => {
    const c = cabs.find((x) => x.id === cabId) || cabs[0] || {};
    return { id: "manual", name: "Manual", telas: [{ id: "m1", nome: "Grade manual", cols, rows, gabinete: { nome: c.nome, resX: c.resX, resY: c.resY, dimW: c.dimW, dimH: c.dimH, pwrMax: c.pwrMax, fp: c.fp, conector: c.conector } }] };
  }, [cabs, cabId, cols, rows]);

  const project = mode === "projeto" ? projects.find((p) => p.id === projId) : manualProject;

  const inp = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px" };

  return (
    <div>
      <SectionHeader title="Test Cards" subtitle="Gere cartões de teste a partir de um projeto ou de uma grade manual." />
      <div style={card({ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", marginBottom: 16 })}>
        {[["projeto", "De um projeto"], ["manual", "Grade manual"]].map(([v, l]) => (
          <button key={v} onClick={() => setMode(v)} style={{ padding: "7px 12px", borderRadius: 8, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${mode === v ? T.acc : T.bd}`, background: mode === v ? T.acc : T.card2, color: mode === v ? "#fff" : T.mut }}>{l}</button>
        ))}
        {mode === "projeto" ? (
          <Select value={projId} onChange={(e) => setProjId(e.target.value)} style={inp}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select>
        ) : (
          <>
            <Select value={cabId} onChange={(e) => setCabId(Number(e.target.value))} style={inp}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select>
            <label style={{ color: T.mut, fontSize: 12 }}>Cols <NumField value={cols} onChange={(n) => setCols(Math.max(1, n))} style={{ ...inp, width: 70, marginLeft: 6 }} /></label>
            <label style={{ color: T.mut, fontSize: 12 }}>Linhas <NumField value={rows} onChange={(n) => setRows(Math.max(1, n))} style={{ ...inp, width: 70, marginLeft: 6 }} /></label>
          </>
        )}
      </div>
      {project ? <ProjectTestCard project={project} /> : <div style={{ color: T.dim }}>Selecione um projeto.</div>}
    </div>
  );
}
