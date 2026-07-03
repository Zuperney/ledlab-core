// sw.js — service worker do LedLab Core (PWA offline).
// Estratégia: stale-while-revalidate para GETs do mesmo domínio (o app é 100%
// client-side, então cachear o shell + assets basta para rodar offline). Fallback
// de navegação para o app shell quando offline.
const CACHE = "ledlab-core-v1";

self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return; // só mesmo domínio

  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req);
    const network = fetch(req)
      .then((res) => { if (res && res.ok && res.type === "basic") cache.put(req, res.clone()); return res; })
      .catch(() => null);

    if (cached) { e.waitUntil(network); return cached; } // serve do cache, atualiza em 2º plano
    const res = await network;
    if (res) return res;
    if (req.mode === "navigate") { // offline: cai no shell do app
      const shell = (await cache.match("./")) || (await cache.match("index.html"));
      if (shell) return shell;
    }
    return new Response("", { status: 504, statusText: "Offline" });
  })());
});
