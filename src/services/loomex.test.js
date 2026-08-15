// loomex.test.js — o gerador do .loomex.json (a ponte com o Loomex).
import { describe, it, expect } from "vitest";
import { SINAIS, GRUPOS_SINAL, buildLoomexExport } from "./loomex.js";
import { makeEquip, equipSnapshot } from "./equipamentos.js";

// fixture no molde de screenCabling.test.js: gab 192×192 → budget 655.360/36.864
// = 17 gab/porta; IMAG de 18 gab pede 2 portas, TIRA de 6 gab pede 1.
const gab = { resX: "192", resY: "192", pwrMax: "150", fp: "0.9" };
const telas = [
  { id: "imag", gabinete: gab, cols: 6, rows: 3, nome: "IMAG" },
  { id: "tira", gabinete: gab, cols: 6, rows: 1, nome: "Tira" },
];
const scr = (id, nome, telaIds, extra = {}) => ({
  id, nome, telaIds,
  pos: Object.fromEntries(telaIds.map((t) => [t, { x: 0, y: 0 }])),
  sinal: { rule: "px", strategy: "auto" },
  ...extra,
});

const vx = equipSnapshot(makeEquip({
  nome: "VX400 Pro", marca: "NovaStar", categoria: "controladora",
  portas: [
    { id: "a", nome: "HDMI In", dir: "in", sinal: "hdmi" },
    { id: "b", nome: "Porta 1", dir: "out", sinal: "ethernet" },
    { id: "c", nome: "Porta 2", dir: "out", sinal: "ethernet" },
    { id: "d", nome: "OPT", dir: "out", sinal: "fibra" },
  ],
}));

const project = {
  name: "Show Teste", cliente: "Cliente X", local: "São Paulo/SP",
  dataInicio: "2026-09-01", dataFim: "2026-09-03",
  telas,
  screens: [
    scr("s1", "Principal", ["imag"], { equipamentoId: "eq1", equipamento: vx }),
    scr("s2", "Apoio", ["tira"]), // sem equipamento — bloco solto
  ],
};

const ROWH = 22, HEADH = 38, PADH = 8;
const blockH = (b) => HEADH + Math.max(b.portasEsq.length, b.portasDir.length, 1) * ROWH + PADH;

describe("vocabulário de sinal", () => {
  it("espelha os 23 ids do Loomex, cada um com grupo válido e prefixo de cabo", () => {
    expect(SINAIS).toHaveLength(23);
    const grupos = GRUPOS_SINAL.map(([id]) => id);
    for (const s of SINAIS) {
      expect(grupos).toContain(s.grupo);
      expect(s.pfx.length).toBeGreaterThan(0);
    }
    expect(new Set(SINAIS.map((s) => s.id)).size).toBe(23);
  });
});

describe("buildLoomexExport — estrutura", () => {
  const out = buildLoomexExport(project);

  it("contrato do importador: blocos truthy, todos os campos emitidos", () => {
    expect(Array.isArray(out.blocos)).toBe(true);
    expect(out.blocos.length).toBe(3); // 1 equipamento + 2 Screens
    for (const b of out.blocos) {
      for (const k of ["id", "nome", "categoria", "x", "y", "w", "portasEsq", "portasDir"]) expect(b).toHaveProperty(k);
      expect(Array.isArray(b.portasEsq)).toBe(true);
      expect(Array.isArray(b.portasDir)).toBe(true);
    }
    expect(out.zonas).toEqual([]);
    expect(out.ativos).toHaveLength(23);
    expect(out).not.toHaveProperty("schema"); // decisão D5: sem chave estranha no state do Loomex
  });

  it("meta vem do projeto, data como texto livre início – fim", () => {
    expect(out.meta).toEqual({ nome: "Show Teste", cliente: "Cliente X", local: "São Paulo/SP", data: "2026-09-01 – 2026-09-03" });
  });

  it("equipamento: in→portasEsq, out→portasDir, ids únicos dentro do bloco", () => {
    const eq = out.blocos.find((b) => b.id === "EQ1");
    expect(eq.nome).toBe("VX400 Pro");
    expect(eq.categoria).toBe("NovaStar · Controladora");
    expect(eq.portasEsq.map((p) => p.sinal)).toEqual(["hdmi"]);
    expect(eq.portasDir.map((p) => p.sinal)).toEqual(["ethernet", "ethernet", "fibra"]);
    const ids = eq.portasEsq.concat(eq.portasDir).map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("Screen: portas calculadas viram entradas ethernet com nome 'Porta N · X gab'", () => {
    const sc = out.blocos.find((b) => b.nome === "Principal");
    expect(sc.portasEsq).toHaveLength(2); // 18 gab @ 17/porta → 2 portas balanceadas (9+9)
    expect(sc.portasEsq[0]).toMatchObject({ nome: "Porta 1 · 9 gab", sinal: "ethernet" });
    expect(sc.portasDir).toEqual([]);
    expect(sc.categoria).toBe("LED · 1152×576px");
  });

  it("todo sinal emitido pertence ao vocabulário", () => {
    const validos = new Set(SINAIS.map((s) => s.id));
    for (const b of out.blocos) for (const p of b.portasEsq.concat(b.portasDir)) expect(validos.has(p.sinal)).toBe(true);
    for (const c of out.conexoes) expect(validos.has(c.sinal)).toBe(true);
  });
});

describe("buildLoomexExport — conexões", () => {
  it("consome as saídas ethernet em ordem, solid, com cabos NET001, NET002…", () => {
    const out = buildLoomexExport(project);
    expect(out.conexoes).toHaveLength(2); // 2 portas da Principal; Apoio sem equipamento
    expect(out.conexoes.map((c) => c.cabo)).toEqual(["NET001", "NET002"]);
    expect(out.conexoes.every((c) => c.estilo === "solid" && c.sinal === "ethernet")).toBe(true);
    expect(out.conexoes[0].origem).toEqual({ bloco: "EQ1", porta: "out1" });
    expect(out.conexoes[0].destino.bloco).toBe(out.blocos.find((b) => b.nome === "Principal").id);
  });

  it("Screen sem equipamento não gera conexões (comportamento documentado)", () => {
    const out = buildLoomexExport(project);
    const apoio = out.blocos.find((b) => b.nome === "Apoio");
    expect(out.conexoes.some((c) => c.destino.bloco === apoio.id)).toBe(false);
  });

  it("fila esgotada → round-robin nas mesmas saídas com dashed ('A confirmar')", () => {
    const um = equipSnapshot(makeEquip({ nome: "Mini", portas: [{ nome: "Porta 1", dir: "out", sinal: "ethernet" }] }));
    const p = { ...project, screens: [scr("s1", "Principal", ["imag"], { equipamentoId: "e", equipamento: um })] };
    const out = buildLoomexExport(p);
    expect(out.conexoes).toHaveLength(2);
    expect(out.conexoes[0]).toMatchObject({ estilo: "solid", origem: { bloco: "EQ1", porta: "out1" } });
    expect(out.conexoes[1]).toMatchObject({ estilo: "dashed", origem: { bloco: "EQ1", porta: "out1" } });
  });

  it("equipamento só de fibra: conexões e cabos seguem a fibra (FIB001…)", () => {
    const opt = equipSnapshot(makeEquip({ nome: "Óptico", portas: [
      { nome: "OPT 1", dir: "out", sinal: "fibra" }, { nome: "OPT 2", dir: "out", sinal: "fibra" },
    ] }));
    const p = { ...project, screens: [scr("s1", "Principal", ["imag"], { equipamentoId: "e", equipamento: opt })] };
    const out = buildLoomexExport(p);
    expect(out.conexoes.map((c) => c.cabo)).toEqual(["FIB001", "FIB002"]);
    expect(out.conexoes.every((c) => c.sinal === "fibra")).toBe(true);
  });

  it("equipamento sem saída de dados (player HDMI): bloco entra, conexão não", () => {
    const player = equipSnapshot(makeEquip({ nome: "Player", portas: [{ nome: "HDMI Out", dir: "out", sinal: "hdmi" }] }));
    const p = { ...project, screens: [scr("s1", "Principal", ["imag"], { equipamentoId: "e", equipamento: player })] };
    const out = buildLoomexExport(p);
    expect(out.blocos.some((b) => b.nome === "Player")).toBe(true);
    expect(out.conexoes).toEqual([]);
  });
});

describe("buildLoomexExport — layout e biblioteca", () => {
  it("duas colunas sem sobreposição vertical (altura derivada + respiro)", () => {
    const out = buildLoomexExport(project);
    for (const x of [60, 460]) {
      const col = out.blocos.filter((b) => b.x === x).sort((a, b) => a.y - b.y);
      for (let i = 1; i < col.length; i++) {
        expect(col[i].y).toBeGreaterThanOrEqual(col[i - 1].y + blockH(col[i - 1]));
      }
    }
  });

  it("bibliotecaEquipamentos: deduplicada por nome, portas SEM id (formato template)", () => {
    const dois = {
      ...project,
      screens: [
        scr("s1", "Principal", ["imag"], { equipamentoId: "e1", equipamento: vx }),
        scr("s2", "Apoio", ["tira"], { equipamentoId: "e1", equipamento: vx }),
      ],
    };
    const out = buildLoomexExport(dois);
    expect(out.bibliotecaEquipamentos).toHaveLength(1);
    const t = out.bibliotecaEquipamentos[0];
    expect(t.nome).toBe("VX400 Pro");
    for (const p of t.portasEsq.concat(t.portasDir)) expect(p).not.toHaveProperty("id");
  });

  it("duas Screens no mesmo equipamento: fila continua entre elas (3 solid, 0 dashed)", () => {
    const dois = {
      ...project,
      screens: [
        scr("s1", "Principal", ["imag"], { equipamentoId: "e1", equipamento: vx }),
        scr("s2", "Apoio", ["tira"], { equipamentoId: "e1", equipamento: vx }),
      ],
    };
    const out = buildLoomexExport(dois);
    // Principal pede 2, Apoio pede 1 — VX tem 2 ethernet: a 3ª conexão reutiliza (dashed)
    expect(out.conexoes).toHaveLength(3);
    expect(out.conexoes.filter((c) => c.estilo === "solid")).toHaveLength(2);
    expect(out.conexoes.filter((c) => c.estilo === "dashed")).toHaveLength(1);
    expect(out.blocos.filter((b) => b.id.startsWith("EQ"))).toHaveLength(1); // um bloco só
  });
});
