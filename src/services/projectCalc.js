// services/projectCalc.js
// Funções puras de projeto: status por data, agrupamento, roll-ups físicos
// (área/peso/potência) e agregação elétrica do projeto inteiro.

import { calcScreen, typicalPerTile, VOLT } from "./electricalCalc.js";
import { blocosDe, temBlocos, celulasDaTela, dimTela, medidaFisica } from "./blocos.js";

export const MONTHS_SHORT = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
export const MONTHS_LONG = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

// data LOCAL no formato YYYY-MM-DD. NÃO usar toISOString() aqui: ela converte p/ UTC e,
// em fusos negativos (ex.: UTC-3), à noite já retorna o dia seguinte — o que flipava o
// status do projeto e a data do recibo cedo. getFullYear/Month/Date usam o fuso local.
export const isoDate = (d = new Date()) => {
  const t = new Date(d);
  const p = (n) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${p(t.getMonth() + 1)}-${p(t.getDate())}`;
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

// Roll-up físico de uma tela. Tela de BLOCOS soma bloco a bloco (cada um com o seu
// gabinete); a legada segue a conta de sempre. `pixels` é DE PÉ (o que o
// processador vê); `dim` é a medida FÍSICA — deitada troca largura por altura.
export function screenRollup(tela) {
  if (temBlocos(tela)) {
    const blocos = blocosDe(tela);
    const gab = blocos.reduce((s, b) => s + b.cols * b.rows, 0);
    const d = dimTela(tela);
    const f = medidaFisica(tela);
    const soma = (campo) => blocos.reduce((s, b) => s + b.cols * b.rows * num(b.gabinete?.[campo]), 0);
    return {
      gab,
      // total = pixels REAIS (buraco entre blocos não é LED), não a caixa
      pixels: { largura: d.w, altura: d.h, total: celulasDaTela(tela).reduce((s, c) => s + c.w * c.h, 0) },
      dim: { largura_m: f.w / 1000, altura_m: f.h / 1000, area_m2: f.area_mm2 / 1e6 },
      peso_kg: soma("peso"),
      pwrMax_w: soma("pwrMax"),
    };
  }
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
  // montagem deitada (90° anti-horário): a medida física gira, o pixel não
  if (tela.deitada) [dim.largura_m, dim.altura_m] = [dim.altura_m, dim.largura_m];
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
    // cada bloco com o SEU gabinete (fp, potência); a tela soma os blocos. Tela
    // legada é um bloco só — a conta de sempre.
    const partes = blocosDe(tela).map((b) => {
      const g = b.gabinete || {};
      const gab = b.cols * b.rows;
      const pf = num(g.fp) || 0.85;
      const pwrMax = num(g.pwrMax);
      const typPerTile = typicalPerTile(pwrMax, g.pwrBlack, brilho, conteudo);
      return {
        gab,
        peak: calcScreen({ tiles: gab, pwrPerTile: pwrMax, pf, vk }),
        typ: calcScreen({ tiles: gab, pwrPerTile: typPerTile, pf, vk }),
      };
    });
    const gab = partes.reduce((s, p) => s + p.gab, 0);
    const peak = partes.length === 1 ? partes[0].peak : somaCalc(partes.map((p) => p.peak), vc);
    const typ = partes.length === 1 ? partes[0].typ : somaCalc(partes.map((p) => p.typ), vc);

    perTela.push({ tela, gab, peak, typ });
    W += peak.W; S += peak.S;
    typW += typ.W; typS += typ.S;
  }

  const I = parseFloat((S / vc.div).toFixed(1));
  const typI = parseFloat((typS / vc.div).toFixed(1));
  // Gerador mínimo pelo PICO ×1,25 (auditoria 30/07/2026: frame branco em brilho
  // alto leva a parede ao pico — dimensionar pelo típico derruba o gerador).
  // geradorPct = quanto o consumo típico ocupa desse gerador (janela saudável de
  // diesel: 60–80%; abaixo de ~30% = wet stacking).
  const gerador = (S / 1000) * 1.25;
  return {
    vk, vc, perTela, brilho, conteudo,
    W, S, kVA: (S / 1000).toFixed(2), I,
    typW, typS, typKva: (typS / 1000).toFixed(2), typI,
    gerador: gerador.toFixed(1),
    geradorPct: gerador > 0 ? Math.round((typS / 1000 / gerador) * 100) : 0,
  };
}

// soma de vários calcScreen (os blocos de uma tela mista) no mesmo formato
function somaCalc(lista, vc) {
  const W = lista.reduce((s, c) => s + c.W, 0);
  const S = lista.reduce((s, c) => s + c.S, 0);
  const I = parseFloat((S / vc.div).toFixed(1));
  return {
    vc, W, S, kVA: (S / 1000).toFixed(2), I,
    steps: [`S = Σ blocos = ${Math.round(S).toLocaleString()} VA`, `I = ${Math.round(S)} ÷ (${vc.dl}) = ${I} A`],
  };
}
