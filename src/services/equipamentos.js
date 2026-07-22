// services/equipamentos.js — controladoras (biblioteca global) e a ligação com as
// Screens. A controladora define a capacidade de porta e se tem Free Topology; o app
// usa isso pra escolher a régua da Screen sozinho (o "modo guiado pelo equipamento")
// e pra avisar quando as Screens não cabem nas portas dela.
//
// Modelo: biblioteca GLOBAL de controladoras (reutiliza entre eventos, igual os
// gabinetes). Cada Screen aponta pra uma controladora por `screen.equipamentoId`.
// Sem controladora atribuída, a Screen segue a régua manual (v1.4.0).
import { screenPorts, screenPortSummary } from "./screenCabling.js";

// controladora: nº de portas Gigabit, capacidade por porta (@8-bit, 60Hz),
// suporta Free Topology (régua de pixels / cabo livre) e limite de resolução.
export function makeController(id, patch = {}) {
  return {
    id, nome: patch.nome || "Processador",
    marca: patch.marca || "", // fabricante (NovaStar/Colorlight/Brompton…) — pra filtrar o catálogo
    portas: patch.portas ?? 4,
    pxPorta: patch.pxPorta ?? 655360,
    freeTopology: !!patch.freeTopology,
    maxW: patch.maxW ?? 0, maxH: patch.maxH ?? 0, // 0 = sem limite conhecido
    obs: patch.obs || "",
  };
}

// só o que foi VERIFICADO em manual/campo entra como semente; o resto o técnico
// cadastra (ele conhece o próprio estoque). Números por modelo = lacuna de dado.
export const SEED_CONTROLLERS = [
  makeController("ctrl-vx1000", { nome: "VX1000", marca: "NovaStar", portas: 10, pxPorta: 655360, freeTopology: false, maxW: 10240, maxH: 8192, obs: "Descontinuada. Sem Free Topology — régua de área (regra do retângulo)." }),
];

export const controllerById = (controllers, id) => (controllers || []).find((c) => c.id === id) || null;
export const controllerOf = (controllers, screen) => controllerById(controllers, screen?.equipamentoId);

// aplica as restrições da controladora à config de sinal da Screen: injeta a
// capacidade por porta e, se a controladora NÃO tem Free Topology, FORÇA a régua de
// área (a de pixels/Free Topology daria conta errada de porta num equipamento que
// não tem a função).
export function effectiveSinalCfg(sinalCfg, controller) {
  const s = sinalCfg || {};
  if (!controller) return s;
  const eff = { ...s, pxPortaBase: controller.pxPorta };
  if (!controller.freeTopology) {
    eff.rule = "area";
    if (!["linha", "coluna", "area", "livre"].includes(eff.strategy)) eff.strategy = "area";
  }
  return eff;
}

// Screen com a config de sinal já resolvida pela controladora — é o que os
// consumidores (cabeamento, relatório, test card) passam pras funções puras.
export function withController(screen, controller) {
  return { ...screen, sinal: effectiveSinalCfg(screen?.sinal, controller) };
}

// projeto com todas as Screens resolvidas pela controladora de cada uma
export function effectiveProject(project, controllers) {
  return { ...project, screens: (project?.screens || []).map((s) => withController(s, controllerOf(controllers, s))) };
}

// a controladora tem Free Topology? (pra UI liberar/bloquear a régua de pixels)
export const screenAllowsPx = (screen, controllers) => {
  const c = controllerOf(controllers, screen);
  return c ? !!c.freeTopology : true; // sem controladora, o usuário escolhe
};

// Relatório de capacidade: por controladora EM USO, quantas portas as Screens dela
// pedem × quantas ela tem. Screens sem controladora ficam à parte (não bloqueia).
export function equipReport(project, controllers, telas, numbering = "row-tb-lr") {
  const screens = project?.screens || [];
  const usados = [...new Set(screens.map((s) => s.equipamentoId).filter(Boolean))];
  const rows = usados.map((id) => {
    const controller = controllerById(controllers, id);
    const suas = screens.filter((s) => s.equipamentoId === id && (s.telaIds || []).length);
    const porScreen = suas.map((s) => ({
      screen: s,
      portas: screenPorts(withController(s, controller), telas, "sinal", numbering).length,
    }));
    const usadas = porScreen.reduce((n, x) => n + x.portas, 0);
    const disp = controller?.portas || 0;
    return { controller, screens: porScreen, portasUsadas: usadas, portasDisp: disp, over: usadas > disp, folga: disp - usadas };
  });
  const semControlador = screens.filter((s) => !s.equipamentoId && (s.telaIds || []).length);
  return { rows, semControlador };
}

// Hz como lever: se a controladora estourou, qual refresh faria caber? (mais px por
// porta em refresh menor → menos portas). Testa 50 e 30 Hz sem persistir nada.
export function hzQueCabe(controller, screens, telas, numbering = "row-tb-lr") {
  if (!controller) return null;
  for (const hz of [50, 30]) {
    const portas = screens.reduce((n, s) => {
      const eff = withController(s, controller);
      eff.sinal = { ...eff.sinal, hz };
      return n + screenPorts(eff, telas, "sinal", numbering).length;
    }, 0);
    if (portas <= controller.portas) return { hz, portas };
  }
  return null;
}

// resumo por porta de uma Screen já com a controladora aplicada (pro relatório/UI)
export function screenSummaryWithController(screen, controllers, telas, kind = "sinal", numbering = "row-tb-lr") {
  return screenPortSummary(kind === "sinal" ? withController(screen, controllerOf(controllers, screen)) : screen, telas, kind, numbering);
}
