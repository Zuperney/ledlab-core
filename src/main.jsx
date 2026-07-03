// main.jsx — ponto de entrada do renderer.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppProvider } from "./store/AppContext.jsx";
import { UIProvider } from "./store/UIContext.jsx";
import App from "./App.jsx";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AppProvider>
      <UIProvider>
        <App />
      </UIProvider>
    </AppProvider>
  </StrictMode>
);

// PWA: registra o service worker só no build de produção (evita cache no dev).
// "sw.js" é relativo ao documento → funciona na raiz e em subcaminho (GitHub Pages).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
