// services/screens.js — Screens: agrupamentos que o TÉCNICO monta à mão.
//
// Uma Screen é a "Screen" do NovaLCT: o conjunto de telas que ele decide que vão no
// MESMO sistema (mesmo controlador), montadas do jeito que ele configuraria. O app
// NÃO agrupa sozinho — o técnico junta só as telas que quer, e o motivo muitas vezes
// é a logística do evento (o que é montado quando), não a geometria nem o modelo.
//
// Regras: uma tela fica em NO MÁXIMO uma Screen (pôr numa nova tira da antiga); tela
// fora de qualquer Screen = "sem sistema" (aparece nos disponíveis, ainda não cabeada).
// Um projeto pode ter 1 Screen com tudo (caso Colação) ou N Screens (caso Admicon) —
// é escolha dele. Cada Screen tem origem própria (0,0), igual no NovaLCT.
import { packByModel } from "./layout.js";
import { dimOf, modelKey } from "./canvasCabling.js";

// id vem de fora (genId no componente) pra manter isto puro/testável. sinal começa
// vazio → régua/disposição caem no padrão (Área / regra do retângulo). AC é criado
// sob demanda quando o usuário mexe no cabeamento AC.
export function makeScreen(id, nome) {
  return { id, nome, telaIds: [], pos: {}, sinal: {} };
}

// telas que não estão em nenhuma Screen (a lista de "disponíveis")
export function unassignedTelas(screens, telas) {
  const used = new Set((screens || []).flatMap((s) => s.telaIds || []));
  return (telas || []).filter((t) => !used.has(t.id));
}

// a Screen que contém a tela (ou null)
export function screenOfTela(screens, telaId) {
  return (screens || []).find((s) => (s.telaIds || []).includes(telaId)) || null;
}

// telas de uma Screen, na ordem de telaIds, resolvidas contra project.telas
export function screenTelas(screen, telas) {
  const byId = new Map((telas || []).map((t) => [t.id, t]));
  return (screen?.telaIds || []).map((id) => byId.get(id)).filter(Boolean);
}

// caixa envolvente da Screen (px), origem no canto sup-esq
export function screenSize(screen, telas) {
  let w = 0, h = 0;
  for (const t of screenTelas(screen, telas)) {
    const p = screen.pos?.[t.id] || { x: 0, y: 0 };
    const d = dimOf(t);
    w = Math.max(w, p.x + d.w);
    h = Math.max(h, p.y + d.h);
  }
  return { w, h };
}

// arranjo automático dos membros: agrupa por modelo, empilha faixas. É SUGESTÃO —
// o técnico arrasta pra ajustar depois (metade dos eventos muda na montagem).
export function arrangeScreen(screen, telas) {
  const items = screenTelas(screen, telas).map((t) => ({ id: t.id, ...dimOf(t), model: modelKey(t) }));
  return packByModel(items).pos;
}

// adiciona uma tela à Screen `screenId`, tirando de qualquer outra (tela ∈ ≤1 Screen).
// posiciona a nova à direita do que já existe (y=0); o técnico arrasta depois.
export function addTela(screens, screenId, telaId, telas) {
  return (screens || []).map((s) => {
    if (s.id === screenId) {
      if ((s.telaIds || []).includes(telaId)) return s;
      const size = screenSize(s, telas);
      return { ...s, telaIds: [...(s.telaIds || []), telaId], pos: { ...s.pos, [telaId]: { x: size.w, y: 0 } } };
    }
    if ((s.telaIds || []).includes(telaId)) return stripTela(s, telaId); // sai da anterior
    return s;
  });
}

export function removeTela(screens, screenId, telaId) {
  return (screens || []).map((s) => (s.id === screenId ? stripTela(s, telaId) : s));
}

function stripTela(screen, telaId) {
  const pos = { ...(screen.pos || {}) };
  delete pos[telaId];
  return { ...screen, telaIds: (screen.telaIds || []).filter((id) => id !== telaId), pos };
}

// "criar 1 Screen por tela" (D4): pro técnico que não quer agrupar. makeId gera cada id.
export function oneScreenPerTela(telas, makeId) {
  return (telas || []).map((t) => ({
    id: makeId(),
    nome: t.nome || "Tela",
    telaIds: [t.id],
    pos: { [t.id]: { x: 0, y: 0 } },
    sinal: {},
  }));
}
