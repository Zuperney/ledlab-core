// pages/project/ProjectEstrutura.jsx — a aba Estrutura (box truss em 3D).
//
// Espeque: docs/estrutura3d-spec.md §8 (as 5 faixas) e §9 (fases E1/E2).
//
// O FLUXO DE MONTAGEM (E2), em três gestos:
//   1. escolhe a peça no seletor (F2);
//   2. passa o ponteiro num CONECTOR livre → vê a peça em fantasma, onde ela
//      vai ficar; gira em passos de 90° se quiser;
//   3. clica → comita.
// Peça solta entra pela primária ("Adicionar peça"), que é o que permite começar
// uma segunda torre sem estar preso à primeira.
//
// DESKTOP-ONLY por decisão do dono: montar 3D com o dedo é ruim, e todas as
// ferramentas da categoria são desktop. O celular fica com a CONSULTA.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Frame, Grid3x3, Hand, Plus, Redo2, RotateCw, Trash2, Undo2 } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { btn, card } from "../../ui/styles.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import Placeholder from "../../components/Placeholder.jsx";
import HelpTip from "../../components/HelpTip.jsx";
import Segmented from "../../components/Segmented.jsx";
import Select from "../../components/Select.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import ZoomTrio from "../../components/ZoomTrio.jsx";
import { CATALOGO, conectorPorId, pecaPorId } from "../../services/estrutura/catalogo.js";
import { resolverEncaixe } from "../../services/estrutura/encaixe.js";
import { conectoresLivres } from "../../services/estrutura/montagem.js";
import {
  ACOES, criarHistorico, desfazerUm, executar, podeDesfazer, podeRefazer, refazerUm,
} from "../../services/estrutura/historico.js";
import { deJSON, paraJSON } from "../../services/estrutura/serializar.js";
import { resumo } from "../../services/estrutura/metricas.js";
import { porticoDeExemplo } from "../../services/estrutura/exemplos.js";
import { genId } from "../../services/ids.js";

const chip = {
  background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 999,
  padding: "3px 10px", fontSize: 12, color: T.mut, whiteSpace: "nowrap",
};

const metro = (mm) => (mm == null ? "—" : `${(mm / 1000).toFixed(2).replace(".", ",")} m`);

// Qual conector da peça NOVA encosta no alvo. A barra sempre entra pela ponta
// "a"; cubo e sapata entram pelo "topo" — é a face que eles oferecem.
const conectorDeEntrada = (cat) =>
  cat?.conectores?.some((c) => c.id === "a") ? "a" : "topo";

export default function ProjectEstrutura({ project, patch }) {
  const isMobile = useIsMobile();
  const [hist, setHist] = useState(() =>
    criarHistorico(deJSON(project?.estrutura ?? null, { descartarDesconhecidas: true })),
  );
  const [modo, setModo] = useState("montar");
  const [catalogoId, setCatalogoId] = useState("p30-b2000");
  const [giro, setGiro] = useState(0);
  const [selecionada, setSelecionada] = useState(null);
  const [alvo, setAlvo] = useState(null); // índice do conector apontado
  const [grade, setGrade] = useState(true);
  const [Editor, setEditor] = useState(null);
  const [erroCarga, setErroCarga] = useState(false);
  const apiRef = useRef(null);
  const salvoRef = useRef(null);

  const { montagem } = hist;

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

  // Grava no projeto (IndexedDB + sync) só quando o JSON REALMENTE muda. Sem
  // essa comparação, todo render marcaria o projeto como alterado e o sync
  // acordaria à toa.
  useEffect(() => {
    if (!patch) return;
    const json = paraJSON(montagem);
    const texto = JSON.stringify(json);
    if (salvoRef.current === null) { salvoRef.current = texto; return; }
    if (salvoRef.current === texto) return;
    salvoRef.current = texto;
    patch({ estrutura: json });
  }, [montagem, patch]);

  const r = useMemo(() => resumo(montagem), [montagem]);
  const vazia = r.pecas === 0;
  const montando = modo === "montar" && !!Editor;

  const livres = useMemo(
    () => (montando ? conectoresLivres(montagem) : []),
    [montando, montagem],
  );

  // a prévia: a peça nova resolvida no conector apontado, com o giro escolhido
  const fantasma = useMemo(() => {
    if (alvo == null) return null;
    const conAlvo = livres[alvo];
    const cat = pecaPorId(catalogoId);
    if (!conAlvo || !cat || conAlvo.sistema !== cat.sistema) return null;
    const entrada = conectorPorId(cat, conectorDeEntrada(cat));
    if (!entrada) return null;
    return { catalogoId, matriz: resolverEncaixe(conAlvo, entrada, giro).matriz };
  }, [alvo, livres, catalogoId, giro]);

  const rodar = useCallback((acao) => setHist((h) => executar(h, acao)), []);

  const encaixar = useCallback((indice) => {
    const conAlvo = livres[indice];
    const cat = pecaPorId(catalogoId);
    if (!conAlvo || !cat) return;
    rodar({
      tipo: ACOES.ADICIONAR_ENCAIXADA,
      id: genId("pc"),
      catalogoId,
      de: conAlvo.pecaId,
      conAlvo: conAlvo.conectorId,
      conNovo: conectorDeEntrada(cat),
      giro,
    });
    setAlvo(null);
  }, [livres, catalogoId, giro, rodar]);

  const pecaSelecionada = selecionada != null ? montagem.pecas[selecionada] : null;

  const girarSelecionada = () => {
    if (!pecaSelecionada?.encaixe) return;
    rodar({
      tipo: ACOES.GIRAR,
      id: pecaSelecionada.id,
      giro: (pecaSelecionada.encaixe.giro ?? 0) + 1,
    });
  };

  const apagarSelecionada = () => {
    if (!pecaSelecionada) return;
    rodar({ tipo: ACOES.REMOVER, id: pecaSelecionada.id });
    setSelecionada(null);
  };

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
      {/* F1 · MODO */}
      <Segmented
        value={modo}
        onChange={(v) => { setModo(v); setAlvo(null); }}
        options={[
          { value: "montar", label: "Montar", Icon: Plus },
          { value: "ver", label: "Ver", Icon: Hand },
        ]}
      />

      {/* F2 · FERRAMENTAS — contexto e exibição à esquerda, UMA primária à direita */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {montando && (
          <>
            <Select value={catalogoId} onChange={(e) => setCatalogoId(e.target.value)} style={{ minWidth: 190 }}>
              {CATALOGO.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </Select>
            <button
              style={btn("ghost")}
              title={`Girar a peça nova — ${giro * 90}°`}
              aria-label="Girar a peça nova"
              onClick={() => setGiro((g) => (g + 1) % 4)}
            >
              <RotateCw size={15} /> {giro * 90}°
            </button>
          </>
        )}

        <button
          style={btn("ghost", grade ? { borderColor: T.acc, color: T.acM } : {})}
          aria-pressed={grade}
          title="Mostrar a grade de 1 m"
          aria-label="Grade"
          onClick={() => setGrade((v) => !v)}
        >
          <Grid3x3 size={15} />
        </button>

        <button
          style={btn("ghost")}
          disabled={!podeDesfazer(hist)}
          title="Desfazer"
          aria-label="Desfazer"
          onClick={() => { setHist(desfazerUm); setSelecionada(null); }}
        >
          <Undo2 size={15} />
        </button>
        <button
          style={btn("ghost")}
          disabled={!podeRefazer(hist)}
          title="Refazer"
          aria-label="Refazer"
          onClick={() => { setHist(refazerUm); setSelecionada(null); }}
        >
          <Redo2 size={15} />
        </button>

        {pecaSelecionada && (
          <>
            <button style={btn("ghost")} title="Girar a peça selecionada" aria-label="Girar peça" onClick={girarSelecionada} disabled={!pecaSelecionada.encaixe}>
              <RotateCw size={15} />
            </button>
            <button style={btn("ghost", { color: T.red })} title="Excluir a peça selecionada" aria-label="Excluir peça" onClick={apagarSelecionada}>
              <Trash2 size={15} />
            </button>
          </>
        )}

        {vazia && (
          <button style={btn("ghost")} title="Montar um pórtico de exemplo" onClick={() => { setHist(criarHistorico(porticoDeExemplo())); setSelecionada(null); }}>
            <Box size={15} /> Exemplo
          </button>
        )}

        <div style={{ flex: 1 }} />
        <button
          style={btn("primary")}
          onClick={() => rodar({ tipo: ACOES.ADICIONAR_LIVRE, id: genId("pc"), catalogoId })}
        >
          <Plus size={15} /> Adicionar peça
        </button>
      </div>

      {/* F3 · CONTEXTO */}
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
        {r.pecas > 0 && !r.peso.conferido && <StatusPill color={T.amb} label="Peso não conferido" />}
        <HelpTip title="Estrutura">
          <p><b>Para montar:</b> escolha a peça, passe o ponteiro num <b>ponto claro</b> da estrutura — ele mostra a peça em fantasma, onde ela vai ficar — e clique. O botão de graus gira a peça nova de 90 em 90.</p>
          <p><b>Adicionar peça</b> põe uma peça solta na origem: é assim que se começa a segunda torre.</p>
          <p>Clique numa peça montada para selecioná-la; daí dá pra girar ou excluir. Excluir <b>não</b> apaga o que estava preso nela — aquilo vira peça solta, no lugar onde estava.</p>
          <p>O peso vem do catálogo e ainda <b>não foi conferido na balança</b> — trate como ordem de grandeza. A procedência sai no Caderno.</p>
          <p><b>O app não diz se a estrutura aguenta.</b> Vão, carga e ponto de içamento são do rigger habilitado e do engenheiro com ART. Aqui é registro do que foi montado.</p>
        </HelpTip>
      </div>

      {/* F4 · CONTEÚDO */}
      <div style={card({ padding: 10, display: "flex", flexDirection: "column", gap: 8 })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 0.6, color: T.dim, fontWeight: 700 }}>
            ESTRUTURA
            {pecaSelecionada && (
              <span style={{ marginLeft: 8, color: T.acM, fontWeight: 600, letterSpacing: 0 }}>
                · {pecaPorId(pecaSelecionada.catalogoId)?.nome}
              </span>
            )}
          </span>
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
              conectores={montando ? livres : null}
              onApontarConector={montando ? setAlvo : undefined}
              onEncaixar={montando ? encaixar : undefined}
              fantasma={fantasma}
            />
          )}
          {vazia && Editor && !erroCarga && (
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
              <span style={{ ...chip, background: T.card, padding: "8px 16px" }}>
                Comece com <b style={{ color: T.acM }}>Adicionar peça</b> — depois clique nos pontos claros para emendar
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
    </div>
  );
}
