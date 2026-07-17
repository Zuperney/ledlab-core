// pages/project/ProjectCabeamento.jsx — casca da aba Cabeamento.
//
// O SINAL é cabeado por Screen (a corrente atravessa telas) → ScreenSignal.
// O AC é cabeado por tela (circuito segue o físico) → AcCabling.
// Dois editores diferentes sob um toggle, porque agora sinal e AC vivem em níveis
// diferentes: sinal na Screen (sistema), AC na tela (bloco físico).
import { useState } from "react";
import { GitBranch, Zap } from "lucide-react";
import { T } from "../../ui/tokens.js";
import ScreenSignal from "./ScreenSignal.jsx";
import AcCabling from "./AcCabling.jsx";

export default function ProjectCabeamento({ project, patch, patchTela }) {
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
      {view === "sinal" ? <ScreenSignal project={project} patch={patch} /> : <AcCabling project={project} patchTela={patchTela} />}
    </div>
  );
}
