// services/swUpdate.js — atualização do PWA COM AVISO (o usuário decide quando).
// O service worker novo ESPERA (não troca sozinho). Quando há um SW esperando,
// avisamos o app; ao clicar "Atualizar", mandamos SKIP_WAITING e recarregamos.

let waiting = null; // ServiceWorker esperando (atualização pronta)
const subs = new Set();
function emit() { subs.forEach((cb) => { try { cb(!!waiting); } catch { /* ok */ } }); }

// avisa quando há atualização pronta; chama já com o estado atual. Retorna unsubscribe.
export function onUpdateAvailable(cb) {
  subs.add(cb);
  cb(!!waiting);
  return () => subs.delete(cb);
}

// aplica a atualização: troca o SW; o controllerchange dispara o reload.
export function applyUpdate() {
  if (waiting) waiting.postMessage({ type: "SKIP_WAITING" });
  else location.reload();
}

export function registerSW() {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").then((reg) => {
      // já havia um SW esperando (baixado numa visita anterior)?
      if (reg.waiting && navigator.serviceWorker.controller) { waiting = reg.waiting; emit(); }
      reg.addEventListener("updatefound", () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener("statechange", () => {
          // "installed" + já existe um controller = é uma ATUALIZAÇÃO (não 1ª instalação)
          if (nw.state === "installed" && navigator.serviceWorker.controller) { waiting = nw; emit(); }
        });
      });
    }).catch(() => { /* offline / sem SW — ignora */ });

    // quando o novo SW assume o controle, recarrega UMA vez pra pegar a versão nova
    let reloaded = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (reloaded) return;
      reloaded = true;
      location.reload();
    });
  });
}
