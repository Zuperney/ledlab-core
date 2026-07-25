import { describe, it, expect } from "vitest";
import {
  sugereTalha, riggingTela, projectRigging, colunasNoBumper, rigTone, resolveBumper, limitesGabinete,
  BUMPERS, FIXACOES, TALHAS_KG, DEFAULT_RIG,
} from "./rigging.js";

// gabinete padrão dos testes: 8 kg, 500 mm de largura (strings, como o app guarda)
const GAB = { peso: "8", dimW: "500" };
const TELA = { cols: 5, rows: 5, gabinete: GAB };
// com os padrões (bumper 100 cm = 14 kg / 2 pontos, fixação cinta = 5 kg/ponto):
// pesoColuna 40 · colunasPorBumper 2 · bumpers 3 · pontos 6
// carga/ponto = (2×40 + 14) ÷ 2 + 5 = 52

describe("sugereTalha", () => {
  it("a frota é 1 t: aguenta até 1000 kg no ponto", () => {
    expect(sugereTalha(100)).toBe(1000);
    expect(sugereTalha(1000)).toBe(1000);
    expect(sugereTalha(1001)).toBeNull();
  });
  it("null sem carga", () => {
    expect(sugereTalha(0)).toBeNull();
    expect(sugereTalha(NaN)).toBeNull();
  });
  it("utilização reduz o WLL admitido", () => {
    expect(sugereTalha(800, 0.8)).toBe(1000);
    expect(sugereTalha(801, 0.8)).toBeNull(); // acima de 1000×0.8
  });
  it("aceita lista de WLL alternativa (se entrar outra talha na frota)", () => {
    expect(sugereTalha(300, 1, [250, 500, 1000])).toBe(500);
  });
});

describe("colunasNoBumper", () => {
  it("deriva da largura: quantos gabinetes inteiros a viga cobre", () => {
    expect(colunasNoBumper(1000, 500)).toBe(2); // bumper 100 cm × gabinete 500 mm
    expect(colunasNoBumper(500, 500)).toBe(1); // bumper 50 cm × gabinete 500 mm
    expect(colunasNoBumper(1000, 600)).toBe(1); // CB5 (600 mm) no bumper de 100 cm
  });
  it("gabinete mais largo que o bumper ainda vale 1 coluna", () => {
    expect(colunasNoBumper(500, 745)).toBe(1);
  });
  it("override manda; dado faltando cai em 1", () => {
    expect(colunasNoBumper(1000, 500, 3)).toBe(3);
    expect(colunasNoBumper(0, 500)).toBe(1);
    expect(colunasNoBumper(1000, 0)).toBe(1);
  });
});

describe("rigTone", () => {
  it("espelha a regra dos 80% do elétrico", () => {
    expect(rigTone(50)).toBe("ok");
    expect(rigTone(80)).toBe("ok");
    expect(rigTone(81)).toBe("warn");
    expect(rigTone(101)).toBe("over");
  });
});

describe("riggingTela", () => {
  it("tela 5×5 de 8 kg com os padrões (bumper 100 cm de 2 pontos + cinta)", () => {
    const r = riggingTela(TELA);
    expect(r.pesoColuna).toBe(40); // 5 × 8
    expect(r.colunasPorBumper).toBe(2); // derivado: 1000 mm ÷ 500 mm
    expect(r.bumpers).toBe(3); // ceil(5/2)
    expect(r.pontosPorBumper).toBe(2); // vem do bumper, não da config
    expect(r.pontos).toBe(6);
    // pior caso: bumper cheio (2 colunas) + bumper 14 kg, dividido em 2 pontos, + cinta
    expect(r.cargaPorPonto).toBe((2 * 40 + 14) / 2 + 5);
    expect(r.talhaWLL).toBe(1000);
    expect(r.talha).toBe(1000);
    expect(r.tone).toBe("ok");
    expect(r.over).toBe(false);
    expect(r.totalKg).toBe(5 * 40 + 3 * 14); // 242
    expect(r.empilhaOk).toBeNull(); // sem maxRows configurado
  });

  it("bumper de 50 cm de 1 ponto: mais vigas, 1 talha cada", () => {
    const r = riggingTela(TELA, { bumperId: "b50" });
    expect(r.colunasPorBumper).toBe(1);
    expect(r.bumpers).toBe(5);
    expect(r.pontos).toBe(5);
    expect(r.cargaPorPonto).toBe(40 + 8 + 5); // 1 coluna + bumper 8 kg + cinta
  });

  it("mesma largura, 2 pontos: o 50 cm do 2.9 RGB Share reparte a carga", () => {
    const umPonto = riggingTela(TELA, { bumperId: "b50" });
    const doisPontos = riggingTela(TELA, { bumperId: "b50p2" });
    expect(doisPontos.bumpers).toBe(umPonto.bumpers); // mesma largura, mesmas vigas
    expect(doisPontos.pontos).toBe(10);
    expect(doisPontos.cargaPorPonto).toBe((40 + 8) / 2 + 5); // metade da viga + acessórios
  });

  it("fixação por algema/garra pesa menos no ponto que cinta+manilha", () => {
    const garra = riggingTela(TELA, { fixacao: "garra" });
    const cinta = riggingTela(TELA, { fixacao: "cinta" });
    expect(cinta.cargaPorPonto - garra.cargaPorPonto).toBe(2);
    expect(garra.fixacao.acessorios).toContain("Algema/garra");
  });

  it("config sobrescreve os pontos do bumper quando o técnico manda", () => {
    const r = riggingTela(TELA, { bumperId: "b100", pontosPorBumper: 1 });
    expect(r.pontos).toBe(3);
    expect(r.cargaPorPonto).toBe(2 * 40 + 14 + 5); // viga inteira num ponto só
  });

  it("bumper solto do técnico: 2 gabinetes de 64 cm num ponto só (caso ISD Lumen P10)", () => {
    // gabinete pesado (12 kg) de 640 mm, viga robusta de 1,28 m com 1 ponto
    const gab = { peso: "12", dimW: "640" };
    const r = riggingTela({ cols: 6, rows: 8, gabinete: gab }, {
      bumper: { nome: "Bumper 2 gabinetes", larguraMm: 1280, pontos: 1, pesoKg: 25 },
      fixacao: "garra",
    });
    expect(r.colunasPorBumper).toBe(2); // 1280 ÷ 640
    expect(r.bumpers).toBe(3);
    expect(r.pontos).toBe(3); // 1 ponto por viga
    expect(r.pesoColuna).toBe(96); // 8 × 12
    expect(r.cargaPorPonto).toBe(2 * 96 + 25 + 3); // 220 kg num ponto só
    expect(r.tone).toBe("ok"); // ainda folgado na talha de 1 t
    expect(r.bumper.nome).toBe("Bumper 2 gabinetes");
  });

  it("tela mais estreita que o bumper não conta coluna fantasma", () => {
    const r = riggingTela({ cols: 1, rows: 5, gabinete: GAB });
    expect(r.bumpers).toBe(1);
    expect(r.cargaPorPonto).toBe((1 * 40 + 14) / 2 + 5); // só 1 coluna existe, em 2 pontos
  });

  it("gabinete mais largo que o bumper avisa", () => {
    const r = riggingTela({ cols: 3, rows: 3, gabinete: { peso: "13.5", dimW: "600" } }, { bumperId: "b50" });
    expect(r.colunasPorBumper).toBe(1);
    expect(r.avisos.some((a) => a.includes("mais largo"))).toBe(true);
  });

  it("estouro: carga por ponto acima da talha de 1 t", () => {
    // 2 colunas × 20 gabinetes × 60 kg = 2400 kg + bumper
    const r = riggingTela({ cols: 4, rows: 20, gabinete: { peso: "60", dimW: "500" } });
    expect(r.cargaPorPonto).toBeGreaterThan(1000);
    expect(r.talha).toBeNull();
    expect(r.tone).toBe("over");
    expect(r.over).toBe(true);
  });

  it("atenção: entre 80% e 100% do WLL", () => {
    // (2 colunas × 880 kg + 14) ÷ 2 pontos + 5 = 892 kg → 89,2% do WLL
    const r = riggingTela({ cols: 4, rows: 11, gabinete: { peso: "80", dimW: "500" } });
    expect(r.tone).toBe("warn");
    expect(r.over).toBe(false);
  });

  it("empilhamento: maxRows checa a altura da coluna", () => {
    expect(riggingTela(TELA, { maxRows: 8 }).empilhaOk).toBe(true);
    expect(riggingTela(TELA, { maxRows: 4 }).empilhaOk).toBe(false);
  });

  it("tela vazia/sem gabinete não explode", () => {
    const r = riggingTela({ cols: 0, rows: 0 });
    expect(r).toMatchObject({ bumpers: 0, pontos: 0, cargaPorPonto: 0, totalKg: 0, over: false });
    expect(riggingTela(undefined).over).toBe(false);
  });
});

describe("projectRigging", () => {
  it("soma telas e reporta o pior tom", () => {
    const p = { telas: [TELA, { cols: 2, rows: 2, gabinete: GAB }] };
    const r = projectRigging(p);
    expect(r.telas).toHaveLength(2);
    expect(r.totalKg).toBe(242 + (2 * 16 + 1 * 14)); // 242 + 46
    expect(r.pontos).toBe(6 + 2); // 2 pontos por bumper de 100 cm
    expect(r.bumpers).toBe(3 + 1);
    expect(r.algumOver).toBe(false);
    expect(r.tone).toBe("ok");
  });
  it("uma tela estourada contamina o tom do projeto", () => {
    const p = { telas: [TELA, { cols: 4, rows: 20, gabinete: { peso: "60", dimW: "500" } }] };
    expect(projectRigging(p)).toMatchObject({ algumOver: true, tone: "over" });
  });
  it("projeto vazio", () => {
    expect(projectRigging({})).toMatchObject({ totalKg: 0, pontos: 0, algumOver: false, tone: "ok" });
  });
  it("catálogo e defaults batem com a frota do espeque", () => {
    expect(BUMPERS.map((b) => [b.larguraMm, b.pontos])).toEqual([[500, 1], [500, 2], [1000, 2]]);
    expect(FIXACOES.map((f) => f.id)).toEqual(["garra", "cinta"]);
    expect(TALHAS_KG).toEqual([1000]); // talhas manuais de 1 t
    expect(DEFAULT_RIG.colunasPorBumper).toBeNull(); // derivado da largura
    expect(DEFAULT_RIG.pontosPorBumper).toBeNull(); // vem do bumper
    expect(DEFAULT_RIG.talhaWLL).toBe(1000);
  });
});

describe("limites do fabricante (a cadeia)", () => {
  // gabinete 500×500 com os limites da Unilumin UpadIV: voado 10 m, empilhado 6 m
  const UNI = { peso: "8", dimW: "500", dimH: "500", rigging: { voadoMaxM: 10, empilhadoMaxM: 6, fonte: "Manual UpadIV cap. 2.2", conferido: true } };

  it("dentro do limite voado: 12 gabinetes = 6 m", () => {
    const r = riggingTela({ cols: 4, rows: 12, gabinete: UNI });
    expect(r.alturaM).toBe(6);
    expect(r.limiteAcima).toBe(false);
    expect(r.elo).toBeNull();
    expect(r.checks.find((k) => k.id === "voadoM")).toMatchObject({ status: "ok", limite: 10 });
  });

  it("acima do limite voado: 21 gabinetes = 10,5 m", () => {
    const r = riggingTela({ cols: 4, rows: 21, gabinete: UNI });
    expect(r.alturaM).toBe(10.5);
    expect(r.limiteAcima).toBe(true);
    expect(r.tone).toBe("over");
    expect(r.elo).toBe("fabricante"); // trava no fabricante, não na talha
    expect(r.talhaOver).toBe(false); // a talha estava folgada
  });

  it("empilhado é mais restrito que voado: 8 m passa voado e estoura no chão", () => {
    const tela = { cols: 4, rows: 16, gabinete: UNI };
    expect(riggingTela(tela).limiteAcima).toBe(false); // voado, limite 10 m
    expect(riggingTela(tela, { modo: "empilhado" }).limiteAcima).toBe(true); // chão, limite 6 m
  });

  it("limite por barra (Absen: 20 painéis de 500×500 por barra)", () => {
    const gab = { peso: "8", dimW: "500", dimH: "500", rigging: { porBarraMaxQtd: 20 } };
    // bumper de 100 cm = 2 colunas; 11 de altura = 22 painéis na barra
    const r = riggingTela({ cols: 6, rows: 11, gabinete: gab });
    expect(r.gabPorBarra).toBe(22);
    expect(r.checks.find((k) => k.id === "porBarra")).toMatchObject({ status: "acima", limite: 20 });
    expect(r.elo).toBe("fabricante");
  });

  it("sem dado do fabricante NÃO vira ok — vira aviso", () => {
    const r = riggingTela({ cols: 4, rows: 40, gabinete: { peso: "8", dimW: "500", dimH: "500" } });
    expect(r.checks.every((k) => k.status === "semDado")).toBe(true);
    expect(r.limiteAcima).toBe(false); // não podemos afirmar que estourou
    expect(r.limiteSemDado).toBe(true);
    expect(r.avisos.some((a) => a.includes("não publica"))).toBe(true);
  });

  it("trava extra por altura (YES TECH MG6S: 3º conector C acima de 8)", () => {
    const gab = { peso: "8", dimW: "500", dimH: "500", rigging: { travaExtraAcima: 8 } };
    expect(riggingTela({ cols: 2, rows: 8, gabinete: gab }).avisos.some((a) => a.includes("trava extra"))).toBe(false);
    expect(riggingTela({ cols: 2, rows: 9, gabinete: gab }).avisos.some((a) => a.includes("trava extra"))).toBe(true);
  });

  it("sem altura do gabinete, avisa em vez de checar metro errado", () => {
    const r = riggingTela({ cols: 2, rows: 5, gabinete: { peso: "8", dimW: "500", rigging: { voadoMaxM: 10 } } });
    expect(r.alturaM).toBe(0);
    expect(r.avisos.some((a) => a.includes("Altura do gabinete"))).toBe(true);
  });

  it("limitesGabinete normaliza vazio, zero e string", () => {
    expect(limitesGabinete({ rigging: { voadoMaxM: "10", voadoMaxQtd: "", empilhadoMaxM: 0 } }))
      .toMatchObject({ voadoMaxM: 10, voadoMaxQtd: null, empilhadoMaxM: null, conferido: false });
    expect(limitesGabinete(undefined).fonte).toBe("");
  });

  it("tela vazia não gera checagem", () => {
    expect(riggingTela({ cols: 0, rows: 0 }).checks).toEqual([]);
  });
});

describe("resolveBumper", () => {
  it("objeto do técnico ganha do catálogo", () => {
    const b = resolveBumper({ bumperId: "b50", bumper: { nome: "Meu", larguraMm: 640, pontos: 2, pesoKg: 11 } });
    expect(b).toMatchObject({ nome: "Meu", larguraMm: 640, pontos: 2, pesoKg: 11, estimado: false });
  });
  it("bumper do técnico sem peso fica marcado como estimado", () => {
    expect(resolveBumper({ bumper: { larguraMm: 500, pontos: 1 } }).estimado).toBe(true);
  });
  it("pontos nunca ficam abaixo de 1", () => {
    expect(resolveBumper({ bumper: { larguraMm: 500, pontos: 0 } }).pontos).toBe(1);
  });
  it("sem nada, cai no padrão do catálogo", () => {
    expect(resolveBumper({}).id).toBe("b50");
  });
});
