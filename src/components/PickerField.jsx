// components/PickerField.jsx — seletores de DATA e HORA (react-datepicker) adaptados aos
// valores string do app ("YYYY-MM-DD" e "HH:mm"), evitando os pickers nativos do Android.
// No celular abre em portal (tela cheia); no desktop, popover. Tema escuro em index.css (.ll-dp*).
import DatePicker, { registerLocale } from "react-datepicker";
import { ptBR } from "date-fns/locale";
import { useIsMobile } from "../hooks/useIsMobile.js";

registerLocale("pt-BR", ptBR);

const pad = (n) => String(n).padStart(2, "0");
// "YYYY-MM-DD" -> Date (meio-dia local, à prova de fuso) | null
const dateFromStr = (s) => { if (!s) return null; const [y, m, d] = String(s).split("-").map(Number); return y ? new Date(y, (m || 1) - 1, d || 1, 12) : null; };
const strFromDate = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` : "");
// "HH:mm" -> Date (data fixa só p/ a hora) | null
const timeFromStr = (s) => { if (!s) return null; const [h, m] = String(s).split(":").map(Number); return new Date(2000, 0, 1, h || 0, m || 0); };
const strFromTime = (d) => (d ? `${pad(d.getHours())}:${pad(d.getMinutes())}` : "");

const common = (isMobile) => ({
  locale: "pt-BR",
  className: "ll-dp-input",
  calendarClassName: "ll-dp-cal",
  popperClassName: "ll-dp-pop",
  wrapperClassName: "ll-dp-wrap",
  withPortal: isMobile,       // celular: tela cheia (sem clipe dentro de sheets/cards)
  showPopperArrow: false,
  popperPlacement: "bottom-start",
});

export function DateField({ value, onChange, placeholder = "dd/mm/aaaa", id }) {
  const isMobile = useIsMobile();
  return (
    <DatePicker {...common(isMobile)} id={id}
      selected={dateFromStr(value)} onChange={(d) => onChange(strFromDate(d))}
      dateFormat="dd/MM/yyyy" placeholderText={placeholder} />
  );
}

export function TimeField({ value, onChange, placeholder = "--:--", id }) {
  const isMobile = useIsMobile();
  return (
    <DatePicker {...common(isMobile)} id={id}
      selected={timeFromStr(value)} onChange={(d) => onChange(strFromTime(d))}
      showTimeSelect showTimeSelectOnly timeIntervals={5} timeCaption="Hora"
      dateFormat="HH:mm" timeFormat="HH:mm" placeholderText={placeholder} />
  );
}
