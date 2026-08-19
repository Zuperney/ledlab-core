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

const coresDoTema = () => ({
  fundo: T.bg,
  grade: T.bd,
  gradeEixo: T.bdA,
  peca: T.mut,
  selecao: T.acc,
});

export default function Editor3D({
  montagem,
  selecionada,
  onSelecionar,
  mostrarGrade = true,
  // ── modo Montar ──
  conectores = null, // conectores livres, no mundo (null/[] = não mostrar)
  onApontarConector, // (indice|null) — o pai devolve a matriz da prévia
  onEncaixar, // (indice) — comita a peça
  fantasma = null, // { catalogoId, matriz } da prévia
  api,
}) {
  const canvasRef = useRef(null);
  const cenaRef = useRef(null);
  // Callbacks por REF: a cena é montada uma vez só, e o pai re-renderiza a cada
  // peça adicionada. Sem isto, remontaríamos a cena inteira a cada clique.
  const cb = useRef({});
  useEffect(() => {
    cb.current = { onSelecionar, onApontarConector, onEncaixar };
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const cena = criarCena(canvas, coresDoTema());
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
      if (!cb.current.onApontarConector) return;
      const idx = cena.conectorEm(e);
      if (idx === ultimoConector) return; // só avisa o React quando MUDA
      ultimoConector = idx;
      cena.realcarConector(idx);
      cb.current.onApontarConector(idx);
    };

    const onUp = (e) => {
      if (arrastou) return;
      // o conector tem PRIORIDADE sobre a peça: em modo montar, o alvo do clique
      // é onde a peça vai entrar, não a peça que está atrás dele
      const conector = cb.current.onEncaixar ? cena.conectorEm(e) : null;
      if (conector != null) {
        cb.current.onEncaixar(conector);
        return;
      }
      cb.current.onSelecionar?.(cena.pecaEm(e));
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
  useEffect(() => { cenaRef.current?.selecionar(selecionada ?? null); }, [selecionada]);
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
      // sem isto o navegador rouba o gesto pra rolar a página
      style={{ width: "100%", height: "100%", display: "block", touchAction: "none", borderRadius: 12 }}
    />
  );
}
