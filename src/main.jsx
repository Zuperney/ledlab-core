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
