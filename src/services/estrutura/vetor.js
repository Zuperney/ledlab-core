// services/estrutura/vetor.js — a álgebra do módulo de estrutura 3D.
//
// POR QUE NÃO USAR A MATEMÁTICA DO three.js: o espeque previa usar `Vector3` e
// `Quaternion` do three, mas o motor precisa rodar TAMBÉM no relatório — que abre
// no celular e é 100% offline. Como o chunk 3D fica FORA do precache do service
// worker (espeque §7.2), qualquer `import` de `three` aqui arrastaria a biblioteca
// inteira pro chunk principal e quebraria as duas coisas de uma vez. São ~10
// operações; escrevê-las custa menos que a dependência.
//
// CONVENÇÕES
// - vetor  = [x, y, z]                 (array simples, serializa em JSON de graça)
// - quatérnio = [x, y, z, w]
// - matriz = 16 floats em COLUNA-MAIOR, idêntico ao `Matrix4.toArray()` do three,
//   pra que a camada de vista faça `fromArray()` sem conversão nenhuma.
// - UNIDADE: MILÍMETRO em todo o motor. O catálogo é em mm, o Caderno imprime em
//   mm/m e só a cena converte pra unidade de mundo.

export const EPS = 1e-9;

// ── vetores ──────────────────────────────────────────────────
export const soma = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
export const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
export const escala = (a, k) => [a[0] * k, a[1] * k, a[2] * k];
export const oposto = (a) => [-a[0], -a[1], -a[2]];
export const escalar = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const vetorial = (a, b) => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
export const comprimento = (a) => Math.hypot(a[0], a[1], a[2]);
export const distancia = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

export function unitario(a) {
  const c = comprimento(a);
  if (c < EPS) return [0, 0, 0];
  return [a[0] / c, a[1] / c, a[2] / c];
}

// ── quatérnios ───────────────────────────────────────────────
export const IDENTIDADE = [0, 0, 0, 1];

export function qNormalizar(q) {
  const c = Math.hypot(q[0], q[1], q[2], q[3]);
  if (c < EPS) return [...IDENTIDADE];
  return [q[0] / c, q[1] / c, q[2] / c, q[3] / c];
}

// rotação de `ang` radianos em torno de `eixo` (que precisa ser unitário)
export function qDoEixo(eixo, ang) {
  const e = unitario(eixo);
  const s = Math.sin(ang / 2);
  return [e[0] * s, e[1] * s, e[2] * s, Math.cos(ang / 2)];
}

// a rotação mais curta que leva o vetor unitário `de` até `para`.
// O caso degenerado (vetores OPOSTOS) tem infinitos eixos válidos — aqui a gente
// escolhe um perpendicular qualquer, de propósito: quem chama SEMPRE aplica um
// rolo explícito depois (ver encaixe.js), então a escolha arbitrária não vaza.
export function qEntreVetores(de, para) {
  const a = unitario(de);
  const b = unitario(para);
  let r = escalar(a, b) + 1;
  if (r < 1e-6) {
    r = 0;
    // eixo perpendicular estável: evita o componente de maior módulo
    return qNormalizar(
      Math.abs(a[0]) > Math.abs(a[2])
        ? [-a[1], a[0], 0, r]
        : [0, -a[2], a[1], r],
    );
  }
  const c = vetorial(a, b);
  return qNormalizar([c[0], c[1], c[2], r]);
}

// composição: aplica `b` e DEPOIS `a` (mesma ordem do `premultiply` do three)
export function qMultiplicar(a, b) {
  const [ax, ay, az, aw] = a;
  const [bx, by, bz, bw] = b;
  return [
    aw * bx + ax * bw + ay * bz - az * by,
    aw * by + ay * bw + az * bx - ax * bz,
    aw * bz + az * bw + ax * by - ay * bx,
    aw * bw - ax * bx - ay * by - az * bz,
  ];
}

export function qAplicar(q, v) {
  const [x, y, z] = v;
  const [qx, qy, qz, qw] = q;
  const tx = 2 * (qy * z - qz * y);
  const ty = 2 * (qz * x - qx * z);
  const tz = 2 * (qx * y - qy * x);
  return [
    x + qw * tx + qy * tz - qz * ty,
    y + qw * ty + qz * tx - qx * tz,
    z + qw * tz + qx * ty - qy * tx,
  ];
}

// `q` e `−q` são a MESMA rotação — comparar componente a componente dá falso
// negativo. Esta função compara o EFEITO sobre os três eixos base.
export function qIguais(a, b, tol = 1e-6) {
  for (const base of [[1, 0, 0], [0, 1, 0], [0, 0, 1]]) {
    if (distancia(qAplicar(a, base), qAplicar(b, base)) > tol) return false;
  }
  return true;
}

// ── matrizes (coluna-maior, compatível com THREE.Matrix4) ────
export const MATRIZ_IDENTIDADE = Object.freeze([
  1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1,
]);

export function matriz(q, pos) {
  const [x, y, z, w] = q;
  const x2 = x + x, y2 = y + y, z2 = z + z;
  const xx = x * x2, xy = x * y2, xz = x * z2;
  const yy = y * y2, yz = y * z2, zz = z * z2;
  const wx = w * x2, wy = w * y2, wz = w * z2;
  return [
    1 - (yy + zz), xy + wz, xz - wy, 0,
    xy - wz, 1 - (xx + zz), yz + wx, 0,
    xz + wy, yz - wx, 1 - (xx + yy), 0,
    pos[0], pos[1], pos[2], 1,
  ];
}

// ponto: sofre rotação E translação
export function matPonto(m, v) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14],
  ];
}

// direção: sofre só rotação (a translação não se aplica a um vetor livre)
export function matDirecao(m, v) {
  return [
    m[0] * v[0] + m[4] * v[1] + m[8] * v[2],
    m[1] * v[0] + m[5] * v[1] + m[9] * v[2],
    m[2] * v[0] + m[6] * v[1] + m[10] * v[2],
  ];
}

export const matPosicao = (m) => [m[12], m[13], m[14]];

// ── arredondamento de saída ──────────────────────────────────
// O JSON do projeto precisa ser estável e diffável: sem isso, dois encaixes
// idênticos geram matrizes com lixo na 15ª casa e o sync marca mudança à toa.
export const arred = (n, casas = 6) => {
  const k = 10 ** casas;
  const r = Math.round(n * k) / k;
  return Object.is(r, -0) ? 0 : r;
};
export const arredVetor = (v, casas = 6) => v.map((n) => arred(n, casas));
export const arredMatriz = (m, casas = 6) => m.map((n) => arred(n, casas));
