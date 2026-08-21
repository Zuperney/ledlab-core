// components/PaletaTelas.jsx — as telas do projeto, prontas pra entrar no desenho.
//
// Espeque: docs/estrutura3d-spec.md §12 (E5).
//
// MESMO GESTO DO CATÁLOGO, de propósito: escolhe aqui, clica no piso, nasce ali.
// Quem já sabe pôr uma barra sabe pôr uma parede — e foi justamente o gesto
// escondido atrás de um botão que fez o dono se perder na E4.
//
// FAZ DUAS COISAS COM UM CONTROLE SÓ:
//   1. é o SELETOR da tela que vai nascer no próximo clique no piso;
//   2. é a LISTA do que existe — medida, gabinetes e quantas já estão no desenho.
//
// A tela NÃO é cadastrada aqui. Ela vem da aba Dados, com gabinete escolhido —
// é de lá que saem a medida e o peso, e é por isso que tela sem gabinete aparece
// APAGADA em vez de sumir: sumir faria o técnico procurar um erro que não existe.

import { T } from "../ui/tokens.js";
import { medidasDaTela, telaMensuravel } from "../services/estrutura/paineis.js";

const rotulo = {
  fontSize: 10, letterSpacing: 0.6, color: T.dim, fontWeight: 700,
  textTransform: "uppercase", margin: "0 0 4px",
};

const metro = (mm) => `${(mm / 1000).toFixed(2).replace(".", ",")}`;

export default function PaletaTelas({
  telas = [],
  escolhida,
  onEscolher,
  quantidades = {}, // telaId → quantas já estão no desenho
}) {
  if (!telas.length) {
    return (
      <div style={{ fontSize: 12, color: T.dim, lineHeight: 1.5 }}>
        Este projeto ainda não tem tela. Cadastre uma na aba <b style={{ color: T.mut }}>Dados</b>,
        com gabinete escolhido — é de lá que saem a medida e o peso.
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={rotulo}>Telas do projeto</div>
      {telas.map((t, i) => {
        const m = medidasDaTela(t);
        const vale = telaMensuravel(t);
        const ativa = vale && t.id === escolhida;
        const qtd = quantidades[t.id] ?? 0;
        return (
          <button
            key={t.id}
            onClick={() => vale && onEscolher?.(t.id)}
            disabled={!vale}
            aria-pressed={ativa}
            title={vale
              ? `${m.cols} × ${m.rows} gabinetes · ${m.pesoKg} kg`
              : "esta tela ainda não tem gabinete escolhido — sem ele não há medida nem peso"}
            style={{
              display: "flex", alignItems: "center", gap: 7, width: "100%",
              textAlign: "left", fontFamily: "inherit", fontSize: 12,
              minHeight: 34, padding: "4px 8px", borderRadius: 7,
              cursor: vale ? "pointer" : "default",
              border: `1px solid ${ativa ? T.acc : T.bd}`,
              background: ativa ? T.sel : T.card2,
              color: ativa ? T.acM : T.mut,
              opacity: vale ? 1 : 0.45,
            }}
          >
            <span style={{ flex: 1, minWidth: 0 }}>
              <span style={{ display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {t.nome?.trim() || `Tela ${i + 1}`}
              </span>
              <span style={{ display: "block", fontSize: 11, color: T.dim }}>
                {vale ? `${metro(m.larguraMm)} × ${metro(m.alturaMm)} m · ${m.pesoKg} kg` : "sem gabinete"}
              </span>
            </span>
            {/* quantas já estão no desenho — a mesma linha responde "tenho" e
                "já pus", sem uma segunda lista pra cruzar */}
            {qtd > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: ativa ? T.acM : T.txt, flexShrink: 0 }}>
                {qtd}×
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
