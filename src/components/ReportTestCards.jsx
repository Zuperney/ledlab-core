// components/ReportTestCards.jsx — a folha de REFERÊNCIA DE IMAGEM do Caderno de
// Design: o Test Card de cada tela desenhado de verdade (services/testcardImage.js),
// com a ficha técnica ao lado. Mesma arte e mesma fonte de dados do PDF nativo —
// se divergir, o bug é no serviço, não em dois lugares.
//
// Um card por LINHA, empilhados: painel de LED é quase sempre mais largo que alto,
// e duas colunas espremiam cada card em meia folha à toa. A ficha fica à DIREITA,
// onde sobra espaço; card muito largo (fita de 76×1, 12.768 × 168 px do Boticário)
// toma a linha inteira e a ficha desce pra baixo dele — ao lado, ela deixaria a
// fita com espessura de fio de cabelo.
//
// O estilo vem do que o projeto já escolheu na Composição (project.comp.style):
// a folha mostra o card que o técnico vai gerar, não um card genérico.
import { useMemo } from "react";
import { PRINT } from "../ui/tokens.js";
import { useCablePalette } from "../hooks/useCablePalette.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import { FICHA_ABAIXO } from "../services/reportContent.js";
import { testCardImages } from "../services/testcardImage.js";

const mono = { fontFamily: "ui-monospace, monospace" };

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
    <div style={{ display: "grid", gap: 16 }}>
      {cards.map((c) => {
        const abaixo = c.pxW / c.pxH > FICHA_ABAIXO;
        const ficha = [
          ["Resolução", `${c.pxW.toLocaleString("pt-BR")} × ${c.pxH.toLocaleString("pt-BR")} px`],
          ["Grade", `${c.cols} × ${c.rows} gabinetes`],
          ["Gabinete", c.gabinete || "—"],
        ];
        return (
          <figure key={c.telaId} style={{ margin: 0, breakInside: "avoid", display: "flex", gap: 12,
            flexDirection: abaixo ? "column" : "row", alignItems: abaixo ? "stretch" : "flex-start" }}>
            <div style={{ flex: "1 1 auto", minWidth: 0 }}>
              <img src={c.url} alt={`Test Card ${c.nome}`}
                style={{ display: "block", maxWidth: "100%", maxHeight: abaixo ? 190 : 230, border: `1px solid ${PRINT.line}`, borderRadius: 4, background: "#000" }} />
            </div>
            {/* a ficha ENCOLHE se a folha estreitar (preview mobile): fixa em 190
                ela comia metade da linha e sobrava um selo de imagem */}
            <figcaption style={{ flex: abaixo ? "0 0 auto" : "0 1 190px", minWidth: abaixo ? 0 : 118, fontSize: 11.5, color: PRINT.mut, lineHeight: 1.5 }}>
              <div style={{ color: PRINT.ink, fontWeight: 700, fontSize: 13, marginBottom: abaixo ? 0 : 4 }}>{c.nome}</div>
              {abaixo ? (
                // linha corrida: embaixo de uma fita larga, coluna de rótulos vira escada
                <span>{ficha.map(([, v], i) => <span key={i} style={mono}>{i ? " · " : ""}{v}</span>)}</span>
              ) : (
                ficha.map(([r, v]) => (
                  <div key={r} style={{ display: "flex", gap: 6, justifyContent: "space-between", borderTop: `1px solid ${PRINT.line}`, padding: "3px 0" }}>
                    <span style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: PRINT.dim }}>{r}</span>
                    <span style={{ ...mono, color: PRINT.ink, textAlign: "right" }}>{v}</span>
                  </div>
                ))
              )}
            </figcaption>
          </figure>
        );
      })}
    </div>
  );
}
