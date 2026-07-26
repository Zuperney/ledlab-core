import { describe, it, expect } from "vitest";
import { fullSnapshot, cabinetSnapshot } from "./cabinets.js";

// REGRESSÃO (25/07/2026): `fullSnapshot` é uma LISTA BRANCA — campo novo no
// gabinete que não for adicionado aqui simplesmente não chega no projeto, e a
// feature nasce inerte. Foi o que aconteceu com os limites de estrutura: os
// campos existiam no cadastro, o Caderno lia `tela.gabinete.rigging`, e no meio
// do caminho o snapshot os descartava em silêncio.
const CAB = {
  id: 7, nome: "Absen NT2.6 V2", marca: "Absen",
  resX: "192", resY: "192", dimW: "500", dimH: "500", peso: "7.9",
  pwrMax: "210", pwrMed: "70", pwrBlack: "62", fp: "0.9", ip: "Indoor",
  brilho: "5000", receivingCard: "MRV328", conector: "powercon", conectorCustom: "",
  rigging: { voadoMaxM: 10, empilhadoMaxM: 12, porBarraMaxQtd: 20, travaExtraAcima: 20, trava: "Chaveta", fonte: "Manual Absen", conferido: true },
};

describe("snapshot do gabinete na tela", () => {
  it("fullSnapshot leva os limites de estrutura junto", () => {
    expect(fullSnapshot(CAB).rigging).toEqual(CAB.rigging);
  });

  it("fullSnapshot leva TODO campo técnico do cadastro (guarda contra lista branca vencida)", () => {
    const snap = fullSnapshot(CAB);
    for (const k of ["pwrBlack", "ip", "brilho", "receivingCard", "fp", "conector", "rigging"])
      expect(snap[k], `campo "${k}" sumiu no snapshot`).toBeDefined();
  });

  it("não carrega identidade de biblioteca (id/marca ficam de fora — a tela guarda cabId)", () => {
    expect(fullSnapshot(CAB).id).toBeUndefined();
  });

  it("gabinete nulo vira null, não explode", () => {
    expect(fullSnapshot(null)).toBeNull();
  });

  it("cabinetSnapshot segue leve, de propósito (projetos-semente)", () => {
    expect(cabinetSnapshot(CAB).rigging).toBeUndefined();
  });
});
