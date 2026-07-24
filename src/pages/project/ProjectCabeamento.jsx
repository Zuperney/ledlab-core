// pages/project/ProjectCabeamento.jsx — casca da aba Cabeamento.
//
// Sinal e AC agora são cabeados do MESMO jeito: por Screen (a corrente atravessa
// telas), pra contabilizar os cabos igual. Só o orçamento muda — sinal em px/porta,
// AC em gabinetes/cabo pela corrente do conector. Um componente só (ScreenCabling),
// parametrizado por `kind`.
//
// AJUSTES CONTEXTUAIS: numeração, render do mapa e cores são decisões tomadas
// OLHANDO o mapa — o ícone de ajustes aqui abre as MESMAS prefs das Configurações
// (components/CablingPrefs.jsx), sem obrigar a viagem ao drawer global.
import { useState } from "react";
import { GitBranch, Zap, SlidersHorizontal } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import BottomSheet from "../../components/BottomSheet.jsx";
import Drawer from "../../components/Drawer.jsx";
import { NumeracaoPrefs, MapaCabosPrefs, CoresPrefs } from "../../components/CablingPrefs.jsx";
import ScreenCabling from "./ScreenCabling.jsx";

export default function ProjectCabeamento({ project, patch }) {
  const [view, setView] = useState("sinal");
  const [ajustes, setAjustes] = useState(false);
  const isMobile = useIsMobile();

  const painel = (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      <div>
        <div style={grpLabel}>Numeração dos cabos</div>
        <NumeracaoPrefs />
      </div>
      <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 14 }}>
        <div style={grpLabel}>Mapa de cabos</div>
        <MapaCabosPrefs />
      </div>
      <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 14 }}>
        <div style={grpLabel}>Cores dos cabos</div>
        <CoresPrefs />
      </div>
    </div>
  );

  return (
    <div>
      <div style={{ display: "flex", gap: 6, marginBottom: 12, alignItems: "center" }}>
        {[["sinal", "Sinal", GitBranch], ["ac", "Energia (AC)", Zap]].map(([v, l, Icon]) => {
          const on = view === v;
          return (
            <button key={v} onClick={() => setView(v)}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", minHeight: 40, borderRadius: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 600, border: `1px solid ${on ? T.acc : T.bd}`, background: on ? T.acc : T.card2, color: on ? "#fff" : T.mut }}>
              <Icon size={15} /> {l}
            </button>
          );
        })}
        <button onClick={() => setAjustes(true)} title="Ajustes do mapa (numeração, setas, cores)" aria-label="Ajustes do mapa"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", minHeight: 40, borderRadius: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 600, border: `1px solid ${ajustes ? T.acc : T.bd}`, background: ajustes ? T.sel : T.card2, color: ajustes ? T.acM : T.mut }}>
          <SlidersHorizontal size={15} />{!isMobile && " Ajustes"}
        </button>
      </div>

      <ScreenCabling project={project} patch={patch} kind={view} />

      {/* mobile = folha de baixo (padrão M3 pra ajustes contextuais); desktop = drawer */}
      {ajustes && (isMobile
        ? <BottomSheet title="Ajustes do mapa" onClose={() => setAjustes(false)}>{painel}</BottomSheet>
        : <Drawer open title="Ajustes do mapa" onClose={() => setAjustes(false)} width={420}>{painel}</Drawer>
      )}
    </div>
  );
}

const grpLabel = { color: T.txt, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 };
