// services/cabinets.js
// Snapshots do gabinete embutidos em cada tela de projeto. Guardamos uma cópia
// dos dados técnicos na tela para o projeto não "quebrar" se a biblioteca mudar.

// Snapshot leve (usado nos projetos-semente).
export const cabinetSnapshot = (c) => ({
  nome: c.nome,
  resX: c.resX,
  resY: c.resY,
  dimW: c.dimW,
  dimH: c.dimH,
  peso: c.peso,
  pwrMax: c.pwrMax,
  pwrMed: c.pwrMed,
  fp: c.fp,
  ip: c.ip,
});

// Snapshot completo (usado ao criar telas novas a partir de um gabinete).
export const fullSnapshot = (c) =>
  c
    ? {
        nome: c.nome,
        resX: c.resX,
        resY: c.resY,
        dimW: c.dimW,
        dimH: c.dimH,
        peso: c.peso,
        pwrMax: c.pwrMax,
        pwrMed: c.pwrMed,
        pwrBlack: c.pwrBlack,
        fp: c.fp,
        ip: c.ip,
        brilho: c.brilho,
        receivingCard: c.receivingCard,
        conector: c.conector,
        conectorCustom: c.conectorCustom,
      }
    : null;
