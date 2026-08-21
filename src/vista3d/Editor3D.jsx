// vista3d/Editor3D.jsx — a ponte entre o React e a cena.
//
// UMA fronteira, e explícita: o React monta o <canvas> e manda comandos; tudo
// que se move 60 vezes por segundo (câmera, matrizes, seleção) fica do lado de
// lá, imperativo. É o motivo de não usarmos react-three-fiber (espeque §4.1).
//
// O GESTO DEPENDE DO MODO (§11.5), e é o que impede uma tecla de fazer duas coisas:
//   · montar — o clique encaixa peça, o Ctrl é conta-gotas;
//   · telas  — o clique põe/pega a tela e o arraste move ela;
//   · medir  — cada clique é uma ponta da trena;
//   · ver    — o clique só seleciona.
//
// Este arquivo e tudo que ele importa moram no chunk `vista3d` — lazy pro
// roteador e FORA do precache do service worker (§7.2).

import { useEffect, useImperativeHandle, useRef } from "react";
import { T } from "../ui/tokens.js";
import { criarCena } from "./cena.js";

const coresDoTema = (porPeca = null) => ({
  fundo: T.bg,
  grade: T.bd,
  gradeEixo: T.bdA,
  peca: T.mut,
  selecao: T.acc,
  // a tinta que se escreve SOBRE o lime (manual §2.1: sempre preta). É a cor dos
  // pontos de ímã da tela que está sendo movida — ela é a selecionada, logo lime.
  tinta: T.accInk,
  conflito: T.red,
  porPeca,
});

const PONTEIRO = {
  medir: "crosshair",
  telas: "grab",
};

export default function Editor3D({
  montagem,
  modo = "montar", // "montar" | "telas" | "medir" | "ver"
  selecao = null, // índices das peças selecionadas (§8.6, C2)
  onSelecionar, // (indice|null, { shift }) — shift acumula
  conflitos = null, // índices das peças montadas uma dentro da outra
  cores = null, // `catalogoId → hex`; null = tudo na cor do tema
  mostrarGrade = true,
  // ── modo Montar ──
  conectores = null, // conectores livres, no mundo (null/[] = não mostrar)
  onApontarConector, // (indice|null) — o pai devolve a matriz da prévia
  onEncaixar, // (indice) — comita a peça
  fantasma = null, // { catalogoId, matriz } da prévia
  setas = null, // matrizes de mundo das setas de face cega (§8.6, C1)
  // ── modo Telas (§11.5) ──
  paineis = null, // as telas no desenho, com a matriz de mundo já resolvida
  onPainelSelecionar, // (id|null)
  onPainelArrastar, // (id, [x,y,z], mmPorPixel, eixosLivres) — 60×/s, fora do histórico
  onPainelSoltar, // (id) — o arraste virou UM comando só
  onChaoTela, // ([x,y,z]) — clique no piso vazio: a tela escolhida nasce ali
  pontosIma = null, // { meus, alvos, ancora } — os nove pontos de encaixe (§11.5)
  // ── modo Medir (§11.5) ──
  medida = null, // { a, b, texto } da trena, ou null
  onMedir, // ([x,y,z]) — mais uma ponta
  // ── conta-gotas (Ctrl segurado) ──
  contaGotas = false, // o Ctrl está segurado AGORA?
  onContaGotas, // (indice) — a peça clicada vira a peça de inserção
  onChao, // ([x,y,z]) — clique no piso vazio: é ali que a peça nova nasce
  api,
}) {
  const canvasRef = useRef(null);
  const cenaRef = useRef(null);
  // as cores no MOMENTO da criação da cena; depois disso quem manda é o efeito
  const coresRef = useRef(cores);
  useEffect(() => { coresRef.current = cores; });
  // Callbacks e modo por REF: a cena é montada uma vez só, e o pai re-renderiza
  // a cada peça adicionada. Sem isto, remontaríamos a cena inteira a cada clique.
  const cb = useRef({});
  useEffect(() => {
    cb.current = {
      onSelecionar, onApontarConector, onEncaixar, onContaGotas, onChao,
      onPainelSelecionar, onPainelArrastar, onPainelSoltar, onChaoTela, onMedir,
      modo, paineis,
    };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const cena = criarCena(canvas, coresDoTema(coresRef.current));
    cenaRef.current = cena;

    const ro = new ResizeObserver(() => cena.redimensionar());
    ro.observe(canvas.parentElement ?? canvas);

    // distingue CLIQUE de ÓRBITA: sem esse limiar, toda vez que o usuário gira a
    // câmera ele seleciona uma peça sem querer
    let x0 = 0;
    let y0 = 0;
    let arrastou = false;
    let ultimoConector = null;
    // o arraste de tela em curso: `null` quando ninguém está segurando nada
    let pegada = null;

    const centroDoPainel = (id) => {
      const p = (cb.current.paineis ?? []).find((x) => x.id === id);
      return p?.matriz ? [p.matriz[12], p.matriz[13], p.matriz[14]] : null;
    };

    /**
     * A TRAVA DO ARRASTE, e a regra é uma frase: **cada modificador deixa UM
     * eixo livre**.
     *
     *   · sem tecla — a tela anda no chão (dois eixos livres);
     *   · `Shift`   — só a ALTURA se move. X e Z ficam exatamente onde estavam;
     *   · `Ctrl`    — só o COMPRIMENTO DA PAREDE se move: ela desliza pro lado
     *                 sem subir e sem avançar. É a trava de quem está emendando
     *                 tela com tela.
     *
     * ⚠️ TRAVA DE VERDADE, não só "plano de arraste". O plano vertical de antes
     * ainda deixava a tela escorregar de lado enquanto se tentava levantá-la — e
     * quem segura Shift quer levantar, não passear.
     *
     * ⚠️ REANCORA NA POSIÇÃO ATUAL, e é o que permite trocar de trava NO MEIO do
     * gesto: segurar o Shift depois de já ter pegado a tela muda pra altura sem
     * que ela pule de lugar, e soltar volta pro chão preservando o que subiu.
     */
    const travaDe = (e, ladoK) => {
      if (e.shiftKey) return { modo: "altura", eixos: [false, true, false] };
      // livre só no eixo do comprimento da própria tela (a coluna `lado`)
      if (e.ctrlKey || e.metaKey) {
        return { modo: "comprimento", eixos: [0, 1, 2].map((k) => k === ladoK) };
      }
      return { modo: "chao", eixos: [true, false, true] };
    };

    const escolherPlano = (e) => {
      if (!pegada) return;
      const t = travaDe(e, pegada.ladoK);
      if (pegada.modo === t.modo) return;
      pegada.modo = t.modo;
      pegada.eixos = t.eixos;
      pegada.centro = pegada.atual;
      pegada.normal = t.modo === "altura" ? cena.olharDaCamera() : [0, 1, 0];
      const agarrado = cena.pontoNoPlano(e, pegada.centro, pegada.normal);
      // a DIFERENÇA entre onde pegou e o centro: sem ela a tela pula pro
      // ponteiro no primeiro pixel de arraste, e some de onde estava
      pegada.off = agarrado
        ? [0, 1, 2].map((k) => pegada.centro[k] - agarrado[k])
        : [0, 0, 0];
    };

    const onDown = (e) => {
      x0 = e.clientX; y0 = e.clientY; arrastou = false;
      if (cb.current.modo !== "telas") return;
      const id = cena.painelEm(e);
      if (!id) return;
      const centro = centroDoPainel(id);
      if (!centro) return;
      // O PLANO DO ARRASTE SE ESCOLHE AQUI. Sem Shift, a tela passeia pelo palco
      // (plano horizontal); com Shift, sobe e desce num plano de frente pra
      // câmera. São os dois movimentos que existem numa parede de LED, e separar
      // por tecla evita a tela subir sozinha quando a pessoa quis só andar.
      // o eixo do COMPRIMENTO da tela sai da matriz dela (a coluna `lado`): é o
      // que a trava do Ctrl deixa livre, e ele muda quando o LED gira
      const m = (cb.current.paineis ?? []).find((x) => x.id === id)?.matriz;
      const ladoK = m && Math.abs(m[0]) < Math.abs(m[2]) ? 2 : 0;
      pegada = { id, centro, atual: centro, ladoK, modo: null, eixos: null, normal: null, off: null, moveu: false };
      escolherPlano(e);
      cena.travarOrbita(true);
      cb.current.onPainelSelecionar?.(id);
    };

    const onMove = (e) => {
      if (Math.abs(e.clientX - x0) > 5 || Math.abs(e.clientY - y0) > 5) arrastou = true;
      if (pegada) {
        escolherPlano(e); // dá pra trocar de trava no meio do gesto
        const p = cena.pontoNoPlano(e, pegada.centro, pegada.normal);
        if (!p) return;
        pegada.moveu = true;
        // EIXO TRAVADO SEGURA O VALOR ATUAL, não o de quando pegou: trocar de
        // trava no meio do gesto preserva o que já foi feito na trava anterior.
        pegada.atual = [0, 1, 2].map((k) =>
          (pegada.eixos[k] ? p[k] + pegada.off[k] : pegada.atual[k]));
        // o `mmPorPixel` viaja junto: é o que deixa o ímã do mesmo tamanho na
        // mão em qualquer zoom, e converter tela em mundo é conta da vista
        cb.current.onPainelArrastar?.(
          pegada.id, pegada.atual, cena.mmPorPixel(pegada.centro), pegada.eixos,
        );
        return;
      }
      if (cb.current.modo !== "montar") return;
      // com o Ctrl segurado o clique é conta-gotas, não encaixe: realçar
      // conector e desenhar fantasma ali seria prometer uma peça que não vem
      if (e.ctrlKey || e.metaKey) { onSai(); return; }
      if (!cb.current.onApontarConector) return;
      const idx = cena.conectorEm(e);
      if (idx === ultimoConector) return; // só avisa o React quando MUDA
      ultimoConector = idx;
      cena.realcarConector(idx);
      cb.current.onApontarConector(idx);
    };

    const onUp = (e) => {
      // O ARRASTE INTEIRO É UM COMANDO SÓ, comitado aqui: sessenta passos de
      // desfazer por gesto é o app cobrando pelo gesto que ele mesmo ofereceu.
      if (pegada) {
        const { id, moveu } = pegada;
        pegada = null;
        cena.travarOrbita(false);
        if (moveu) cb.current.onPainelSoltar?.(id);
        return;
      }
      if (arrastou) return;

      if (cb.current.modo === "medir") {
        const p = cena.pontoDeCena(e);
        if (p) cb.current.onMedir?.(p);
        return;
      }

      if (cb.current.modo === "telas") {
        // clicou no piso vazio: a tela escolhida nasce ali. Clicou no nada
        // (céu), larga a seleção — mesmo gesto de sair de tudo do modo Montar.
        const ponto = cena.pontoNoChao(e);
        if (ponto && cb.current.onChaoTela) cb.current.onChaoTela(ponto);
        else cb.current.onPainelSelecionar?.(null);
        return;
      }

      // CONTA-GOTAS (§8.6, C3): com o Ctrl segurado, a peça clicada vira a peça
      // de inserção. Vem ANTES do conector de propósito — segurando Ctrl o
      // técnico está escolhendo peça, não montando.
      if (e.ctrlKey || e.metaKey) {
        cb.current.onContaGotas?.(cena.pecaEm(e));
        return;
      }
      // fora disso o conector tem PRIORIDADE sobre a peça: em modo montar, o
      // alvo do clique é onde a peça vai entrar, não a peça atrás dele
      const conector = cb.current.onEncaixar ? cena.conectorEm(e) : null;
      if (conector != null) {
        cb.current.onEncaixar(conector);
        return;
      }
      const peca = cena.pecaEm(e);
      // CLIQUE NO PISO VAZIO = PEÇA NOVA ALI (§8.7). Sem isto, toda peça solta
      // nascia na origem, uma em cima da outra — e o aviso de sobreposição
      // acusava um problema que o próprio app tinha criado.
      if (peca == null && cb.current.onChao) {
        const ponto = cena.pontoNoChao(e);
        if (ponto) { cb.current.onChao(ponto); return; }
      }
      cb.current.onSelecionar?.(peca, { shift: e.shiftKey });
    };

    const onSai = () => {
      if (ultimoConector == null) return;
      ultimoConector = null;
      cena.realcarConector(null);
      cb.current.onApontarConector?.(null);
    };

    // largar o botão FORA do canvas não pode deixar a tela grudada no ponteiro
    const onSaiuComTela = (e) => {
      if (pegada) onUp(e);
      onSai();
    };

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onSaiuComTela);

    // o contexto WebGL morre quando o SO precisa de memória. Como a cena é
    // PROCEDURAL, ela se reconstrói inteira do JSON — sem baixar nada.
    const onPerdeu = (e) => e.preventDefault();
    canvas.addEventListener("webglcontextlost", onPerdeu);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onSaiuComTela);
      canvas.removeEventListener("webglcontextlost", onPerdeu);
      cena.destruir();
      cenaRef.current = null;
    };
  }, []);

  useEffect(() => { cenaRef.current?.sincronizar(montagem); }, [montagem]);
  useEffect(() => { cenaRef.current?.selecionar(selecao ?? null); }, [selecao]);
  useEffect(() => { cenaRef.current?.marcarConflitos(conflitos ?? []); }, [conflitos]);
  useEffect(() => { cenaRef.current?.mostrarSetas(setas ?? []); }, [setas]);
  useEffect(() => { cenaRef.current?.mostrarPaineis(paineis ?? []); }, [paineis]);
  useEffect(() => { cenaRef.current?.mostrarMedida(medida ?? null); }, [medida]);
  useEffect(() => { cenaRef.current?.mostrarPontosDeIma(pontosIma ?? null); }, [pontosIma]);
  useEffect(() => { cenaRef.current?.definirCores(cores ?? null); }, [cores]);
  useEffect(() => { cenaRef.current?.mostrarGrade(mostrarGrade); }, [mostrarGrade]);
  useEffect(() => { cenaRef.current?.mostrarConectores(conectores ?? []); }, [conectores]);
  useEffect(() => {
    if (fantasma?.matriz) cenaRef.current?.mostrarFantasma(fantasma.catalogoId, fantasma.matriz);
    else cenaRef.current?.limparFantasma();
  }, [fantasma]);

  useImperativeHandle(api, () => ({
    enquadrar: () => cenaRef.current?.enquadrar(montagem),
    aproximar: (f) => cenaRef.current?.aproximar(f),
    capturar: (o) => cenaRef.current?.capturar(o),
    mmPorPixel: (p) => cenaRef.current?.mmPorPixel(p) ?? 0,
    // pra onde a câmera olha, no plano do chão: é assim que a tela nova nasce
    // virada pra quem está vendo, em vez de nascer de costas
    olhar: () => cenaRef.current?.olharDaCamera() ?? [0, 0, 1],
  }), [montagem]);

  return (
    <canvas
      ref={canvasRef}
      // O PONTEIRO AVISA QUE O MODO MUDOU: sem isso o conta-gotas e a trena são
      // invisíveis, e modo invisível é modo que pega o técnico de surpresa.
      // sem `touchAction: none` o navegador rouba o gesto pra rolar a página
      style={{
        width: "100%", height: "100%", display: "block", touchAction: "none", borderRadius: 12,
        cursor: contaGotas ? "copy" : PONTEIRO[modo] ?? "default",
      }}
    />
  );
}
