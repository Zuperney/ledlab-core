// components/ReportTestCards.jsx — a folha de REFERÊNCIA DE IMAGEM do Caderno de
// Design: o Test Card de cada tela desenhado de verdade (services/testcardImage.js),
// com a legenda técnica embaixo. Mesma arte e mesma fonte de dados do PDF nativo —
// se divergir, o bug é no serviço, não em dois lugares.
//
// O estilo vem do que o projeto já escolheu na Composição (project.comp.style):
// a folha mostra o card que o técnico vai gerar, não um card genérico.
import { useMemo } from "react";
import { PRINT } from "../ui/tokens.js";
import { useCablePalette } from "../hooks/useCablePalette.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import { testCardImages } from "../services/testcardImage.js";

export default function ReportTestCards({ project }) {
  const { palette } = useCablePalette();
  const { prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const style = project.comp?.style;
  // desenhar N canvas é caro: só refaz quando muda o que o card mostra
  const chave = (project.telas || []).map((t) => `${t.id}:${t.cols}x${t.rows}:${parseFloat(t.gabinete?.resX) || 128}x${parseFloat(t.gabinete?.resY) || 128}:${t.nome}`).join("|")
    + JSON.stringify(style || {}) + numbering + JSON.stringify(project.screens || []);
  const cards = useMemo(
    () => testCardImages(project, { style, palette, numbering }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [chave, palette],
  );

  if (!cards.length) return null;

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
      {cards.map((c) => (
        <figure key={c.telaId} style={{ margin: 0, breakInside: "avoid" }}>
          <img src={c.url} alt={`Test Card ${c.nome}`}
            style={{ display: "block", width: "100%", height: "auto", border: `1px solid ${PRINT.line}`, borderRadius: 4, background: "#000" }} />
          <figcaption style={{ fontSize: 11, color: PRINT.mut, marginTop: 4 }}>
            <b style={{ color: PRINT.ink }}>{c.nome}</b>{" · "}
            <span style={{ fontFamily: "ui-monospace, monospace" }}>{c.pxW.toLocaleString("pt-BR")} × {c.pxH.toLocaleString("pt-BR")} px</span>
            {" · grade "}
            <span style={{ fontFamily: "ui-monospace, monospace" }}>{c.cols}×{c.rows}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
