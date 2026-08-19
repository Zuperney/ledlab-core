// services/estrutura/snap.js — achar em qual conector a peça vai grudar.
//
// Espeque: docs/estrutura3d-spec.md §6.1.
//
// Busca em GRADE ESPACIAL, não em O(n²). Uma estrutura no teto do escopo tem
// ~2.000 peças = ~4.000 conectores; varrer todos a cada quadro do arraste
// derrubaria o editor. A grade reduz cada consulta a algumas dezenas.
//
// A TOLERÂNCIA aqui é em MILÍMETROS. Quem chama (a vista) é que sabe converter a
// tolerância de tela em mm de mundo e passar o MAIOR dos dois — com a câmera
// afastada, tolerância só em mm vira impossível de acertar com o mouse.

import { afastamento, enfrentamento, podeEncaixar } from "./encaixe.js";

export const CELULA_PADRAO_MM = 500;
export const RAIO_PADRAO_MM = 200;

const chaveCelula = (x, y, z) => `${x},${y},${z}`;

/**
 * Indexa conectores de mundo numa grade de células cúbicas.
 * @param {Array} conectores conectores JÁ no mundo (ver montagem.conectores)
 */
export function criarGrade(conectores, celulaMm = CELULA_PADRAO_MM) {
  const celula = celulaMm > 0 ? celulaMm : CELULA_PADRAO_MM;
  const mapa = new Map();
  for (const c of conectores) {
    const k = chaveCelula(
      Math.floor(c.pos[0] / celula),
      Math.floor(c.pos[1] / celula),
      Math.floor(c.pos[2] / celula),
    );
    const balde = mapa.get(k);
    if (balde) balde.push(c);
    else mapa.set(k, [c]);
  }
  return { celula, mapa, total: conectores.length };
}

/** conectores dentro de `raioMm` de `pos` (varre só as células vizinhas) */
export function proximos(grade, pos, raioMm = RAIO_PADRAO_MM) {
  const { celula, mapa } = grade;
  const alcance = Math.max(1, Math.ceil(raioMm / celula));
  const cx = Math.floor(pos[0] / celula);
  const cy = Math.floor(pos[1] / celula);
  const cz = Math.floor(pos[2] / celula);
  const r2 = raioMm * raioMm;
  const out = [];
  for (let i = -alcance; i <= alcance; i++) {
    for (let j = -alcance; j <= alcance; j++) {
      for (let k = -alcance; k <= alcance; k++) {
        const balde = mapa.get(chaveCelula(cx + i, cy + j, cz + k));
        if (!balde) continue;
        for (const c of balde) {
          const dx = c.pos[0] - pos[0];
          const dy = c.pos[1] - pos[1];
          const dz = c.pos[2] - pos[2];
          if (dx * dx + dy * dy + dz * dz <= r2) out.push(c);
        }
      }
    }
  }
  return out;
}

/**
 * O melhor candidato pra encaixar `movel` (conector da peça em movimento, no mundo).
 *
 * Filtra por: conector LIVRE · mesmo SISTEMA · normais que se ENFRENTAM · dentro
 * do raio. Ordena por distância e, em empate técnico (10 mm), pelo melhor
 * enfrentamento — dois conectores à mesma distância, o que está mais "de frente"
 * é o que o técnico quis.
 *
 * @returns {{alvo:object, distancia:number, enfrentamento:number}|null}
 */
export function melhorCandidato(grade, movel, opcoes = {}) {
  const {
    raioMm = RAIO_PADRAO_MM,
    sistema = movel.sistema,
    ignorarPecas = [],
    toleranciaEnfrentamento = -0.5,
  } = opcoes;

  const ignorar = new Set(ignorarPecas);
  const candidatos = [];

  for (const alvo of proximos(grade, movel.pos, raioMm)) {
    if (alvo.ocupado) continue;
    if (ignorar.has(alvo.pecaId)) continue;
    if (alvo.chave && movel.chave && alvo.chave === movel.chave) continue;
    if (
      !podeEncaixar(alvo, movel, {
        sistemaA: alvo.sistema,
        sistemaB: sistema,
        tolerancia: toleranciaEnfrentamento,
      })
    ) {
      continue;
    }
    candidatos.push({
      alvo,
      distancia: afastamento(alvo, movel),
      enfrentamento: enfrentamento(alvo, movel),
    });
  }

  if (!candidatos.length) return null;
  candidatos.sort((a, b) => {
    if (Math.abs(a.distancia - b.distancia) > 10) return a.distancia - b.distancia;
    return b.enfrentamento - a.enfrentamento;
  });
  return candidatos[0];
}
