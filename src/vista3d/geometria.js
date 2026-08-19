// vista3d/geometria.js — a barra de truss desenhada por CÓDIGO.
//
// Espeque: docs/estrutura3d-spec.md §7.4. Medidas: pesquisa §4.8.
//
// POR QUE PROCEDURAL E NÃO UM .GLB:
// - peso de rede ZERO (nenhum arquivo novo pra baixar, nada pra pôr no precache);
// - paramétrico é REQUISITO — são 8 comprimentos hoje e a lista da Feeling tem 23;
// - os conectores já são conhecidos, então some o auto-detector que o TrussTool
//   precisa ter porque escolheu OBJ;
// - se o navegador matar o contexto WebGL, a cena se reconstrói do zero.
//
// A geometria é gerada UMA vez por (peça × nível) e fica em cache: com
// InstancedMesh, cada barra a mais na cena custa 64 bytes (uma matriz).

import { BoxGeometry, CylinderGeometry, Matrix4, Quaternion, Vector3 } from "three";
import { mergeGeometries } from "three/examples/jsm/utils/BufferGeometryUtils.js";
import {
  SISTEMAS, nosDaBarra, passosDaDiagonal, pecaPorId,
} from "../services/estrutura/catalogo.js";

// Níveis de detalhe. O nº 3 é uma CAIXA: de longe, uma treliça e um bloco são o
// mesmo punhado de pixels, e a caixa custa 12 triângulos contra 896.
export const NIVEIS = [
  { id: 0, radial: 8, diagonais: true, travessas: true },
  { id: 1, radial: 5, diagonais: true, travessas: true },
  { id: 2, radial: 3, diagonais: false, travessas: true },
  { id: 3, caixa: true },
];

const CIMA = new Vector3(0, 1, 0);
const cache = new Map();

/** um tubo do ponto A ao ponto B, já orientado */
function tubo(a, b, raio, radial) {
  const eixo = new Vector3().subVectors(b, a);
  const comprimento = eixo.length();
  if (comprimento < 1e-6) return null;
  const g = new CylinderGeometry(raio, raio, comprimento, radial, 1, true);
  const q = new Quaternion().setFromUnitVectors(CIMA, eixo.clone().normalize());
  const meio = new Vector3().addVectors(a, b).multiplyScalar(0.5);
  g.applyMatrix4(new Matrix4().compose(meio, q, new Vector3(1, 1, 1)));
  return g;
}

/**
 * A barra: 4 banzos + travessas nos nós + ziguezague de diagonais.
 * Local: eixo ao longo de Y, CENTRADA na origem (igual aos conectores do catálogo).
 */
function geometriaBarra(peca, nivel) {
  const s = SISTEMAS[peca.sistema];
  const L = peca.comprimentoMm;
  const meia = L / 2;
  const e = s.entreEixosMm / 2; // 125
  const rBanzo = s.banzoMm / 2;
  const rDiag = s.diagonalMm / 2;
  const partes = [];

  // 4 banzos, nos cantos do quadrado de 250
  for (const x of [-e, e]) {
    for (const z of [-e, e]) {
      partes.push(tubo(new Vector3(x, -meia, z), new Vector3(x, meia, z), rBanzo, nivel.radial));
    }
  }

  // travessas: tubos ao longo de X, nas duas faces z = ±e, em cada nó.
  // É o que a malha da casa mostra — muitos tubos em X, poucos em Z.
  if (nivel.travessas) {
    for (const y of nosDaBarra(L, s.passoNoMm)) {
      const yy = y - meia;
      for (const z of [-e, e]) {
        partes.push(tubo(new Vector3(-e, yy, z), new Vector3(e, yy, z), rDiag, Math.max(3, nivel.radial - 2)));
      }
    }
  }

  // diagonais: ziguezague nas faces x = ±e, com PASSO PRÓPRIO (é ele que dá os
  // 51° medidos). O sentido alterna entre as duas faces pra não ficarem paralelas.
  if (nivel.diagonais) {
    const passos = passosDaDiagonal(L, s.passoDiagonalMm);
    for (const [i, x] of [-e, e].entries()) {
      for (let k = 0; k < passos.length - 1; k++) {
        const sobe = (k + i) % 2 === 0;
        const z0 = sobe ? -e : e;
        const z1 = sobe ? e : -e;
        partes.push(
          tubo(
            new Vector3(x, passos[k] - meia, z0),
            new Vector3(x, passos[k + 1] - meia, z1),
            rDiag,
            Math.max(3, nivel.radial - 2),
          ),
        );
      }
    }
  }

  return mergeGeometries(partes.filter(Boolean), false);
}

/** O cubo: 4 banzos curtos nos cantos + travessas nas 4 faces. */
function geometriaCubo(peca, nivel) {
  const s = SISTEMAS[peca.sistema];
  const meia = peca.ladoMm / 2;
  const e = s.entreEixosMm / 2;
  const rBanzo = s.banzoMm / 2;
  const rDiag = s.diagonalMm / 2;
  const partes = [];

  for (const x of [-e, e]) {
    for (const z of [-e, e]) {
      partes.push(tubo(new Vector3(x, -meia, z), new Vector3(x, meia, z), rBanzo, nivel.radial));
    }
  }
  if (nivel.travessas) {
    for (const y of [-meia + rBanzo, meia - rBanzo]) {
      for (const z of [-e, e]) {
        partes.push(tubo(new Vector3(-e, y, z), new Vector3(e, y, z), rDiag, 3));
      }
      for (const x of [-e, e]) {
        partes.push(tubo(new Vector3(x, y, -e), new Vector3(x, y, e), rDiag, 3));
      }
    }
  }
  return mergeGeometries(partes.filter(Boolean), false);
}

/** A sapata: chapa quadrada com origem no CHÃO + o tarugo que recebe a barra. */
function geometriaSapata(peca, nivel) {
  const s = SISTEMAS[peca.sistema];
  const e = s.entreEixosMm / 2;
  const chapa = new BoxGeometry(peca.larguraMm, peca.alturaMm, peca.larguraMm);
  chapa.translate(0, peca.alturaMm / 2, 0);
  const partes = [chapa];
  // 4 tocos curtos que dão a "pegada" de 300 onde a barra encaixa
  for (const x of [-e, e]) {
    for (const z of [-e, e]) {
      partes.push(
        tubo(
          new Vector3(x, peca.alturaMm, z),
          new Vector3(x, peca.alturaMm + 40, z),
          s.banzoMm / 2,
          nivel.radial ?? 6,
        ),
      );
    }
  }
  return mergeGeometries(partes.filter(Boolean), false);
}

/** caixa simples — o nível mais pobre, e o que salva a cena grande */
function geometriaCaixa(peca) {
  const s = SISTEMAS[peca.sistema];
  if (peca.tipo === "barra") return new BoxGeometry(s.ladoMm, peca.comprimentoMm, s.ladoMm);
  if (peca.tipo === "cubo") return new BoxGeometry(peca.ladoMm, peca.ladoMm, peca.ladoMm);
  const g = new BoxGeometry(peca.larguraMm, peca.alturaMm, peca.larguraMm);
  g.translate(0, peca.alturaMm / 2, 0);
  return g;
}

/**
 * A geometria de uma peça do catálogo, num nível de detalhe.
 * Cacheada por (peça × nível) — é o que torna o InstancedMesh possível.
 */
export function geometriaDaPeca(catalogoId, nivelId = 0) {
  const chave = `${catalogoId}#${nivelId}`;
  const pronta = cache.get(chave);
  if (pronta) return pronta;

  const peca = pecaPorId(catalogoId);
  if (!peca) return null;
  const nivel = NIVEIS[Math.min(Math.max(nivelId, 0), NIVEIS.length - 1)];

  let g;
  if (nivel.caixa) g = geometriaCaixa(peca);
  else if (peca.tipo === "barra") g = geometriaBarra(peca, nivel);
  else if (peca.tipo === "cubo") g = geometriaCubo(peca, nivel);
  else g = geometriaSapata(peca, nivel);

  g.computeBoundingSphere();
  cache.set(chave, g);
  return g;
}

/** libera a VRAM — chamado quando o editor desmonta */
export function limparCache() {
  for (const g of cache.values()) g.dispose();
  cache.clear();
}
