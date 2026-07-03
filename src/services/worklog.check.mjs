// worklog.check.mjs — self-check do motor de Diárias contra a tabela da spec (§5.3).
// Rodar: node src/services/worklog.check.mjs   (não faz parte do build)
import { breakdownEvento, valorDia, DEFAULT_WORKLOG_CFG } from "./worklog.js";

const cfg = DEFAULT_WORKLOG_CFG; // J=12h, W=4h, TOL=50min
const M = { id: "m", nome: "Montagem", geraHoraExtra: true, podeSegundoCache: true, valorBase: 350 };
const D = { id: "d", nome: "Deslocamento", geraHoraExtra: false, podeSegundoCache: false, valorBase: 150 };
const V = { id: "v", nome: "Diária de viagem", geraHoraExtra: false, podeSegundoCache: true, valorBase: 200 };
const tiposById = { m: M, d: D, v: V };

const CHECKIN = "2026-07-03T09:00:00-03:00";
const base = Date.parse(CHECKIN);
const ev = (min, over = {}) => ({ tipoId: "m", dataRef: "2026-07-03", checkin: CHECKIN, checkout: new Date(base + min * 60000).toISOString(), ...over });

let fails = 0;
const eq = (nome, got, exp) => {
  const ok = got === exp;
  if (!ok) fails++;
  console.log(`${ok ? "ok  " : "FAIL"}  ${nome.padEnd(34)} => ${got}${ok ? "" : `  (esperado ${exp})`}`);
};

console.log("— evento único (tipo com hora extra, C=350, J=12h) —");
[[720, 350], [780, 380], [840, 410], [900, 440], [960, 470], [1020, 700], [1440, 700], [1680, 820], [1740, 1050], [1920, 1050]]
  .forEach(([min, exp]) => eq(`${(min / 60).toFixed(2)}h`, breakdownEvento(ev(min), M, cfg).total, exp));

console.log("— fração (regra dos 50 min) —");
[[770, 350], [771, 380], [820, 380], [831, 410]].forEach(([min, exp]) =>
  eq(`${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}`, breakdownEvento(ev(min), M, cfg).total, exp));

console.log("— flat e sem horários —");
eq("flat 20h (deslocamento)", breakdownEvento(ev(1200, { tipoId: "d" }), D, cfg).total, 150);
eq("sem horários (só cachê)", breakdownEvento({ tipoId: "m", dataRef: "2026-07-03" }, M, cfg).total, 350);

console.log("— agregação do dia —");
eq("4 serviços (2+3+1+2h)", valorDia([ev(120), ev(180), ev(60), ev(120)], tiposById, cfg).total, 1400);
eq("só deslocamento (ida+volta)", valorDia([ev(300, { tipoId: "d" }), ev(300, { tipoId: "d" })], tiposById, cfg).total, 150);
eq("trabalho + deslocamento", valorDia([ev(600, { tipoId: "m" }), ev(120, { tipoId: "d" })], tiposById, cfg).total, 350);
eq("diária de viagem + montagem", valorDia([ev(600, { tipoId: "v" }), ev(600, { tipoId: "m" })], tiposById, cfg).total, 550);

console.log(fails ? `\n❌ ${fails} falha(s)` : "\n✅ todos os casos passaram");
process.exit(fails ? 1 : 0);
