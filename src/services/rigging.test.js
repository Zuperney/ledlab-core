import { describe, it, expect } from "vitest";
import { riggingTela, projectRigging, limitesGabinete, DEFAULT_RIG } from "./rigging.js";

// gabinete padrão dos testes: 8 kg, 500 mm (strings, como o app guarda)
const GAB = { peso: "8", dimW: "500" };
const TELA = { cols: 5, rows: 5, gabinete: GAB };
// pesoColuna 40 · totalKg 200 — a seção só REGISTRA peso; dimensionamento
// (bumper/ancoragem/talha) saiu do app em 30/07/2026.

describe("riggingTela", () => {
  it("tela 5×5 de 8 kg: peso da parede sai da grade", () => {
    const r = riggingTela(TELA);
    expect(r.pesoColuna).toBe(40); // 5 × 8
    expect(r.totalKg).toBe(200); // 5 colunas × 40
    expect(r.modo).toBe("voado"); // default
    expect(r.tone).toBe("ok");
    expect(r.over).toBe(false);
  });

  it("modo inválido cai em voado", () => {
    expect(riggingTela(TELA, { modo: "pendurado" }).modo).toBe("voado");
    expect(riggingTela(TELA, { modo: "empilhado" }).modo).toBe("empilhado");
  });

  // R3: sem o peso do gabinete a conta toda dá zero — e "0 kg" num documento
  // datado lê como fato. Tem que sair marcado como AUSÊNCIA.
  it("gabinete sem peso marca semPeso e avisa (nunca vira 0 kg silencioso)", () => {
    const r = riggingTela({ cols: 5, rows: 5, gabinete: { dimW: "500", dimH: "500" } });
    expect(r.semPeso).toBe(true);
    expect(r.totalKg).toBe(0);
    expect(r.avisos.some((a) => /Peso do gabinete não informado/.test(a))).toBe(true);
  });
  it("gabinete com peso não marca semPeso", () => {
    expect(riggingTela(TELA).semPeso).toBe(false);
  });
  it("tela sem grade não é 'sem peso' — é tela vazia", () => {
    expect(riggingTela({ cols: 0, rows: 0, gabinete: {} }).semPeso).toBe(false);
  });

  it("tela vazia/sem gabinete não explode", () => {
    const r = riggingTela({ cols: 0, rows: 0 });
    expect(r).toMatchObject({ totalKg: 0, over: false });
    expect(riggingTela(undefined).over).toBe(false);
  });
});

describe("projectRigging", () => {
  it("soma telas e reporta o pior tom", () => {
    const p = { telas: [TELA, { cols: 2, rows: 2, gabinete: GAB }] };
    const r = projectRigging(p);
    expect(r.telas).toHaveLength(2);
    expect(r.totalKg).toBe(200 + 32);
    expect(r.algumOver).toBe(false);
    expect(r.tone).toBe("ok");
  });
  it("uma tela acima do limite contamina o tom do projeto", () => {
    const uni = { peso: "8", dimW: "500", dimH: "500", rigging: { voadoMaxM: 10 } };
    const p = { telas: [TELA, { cols: 4, rows: 21, gabinete: uni }] }; // 10,5 m de 10
    expect(projectRigging(p)).toMatchObject({ algumOver: true, tone: "over" });
  });
  // REGRESSÃO: o limite do fabricante tem que vir VIVO da biblioteca. O snapshot
  // da tela congela o que se sabia na criação; quando o técnico finalmente
  // confirma o número no manual, isso precisa valer pro caderno já emitido.
  describe("limite do fabricante vem da biblioteca viva", () => {
    const telaVelha = { id: "t1", cabId: 9, cols: 6, rows: 14, gabinete: { ...GAB, dimH: "500" } }; // snapshot SEM rigging
    const cabAtual = { id: 9, rigging: { voadoMaxM: 10, fonte: "Manual Absen", conferido: true } };

    it("tela antiga (snapshot sem limites) passa a enxergar o que foi cadastrado depois", () => {
      const semCabs = projectRigging({ telas: [telaVelha] });
      expect(semCabs.telas[0].rig.limiteSemDado).toBe(true); // era isso que saía no Caderno

      const comCabs = projectRigging({ telas: [telaVelha] }, {}, [cabAtual]);
      const r = comCabs.telas[0].rig;
      expect(r.limites.voadoMaxM).toBe(10);
      expect(r.limites.fonte).toBe("Manual Absen");
      expect(r.checks.find((k) => k.id === "voadoM").status).toBe("ok"); // 7 m de 10
    });

    it("casa por cabId mesmo com id numérico × string", () => {
      const r = projectRigging({ telas: [{ ...telaVelha, cabId: "9" }] }, {}, [cabAtual]);
      expect(r.telas[0].rig.limites.voadoMaxM).toBe(10);
    });

    it("gabinete apagado da biblioteca: cai no snapshot, não perde o que a tela guardou", () => {
      const telaComSnap = { ...telaVelha, cabId: 99, gabinete: { ...GAB, dimH: "500", rigging: { voadoMaxM: 4 } } };
      const r = projectRigging({ telas: [telaComSnap] }, {}, [cabAtual]);
      expect(r.telas[0].rig.limites.voadoMaxM).toBe(4);
      expect(r.telas[0].rig.limiteAcima).toBe(true); // 7 m de 4
    });

    it("peso e dimensão continuam do SNAPSHOT — projeto não muda sozinho se a biblioteca mudar", () => {
      const cabMaisPesado = { id: 9, peso: "999", dimH: "9000", rigging: cabAtual.rigging };
      const r = projectRigging({ telas: [telaVelha] }, {}, [cabMaisPesado]);
      expect(r.telas[0].rig.pesoGab).toBe(8); // o do snapshot (GAB), não 999
      expect(r.telas[0].rig.alturaM).toBe(7); // 14 × 500 mm do snapshot
    });
  });

  it("projeto vazio", () => {
    expect(projectRigging({})).toMatchObject({ totalKg: 0, algumOver: false, tone: "ok" });
  });
  it("uma tela sem peso contamina algumSemPeso (o total vira parcial)", () => {
    const p = { telas: [TELA, { cols: 2, rows: 2, gabinete: { dimW: "500" } }] };
    expect(projectRigging(p).algumSemPeso).toBe(true);
    expect(projectRigging({ telas: [TELA] }).algumSemPeso).toBe(false);
  });
  it("config default: seção visível, montagem voada", () => {
    expect(DEFAULT_RIG).toMatchObject({ modo: "voado", mostrar: true });
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
    expect(r.elo).toBe("fabricante");
  });

  it("empilhado é mais restrito que voado: 8 m passa voado e estoura no chão", () => {
    const tela = { cols: 4, rows: 16, gabinete: UNI };
    expect(riggingTela(tela).limiteAcima).toBe(false); // voado, limite 10 m
    const chao = riggingTela(tela, { modo: "empilhado" });
    expect(chao.limiteAcima).toBe(true); // chão, limite 6 m
    expect(chao.checks).toHaveLength(1); // empilhado checa SÓ a altura empilhada
    expect(chao.checks[0]).toMatchObject({ id: "empilhadoM", limite: 6 });
  });

  it("sem dado do fabricante NÃO vira ok — vira aviso", () => {
    const r = riggingTela({ cols: 4, rows: 40, gabinete: { peso: "8", dimW: "500", dimH: "500" } });
    expect(r.checks.every((k) => k.status === "semDado")).toBe(true);
    expect(r.limiteAcima).toBe(false); // não podemos afirmar que estourou
    expect(r.limiteSemDado).toBe(true);
    expect(r.avisos.some((a) => a.includes("não publica"))).toBe(true);
  });

  it("limite por barra fica FORA da cadeia (sem bumper não há o que checar)", () => {
    const gab = { peso: "8", dimW: "500", dimH: "500", rigging: { voadoMaxM: 10, porBarraMaxQtd: 20 } };
    const r = riggingTela({ cols: 6, rows: 11, gabinete: gab });
    expect(r.checks.find((k) => k.id === "porBarra")).toBeUndefined();
    expect(r.limites.porBarraMaxQtd).toBe(20); // mas o registro do fabricante fica
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
