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
    passoNoMm: 250, // espaçamento dos nós ao longo da barra
    anguloDiagonalGraus: 51,
    cabeceiraMm: 25,
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

// ── geometria gerada: os nós da barra ────────────────────────
// Os nós ficam a `passoNoMm` CONTADOS DE CADA PONTA, e a sobra fica no MEIO.
// É assim que o modelo da casa está desenhado e é assim que truss se fabrica —
// quem não é do ramo deixa a sobra na ponta, e o desenho se entrega.
//
// Devolve as posições ao longo do comprimento, de 0 a `comprimentoMm`, ordenadas.
export function nosDaBarra(comprimentoMm, passoNoMm = SISTEMAS[300].passoNoMm) {
  const L = Number(comprimentoMm) || 0;
  if (L <= 0) return [];
  if (!(passoNoMm > 0) || L <= passoNoMm) return [0, L];
  const nos = new Set([0, L]);
  const inteiros = Math.floor(L / passoNoMm);
  // metade dos vãos vem de baixo, metade de cima; o vão central absorve a sobra
  const debaixo = Math.ceil(inteiros / 2);
  const decima = inteiros - debaixo;
  for (let i = 1; i <= debaixo; i++) nos.add(i * passoNoMm);
  for (let i = 1; i <= decima; i++) nos.add(L - i * passoNoMm);
  return [...nos].sort((a, b) => a - b);
}
