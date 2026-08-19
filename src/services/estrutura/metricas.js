// services/estrutura/metricas.js — o que a estrutura pesa, quanto ocupa e do que
// é feita. É a entrega que o dono pediu (espeque §9, fase E3).
//
// ⚠️ ESTE MÓDULO ABRE NO CELULAR. O relatório é offline e o chunk 3D fica fora do
// precache — por isso nada aqui (nem na cadeia de imports) pode tocar em `three`.

import { CATALOGO, PARAFUSARIA_POR_JUNTA, caixaLocal, pecaPorId } from "./catalogo.js";
import { juntas } from "./montagem.js";
import { matPonto } from "./vetor.js";

const r1 = (n) => Math.round(n * 10) / 10;

/**
 * Peso total da estrutura.
 * `completo: false` significa que ALGUMA peça não tem peso — e aí o total é
 * parcial. O Caderno imprime "—" e o motivo, nunca um número que parece fechado.
 */
export function pesoTotal(montagem) {
  let kg = 0;
  let semPeso = 0;
  let naoConferidas = 0;
  for (const p of montagem?.pecas ?? []) {
    const cat = pecaPorId(p.catalogoId);
    const w = cat?.peso?.kg;
    if (typeof w !== "number" || !(w > 0)) {
      semPeso++;
      continue;
    }
    kg += w;
    if (!cat.peso.conferido) naoConferidas++;
  }
  return {
    kg: r1(kg),
    completo: semPeso === 0,
    semPeso,
    naoConferidas,
    // enquanto houver peso não conferido, o número é ordem de grandeza — e o
    // Caderno tem que dizer isso com todas as letras
    conferido: semPeso === 0 && naoConferidas === 0,
  };
}

/** caixa envolvente da estrutura inteira, em mm de mundo */
export function caixaEnvolvente(montagem) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  let houve = false;

  for (const p of montagem?.pecas ?? []) {
    const cat = pecaPorId(p.catalogoId);
    const caixa = caixaLocal(cat);
    if (!caixa || !p.matriz) continue;
    houve = true;
    for (const cx of [caixa.min[0], caixa.max[0]]) {
      for (const cy of [caixa.min[1], caixa.max[1]]) {
        for (const cz of [caixa.min[2], caixa.max[2]]) {
          const v = matPonto(p.matriz, [cx, cy, cz]);
          for (let k = 0; k < 3; k++) {
            if (v[k] < min[k]) min[k] = v[k];
            if (v[k] > max[k]) max[k] = v[k];
          }
        }
      }
    }
  }

  if (!houve) return null;
  return {
    min: min.map(r1),
    max: max.map(r1),
    larguraMm: r1(max[0] - min[0]),
    alturaMm: r1(max[1] - min[1]),
    profundidadeMm: r1(max[2] - min[2]),
  };
}

/**
 * A lista de peças — o artefato que vai pro galpão.
 * Ordenada por tipo (barra, cubo, sapata) e, dentro do tipo, pela ordem do
 * catálogo, pra que a folha impressa saia sempre igual.
 */
export function listaDePecas(montagem) {
  const ordem = new Map(CATALOGO.map((c, i) => [c.id, i]));
  const contagem = new Map();
  for (const p of montagem?.pecas ?? []) {
    contagem.set(p.catalogoId, (contagem.get(p.catalogoId) ?? 0) + 1);
  }
  return [...contagem.entries()]
    .map(([catalogoId, qtd]) => {
      const cat = pecaPorId(catalogoId);
      const kg = cat?.peso?.kg;
      return {
        catalogoId,
        nome: cat?.nome ?? catalogoId,
        tipo: cat?.tipo ?? "?",
        linha: cat?.linha ?? null,
        qtd,
        pesoUnitarioKg: typeof kg === "number" ? kg : null,
        pesoTotalKg: typeof kg === "number" ? r1(kg * qtd) : null,
        pesoConferido: cat?.peso?.conferido ?? false,
        pesoFonte: cat?.peso?.fonte ?? null,
      };
    })
    .sort((a, b) => (ordem.get(a.catalogoId) ?? 0) - (ordem.get(b.catalogoId) ?? 0));
}

/**
 * A parafusaria — CONTAGEM, não massa.
 *
 * ⚠️ Não contar parafuso duas vezes. Quando o dono pesar as peças na balança ele
 * vai pesar COM os parafusos (`peso.incluiParafusos`), então a massa já está no
 * total. Esta lista responde "quantos levar na caixa", e é só isso.
 */
export function parafusaria(montagem) {
  const n = juntas(montagem).length;
  return {
    juntas: n,
    itens: Object.entries(PARAFUSARIA_POR_JUNTA).map(([id, def]) => ({
      id,
      spec: def.spec,
      qtd: def.qtd * n,
    })),
    massaInclusaNoPeso: (montagem?.pecas ?? []).some(
      (p) => pecaPorId(p.catalogoId)?.peso?.incluiParafusos,
    ),
  };
}

/** tudo de uma vez — é o que a aba e o Caderno consomem */
export function resumo(montagem) {
  const peso = pesoTotal(montagem);
  const caixa = caixaEnvolvente(montagem);
  return {
    pecas: montagem?.pecas?.length ?? 0,
    juntas: juntas(montagem).length,
    peso,
    caixa,
    lista: listaDePecas(montagem),
    parafusaria: parafusaria(montagem),
  };
}
