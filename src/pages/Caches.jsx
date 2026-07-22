// pages/Caches.jsx — aba "Cachês" (seção Financeiro): registro de trabalho do técnico
// — calendário do mês, check-in/checkout ao vivo com GPS e lançamento manual. Saiu do
// toggle interno da Agenda pra virar aba própria, ao lado de Recibos e Reembolso
// (fluxo do dinheiro: Cachês → Recibos → Reembolso). O miolo é o DiariasView.
import SectionHeader from "../components/SectionHeader.jsx";
import DiariasView from "./agenda/DiariasView.jsx";

export default function Caches() {
  return (
    <div>
      <SectionHeader title="Cachês" subtitle="Seu registro de trabalho — toque num dia para lançar." />
      <DiariasView />
    </div>
  );
}
