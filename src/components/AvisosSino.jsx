// components/AvisosSino.jsx — o sino do topbar + Drawer "Avisos".
// Aviso chega SEM ação do usuário, então nunca vira toast (manual §9.5) — a
// central é um Drawer: badge de não lidos no sino, lista com histórico, e
// abrir a central marca tudo como lido.
import { useState } from "react";
import { Bell, Users, Pencil, CalendarX2, UserMinus, Clock3, Megaphone } from "lucide-react";
import { useAuth } from "../store/AuthContext.jsx";
import { useEquipe } from "../store/EquipeContext.jsx";
import { FLAGS } from "../config/featureFlags.js";
import { T } from "../ui/tokens.js";
import Drawer from "./Drawer.jsx";
import Placeholder from "./Placeholder.jsx";

const ICONE_POR_TIPO = {
  escalado: Users, alterado: Pencil, cancelado: CalendarX2,
  removido: UserMinus, lembrete: Clock3, convocacao: Megaphone,
};

export default function AvisosSino({ size = 30 }) {
  const { user } = useAuth();
  const { avisos, naoLidos, marcarTudoLido, equipes } = useEquipe();
  const [open, setOpen] = useState(false);

  // sem login ou sem vínculo de equipe não há o que avisar — sino nem aparece
  if (!FLAGS.equipe || !user || !equipes.length) return null;

  const abrir = () => { setOpen(true); marcarTudoLido(); };

  return (
    <>
      <button onClick={abrir} aria-label={naoLidos ? `Avisos — ${naoLidos} não lido${naoLidos === 1 ? "" : "s"}` : "Avisos"} title="Avisos"
        style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, borderRadius: 8, background: open ? T.sel : "transparent", border: `1px solid ${open ? T.acc : T.bd}`, color: open ? T.acM : T.mut, cursor: "pointer", padding: 0 }}>
        <Bell size={16} />
        {naoLidos > 0 && (
          <span style={{ position: "absolute", top: -5, right: -5, minWidth: 16, height: 16, borderRadius: 999, background: T.red, color: "#fff", fontSize: 10, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 4px" }}>
            {naoLidos > 9 ? "9+" : naoLidos}
          </span>
        )}
      </button>

      <Drawer open={open} title="Avisos" onClose={() => setOpen(false)} width={420}>
        {avisos.length === 0 ? (
          <Placeholder icon={Bell} title="Nenhum aviso" description="Quando você for escalado num evento — ou algo mudar nele — o aviso chega aqui." />
        ) : (
          avisos.map((a) => {
            const Icon = ICONE_POR_TIPO[a.tipo] || Bell;
            return (
              <div key={a.id} style={{ display: "flex", gap: 12, padding: "12px 2px", borderBottom: `1px solid ${T.bd}`, opacity: a.lido_em ? 0.75 : 1 }}>
                <div style={{ width: 34, height: 34, borderRadius: 9, background: T.sel, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icon size={16} style={{ color: T.acM }} />
                </div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ color: T.txt, fontSize: 13.5, fontWeight: a.lido_em ? 500 : 700 }}>{a.titulo}</div>
                  {a.corpo && <div style={{ color: T.mut, fontSize: 12.5, marginTop: 1 }}>{a.corpo}</div>}
                  <div style={{ color: T.dim, fontSize: 11.5, marginTop: 3 }}>{fmtQuando(a.criado_em)}</div>
                </div>
              </div>
            );
          })
        )}
      </Drawer>
    </>
  );
}

function fmtQuando(iso) {
  const ms = Date.parse(iso);
  if (!ms) return "";
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `há ${h}h`;
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
