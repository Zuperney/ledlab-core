// canvasCabling.test.js — a corrente atravessando telas no canvas do processador.
import { describe, it, expect } from "vitest";
import { canvasCells, snakeCells, canvasPorts, portSavings, portBboxPx, projectSignalPorts, projectPortSummary, projectPixelMapRows, projectPixelMapCSV, PROJECT_PIXELMAP_COLS, canvasAtivo, canvasPositions } from "./canvasCabling.js";
import { packByModel } from "./layout.js";

const gabTira = { resX: "128", resY: "256", pwrMax: "200", fp: "0.9", conector: "PowerCON Azul/Branco" };
const gabImag = { resX: "192", resY: "192", pwrMax: "150", fp: "0.9", conector: "PowerCON Azul/Branco" };
const mk = (id, gabinete, cols, rows) => ({ id, gabinete, cols, rows, cabling: { sinal: { rule: "px" } } });

// projeto real "Colação de Grau" (VX1000, 10 portas físicas), na ordem da lista dele
const colacao = [
  mk("imagD", gabImag, 6, 3), mk("imagE", gabImag, 6, 3),
  mk("t4", gabTira, 1, 3), mk("t3", gabTira, 1, 3), mk("t2", gabTira, 1, 3), mk("t1", gabTira, 1, 3),
  mk("central", gabTira, 10, 3),
];
const dimOf = (t) => ({ w: t.cols * parseFloat(t.gabinete.resX), h: t.rows * parseFloat(t.gabinete.resY) });
const posColacao = packByModel(colacao.map((t) => ({ id: t.id, ...dimOf(t), model: `${t.gabinete.resX}x${t.gabinete.resY}` }))).pos;

describe("canvasCells", () => {
  it("põe cada gabinete na coordenada do canvas, não da tela", () => {
    const cells = canvasCells(colacao, posColacao);
    expect(cells.length).toBe(2 * 18 + 4 * 3 + 30); // 78 gabinetes
    // a Central começa em x=512 (depois das 4 tiras) e y=576 (faixa 2)
    const c0 = cells.find((c) => c.telaId === "central" && c.c === 0 && c.r === 0);
    expect(c0).toMatchObject({ x: 512, y: 576, w: 128, h: 256 });
  });

  it("tela sem posição no canvas fica de fora (canvas é opcional)", () => {
    expect(canvasCells(colacao, {}).length).toBe(0);
    expect(canvasCells(colacao, { t1: { x: 0, y: 0 } }).length).toBe(3);
  });
});

describe("snakeCells — serpentina atravessando telas", () => {
  // grade 2×2 de células de 100×100, em (0,0)
  const grid = [
    { x: 0, y: 0 }, { x: 100, y: 0 },
    { x: 0, y: 100 }, { x: 100, y: 100 },
  ].map((c, i) => ({ ...c, w: 100, h: 100, id: i }));

  it("bl + updown: começa embaixo-esquerda, sobe a 1ª coluna e desce a 2ª", () => {
    expect(snakeCells(grid, "updown", "bl").map((c) => [c.x, c.y]))
      .toEqual([[0, 100], [0, 0], [100, 0], [100, 100]]);
  });

  it("tr + updown: começa em cima-direita", () => {
    expect(snakeCells(grid, "updown", "tr")[0]).toMatchObject({ x: 100, y: 0 });
  });

  it("zigzag varre linha a linha", () => {
    expect(snakeCells(grid, "zigzag", "bl").map((c) => [c.x, c.y]))
      .toEqual([[0, 100], [100, 100], [100, 0], [0, 0]]);
  });

  it("cobre tudo sem repetir, em qualquer canto/roteamento", () => {
    for (const routing of ["updown", "zigzag"])
      for (const corner of ["bl", "br", "tl", "tr"]) {
        const out = snakeCells(canvasCells(colacao, posColacao), routing, corner);
        expect(out.length).toBe(78);
        expect(new Set(out.map((c) => `${c.telaId}:${c.c},${c.r}`)).size).toBe(78);
      }
  });

  it("a corrente ATRAVESSA telas: as 4 tiras + Central viram uma cadeia só", () => {
    const tiras = canvasCells(colacao, posColacao).filter((c) => c.model === "128x256");
    const chain = snakeCells(tiras, "updown", "bl");
    expect(chain.length).toBe(42); // 4 tiras (12) + Central (30)
    // 14 colunas contíguas de x=0 a x=1664, sem pular
    const xs = [...new Set(chain.map((c) => c.x))].sort((a, b) => a - b);
    expect(xs.length).toBe(14);
    expect(xs).toEqual(Array.from({ length: 14 }, (_, i) => i * 128));
    // e a cadeia passa por mais de uma tela
    expect(new Set(chain.slice(0, 6).map((c) => c.telaId)).size).toBeGreaterThan(1);
  });
});

describe("canvasPorts — o ganho real da Colação de Grau", () => {
  it("cada porta só encadeia gabinetes do MESMO modelo", () => {
    for (const port of canvasPorts(colacao, posColacao))
      expect(new Set(port.map((c) => c.model)).size).toBe(1);
  });

  it("cobre todos os 78 gabinetes, sem repetir e sem passar do budget", () => {
    const ports = canvasPorts(colacao, posColacao);
    const seen = new Set();
    for (const p of ports) {
      expect(p.length).toBeLessThanOrEqual(20); // maior budget dos dois modelos
      for (const c of p) seen.add(`${c.telaId}:${c.c},${c.r}`);
    }
    expect(seen.size).toBe(78);
  });

  it("10 portas isoladas → 6 com o cabo cruzando tela (a VX1000 tem 10)", () => {
    const s = portSavings(colacao, posColacao);
    expect(s.isolado).toBe(10); // IMAGs 2+2 · 4 tiras 1 cada · Central 2
    expect(s.canvas).toBe(6); //  IMAGs 36/17=3 · tiras+Central 42/20=3
    expect(s.economia).toBe(4);
  });

  it("as tiras deixam de comer uma porta cada: 42 gab do modelo em 3 portas de 14", () => {
    const tiraPorts = canvasPorts(colacao, posColacao).filter((p) => p[0].model === "128x256");
    expect(tiraPorts.map((p) => p.length)).toEqual([14, 14, 14]); // balanceado
  });

  it("sem canvas não inventa porta nenhuma", () => {
    expect(canvasPorts(colacao, {})).toEqual([]);
    expect(canvasPorts([], {})).toEqual([]);
  });
});

describe("portBboxPx — a régua de área medida no canvas", () => {
  it("faixa cheia: retângulo = pixels reais (é sólida, não tem buraco)", () => {
    const tiras = canvasCells(colacao, posColacao).filter((c) => c.model === "128x256");
    expect(portBboxPx(tiras)).toBe(1792 * 768); // 14 col × 128 por 3 lin × 256
    expect(portBboxPx(tiras)).toBe(42 * 128 * 256); // = pixels reais
  });

  it("o buraco é cobrado: duas tiras separadas pela Central engolem o meio", () => {
    const cells = canvasCells(colacao, posColacao);
    const t4 = cells.filter((c) => c.telaId === "t4"); // x=0
    const central = cells.filter((c) => c.telaId === "central"); // x=512..1664
    const bbox = portBboxPx([...t4, ...central.slice(-3)]); // t4 + última coluna da Central
    expect(bbox).toBe(1792 * 768); // engoliu tudo entre elas
    expect(bbox).toBeGreaterThan(6 * 128 * 256); // muito acima dos 6 gabinetes reais
  });
});

// ── FONTE ÚNICA ──
// O bug que a fase C existe pra matar: o Canvas dizia 1 porta e o Relatório dizia
// 3, na mesma tela. Um app com duas respostas pra mesma pergunta é pior que um app
// com uma resposta conservadora.
describe("projectSignalPorts — uma resposta só", () => {
  const semCanvas = { telas: colacao };
  const comCanvas = { telas: colacao, canvas: { pos: posColacao } };

  it("sem canvas: segue a alocação por tela (legado intacto)", () => {
    const { ports, canvas } = projectSignalPorts(semCanvas);
    expect(canvas).toBe(false);
    expect(ports.length).toBe(10); // igual à fase 0
  });

  it("com canvas ativo: a corrente atravessa e cai pra 6", () => {
    const { ports, canvas } = projectSignalPorts(comCanvas);
    expect(canvas).toBe(true);
    expect(ports.length).toBe(6);
  });

  it("canvas VAZIO não conta como ativo — é só pré-visualização", () => {
    expect(canvasAtivo({ telas: colacao })).toBe(false);
    expect(canvasAtivo({ telas: colacao, canvas: {} })).toBe(false);
    expect(canvasAtivo({ telas: colacao, canvas: { pos: {} } })).toBe(false);
    expect(canvasAtivo(comCanvas)).toBe(true);
  });

  it("os dois caminhos devolvem o MESMO formato — é o que deixa a fonte ser única", () => {
    for (const p of [semCanvas, comCanvas])
      for (const port of projectSignalPorts(p).ports)
        for (const cell of port)
          expect(cell).toMatchObject({
            telaId: expect.any(String), c: expect.any(Number), r: expect.any(Number),
            x: expect.any(Number), y: expect.any(Number), w: expect.any(Number), h: expect.any(Number),
          });
  });

  it("os dois caminhos cobrem os 78 gabinetes, sem repetir", () => {
    for (const p of [semCanvas, comCanvas]) {
      const seen = new Set();
      for (const port of projectSignalPorts(p).ports)
        for (const c of port) seen.add(`${c.telaId}:${c.c},${c.r}`);
      expect(seen.size).toBe(78);
    }
  });

  it("tela nova entra no canvas sem ficar empilhada na origem", () => {
    const extra = mk("nova", gabTira, 2, 3);
    const pos = canvasPositions({ telas: [...colacao, extra], canvas: { pos: posColacao } });
    expect(pos.nova).toBeDefined();
    expect(pos.imagD).toEqual(posColacao.imagD); // não mexe nas salvas
  });
});

describe("projectPixelMapRows — X/Y que o operador digita no NovaLCT", () => {
  const comCanvas = { telas: colacao, canvas: { pos: posColacao } };

  it("com canvas, o X/Y é da Screen inteira — não reinicia a cada tela", () => {
    const { rows, canvas } = projectPixelMapRows(comCanvas);
    expect(canvas).toBe(true);
    expect(rows.length).toBe(78);
    const central = rows.find((r) => r.tela === undefined || r.x === 512);
    expect(rows.some((r) => r.x === 512 && r.y === 576)).toBe(true); // 1º gab da Central
    expect(central).toBeDefined();
  });

  it("traz a coluna Tela — sem ela não dá pra achar o gabinete numa porta que cruza", () => {
    const { rows } = projectPixelMapRows(comCanvas);
    const p1 = rows.filter((r) => r.port === 1);
    expect(new Set(p1.map((r) => r.tela)).size).toBeGreaterThan(0);
    expect(PROJECT_PIXELMAP_COLS.map((c) => c[0])).toContain("tela");
  });

  it("a porta numerada bate com o resumo", () => {
    const { rows } = projectPixelMapRows(comCanvas);
    const { ports } = projectPortSummary(comCanvas);
    expect(Math.max(...rows.map((r) => r.port))).toBe(ports.length);
    expect(rows.filter((r) => r.port === 1).length).toBe(ports[0].count);
  });

  it("CSV: cabeçalho pt-BR, ';' e CRLF", () => {
    const csv = projectPixelMapCSV(comCanvas);
    expect(csv.split("\r\n")[0]).toBe("Porta;Ordem;Tela;Coluna;Linha;X (px);Y (px);Largura;Altura");
    expect(csv.split("\r\n").length).toBe(79); // cabeçalho + 78 gabinetes
  });
});

describe("projectPortSummary", () => {
  it("marca as portas que atravessam tela — por ID, não por nome", () => {
    const { ports } = projectPortSummary({ telas: colacao, canvas: { pos: posColacao } });
    expect(ports.length).toBe(6);
    expect(ports.filter((p) => p.cruza).length).toBeGreaterThan(0);
    for (const p of ports) expect(p.pct).toBeGreaterThan(0);
  });

  it("tela SEM nome ainda é detectada como cruzada (o nome é só rótulo)", () => {
    // as telas da fixture não têm `nome`: contar nome dava "não cruza" pra porta
    // que cruza. É o bug que a checagem por telaIds mata.
    const { ports } = projectPortSummary({ telas: colacao, canvas: { pos: posColacao } });
    const cruzada = ports.find((p) => p.cruza);
    expect(cruzada.telaIds.length).toBeGreaterThan(1);
    expect(cruzada.telas).toEqual(cruzada.telaIds.map(() => "sem nome"));
  });

  it("com nome, o resumo mostra o caminho da corrente", () => {
    const comNome = colacao.map((t) => ({ ...t, nome: t.id.toUpperCase() }));
    const { ports } = projectPortSummary({ telas: comNome, canvas: { pos: posColacao } });
    const cruzada = ports.find((p) => p.cruza);
    expect(cruzada.telas.length).toBeGreaterThan(1);
    expect(cruzada.telas.join(" → ")).toMatch(/→/);
  });

  it("uso em % respeita a régua da tela (px real, não o retângulo)", () => {
    const { ports } = projectPortSummary({ telas: colacao, canvas: { pos: posColacao } });
    const tira = ports.find((p) => p.count === 14); // 14 × 32.768 = 458.752 de 655.360 = 70%
    expect(tira.pct).toBe(70);
  });
});
