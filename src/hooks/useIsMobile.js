// hooks/useIsMobile.js — true quando a largura da janela está no range mobile.
// Reavalia no resize (útil no navegador; no Electron a janela pode variar).
import { useState, useEffect } from "react";
import { BREAKPOINTS } from "../config/uiConfig.js";

export function useIsMobile(bp = BREAKPOINTS.mobile) {
  const get = () => (typeof window !== "undefined" ? window.innerWidth <= bp : false);
  const [mobile, setMobile] = useState(get);
  useEffect(() => {
    const onResize = () => setMobile(get());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [bp]);
  return mobile;
}
