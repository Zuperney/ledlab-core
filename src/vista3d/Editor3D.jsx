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

export default function Editor3D({ montagem, selecionada, onSelecionar, mostrarGrade = true, api }) {
  const canvasRef = useRef(null);
  const cenaRef = useRef(null);
  const arrastouRef = useRef(false);

  // monta a cena UMA vez. Trocar a montagem não remonta nada — só sincroniza.
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
    const onDown = (e) => { x0 = e.clientX; y0 = e.clientY; arrastouRef.current = false; };
    const onMove = (e) => {
      if (Math.abs(e.clientX - x0) > 5 || Math.abs(e.clientY - y0) > 5) arrastouRef.current = true;
    };
    const onUp = (e) => {
      if (arrastouRef.current) return;
      onSelecionar?.(cena.pecaEm(e));
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);

    // o contexto WebGL morre quando o SO precisa de memória. Como a cena é
    // PROCEDURAL, ela se reconstrói inteira do JSON — sem baixar nada.
    const onPerdeu = (e) => e.preventDefault();
    canvas.addEventListener("webglcontextlost", onPerdeu);

    return () => {
      ro.disconnect();
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("webglcontextlost", onPerdeu);
      cena.destruir();
      cenaRef.current = null;
    };
    // onSelecionar entra por ref via closure estável do pai — remontar a cena a
    // cada render seria caríssimo
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { cenaRef.current?.sincronizar(montagem); }, [montagem]);
  useEffect(() => { cenaRef.current?.selecionar(selecionada ?? null); }, [selecionada]);
  useEffect(() => { cenaRef.current?.mostrarGrade(mostrarGrade); }, [mostrarGrade]);

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
