// vista3d/Editor3D.jsx — a ponte entre o React e a cena.
//
// UMA fronteira, e explícita: o React monta o <canvas> e manda comandos; tudo
// que se move 60 vezes por segundo (câmera, matrizes, seleção) fica do lado de
// lá, imperativo. É o motivo de não usarmos react-three-fiber (espeque §4.1).
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
  conflito: T.red,
  porPeca,
});

export default function Editor3D({
  montagem,
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
  paineis = null, // as telas penduradas (E4)
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
  // Callbacks por REF: a cena é montada uma vez só, e o pai re-renderiza a cada
  // peça adicionada. Sem isto, remontaríamos a cena inteira a cada clique.
  const cb = useRef({});
  useEffect(() => {
    cb.current = { onSelecionar, onApontarConector, onEncaixar, onContaGotas, onChao };
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

    const onDown = (e) => { x0 = e.clientX; y0 = e.clientY; arrastou = false; };

    const onMove = (e) => {
      if (Math.abs(e.clientX - x0) > 5 || Math.abs(e.clientY - y0) > 5) arrastou = true;
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
      if (arrastou) return;
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

    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointerleave", onSai);

    // o contexto WebGL morre quando o SO precisa de memória. Como a cena é
    // PROCEDURAL, ela se reconstrói inteira do JSON — sem baixar nada.
    const onPerdeu = (e) => e.preventDefault();
    canvas.addEventListener("webglcontextlost", onPerdeu);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointerleave", onSai);
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
  }), [montagem]);

  return (
    <canvas
      ref={canvasRef}
      // O ponteiro AVISA que o modo mudou: sem isso o conta-gotas é invisível, e
      // modo invisível é modo que pega o técnico de surpresa.
      // sem `touchAction: none` o navegador rouba o gesto pra rolar a página
      style={{
        width: "100%", height: "100%", display: "block", touchAction: "none", borderRadius: 12,
        cursor: contaGotas ? "copy" : "default",
      }}
    />
  );
}
