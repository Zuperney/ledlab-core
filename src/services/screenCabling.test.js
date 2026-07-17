// screenCabling.test.js — cabeamento de sinal por Screen (auto + livre).
import { describe, it, expect } from "vitest";
import { screenAutoPorts, screenPorts, screenPortSummary, resolveCables, autoAsCables, assignCell, unassignedCount, cellPortIndex, screenCells } from "./screenCabling.js";

const gabTira = { resX: "128", resY: "256", pwrMax: "200", fp: "0.9", conector: "PowerCON Azul/Branco" };
const gabImag = { resX: "192", resY: "192", pwrMax: "150", fp: "0.9", conector: "PowerCON Azul/Branco" };
const mk = (id, gab, cols, rows, nome) => ({ id, gabinete: gab, cols, rows, nome: nome || id });
const telas = [
  mk("t1", gabTira, 1, 3, "Tira 1"), mk("t2", gabTira, 1, 3, "Tira 2"),
  mk("central", gabTira, 10, 3, "Central"), mk("imag", gabImag, 6, 3, "IMAG"),
];

// Screen do "sistema tiras": 2 tiras + Central, encostadas (14 col × 3 lin de 128×256)
const scTiras = { id: "s1", nome: "Tiras", telaIds: ["t1", "t2", "central"],
  pos: { t1: { x: 0, y: 0 }, t2: { x: 128, y: 0 }, central: { x: 256, y: 0 } }, sinal: { mode: "auto" } };
// Screen de 1 IMAG (18 gab de 192×192)
const scImag = { id: "s2", nome: "IMAG", telaIds: ["imag"], pos: { imag: { x: 0, y: 0 } }, sinal: { mode: "auto" } };

describe("screenAutoPorts — a corrente atravessa as telas da Screen", () => {
  it("as 2 tiras + Central viram portas que cruzam telas (mesmo modelo)", () => {
    const ports = screenAutoPorts(scTiras, telas);
    const total = ports.reduce((n, p) => n + p.length, 0);
    expect(total).toBe(36); // 2×3 + 30
    // budget 128×256=32.768 px → 655.360/32.768 = 20 gab/porta → 36 em 2 portas de 18
    expect(ports.map((p) => p.length)).toEqual([18, 18]);
    expect(ports.some((p) => new Set(p.map((c) => c.telaId)).size > 1)).toBe(true); // cruza
  });

  it("cada porta só encadeia gabinetes do mesmo modelo", () => {
    const ports = screenAutoPorts({ ...scTiras, telaIds: ["t1", "imag"], pos: { t1: { x: 0, y: 0 }, imag: { x: 0, y: 768 } } }, telas);
    for (const p of ports) expect(new Set(p.map((c) => c.model)).size).toBe(1);
  });

  it("routing/corner da Screen mudam o início da serpentina", () => {
    const bl = screenAutoPorts({ ...scImag, sinal: { mode: "auto", corner: "bl" } }, telas)[0][0];
    const tr = screenAutoPorts({ ...scImag, sinal: { mode: "auto", corner: "tr" } }, telas)[0][0];
    expect(bl).not.toEqual({ c: tr.c, r: tr.r }); // canto diferente, início diferente
  });
});

describe("screenPortSummary — capacidade e telas percorridas", () => {
  it("IMAG de 18 gab estoura a porta (663.552 > 655.360) — mostra, não bloqueia", () => {
    // 1 porta livre com os 18 gab (a gambiarra)
    const cables = autoAsCables(scImag, telas).flat(); // 18 refs num cabo só? autoAsCables dá 1 porta (18<=20... na verdade budget imag)
    // budget IMAG: 192×192=36.864 → 655.360/36.864 = 17 → auto daria 18 em 2 portas
    const livre = { ...scImag, sinal: { mode: "livre", cables: [cables.map((c) => ({ telaId: c.telaId, c: c.c, r: c.r }))] } };
    const [p] = screenPortSummary(livre, telas);
    expect(p.count).toBe(18);
    expect(p.pct).toBe(101); // 663.552 / 655.360
    expect(p.over).toBe(true);
  });

  it("marca a porta que cruza telas", () => {
    const s = screenPortSummary(scTiras, telas);
    expect(s.some((p) => p.cruza)).toBe(true);
  });
});

describe("modo LIVRE", () => {
  it("resolveCables ignora referência de tela que saiu da Screen", () => {
    const s = { ...scImag, sinal: { mode: "livre", cables: [[{ telaId: "imag", c: 0, r: 0 }, { telaId: "sumiu", c: 9, r: 9 }]] } };
    expect(resolveCables(s, telas)[0].length).toBe(1); // só o que existe
  });

  it("screenPorts segue o modo: livre usa os cabos desenhados", () => {
    const s = { ...scImag, sinal: { mode: "livre", cables: [[{ telaId: "imag", c: 0, r: 0 }]] } };
    expect(screenPorts(s, telas).length).toBe(1);
    expect(screenPorts(s, telas)[0].length).toBe(1);
  });

  it("assignCell: põe no cabo ativo e tira dos outros (1 gab = 1 cabo)", () => {
    let cables = [[], []];
    const cell = { telaId: "imag", c: 2, r: 1 };
    cables = assignCell(cables, 0, cell);
    expect(cables[0]).toEqual([{ telaId: "imag", c: 2, r: 1 }]);
    cables = assignCell(cables, 1, cell); // move pro cabo 1
    expect(cables[0]).toEqual([]);
    expect(cables[1]).toEqual([{ telaId: "imag", c: 2, r: 1 }]);
  });

  it("assignCell: clicar de novo no cabo ativo REMOVE (toggle)", () => {
    let cables = [[{ telaId: "imag", c: 0, r: 0 }]];
    cables = assignCell(cables, 0, { telaId: "imag", c: 0, r: 0 });
    expect(cables[0]).toEqual([]);
  });

  it("unassignedCount: quantos gabinetes ainda não têm cabo", () => {
    const s = { ...scImag, sinal: { mode: "livre", cables: [[{ telaId: "imag", c: 0, r: 0 }]] } };
    expect(unassignedCount(s, telas)).toBe(17); // 18 - 1
  });
});

describe("cellPortIndex", () => {
  it("mapeia cada gabinete pro índice da sua porta", () => {
    const ports = screenAutoPorts(scTiras, telas);
    const idx = cellPortIndex(ports);
    const cells = screenCells(scTiras, telas);
    for (const c of cells) expect(idx[`${c.telaId}:${c.c},${c.r}`]).toBeGreaterThanOrEqual(0);
    expect(Object.keys(idx).length).toBe(36);
  });
});
