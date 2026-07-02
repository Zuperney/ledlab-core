// components/StatusBadge.jsx — badge de status de projeto.
import { Activity, Clock, CircleCheck, CircleX } from "lucide-react";
import { T } from "../ui/tokens.js";

export const STATUS = {
  active:    { l: "Em andamento", c: T.acM, bg: T.sel,        Icon: Activity },
  planned:   { l: "Planejamento", c: T.amb, bg: T.ambBg,      Icon: Clock },
  done:      { l: "Concluído",    c: T.grn, bg: T.grnBg,      Icon: CircleCheck },
  cancelled: { l: "Cancelado",    c: T.red, bg: T.overloadBg, Icon: CircleX },
};

export const STATUS_ORDER = ["planned", "active", "done", "cancelled"];

export default function StatusBadge({ s }) {
  const cfg = STATUS[s] || STATUS.planned;
  const { Icon } = cfg;
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6,
        background: cfg.bg, color: cfg.c,
        borderRadius: 999, padding: "3px 10px",
        fontSize: 12, fontWeight: 600, whiteSpace: "nowrap",
      }}
    >
      <Icon size={13} />
      {cfg.l}
    </span>
  );
}
