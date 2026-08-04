// pages/TestCards.jsx — Test Cards avulso (escolhe projeto/tela ou grade manual).
import { useState, useMemo } from "react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { T } from "../ui/tokens.js";
import { card, input, label as lbl } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import ProjectTestCard from "./project/ProjectTestCard.jsx";
import Select from "../components/Select.jsx";
import NumField from "../components/NumField.jsx";
import Segmented from "../components/Segmented.jsx";

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

  return (
    <div>
      <SectionHeader title="Test Cards" subtitle="Gere test cards a partir de um projeto ou de uma grade manual." />
      {/* LLC-07: mesma linguagem de formulário das telas principais — rótulo CAPS
          em cima do campo, Select/NumField com input(), nada de rótulo inline */}
      <div style={card({ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 16 })}>
        {/* F1: escolha exclusiva = Segmented (gramática R2) */}
        <Segmented value={mode} onChange={setMode}
          options={[{ value: "projeto", label: "De um projeto" }, { value: "manual", label: "Grade manual" }]} />
        {mode === "projeto" ? (
          <div><div style={lbl}>Projeto</div><Select value={projId} title="Projeto" onChange={(e) => setProjId(e.target.value)} style={input()}>{projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</Select></div>
        ) : (
          <>
            <div><div style={lbl}>Gabinete</div><Select value={cabId} title="Gabinete" onChange={(e) => setCabId(Number(e.target.value))} style={input()}>{cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}</Select></div>
            <div><div style={lbl}>Colunas</div><NumField value={cols} onChange={(n) => setCols(Math.max(1, n))} style={input({ width: 78 })} /></div>
            <div><div style={lbl}>Linhas</div><NumField value={rows} onChange={(n) => setRows(Math.max(1, n))} style={input({ width: 78 })} /></div>
          </>
        )}
      </div>
      {project ? <ProjectTestCard project={project} /> : <div style={{ color: T.dim }}>Selecione um projeto.</div>}
    </div>
  );
}
