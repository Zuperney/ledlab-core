// services/rigging.js
// ─────────────────────────────────────────────────────────────
// Motor PURO de rigging (F2) — peso por coluna, bumpers, carga por ancoragem e
// checagem contra a talha pra tela VOADA (flown). Espeque: docs/rigging-spec.md.
//
// ⚠️ Planejamento de referência: quem dimensiona e assina o rigging do evento
// é o rigger habilitado. O WLL da talha já embute o fator de projeto do
// fabricante — nunca passar do WLL.
//
// ⚠️ VOCABULÁRIO: aqui se conta ANCORAGEM (onde a viga oferece pra pendurar),
// nunca "ponto". No meio técnico "ponto" já significa o ponto de talha que a
// produção entrega no teto — e esse o app NÃO calcula. Uma ancoragem costuma
// subir numa talha, mas quem decide isso (bridle, repartição) é o rigger.
//
// Modelado sobre a FROTA DA CASA (respostas do dono, 25/07/2026):
//   · bumpers em 2 tamanhos: 50 cm e 100 cm;
//   · 2 tipos de fixação: algema/garra OU ilhó + cinta de carga + manilha;
//   · talhas todas de 1 t e MANUAIS (não tem motor — a subida é na mão).
//
// Ground support (torre/ballast/vento) fica pra fase seguinte.

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// ── Catálogo de bumpers ──
// `ancoragens` é PROPRIEDADE DO BUMPER, não da largura: a frota tem bumper de 50 cm
// com 1 ancoragem E bumper de 50 cm com 2 ancoragens (o do 2.9 RGB Share); e existe no
// mercado bumper de 2 gabinetes de 64 cm com 1 ancoragem só. Por isso o catálogo é
// semente — o técnico cadastra o dele (cfg.bumper aceita objeto solto).
// ⚠️ pesoKg com `estimado: true` = PLACEHOLDER esperando a pesagem real;
// o Caderno tem que rotular como estimativa enquanto estiver assim.
export const BUMPERS = [
  { id: "b50", nome: "Bumper 50 cm · 1 ancoragem", larguraMm: 500, ancoragens: 1, pesoKg: 8, estimado: true },
  { id: "b50p2", nome: "Bumper 50 cm · 2 ancoragens", larguraMm: 500, ancoragens: 2, pesoKg: 8, estimado: true },
  { id: "b100", nome: "Bumper 100 cm · 2 ancoragens", larguraMm: 1000, ancoragens: 2, pesoKg: 14, estimado: true },
];

export const getBumper = (id) => BUMPERS.find((b) => b.id === id) || BUMPERS[0];

// bumper do cálculo: objeto solto do técnico (cfg.bumper) > id do catálogo > padrão
export function resolveBumper(cfg = {}) {
  if (cfg.bumper && typeof cfg.bumper === "object") {
    const b = cfg.bumper;
    return {
      id: b.id || "custom",
      nome: b.nome || "Bumper do técnico",
      larguraMm: num(b.larguraMm),
      ancoragens: Math.max(1, Math.trunc(num(b.ancoragens)) || 1),
      pesoKg: num(b.pesoKg),
      estimado: b.estimado !== false && !(num(b.pesoKg) > 0),
    };
  }
  return getBumper(cfg.bumperId);
}

// ── Fixação do bumper na ancoragem ──
// `kgPorAncoragem` = massa dos acessórios que sobem junto (entra na carga da talha).
export const FIXACOES = [
  {
    id: "garra",
    nome: "Algema/garra",
    kgPorAncoragem: 3,
    acessorios: ["Algema/garra"],
    estimado: true,
  },
  {
    id: "cinta",
    nome: "Ilhó + cinta + manilha",
    kgPorAncoragem: 5,
    acessorios: ["Cinta de carga", "Manilha"],
    estimado: true,
  },
];

export const getFixacao = (id) => FIXACOES.find((f) => f.id === id) || FIXACOES[0];

// ── Talha ──
// A frota é 100% talha MANUAL de 1 t. Lista aberta caso entre outro WLL depois.
export const TALHAS_KG = [1000];
export const TALHA_PADRAO_KG = 1000;

// Alerta em % do WLL, espelhando a regra dos 80% do elétrico (electricalCalc):
// acima de 80% = ATENÇÃO (laranja); acima de 100% = ESTOURO (vermelho).
export const RIG_WARN_PCT = 80;
export function rigTone(pct) {
  return pct > 100 ? "over" : pct > RIG_WARN_PCT ? "warn" : "ok";
}

export const DEFAULT_RIG = {
  bumperId: "b100", // 100 cm = 2 colunas de gabinete 500 mm, 2 ancoragens
  bumper: null, // objeto solto do técnico; se vier, ganha do bumperId
  fixacao: "cinta",
  colunasPorBumper: null, // null = DERIVA da largura do bumper ÷ largura do gabinete
  ancoragensPorBumper: null, // null = usa as ancoragens do próprio bumper (é propriedade dele)
  talhaWLL: TALHA_PADRAO_KG,
  extraKgPorAncoragem: 0, // extras da casa além dos acessórios da fixação
  utilizacao: 1, // fração do WLL admitida como limite DURO (o aviso de 80% vem do rigTone)
  maxRows: null, // empilhamento máx. voado do gabinete (datasheet); null = sem checagem
};

// quantas colunas cabem num bumper: quantos gabinetes inteiros a viga cobre.
// Gabinete mais largo que o bumper → 1 coluna (com aviso; ele sobra nas pontas).
export function colunasNoBumper(larguraBumperMm, larguraGabMm, override = null) {
  const ov = Math.trunc(num(override));
  if (ov > 0) return ov;
  const lb = num(larguraBumperMm);
  const lg = num(larguraGabMm);
  if (!(lb > 0) || !(lg > 0)) return 1;
  return Math.max(1, Math.floor(lb / lg));
}

// ── Limites do fabricante ──
// Cada fabricante publica numa UNIDADE diferente (Absen: painéis por barra ·
// Unilumin: metros verticais, e voado ≠ empilhado · YES TECH: altura + regra de
// ferragem). Por isso são campos separados, todos opcionais.
// `null` = SEM DADO → o app AVISA, não estima. Ver docs/rigging-pesquisa.md §5.1.
export const MODOS = ["voado", "empilhado"];

const posOrNull = (v) => {
  if (v == null || v === "") return null;
  const n = num(v);
  return n > 0 ? n : null;
};

export function limitesGabinete(gabinete) {
  const r = gabinete?.rigging || {};
  return {
    voadoMaxM: posOrNull(r.voadoMaxM), // altura máx. voada, em metros
    voadoMaxQtd: posOrNull(r.voadoMaxQtd), // ou em gabinetes de altura
    empilhadoMaxM: posOrNull(r.empilhadoMaxM), // ground stack (costuma ser menor)
    porBarraMaxQtd: posOrNull(r.porBarraMaxQtd), // painéis pendurados por barra
    travaExtraAcima: posOrNull(r.travaExtraAcima), // acima de N de altura, entra trava extra
    fonte: r.fonte || "",
    conferido: r.conferido === true,
  };
}

// um elo da cadeia. SEM limite publicado → "semDado" (nunca "ok": não inventamos folga)
const check = (id, label, valor, limite, unidade) => ({
  id, label, valor, limite, unidade,
  status: limite == null ? "semDado" : valor > limite ? "acima" : "ok",
});

// A CADEIA: trava do gabinete → bumper → ancoragem/talha → treliça → chão.
// Aqui checamos os elos que o app tem dado pra checar; treliça e chão só viram aviso.
export function checaLimites({ rows, alturaM, gabPorBarra, modo, limites }) {
  const L = limites;
  if (modo === "empilhado") {
    return [check("empilhadoM", "Altura empilhada", alturaM, L.empilhadoMaxM, "m")];
  }
  const checks = [check("voadoM", "Altura voada", alturaM, L.voadoMaxM, "m")];
  // só cobra a versão em gabinetes quando o fabricante publica assim (ou quando
  // não publica nada) — senão viraria um "sem dado" redundante ao lado do metro
  if (L.voadoMaxQtd != null || L.voadoMaxM == null)
    checks.push(check("voadoQtd", "Gabinetes de altura", rows, L.voadoMaxQtd, "gab"));
  checks.push(check("porBarra", "Gabinetes por barra", gabPorBarra, L.porBarraMaxQtd, "gab"));
  return checks;
}

// a talha aguenta? menor WLL da lista que cabe; null = acima de tudo que existe
export function sugereTalha(cargaKg, utilizacao = 1, talhas = TALHAS_KG) {
  if (!(cargaKg > 0)) return null;
  for (const wll of talhas) if (cargaKg <= wll * utilizacao) return wll;
  return null;
}

// rigging de UMA tela voada. Carga por ancoragem = PIOR caso (bumper cheio) —
// o último bumper pode carregar menos colunas, mas a talha se escolhe pro cheio.
// `cabLive` = o gabinete VIVO da biblioteca (casado por `tela.cabId`). O peso e as
// dimensões continuam vindo do SNAPSHOT da tela — são a decisão de projeto e não
// podem mudar sozinhas. Já o LIMITE do fabricante é fato sobre o MODELO: quando o
// técnico finalmente confirma o número no manual, isso tem que valer pro caderno
// que ele emitiu mês passado. Sem `cabLive`, cai no snapshot.
export function riggingTela(tela, cfg = {}, cabLive = null) {
  const c = { ...DEFAULT_RIG, ...cfg };
  const bumper = resolveBumper(c);
  const fix = getFixacao(c.fixacao);
  const cols = Math.max(0, Math.trunc(num(tela?.cols)));
  const rows = Math.max(0, Math.trunc(num(tela?.rows)));
  const pesoGab = num(tela?.gabinete?.peso);
  const larguraGab = num(tela?.gabinete?.dimW);
  const pesoColuna = rows * pesoGab;
  // sem o peso do gabinete TUDO que vem depois é zero — e "0 kg" no papel lê como
  // fato, não como lacuna. O Caderno imprime "não informado" no lugar do número.
  const semPeso = cols > 0 && rows > 0 && !(pesoGab > 0);

  const colunasPorBumper = colunasNoBumper(bumper.larguraMm, larguraGab, c.colunasPorBumper);
  const bumpers = cols > 0 ? Math.ceil(cols / colunasPorBumper) : 0;
  // ancoragens vêm do bumper; cfg.ancoragensPorBumper só existe pra sobrescrever à mão
  const ancoragensPorBumper = Math.max(1, Math.trunc(num(c.ancoragensPorBumper)) || bumper.ancoragens || 1);
  const ancoragens = bumpers * ancoragensPorBumper;

  const cargaBumperCheio = Math.min(cols, colunasPorBumper) * pesoColuna + bumper.pesoKg;
  const extras = fix.kgPorAncoragem + num(c.extraKgPorAncoragem);
  const cargaPorAncoragem = ancoragens > 0 ? cargaBumperCheio / ancoragensPorBumper + extras : 0;

  const talhaWLL = num(c.talhaWLL) || TALHA_PADRAO_KG;
  const pctTalha = talhaWLL > 0 ? (cargaPorAncoragem / talhaWLL) * 100 : 0;
  const talha = sugereTalha(cargaPorAncoragem, c.utilizacao);
  const totalKg = cols * pesoColuna + bumpers * bumper.pesoKg;

  // ── cadeia de verificação: limites do fabricante ──
  const modo = c.modo === "empilhado" ? "empilhado" : "voado";
  const alturaGabMm = num(tela?.gabinete?.dimH);
  const alturaM = (rows * alturaGabMm) / 1000;
  const gabPorBarra = Math.min(cols, colunasPorBumper) * rows;
  const limites = limitesGabinete(cabLive?.rigging ? cabLive : tela?.gabinete);
  const checks = cols > 0 && rows > 0
    ? checaLimites({ rows, alturaM, gabPorBarra, modo, limites })
    : [];
  const limiteAcima = checks.some((k) => k.status === "acima");
  const limiteSemDado = checks.some((k) => k.status === "semDado");

  const avisos = [];
  if (larguraGab > 0 && larguraGab > bumper.larguraMm)
    avisos.push(`Gabinete (${larguraGab} mm) é mais largo que o ${bumper.nome.toLowerCase()}`);
  if (semPeso) avisos.push("Peso do gabinete não informado — sem ele não dá pra calcular a carga nas ancoragens");
  if (bumper.estimado || fix.estimado) avisos.push("Pesos de bumper/acessórios ainda são estimativa");
  if (limiteSemDado) avisos.push("O fabricante não publica o limite deste gabinete — confira no manual");
  // regra que muda a FERRAGEM, não o número (ex.: 3º conector C acima de 8 de altura)
  if (limites.travaExtraAcima != null && rows > limites.travaExtraAcima)
    avisos.push(`Acima de ${limites.travaExtraAcima} gabinetes de altura o fabricante pede trava extra entre gabinetes`);
  if (alturaGabMm <= 0) avisos.push("Altura do gabinete não informada — não dá pra checar o limite em metros");

  const talhaOver = ancoragens > 0 && talha == null;
  // qual elo trava primeiro (a treliça e o chão ficam fora: o app não tem esse dado)
  const elo = limiteAcima ? "fabricante" : talhaOver ? "talha" : null;

  return {
    cols, rows, pesoGab, pesoColuna, alturaM, semPeso,
    bumper, fixacao: fix, colunasPorBumper,
    bumpers, ancoragensPorBumper, ancoragens, gabPorBarra,
    cargaPorAncoragem, totalKg,
    talhaWLL, pctTalha, talha, talhaOver,
    modo, limites, checks, limiteAcima, limiteSemDado, elo,
    // o tom da tela é o PIOR entre a talha e os limites do fabricante
    tone: limiteAcima ? "over" : rigTone(pctTalha),
    over: talhaOver || limiteAcima,
    empilhaOk: c.maxRows == null ? null : rows <= c.maxRows,
    avisos,
  };
}

// projeto inteiro (telas voadas): uma linha por tela + totais.
// `cabs` = biblioteca de gabinetes, pro limite do fabricante vir vivo (ver riggingTela).
export function projectRigging(project, cfg = {}, cabs = []) {
  const porId = new Map((cabs || []).filter((c) => c && c.id != null).map((c) => [String(c.id), c]));
  const telas = (project?.telas || []).map((t) => ({
    tela: t,
    rig: riggingTela(t, cfg, porId.get(String(t?.cabId)) || null),
  }));
  const totalKg = telas.reduce((s, r) => s + r.rig.totalKg, 0);
  const ancoragens = telas.reduce((s, r) => s + r.rig.ancoragens, 0);
  const bumpers = telas.reduce((s, r) => s + r.rig.bumpers, 0);
  const algumOver = telas.some((r) => r.rig.over);
  const algumWarn = telas.some((r) => r.rig.tone !== "ok");
  const algumSemDado = telas.some((r) => r.rig.limiteSemDado);
  const algumSemPeso = telas.some((r) => r.rig.semPeso);
  // pior ancoragem do projeto: é ela que escolhe a talha, não a média
  const piorAncoragem = telas.reduce((m, r) => Math.max(m, r.rig.cargaPorAncoragem), 0);
  return {
    telas, totalKg, ancoragens, bumpers, algumOver, algumSemDado, algumSemPeso, piorAncoragem,
    tone: algumOver ? "over" : algumWarn ? "warn" : "ok",
  };
}
