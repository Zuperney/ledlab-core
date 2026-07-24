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
import { GitBranch, Zap, SlidersHorizontal, Settings2 } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import BottomSheet from "../../components/BottomSheet.jsx";
import Drawer from "../../components/Drawer.jsx";
import Segmented from "../../components/Segmented.jsx";
import { NumeracaoPrefs, MapaCabosPrefs, CoresPrefs } from "../../components/CablingPrefs.jsx";
import ScreenCabling from "./ScreenCabling.jsx";

export default function ProjectCabeamento({ project, patch }) {
  const [view, setView] = useState("sinal");
  const [ajustes, setAjustes] = useState(false);
  const [adv, setAdv] = useState(false); // Avançado da Screen (modal leve, controlado aqui)
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
      {/* F1/F2 numa linha (pedido do usuário): Segmented + Avançado da Screen + Ajustes do mapa */}
      <div style={{ display: "flex", gap: 8, marginBottom: 12, alignItems: "center" }}>
        <Segmented value={view} onChange={setView}
          options={[{ value: "sinal", label: "Sinal", Icon: GitBranch }, { value: "ac", label: "Energia (AC)", Icon: Zap }]} />
        <button onClick={() => setAdv(true)} title="Avançado da Screen (régua, disposição, sentido, cor)" aria-label="Avançado da Screen"
          style={{ marginLeft: "auto", display: "flex", alignItems: "center", justifyContent: "center", width: 40, minHeight: 40, borderRadius: 8, cursor: "pointer", border: `1px solid ${adv ? T.acc : T.bd}`, background: adv ? T.sel : T.card2, color: adv ? T.acM : T.mut, flexShrink: 0, padding: 0 }}>
          <Settings2 size={15} />
        </button>
        <button onClick={() => setAjustes(true)} title="Ajustes do mapa (numeração, setas, cores)" aria-label="Ajustes do mapa"
          style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 12px", minHeight: 40, borderRadius: 8, cursor: "pointer", fontSize: 13.5, fontWeight: 600, border: `1px solid ${ajustes ? T.acc : T.bd}`, background: ajustes ? T.sel : T.card2, color: ajustes ? T.acM : T.mut, flexShrink: 0 }}>
          <SlidersHorizontal size={15} />{!isMobile && " Ajustes"}
        </button>
      </div>

      <ScreenCabling project={project} patch={patch} kind={view} advOpen={adv} onAdvClose={() => setAdv(false)} />

      {/* mobile = folha de baixo (padrão M3 pra ajustes contextuais); desktop = drawer */}
      {ajustes && (isMobile
        ? <BottomSheet title="Ajustes do mapa" onClose={() => setAjustes(false)}>{painel}</BottomSheet>
        : <Drawer open title="Ajustes do mapa" onClose={() => setAjustes(false)} width={420}>{painel}</Drawer>
      )}
    </div>
  );
}

const grpLabel = { color: T.txt, fontWeight: 700, fontSize: 13, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 };
