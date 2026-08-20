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
  SISTEMAS, escadasDaBarra, passosDaDiagonal, pecaPorId,
} from "../services/estrutura/catalogo.js";

// Níveis de detalhe. O nº 3 é uma CAIXA: de longe, uma treliça e um bloco são o
// mesmo punhado de pixels, e a caixa custa 12 triângulos contra 896.
export const NIVEIS = [
  { id: 0, radial: 8, diagonais: true, travessas: true, flanges: true },
  { id: 1, radial: 5, diagonais: true, travessas: true, flanges: true },
  { id: 2, radial: 3, diagonais: false, travessas: true, flanges: false },
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
 * A CHAPA DE TOPO — a seção inteira tapada na ponta da peça.
 *
 * Fechada e sem detalhe, de propósito. Ela precisa comunicar UMA coisa: **a peça
 * acaba aqui**. Duas chapas encostadas viram uma junta visível a três metros, e
 * é isso que o desenho tem que entregar. Furo e parafuso seriam produto — a
 * ferragem já está contada na lista de material, que é onde ela decide alguma
 * coisa (quantos levar na caixa).
 *
 * `centro` é o ponto da face; `eixo` é a normal que sai da peça ali.
 */
function chapaDeTopo(s, centro, eixo) {
  const t = s.placaEspessuraMm;
  const dims = [0, 1, 2].map((i) => (Math.abs(eixo[i]) > 0.5 ? t : s.ladoMm));
  const g = new BoxGeometry(dims[0], dims[1], dims[2]);
  // recuada meia espessura: a chapa fica DENTRO do comprimento nominal, senão a
  // peça de 2 m mediria 2,028 m na cena e a cota do Caderno mentiria
  g.translate(...[0, 1, 2].map((i) => centro[i] - eixo[i] * (t / 2)));
  return g;
}

/**
 * A barra: 4 banzos + a escada + ziguezague de diagonais + flanges nas pontas.
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

  // A ESCADA: travessas ao longo de X, nas duas faces z = ±e, a cada 500 mm —
  // e as duas DEFASADAS de 250 (uma começa em 0, a outra em 250). Correção do
  // dono (19/08): a primeira versão punha tudo a cada 250 nas duas faces.
  if (nivel.travessas) {
    const [escadaA, escadaB] = escadasDaBarra(L, peca.sistema);
    for (const [escada, z] of [[escadaA, -e], [escadaB, e]]) {
      for (const y of escada) {
        partes.push(
          tubo(new Vector3(-e, y - meia, z), new Vector3(e, y - meia, z), rDiag, Math.max(3, nivel.radial - 2)),
        );
      }
    }
  }

  // Os "V": ziguezague nas faces x = ±e, com PASSO PRÓPRIO (é ele que dá os 51°
  // medidos). Os dois lados ficam nas MESMAS posições — não são espelhados.
  if (nivel.diagonais) {
    const passos = passosDaDiagonal(L, s.passoDiagonalMm);
    for (const x of [-e, e]) {
      for (let k = 0; k < passos.length - 1; k++) {
        const sobe = k % 2 === 0;
        partes.push(
          tubo(
            new Vector3(x, passos[k] - meia, sobe ? -e : e),
            new Vector3(x, passos[k + 1] - meia, sobe ? e : -e),
            rDiag,
            Math.max(3, nivel.radial - 2),
          ),
        );
      }
    }
  }

  if (nivel.flanges) {
    for (const lado of [-1, 1]) {
      partes.push(chapaDeTopo(s, [0, lado * meia, 0], [0, lado, 0]));
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
  // chapa em toda face ABERTA — é onde vai haver junta
  if (nivel.flanges) {
    for (const c of peca.conectores) {
      partes.push(chapaDeTopo(s, c.dir.map((d) => d * meia), c.dir));
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
  // 4 tocos curtos que dão a "pegada" de 300 onde a barra encaixa, com o flange
  // no topo — é ali que a primeira barra da torre se emenda
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
  // a chapa no topo do tarugo — é ali que a primeira barra da torre se prende
  if (nivel.flanges) {
    partes.push(chapaDeTopo(s, [0, peca.alturaMm + 40, 0], [0, 1, 0]));
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

// ── o painel de LED (E4) ─────────────────────────────────────
// A tela pendurada na estrutura. Não é peça de catálogo: cada uma tem a medida
// da própria parede, então não dá pra instanciar — é uma geometria por painel,
// e são poucos.
//
// A GRADE DE GABINETES é o que faz o desenho valer: uma parede lisa não diz
// quantos gabinetes tem nem onde está a emenda. As linhas ficam levemente à
// FRENTE da face de LED (o +Z local), pra não brigar em z-fighting com ela.

const RIPA_MM = 12; // espessura da linha da grade, em mm de mundo

export function geometriaPainel({ larguraMm, alturaMm, espessuraMm, cols, rows }) {
  const L = Math.max(1, larguraMm);
  const A = Math.max(1, alturaMm);
  const E = Math.max(1, espessuraMm);
  const partes = [new BoxGeometry(L, A, E)];

  const zGrade = E / 2 + RIPA_MM / 2;
  const emenda = (w, h, x, y) => {
    const g = new BoxGeometry(w, h, RIPA_MM);
    g.translate(x, y, zGrade);
    return g;
  };
  // as emendas VERTICAIS (entre colunas) e HORIZONTAIS (entre linhas)
  for (let i = 1; i < (cols || 1); i++) {
    partes.push(emenda(RIPA_MM, A, -L / 2 + (L * i) / cols, 0));
  }
  for (let j = 1; j < (rows || 1); j++) {
    partes.push(emenda(L, RIPA_MM, 0, -A / 2 + (A * j) / rows));
  }
  return mergeGeometries(partes, false);
}
