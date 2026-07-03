// hooks/useElectrical.js — hook de domínio elétrico. NÃO altera as regras de cálculo
// (pwrMax, disjuntor 125%, consumo típico) — só centraliza a montagem da config + agregação.
import { useLedLabContext } from "../store/AppContext.jsx";
import { aggregateElectrical } from "../services/projectCalc.js";
import { VOLT } from "../services/electricalCalc.js";

export function useElectrical(project, cfgOverride) {
  const { prefs } = useLedLabContext();
  const cfg = cfgOverride || project?.config || { vk: prefs.vk, brilho: prefs.brilho, conteudo: prefs.conteudo };
  const agg = project ? aggregateElectrical(project, { vk: cfg.vk, brilho: cfg.brilho, conteudo: cfg.conteudo }) : null;
  return { cfg, agg, VOLT };
}
