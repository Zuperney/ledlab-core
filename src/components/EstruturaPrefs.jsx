// components/EstruturaPrefs.jsx — a cor de cada peça de estrutura.
//
// Espeque: docs/estrutura3d-spec.md §8.6, item D1.
//
// MORA NAS PREFERÊNCIAS GLOBAIS, e não no projeto, porque o catálogo é o GALPÃO:
// a barra de 2 m é a mesma barra em todo projeto, e a cor dela também tem que
// ser. Cor por projeto ensinaria "laranja é 2 m" num caderno e "laranja é 3 m"
// no seguinte — pior do que não ter cor nenhuma.
//
// Aparece em dois lugares, como as prefs de cabo: no drawer de Configurações
// (global) e no 🎛 da aba Estrutura (a decisão é tomada OLHANDO o desenho).

import { RotateCcw } from "lucide-react";
import { T } from "../ui/tokens.js";
import { btn } from "../ui/styles.js";
import { useLedLabContext } from "../store/AppContext.jsx";
import { CATALOGO } from "../services/estrutura/catalogo.js";
import { corDaPeca, temPersonalizacao } from "../services/estrutura/cores.js";

const subDesc = { color: T.dim, fontSize: 11.5, lineHeight: 1.45 };

export function CoresEstruturaPrefs() {
  const { prefs, setPrefs } = useLedLabContext();
  const custom = prefs.estruturaCores || null;
  const trocar = (id, cor) =>
    setPrefs({ ...prefs, estruturaCores: { ...(custom || {}), [id]: cor } });
  const restaurar = () => setPrefs({ ...prefs, estruturaCores: undefined });

  return (
    <div>
      <div style={subDesc}>
        Uma cor por peça do catálogo — a mesma em todo projeto, na cena e na
        legenda do Caderno. O padrão segue o comprimento: barra curta é fria,
        barra longa é quente.
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))", gap: 8, margin: "10px 0" }}>
        {CATALOGO.map((p) => (
          <label
            key={p.id}
            style={{ display: "flex", alignItems: "center", gap: 8, background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "6px 8px", cursor: "pointer" }}
          >
            <input
              type="color"
              value={corDaPeca(p.id, custom)}
              onChange={(e) => trocar(p.id, e.target.value)}
              title={`Cor da ${p.nome}`}
              style={{ width: 28, height: 28, border: `1px solid ${T.bd}`, borderRadius: 6, background: "none", cursor: "pointer", padding: 2, flexShrink: 0 }}
            />
            <span style={{ color: T.mut, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.nome}
            </span>
          </label>
        ))}
      </div>

      <button
        style={btn("subtle", { padding: "7px 10px", fontSize: 12, opacity: temPersonalizacao(custom) ? 1 : 0.5 })}
        disabled={!temPersonalizacao(custom)}
        onClick={restaurar}
        title="Voltar todas as peças à paleta padrão"
      >
        <RotateCcw size={13} /> Padrão
      </button>
    </div>
  );
}

/** a legenda do desenho — a MESMA em qualquer lugar que mostre a cena */
export function LegendaEstrutura({ itens = [], compacta = false }) {
  if (!itens.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: compacta ? 6 : 8, alignItems: "center" }}>
      {itens.map((l) => (
        <span
          key={l.catalogoId}
          style={{ display: "inline-flex", alignItems: "center", gap: 6, background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 999, padding: compacta ? "2px 8px" : "3px 10px", fontSize: compacta ? 11 : 12, color: T.mut, whiteSpace: "nowrap" }}
        >
          <span style={{ width: 10, height: 10, borderRadius: 3, background: l.cor, border: `1px solid ${T.bd}`, flexShrink: 0 }} />
          <b style={{ color: T.txt }}>{l.qtd}×</b> {l.nome}
        </span>
      ))}
    </div>
  );
}
