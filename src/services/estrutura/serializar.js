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

import {
  MOTIVOS, ErroDeMontagem, VERSAO_MONTAGEM, novaMontagem, recalcular, versaoDe,
} from "./montagem.js";
import { arredMatriz, MATRIZ_IDENTIDADE } from "./vetor.js";
import { pecaPorId } from "./catalogo.js";

const numeros = (v, n) =>
  Array.isArray(v) && v.length === n && v.every((x) => Number.isFinite(x));

/** montagem → objeto puro, pronto pra JSON.stringify */
export function paraJSON(montagem) {
  // o painel SOLTO (E5) grava posição; o do formato antigo grava a âncora. Não
  // convertemos aqui de propósito: a conversão precisa das medidas da tela, que
  // o serializador não tem — ela mora no `migrarPaineis`, na abertura da aba.
  const paineis = (montagem?.paineis ?? []).map((p) => (
    Array.isArray(p.pos)
      ? { id: p.id, telaId: p.telaId, olha: p.olha, pos: p.pos.map((v) => Math.round(v * 10) / 10) }
      : { id: p.id, telaId: p.telaId, de: p.de, face: p.face, olha: p.olha }
  ));
  return {
    // só sobe de versão quando usa recurso novo: estrutura sem painel continua
    // abrindo em quem ainda não atualizou o app
    versao: versaoDe(montagem),
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
    // chave ausente em vez de lista vazia: mantém o diff limpo e o JSON enxuto
    ...(paineis.length ? { paineis } : {}),
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

    if (!pecaPorId(bruta.catalogoId)) {
      // peça que saiu do catálogo (ou de um catálogo maior, de outro aparelho)
      if (descartarDesconhecidas) continue;
      throw new ErroDeMontagem(MOTIVOS.PECA_DESCONHECIDA, { catalogoId: bruta.catalogoId });
    }

    pecas.push({
      id: bruta.id,
      catalogoId: bruta.catalogoId,
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

  const paineis = [];
  for (const bruto of dados.paineis ?? []) {
    if (!bruto || typeof bruto.id !== "string" || typeof bruto.telaId !== "string") {
      throw new ErroDeMontagem("painel-invalido", { bruto });
    }
    if (bruto.pos != null && !numeros(bruto.pos, 3)) {
      throw new ErroDeMontagem("painel-invalido", { bruto });
    }
    paineis.push(
      numeros(bruto.pos, 3)
        ? { id: bruto.id, telaId: bruto.telaId, olha: bruto.olha ?? "N", pos: [...bruto.pos] }
        : {
            id: bruto.id,
            telaId: bruto.telaId,
            de: bruto.de ?? null,
            face: bruto.face ?? "BAIXO",
            olha: bruto.olha ?? "N",
          },
    );
  }

  // a `versao` em memória é sempre a que o CONTEÚDO exige, nunca a máxima que o
  // app suporta — assim ela quer dizer a mesma coisa dentro e fora do arquivo
  const montagem = { versao: 1, pecas, paineis };
  montagem.versao = versaoDe(montagem);
  // reconstruir do encaixe simbólico é o que endireita projeto antigo quando a
  // geometria do catálogo é corrigida
  return recalcularMatrizes ? recalcular(montagem) : montagem;
}
