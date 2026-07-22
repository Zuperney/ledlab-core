// components/BottomNav.jsx — navegação inferior (mobile). Uma aba por SEÇÃO (mesmas
// da sidebar do desktop): tocar abre uma folha com os itens da seção — ou navega
// direto se a seção só tem 1 item. Configurações fica na engrenagem do topo (header),
// fora das seções. Reaproveita NAV + SECTIONS + SECTION_META de nav.js.
import { useState } from "react";
import { NAV, SECTIONS, SECTION_META } from "../nav.js";
import { T } from "../ui/tokens.js";
import { Z, TOUCH_MIN } from "../config/uiConfig.js";
import BottomSheet from "./BottomSheet.jsx";

export default function BottomNav({ page, onNavigate }) {
  const [sheet, setSheet] = useState(null); // chave da seção aberta | null

  const sections = SECTIONS.map((sec) => ({
    sec,
    ...SECTION_META[sec],
    items: NAV.filter((n) => n.sec === sec),
  })).filter((s) => s.items.length); // ignora seção sem itens

  const go = (id) => { setSheet(null); onNavigate(id); };
  const tapSection = (s) => (s.items.length === 1 ? go(s.items[0].id) : setSheet(s.sec));
  const openSheet = sections.find((s) => s.sec === sheet);

  return (
    <>
      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: Z.bottomNav, display: "flex", background: T.sb, borderTop: `1px solid ${T.bd}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {sections.map((s) => {
          const Icon = s.Icon;
          const active = s.items.some((it) => it.id === page);
          return (
            <button key={s.sec} onClick={() => tapSection(s)}
              style={{ flex: 1, minHeight: TOUCH_MIN + 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: "none", border: "none", cursor: "pointer", color: active ? T.acM : T.mut, padding: "6px 2px" }}>
              <Icon size={19} />
              <span style={{ fontSize: 11, fontWeight: 600, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.tab}</span>
            </button>
          );
        })}
      </nav>

      {openSheet && (
        <BottomSheet title={openSheet.label} onClose={() => setSheet(null)}>
          {openSheet.items.map((it) => {
            const Icon = it.Icon;
            const active = page === it.id;
            return (
              <button key={it.id} onClick={() => go(it.id)}
                style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "14px 10px", background: active ? T.sel : "transparent", border: "none", borderRadius: 10, cursor: "pointer", color: active ? T.txt : T.mut, fontSize: 15, fontWeight: 600, textAlign: "left" }}>
                <Icon size={18} /> {it.label}
              </button>
            );
          })}
        </BottomSheet>
      )}
    </>
  );
}
