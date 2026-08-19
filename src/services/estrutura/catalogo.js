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

// ── a taxonomia: CATEGORIA × MODELO ──────────────────────────
// Decisão do dono (19/08/2026): "sem fabricante, somente modelos e categorias".
// O catálogo se organiza por **categoria** (o que a peça É) × **modelo** (qual
// medida dela), e o id largou o prefixo de linha: `p30-b2000` virou `barra-2000`.
//
// POR QUE LARGAR O PREFIXO. `p30` é a LINHA, e linha é dado de CARGA, não de
// identidade — quem monta procura "barra de 2 m", não "P30 b2000". Mas `linha` e
// `sistema` continuam como CAMPOS, e o Caderno imprime a linha: L30, P30 e R30
// são todos 300×300 e encaixam entre si, só que a L30 vale METADE da carga da
// P30 (espeque §2). Sai do id; nunca sai do dado.
//
// ⚠️ A REGRA DO ID é `${categoria}-${modelo}`, e o `modelo` é A MEDIDA quando a
// medida distingue (barra: comprimento em mm, com 4 casas pra ordenar sozinho) ou
// o nome do modelo quando não distingue (cubo: `5f`, o número de faces abertas —
// todo cubo do sistema 300 é 300³; base: `baixa`, que é como o galpão chama).
// O dia em que uma segunda LINHA entrar no mesmo sistema — uma barra L30 de 2 m
// ao lado da P30 de 2 m — quem ganha o qualificador é o MODELO (`2000-leve`),
// nunca volta prefixo de fabricante. O teste de ids únicos é o guarda disso.

/**
 * As categorias, na ordem em que aparecem no seletor e na folha do Caderno.
 * As `futura: true` não têm peça nenhuma ainda — elas moram aqui pra que a ordem
 * não seja renegociada quando entrarem, e pra que fique escrito POR QUE não
 * entraram ainda.
 */
export const CATEGORIAS = Object.freeze([
  Object.freeze({
    id: "barra",
    // a "barra reta" do galpão — o "reta" é implícito enquanto não houver curva.
    // **Nunca "torre"**: no app torre é uma montagem vertical, não uma peça (§2).
    nome: "Barra",
    plural: "Barras",
    descricao: "o segmento reto de box truss",
  }),
  Object.freeze({
    id: "cubo",
    nome: "Cubo",
    plural: "Cubos",
    descricao: "o bloco de canto — resolve L, T, X e cruz com uma peça só",
  }),
  Object.freeze({
    id: "base",
    nome: "Base",
    plural: "Bases",
    descricao: "o apoio no chão, com sapata ou sem",
  }),
  Object.freeze({
    id: "sleeve",
    nome: "Sleeve block",
    plural: "Sleeve blocks",
    descricao: "o bloco que corre na torre pra içar",
    futura: true,
    porque: "peça de içamento, e içamento é território do rigger (espeque §3.3)",
  }),
  Object.freeze({
    id: "pau-de-carga",
    nome: "Pau de carga",
    plural: "Paus de carga",
    descricao: "o braço que projeta o ponto de içamento pra fora da torre",
    futura: true,
    porque: "entra junto com os painéis pendurados, se entrar (espeque §3.3)",
  }),
  Object.freeze({
    id: "adaptador",
    nome: "Adaptador",
    plural: "Adaptadores",
    descricao: "a peça que casa dois sistemas diferentes (500 × 300)",
    futura: true,
    porque: "sem P50 no galpão não há o que adaptar; a v1 avisa e recusa a mistura",
  }),
]);

const PORCATEGORIA = new Map(CATEGORIAS.map((c) => [c.id, c]));

export const categoriaPorId = (id) => PORCATEGORIA.get(id) ?? null;

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
// Origem local: barra e cubo são CENTRADOS na origem; a base tem origem no
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

const conectoresBase = (alturaMm) => [
  { id: "topo", pos: [0, alturaMm, 0], dir: [0, 1, 0], rolo: [0, 0, 1] },
];

// ── as peças ─────────────────────────────────────────────────
// Os comprimentos são os do ESTOQUE do dono (espeque §3.2), e as medidas são
// NOMINAIS e fechadas: 2 m é 2000 mm. O modelo SketchUp ensina a forma, não a cota.
const MODELOS_DE_BARRA = [
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

/** o slug de modelo de uma barra: o comprimento em mm, 4 casas, pra ordenar só */
export const modeloDaBarra = (mm) => String(mm).padStart(4, "0");

/**
 * Monta uma peça a partir da taxonomia. `id` e `nome` NASCEM daqui — não são
 * digitados peça a peça — pra que categoria, modelo, id e nome nunca divirjam.
 *
 * `sistema` e `linha` entram fixos porque o galpão inteiro do dono é 300/P30
 * hoje. Ficam explícitos no dado (e não como padrão implícito) pra que o dia da
 * L30 seja um item novo na lista, não uma refatoração.
 */
const pecaDoCatalogo = ({ categoria, modelo, modeloNome, ...resto }) =>
  Object.freeze({
    id: `${categoria}-${modelo}`,
    categoria,
    modelo,
    modeloNome,
    nome: `${categoriaPorId(categoria).nome} ${modeloNome}`,
    sistema: 300,
    linha: "P30",
    geometria: GEO_MODELO,
    ...resto,
  });

export const CATALOGO = Object.freeze([
  ...MODELOS_DE_BARRA.map((b) =>
    pecaDoCatalogo({
      categoria: "barra",
      modelo: modeloDaBarra(b.mm),
      // ⚠️ a barra de 0,3 m e o cubo têm os dois 300 mm. Categoria, id e nome
      // distintos desde o começo: a barra conecta em 2 faces, o cubo em 5.
      // Confundir as duas manda a peça errada pro caminhão.
      modeloNome: rotuloComprimento(b.mm),
      comprimentoMm: b.mm,
      peso: peso(b.kg, b.fonte),
      conectores: Object.freeze(conectoresBarra(b.mm)),
    }),
  ),
  pecaDoCatalogo({
    categoria: "cubo",
    modelo: "5f",
    modeloNome: "5 faces",
    ladoMm: 300,
    facesAbertas: 5,
    peso: peso(12, "Auratec AL-P30 cubo 5 faces"),
    conectores: Object.freeze(conectoresCubo(300)),
  }),
  pecaDoCatalogo({
    categoria: "base",
    modelo: "baixa",
    modeloNome: "baixa",
    larguraMm: 750, // nominal Feeling; medido 740 no modelo
    alturaMm: 55,
    peso: peso(8, "proxy: base 800×800 Auratec"),
    conectores: Object.freeze(conectoresBase(55)),
  }),
]);

const PORID = new Map(CATALOGO.map((p) => [p.id, p]));

export const pecaPorId = (id) => PORID.get(id) ?? null;
export const conectorPorId = (peca, id) =>
  peca?.conectores?.find((c) => c.id === id) ?? null;
export const pecasDoSistema = (sistema) =>
  CATALOGO.filter((p) => p.sistema === sistema);

/** os modelos de uma categoria, na ordem do catálogo */
export const pecasDaCategoria = (categoria) =>
  CATALOGO.filter((p) => p.categoria === categoria);

/**
 * As categorias que TÊM peça hoje — é isto que o seletor oferece.
 * Categoria futura no seletor seria promessa vazia: o técnico abre e não acha nada.
 */
export const categoriasComPecas = () =>
  CATEGORIAS.filter((c) => pecasDaCategoria(c.id).length > 0);

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
// Barra e cubo são centrados na origem; a base tem origem no CHÃO. Quem calcula
// as medidas gerais da estrutura precisa saber disso, e é aqui que mora.
export function caixaLocal(peca) {
  if (!peca) return null;
  const lado = SISTEMAS[peca.sistema]?.ladoMm ?? 0;
  if (peca.categoria === "barra") {
    const h = peca.comprimentoMm / 2;
    const m = lado / 2;
    return { min: [-m, -h, -m], max: [m, h, m] };
  }
  if (peca.categoria === "cubo") {
    const m = peca.ladoMm / 2;
    return { min: [-m, -m, -m], max: [m, m, m] };
  }
  if (peca.categoria === "base") {
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
