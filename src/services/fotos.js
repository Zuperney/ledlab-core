// services/fotos.js — fotos de comprovante (reembolso). Ficam LOCAIS no IndexedDB
// como Blob, NUNCA no localStorage (cota pequena) nem no sync/Supabase (inflaria a
// cota de 2 GB conforme cresce o nº de fotos/pessoas). A despesa guarda só o fotoId;
// o Blob vive sob a chave "ledlab.foto.<id>".
import { idbGet, idbSet, idbDel } from "./idb.js";

const FOTO_PREFIX = "ledlab.foto.";

// Comprime uma imagem (File/Blob) para ~maxPx no maior lado, JPEG qualidade q.
// Foto de celular crua tem 3–5 MB; isso derruba para ~100–300 KB, viável no IndexedDB.
export function compressImage(file, maxPx = 1200, q = 0.7) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const w = Math.max(1, Math.round(img.width * scale));
      const h = Math.max(1, Math.round(img.height * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("toBlob falhou"))), "image/jpeg", q);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("imagem inválida")); };
    img.src = url;
  });
}

export const saveFoto = (id, blob) => idbSet(FOTO_PREFIX + id, blob);
export const getFoto = (id) => idbGet(FOTO_PREFIX + id);
export const delFoto = (id) => idbDel(FOTO_PREFIX + id);
