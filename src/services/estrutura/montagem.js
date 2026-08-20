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
import { PASSOS_DE_GIRO, caixaLocal, conectorPorId, pecaPorId } from "./catalogo.js";
import {
  conectorNoMundo, mesmaPose, normalizarGiro, passosDeRolagem, resolverEncaixe,
} from "./encaixe.js";
import { criarGrade, proximos } from "./snap.js";
import {
  IDENTIDADE, MATRIZ_IDENTIDADE, arredMatriz, matriz, mesmaMatriz, oposto,
} from "./vetor.js";

// A versão 2 nasceu com os PAINÉIS (E4). Um arquivo só sobe pra 2 quando tem
// painel de verdade — projeto de estrutura pura continua na 1 e continua abrindo
// em quem ainda não atualizou. Ver `versaoDe`.
export const VERSAO_MONTAGEM = 2;

export const novaMontagem = () => ({ versao: 1, pecas: [], paineis: [] });

/** a versão que ESTE arquivo precisa — só sobe quando usa recurso novo */
export const versaoDe = (montagem) => ((montagem?.paineis?.length ?? 0) > 0 ? 2 : 1);

export const pecaDaMontagem = (montagem, id) =>
  montagem?.pecas?.find((p) => p.id === id) ?? null;

/** chave canônica de um conector dentro da montagem */
export const chaveConector = (pecaId, conectorId) => `${pecaId}:${conectorId}`;

/** todos os conectores da montagem, no MUNDO — sem dizer quais estão ocupados */
export function conectoresNoMundo(montagem) {
  const out = [];
  for (const p of montagem?.pecas ?? []) {
    const cat = pecaPorId(p.catalogoId);
    if (!cat) continue;
    for (const c of cat.conectores) {
      out.push({
        ...conectorNoMundo(c, p.matriz),
        chave: chaveConector(p.id, c.id),
        pecaId: p.id,
        conectorId: c.id,
        sistema: cat.sistema,
      });
    }
  }
  return out;
}

// células pequenas: os pares que interessam estão no MESMO ponto, então o balde
// certo é minúsculo e a varredura das 27 células vizinhas custa quase nada
const CELULA_DE_JUNTA_MM = 100;
const ENCOSTE_MM = 1;

/**
 * As juntas da montagem — **medidas na geometria**, não lidas da árvore.
 *
 * ⚠️ POR QUE NÃO CONTAR OS ENCAIXES. A montagem é uma ÁRVORE: cada peça tem no
 * máximo uma mãe, então contar encaixes dá sempre `peças − soltas`. Só que
 * estrutura de verdade FECHA: no pórtico, a viga se aparafusa nos dois cubos, e
 * a segunda ponta não é filha de ninguém — a árvore não tinha onde anotar.
 *
 * Medido no pórtico de exemplo: **8 juntas na geometria, 7 na árvore**. A que
 * faltava é a ponta direita da viga. E junta some da conta é parafusaria a menos
 * na caixa: 28 parafusos em vez de 32, e a equipe descobre isso no galpão.
 *
 * Junta é onde duas faces de peças diferentes se encontram: mesmo ponto, normais
 * se enfrentando, mesmo sistema. É o que um parafuso veria.
 *
 * @returns {{a:string,b:string,pecaA:string,conA:string,pecaB:string,conB:string}[]}
 */
export function juntas(montagem, crus = null) {
  const cs = crus ?? conectoresNoMundo(montagem);
  if (cs.length < 2) return [];
  const grade = criarGrade(cs, CELULA_DE_JUNTA_MM);
  const vistos = new Set();
  const out = [];
  for (const a of cs) {
    for (const b of proximos(grade, a.pos, ENCOSTE_MM)) {
      if (b.pecaId === a.pecaId || a.sistema !== b.sistema) continue;
      if (!mesmaPose(a, { pos: b.pos, dir: oposto(b.dir) })) continue;
      const par = a.chave < b.chave ? `${a.chave}|${b.chave}` : `${b.chave}|${a.chave}`;
      if (vistos.has(par)) continue;
      vistos.add(par);
      out.push({
        a: a.chave, b: b.chave,
        pecaA: a.pecaId, conA: a.conectorId,
        pecaB: b.pecaId, conB: b.conectorId,
      });
    }
  }
  return out;
}

/** conectores ocupados, como Set de chaves */
export function conectoresOcupados(montagem, crus = null) {
  const s = new Set();
  for (const j of juntas(montagem, crus)) {
    s.add(j.a);
    s.add(j.b);
  }
  return s;
}

/** todos os conectores da montagem, já no MUNDO, com a marca de ocupado */
export function conectores(montagem) {
  const crus = conectoresNoMundo(montagem);
  const ocupados = conectoresOcupados(montagem, crus);
  return crus.map((c) => ({ ...c, ocupado: ocupados.has(c.chave) }));
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

// ── painéis (E4) ─────────────────────────────────────────────
// O painel guarda só o `telaId`: medida e peso saem da tela do projeto, viva.
// Ver `paineis.js` pra geometria.

export function pendurarPainel(montagem, pedido) {
  const { telaId, de, face = "BAIXO", olha = "N" } = pedido;
  if (!telaId || !pecaDaMontagem(montagem, de)) {
    throw new ErroDeMontagem(MOTIVOS.ALVO_INEXISTENTE, { de });
  }
  const painel = { id: pedido.id ?? genId("pn"), telaId, de, face, olha };
  return { ...montagem, paineis: [...(montagem.paineis ?? []), painel] };
}

export function removerPainel(montagem, id) {
  return { ...montagem, paineis: (montagem.paineis ?? []).filter((p) => p.id !== id) };
}

/** muda a face onde o painel encosta, ou pra onde ele olha */
export function ajustarPainel(montagem, id, mudanca) {
  return {
    ...montagem,
    paineis: (montagem.paineis ?? []).map((p) => (p.id === id ? { ...p, ...mudanca } : p)),
  };
}

export const painelDaMontagem = (montagem, id) =>
  (montagem?.paineis ?? []).find((p) => p.id === id) ?? null;

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
  // ⚠️ O PAINEL PENDURADO NELA NÃO SOME. Ele fica sem apoio — sem pose, e a aba
  // avisa. Apagar o painel junto seria perder trabalho por tabela, e o desfazer
  // conserta tarde demais na cabeça de quem monta (mesma régua dos órfãos).
  return { ...montagem, pecas };
}

/**
 * Põe a peça numa POSE DE MUNDO e reancora tudo em volta. É o único caminho de
 * rotação do app (espeque §8.11).
 *
 * ⚠️ REGRA D3 — ROTAÇÃO NUNCA ARRASTA. Girar uma peça não move nenhuma outra.
 * O que faz isso funcionar é uma observação simples sobre peça simétrica: quando
 * ela gira, **outro conector vai parar exatamente na pose que o primeiro tinha**.
 * Então nada precisa se mexer — basta reancorar:
 *
 *   · a junta da PRÓPRIA peça com a mãe (qual conector dela foi parar na junta);
 *   · a junta de cada FILHA (qual face da peça assumiu a pose antiga).
 *
 * É o que o técnico faz no galpão: gira o cubo e reaperta a viga na face que
 * ficou virada pro lado certo.
 *
 * O `giro` de cada junta é achado por TENTATIVA sobre os quatro passos possíveis,
 * em vez de deduzido: são quatro contas baratas, e o resultado é exato por
 * construção em vez de exato por argumento.
 *
 * Recusa (devolve a montagem intacta) quando a pose pedida **solta a peça da
 * mãe** — nenhum conector dela cai na junta. Com a regra D6 valendo, isso não
 * acontece pela UI; a guarda existe pra que uma chamada errada falhe parada, e
 * não desmonte a estrutura.
 */
export function definirPose(montagem, id, matrizNova) {
  const peca = pecaDaMontagem(montagem, id);
  const cat = pecaPorId(peca?.catalogoId);
  if (!peca || !cat || !matrizNova) return montagem;

  const antes = cat.conectores.map((c) => conectorNoMundo(c, peca.matriz));
  const depois = cat.conectores.map((c) => conectorNoMundo(c, matrizNova));

  // ── 1 · a junta da própria peça com a mãe ──
  let encaixe = peca.encaixe;
  const usados = new Set();
  if (encaixe) {
    const mae = pecaDaMontagem(montagem, encaixe.de);
    const maeCon = conectorPorId(pecaPorId(mae?.catalogoId), encaixe.conAlvo);
    if (!mae || !maeCon) return montagem;
    const naJunta = conectorNoMundo(maeCon, mae.matriz);

    let achou = null;
    for (const c of depois) {
      for (let k = 0; k < PASSOS_DE_GIRO; k++) {
        const local = conectorPorId(cat, c.id);
        if (mesmaMatriz(resolverEncaixe(naJunta, local, k).matriz, matrizNova)) {
          achou = { conNovo: c.id, giro: k };
          break;
        }
      }
      if (achou) break;
    }
    if (!achou) return montagem; // a pose soltaria a peça da mãe: recusa
    encaixe = { ...encaixe, ...achou };
    usados.add(achou.conNovo);
  }

  // ── 2 · as juntas das filhas ──
  const pecas = montagem.pecas.map((p) => {
    if (p.id === id) return { ...p, encaixe, matriz: arredMatriz(matrizNova) };
    if (p.encaixe?.de !== id) return p;
    const alvoAntigo = antes.find((c) => c.id === p.encaixe.conAlvo);
    const equivalente = alvoAntigo
      ? depois.find((c) => !usados.has(c.id) && mesmaPose(c, alvoAntigo))
      : null;
    if (!equivalente) return p; // sem face pra reancorar: a filha acompanha
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

  return recalcular({ ...montagem, pecas });
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
