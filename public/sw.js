// sw.js — service worker do LedLab Core (PWA offline).
// Estratégia:
// - Precache do app shell (HTML + CSS/JS principais descobertos via index.html)
// - Runtime cache stale-while-revalidate para requests GET do mesmo domínio
// - Network-first para navegação com fallback explícito para index.html do precache
const CACHE_PREFIX = "ledlab-core";
// Carimbado no build (vite.config.js → plugin stamp-sw) com "versão-timestamp",
// único por deploy. Assim o SW se reinstala a cada deploy, refaz o precache com
// os assets novos e apaga os antigos — evitando servir um index.html velho cujos
// chunks lazy já foram purgados do servidor. Em dev fica literal (SW não roda).
const CACHE_VERSION = "__BUILD_ID__";
const PRECACHE = `${CACHE_PREFIX}-precache-${CACHE_VERSION}`;
const RUNTIME = `${CACHE_PREFIX}-runtime-${CACHE_VERSION}`;
const APP_SHELL = ["./", "./index.html"];
// Assets do build (main + chunks lazy: date-picker, supabase). Injetado pelo
// vite.config (stamp-sw) no build; fica [] em dev (o SW não roda em dev).
// Precachear tudo = offline TOTAL após a 1ª carga, não só o app shell — assim
// abrir uma tela com date-picker offline (sem ter visitado antes) não quebra.
const BUILD_ASSETS = [];

function toAbsoluteUrl(path) {
  return new URL(path, self.registration.scope).toString();
}

async function getPrecacheUrls() {
  const urls = new Set([...APP_SHELL, ...BUILD_ASSETS].map(toAbsoluteUrl));

  try {
    const indexResponse = await fetch(toAbsoluteUrl("./index.html"), { cache: "no-cache" });
    if (indexResponse.ok) {
      const html = await indexResponse.text();
      const assetRegex = /\b(?:src|href)=["']([^"']+\.(?:css|js))["']/gi;
      let match = assetRegex.exec(html);
      while (match) {
        urls.add(toAbsoluteUrl(match[1]));
        match = assetRegex.exec(html);
      }
    }
  } catch {
    // Se não conseguir ler o index durante install, mantém apenas o shell mínimo.
  }

  return [...urls];
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(PRECACHE);
    const precacheUrls = await getPrecacheUrls();
    // add individual + allSettled: um asset que falhe (404/rede) não derruba o
    // precache inteiro — cache.addAll é atômico e quebraria o offline todo.
    await Promise.allSettled(precacheUrls.map((u) => cache.add(u)));
    // NÃO faz skipWaiting: o SW novo ESPERA; o app avisa "nova versão" e o usuário
    // decide quando atualizar (clique → postMessage SKIP_WAITING abaixo).
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const validCaches = new Set([PRECACHE, RUNTIME]);
    const keys = await caches.keys();
    await Promise.all(
      keys
        .filter((key) => key.startsWith(CACHE_PREFIX) && !validCaches.has(key))
        .map((key) => caches.delete(key)),
    );
    await self.clients.claim();
  })());
});

// o app manda isso quando o usuário clica "Atualizar"
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

async function networkFirstNavigate(request) {
  try {
    const response = await fetch(request);
    if (response && response.ok && response.type === "basic") {
      const runtimeCache = await caches.open(RUNTIME);
      runtimeCache.put(request, response.clone());
    }
    return response;
  } catch {
    const fallback = await caches.match(toAbsoluteUrl("./index.html"));
    if (fallback) return fallback;
    return new Response("", { status: 504, statusText: "Offline" });
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      if (response && response.ok && response.type === "basic") {
        const runtimeCache = await caches.open(RUNTIME);
        await runtimeCache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;
  const network = await networkPromise;
  if (network) return network;
  return new Response("", { status: 504, statusText: "Offline" });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return; // só mesmo domínio

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigate(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});
