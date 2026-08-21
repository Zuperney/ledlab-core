import { describe, it, expect } from "vitest";
import { DISC, capaNomeCqi, videoOf, distVisaoGroups, GLOSSARIO, canvasResumo } from "./reportContent.js";

// (a suíte de rigging saiu junto com o motor — decisão do dono, 02/08/2026;
// reservado pro futuro 3D. Ver docs/rigging-*.md.)

describe("videoOf — resolução/aspecto/fração", () => {
  const t = { cols: 3, rows: 7, gabinete: { resX: "336", resY: "336" } }; // 1008 × 2352
  it("aspecto simplificado + fração decimal de 3 casas (pedido do dono: 3:7 · 0,428)", () => {
    const v = videoOf(t);
    expect(v.pxW).toBe(1008);
    expect(v.pxH).toBe(2352);
    expect(v.ar).toBe("3:7");
    expect(v.dec).toBe("0.429"); // 1008/2352 = 0.42857… → 3 casas
  });
  it("sem altura → dec vira travessão", () => {
    expect(videoOf({ cols: 2, rows: 0, gabinete: { resX: "100", resY: "100" } }).dec).toBe("—");
  });
  it("pitch numérico quando o gabinete tem dimW; 0 quando não tem", () => {
    expect(videoOf({ cols: 2, rows: 2, gabinete: { resX: "104", resY: "104", dimW: "600" } }).pitch).toBeCloseTo(5.769, 2);
    expect(videoOf(t).pitch).toBe(0); // fixture sem dimW
  });
});

describe("distVisaoGroups — tabela da seção Vídeo (réguas agrupadas por pitch × altura)", () => {
  const cb5 = { resX: "104", resY: "104", dimW: "600", dimH: "600" };

  it("telas com o mesmo pitch e altura viram UMA linha (feedback do dono: repetir N vezes era parede de texto)", () => {
    const g = distVisaoGroups([
      { nome: "Main", cols: 10, rows: 4, gabinete: cb5 },
      { nome: "Side", cols: 4, rows: 4, gabinete: cb5 }, // mesma altura (4 linhas) → mesmo grupo
      { nome: "Torre", cols: 2, rows: 8, gabinete: cb5 }, // altura diferente → grupo próprio
    ]);
    expect(g).toHaveLength(2);
    expect(g[0].telas).toBe("Main, Side");
    expect(g[0].pitch).toBe("5,77 mm");
    expect(g[0].min).toBe("5,8 m");
    expect(g[0].otima).toBe("17,6 m");
    expect(g[0].retina).toBe("19,8 m");
    expect(g[0].max).toBe("72,0 m"); // 4 × 600 mm = 2,4 m × 30
    expect(g[1].telas).toBe("Torre");
    expect(g[1].max).toBe("144 m"); // ≥ 100 m sai sem casa decimal
  });

  it("tela sem dimW (pitch desconhecido) é omitida; nenhum grupo → []", () => {
    const semPitch = { nome: "X", cols: 3, rows: 7, gabinete: { resX: "336", resY: "336" } };
    expect(distVisaoGroups([semPitch])).toEqual([]);
    expect(distVisaoGroups([semPitch, { nome: "Ok", cols: 2, rows: 4, gabinete: cb5 }])).toHaveLength(1);
  });

  it("dimW NEGATIVO (form sem clamp / backup importado) não crasha — a tela é omitida (QA 02/08)", () => {
    // videoOf calcula pitch por truthiness: dimW "-600" dava pitch -5,77 →
    // viewingOf null → TypeError no formatador, derrubando Caderno DOM e PDF
    const negativo = { nome: "Neg", cols: 2, rows: 4, gabinete: { resX: "104", resY: "104", dimW: "-600", dimH: "600" } };
    expect(distVisaoGroups([negativo])).toEqual([]);
    expect(distVisaoGroups([negativo, { nome: "Ok", cols: 2, rows: 4, gabinete: cb5 }])).toHaveLength(1);
  });
});

describe("GLOSSARIO — enxuto (decisão do dono, 31/07)", () => {
  const termos = GLOSSARIO.map((g) => g.t);
  it("termos removidos não voltam", () => {
    for (const fora of ["Serpentina", "Disjuntor", "Talha", "Bumper", "Ancoragem"]) {
      expect(termos).not.toContain(fora);
    }
  });
  it("Porta × Circuito explica que as contagens são independentes", () => {
    expect(GLOSSARIO.find((g) => g.t === "Porta × Circuito").d).toContain("independentes");
  });
  it("nenhum verbete fala em combustível (o app não calcula isso)", () => {
    expect(JSON.stringify(GLOSSARIO)).not.toContain("combustível");
  });
});

describe("capa e disciplinas", () => {
  it("capaNomeCqi: nome curto fica grande, nome comum encolhe pra caber numa linha", () => {
    expect(capaNomeCqi("AD Summit")).toBe(13.5); // 9 caracteres: no teto
    expect(capaNomeCqi("Ademicom Summit 2026")).toBeCloseTo(8.55, 2); // 20: encolheu
    expect(capaNomeCqi("Ademicom Summit 2026")).toBeLessThan(13.5);
  });

  it("capaNomeCqi: tem piso (nome gigante não vira letra ilegível) e aguenta vazio", () => {
    expect(capaNomeCqi("x".repeat(200))).toBe(5.5);
    expect(capaNomeCqi("")).toBe(13.5);
    expect(capaNomeCqi(null)).toBe(13.5);
  });

  it("cores de disciplina são únicas (e estrutura saiu junto com o rigging)", () => {
    expect(DISC.estr).toBeUndefined();
    expect(new Set(Object.values(DISC)).size).toBe(Object.keys(DISC).length);
  });
});

describe("canvasResumo — o quadro do caderno de Design", () => {
  const gab = { resX: "168", resY: "168", dimW: "500", dimH: "500" }; // Unilumin P2.9 (2,98 mm)
  const tela = (id, cols, rows) => ({ id, cols, rows, gabinete: gab });

  // ⚠️ SEM O VÃO (dono, 20/08). O espaço entre as telas no canvas é referência
  // visual de como elas ficam separadas no palco — não é LED, não é
  // processamento, e não pode virar resolução de conteúdo.
  it("o vão entre as telas não vira pixel de canvas", () => {
    // duas de 10×2 (1.680 × 336) lado a lado, com 500 px de respiro no desenho
    const telas = [tela("a", 10, 2), tela("b", 10, 2)];
    const cv = canvasResumo(telas, { a: { x: 0, y: 0 }, b: { x: 2180, y: 0 } });
    expect([cv.w, cv.h]).toEqual([3360, 336]); // 1.680 + 1.680, o LED que existe
    expect(cv.caixa).toEqual({ w: 3860, h: 336 }); // a caixa do desenho, à parte
    expect(cv.temVao).toBe(true);
    // os metros seguem a mesma régua: é a soma das telas, não o alcance no palco
    expect(cv.largM).toBeCloseTo(10, 2);
  });

  it("telas encostadas: nada muda, e não há vão pra declarar", () => {
    const telas = [tela("a", 10, 2), tela("b", 10, 2)];
    const cv = canvasResumo(telas, { a: { x: 0, y: 0 }, b: { x: 1680, y: 0 } });
    expect([cv.w, cv.h]).toEqual([3360, 336]);
    expect(cv.temVao).toBe(false);
    expect(cv.caixa).toEqual({ w: cv.w, h: cv.h });
  });

  it("caixa envolvente da Composição, com proporção, megapixels e área de LED", () => {
    // testeira 76×1 em (0,0) + painel 32×9 em (0, 168): canvas 12.768 × 1.680
    const telas = [tela("topo", 76, 1), tela("central", 32, 9)];
    const cv = canvasResumo(telas, { topo: { x: 0, y: 0 }, central: { x: 0, y: 168 } });
    expect([cv.w, cv.h]).toEqual([12768, 1680]);
    expect(cv.mp).toBeCloseTo(21.45, 2);
    expect(cv.areaM2).toBeCloseTo(19 + 72, 2); // 76×0,25 + 288×0,25 m²
  });

  it("metros só quando TODAS as telas têm o MESMO pitch", () => {
    const uma = canvasResumo([tela("a", 10, 2)], { a: { x: 0, y: 0 } });
    expect(uma.largM).toBeCloseTo(5, 2); // 1.680 px × 2,976 mm = 5 m
    expect(uma.altM).toBeCloseTo(1, 2);

    const outroPitch = { ...gab, dimW: "600", dimH: "600" };
    const misto = canvasResumo(
      [tela("a", 10, 2), { id: "b", cols: 4, rows: 2, gabinete: outroPitch }],
      { a: { x: 0, y: 0 }, b: { x: 1680, y: 0 } },
    );
    expect(misto.largM).toBe(0); // canvas sem escala física única não inventa metro
  });

  it("tela sem pitch cadastrado também tira os metros de cena", () => {
    const semDim = canvasResumo([{ id: "x", cols: 4, rows: 2, gabinete: { resX: "128", resY: "128" } }], { x: { x: 0, y: 0 } });
    expect(semDim.largM).toBe(0);
    expect(semDim.w).toBe(512);
  });

  it("projeto vazio não quebra", () => {
    expect(canvasResumo([], {})).toMatchObject({ w: 0, h: 0, mp: 0, areaM2: 0, ar: "—" });
  });
});
