// services/estrutura/montagem.js — a árvore de peças de uma estrutura.
//
// Espeque: docs/estrutura3d-spec.md §5.5.
//
// A FONTE DA VERDADE É O ENCAIXE SIMBÓLICO, não a matriz. A matriz fica junto
// como cache (pra carregar rápido e pra desenhar sem recalcular), mas quem manda
// é o par de conectores. Assim, se um dia a geometria de uma peça for corrigida
// no catálogo, os projetos antigos se RECONSTROEM certos em vez de ficarem tortos.
//
// Todas as funções são PURAS: recebem uma montagem, devolvem outra. Nada é
// mutado no lugar — é o que torna o histórico de desfazer barato e o teste trivial.

import { genId } from "../ids.js";
import { ANGULO_DE_GIRO, caixaLocal, conectorPorId, pecaPorId } from "./catalogo.js";
import {
  conectorNoMundo, mesmaPose, normalizarGiro, passosDeRolagem, resolverEncaixe,
} from "./encaixe.js";
import {
  IDENTIDADE, MATRIZ_IDENTIDADE, arredMatriz, matPonto, matriz, qAplicar, qDoEixo, soma, sub,
} from "./vetor.js";

export const VERSAO_MONTAGEM = 1;

export const novaMontagem = () => ({ versao: VERSAO_MONTAGEM, pecas: [] });

export const pecaDaMontagem = (montagem, id) =>
  montagem?.pecas?.find((p) => p.id === id) ?? null;

/** chave canônica de um conector dentro da montagem */
export const chaveConector = (pecaId, conectorId) => `${pecaId}:${conectorId}`;

/**
 * As juntas da montagem — uma por peça encaixada.
 * @returns {{a:string,b:string,pecaA:string,conA:string,pecaB:string,conB:string}[]}
 */
export function juntas(montagem) {
  const out = [];
  for (const p of montagem?.pecas ?? []) {
    const e = p.encaixe;
    if (!e?.de) continue;
    out.push({
      a: chaveConector(e.de, e.conAlvo),
      b: chaveConector(p.id, e.conNovo),
      pecaA: e.de,
      conA: e.conAlvo,
      pecaB: p.id,
      conB: e.conNovo,
    });
  }
  return out;
}

/** conectores ocupados, como Set de chaves */
export function conectoresOcupados(montagem) {
  const s = new Set();
  for (const j of juntas(montagem)) {
    s.add(j.a);
    s.add(j.b);
  }
  return s;
}

/** todos os conectores da montagem, já no MUNDO, com a marca de ocupado */
export function conectores(montagem) {
  const ocupados = conectoresOcupados(montagem);
  const out = [];
  for (const p of montagem?.pecas ?? []) {
    const cat = pecaPorId(p.catalogoId);
    if (!cat) continue;
    for (const c of cat.conectores) {
      const chave = chaveConector(p.id, c.id);
      out.push({
        ...conectorNoMundo(c, p.matriz),
        chave,
        pecaId: p.id,
        conectorId: c.id,
        sistema: cat.sistema,
        ocupado: ocupados.has(chave),
      });
    }
  }
  return out;
}

export const conectoresLivres = (montagem) =>
  conectores(montagem).filter((c) => !c.ocupado);

// ── erros de domínio ─────────────────────────────────────────
// Erro nomeado em vez de string solta: a UI precisa decidir o texto, e o teste
// precisa afirmar o motivo sem depender da redação.
export class ErroDeMontagem extends Error {
  constructor(motivo, detalhe = {}) {
    super(motivo);
    this.name = "ErroDeMontagem";
    this.motivo = motivo;
    this.detalhe = detalhe;
  }
}

export const MOTIVOS = Object.freeze({
  PECA_DESCONHECIDA: "peca-desconhecida",
  ALVO_INEXISTENTE: "alvo-inexistente",
  CONECTOR_INEXISTENTE: "conector-inexistente",
  CONECTOR_OCUPADO: "conector-ocupado",
  SISTEMA_INCOMPATIVEL: "sistema-incompativel",
  CICLO: "ciclo",
});

// ── adicionar ────────────────────────────────────────────────

/**
 * A matriz de uma peça nova APOIADA NO CHÃO, e não centrada na origem.
 *
 * Barra e cubo têm origem no CENTRO (é o que faz a matemática do encaixe ficar
 * simples), então nascer na origem é nascer com metade da peça enterrada — foi o
 * que o dono viu. A sapata já tem origem no chão, e por isso ela nunca mostrou o
 * problema: aqui as três passam a se comportar igual.
 *
 * A regra é a do galpão: peça solta se APOIA. Quem quiser pendurar peça no ar
 * ainda pode passar a matriz que quiser.
 */
export function matrizApoiada(catalogoId, { x = 0, z = 0, chaoMm = 0 } = {}) {
  const caixa = caixaLocal(pecaPorId(catalogoId));
  return arredMatriz(matriz(IDENTIDADE, [x, chaoMm - (caixa ? caixa.min[1] : 0), z]));
}

/** primeira peça (ou peça solta): entra com a matriz que vier, ou na origem */
export function adicionarPecaLivre(montagem, catalogoId, opcoes = {}) {
  const cat = pecaPorId(catalogoId);
  if (!cat) throw new ErroDeMontagem(MOTIVOS.PECA_DESCONHECIDA, { catalogoId });
  const peca = {
    id: opcoes.id ?? genId("pc"),
    catalogoId,
    matriz: arredMatriz(opcoes.matriz ?? [...MATRIZ_IDENTIDADE]),
    encaixe: null,
  };
  return { ...montagem, pecas: [...montagem.pecas, peca] };
}

/**
 * Encaixa uma peça nova num conector livre de uma peça já montada.
 * @param {object} montagem
 * @param {{catalogoId:string, de:string, conAlvo:string, conNovo:string, giro?:number, id?:string}} pedido
 */
export function adicionarPecaEncaixada(montagem, pedido) {
  const { catalogoId, de, conAlvo, conNovo, giro = 0 } = pedido;

  const cat = pecaPorId(catalogoId);
  if (!cat) throw new ErroDeMontagem(MOTIVOS.PECA_DESCONHECIDA, { catalogoId });

  const alvoPeca = pecaDaMontagem(montagem, de);
  if (!alvoPeca) throw new ErroDeMontagem(MOTIVOS.ALVO_INEXISTENTE, { de });

  const alvoCat = pecaPorId(alvoPeca.catalogoId);
  const alvoConLocal = conectorPorId(alvoCat, conAlvo);
  const novoConLocal = conectorPorId(cat, conNovo);
  if (!alvoConLocal || !novoConLocal) {
    throw new ErroDeMontagem(MOTIVOS.CONECTOR_INEXISTENTE, { conAlvo, conNovo });
  }
  if (alvoCat.sistema !== cat.sistema) {
    throw new ErroDeMontagem(MOTIVOS.SISTEMA_INCOMPATIVEL, {
      alvo: alvoCat.sistema,
      novo: cat.sistema,
    });
  }
  const ocupados = conectoresOcupados(montagem);
  if (ocupados.has(chaveConector(de, conAlvo))) {
    throw new ErroDeMontagem(MOTIVOS.CONECTOR_OCUPADO, { de, conAlvo });
  }

  const alvoMundo = conectorNoMundo(alvoConLocal, alvoPeca.matriz);
  const { matriz } = resolverEncaixe(alvoMundo, novoConLocal, giro);

  const peca = {
    id: pedido.id ?? genId("pc"),
    catalogoId,
    matriz,
    encaixe: { de, conAlvo, conNovo, giro: normalizarGiro(giro) },
  };
  return { ...montagem, pecas: [...montagem.pecas, peca] };
}

// ── remover ──────────────────────────────────────────────────

/**
 * Remove uma peça. As peças que estavam encaixadas NELA não somem e não se mexem:
 * elas viram peças livres, mantendo a matriz de mundo que já tinham.
 *
 * É a escolha deliberada. Cascatear a remoção apagaria meia estrutura por um
 * clique, e é o tipo de estrago que o "desfazer" conserta tarde demais na cabeça
 * de quem está montando.
 */
export function removerPeca(montagem, id) {
  const pecas = montagem.pecas
    .filter((p) => p.id !== id)
    .map((p) => (p.encaixe?.de === id ? { ...p, encaixe: null } : p));
  return { ...montagem, pecas };
}

/**
 * Reposiciona UMA peça mexendo no encaixe dela, e SEGURA OS FILHOS NO LUGAR.
 *
 * ⚠️ É o coração da regra do dono (19/08): **só a peça selecionada se mexe**.
 * Antes, girar uma barra no meio da torre arrastava tudo que estava acima — e a
 * peça escolhida, que gira em torno do próprio eixo, parecia travada. Era o
 * `recalcular` fazendo o certo pelo modelo e o errado pra quem monta.
 *
 * COMO O FILHO FICA PARADO SEM SOLTAR O PARAFUSO. O filho é posicionado pela
 * pose do conector do pai onde ele está preso. Quando o pai se mexe, esse
 * conector sai de lugar — MAS, numa peça simétrica, quase sempre existe OUTRO
 * conector do mesmo pai que foi parar exatamente na pose antiga. Então o filho
 * é reancorado nesse conector e o `giro` dele é corrigido nos passos de 90° que
 * a rolagem andou. O filho não se move um milímetro e continua aparafusado no
 * mesmo pai — só que na face que agora está onde a outra estava.
 *
 * É o que o técnico faria: gira o cubo e reaperta a viga na face que ficou
 * virada pro lado certo.
 *
 * Na BARRA isso vira o caso trivial: ela encaixa pelas pontas, que ficam em cima
 * do eixo do giro, e o conector nem sai do lugar — sobra só corrigir a rolagem.
 *
 * QUANDO NÃO DÁ: se nenhum conector do pai assumir a pose antiga (a face cega do
 * cubo foi parar ali, ou a peça é assimétrica), o filho acompanha o pai. Não há
 * o que segurar — no truss de verdade também não haveria.
 *
 * Basta cuidar dos filhos DIRETOS: com eles parados, os netos nem sabem que
 * houve mudança.
 */
function reposicionar(montagem, id, mudar, { compensarFilhos = true } = {}) {
  const peca = pecaDaMontagem(montagem, id);
  if (!peca?.encaixe) return montagem; // peça livre não tem junta pra mexer
  const encaixe = mudar(peca.encaixe);

  const aplicar = (pecas) => recalcular({ ...montagem, pecas });
  const soAPeca = () =>
    aplicar(montagem.pecas.map((p) => (p.id === id ? { ...p, encaixe } : p)));

  const cat = pecaPorId(peca.catalogoId);
  const pai = pecaDaMontagem(montagem, encaixe.de);
  const paiCon = conectorPorId(pecaPorId(pai?.catalogoId), encaixe.conAlvo);
  const novoCon = conectorPorId(cat, encaixe.conNovo);
  if (!compensarFilhos || !pai || !paiCon || !novoCon) return soAPeca();

  // a pose da peça DEPOIS da mudança, calculada direto — sem passar pela árvore,
  // que ainda está com os filhos apontando pro lugar antigo
  const matrizDepois = resolverEncaixe(
    conectorNoMundo(paiCon, pai.matriz), novoCon, encaixe.giro ?? 0,
  ).matriz;

  const antes = cat.conectores.map((c) => conectorNoMundo(c, peca.matriz));
  const depois = cat.conectores.map((c) => conectorNoMundo(c, matrizDepois));

  // o conector que a própria peça usa pra se prender no pai está fora do jogo —
  // reancorar um filho ali seria duas juntas disputando o mesmo parafuso
  const usados = new Set([encaixe.conNovo]);
  const pecas = montagem.pecas.map((p) => {
    if (p.id === id) return { ...p, encaixe };
    if (p.encaixe?.de !== id) return p;
    const alvoAntigo = antes.find((c) => c.id === p.encaixe.conAlvo);
    const equivalente = alvoAntigo
      ? depois.find((c) => !usados.has(c.id) && mesmaPose(c, alvoAntigo))
      : null;
    if (!equivalente) return p; // não há como segurar: o filho acompanha
    usados.add(equivalente.id);
    return {
      ...p,
      encaixe: {
        ...p.encaixe,
        conAlvo: equivalente.id,
        giro: normalizarGiro(
          (p.encaixe.giro ?? 0)
          + passosDeRolagem(equivalente.rolo, alvoAntigo.rolo, alvoAntigo.dir),
        ),
      },
    };
  });
  return aplicar(pecas);
}

/**
 * Gira uma peça JÁ montada, em passos de 90°, em torno do eixo do encaixe.
 * Só ela se mexe — ver `reposicionar`.
 */
export function girarPeca(montagem, id, giro, opcoes) {
  return reposicionar(montagem, id, (e) => ({ ...e, giro: normalizarGiro(giro) }), opcoes);
}

/**
 * A próxima face por onde a peça pode entrar na junta.
 *
 * Pula só o que é REGRA: face que já tem peça pendurada não serve de entrada,
 * porque seriam duas juntas disputando o mesmo parafuso. Nada além disso — a
 * orientação é escolha de quem desenha, não do app (§8.10).
 */
export function proximaEntrada(montagem, id, sentido = 1) {
  const peca = pecaDaMontagem(montagem, id);
  const cat = pecaPorId(peca?.catalogoId);
  if (!peca?.encaixe || !cat) return null;
  const ocupados = conectoresOcupados(montagem);
  const faces = cat.conectores.map((c) => c.id);
  const i = faces.indexOf(peca.encaixe.conNovo);
  for (let k = 1; k < faces.length; k++) {
    const conNovo = faces[(((i + sentido * k) % faces.length) + faces.length) % faces.length];
    if (!ocupados.has(chaveConector(id, conNovo))) return conNovo;
  }
  return null;
}

/**
 * A matriz de uma peça LIVRE girada 90° em torno de um eixo do mundo.
 *
 * ⚠️ PEÇA LIVRE TAMBÉM GIRA (§8.10). Ela não tem junta, então não tem "eixo de
 * encaixe" — mas isso não é motivo pra ela ficar parada. Uma barra que só sabe
 * ficar em pé não desenha vão nenhum.
 *
 * Gira em cima do PRÓPRIO centro e devolve a peça com a base no mesmo nível de
 * antes: deitar uma barra em pé deixa ela deitada NO CHÃO, não meio enterrada.
 */
export function matrizGirada(peca, eixo = [0, 1, 0], passos = 1) {
  const caixa = caixaLocal(pecaPorId(peca?.catalogoId));
  if (!caixa || !peca?.matriz) return peca?.matriz ?? null;

  const cantos = [];
  for (const x of [caixa.min[0], caixa.max[0]]) {
    for (const y of [caixa.min[1], caixa.max[1]]) {
      for (const z of [caixa.min[2], caixa.max[2]]) cantos.push([x, y, z]);
    }
  }
  const extremos = (m) => {
    const pts = cantos.map((c) => matPonto(m, c));
    const eixos = [0, 1, 2].map((k) => pts.map((p) => p[k]));
    return {
      centro: eixos.map((v) => (Math.min(...v) + Math.max(...v)) / 2),
      base: Math.min(...eixos[1]),
    };
  };

  const antes = extremos(peca.matriz);
  const q = qDoEixo(eixo, passos * ANGULO_DE_GIRO);
  const m = peca.matriz;
  // matriz rígida: as três primeiras colunas são as imagens dos eixos locais,
  // então girar a peça é girar cada uma delas
  const col = (i) => qAplicar(q, [m[i], m[i + 1], m[i + 2]]);
  const [cx, cy, cz] = [col(0), col(4), col(8)];
  const t = soma(qAplicar(q, sub([m[12], m[13], m[14]], antes.centro)), antes.centro);

  const girada = [cx[0], cx[1], cx[2], 0, cy[0], cy[1], cy[2], 0, cz[0], cz[1], cz[2], 0, t[0], t[1], t[2], 1];
  const depois = extremos(girada);
  girada[13] += antes.base - depois.base; // a base volta pro nível de antes
  return arredMatriz(girada);
}

/** troca a matriz de uma peça LIVRE (peça encaixada tem a matriz derivada) */
export function definirMatriz(montagem, id, matriz) {
  const peca = pecaDaMontagem(montagem, id);
  if (!peca || peca.encaixe) return montagem;
  return {
    ...montagem,
    pecas: montagem.pecas.map((p) => (p.id === id ? { ...p, matriz: arredMatriz(matriz) } : p)),
  };
}

/**
 * Troca a FACE por onde a peça entra na junta — o "tilt" do §8.6-C1.
 *
 * Girar (`girarPeca`) roda em torno do eixo do encaixe e NÃO consegue tirar a
 * face cega do cubo do topo: ela mora nesse eixo. Quem move a face cega é isto
 * aqui — entrar por outra face. São as duas rotações que o cubo precisa, e é
 * por isso que a aba mapeia `R` pra uma e `Ctrl+R` pra outra.
 */
export function mudarEntrada(montagem, id, conNovo) {
  const peca = pecaDaMontagem(montagem, id);
  if (!peca?.encaixe) return montagem; // peça livre não entra em junta nenhuma
  const cat = pecaPorId(peca.catalogoId);
  if (!conectorPorId(cat, conNovo)) {
    throw new ErroDeMontagem(MOTIVOS.CONECTOR_INEXISTENTE, { conNovo });
  }
  // a face escolhida não pode ser uma que já tem peça pendurada: a junta nova e
  // a antiga disputariam o mesmo conector, e a montagem passaria a mentir
  if (conNovo !== peca.encaixe.conNovo
      && conectoresOcupados(montagem).has(chaveConector(id, conNovo))) {
    throw new ErroDeMontagem(MOTIVOS.CONECTOR_OCUPADO, { id, conNovo });
  }
  return reposicionar(montagem, id, (e) => ({ ...e, conNovo }));
}

// ── recalcular ───────────────────────────────────────────────

/**
 * Reconstrói TODAS as matrizes a partir dos encaixes simbólicos.
 * É o que faz um projeto antigo se endireitar quando o catálogo é corrigido.
 * Peça livre mantém a matriz que tem (não há de onde derivar).
 */
export function recalcular(montagem) {
  const porId = new Map(montagem.pecas.map((p) => [p.id, p]));
  const prontas = new Map();
  const visitando = new Set();

  const resolver = (peca) => {
    if (prontas.has(peca.id)) return prontas.get(peca.id);
    if (visitando.has(peca.id)) {
      throw new ErroDeMontagem(MOTIVOS.CICLO, { id: peca.id });
    }
    visitando.add(peca.id);

    let matriz = peca.matriz;
    const e = peca.encaixe;
    const alvo = e?.de ? porId.get(e.de) : null;
    if (alvo) {
      const alvoMatriz = resolver(alvo);
      const alvoCat = pecaPorId(alvo.catalogoId);
      const cat = pecaPorId(peca.catalogoId);
      const alvoCon = conectorPorId(alvoCat, e.conAlvo);
      const novoCon = conectorPorId(cat, e.conNovo);
      if (alvoCon && novoCon) {
        matriz = resolverEncaixe(
          conectorNoMundo(alvoCon, alvoMatriz),
          novoCon,
          e.giro,
        ).matriz;
      }
    }

    visitando.delete(peca.id);
    prontas.set(peca.id, matriz);
    return matriz;
  };

  const pecas = montagem.pecas.map((p) => ({ ...p, matriz: resolver(p) }));
  return { ...montagem, pecas };
}
