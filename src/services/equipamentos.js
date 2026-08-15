// services/equipamentos.js — biblioteca de EQUIPAMENTOS DE VÍDEO (editável) e a
// ligação com as Screens.
//
// HISTÓRICO: até a v1.18.0 isto era um catálogo certificado read-only de
// controladoras NovaStar. Decisão do dono: virou biblioteca LIVRE no estilo
// "lista simples e direta" — o técnico cadastra processadoras, players,
// switchers etc. com portas nomeadas por tipo de sinal. O antigo catálogo
// sobrevive como seed (data/seedEquips.js, ids "nova-*" preservados).
//
// O tipo de sinal de cada porta usa os IDS DO LOOMEX (services/loomex.js) —
// vocabulário canônico que deixa o export .loomex.json sem perdas.
//
// Cada Screen guarda `equipamentoId` (link vivo com a biblioteca) e
// `equipamento` (snapshot congelado) — mesmo padrão cabId+gabinete das telas:
// o projeto não muda sozinho se a biblioteca mudar; reselecionar atualiza.
import { screenPorts } from "./screenCabling.js";
import { genId } from "./ids.js";

// px por porta Gigabit @8-bit/60Hz — padrão da régua quando não há equipamento.
export const PX_PORTA_PADRAO = 655360;

// vocabulário do manual (§12.1): "Controladora" (nunca processador/controller);
// "Media server" é OUTRO equipamento — a máquina de conteúdo.
export const CATEGORIAS = [
  ["controladora", "Controladora"],
  ["mediaserver", "Media server"],
  ["mesa", "Mesa de corte"],
  ["conversor", "Conversor"],
  ["distribuidor", "Distribuidor / Matriz"],
  ["outro", "Outro"],
];
export const categoriaLabel = (id) => (CATEGORIAS.find(([k]) => k === id) || [])[1] || id || "";

// porta de equipamento: direção explícita (in = entrada, out = saída) + sinal Loomex
export function makePorta(patch = {}) {
  return { id: genId("porta"), nome: "", dir: "in", sinal: "hdmi", ...patch };
}

export function makeEquip(patch = {}) {
  return {
    id: genId("equip"),
    nome: "",
    marca: "",
    categoria: "controladora",
    portas: [],           // [{id, nome, dir, sinal}] — ordem = ordem no bloco
    largura: 0,           // largura do bloco no Loomex; 0 = padrão (210)
    pxPorta: 0,           // capacidade por porta de dados; 0 = padrão da régua
    obs: "",
    ...patch,
  };
}

// snapshot congelado gravado na Screen (portas SEM id — formato de template,
// igual ao bibliotecaEquipamentos do Loomex)
export function equipSnapshot(e) {
  if (!e) return undefined;
  return {
    nome: e.nome || "",
    marca: e.marca || "",
    categoria: e.categoria || "",
    largura: Number(e.largura) || 0,
    pxPorta: Number(e.pxPorta) || 0,
    portas: (e.portas || []).map((p) => ({ nome: p.nome || "", dir: p.dir === "out" ? "out" : "in", sinal: p.sinal || "custom" })),
  };
}

// saídas de DADOS do equipamento (o que alimenta LED): ethernet; se o
// equipamento só transmite por óptica, a fila cai pra fibra.
export function dataOuts(snap) {
  const outs = (snap?.portas || []).filter((p) => p.dir === "out");
  const eth = outs.filter((p) => p.sinal === "ethernet");
  return eth.length ? eth : outs.filter((p) => p.sinal === "fibra");
}

// feedback do vínculo: portas de dados que a Screen PEDE × que o equipamento TEM.
// null = sem equipamento vinculado (a régua segue manual, como sempre).
export function screenEquipStatus(screen, telas, numbering = "row-tb-lr") {
  const snap = screen?.equipamento;
  if (!snap) return null;
  const necessarias = screenPorts(screen, telas, "sinal", numbering).length;
  const disponiveis = dataOuts(snap).length;
  return { necessarias, disponiveis, ok: disponiveis >= necessarias };
}

// injeta a capacidade por porta do equipamento na config de sinal da Screen (o
// cableMeta escala por bits/refresh). NÃO força a régua.
export function effectiveSinalCfg(sinalCfg, snap) {
  const s = sinalCfg || {};
  const px = Number(snap?.pxPorta) || 0;
  return px > 0 ? { ...s, pxPortaBase: px } : s;
}
export function withEquip(screen) {
  return { ...screen, sinal: effectiveSinalCfg(screen?.sinal, screen?.equipamento) };
}
export function effectiveProject(project) {
  return { ...project, screens: (project?.screens || []).map(withEquip) };
}
