// main.jsx — ponto de entrada do renderer.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Router } from "wouter";
import { useHashLocation } from "wouter/use-hash-location";
import { AuthProvider } from "./store/AuthContext.jsx";
import { AppProvider } from "./store/AppContext.jsx";
import { UIProvider } from "./store/UIContext.jsx";
import App from "./App.jsx";
import { requestPersist } from "./services/storage.js";
import "react-datepicker/dist/react-datepicker.css";
import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <AuthProvider>
      <AppProvider>
        <UIProvider>
          <Router hook={useHashLocation}>
            <App />
          </Router>
        </UIProvider>
      </AppProvider>
    </AuthProvider>
  </StrictMode>
);

// PWA: registra o service worker só no build de produção (evita cache no dev).
// "sw.js" é relativo ao documento → funciona na raiz e em subcaminho (GitHub Pages).
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

// Auto-recuperação de "chunk órfão": se um deploy novo purgou um chunk lazy
// (ex.: o date-picker) enquanto o app estava aberto, o import() falha com 404
// ("Failed to fetch dynamically imported module"). Recarrega UMA vez pra pegar o
// index.html fresco (com os novos nomes de chunk). Guarda de 10s evita loop.
window.addEventListener("vite:preloadError", (event) => {
  const KEY = "ll-chunk-reload-at";
  const last = Number(sessionStorage.getItem(KEY) || 0);
  if (Date.now() - last > 10000) {
    event.preventDefault();
    sessionStorage.setItem(KEY, String(Date.now()));
    location.reload();
  }
});

// Durabilidade: pede ao navegador armazenamento persistente (não descartar os
// dados sob pressão de espaço/inatividade). Silencioso — em PWA instalado
// costuma ser concedido na hora.
requestPersist();
