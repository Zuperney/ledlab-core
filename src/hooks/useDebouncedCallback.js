// hooks/useDebouncedCallback.js — adia a execução de fn até parar de chamar por `delay` ms.
// Usado em sliders (brilho/conteúdo, tamanho do número) p/ não re-renderizar/persistir
// a cada pixel arrastado.
import { useRef, useEffect, useCallback } from "react";

export function useDebouncedCallback(fn, delay = 200) {
  const timer = useRef(null);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fnRef.current(...args), delay);
  }, [delay]);
}
