// pages/project/ProjectCabeamento.jsx — casca da aba Cabeamento.
//
// Sinal e AC agora são cabeados do MESMO jeito: por Screen (a corrente atravessa
// telas), pra contabilizar os cabos igual. Só o orçamento muda — sinal em px/porta,
// AC em gabinetes/cabo pela corrente do conector. Um componente só (ScreenCabling),
// parametrizado por `kind`.
import { useState } from "react";
import { GitBranch, Zap } from "lucide-react";
import { T } from "../../ui/tokens.js";
import ScreenCabling from "./ScreenCabling.jsx";

export default function ProjectCabeamento({ project, patch }) {
  const [view, setView] = useState("sinal");
  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12 }}>
        {[["sinal", "Sinal", GitBranch], ["ac", "Energia (AC)", Zap]].map(([v, l, Icon]) => {
          const on = view === v;
          return (
            <button key={v} onClick={() => setView(v)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 600, border: `1px solid ${on ? T.acc : T.bd}`, background: on ? T.acc : T.card2, color: on ? "#fff" : T.mut }}>
              <Icon size={15} /> {l}
            </button>
          );
        })}
      </div>
      <ScreenCabling project={project} patch={patch} kind={view} />
    </div>
  );
}
