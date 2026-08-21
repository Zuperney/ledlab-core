// pages/project/ProjectEstrutura.jsx — a aba Estrutura (box truss em 3D).
//
// Espeque: docs/estrutura3d-spec.md §8 (as 5 faixas), §8.11 (as seis direções)
// e §12 (as telas soltas, o ímã e a trena).
//
// QUATRO MODOS, e cada um com UM gesto (§12). Foi o que resolveu a colisão de
// teclas: antes, o mesmo clique tentava encaixar peça, selecionar e pendurar
// tela, e o técnico descobria qual das três tinha acontecido depois.
//
//   · MONTAR — escolhe a peça na paleta, clica no piso (nasce ali) ou num
//     conector livre (emenda). `R` gira, `Shift+R` passeia a face cega;
//   · TELAS  — escolhe a tela na paleta e clica no piso: ela nasce em pé, no
//     chão. Arrasta pra mover, `Shift+arrasta` pra subir, `R` vira o LED. O ÍMÃ
//     encosta a borda no que já está lá;
//   · MEDIR  — dois cliques e a distância entre eles, em metro, no desenho;
//   · VER    — o clique só seleciona. `V` segurado vira este modo sem sair do
//     Montar, que é o que evita encaixar peça sem querer.
//
// DESKTOP-ONLY por decisão do dono: montar 3D com o dedo é ruim, e todas as
// ferramentas do ramo são de desktop. O celular fica com a CONSULTA.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box, FileText, Frame, Grid3x3, Hand, Layers, Magnet, Palette, Plus, Redo2, RotateCw,
  Ruler, SlidersHorizontal, Trash2, Undo2,
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
import StatusPill from "../../components/StatusPill.jsx";
import ZoomTrio from "../../components/ZoomTrio.jsx";
import PaletaEstrutura from "../../components/PaletaEstrutura.jsx";
import PaletaTelas from "../../components/PaletaTelas.jsx";
import { CoresEstruturaPrefs } from "../../components/EstruturaPrefs.jsx";
import { CATALOGO, conectorPorId, pecaPorId } from "../../services/estrutura/catalogo.js";
import { resolverEncaixe } from "../../services/estrutura/encaixe.js";
import { entradasDe, facesCegasNoMundo, melhorEntrada } from "../../services/estrutura/entrada.js";
import { colisoes } from "../../services/estrutura/colisao.js";
import {
  MOTIVOS_DE_PAINEL, medidasDaTela, migrarPaineis, paineisNoMundo, pesoDosPaineis,
  problemasDosPaineis, telaMensuravel,
} from "../../services/estrutura/paineis.js";
import {
  IMA_MM, imantar, imantarPonto, medir, planosDeImante, pontosNotaveis,
} from "../../services/estrutura/imantar.js";
import { paletaDaEstrutura } from "../../services/estrutura/cores.js";
import { conectoresLivres, matrizApoiada } from "../../services/estrutura/montagem.js";
import {
  HORIZONTAIS, direcaoDominante, listaDeNomes, nomeDe,
} from "../../services/estrutura/direcoes.js";
import {
  direcoesLivres, direcoesOcupadas, faceCegaEm, poseDoGiro, poseDoTombo, temFilhas,
} from "../../services/estrutura/orientacao.js";
import {
  ACOES, criarHistorico, desfazerUm, executar, podeDesfazer, podeRefazer, refazerUm,
} from "../../services/estrutura/historico.js";
import { guardarHistorico, retomarHistorico } from "../../services/estrutura/sessao.js";
import { deJSON, paraJSON } from "../../services/estrutura/serializar.js";
import { nivelDoChao, resumo } from "../../services/estrutura/metricas.js";
import { plural } from "../../services/estrutura/folha.js";
import { matriz, qEntreVetores } from "../../services/estrutura/vetor.js";
import { porticoDeExemplo } from "../../services/estrutura/exemplos.js";
import { lerImagem, salvarImagem } from "../../services/estrutura/imagem.js";
import { genId } from "../../services/ids.js";

const chip = {
  background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 999,
  padding: "3px 10px", fontSize: 12, color: T.mut, whiteSpace: "nowrap",
};

const rotuloCard = { fontSize: 11, letterSpacing: 0.6, color: T.dim, fontWeight: 700 };

const metro = (mm) => (mm == null ? "—" : `${(mm / 1000).toFixed(2).replace(".", ",")} m`);

// o que dizer de cada problema de painel — em medida, nunca em carga
const TEXTO_DO_PROBLEMA = {
  [MOTIVOS_DE_PAINEL.SEM_TELA]: "a tela saiu do projeto",
  [MOTIVOS_DE_PAINEL.SEM_APOIO]: "a peça onde ele estava pendurado foi apagada",
  [MOTIVOS_DE_PAINEL.ATRAVESSA]: "entra na treliça — não cabe no vão",
  [MOTIVOS_DE_PAINEL.NO_CHAO]: "passa do piso — está enterrado",
};

// o cone da seta tem 240 mm; 160 à frente da face deixa a base dele para fora da
// peça, sem descolar dela
const RECUO_DA_SETA = 160;

// O ALCANCE DO ÍMÃ EM PIXELS, e vale o MAIOR entre ele e os milímetros do motor.
// Sem isto o ímã tem tamanho fixo no mundo: generoso a dois metros de câmera,
// meio pixel a quarenta — e o técnico afastado nunca consegue encostar nada.
// Mesma régua que o `snap.js` já usa pros conectores.
const IMA_PX = 20;

// A peça que a aba já vem com ela escolhida: a barra de 2 m, que é a que mais
// sai do galpão. Achada pelo QUE ELA É, não pelo id — id de catálogo é coisa que
// se renomeia, e um id morto aqui deixaria a aba abrindo sem peça selecionada.
const PECA_PADRAO =
  CATALOGO.find((p) => p.tipo === "barra" && p.comprimentoMm === 2000)?.id
  ?? CATALOGO[0]?.id
  ?? "";

const nomeDaPeca = (montagem, id) =>
  pecaPorId(montagem.pecas.find((p) => p.id === id)?.catalogoId)?.nome ?? "peça";

const nomeDaTela = (item, i) => item?.tela?.nome?.trim() || `Tela ${i + 1}`;

/**
 * Abre a montagem do projeto — e FALHA ALTO quando não consegue (§8.6, B2).
 *
 * Antes a aba carregava com `descartarDesconhecidas`: peça que o catálogo não
 * conhecesse era jogada fora em silêncio, e o técnico só descobriria no galpão.
 * Agora a aba não deixa nem montar, e diz por quê — perder peça calado é pior
 * que travar.
 *
 * É aqui também que o desfazer volta ao atravessar a troca de aba (§8.6, B3) e
 * que o painel do formato antigo vira painel solto (§12) — congelado exatamente
 * onde já estava desenhado, e gravado só quando o técnico mexer em alguma coisa.
 */
function abrir(project) {
  try {
    const montagem = migrarPaineis(deJSON(project?.estrutura ?? null), project?.telas ?? []);
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
  const [catalogoId, setCatalogoId] = useState(PECA_PADRAO);
  const [giro, setGiro] = useState(0);
  // o "tilt": passo dentro da lista de faces de entrada, que começa sempre na
  // escolha AUTOMÁTICA. Não é um seletor na tela — é `Shift+R` sem seleção (§8.7).
  const [tilt, setTilt] = useState(0);
  const [selecao, setSelecao] = useState([]); // IDs, não índices: apagar peça mexe nos índices
  const [alvo, setAlvo] = useState(null); // índice do conector apontado
  const [grade, setGrade] = useState(true);
  const [usarCores, setUsarCores] = useState(true);
  const [ajustes, setAjustes] = useState(false);
  const [ctrl, setCtrl] = useState(false); // Ctrl segurado = conta-gotas
  // ── as telas no desenho (§12) ──
  const [telaId, setTelaId] = useState(null); // a tela que nasce no próximo clique
  const [painelSel, setPainelSel] = useState(null);
  const [ima, setIma] = useState(true);
  const [arrasto, setArrasto] = useState(null); // { id, pos, presos } enquanto segura
  const arrastoRef = useRef(null);
  // ── a trena (§12) ──
  const [pontas, setPontas] = useState(null); // { a, b|null }
  const [verMomentaneo, setVerMomentaneo] = useState(false); // V segurado = modo Ver
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
  const vazia = r.pecas === 0 && (montagem.paineis?.length ?? 0) === 0;
  // O `V` SEGURADO É MODO VER (§8.7, pedido do dono): sem ele, clicar numa peça
  // pra selecionar em modo Montar é uma corrida contra os conectores, que têm
  // prioridade no clique — e o técnico acaba encaixando peça sem querer.
  const modoEfetivo = verMomentaneo && modo === "montar" ? "ver" : modo;
  const montando = modoEfetivo === "montar" && !!Editor;
  const emTelas = modoEfetivo === "telas" && !!Editor;
  const medindo = modoEfetivo === "medir" && !!Editor;

  const livres = useMemo(
    () => (montando ? conectoresLivres(montagem) : []),
    [montando, montagem],
  );

  const cat = pecaPorId(catalogoId);
  const conAlvo = alvo == null ? null : livres[alvo];

  // As faces de entrada, com a ESCOLHA AUTOMÁTICA na frente — a que não fecha o
  // topo da estrutura. O `Shift+R` só anda nessa lista, então o padrão é sempre o
  // automático e o técnico não precisa saber o nome de face nenhuma.
  const entradas = useMemo(() => {
    if (!cat) return [];
    const todas = entradasDe(cat).map((c) => c.id);
    const auto = melhorEntrada(conAlvo, cat, giro);
    return auto ? [auto, ...todas.filter((id) => id !== auto)] : todas;
  }, [cat, conAlvo, giro]);

  const entradaEfetiva = entradas.length
    ? entradas[((tilt % entradas.length) + entradas.length) % entradas.length]
    : null;

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

  // A SETA DA FACE CEGA (§8.7). O cubo tem uma face que veio tapada de fábrica e
  // ela é invisível no desenho — o técnico só descobre onde parou quando tenta
  // encaixar ali e não consegue. Selecionou o cubo, a seta responde.
  const setas = useMemo(() => {
    const out = [];
    for (const id of selecionadas) {
      const p = montagem.pecas.find((x) => x.id === id);
      for (const f of facesCegasNoMundo(p, pecaPorId(p?.catalogoId))) {
        out.push(matriz(qEntreVetores([0, 1, 0], f.dir), [
          f.pos[0] + f.dir[0] * RECUO_DA_SETA,
          f.pos[1] + f.dir[1] * RECUO_DA_SETA,
          f.pos[2] + f.dir[2] * RECUO_DA_SETA,
        ]));
      }
    }
    return out;
  }, [selecionadas, montagem]);

  // A FACE CEGA DO CUBO, na direção do PISO (§8.11). É o chip que torna a regra
  // visível sem abrir a ajuda: quem vê "Face cega · Oeste" entende num segundo
  // por que o R leva a seta pra onde leva.
  const faceCega = useMemo(() => {
    if (selecionadas.length !== 1) return null;
    const id = selecionadas[0];
    const direcao = faceCegaEm(montagem, id);
    return direcao ? { direcao, livres: direcoesLivres(montagem, id) } : null;
  }, [selecionadas, montagem]);

  // ── as telas no desenho (§12) ──────────────────────────────
  // A tela NÃO é copiada: medida e peso saem da tela do projeto, viva. Mexeu em
  // cols/rows na aba Dados, o painel acompanha.
  const telas = useMemo(
    () => (project?.telas ?? []).filter(telaMensuravel),
    [project?.telas],
  );
  const telaEscolhida = telas.find((t) => t.id === telaId) ?? telas[0] ?? null;

  // A MONTAGEM DA VISTA: durante o arraste, a posição que vale é a do ponteiro,
  // e ela não passa pelo histórico. Só os painéis entram nesta cópia — refazer a
  // montagem inteira 60 vezes por segundo faria a colisão das PEÇAS, que nem se
  // moveram, recalcular junto.
  const montagemVista = useMemo(() => {
    if (!arrasto) return montagem;
    return {
      ...montagem,
      paineis: (montagem.paineis ?? []).map((p) =>
        (p.id === arrasto.id ? { ...p, pos: arrasto.pos } : p)),
    };
  }, [montagem, arrasto]);

  const paineis = useMemo(
    () => paineisNoMundo(montagemVista, project?.telas ?? []),
    [montagemVista, project?.telas],
  );
  const pesoPendurado = useMemo(
    () => pesoDosPaineis(montagemVista, project?.telas ?? []),
    [montagemVista, project?.telas],
  );
  // os problemas saem da montagem COMITADA: o teste de sobreposição varre a
  // estrutura inteira, e refazer isso a cada quadro do arraste travaria o gesto
  const problemas = useMemo(
    () => problemasDosPaineis(montagem, project?.telas ?? []),
    [montagem, project?.telas],
  );
  const paineisComProblema = useMemo(
    () => new Set(problemas.map((x) => x.painelId)),
    [problemas],
  );
  const paraDesenhar = useMemo(() => paineis.map((item) => ({
    id: item.painel.id,
    matriz: item.matriz,
    ...(item.medidas ?? {}),
    selecionado: item.painel.id === painelSel,
    problema: paineisComProblema.has(item.painel.id),
  })), [paineis, painelSel, paineisComProblema]);

  const painelAtivo = useMemo(() => {
    const i = paineis.findIndex((x) => x.painel.id === painelSel);
    return i < 0 ? null : { ...paineis[i], nome: nomeDaTela(paineis[i], i) };
  }, [paineis, painelSel]);

  const quantidadesDeTela = useMemo(() => {
    const out = {};
    for (const p of montagem.paineis ?? []) out[p.telaId] = (out[p.telaId] ?? 0) + 1;
    return out;
  }, [montagem.paineis]);

  // ── o ÍMÃ (§12) ────────────────────────────────────────────
  // Os planos saem UMA VEZ por montagem e ficam ordenados: o arraste consulta
  // isto a cada quadro, e varrer a estrutura inteira ali derrubaria o gesto.
  const planos = useMemo(
    () => planosDeImante(montagem, project?.telas ?? [], arrasto?.id ?? null),
    [montagem, project?.telas, arrasto?.id],
  );

  // ── a TRENA (§12) ──────────────────────────────────────────
  const notaveis = useMemo(
    () => pontosNotaveis(montagem, project?.telas ?? []),
    [montagem, project?.telas],
  );
  const trena = useMemo(
    () => (pontas?.a && pontas?.b ? medir(pontas.a, pontas.b) : null),
    [pontas],
  );
  const medidaNaCena = useMemo(
    () => (pontas ? { ...pontas, texto: trena ? metro(trena.mm) : null } : null),
    [pontas, trena],
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
  // quantas de cada peça estão montadas — é o que faz a paleta valer de legenda
  const quantidades = useMemo(
    () => Object.fromEntries(r.lista.map((l) => [l.catalogoId, l.qtd])),
    [r.lista],
  );

  const escolherPeca = useCallback((id) => { setCatalogoId(id); setTilt(0); }, []);

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
  // de inserção. É o que evita a viagem até a paleta no meio de uma torre
  // repetitiva — o técnico não tira o olho da cena.
  const contaGotas = useCallback((indice) => {
    const p = indice == null ? null : montagem.pecas[indice];
    if (!p) return;
    escolherPeca(p.catalogoId);
    toast(`Peça de inserção: ${pecaPorId(p.catalogoId)?.nome ?? p.catalogoId}`);
  }, [montagem, toast, escolherPeca]);

  // A PEÇA NASCE ONDE SE CLICA (§8.7). Antes havia um botão "Adicionar peça" e
  // toda peça solta nascia na origem, uma em cima da outra — o aviso de
  // sobreposição acusava um problema que o próprio app tinha criado.
  //
  // Arredondado em 10 cm: no campo se mede em centímetro inteiro, e ponto solto
  // na terceira casa deixaria a medida do Caderno com um resto que ninguém pediu.
  const nascerNoChao = useCallback((ponto) => {
    if (!cat) return;
    const passo = 100;
    rodar({
      tipo: ACOES.ADICIONAR_LIVRE,
      id: genId("pc"),
      catalogoId,
      matriz: matrizApoiada(catalogoId, {
        x: Math.round(ponto[0] / passo) * passo,
        z: Math.round(ponto[2] / passo) * passo,
        chaoMm: nivelDoChao(montagem),
      }),
    });
  }, [cat, catalogoId, montagem, rodar]);

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
    setTilt(0); // a próxima peça volta ao encaixe automático
  }, [livres, cat, catalogoId, entradaEfetiva, giro, rodar]);

  // Apagar e girar em LOTE: o desfazer volta tudo num Ctrl+Z só. Apagar cinco
  // peças de uma vez e ter que desfazer cinco vezes é o app cobrando pelo gesto
  // que ele mesmo ofereceu.
  const apagarSelecionadas = useCallback(() => {
    if (!selecionadas.length) return;
    rodar({ tipo: ACOES.LOTE, acoes: selecionadas.map((id) => ({ tipo: ACOES.REMOVER, id })) });
    setSelecao([]);
  }, [selecionadas, rodar]);

  const pecasSelecionadas = useCallback(
    () => selecionadas.map((id) => montagem.pecas.find((p) => p.id === id)).filter(Boolean),
    [selecionadas, montagem],
  );

  // AS DUAS TECLAS SÃO AS REGRAS (§8.11). Rotação se descreve pelas direções do
  // PISO — N · S · L · O · CIMA · BAIXO —, não pelo eixo da junta, que muda de
  // peça pra peça e fazia a mesma tecla se comportar diferente em peças iguais.
  //
  //   `R`       · cubo: leva a face cega pra próxima direção HORIZONTAL livre
  //             · barra e sapata: gira no próprio eixo, sem sair do lugar (D4)
  //   `Shift+R` · cubo: leva a face cega pra CIMA ou BAIXO, se estiver livre
  //             · barra SOLTA: tomba 90°, em pé ↔ deitada (D7)
  //
  // Direção que já tem junta é trava (D6): ali existe flange aparafusada. E
  // rotação nenhuma arrasta outra peça (D3) — quem garante é o `definirPose`.
  const mexerNaSelecao = useCallback((pose) => {
    const pecas = pecasSelecionadas();
    const acoes = pecas
      .map((p) => {
        const m = pose(p);
        return m ? { tipo: ACOES.POSE, id: p.id, matriz: m } : null;
      })
      .filter(Boolean);
    if (acoes.length) rodar({ tipo: ACOES.LOTE, acoes });
    return { pedidas: pecas.length, feitas: acoes.length };
  }, [pecasSelecionadas, rodar]);

  // POR QUE A PEÇA NÃO GIROU. A aba nunca fica muda quando a tecla não faz nada:
  // tecla que às vezes funciona e às vezes não, sem dizer por quê, é o tipo de
  // coisa que o técnico atribui a bug do app e para de usar.
  const explicarTrava = useCallback((p, plano) => {
    if (pecaPorId(p.catalogoId)?.tipo !== "cubo") {
      if (p.encaixe) toast("A direção desta peça vem da junta — o R gira ela no próprio eixo");
      else if (temFilhas(montagem, p.id)) toast("Não dá pra deitar: tem peça encaixada nela");
      else toast("Esta peça não vira pra cima nem pra baixo");
      return;
    }
    const travadas = [...direcoesOcupadas(montagem, p.id)];
    const onde = plano === "vertical" ? "pra cima nem pra baixo" : "no plano do chão";
    toast(travadas.length
      ? `A face cega não cabe ${onde}: ${listaDeNomes(travadas)} ${travadas.length === 1 ? "tem" : "têm"} peça aparafusada`
      : `Não há outra direção ${onde}`);
  }, [montagem, toast]);

  const girarSelecionadas = useCallback(() => {
    const feito = mexerNaSelecao((p) => poseDoGiro(montagem, p.id));
    if (feito.pedidas === 1 && feito.feitas === 0) explicarTrava(pecasSelecionadas()[0], "horizontal");
  }, [mexerNaSelecao, montagem, explicarTrava, pecasSelecionadas]);

  const tombarSelecionadas = useCallback(() => {
    const feito = mexerNaSelecao((p) => poseDoTombo(montagem, p.id));
    if (feito.pedidas === 1 && feito.feitas === 0) explicarTrava(pecasSelecionadas()[0], "vertical");
  }, [mexerNaSelecao, montagem, explicarTrava, pecasSelecionadas]);

  // ── as telas: nascer, arrastar, girar, tirar (§12) ─────────

  // A TELA NASCE EM PÉ, NO CHÃO, ONDE SE CLICA — e já virada pra quem está
  // vendo. Parede que nasce deitada ou de costas obriga a dois gestos de
  // correção antes de qualquer trabalho de verdade.
  const nascerTela = useCallback((ponto) => {
    if (!telaEscolhida) return;
    const olha = direcaoDominante(apiRef.current?.olhar?.() ?? [0, 0, 1]);
    const medidas = medidasDaTela(telaEscolhida);
    const chao = nivelDoChao(montagem);
    const bruto = [ponto[0], chao + medidas.alturaMm / 2, ponto[2]];
    const { pos } = imantar(planos, medidas, olha, bruto, {
      ligado: ima,
      imaMm: Math.max(IMA_MM, IMA_PX * (apiRef.current?.mmPorPixel?.(bruto) ?? 0)),
    });
    const id = genId("pn");
    rodar({ tipo: ACOES.PAINEL_NOVO, id, telaId: telaEscolhida.id, olha, pos });
    setPainelSel(id);
  }, [telaEscolhida, montagem, planos, ima, rodar]);

  // O ARRASTE NÃO PASSA PELO HISTÓRICO. Ele mexe num estado de vista, 60 vezes
  // por segundo; o comando entra inteiro no soltar do botão (ver `soltarTela`).
  const arrastarTela = useCallback((id, pos, mmPorPixel = 0) => {
    const item = paineis.find((x) => x.painel.id === id);
    if (!item?.medidas) return;
    const preso = imantar(planos, item.medidas, item.painel.olha, pos, {
      ligado: ima,
      imaMm: Math.max(IMA_MM, IMA_PX * mmPorPixel),
    });
    arrastoRef.current = { id, pos: preso.pos, presos: preso.presos };
    setArrasto(arrastoRef.current);
  }, [paineis, planos, ima]);

  const soltarTela = useCallback((id) => {
    const a = arrastoRef.current;
    arrastoRef.current = null;
    setArrasto(null);
    if (a?.id === id) rodar({ tipo: ACOES.PAINEL, id, mudanca: { pos: a.pos } });
  }, [rodar]);

  // `R` vira PRA ONDE O LED OLHA, nas quatro da bússola. Mesmo vocabulário do
  // §8.11 — quem aprendeu a girar treliça já sabe girar tela.
  const girarTela = useCallback(() => {
    const item = paineis.find((x) => x.painel.id === painelSel);
    if (!item) return;
    const i = HORIZONTAIS.indexOf(item.painel.olha);
    rodar({
      tipo: ACOES.PAINEL,
      id: painelSel,
      mudanca: { olha: HORIZONTAIS[(i + 1 + HORIZONTAIS.length) % HORIZONTAIS.length] },
    });
  }, [paineis, painelSel, rodar]);

  /**
   * SUBIR E DESCER PELO TECLADO, e não é enfeite do arraste.
   *
   * Levantar uma parede com o mouse depende do Shift, e tecla que ninguém
   * descobre é tecla que não existe: sem as setas, quem não achou o Shift nunca
   * tira a tela do chão. Aqui a altura é EXATA — 10 cm por toque, 1 m com Shift
   * —, que é como se ajusta cota de içamento.
   */
  const subirTela = useCallback((mm) => {
    const item = paineis.find((x) => x.painel.id === painelSel);
    window.__subir = { mm, painelSel, achou: !!item, matriz: item?.matriz?.slice(12, 15), n: paineis.length };
    if (!item?.matriz) return;
    rodar({
      tipo: ACOES.PAINEL,
      id: painelSel,
      mudanca: { pos: [item.matriz[12], Math.round(item.matriz[13] + mm), item.matriz[14]] },
    });
  }, [paineis, painelSel, rodar]);

  const tirarTela = useCallback(() => {
    if (!painelSel) return;
    rodar({ tipo: ACOES.PAINEL_FORA, id: painelSel });
    setPainelSel(null);
  }, [painelSel, rodar]);

  // ── a trena (§12) ──────────────────────────────────────────
  // Cada clique é uma ponta, e o terceiro começa uma medida nova: obrigar a
  // limpar antes de medir de novo é um gesto a mais em cima do gesto principal.
  const pontaDaTrena = useCallback((ponto) => {
    const { ponto: p } = imantarPonto(notaveis, ponto);
    setPontas((atual) => (!atual || atual.b ? { a: p, b: null } : { a: atual.a, b: p }));
  }, [notaveis]);

  const desfazer = useCallback(() => {
    mexerHist(desfazerUm); setSelecao([]); setPainelSel(null);
  }, [mexerHist]);
  const refazer = useCallback(() => {
    mexerHist(refazerUm); setSelecao([]); setPainelSel(null);
  }, [mexerHist]);

  // ── atalhos de teclado (§8.6 C3 · §8.7 · §12) ──────────────
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
      // SHIFT+R, e não Ctrl+R: o Ctrl+R do navegador recarrega a página e o
      // `preventDefault` não segura em todo lugar. Recarregar no meio de uma
      // montagem leva o desfazer junto — atalho que às vezes apaga trabalho não
      // é atalho, é armadilha.
      if (e.shiftKey && e.key.toLowerCase() === "r") {
        if (selecionadas.length) tombarSelecionadas();
        else if (modo === "montar") setTilt((t) => t + 1);
        return;
      }
      if (painelSel && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault(); // seta solta rola a página, e a tela sai de vista
        subirTela((e.key === "ArrowUp" ? 1 : -1) * (e.shiftKey ? 1000 : 100));
        return;
      }
      if (e.key.toLowerCase() === "v") { setVerMomentaneo(true); return; }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault(); // Backspace solto ainda navega pra trás em alguns navegadores
        if (painelSel) tirarTela();
        else apagarSelecionadas();
        return;
      }
      if (e.key === "Escape") {
        setSelecao([]); setAlvo(null); setPainelSel(null); setPontas(null);
        return;
      }
      if (e.key.toLowerCase() === "r") {
        // com tela selecionada, o R vira PRA ONDE O LED OLHA
        if (painelSel) { girarTela(); return; }
        // sem seleção, o R gira a PEÇA NOVA — que é o giro que o técnico ajusta
        // enquanto mira o encaixe
        if (selecionadas.length) girarSelecionadas();
        else setGiro((g) => (g + 1) % 4);
      }
    };

    const onKeyUp = (e) => {
      if (e.key === "Control" || e.key === "Meta") setCtrl(false);
      if (e.key.toLowerCase() === "v") setVerMomentaneo(false);
    };
    // solta TUDO ao sair da janela: sem isto, um alt-tab com a tecla apertada
    // deixaria a aba presa num modo que o técnico não sabe como desligar
    const soltarTudo = () => { setCtrl(false); setVerMomentaneo(false); };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", soltarTudo);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", soltarTudo);
    };
  }, [
    isMobile, erro, modo, desfazer, refazer, apagarSelecionadas, girarSelecionadas,
    tombarSelecionadas, selecionadas.length, painelSel, girarTela, tirarTela, subirTela,
  ]);

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
      {/* F1 · MODO — o `V` segurado força "Ver" sem mexer na escolha do técnico */}
      <Segmented
        value={modoEfetivo}
        onChange={(v) => { setModo(v); setAlvo(null); setPainelSel(null); }}
        options={[
          { value: "montar", label: "Montar", Icon: Plus },
          { value: "telas", label: "Telas", Icon: Layers },
          { value: "medir", label: "Medir", Icon: Ruler },
          { value: "ver", label: "Ver", Icon: Hand },
        ]}
      />

      {/* F2 · FERRAMENTAS — exibição e ações à esquerda, UMA primária à direita.
          A escolha da peça (e da tela) mora na paleta, na F4. */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        {montando && (
          <button
            style={btn("ghost")}
            title={`Girar a peça nova — ${giro * 90}° (tecla R)`}
            aria-label="Girar a peça nova"
            onClick={() => setGiro((g) => (g + 1) % 4)}
          >
            <RotateCw size={15} /> {giro * 90}°
          </button>
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
        {/* O ÍMÃ (§12): a borda da tela pula pra borda do que já está lá.
            Desligado, ela para na grade de 10 cm — que é o mínimo pra medida do
            Caderno não sair com resto. */}
        {emTelas && (
          <button
            style={btn("ghost", ima ? { borderColor: T.acc, color: T.acM } : {})}
            aria-pressed={ima}
            title="Ímã: encostar a tela no que já está no desenho"
            aria-label="Ímã"
            onClick={() => setIma((v) => !v)}
          >
            <Magnet size={15} />
          </button>
        )}
        <button
          style={btn("ghost", usarCores ? { borderColor: T.acc, color: T.acM } : {})}
          aria-pressed={usarCores}
          title="Uma cor por peça, igual à paleta"
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

        {painelAtivo && (
          <>
            <button style={btn("ghost")} title="Virar o LED (tecla R)" aria-label="Virar a tela" onClick={girarTela}>
              <RotateCw size={15} /> {nomeDe(painelAtivo.painel.olha)}
            </button>
            <button style={btn("ghost", { color: T.red })} title="Tirar a tela do desenho (Delete)" aria-label="Tirar a tela" onClick={tirarTela}>
              <Trash2 size={15} />
            </button>
          </>
        )}

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

        {pontas && (
          <button style={btn("ghost")} title="Apagar a medida (Esc)" onClick={() => setPontas(null)}>
            <Ruler size={15} /> Limpar
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
        {/* A PRIMÁRIA da aba é a imagem (§8.7). "Adicionar peça" saiu: peça e
            tela nascem de clicar no piso, que é gesto, não botão. O que sobra de
            razão de existir aqui é ENTREGAR a estrutura pro Caderno. */}
        {!vazia && (
          <button
            style={btn("primary", capturando ? { opacity: 0.6, cursor: "wait" } : {})}
            disabled={capturando || !Editor}
            title="Guardar esta vista da estrutura para sair no Caderno Técnico"
            onClick={capturarParaCaderno}
          >
            <FileText size={15} /> {project?.estruturaImg ? "Atualizar imagem" : "Imagem do Caderno"}
          </button>
        )}
      </div>

      {/* F3 · CONTEXTO */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={chip}>{r.pecas} peça{r.pecas === 1 ? "" : "s"}</span>
        <span style={chip}>{r.juntas} junta{r.juntas === 1 ? "" : "s"}</span>
        <span style={chip}>
          {r.peso.kg} kg
          {pesoPendurado.paineis > 0 && <span style={{ color: T.dim }}> de treliça</span>}
          {!r.peso.conferido && r.pecas > 0 && <span style={{ color: T.amb }}> · estimado</span>}
        </span>
        {/* O NÚMERO QUE O RIGGER PEDE: quanto a treliça pesa por si e quanto
            está NO AR. Tela apoiada no chão não pendura em nada, e somar as duas
            daria um "suspenso" que ninguém vai içar. */}
        {pesoPendurado.paineis > 0 && (
          <>
            <span style={chip}>
              {pesoPendurado.kg} kg de tela
              {!pesoPendurado.completo && <span style={{ color: T.amb }}> · parcial</span>}
            </span>
            <span style={{ ...chip, borderColor: T.acc, color: T.acM }}>
              <b>{Math.round((r.peso.kg + pesoPendurado.kgSuspenso) * 10) / 10} kg</b> suspensos
              {pesoPendurado.kgNoChao > 0 && (
                <span style={{ color: T.dim }}> · {pesoPendurado.kgNoChao} kg no chão</span>
              )}
            </span>
          </>
        )}
        {r.caixa && (
          <span style={chip}>
            {metro(r.caixa.larguraMm)} × {metro(r.caixa.alturaMm)} × {metro(r.caixa.profundidadeMm)}
          </span>
        )}
        {conflitos.length > 0 && (
          <StatusPill color={T.red} label={plural(conflitos.length, "sobreposição", "sobreposições")} />
        )}
        {faceCega && (
          <span
            style={chip}
            title={`O R leva a face cega pras direções livres: ${listaDeNomes(faceCega.livres) || "nenhuma"}. As outras já têm peça aparafusada.`}
          >
            Face cega · <b style={{ color: T.txt }}>{nomeDe(faceCega.direcao)}</b>
          </span>
        )}
        {/* A MEDIDA DA TRENA, e as três projeções: quem mede vão quer a
            horizontal, quem mede içamento quer a vertical, e a reta entre dois
            pontos em diagonal não responde nem uma nem outra. */}
        {trena && (
          <span style={{ ...chip, borderColor: T.acc, color: T.acM }}>
            <Ruler size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
            <b>{metro(trena.mm)}</b>
            <span style={{ color: T.dim }}>
              {" "}· {metro(trena.horizontalMm)} no plano · {metro(trena.verticalMm)} de altura
            </span>
          </span>
        )}
        {/* O ÍMÃ PRECISA SE VER PEGANDO. Sem isto, "encostou" e "parou perto"
            são a mesma imagem na tela — e o técnico só descobre a diferença
            medindo depois. */}
        {arrasto?.presos?.some(Boolean) && (
          <span style={{ ...chip, borderColor: T.acc, color: T.acM }}>
            <Magnet size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
            Colado em <b>{["X", "altura", "Z"].filter((_, i) => arrasto.presos[i]).join(" · ")}</b>
          </span>
        )}
        {r.pecas > 0 && !r.peso.conferido && <StatusPill color={T.amb} label="Peso não conferido" />}
        {verMomentaneo && modo === "montar" && <StatusPill color={T.acM} label="Ver — solte o V para montar" />}
        {ctrl && !verMomentaneo && <StatusPill color={T.acM} label="Conta-gotas — clique numa peça" />}
        <HelpTip title="Estrutura">
          <p><b>A aba tem quatro modos</b>, e cada um com um gesto só: <b>Montar</b> a treliça, pôr as <b>Telas</b>, <b>Medir</b> distância e <b>Ver</b> sem mexer em nada.</p>
          <p><b>Para montar:</b> escolha a peça no catálogo ao lado do desenho e <b>clique no piso</b> — ela nasce ali, apoiada. Para emendar, passe o ponteiro num <b>ponto claro</b> da estrutura (ele mostra a peça em fantasma, onde ela vai ficar) e clique.</p>
          <p><b>As direções são as do piso</b> — Norte, Sul, Leste, Oeste, Cima e Baixo —, e elas não se mexem. É por elas que se descreve giro aqui.</p>
          <p><b>R</b> · no <b>cubo</b>, leva a <b>face cega</b> (a que a seta marca) pra próxima direção livre do plano do chão. Na <b>barra</b> e na <b>sapata</b>, gira no próprio eixo: a peça não sai do lugar, muda só qual face leva a escada.</p>
          <p><b>Shift+R</b> · no <b>cubo</b>, leva a face cega pra <b>cima ou pra baixo</b>. Na <b>barra solta</b>, tomba 90° — é assim que uma barra em pé vira barra deitada, e ela cai apoiada no piso.</p>
          <p><b>As telas são soltas.</b> No modo <b>Telas</b>, escolha a tela na lista ao lado do desenho e <b>clique no piso</b>: ela nasce em pé, no chão, virada pra você. Depois é só <b>arrastar</b> pra passear pelo palco, <b>R</b> pra virar o LED e <b>Delete</b> pra tirar.</p>
          <p><b>Pra levantar a tela do chão</b> tem dois jeitos: segurar <b>Shift</b> enquanto arrasta (dá pra segurar no meio do gesto) ou usar as <b>setas ↑ ↓</b> — 10 cm por toque, 1 m com Shift. As setas dão a cota exata, que é como se ajusta altura de içamento.</p>
          <p>A tela precisa existir na aba <b>Dados</b>, com <b>gabinete escolhido</b> — é de lá que saem a medida e o peso. Tela sem gabinete aparece apagada na lista.</p>
          <p><b>O ímã</b> encosta a borda da tela no que já está no desenho: em outra tela, numa peça da treliça, ou no piso. Assim duas paredes ficam emendadas de verdade, e não "quase". Desligue no botão do ímã se quiser posicionar livre — aí ela para na grade de 10 cm.</p>
          <p><b>A trena:</b> no modo <b>Medir</b>, clique em dois pontos e a distância aparece no desenho, em metro. Os cliques <b>grudam</b> nos pontos que importam — nó da treliça, quina de tela. O terceiro clique começa uma medida nova, e <b>Esc</b> apaga. A medida fica visível nos outros modos e <b>sai na imagem do Caderno</b>, se você capturar com ela na tela.</p>
          <p><b>O peso das telas aparece separado:</b> quanto a treliça pesa por si, quanto está <b>suspenso</b> e quanto está <b>apoiado no chão</b> — parede no piso não pendura em nada. Isso sai na folha do Caderno, com a lista das telas. O app continua sem dizer se aguenta.</p>
          <p><b>Isto é um preview de montagem</b>, não a montagem. O app não sabe de clamp, de sapata nem de ponto de içamento — a tela vai onde você puser, e conferir se aquilo se prende é do rigger.</p>
          <p><b>Direção que já tem peça é trava:</b> ali existe flange aparafusada, então a face cega não pode ir pra lá. Se não sobrar nenhuma direção livre, a tecla não faz nada e a aba diz o que está travando.</p>
          <p><b>Girar nunca arrasta.</b> Nenhuma rotação move outra peça: o que estava encaixado é reaparafusado na face que ficou virada pro lado certo, e continua exatamente onde estava.</p>
          <p><b>Atalhos:</b> <b>V</b> segurado vira modo Ver — dá pra clicar nas peças sem encaixar nada · <b>Ctrl</b> segurado vira conta-gotas (a peça clicada passa a ser a de inserção) · <b>Shift + clique</b> seleciona várias · <b>Delete</b> apaga · <b>Ctrl+Z</b> desfaz · <b>Esc</b> limpa.</p>
          <p>Excluir <b>não</b> apaga o que estava preso na peça — aquilo vira peça solta, no lugar onde estava.</p>
          <p><b>Peça em vermelho está sobreposta</b> a outra: duas ocupando o mesmo espaço. O app avisa e deixa seguir — no truss de verdade elas não entrariam.</p>
          <p>O peso vem do catálogo e ainda <b>não foi conferido na balança</b> — trate como ordem de grandeza. A procedência sai no Caderno.</p>
          <p><b>Imagem do Caderno:</b> guarda a vista atual da cena para sair na folha Estrutura. Ela fica <b>neste aparelho</b> (não sobe pro sync) — em outro computador, capture de novo.</p>
          <p><b>O app não diz se a estrutura aguenta.</b> Vão, carga e ponto de içamento são do rigger habilitado e do engenheiro com ART. Aqui é registro do que foi montado.</p>
        </HelpTip>
      </div>

      {/* F4 · CONTEÚDO — a paleta e o desenho, lado a lado. No modo Medir a
          paleta some: ali não se escolhe nada, e o desenho ganha a largura. */}
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {!medindo && (
          <div style={card({ padding: 10, width: 212, flexShrink: 0, display: "flex", flexDirection: "column", gap: 8 })}>
            <span style={rotuloCard}>{emTelas ? "TELAS" : "CATÁLOGO"}</span>
            <div style={{ maxHeight: "min(62vh, 620px)", overflowY: "auto" }}>
              {emTelas ? (
                <PaletaTelas
                  telas={telas}
                  escolhida={telaEscolhida?.id ?? null}
                  onEscolher={setTelaId}
                  quantidades={quantidadesDeTela}
                />
              ) : (
                <PaletaEstrutura
                  escolhida={catalogoId}
                  onEscolher={escolherPeca}
                  cores={prefs.estruturaCores}
                  usarCores={usarCores}
                  quantidades={quantidades}
                />
              )}
            </div>
          </div>
        )}

        <div style={card({ padding: 10, flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 8 })}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <span style={rotuloCard}>
              ESTRUTURA
              {painelAtivo && (
                <span style={{ marginLeft: 8, color: T.acM, fontWeight: 600, letterSpacing: 0 }}>
                  · {painelAtivo.nome}
                  {painelAtivo.medidas && (
                    <span style={{ color: T.dim, fontWeight: 400 }}>
                      {" "}{metro(painelAtivo.medidas.larguraMm)} × {metro(painelAtivo.medidas.alturaMm)}
                      {" · "}{painelAtivo.apoiado ? "no chão" : "no ar"}
                    </span>
                  )}
                </span>
              )}
              {!painelAtivo && selecionadas.length > 0 && (
                <span style={{ marginLeft: 8, color: T.acM, fontWeight: 600, letterSpacing: 0 }}>
                  · {selecionadas.length === 1
                    ? nomeDaPeca(montagem, selecionadas[0])
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
                modo={modoEfetivo}
                montagem={montagem}
                selecao={indicesSel}
                onSelecionar={selecionar}
                conflitos={indicesConflito}
                cores={paleta}
                setas={setas}
                paineis={paraDesenhar}
                onPainelSelecionar={emTelas ? setPainelSel : undefined}
                onPainelArrastar={emTelas ? arrastarTela : undefined}
                onPainelSoltar={emTelas ? soltarTela : undefined}
                onChaoTela={emTelas && telaEscolhida ? nascerTela : undefined}
                medida={medidaNaCena}
                onMedir={medindo ? pontaDaTrena : undefined}
                contaGotas={ctrl}
                onContaGotas={contaGotas}
                mostrarGrade={grade}
                conectores={montando && !ctrl ? livres : null}
                onApontarConector={montando ? setAlvo : undefined}
                onEncaixar={montando ? encaixar : undefined}
                onChao={montando && !ctrl ? nascerNoChao : undefined}
                fantasma={fantasma}
              />
            )}
            {/* A DICA DO MODO, e ela some assim que o gesto acontece: parágrafo
                explicativo fixo é o que a casa não faz (R4), mas modo novo sem
                nenhuma pista é modo que ninguém descobre. */}
            {Editor && !erroCarga && (
              (() => {
                const dica = medindo
                  ? (pontas ? null : "Clique em dois pontos para medir — eles grudam nos nós da treliça e nas quinas das telas")
                  : emTelas && !paineis.length && telas.length > 0
                    ? "Escolha a tela na lista e clique no piso — depois arraste para posicionar"
                    : emTelas && !telas.length
                      ? "Este projeto ainda não tem tela — cadastre uma na aba Dados"
                      : vazia && montando
                        ? "Escolha a peça no catálogo e clique no piso — depois clique nos pontos claros para emendar"
                        : null;
                if (!dica) return null;
                return (
                  <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", pointerEvents: "none" }}>
                    <span style={{ ...chip, background: T.card, padding: "8px 16px", whiteSpace: "normal", maxWidth: 460, textAlign: "center" }}>
                      {dica}
                    </span>
                  </div>
                );
              })()
            )}
          </div>

          {/* AS TELAS NO DESENHO. Clicar no chip seleciona — e aí R vira o LED,
              o arraste move e Delete tira. */}
          {paineis.length > 0 && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {paineis.map((item, i) => {
                const ativo = item.painel.id === painelSel;
                const ruim = paineisComProblema.has(item.painel.id);
                return (
                  <button
                    key={item.painel.id}
                    onClick={() => { setPainelSel(ativo ? null : item.painel.id); setSelecao([]); }}
                    aria-pressed={ativo}
                    title={item.tela
                      ? `${metro(item.medidas.larguraMm)} × ${metro(item.medidas.alturaMm)} · ${item.medidas.pesoKg} kg`
                      : "a tela saiu do projeto"}
                    style={{
                      ...chip, cursor: "pointer", fontFamily: "inherit",
                      borderColor: ativo ? T.acc : ruim ? T.red : T.bd,
                      color: ativo ? T.acM : ruim ? T.red : T.mut,
                      background: ativo ? T.sel : T.card2,
                    }}
                  >
                    <Layers size={12} style={{ verticalAlign: -2, marginRight: 4 }} />
                    {nomeDaTela(item, i)}
                    {item.tela && (
                      <span style={{ color: T.dim }}>
                        {" "}· {nomeDe(item.painel.olha)}{item.apoiado ? "" : " · no ar"}
                      </span>
                    )}
                  </button>
                );
              })}
              {painelSel && (
                <span style={{ fontSize: 11, color: T.dim }}>
                  arraste move · Shift+arraste ou ↑↓ sobe · R vira o LED · Delete tira
                </span>
              )}
            </div>
          )}

          {problemas.length > 0 && (
            <div style={{ fontSize: 12, color: T.red, lineHeight: 1.5 }}>
              <b>Tela fora de lugar</b>:{" "}
              {[...new Set(problemas.map((x) => TEXTO_DO_PROBLEMA[x.motivo]))].join(" · ")}.
              <span style={{ color: T.dim }}> É medida, não carga — o app continua sem dizer se a estrutura aguenta.</span>
            </div>
          )}

          {conflitos.length > 0 && (
            <div style={{ fontSize: 12, color: T.red, lineHeight: 1.5 }}>
              <b>Peça dentro de peça</b> (em vermelho na cena):{" "}
              {conflitos.slice(0, 3).map((c) => `${nomeDaPeca(montagem, c.a)} × ${nomeDaPeca(montagem, c.b)}`).join(" · ")}
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

          {r.pecas > 0 && (
            <span style={{ ...chip, alignSelf: "flex-start" }}>
              <b style={{ color: T.txt }}>{r.parafusaria.itens.find((i) => i.id === "parafuso")?.qtd ?? 0}×</b> parafuso 5/8&quot;
            </span>
          )}
        </div>
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
