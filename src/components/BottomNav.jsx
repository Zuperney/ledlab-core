// components/BottomNav.jsx — navegação inferior (mobile). Uma aba por SEÇÃO (mesmas
// da sidebar do desktop): tocar abre um POPOVER contextual (SectionMenu) logo acima da
// aba, com os itens da seção — ou navega direto se a seção só tem 1 item. Configurações
// fica na engrenagem do topo (header), fora das seções.
import { useState } from "react";
import { NAV, SECTIONS, SECTION_META } from "../nav.js";
import { T } from "../ui/tokens.js";
import { Z, TOUCH_MIN } from "../config/uiConfig.js";
import SectionMenu from "./SectionMenu.jsx";

export default function BottomNav({ page, onNavigate }) {
  const [menu, setMenu] = useState(null); // { sec, title, items, anchor } | null

  const sections = SECTIONS.map((sec) => ({
    sec,
    ...SECTION_META[sec],
    items: NAV.filter((n) => n.sec === sec && !n.desktopOnly), // desktop-only fora do mobile
  })).filter((s) => s.items.length); // ignora seção sem itens

  const go = (id) => { setMenu(null); onNavigate(id); };
  const tapSection = (s, el) => {
    if (s.items.length === 1) return go(s.items[0].id); // seção de 1 item vai direto
    const r = el.getBoundingClientRect();
    setMenu({ sec: s.sec, title: s.label, items: s.items, anchor: { left: r.left, width: r.width, top: r.top, vw: window.innerWidth, vh: window.innerHeight } });
  };

  return (
    <>
      <nav style={{ position: "fixed", left: 0, right: 0, bottom: 0, zIndex: Z.bottomNav, display: "flex", background: T.sb, borderTop: `1px solid ${T.bd}`, paddingBottom: "env(safe-area-inset-bottom)" }}>
        {sections.map((s) => {
          const Icon = s.Icon;
          const active = menu?.sec === s.sec || s.items.some((it) => it.id === page);
          return (
            <button key={s.sec} onClick={(e) => tapSection(s, e.currentTarget)}
              style={{ flex: 1, minHeight: TOUCH_MIN + 6, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, background: "none", border: "none", cursor: "pointer", color: active ? T.acM : T.mut, padding: "6px 2px" }}>
              <Icon size={19} />
              <span style={{ fontSize: 11, fontWeight: 600, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.tab}</span>
            </button>
          );
        })}
      </nav>

      {menu && (
        <SectionMenu title={menu.title} items={menu.items} anchor={menu.anchor} page={page} onSelect={go} onClose={() => setMenu(null)} />
      )}
    </>
  );
}
