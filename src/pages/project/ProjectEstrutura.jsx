// pages/project/ProjectEstrutura.jsx — a aba Estrutura (box truss em 3D).
//
// Espeque: docs/estrutura3d-spec.md §8 (as 5 faixas) e §9 (fases E1/E2/E3.5).
//
// O FLUXO DE MONTAGEM, em três gestos:
//   1. escolhe a peça no seletor (F2) — ou segura Ctrl e clica numa peça já
//      montada, que é o CONTA-GOTAS: a peça clicada vira a de inserção;
//   2. passa o ponteiro num CONECTOR livre → vê a peça em fantasma, onde ela
//      vai ficar; gira em passos de 90° se quiser;
//   3. clica → comita.
// Peça solta entra pela primária ("Adicionar peça"), que é o que permite começar
// uma segunda torre sem estar preso à primeira.
//
// DESKTOP-ONLY por decisão do dono: montar 3D com o dedo é ruim, e todas as
// ferramentas do ramo são de desktop. O celular fica com a CONSULTA.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, FileText, Frame, Grid3x3, Hand, Palette, Plus, Redo2, RotateCw,
  SlidersHorizontal, Trash2, Undo2,
} from "lucide-react";
import { PRINT, T } from "../../ui/tokens.js";
import { btn, card } from "../../ui/styles.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useToast } from "../../store/UIContext.jsx";
import Placeholder from "../../components/Placeholder.jsx";
import HelpTip from "../../components/HelpTip.jsx";
import LightModal from "../../components/LightModal.jsx";
import Segmented from "../../components/Segmented.jsx";
import Select from "../../components/Select.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import ZoomTrio from "../../components/ZoomTrio.jsx";
import { CoresEstruturaPrefs, LegendaEstrutura } from "../../components/EstruturaPrefs.jsx";
import { CATALOGO, conectorPorId, pecaPorId } from "../../services/estrutura/catalogo.js";
import { resolverEncaixe } from "../../services/estrutura/encaixe.js";
import { entradasDe, escolhaImporta, melhorEntrada, rotuloDaEntrada } from "../../services/estrutura/entrada.js";
import { colisoes } from "../../services/estrutura/colisao.js";
import { legendaDaEstrutura, paletaDaEstrutura } from "../../services/estrutura/cores.js";
import { conectoresLivres } from "../../services/estrutura/montagem.js";
import {
  ACOES, criarHistorico, desfazerUm, executar, podeDesfazer, podeRefazer, refazerUm,
} from "../../services/estrutura/historico.js";
import { guardarHistorico, retomarHistorico } from "../../services/estrutura/sessao.js";
import { deJSON, paraJSON } from "../../services/estrutura/serializar.js";
import { resumo } from "../../services/estrutura/metricas.js";
import { plural } from "../../services/estrutura/folha.js";
import { porticoDeExemplo } from "../../services/estrutura/exemplos.js";
import { lerImagem, salvarImagem } from "../../services/estrutura/imagem.js";
import { genId } from "../../services/ids.js";

const chip = {
  background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 999,
  padding: "3px 10px", fontSize: 12, color: T.mut, whiteSpace: "nowrap",
};

const metro = (mm) => (mm == null ? "—" : `${(mm / 1000).toFixed(2).replace(".", ",")} m`);

const nomeDe = (montagem, id) =>
  pecaPorId(montagem.pecas.find((p) => p.id === id)?.catalogoId)?.nome ?? "peça";

/**
 * Abre a montagem do projeto — e FALHA ALTO quando não consegue (§8.6, B2).
 *
 * Antes a aba carregava com `descartarDesconhecidas`: peça que o catálogo não
 * conhecesse era jogada fora em silêncio, e o técnico só descobriria no galpão.
 * Agora a aba não deixa nem montar, e diz por quê — perder peça calado é pior
 * que travar.
 *
 * É aqui também que o desfazer volta ao atravessar a troca de aba (§8.6, B3).
 */
function abrir(project) {
  try {
    const montagem = deJSON(project?.estrutura ?? null);
    return {
      hist: retomarHistorico(project?.id, montagem) ?? criarHistorico(montagem),
      erro: null,
    };
  } catch (e) {
    return { hist: criarHistorico(), erro: e };
  }
}

export default function ProjectEstrutura({ project, patch }) {
  const isMobile = useIsMobile();
  const { prefs } = useLedLabContext();
  const toast = useToast();
  const [estado, setEstado] = useState(() => abrir(project));
  const { hist, erro } = estado;
  const { montagem } = hist;

  const [modo, setModo] = useState("montar");
  const [catalogoId, setCatalogoId] = useState("p30-b2000");
  const [giro, setGiro] = useState(0);
  const [entrada, setEntrada] = useState("auto"); // face por onde a peça entra (§8.6, C1)
  const [selecao, setSelecao] = useState([]); // IDs, não índices: apagar peça mexe nos índices
  const [alvo, setAlvo] = useState(null); // índice do conector apontado
  const [grade, setGrade] = useState(true);
  const [usarCores, setUsarCores] = useState(true);
  const [ajustes, setAjustes] = useState(false);
  const [ctrl, setCtrl] = useState(false); // Ctrl segurado = conta-gotas
  const [Editor, setEditor] = useState(null);
  const [erroCarga, setErroCarga] = useState(false);
  const apiRef = useRef(null);
  const salvoRef = useRef(null);
  const [capturando, setCapturando] = useState(false);
  const [miniatura, setMiniatura] = useState(null);

  const rodar = useCallback(
    (acao) => setEstado((s) => (s.erro ? s : { ...s, hist: executar(s.hist, acao) })),
    [],
  );
  const mexerHist = useCallback((fn) => setEstado((s) => ({ ...s, hist: fn(s.hist) })), []);

  // a vista guardada mora no IndexedDB, não no projeto (ver estrutura/imagem.js)
  useEffect(() => {
    let vivo = true;
    lerImagem(project?.id).then((v) => { if (vivo) setMiniatura(v); });
    return () => { vivo = false; };
  }, [project?.id, project?.estruturaImg?.em]);

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
  //
  // ⚠️ COM ERRO DE LEITURA NÃO GRAVA NADA. A montagem em memória é uma vazia de
  // emergência; gravá-la por cima apagaria a estrutura do projeto justamente no
  // caso em que o app não conseguiu entendê-la.
  useEffect(() => {
    if (!patch || erro) return;
    const json = paraJSON(montagem);
    const texto = JSON.stringify(json);
    if (salvoRef.current === null) { salvoRef.current = texto; return; }
    if (salvoRef.current === texto) return;
    salvoRef.current = texto;
    patch({ estrutura: json });
  }, [montagem, patch, erro]);

  // o desfazer atravessa a troca de aba (§8.6, B3) — memória de SESSÃO, não vai
  // pro banco: recarregou a página, começa do zero, e está certo que comece
  useEffect(() => {
    if (!erro) guardarHistorico(project?.id, hist);
  }, [hist, project?.id, erro]);

  const r = useMemo(() => resumo(montagem), [montagem]);
  const vazia = r.pecas === 0;
  const montando = modo === "montar" && !!Editor;

  const livres = useMemo(
    () => (montando ? conectoresLivres(montagem) : []),
    [montando, montagem],
  );

  const cat = pecaPorId(catalogoId);
  const conAlvo = alvo == null ? null : livres[alvo];

  // "auto" = a entrada que não fecha o topo da estrutura. É o conserto do cubo:
  // entrando pela face de cima ele nasce de cabeça pra baixo e a face cega vai
  // parar no topo, onde nada mais encaixa (§8.5).
  const entradaEfetiva = useMemo(() => {
    if (!cat) return null;
    if (entrada !== "auto" && conectorPorId(cat, entrada)) return entrada;
    return melhorEntrada(conAlvo, cat, giro) ?? entradasDe(cat)[0]?.id ?? null;
  }, [cat, entrada, conAlvo, giro]);

  // a prévia: a peça nova resolvida no conector apontado, com o giro escolhido.
  // Com o Ctrl segurado não há prévia — ali o clique é conta-gotas, e desenhar
  // um fantasma seria prometer uma peça que não vem.
  const fantasma = useMemo(() => {
    if (ctrl || !conAlvo || !cat || conAlvo.sistema !== cat.sistema) return null;
    const face = conectorPorId(cat, entradaEfetiva);
    if (!face) return null;
    return { catalogoId, matriz: resolverEncaixe(conAlvo, face, giro).matriz };
  }, [ctrl, conAlvo, cat, catalogoId, entradaEfetiva, giro]);

  // ── seleção, por ID ────────────────────────────────────────
  // Guardar índice quebraria na primeira exclusão: a lista encurta e o índice
  // passa a apontar pra outra peça.
  const selecionadas = useMemo(
    () => selecao.filter((id) => montagem.pecas.some((p) => p.id === id)),
    [selecao, montagem],
  );
  const indicesSel = useMemo(
    () => selecionadas.map((id) => montagem.pecas.findIndex((p) => p.id === id)).filter((i) => i >= 0),
    [selecionadas, montagem],
  );

  const conflitos = useMemo(() => colisoes(montagem), [montagem]);
  const indicesConflito = useMemo(() => {
    const ids = new Set(conflitos.flatMap((c) => [c.a, c.b]));
    return montagem.pecas.map((p, i) => (ids.has(p.id) ? i : -1)).filter((i) => i >= 0);
  }, [conflitos, montagem]);

  const paleta = useMemo(
    () => (usarCores ? paletaDaEstrutura(prefs.estruturaCores) : null),
    [usarCores, prefs.estruturaCores],
  );
  const legenda = useMemo(
    () => (usarCores ? legendaDaEstrutura(montagem, prefs.estruturaCores) : []),
    [usarCores, montagem, prefs.estruturaCores],
  );

  const selecionar = useCallback((indice, { shift = false } = {}) => {
    const id = indice == null ? null : montagem.pecas[indice]?.id ?? null;
    if (id == null) {
      if (!shift) setSelecao([]);
      return;
    }
    setSelecao((atual) =>
      shift
        ? (atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id])
        : [id],
    );
  }, [montagem]);

  // CONTA-GOTAS (§8.6, C3, decisão do dono): a peça clicada com Ctrl vira a peça
  // de inserção. É o que evita a viagem até o seletor da F2 no meio de uma torre
  // repetitiva — o técnico não tira o olho da cena.
  const contaGotas = useCallback((indice) => {
    const p = indice == null ? null : montagem.pecas[indice];
    if (!p) return;
    setCatalogoId(p.catalogoId);
    setEntrada("auto");
    toast(`Peça de inserção: ${pecaPorId(p.catalogoId)?.nome ?? p.catalogoId}`);
  }, [montagem, toast]);

  const encaixar = useCallback((indice) => {
    const con = livres[indice];
    if (!con || !cat || !entradaEfetiva) return;
    rodar({
      tipo: ACOES.ADICIONAR_ENCAIXADA,
      id: genId("pc"),
      catalogoId,
      de: con.pecaId,
      conAlvo: con.conectorId,
      conNovo: entradaEfetiva,
      giro,
    });
    setAlvo(null);
  }, [livres, cat, catalogoId, entradaEfetiva, giro, rodar]);

  // Apagar e girar em LOTE: o desfazer volta tudo num Ctrl+Z só. Apagar cinco
  // peças de uma vez e ter que desfazer cinco vezes é o app cobrando pelo gesto
  // que ele mesmo ofereceu.
  const apagarSelecionadas = useCallback(() => {
    if (!selecionadas.length) return;
    rodar({ tipo: ACOES.LOTE, acoes: selecionadas.map((id) => ({ tipo: ACOES.REMOVER, id })) });
    setSelecao([]);
  }, [selecionadas, rodar]);

  const girarSelecionadas = useCallback(() => {
    const acoes = selecionadas
      .map((id) => montagem.pecas.find((p) => p.id === id))
      .filter((p) => p?.encaixe)
      .map((p) => ({ tipo: ACOES.GIRAR, id: p.id, giro: (p.encaixe.giro ?? 0) + 1 }));
    if (acoes.length) rodar({ tipo: ACOES.LOTE, acoes });
  }, [selecionadas, montagem, rodar]);

  const desfazer = useCallback(() => { mexerHist(desfazerUm); setSelecao([]); }, [mexerHist]);
  const refazer = useCallback(() => { mexerHist(refazerUm); setSelecao([]); }, [mexerHist]);

  // ── atalhos de teclado (§8.6, C3) ──────────────────────────
  useEffect(() => {
    if (isMobile || erro) return undefined;
    // digitando num campo, o teclado é do campo: Delete apaga texto, não peça
    const editando = (alvoDom) =>
      !!alvoDom?.closest?.("input, textarea, select, [contenteditable='true'], [role='dialog']");

    const onKeyDown = (e) => {
      if (e.key === "Control" || e.key === "Meta") { setCtrl(true); return; }
      if (editando(e.target)) return;
      const cmd = e.ctrlKey || e.metaKey;
      if (cmd && e.key.toLowerCase() === "z") {
        e.preventDefault(); // senão o navegador tenta desfazer no lugar do app
        (e.shiftKey ? refazer : desfazer)();
        return;
      }
      if (cmd) return; // o resto dos atalhos é sem modificador
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault(); // Backspace solto ainda navega pra trás em alguns navegadores
        apagarSelecionadas();
        return;
      }
      if (e.key === "Escape") { setSelecao([]); setAlvo(null); return; }
      if (e.key.toLowerCase() === "r") {
        // sem seleção, o R gira a PEÇA NOVA — que é o giro que o técnico ajusta
        // enquanto mira o encaixe
        if (selecionadas.length) girarSelecionadas();
        else setGiro((g) => (g + 1) % 4);
      }
    };
    // solta o conta-gotas em qualquer saída: sem o blur, um alt-tab deixaria o
    // ponteiro preso em "copiar" e o clique seguinte não montaria nada
    const soltar = (e) => { if (!e?.key || e.key === "Control" || e.key === "Meta") setCtrl(false); };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", soltar);
    window.addEventListener("blur", soltar);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", soltar);
      window.removeEventListener("blur", soltar);
    };
  }, [isMobile, erro, desfazer, refazer, apagarSelecionadas, girarSelecionadas, selecionadas.length]);

  // A imagem que vai pro Caderno é capturada AQUI e guardada no aparelho. Não dá
  // pra gerar na hora do relatório: o Caderno abre no celular e offline, e o
  // chunk 3D não está lá (§7.2). Então quem tem a cena montada é quem tira a foto.
  const capturarParaCaderno = async () => {
    if (!apiRef.current || vazia) return;
    setCapturando(true);
    try {
      // fundo do PAPEL, não o fundo escuro do app: a folha é clara
      const dataUrl = apiRef.current.capturar({ largura: 1800, altura: 1150, fundo: "#ffffff" });
      if (!dataUrl) return;
      const ref = await salvarImagem(project?.id, dataUrl, { largura: 1800, altura: 1150 });
      setMiniatura(dataUrl);
      if (ref) patch?.({ estruturaImg: ref });
    } finally {
      setCapturando(false);
    }
  };

  if (isMobile) {
    return (
      <Placeholder
        icon={Frame}
        title="A montagem é no computador"
        description="Montar estrutura em 3D com o dedo não funciona bem — todas as ferramentas do ramo são de desktop. Abra este projeto no computador para montar. Aqui no celular fica a consulta: a estrutura pronta e a lista de peças."
      />
    );
  }

  // §8.6 · B2 — peça desconhecida FALHA ALTO. A aba não monta e não grava: uma
  // gravação aqui apagaria a estrutura que o app não conseguiu ler.
  if (erro) {
    return (
      <Placeholder
        icon={Frame}
        title="Esta estrutura tem peça que este app não conhece"
        description={`O projeto cita ${erro.detalhe?.catalogoId ? `a peça "${erro.detalhe.catalogoId}"` : "uma peça"}, que não está no catálogo desta versão — provavelmente veio de uma versão mais nova, por sincronização. Nada foi alterado: a estrutura continua guardada exatamente como está. Atualize o app e abra de novo.`}
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
            <Select
              value={catalogoId}
              onChange={(e) => { setCatalogoId(e.target.value); setEntrada("auto"); }}
              style={{ minWidth: 190 }}
            >
              {CATALOGO.map((p) => (
                <option key={p.id} value={p.id}>{p.nome}</option>
              ))}
            </Select>

            {/* FACE DE ENTRADA — só na peça em que a escolha muda alguma coisa.
                Na barra tanto faz entrar pela ponta A ou pela B; no cubo é o que
                decide onde a face cega vai parar. */}
            {escolhaImporta(cat) && (
              <Select
                value={entrada}
                onChange={(e) => setEntrada(e.target.value)}
                title="Por qual face a peça entra na junta"
                style={{ minWidth: 165 }}
              >
                <option value="auto">Encaixe automático</option>
                {entradasDe(cat).map((c) => (
                  <option key={c.id} value={c.id}>Entra por: {rotuloDaEntrada(cat, c.id)}</option>
                ))}
              </Select>
            )}

            <button
              style={btn("ghost")}
              title={`Girar a peça nova — ${giro * 90}° (tecla R)`}
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
          style={btn("ghost", usarCores ? { borderColor: T.acc, color: T.acM } : {})}
          aria-pressed={usarCores}
          title="Uma cor por peça, com legenda"
          aria-label="Cores por peça"
          onClick={() => setUsarCores((v) => !v)}
        >
          <Palette size={15} />
        </button>
        <button
          style={btn("ghost")}
          title="Ajustar a cor de cada peça"
          aria-label="Ajustes"
          onClick={() => setAjustes(true)}
        >
          <SlidersHorizontal size={15} />
        </button>

        <button
          style={btn("ghost")}
          disabled={!podeDesfazer(hist)}
          title="Desfazer (Ctrl+Z)"
          aria-label="Desfazer"
          onClick={desfazer}
        >
          <Undo2 size={15} />
        </button>
        <button
          style={btn("ghost")}
          disabled={!podeRefazer(hist)}
          title="Refazer (Ctrl+Shift+Z)"
          aria-label="Refazer"
          onClick={refazer}
        >
          <Redo2 size={15} />
        </button>

        {selecionadas.length > 0 && (
          <>
            <button style={btn("ghost")} title="Girar a seleção (tecla R)" aria-label="Girar peça" onClick={girarSelecionadas}>
              <RotateCw size={15} />
            </button>
            <button style={btn("ghost", { color: T.red })} title="Excluir a seleção (Delete)" aria-label="Excluir peça" onClick={apagarSelecionadas}>
              <Trash2 size={15} />{selecionadas.length > 1 ? ` ${selecionadas.length}` : ""}
            </button>
          </>
        )}

        {!vazia && (
          <button
            style={btn("ghost", capturando ? { opacity: 0.6, cursor: "wait" } : {})}
            disabled={capturando || !Editor}
            title="Guardar esta vista da estrutura para sair no Caderno Técnico"
            onClick={capturarParaCaderno}
          >
            <FileText size={15} /> {project?.estruturaImg ? "Atualizar imagem" : "Imagem do Caderno"}
          </button>
        )}

        {vazia && (
          <button
            style={btn("ghost")}
            title="Montar um pórtico de exemplo"
            onClick={() => { setEstado({ hist: criarHistorico(porticoDeExemplo()), erro: null }); setSelecao([]); }}
          >
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
        {conflitos.length > 0 && (
          <StatusPill color={T.red} label={plural(conflitos.length, "sobreposição", "sobreposições")} />
        )}
        {r.pecas > 0 && !r.peso.conferido && <StatusPill color={T.amb} label="Peso não conferido" />}
        {ctrl && <StatusPill color={T.acM} label="Conta-gotas — clique numa peça" />}
        <HelpTip title="Estrutura">
          <p><b>Para montar:</b> escolha a peça, passe o ponteiro num <b>ponto claro</b> da estrutura — ele mostra a peça em fantasma, onde ela vai ficar — e clique. O botão de graus gira a peça nova de 90 em 90.</p>
          <p><b>Adicionar peça</b> põe uma peça solta na origem: é assim que se começa a segunda torre.</p>
          <p><b>Atalhos:</b> <b>Ctrl</b> segurado vira conta-gotas — a peça que você clicar passa a ser a de inserção · <b>Shift + clique</b> seleciona várias · <b>Delete</b> apaga a seleção · <b>R</b> gira · <b>Ctrl+Z</b> desfaz · <b>Esc</b> limpa.</p>
          <p><b>Encaixe automático</b> escolhe por qual face a peça entra na junta, evitando fechar o topo. No cubo isso importa: entrando pela face de cima, a face cega dele para no topo e nada mais encaixa ali.</p>
          <p>Excluir <b>não</b> apaga o que estava preso na peça — aquilo vira peça solta, no lugar onde estava.</p>
          <p><b>Peça em vermelho está sobreposta</b> a outra: duas ocupando o mesmo espaço. O app avisa e deixa seguir — no truss de verdade elas não entrariam.</p>
          <p>O peso vem do catálogo e ainda <b>não foi conferido na balança</b> — trate como ordem de grandeza. A procedência sai no Caderno.</p>
          <p><b>Imagem do Caderno:</b> guarda a vista atual da cena para sair na folha Estrutura. Ela fica <b>neste aparelho</b> (não sobe pro sync) — em outro computador, capture de novo.</p>
          <p><b>O app não diz se a estrutura aguenta.</b> Vão, carga e ponto de içamento são do rigger habilitado e do engenheiro com ART. Aqui é registro do que foi montado.</p>
        </HelpTip>
      </div>

      {/* F4 · CONTEÚDO */}
      <div style={card({ padding: 10, display: "flex", flexDirection: "column", gap: 8 })}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <span style={{ fontSize: 11, letterSpacing: 0.6, color: T.dim, fontWeight: 700 }}>
            ESTRUTURA
            {selecionadas.length > 0 && (
              <span style={{ marginLeft: 8, color: T.acM, fontWeight: 600, letterSpacing: 0 }}>
                · {selecionadas.length === 1
                  ? nomeDe(montagem, selecionadas[0])
                  : `${selecionadas.length} peças selecionadas`}
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
              selecao={indicesSel}
              onSelecionar={selecionar}
              conflitos={indicesConflito}
              cores={paleta}
              contaGotas={ctrl}
              onContaGotas={contaGotas}
              mostrarGrade={grade}
              conectores={montando && !ctrl ? livres : null}
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
          {/* LEGENDA no canto do desenho (§8.6, D2) — a mesma que sai no Caderno */}
          {legenda.length > 0 && Editor && !erroCarga && (
            <div style={{ position: "absolute", left: 10, bottom: 10, maxWidth: "74%", pointerEvents: "none" }}>
              <LegendaEstrutura itens={legenda} compacta />
            </div>
          )}
        </div>

        {conflitos.length > 0 && (
          <div style={{ fontSize: 12, color: T.red, lineHeight: 1.5 }}>
            <b>Peça dentro de peça</b> (em vermelho na cena):{" "}
            {conflitos.slice(0, 3).map((c) => `${nomeDe(montagem, c.a)} × ${nomeDe(montagem, c.b)}`).join(" · ")}
            {conflitos.length > 3 ? ` · e mais ${conflitos.length - 3}` : ""}.
            <span style={{ color: T.dim }}> Isso não trava a montagem — mas no truss de verdade elas não entrariam.</span>
          </div>
        )}

        {miniatura && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, color: T.dim }}>
            <img
              src={miniatura}
              alt="Vista guardada para o Caderno"
              style={{ height: 46, borderRadius: 6, border: `1px solid ${T.bd}`, background: PRINT.head }}
            />
            <span>
              Esta vista sai no Caderno{project?.estruturaImg?.kb ? ` (${project.estruturaImg.kb} KB)` : ""} e fica
              guardada <b style={{ color: T.mut }}>neste aparelho</b> — em outro computador, capture de novo.
              Reenquadre e clique em <b style={{ color: T.mut }}>Atualizar imagem</b> para trocar.
            </span>
          </div>
        )}

        {!vazia && !usarCores && (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12, color: T.mut }}>
            {r.lista.map((l) => (
              <span key={l.catalogoId} style={chip}>
                <b style={{ color: T.txt }}>{l.qtd}×</b> {l.nome}
              </span>
            ))}
          </div>
        )}
        {!vazia && (
          <span style={{ ...chip, alignSelf: "flex-start" }}>
            <b style={{ color: T.txt }}>{r.parafusaria.itens.find((i) => i.id === "parafuso")?.qtd ?? 0}×</b> parafuso 5/8&quot;
          </span>
        )}
      </div>

      {/* F5 · AJUSTES — o que muda COMO SE VÊ. As mesmas prefs das Configurações:
          a decisão de cor é tomada olhando o desenho, não num drawer distante. */}
      {ajustes && (
        <LightModal title="Cores da estrutura" width={460} onClose={() => setAjustes(false)}>
          <CoresEstruturaPrefs />
        </LightModal>
      )}
    </div>
  );
}
