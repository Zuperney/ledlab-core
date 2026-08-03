import { describe, it, expect } from "vitest";
import { DISC, capaNomeCqi, videoOf, distVisaoOf, GLOSSARIO } from "./reportContent.js";

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

describe("distVisaoOf — parágrafo da seção Vídeo (réguas de distância)", () => {
  it("tela com pitch e altura: as quatro réguas com vírgula e a máx por altura × 30", () => {
    // pitch 5,77 mm · altura 4 × 600 mm = 2,4 m → máx 72 m
    const s = distVisaoOf({ nome: "Main", cols: 10, rows: 4, gabinete: { resX: "104", resY: "104", dimW: "600", dimH: "600" } });
    expect(s).toContain("Main: mín 5,8 m");
    expect(s).toContain("ótima 17,6 m");
    expect(s).toContain("retina 19,8 m");
    expect(s).toContain("máx 72,0 m");
  });
  it("sem dimW (pitch desconhecido) → null: a tela é omitida do parágrafo", () => {
    expect(distVisaoOf({ nome: "X", cols: 3, rows: 7, gabinete: { resX: "336", resY: "336" } })).toBeNull();
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
