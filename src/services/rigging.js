// services/rigging.js
// ─────────────────────────────────────────────────────────────
// Motor PURO de estrutura (F2) — peso da parede e checagem contra os limites
// publicados pelo fabricante, no modo escolhido (voado × empilhado/sentado).
// Espeque: docs/rigging-spec.md.
//
// ⚠️ Planejamento de referência: quem dimensiona e assina o rigging do evento
// é o rigger habilitado. O app REGISTRA peso e checa limite publicado — não
// dimensiona bumper, talha nem ancoragem (dimensionamento removido em 30/07/2026;
// esses números eram estimativa da casa e liam como fato no papel).
//
// ⚠️ VOCABULÁRIO: aqui se conta ANCORAGEM (onde a viga oferece pra pendurar),
// nunca "ponto". No meio técnico "ponto" já significa o ponto de talha que a
// produção entrega no teto — e esse o app NÃO calcula.

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};

// config de estrutura do projeto (project.rigging). `mostrar` é lido pelo
// Caderno/PDF; o motor só usa `modo`.
export const DEFAULT_RIG = {
  modo: "voado", // "voado" | "empilhado" (sentado no chão)
  mostrar: true, // a seção aparece no Caderno Completo?
};

// ── Limites do fabricante ──
// Cada fabricante publica numa UNIDADE diferente (Absen: painéis por barra ·
// Unilumin: metros verticais, e voado ≠ empilhado · YES TECH: altura + regra de
// ferragem). Por isso são campos separados, todos opcionais.
// `null` = SEM DADO → o app AVISA, não estima. Ver docs/rigging-pesquisa.md §5.1.
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
    porBarraMaxQtd: posOrNull(r.porBarraMaxQtd), // registro; fora da cadeia (ver checaLimites)
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

// A CADEIA: trava do gabinete → ancoragem → treliça → chão. Aqui checamos os
// elos que o app tem dado pra checar; treliça e chão só viram aviso.
// O limite "por barra" ficou de fora: sem saber quantas colunas dividem uma
// barra de içamento (era o dimensionamento de bumper, removido), não há o que
// checar — o campo segue na Biblioteca como registro do fabricante.
export function checaLimites({ rows, alturaM, modo, limites }) {
  const L = limites;
  if (modo === "empilhado") {
    return [check("empilhadoM", "Altura empilhada", alturaM, L.empilhadoMaxM, "m")];
  }
  const checks = [check("voadoM", "Altura voada", alturaM, L.voadoMaxM, "m")];
  // só cobra a versão em gabinetes quando o fabricante publica assim (ou quando
  // não publica nada) — senão viraria um "sem dado" redundante ao lado do metro
  if (L.voadoMaxQtd != null || L.voadoMaxM == null)
    checks.push(check("voadoQtd", "Gabinetes de altura", rows, L.voadoMaxQtd, "gab"));
  return checks;
}

// estrutura de UMA tela: peso + limites do fabricante no modo escolhido.
// `cabLive` = o gabinete VIVO da biblioteca (casado por `tela.cabId`). O peso e as
// dimensões continuam vindo do SNAPSHOT da tela — são a decisão de projeto e não
// podem mudar sozinhas. Já o LIMITE do fabricante é fato sobre o MODELO: quando o
// técnico finalmente confirma o número no manual, isso tem que valer pro caderno
// que ele emitiu mês passado. Sem `cabLive`, cai no snapshot.
export function riggingTela(tela, cfg = {}, cabLive = null) {
  const c = { ...DEFAULT_RIG, ...cfg };
  const cols = Math.max(0, Math.trunc(num(tela?.cols)));
  const rows = Math.max(0, Math.trunc(num(tela?.rows)));
  const pesoGab = num(tela?.gabinete?.peso);
  const pesoColuna = rows * pesoGab;
  // sem o peso do gabinete TUDO que vem depois é zero — e "0 kg" no papel lê como
  // fato, não como lacuna. O Caderno imprime "não informado" no lugar do número.
  const semPeso = cols > 0 && rows > 0 && !(pesoGab > 0);
  const totalKg = cols * pesoColuna;

  // ── cadeia de verificação: limites do fabricante ──
  const modo = c.modo === "empilhado" ? "empilhado" : "voado";
  const alturaGabMm = num(tela?.gabinete?.dimH);
  const alturaM = (rows * alturaGabMm) / 1000;
  const limites = limitesGabinete(cabLive?.rigging ? cabLive : tela?.gabinete);
  const checks = cols > 0 && rows > 0
    ? checaLimites({ rows, alturaM, modo, limites })
    : [];
  const limiteAcima = checks.some((k) => k.status === "acima");
  const limiteSemDado = checks.some((k) => k.status === "semDado");

  const avisos = [];
  if (semPeso) avisos.push("Peso do gabinete não informado — sem ele não dá pra calcular a carga da parede");
  if (limiteSemDado) avisos.push("O fabricante não publica o limite deste gabinete — confira no manual");
  // regra que muda a FERRAGEM, não o número (ex.: 3º conector C acima de 8 de altura)
  if (limites.travaExtraAcima != null && rows > limites.travaExtraAcima)
    avisos.push(`Acima de ${limites.travaExtraAcima} gabinetes de altura o fabricante pede trava extra entre gabinetes`);
  if (alturaGabMm <= 0) avisos.push("Altura do gabinete não informada — não dá pra checar o limite em metros");

  // qual elo trava primeiro (a treliça e o chão ficam fora: o app não tem esse dado)
  const elo = limiteAcima ? "fabricante" : null;

  return {
    cols, rows, pesoGab, pesoColuna, alturaM, semPeso, totalKg,
    modo, limites, checks, limiteAcima, limiteSemDado, elo,
    tone: limiteAcima ? "over" : "ok",
    over: limiteAcima,
    avisos,
  };
}

// projeto inteiro: uma linha por tela + totais.
// `cabs` = biblioteca de gabinetes, pro limite do fabricante vir vivo (ver riggingTela).
export function projectRigging(project, cfg = {}, cabs = []) {
  const porId = new Map((cabs || []).filter((c) => c && c.id != null).map((c) => [String(c.id), c]));
  const telas = (project?.telas || []).map((t) => ({
    tela: t,
    rig: riggingTela(t, cfg, porId.get(String(t?.cabId)) || null),
  }));
  const totalKg = telas.reduce((s, r) => s + r.rig.totalKg, 0);
  const algumOver = telas.some((r) => r.rig.over);
  const algumSemDado = telas.some((r) => r.rig.limiteSemDado);
  const algumSemPeso = telas.some((r) => r.rig.semPeso);
  return {
    telas, totalKg, algumOver, algumSemDado, algumSemPeso,
    tone: algumOver ? "over" : "ok",
  };
}
