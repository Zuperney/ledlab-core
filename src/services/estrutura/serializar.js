// services/estrutura/serializar.js — a montagem que vai pro IndexedDB e pro sync.
//
// Espeque: docs/estrutura3d-spec.md §5.5.
//
// TRÊS REGRAS:
// 1. `versao` desde o dia 1 — isso vai pro banco local e vai precisar migrar;
// 2. o arquivo NÃO guarda geometria, só a árvore de montagem (a geometria vem do
//    catálogo, e é por isso que corrigir uma peça conserta projetos antigos);
// 3. a saída é ESTÁVEL — mesmas peças, mesmo JSON. Sem isso o sync marcaria
//    mudança a cada abertura por causa de lixo na 15ª casa decimal.

import { MOTIVOS, ErroDeMontagem, VERSAO_MONTAGEM, novaMontagem, recalcular } from "./montagem.js";
import { arredMatriz, MATRIZ_IDENTIDADE } from "./vetor.js";
import { pecaPorId } from "./catalogo.js";

const numeros = (v, n) =>
  Array.isArray(v) && v.length === n && v.every((x) => Number.isFinite(x));

// ── migrações ────────────────────────────────────────────────
// O arquivo guarda `catalogoId`, então TODO renome de peça no catálogo é uma
// migração — projeto salvo em julho tem que abrir em agosto desenhando igual.
//
// v1 → v2 (19/08/2026): o catálogo passou a ser CATEGORIA-MODELO e o id largou o
// prefixo de linha do fabricante (espeque §3.2.3). A tabela é literal e ESTÁTICA
// de propósito: ela é a foto do catálogo v1, e não pode se mexer quando o
// catálogo de hoje mudar de novo — senão a migração reescreve o passado errado.
const IDS_V1_PARA_V2 = Object.freeze({
  "p30-b0200": "barra-0200",
  "p30-b0300": "barra-0300",
  "p30-b0500": "barra-0500",
  "p30-b0600": "barra-0600",
  "p30-b1000": "barra-1000",
  "p30-b2000": "barra-2000",
  "p30-b3000": "barra-3000",
  "p30-b4000": "barra-4000",
  "p30-cubo5": "cubo-5f",
  "p30-sapata-baixa": "base-baixa",
});

/**
 * O id de catálogo de uma peça gravada, trazido até a versão de hoje.
 *
 * Id desconhecido passa INTACTO — quem decide o que fazer com peça fora do
 * catálogo é o `deJSON` (recusa, ou descarta se pedirem). Migração que
 * "conserta" o que não conhece é migração que inventa dado.
 */
export function migrarCatalogoId(catalogoId, versao) {
  return versao <= 1 ? (IDS_V1_PARA_V2[catalogoId] ?? catalogoId) : catalogoId;
}

/** montagem → objeto puro, pronto pra JSON.stringify */
export function paraJSON(montagem) {
  return {
    versao: VERSAO_MONTAGEM,
    pecas: (montagem?.pecas ?? []).map((p) => {
      const saida = {
        id: p.id,
        catalogoId: p.catalogoId,
        matriz: arredMatriz(p.matriz ?? [...MATRIZ_IDENTIDADE]),
      };
      // chave ausente em vez de `null`: mantém o JSON enxuto e o diff limpo
      if (p.encaixe?.de) {
        saida.encaixe = {
          de: p.encaixe.de,
          conAlvo: p.encaixe.conAlvo,
          conNovo: p.encaixe.conNovo,
          giro: p.encaixe.giro ?? 0,
        };
      }
      return saida;
    }),
  };
}

/**
 * objeto → montagem, com migração e validação.
 *
 * Falha com erro CLARO em vez de deixar passar dado torto: uma montagem meio
 * carregada desenha errado e o técnico só descobre no galpão.
 *
 * @param {object} dados
 * @param {{ recalcularMatrizes?: boolean, descartarDesconhecidas?: boolean }} opcoes
 */
export function deJSON(dados, opcoes = {}) {
  const { recalcularMatrizes = true, descartarDesconhecidas = false } = opcoes;

  if (dados == null) return novaMontagem();
  if (typeof dados !== "object" || !Array.isArray(dados.pecas)) {
    throw new ErroDeMontagem("json-invalido", { dados });
  }

  const versao = Number(dados.versao) || 1;
  if (versao > VERSAO_MONTAGEM) {
    // arquivo de uma versão FUTURA do app (o sync trouxe de outro aparelho já
    // atualizado). Recusar é mais honesto do que abrir pela metade.
    throw new ErroDeMontagem("versao-futura", { versao, suportada: VERSAO_MONTAGEM });
  }

  const vistos = new Set();
  const pecas = [];
  for (const bruta of dados.pecas) {
    if (!bruta || typeof bruta.id !== "string" || typeof bruta.catalogoId !== "string") {
      throw new ErroDeMontagem("peca-invalida", { bruta });
    }
    if (vistos.has(bruta.id)) throw new ErroDeMontagem("id-duplicado", { id: bruta.id });
    vistos.add(bruta.id);

    // migra ANTES de conferir o catálogo: senão todo projeto da v1 leria como
    // um monte de peça desconhecida e a estrutura sumiria da tela
    const catalogoId = migrarCatalogoId(bruta.catalogoId, versao);
    if (!pecaPorId(catalogoId)) {
      // peça que saiu do catálogo (ou de um catálogo maior, de outro aparelho)
      if (descartarDesconhecidas) continue;
      throw new ErroDeMontagem(MOTIVOS.PECA_DESCONHECIDA, { catalogoId });
    }

    pecas.push({
      id: bruta.id,
      catalogoId,
      matriz: numeros(bruta.matriz, 16)
        ? arredMatriz(bruta.matriz)
        : [...MATRIZ_IDENTIDADE],
      encaixe: bruta.encaixe?.de
        ? {
            de: bruta.encaixe.de,
            conAlvo: bruta.encaixe.conAlvo,
            conNovo: bruta.encaixe.conNovo,
            giro: Number(bruta.encaixe.giro) || 0,
          }
        : null,
    });
  }

  // encaixe apontando pra peça que não existe mais vira peça livre — melhor
  // manter a estrutura desenhada do que derrubar o projeto inteiro
  const ids = new Set(pecas.map((p) => p.id));
  for (const p of pecas) {
    if (p.encaixe && !ids.has(p.encaixe.de)) p.encaixe = null;
  }

  const montagem = { versao: VERSAO_MONTAGEM, pecas };
  // reconstruir do encaixe simbólico é o que endireita projeto antigo quando a
  // geometria do catálogo é corrigida
  return recalcularMatrizes ? recalcular(montagem) : montagem;
}
