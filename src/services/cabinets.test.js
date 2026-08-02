import { describe, it, expect } from "vitest";
import { fullSnapshot, cabinetSnapshot } from "./cabinets.js";

// REGRESSÃO (25/07/2026): `fullSnapshot` é uma LISTA BRANCA — campo novo no
// gabinete que não for adicionado aqui simplesmente não chega no projeto, e a
// feature nasce inerte (campo existia no cadastro e o snapshot o descartava em
// silêncio). Rigging saiu do app em 02/08/2026 (reservado pro futuro 3D).
const CAB = {
  id: 7, nome: "Absen NT2.6 V2", marca: "Absen",
  resX: "192", resY: "192", dimW: "500", dimH: "500", peso: "7.9",
  pwrMax: "210", pwrMed: "70", pwrBlack: "62", fp: "0.9", ip: "Indoor",
  brilho: "5000", receivingCard: "MRV328", conector: "powercon", conectorCustom: "",
};

describe("snapshot do gabinete na tela", () => {
  it("fullSnapshot leva TODO campo técnico do cadastro (guarda contra lista branca vencida)", () => {
    const snap = fullSnapshot(CAB);
    for (const k of ["pwrBlack", "ip", "brilho", "receivingCard", "fp", "conector"])
      expect(snap[k], `campo "${k}" sumiu no snapshot`).toBeDefined();
  });

  it("rigging saiu do snapshot (gabinete antigo com a chave não a propaga)", () => {
    expect(fullSnapshot({ ...CAB, rigging: { voadoMaxM: 10 } }).rigging).toBeUndefined();
  });

  it("não carrega identidade de biblioteca (id/marca ficam de fora — a tela guarda cabId)", () => {
    expect(fullSnapshot(CAB).id).toBeUndefined();
  });

  it("gabinete nulo vira null, não explode", () => {
    expect(fullSnapshot(null)).toBeNull();
  });

  it("cabinetSnapshot segue leve, de propósito (projetos-semente)", () => {
    expect(cabinetSnapshot(CAB).receivingCard).toBeUndefined();
  });
});
