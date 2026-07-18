// screens.test.js — Screens que o técnico monta à mão (agrupamento manual).
import { describe, it, expect } from "vitest";
import { makeScreen, unassignedTelas, screenOfTela, screenTelas, screenSize, arrangeScreen, addTela, removeTela, oneScreenPerTela } from "./screens.js";

const gabTira = { resX: "128", resY: "256" };
const gabImag = { resX: "192", resY: "192" };
const mk = (id, gabinete, cols, rows, nome) => ({ id, gabinete, cols, rows, nome: nome || id });
const telas = [
  mk("imagD", gabImag, 6, 3, "IMAG Dir"),
  mk("imagE", gabImag, 6, 3, "IMAG Esq"),
  mk("t1", gabTira, 1, 3, "Tira 1"),
  mk("central", gabTira, 10, 3, "Central"),
];

describe("makeScreen", () => {
  it("nasce vazia, com nome e modo auto", () => {
    expect(makeScreen("s1", "Sistema Tiras")).toEqual({ id: "s1", nome: "Sistema Tiras", telaIds: [], pos: {}, sinal: {} });
  });
});

describe("unassignedTelas / screenOfTela", () => {
  const screens = [{ id: "s1", telaIds: ["t1", "central"], pos: {} }];
  it("disponíveis = as que não estão em nenhuma Screen", () => {
    expect(unassignedTelas(screens, telas).map((t) => t.id)).toEqual(["imagD", "imagE"]);
  });
  it("sem Screens, tudo é disponível", () => {
    expect(unassignedTelas([], telas).length).toBe(4);
  });
  it("acha a Screen de uma tela (ou null)", () => {
    expect(screenOfTela(screens, "t1").id).toBe("s1");
    expect(screenOfTela(screens, "imagD")).toBe(null);
  });
});

describe("addTela — uma tela em ≤1 Screen", () => {
  it("adiciona à Screen e posiciona à direita do que já existe", () => {
    let s = [makeScreen("s1", "A")];
    s = addTela(s, "s1", "t1", telas);          // 1ª tira: x=0
    expect(s[0].pos.t1).toEqual({ x: 0, y: 0 });
    s = addTela(s, "s1", "central", telas);      // central entra à direita da tira (128px)
    expect(s[0].telaIds).toEqual(["t1", "central"]);
    expect(s[0].pos.central).toEqual({ x: 128, y: 0 });
  });

  it("adicionar numa Screen TIRA da outra (não duplica cabeamento)", () => {
    let s = [makeScreen("s1", "A"), makeScreen("s2", "B")];
    s = addTela(s, "s1", "t1", telas);
    s = addTela(s, "s2", "t1", telas); // move de s1 pra s2
    expect(s[0].telaIds).toEqual([]);
    expect(s[0].pos.t1).toBeUndefined();
    expect(s[1].telaIds).toEqual(["t1"]);
    expect(screenOfTela(s, "t1").id).toBe("s2");
  });

  it("adicionar a mesma tela duas vezes não duplica", () => {
    let s = [makeScreen("s1", "A")];
    s = addTela(s, "s1", "t1", telas);
    s = addTela(s, "s1", "t1", telas);
    expect(s[0].telaIds).toEqual(["t1"]);
  });
});

describe("removeTela", () => {
  it("tira a tela e limpa a posição", () => {
    let s = [makeScreen("s1", "A")];
    s = addTela(s, "s1", "t1", telas);
    s = removeTela(s, "s1", "t1");
    expect(s[0].telaIds).toEqual([]);
    expect(s[0].pos.t1).toBeUndefined();
  });
});

describe("screenSize / screenTelas", () => {
  it("bbox = envolvente dos membros na posição salva", () => {
    const s = { id: "s1", telaIds: ["t1", "central"], pos: { t1: { x: 0, y: 0 }, central: { x: 128, y: 0 } } };
    // tira 128×768 em x=0 + central 1280×768 em x=128 → 1408×768
    expect(screenSize(s, telas)).toEqual({ w: 1408, h: 768 });
  });
  it("Screen vazia = 0×0", () => {
    expect(screenSize(makeScreen("s1", "A"), telas)).toEqual({ w: 0, h: 0 });
  });
  it("screenTelas resolve na ordem de telaIds", () => {
    const s = { telaIds: ["central", "t1"], pos: {} };
    expect(screenTelas(s, telas).map((t) => t.id)).toEqual(["central", "t1"]);
  });
});

describe("arrangeScreen — sugestão por modelo", () => {
  it("Screen só de tiras: enfileira lado a lado (mesmo modelo, uma faixa)", () => {
    const s = { telaIds: ["t1", "central"], pos: {} };
    const pos = arrangeScreen(s, telas);
    expect(pos.t1).toEqual({ x: 0, y: 0 });
    expect(pos.central).toEqual({ x: 128, y: 0 }); // depois da tira
  });
  it("Screen mista (D2): cada modelo vira uma faixa empilhada", () => {
    const s = { telaIds: ["imagD", "t1"], pos: {} };
    const pos = arrangeScreen(s, telas);
    expect(pos.imagD).toEqual({ x: 0, y: 0 });   // faixa 192×192
    expect(pos.t1).toEqual({ x: 0, y: 576 });     // tira desce pra faixa nova
  });
});

describe("oneScreenPerTela (D4)", () => {
  it("uma Screen por tela, cada uma com sua tela em 0,0", () => {
    let n = 0;
    const s = oneScreenPerTela(telas, () => `s${++n}`);
    expect(s.length).toBe(4);
    expect(s[0]).toMatchObject({ id: "s1", nome: "IMAG Dir", telaIds: ["imagD"], pos: { imagD: { x: 0, y: 0 } } });
    expect(unassignedTelas(s, telas)).toEqual([]); // nada sobra
  });
});
