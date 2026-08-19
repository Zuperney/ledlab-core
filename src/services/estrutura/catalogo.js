// services/estrutura/catalogo.js — as peças de box truss que existem no galpão.
//
// Espeque: docs/estrutura3d-spec.md §3.2 (o catálogo v1) e §5 (modelo de dados).
// Geometria MEDIDA no modelo SketchUp da casa: docs/estrutura3d-pesquisa.md §4.8.
//
// DUAS PROCEDÊNCIAS SEPARADAS, de propósito:
// - `geometria` — medida na malha do modelo da casa (linha próxima à Feeling).
//   Confiável pra desenhar; NÃO é especificação do fabricante.
// - `peso` — proxy de catálogo de terceiro (Auratec), NENHUM conferido. O dono
//   troca peça por peça na balança. Campo vazio ou não conferido sai declarado no
//   Caderno; nunca vira "ok" silencioso (mesma régua do `pwrMax`).
//
// UNIDADE: milímetro. Peso em kg.

// ── o sistema (a seção) ──────────────────────────────────────
// O `sistema` é o que define se duas peças encaixam. Hoje só existe o 300; o
// campo fica porque o dia do P50 não pode virar retrabalho no motor e nos
// projetos já salvos (espeque §3.2.2).
export const SISTEMAS = {
  300: {
    id: 300,
    nome: "P30",
    ladoMm: 300, // seção externa — medido 299,6
    entreEixosMm: 250, // medido; confirmado por 250 × √2 = 353,6 na diagonal
    banzoMm: 50, // desenho. O tubo REAL é 2" = 50,8 (espeque §5.2.1)
    banzoRealPol: 2,
    diagonalMm: 40,
    // A ESCADA (travessas horizontais) fica em DUAS faces opostas, a cada 500 mm
    // — e as duas são DEFASADAS de 250: uma começa em 0, a outra em 250.
    // (Foi isto que enganou a primeira leitura da malha: somando as duas faces
    // num histograma só, duas escadas de 500 defasadas leem como uma de 250.)
    passoEscadaMm: 500,
    defasagemEscadaMm: 250,
    // O ziguezague das diagonais tem passo PRÓPRIO, menor que o das travessas —
    // e é ele que explica os 51° medidos na malha: atan(250 / 200) = 51,3°.
    // Sem esse passo separado a diagonal sairia a 45° e a barra ficaria "quase".
    passoDiagonalMm: 200,
    cabeceiraMm: 25,
    // A EMENDA é uma CHAPA DE TOPO FECHADA — a seção inteira tapada, sem furo,
    // sem parafuso desenhado. Decisão do dono (19/08), e ele tem razão: o que
    // precisa ser comunicado não é a ferragem, é que **a peça ACABA ali**.
    // Duas chapas encostadas = uma junta, e isso se lê de longe. Detalhe de
    // furação seria produto, e produto não é o que o desenho está entregando.
    // (A peça real é *plated* / bolt plate, com 4 parafusos de 5/8" por junta —
    // eles estão na LISTA DE MATERIAL, que é onde importam.)
    placaEspessuraMm: 14,
    banzos: 4,
  },
};

// 4 banzos ⇒ a peça gira de 90 em 90 graus em torno do eixo do encaixe.
export const PASSOS_DE_GIRO = 4;
export const ANGULO_DE_GIRO = (2 * Math.PI) / PASSOS_DE_GIRO;

// Uma junta = um jogo. Fonte: Auratec e MultItens publicam a mesma especificação.
export const PARAFUSARIA_POR_JUNTA = Object.freeze({
  parafuso: { qtd: 4, spec: 'parafuso estrutural 5/8" × 2" ASTM A325, chave 27' },
  porca: { qtd: 4, spec: 'porca 5/8" ASTM A194-2H, chave 27' },
  arruela: { qtd: 8, spec: 'arruela 5/8" lisa ASTM F-436' },
});

const GEO_MODELO = Object.freeze({
  fonte: "modelo SketchUp da casa (linha próxima à Feeling)",
  medido: true,
});

const peso = (kg, fonte, incluiParafusos = false) => ({
  kg,
  fonte,
  conferido: false,
  incluiParafusos,
});

// ── conectores ───────────────────────────────────────────────
// { id, pos, dir, rolo }
// - `dir`  — a normal que SAI do encaixe (unitária)
// - `rolo` — a referência de rolagem: qual banzo é "o de cima". Sem ele a peça
//   encaixa girada e os banzos não alinham. É o campo que todo mundo esquece.
//
// Origem local: barra e cubo são CENTRADOS na origem; a sapata tem origem no
// chão (é o que faz sentido pra quem apoia).

const conectoresBarra = (comprimentoMm) => [
  { id: "a", pos: [0, -comprimentoMm / 2, 0], dir: [0, -1, 0], rolo: [0, 0, 1] },
  { id: "b", pos: [0, comprimentoMm / 2, 0], dir: [0, 1, 0], rolo: [0, 0, 1] },
];

// Cubo de 5 faces: a face fechada é ORIENTÁVEL — o técnico gira o cubo ao
// encaixar, então o app não precisa cravar qual vem tapada de fábrica. Aqui ela
// é a de baixo (−Y), que é o que o modelo da casa sugere.
const conectoresCubo = (ladoMm) => {
  const h = ladoMm / 2;
  return [
    { id: "topo", pos: [0, h, 0], dir: [0, 1, 0], rolo: [0, 0, 1] },
    { id: "norte", pos: [0, 0, -h], dir: [0, 0, -1], rolo: [0, 1, 0] },
    { id: "sul", pos: [0, 0, h], dir: [0, 0, 1], rolo: [0, 1, 0] },
    { id: "leste", pos: [h, 0, 0], dir: [1, 0, 0], rolo: [0, 1, 0] },
    { id: "oeste", pos: [-h, 0, 0], dir: [-1, 0, 0], rolo: [0, 1, 0] },
  ];
};

const conectoresSapata = (alturaMm) => [
  { id: "topo", pos: [0, alturaMm, 0], dir: [0, 1, 0], rolo: [0, 0, 1] },
];

// ── as peças ─────────────────────────────────────────────────
// Os comprimentos são os do ESTOQUE do dono (espeque §3.2), e as medidas são
// NOMINAIS e fechadas: 2 m é 2000 mm. O modelo SketchUp ensina a forma, não a cota.
const BARRAS = [
  { mm: 200, kg: 6, fonte: "Auratec AL-P30" },
  { mm: 300, kg: 7, fonte: "interpolado entre 0,2 e 0,5 m (Auratec)" },
  { mm: 500, kg: 10, fonte: "Auratec AL-P30" },
  { mm: 600, kg: 11, fonte: "interpolado entre 0,5 e 1 m (Auratec)" },
  { mm: 1000, kg: 13, fonte: "Auratec AL-P30" },
  { mm: 2000, kg: 22, fonte: "Auratec AL-P30" },
  { mm: 3000, kg: 30, fonte: "Auratec AL-P30" },
  { mm: 4000, kg: 38, fonte: "Auratec AL-P30" },
];

const rotuloComprimento = (mm) =>
  mm % 1000 === 0 ? `${mm / 1000} m` : `${(mm / 1000).toFixed(2).replace(".", ",")} m`;

export const CATALOGO = Object.freeze([
  ...BARRAS.map((b) =>
    Object.freeze({
      id: `p30-b${String(b.mm).padStart(4, "0")}`,
      sistema: 300,
      linha: "P30",
      tipo: "barra",
      // ⚠️ a barra de 0,3 m e o cubo têm os dois 300 mm. Nome e id distintos
      // desde o começo: a barra conecta em 2 faces, o cubo em 5. Confundir as
      // duas manda a peça errada pro caminhão.
      nome: `Barra P30 ${rotuloComprimento(b.mm)}`,
      comprimentoMm: b.mm,
      geometria: GEO_MODELO,
      peso: peso(b.kg, b.fonte),
      conectores: Object.freeze(conectoresBarra(b.mm)),
    }),
  ),
  Object.freeze({
    id: "p30-cubo5",
    sistema: 300,
    linha: "P30",
    tipo: "cubo",
    nome: "Cubo P30 5 faces",
    ladoMm: 300,
    facesAbertas: 5,
    geometria: GEO_MODELO,
    peso: peso(12, "Auratec AL-P30 cubo 5 faces"),
    conectores: Object.freeze(conectoresCubo(300)),
  }),
  Object.freeze({
    id: "p30-sapata-baixa",
    sistema: 300,
    linha: "P30",
    tipo: "sapata",
    nome: "Sapata baixa P30",
    larguraMm: 750, // nominal Feeling; medido 740 no modelo
    alturaMm: 55,
    geometria: GEO_MODELO,
    peso: peso(8, "proxy: base 800×800 Auratec"),
    conectores: Object.freeze(conectoresSapata(55)),
  }),
]);

const PORID = new Map(CATALOGO.map((p) => [p.id, p]));

export const pecaPorId = (id) => PORID.get(id) ?? null;
export const conectorPorId = (peca, id) =>
  peca?.conectores?.find((c) => c.id === id) ?? null;
export const pecasDoSistema = (sistema) =>
  CATALOGO.filter((p) => p.sistema === sistema);

// ── o ziguezague das diagonais ───────────────────────────────
// Divide o comprimento num número INTEIRO de segmentos de ~`passoDiagonalMm`,
// pra que o ziguezague comece e termine exatamente nas pontas — diagonal
// sobrando na ponta é o erro que denuncia desenho de quem não é do ramo.
// Devolve as posições ao longo do comprimento, de 0 a `comprimentoMm`.
export function passosDaDiagonal(comprimentoMm, alvoMm = SISTEMAS[300].passoDiagonalMm) {
  const L = Number(comprimentoMm) || 0;
  if (L <= 0 || !(alvoMm > 0)) return [];
  const n = Math.max(1, Math.round(L / alvoMm));
  return Array.from({ length: n + 1 }, (_, i) => (L * i) / n);
}

// o ângulo que a diagonal faz com o EIXO da barra, em graus — consequência do
// passo e do entre-eixos, nunca um número solto
export function anguloDiagonalGraus(comprimentoMm, sistema = 300) {
  const s = SISTEMAS[sistema];
  const passos = passosDaDiagonal(comprimentoMm, s.passoDiagonalMm);
  if (passos.length < 2) return 0;
  return (Math.atan2(s.entreEixosMm, passos[1] - passos[0]) * 180) / Math.PI;
}

// ── caixa envolvente local de uma peça ───────────────────────
// Barra e cubo são centrados na origem; a sapata tem origem no CHÃO. Quem calcula
// as medidas gerais da estrutura precisa saber disso, e é aqui que mora.
export function caixaLocal(peca) {
  if (!peca) return null;
  const lado = SISTEMAS[peca.sistema]?.ladoMm ?? 0;
  if (peca.tipo === "barra") {
    const h = peca.comprimentoMm / 2;
    const m = lado / 2;
    return { min: [-m, -h, -m], max: [m, h, m] };
  }
  if (peca.tipo === "cubo") {
    const m = peca.ladoMm / 2;
    return { min: [-m, -m, -m], max: [m, m, m] };
  }
  if (peca.tipo === "sapata") {
    const m = peca.larguraMm / 2;
    return { min: [-m, 0, -m], max: [m, peca.alturaMm, m] };
  }
  return null;
}

// ── geometria gerada: a escada ───────────────────────────────
// As travessas de UMA face, ao longo do comprimento. A outra face usa o mesmo
// passo com `inicio = defasagemEscadaMm` — é a defasagem que dá o desenho
// alternado que se vê na peça real.
//
// ⚠️ CORREÇÃO 19/08 (dono): a primeira versão punha as travessas a cada 250 mm
// com a "sobra no meio". Era leitura errada da malha — o histograma somava as
// duas faces. São duas escadas de 500 defasadas de 250.
export function escadaDaBarra(
  comprimentoMm,
  passoMm = SISTEMAS[300].passoEscadaMm,
  inicioMm = 0,
) {
  const L = Number(comprimentoMm) || 0;
  if (L <= 0 || !(passoMm > 0) || inicioMm > L) return [];
  const out = [];
  for (let y = inicioMm; y <= L + 1e-6; y += passoMm) out.push(Math.round(y * 1e6) / 1e6);
  return out;
}

/** as duas escadas da barra: [face que começa em 0, face defasada] */
export function escadasDaBarra(comprimentoMm, sistema = 300) {
  const s = SISTEMAS[sistema];
  return [
    escadaDaBarra(comprimentoMm, s.passoEscadaMm, 0),
    escadaDaBarra(comprimentoMm, s.passoEscadaMm, s.defasagemEscadaMm),
  ];
}

// ── as categorias ────────────────────────────────────────────
// O galpão é organizado por CATEGORIA, não por ordem de cadastro: barra com
// barra, cubo com cubo, base com base. É assim que o material é separado na
// prateleira e no caminhão, então é assim que a paleta mostra.
export const CATEGORIAS = Object.freeze([
  { id: "barra", nome: "Barras", plural: "barras" },
  { id: "cubo", nome: "Cubos", plural: "cubos" },
  { id: "sapata", nome: "Bases", plural: "bases" },
]);

/**
 * O catálogo agrupado, na ordem das categorias.
 *
 * Categoria vazia não aparece. E peça de um tipo que ninguém cadastrou aqui cai
 * num grupo "Outras" em vez de sumir — catálogo que esconde peça manda o
 * caminhão embora sem ela.
 */
export function catalogoPorCategoria(pecas = CATALOGO) {
  const grupos = CATEGORIAS
    .map((c) => ({ ...c, pecas: pecas.filter((p) => p.tipo === c.id) }))
    .filter((c) => c.pecas.length);
  const conhecidos = new Set(CATEGORIAS.map((c) => c.id));
  const sobra = pecas.filter((p) => !conhecidos.has(p.tipo));
  return sobra.length
    ? [...grupos, { id: "outras", nome: "Outras", plural: "outras", pecas: sobra }]
    : grupos;
}
