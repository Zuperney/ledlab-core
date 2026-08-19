// components/PaletaEstrutura.jsx — o catálogo de peças, separado por categoria.
//
// Espeque: docs/estrutura3d-spec.md §8.7 (pedido do dono, 19/08).
//
// FAZ DUAS COISAS COM UM CONTROLE SÓ, e é de propósito:
//   1. é o SELETOR da peça de inserção (substitui o `Select` que morava na F2);
//   2. é a LEGENDA do desenho — a cor de cada peça e quantas estão montadas.
// Ter as duas separadas obrigava o técnico a cruzar "laranja" da legenda com
// "Barra P30 2 m" do seletor. Aqui é a mesma linha.
//
// A ordem é a da PRATELEIRA: barras, cubos, bases (services/estrutura/catalogo.js).

import { T } from "../ui/tokens.js";
import { catalogoPorCategoria } from "../services/estrutura/catalogo.js";
import { corDaPeca } from "../services/estrutura/cores.js";

const rotulo = {
  fontSize: 10, letterSpacing: 0.6, color: T.dim, fontWeight: 700,
  textTransform: "uppercase", margin: "0 0 4px",
};

export default function PaletaEstrutura({
  escolhida,
  onEscolher,
  cores = null, // personalização de cor (prefs); null = paleta padrão
  usarCores = true, // desligado, os quadradinhos somem — a cena está monocromática
  quantidades = {}, // catalogoId → quantas estão montadas
  desabilitada = false,
}) {
  const grupos = catalogoPorCategoria();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {grupos.map((g) => (
        <div key={g.id}>
          <div style={rotulo}>{g.nome}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            {g.pecas.map((p) => {
              const ativa = p.id === escolhida;
              const qtd = quantidades[p.id] ?? 0;
              return (
                <button
                  key={p.id}
                  onClick={() => onEscolher?.(p.id)}
                  disabled={desabilitada}
                  aria-pressed={ativa}
                  title={`${p.nome}${p.peso?.kg ? ` · ${p.peso.kg} kg` : ""}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 7, width: "100%",
                    textAlign: "left", fontFamily: "inherit", fontSize: 12,
                    // alvo de 30px: é desktop-only e a lista tem dez linhas —
                    // apertado demais vira erro de clique, folgado demais rola
                    minHeight: 30, padding: "4px 8px", borderRadius: 7, cursor: desabilitada ? "default" : "pointer",
                    border: `1px solid ${ativa ? T.acc : T.bd}`,
                    background: ativa ? T.sel : T.card2,
                    color: ativa ? T.acM : T.mut,
                    opacity: desabilitada ? 0.5 : 1,
                  }}
                >
                  {usarCores && (
                    <span
                      style={{
                        width: 10, height: 10, borderRadius: 3, flexShrink: 0,
                        background: corDaPeca(p.id, cores), border: `1px solid ${T.bd}`,
                      }}
                    />
                  )}
                  <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.nome}
                  </span>
                  {/* quantas já estão montadas — é o que transforma a paleta em
                      legenda do desenho, sem uma segunda lista pra cruzar */}
                  {qtd > 0 && (
                    <span style={{ fontSize: 11, fontWeight: 700, color: ativa ? T.acM : T.txt, flexShrink: 0 }}>
                      {qtd}×
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
