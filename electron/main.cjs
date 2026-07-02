// electron/main.cjs
// ─────────────────────────────────────────────────────────────
// Processo principal do Electron — transforma o LedLab Core (app React/Vite)
// num aplicativo Windows autônomo, com janela própria (não abre no navegador).
//
// Persistência: o renderer continua usando localStorage; o Electron grava em
//   %APPDATA%\LedLab Core\  → os dados sobrevivem a fechar/reabrir e a updates.
// CommonJS (.cjs) de propósito: o package.json é "type":"module".
// ─────────────────────────────────────────────────────────────
const { app, BrowserWindow, Menu, shell } = require("electron");
const path = require("path");

// Em dev (não empacotado) carrega o servidor Vite; empacotado, o build local.
const isDev = !app.isPackaged;
const DEV_URL = process.env.VITE_DEV_SERVER_URL || "http://localhost:5173";

// Garante instância única — abrir o app de novo foca a janela existente.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  let mainWindow = null;

  function createWindow() {
    mainWindow = new BrowserWindow({
      width: 1440,
      height: 900,
      minWidth: 1024,
      minHeight: 640,
      backgroundColor: "#0d0d1a", // = T.bg, evita flash branco antes do React montar
      title: "LedLab Core",
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        spellcheck: false,
      },
    });

    // App autônomo: sem barra de menu nativa.
    Menu.setApplicationMenu(null);

    if (isDev) {
      mainWindow.loadURL(DEV_URL);
    } else {
      mainWindow.loadFile(path.join(__dirname, "..", "dist", "index.html"));
    }

    mainWindow.once("ready-to-show", () => mainWindow.show());

    // Links http(s) abrem no navegador padrão, nunca dentro da janela do app.
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
      if (/^https?:\/\//.test(url)) {
        shell.openExternal(url);
        return { action: "deny" };
      }
      return { action: "allow" };
    });
  }

  app.on("second-instance", () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
