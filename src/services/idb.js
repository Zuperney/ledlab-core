// services/idb.js — armazenamento key-value sobre IndexedDB, sem dependência.
// Guarda cada "fatia" do app (cabs, projects, prefs, …) sob sua chave — como o
// localStorage, mas com muito mais cota e base pra fotos (reembolso) e sync.
// Se o IndexedDB estiver indisponível (modo privado, bloqueado), as funções
// degradam para no-op/undefined e o app segue no localStorage (o espelho).

const DB_NAME = "ledlab";
const STORE = "kv";

let dbPromise = null;

function openDB() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") { reject(new Error("no indexedDB")); return; }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error("open error"));
  });
  return dbPromise;
}

function withStore(mode, fn) {
  return openDB().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const req = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(req ? req.result : undefined);
        t.onerror = () => reject(t.error || new Error("tx error"));
        t.onabort = () => reject(t.error || new Error("tx abort"));
      }),
  );
}

// Lê a fatia; undefined se ausente ou indisponível.
export function idbGet(key) {
  return withStore("readonly", (s) => s.get(key)).catch(() => undefined);
}

// Grava a fatia (structured clone do IndexedDB — valores JSON-serializáveis).
export function idbSet(key, value) {
  return withStore("readwrite", (s) => s.put(value, key)).catch(() => {});
}
