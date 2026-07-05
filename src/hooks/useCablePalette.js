// hooks/useCablePalette.js — paleta de cores dos CABOS (configurável em Configurações).
// Separada da PALETTE geral (que também colore projetos na Agenda e células do Test Card):
// aqui é só a sequência de cores de cabo/porta usada em Cabeamento, Diagramação, mapa de
// cabos do Test Card e no Relatório. Cai na PALETTE padrão quando não há customização.
import { useLedLabContext } from "../store/AppContext.jsx";
import { PALETTE } from "../ui/tokens.js";

export function useCablePalette() {
  const { prefs } = useLedLabContext();
  const palette = Array.isArray(prefs.cablePalette) && prefs.cablePalette.length ? prefs.cablePalette : PALETTE;
  const colorOf = (i) => palette[(((i | 0) % palette.length) + palette.length) % palette.length];
  return { palette, colorOf };
}
