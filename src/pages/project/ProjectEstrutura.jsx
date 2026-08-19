// pages/project/ProjectEstrutura.jsx — a aba Estrutura (box truss em 3D).
//
// Espeque: docs/estrutura3d-spec.md §8 (as 5 faixas) e §9 (fase E1).
//
// FASE E1: a cena existe e se olha. Montar peça a peça é a E2 — por enquanto o
// botão primário monta um PÓRTICO DE EXEMPLO, que é o que faz a aba ter razão
// de existir hoje: colocar estrutura na tela e provar as medidas e o peso.
//
// DESKTOP-ONLY por decisão do dono: montar 3D com o dedo é ruim, e todas as
// ferramentas da categoria são desktop. O celular fica com a CONSULTA.

import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Frame, Grid3x3, Trash2 } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { btn, card } from "../../ui/styles.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import Placeholder from "../../components/Placeholder.jsx";
import HelpTip from "../../components/HelpTip.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import ZoomTrio from "../../components/ZoomTrio.jsx";
import { novaMontagem } from "../../services/estrutura/montagem.js";
import { resumo } from "../../services/estrutura/metricas.js";
import { porticoDeExemplo } from "../../services/estrutura/exemplos.js";

const chip = {
  background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 999,
  padding: "3px 10px", fontSize: 12, color: T.mut, whiteSpace: "nowrap",
};

const metro = (mm) => (mm == null ? "—" : `${(mm / 1000).toFixed(2).replace(".", ",")} m`);

export default function ProjectEstrutura({ project }) {
  const isMobile = useIsMobile();
  const [montagem, setMontagem] = useState(novaMontagem);
  const [selecionada, setSelecionada] = useState(null);
  const [grade, setGrade] = useState(true);
  const [Editor, setEditor] = useState(null);
  const [erroCarga, setErroCarga] = useState(false);
  const apiRef = useRef(null);

  // O editor é um chunk à parte e FORA do precache (§7.2): na primeira vez
  // precisa de rede. Se não vier, a aba tem que DIZER isso — nunca ficar girando.
  useEffect(() => {
    if (isMobile) return undefined;
    let vivo = true;
    import("../../vista3d/Editor3D.jsx")
      .then((m) => { if (vivo) setEditor(() => m.default); })
      .catch(() => { if (vivo) setErroCarga(true); });
    return () => { vivo = false; };
  }, [isMobile]);

  const r = useMemo(() => resumo(montagem), [montagem]);
  const vazia = r.pecas === 0;

  if (isMobile) {
    return (
      <Placeholder
        icon={Frame}
        title="A montagem é no computador"
        description="Montar estrutura em 3D com o dedo não funciona bem — todas as ferramentas do ramo são de desktop. Abra este projeto no computador para montar. Aqui no celular ficará a consulta: a estrutura pronta e a lista de peças."
      />
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* F2 · FERRAMENTAS — exibição à esquerda, UMA primária à direita */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <button
          style={btn("ghost", grade ? { borderColor: T.acc, color: T.acM } : {})}
          aria-pressed={grade}
          title="Mostrar a grade de 1 m"
          onClick={() => setGrade((v) => !v)}
        >
          <Grid3x3 size={15} />
        </button>
        {!vazia && (
          <button style={btn("ghost")} title="Limpar a estrutura" onClick={() => { setMontagem(novaMontagem()); setSelecionada(null); }}>
            <Trash2 size={15} />
          </button>
        )}
        <div style={{ flex: 1 }} />
        <button
          style={btn("primary")}
          onClick={() => { setMontagem(porticoDeExemplo()); setSelecionada(null); }}
        >
          <Box size={15} /> Montar exemplo
        </button>
      </div>

      {/* F3 · CONTEXTO — chips passivos + selo + didática no "?" */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={chip}>{r.pecas} peça{r.pecas === 1 ? "" : "s"}</span>
        <span style={chip}>{r.juntas} junta{r.juntas === 1 ? "" : "s"}</span>
        <span style={chip}>
          {r.peso.kg} kg
          {!r.peso.conferido && r.pecas > 0 && <span style={{ color: T.amb }}> · estimado</span>}
        </span>
        {r.caixa && (
          <span style={chip}>
            {metro(r.caixa.larguraMm)} × {metro(r.caixa.alturaMm)} × {metro(r.caixa.profundidadeMm)}
          </span>
        )}
        {r.pecas > 0 && !r.peso.conferido && (
          <StatusPill color={T.amb} label="Peso não conferido" />
        )}
        <HelpTip title="Estrutura">
          <p>Monta box truss <b>P30</b> em 3D e responde três coisas: <b>quais peças</b>, <b>quanto pesa</b> e <b>que medida ocupa</b>.</p>
          <p>O peso vem do catálogo e ainda <b>não foi conferido na balança</b> — trate como ordem de grandeza. A procedência de cada peça sai no Caderno.</p>
          <p><b>O app não diz se a estrutura aguenta.</b> Vão, carga e ponto de içamento são do rigger habilitado e do engenheiro com ART. Aqui é registro do que foi montado.</p>
          <p>Arraste para girar · roda do mouse para aproximar · clique numa peça para destacá-la.</p>
        </HelpTip>
      </div>

      {/* F4 · CONTEÚDO — a cena ganha o resto da tela */}
      <div style={card({ padding: 10, display: "flex", flexDirection: "column", gap: 8 })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 0.6, color: T.dim, fontWeight: 700 }}>ESTRUTURA</span>
          <ZoomTrio
            onOut={() => apiRef.current?.aproximar(1.3)}
            onFit={() => apiRef.current?.enquadrar()}
            onIn={() => apiRef.current?.aproximar(0.77)}
          />
        </div>

        <div style={{ height: "min(62vh, 620px)", minHeight: 320, position: "relative" }}>
          {erroCarga ? (
            <Placeholder
              icon={Frame}
              title="O 3D ainda não foi baixado"
              description="O editor vem num pacote à parte, que só desce na primeira vez que você abre esta aba. Conecte-se à internet uma vez e ele fica guardado no aparelho — depois disso funciona offline."
            />
          ) : !Editor ? (
            <div style={{ display: "grid", placeItems: "center", height: "100%", color: T.dim, fontSize: 13 }}>
              Carregando o 3D…
            </div>
          ) : (
            <Editor
              api={apiRef}
              montagem={montagem}
              selecionada={selecionada}
              onSelecionar={setSelecionada}
              mostrarGrade={grade}
            />
          )}
          {vazia && Editor && !erroCarga && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
              <span style={{ ...chip, background: T.card, padding: "8px 16px" }}>
                Sem estrutura ainda — use <b style={{ color: T.acM }}>Montar exemplo</b>
              </span>
            </div>
          )}
        </div>

        {!vazia && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, color: T.mut }}>
            {r.lista.map((l) => (
              <span key={l.catalogoId} style={chip}>
                <b style={{ color: T.txt }}>{l.qtd}×</b> {l.nome}
              </span>
            ))}
            <span style={chip}>
              <b style={{ color: T.txt }}>{r.parafusaria.itens.find((i) => i.id === "parafuso")?.qtd ?? 0}×</b> parafuso 5/8&quot;
            </span>
          </div>
        )}
      </div>

      {/* projeto ainda não guarda a estrutura — isso entra na E2 */}
      {project?.id && vazia === false && (
        <p style={{ margin: 0, fontSize: 12, color: T.dim }}>
          Esta montagem ainda não é salva no projeto — a gravação entra junto com a edição peça a peça.
        </p>
      )}
    </div>
  );
}
