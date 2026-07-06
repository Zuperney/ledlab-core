// components/PickerField.jsx — seletores de DATA e HORA. A implementação (react-datepicker,
// pesada) é carregada SOB DEMANDA (lazy) — só quando um form com esses campos abre —,
// mantendo o carregamento inicial leve. Enquanto o chunk carrega, mostra um input simples.
import { lazy, Suspense } from "react";
import { input } from "../ui/styles.js";

const PickerImpl = lazy(() => import("./PickerFieldImpl.jsx"));

// "YYYY-MM-DD" -> "dd/mm/aaaa" só p/ exibir no fallback (sem depender do react-datepicker)
const dispDate = (s) => { if (!s) return ""; const [y, m, d] = String(s).split("-"); return d ? `${d}/${m}/${y}` : String(s); };

// input estático (mesmo visual) enquanto o picker carrega
function Fallback({ display, placeholder }) {
  return <input value={display} placeholder={placeholder} readOnly style={input()} />;
}

export function DateField({ value, onChange, placeholder = "dd/mm/aaaa", id }) {
  return (
    <Suspense fallback={<Fallback display={dispDate(value)} placeholder={placeholder} />}>
      <PickerImpl kind="date" value={value} onChange={onChange} placeholder={placeholder} id={id} />
    </Suspense>
  );
}

export function TimeField({ value, onChange, placeholder = "--:--", id }) {
  return (
    <Suspense fallback={<Fallback display={value || ""} placeholder={placeholder} />}>
      <PickerImpl kind="time" value={value} onChange={onChange} placeholder={placeholder} id={id} />
    </Suspense>
  );
}
