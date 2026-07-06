// components/PickerFieldImpl.jsx — implementação real dos seletores (react-datepicker),
// carregada SOB DEMANDA via lazy() em PickerField.jsx (mantém o bundle inicial leve).
// Adapta os valores string do app ("YYYY-MM-DD" e "HH:mm"). Tema escuro em index.css (.ll-dp*).
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "../hooks/useIsMobile.js";

registerLocale("pt-BR", ptBR);

const pad = (n) => String(n).padStart(2, "0");
const dateFromStr = (s) => { if (!s) return null; const [y, m, d] = String(s).split("-").map(Number); return y ? new Date(y, (m || 1) - 1, d || 1, 12) : null; };
const strFromDate = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "");
const timeFromStr = (s) => { if (!s) return null; const [h, m] = String(s).split(":").map(Number); return new Date(2000, 0, 1, h || 0, m || 0); };
const strFromTime = (d) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "");

export default function PickerImpl({ kind, value, onChange, placeholder, id }) {
  const isMobile = useIsMobile();
  const common = {
    id, locale: "pt-BR", placeholderText: placeholder,
    className: "ll-dp-input", calendarClassName: "ll-dp-cal", popperClassName: "ll-dp-pop", wrapperClassName: "ll-dp-wrap",
    withPortal: isMobile,       // celular: tela cheia (sem clipe dentro de sheets/cards)
    showPopperArrow: false, popperPlacement: "bottom-start",
  };
  if (kind === "time") {
    return (
      <DatePicker {...common} selected={timeFromStr(value)} onChange={(d) => onChange(strFromTime(d))}
        showTimeSelect showTimeSelectOnly timeIntervals={5} timeCaption="Hora" dateFormat="HH:mm" timeFormat="HH:mm" />
    );
  }
  return (
    <DatePicker {...common} selected={dateFromStr(value)} onChange={(d) => onChange(strFromDate(d))} dateFormat="dd/MM/yyyy" />
  );
}
