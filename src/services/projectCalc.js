// services/projectCalc.js
// Funções puras de projeto: status por data, agrupamento, roll-ups físicos
// (área/peso/potência) e agregação elétrica do projeto inteiro.

import { calcScreen, typicalPerTile, pickBreaker, VOLT } from "./electricalCalc.js";

export const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTHS_LONG = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export const isoDate = (d = new Date()) => {
  const t = new Date(d);
  return t.toISOString().slice(0, 10);
};

// Recalcula o status a partir das datas (a menos que fixado manualmente / cancelado).
export function recomputeStatus(project, today = isoDate()) {
  if (project.cancelled || project.status === "cancelled") return "cancelled";
  if (project.statusManual) return project.status;
  const { dataInicio, dataFim } = project;
  if (dataFim && dataFim < today) return "done";
  if (dataInicio && dataInicio <= today && (!dataFim || dataFim >= today)) return "active";
  return "planned";
}

export const activeProjects = (projects) => projects.filter((p) => p.status === "active");

// Agrupa projetos (com data de início) por "AAAA-MM", ordenado cronologicamente.
export function groupByMonth(projects) {
  const groups = {};
  for (const p of projects) {
    if (!p.dataInicio) continue;
    const key = p.dataInicio.slice(0, 7); // YYYY-MM
    (groups[key] ||= []).push(p);
  }
  return Object.keys(groups)
    .sort()
    .map((key) => {
      const [y, m] = key.split("-");
      return {
        key,
        label: `${MONTHS_LONG[Number(m) - 1]} ${y}`.toUpperCase(),
        projects: groups[key].sort((a, b) => a.dataInicio.localeCompare(b.dataInicio)),
      };
    });
}

const num = (v) => parseFloat(v) || 0;

// Roll-up físico de uma tela.
export function screenRollup(tela) {
  const g = tela.gabinete || {};
  const gab = (tela.cols || 0) * (tela.rows || 0);
  const pixels = {
    largura: (tela.cols || 0) * num(g.resX),
    altura: (tela.rows || 0) * num(g.resY),
  };
  pixels.total = pixels.largura * pixels.altura;
  const dim = {
    largura_m: ((tela.cols || 0) * num(g.dimW)) / 1000,
    altura_m: ((tela.rows || 0) * num(g.dimH)) / 1000,
  };
  dim.area_m2 = dim.largura_m * dim.altura_m;
  return {
    gab,
    pixels,
    dim,
    peso_kg: gab * num(g.peso),
    pwrMax_w: gab * num(g.pwrMax),
  };
}

// Roll-up físico do projeto (soma das telas).
export function projectRollup(project) {
  return (project.telas || []).reduce(
    (acc, t) => {
      const r = screenRollup(t);
      acc.gab += r.gab;
      acc.peso_kg += r.peso_kg;
      acc.pwrMax_w += r.pwrMax_w;
      acc.area_m2 += r.dim.area_m2;
      return acc;
    },
    { gab: 0, peso_kg: 0, pwrMax_w: 0, area_m2: 0, telas: (project.telas || []).length }
  );
}

// Agregação elétrica do projeto (pico + típico) somando todas as telas.
export function aggregateElectrical(project, { vk, brilho, conteudo }) {
  const vc = VOLT[vk] || VOLT["220_tri"];
  const perTela = [];
  let W = 0, S = 0, typW = 0, typS = 0;

  for (const tela of project.telas || []) {
    const g = tela.gabinete || {};
    const gab = (tela.cols || 0) * (tela.rows || 0);
    const pf = num(g.fp) || 0.85;
    const pwrMax = num(g.pwrMax);

    const peak = calcScreen({ tiles: gab, pwrPerTile: pwrMax, pf, vk });
    const typPerTile = typicalPerTile(pwrMax, g.pwrBlack, brilho, conteudo);
    const typ = calcScreen({ tiles: gab, pwrPerTile: typPerTile, pf, vk });

    perTela.push({ tela, gab, peak, typ });
    W += peak.W; S += peak.S;
    typW += typ.W; typS += typ.S;
  }

  const I = parseFloat((S / vc.div).toFixed(1));
  const typI = parseFloat((typS / vc.div).toFixed(1));
  return {
    vk, vc, perTela, brilho, conteudo,
    W, S, kVA: (S / 1000).toFixed(2), I, breaker: pickBreaker(I),
    typW, typS, typKva: (typS / 1000).toFixed(2), typI,
    gerador: ((typS / 1000) * 1.25).toFixed(1), // típico + 25% margem
  };
}
