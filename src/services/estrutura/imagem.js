// services/estrutura/imagem.js — a vista 3D capturada que sai no Caderno.
//
// POR QUE ELA NÃO MORA DENTRO DO PROJETO:
// o render sai com ~300 KB, e a fatia `projects` do sync sobe INTEIRA pro
// Supabase a cada mudança. Guardar o PNG ali mandaria 300 KB pra nuvem em todo
// sync, de todo projeto, pra sempre — exatamente o que o `fotos.js` evitou
// quando decidiu que foto de comprovante fica local. Mesma régua aqui, e com um
// argumento a mais: esta imagem é DERIVADA, dá pra refazer a qualquer momento
// clicando de novo. Dado derivado não ocupa nuvem.
//
// O projeto guarda só a referência (`estruturaImg: { em, largura, altura }`);
// o PNG vive no IndexedDB, sob a chave do projeto.

import { idbDel, idbGet, idbSet } from "../idb.js";

const PREFIXO = "ledlab.estrutura.img.";
const chave = (projectId) => `${PREFIXO}${projectId}`;

/** guarda o PNG e devolve a referência que vai pro projeto */
export async function salvarImagem(projectId, dataUrl, { largura, altura } = {}) {
  if (!projectId || !dataUrl) return null;
  await idbSet(chave(projectId), dataUrl);
  return {
    em: Date.now(),
    largura: largura ?? null,
    altura: altura ?? null,
    // tamanho aproximado em KB — a aba mostra, pra ninguém guardar 3 MB sem saber
    kb: Math.round((dataUrl.length * 0.75) / 1024),
  };
}

/** o PNG guardado, ou null. Nunca lança: sem imagem, a folha sai sem imagem. */
export async function lerImagem(projectId) {
  if (!projectId) return null;
  try {
    const v = await idbGet(chave(projectId));
    return typeof v === "string" && v.startsWith("data:image") ? v : null;
  } catch {
    return null;
  }
}

export async function apagarImagem(projectId) {
  if (!projectId) return;
  try {
    await idbDel(chave(projectId));
  } catch {
    /* já não estava lá */
  }
}
