// components/PresetPicker.jsx — seletor de predefinição de test card no padrão
// aprovado (botão + modal LEVE com a lista). Um componente só pro Test Card e
// pra Composição: sistema (respeitando as ocultas em prefs.tcHiddenPresets) +
// as salvas do usuário, com ✓ na atual. Seleciona → aplica → fecha.
import { useState } from "react";
import { T } from "../ui/tokens.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import { PRESET_LABELS } from "../services/testcardDraw.js";
import LightModal from "./LightModal.jsx";

export default function PresetPicker({ value, onSelect, style = {} }) {
  const { tcPresets, prefs } = useLedLabContext();
  const [open, setOpen] = useState(false);
  const label = PRESET_LABELS[value] || tcPresets.find((p) => p.id === value)?.name || "Predefinição…";
  const opts = [
    ...Object.entries(PRESET_LABELS).filter(([k]) => !(prefs.tcHiddenPresets || []).includes(k)),
    ...tcPresets.map((p) => [p.id, p.name]),
  ];
  return (
    <>
      <button onClick={() => setOpen(true)} title="Predefinição"
        style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 13.5, fontWeight: 600, display: "inline-flex", alignItems: "center", justifyContent: "space-between", gap: 8, cursor: "pointer", fontFamily: "inherit", textAlign: "left", minWidth: 0, ...style }}>
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
        <span style={{ color: T.dim, flexShrink: 0 }}>▾</span>
      </button>
      {open && (
        <LightModal title="Predefinição" onClose={() => setOpen(false)} width={340}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {opts.map(([k, l]) => {
              const on = value === k;
              return (
                <button key={k} onClick={() => { onSelect(k); setOpen(false); }}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, width: "100%", textAlign: "left", background: on ? T.sel : T.card2, border: `1px solid ${on ? T.acc : T.bd}`, borderRadius: 8, padding: "10px 12px", color: on ? T.txt : T.mut, fontSize: 13.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
                  {l}{on && <span style={{ color: T.acM, fontSize: 12 }}>✓</span>}
                </button>
              );
            })}
          </div>
        </LightModal>
      )}
    </>
  );
}
