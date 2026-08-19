// services/estrutura/historico.js — desfazer e refazer.
//
// Espeque: docs/estrutura3d-spec.md §6.2.
//
// COMANDOS INVERSÍVEIS, NUNCA SNAPSHOTS. Com 2.000 peças, guardar uma cópia da
// montagem a cada passo estoura a memória do navegador. Aqui cada ação carrega o
// seu inverso, calculado no momento em que ela acontece.
//
// Um ARRASTE INTEIRO é UM comando, não 60 por segundo: quem chama marca o início
// no `pointerdown` e só executa no `pointerup`. Isso é responsabilidade da vista;
// o motor só recebe o comando pronto.

import {
  adicionarPecaEncaixada, adicionarPecaLivre, girarPeca, novaMontagem, pecaDaMontagem, removerPeca,
} from "./montagem.js";

export const LIMITE_PADRAO = 100;

export const criarHistorico = (montagem = novaMontagem(), limite = LIMITE_PADRAO) => ({
  montagem,
  desfazer: [],
  refazer: [],
  limite,
});

// ── ações ────────────────────────────────────────────────────
export const ACOES = Object.freeze({
  ADICIONAR_LIVRE: "adicionar-livre",
  ADICIONAR_ENCAIXADA: "adicionar-encaixada",
  REMOVER: "remover",
  GIRAR: "girar",
  RESTAURAR: "restaurar",
  // várias ações que valem como UMA no desfazer. Nasceu da seleção múltipla
  // (§8.6, C2): apagar 5 peças de uma vez e ter que apertar Ctrl+Z cinco vezes
  // pra voltar é o app cobrando pelo gesto que ele mesmo ofereceu.
  LOTE: "lote",
});

/** aplica uma ação numa montagem (pura) */
export function aplicar(montagem, acao) {
  switch (acao.tipo) {
    case ACOES.ADICIONAR_LIVRE:
      return adicionarPecaLivre(montagem, acao.catalogoId, {
        id: acao.id,
        matriz: acao.matriz,
      });
    case ACOES.ADICIONAR_ENCAIXADA:
      return adicionarPecaEncaixada(montagem, acao);
    case ACOES.REMOVER:
      return removerPeca(montagem, acao.id);
    case ACOES.GIRAR:
      return girarPeca(montagem, acao.id, acao.giro);
    case ACOES.LOTE:
      return (acao.acoes ?? []).reduce(aplicar, montagem);
    case ACOES.RESTAURAR:
      // devolve a peça na posição original da lista e reata os órfãos
      return {
        ...montagem,
        pecas: [
          ...montagem.pecas.slice(0, acao.indice),
          acao.peca,
          ...montagem.pecas.slice(acao.indice),
        ].map((p) => {
          const orfao = acao.orfaos?.find((o) => o.id === p.id);
          return orfao ? { ...p, encaixe: orfao.encaixe } : p;
        }),
      };
    default:
      throw new Error(`ação desconhecida: ${acao.tipo}`);
  }
}

/** o inverso de uma ação, calculado ANTES de ela ser aplicada */
function inversoDe(montagem, acao) {
  switch (acao.tipo) {
    case ACOES.ADICIONAR_LIVRE:
    case ACOES.ADICIONAR_ENCAIXADA:
      return { tipo: ACOES.REMOVER, id: acao.id };
    case ACOES.GIRAR: {
      const atual = pecaDaMontagem(montagem, acao.id);
      if (!atual?.encaixe) return null;
      return { tipo: ACOES.GIRAR, id: acao.id, giro: atual.encaixe.giro ?? 0 };
    }
    case ACOES.REMOVER: {
      const peca = pecaDaMontagem(montagem, acao.id);
      if (!peca) return null;
      return {
        tipo: ACOES.RESTAURAR,
        peca,
        indice: montagem.pecas.findIndex((p) => p.id === acao.id),
        // as peças que estavam encaixadas nela viraram livres — o inverso
        // precisa devolver o encaixe de cada uma, senão o "desfazer" mente
        orfaos: montagem.pecas
          .filter((p) => p.encaixe?.de === acao.id)
          .map((p) => ({ id: p.id, encaixe: p.encaixe })),
      };
    }
    case ACOES.LOTE: {
      // Os inversos são calculados ENCADEANDO o estado: o inverso da segunda
      // ação depende de a primeira já ter acontecido. E voltam em ordem
      // REVERSA — desfazer é desandar, não repetir de trás pra frente.
      let m = montagem;
      const inversos = [];
      for (const a of acao.acoes ?? []) {
        const i = inversoDe(m, a);
        if (i) inversos.unshift(i);
        m = aplicar(m, a);
      }
      return inversos.length ? { tipo: ACOES.LOTE, acoes: inversos } : null;
    }
    default:
      return null;
  }
}

/**
 * Executa um comando e empilha o inverso.
 * A ação de adicionar PRECISA trazer `id` — senão o inverso não sabe o que
 * remover. Quem chama gera o id (ou usa `comandoAdicionar*` abaixo).
 */
export function executar(historico, acao) {
  const inverso = inversoDe(historico.montagem, acao);
  const montagem = aplicar(historico.montagem, acao);
  const desfazer = inverso
    ? [...historico.desfazer, { acao, inverso }].slice(-historico.limite)
    : historico.desfazer;
  // comando novo mata o futuro: o galho de refazer deixou de existir
  return { ...historico, montagem, desfazer, refazer: [] };
}

export function podeDesfazer(h) {
  return h.desfazer.length > 0;
}
export function podeRefazer(h) {
  return h.refazer.length > 0;
}

export function desfazerUm(historico) {
  if (!podeDesfazer(historico)) return historico;
  const passo = historico.desfazer[historico.desfazer.length - 1];
  return {
    ...historico,
    montagem: aplicar(historico.montagem, passo.inverso),
    desfazer: historico.desfazer.slice(0, -1),
    refazer: [...historico.refazer, passo],
  };
}

export function refazerUm(historico) {
  if (!podeRefazer(historico)) return historico;
  const passo = historico.refazer[historico.refazer.length - 1];
  return {
    ...historico,
    montagem: aplicar(historico.montagem, passo.acao),
    desfazer: [...historico.desfazer, passo].slice(-historico.limite),
    refazer: historico.refazer.slice(0, -1),
  };
}
