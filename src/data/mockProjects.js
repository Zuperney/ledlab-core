// data/mockProjects.js
// Projetos-semente. As datas são relativas a "hoje" para o app parecer sempre
// atual (um evento em andamento, alguns futuros, um concluído).

import { SEED_CABINETS } from "./mockCabinets.js";
import { cabinetSnapshot } from "../services/cabinets.js";

// hoje + n dias, formato YYYY-MM-DD
const today = new Date();
const relativeDate = (n) => {
  const d = new Date(today);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

const roeCb5 = SEED_CABINETS[0]; // ROE CB5 Outdoor
const absenA29 = SEED_CABINETS[1]; // Absen A2.9 Pro

export const SEED_PROJECTS = [
  {
    id: "p1", name: "Festival Aurora", cliente: "Prefeitura de SP", local: "Arena São Paulo",
    dataInicio: relativeDate(-1), dataFim: relativeDate(1), status: "active", obs: "",
    telas: [{ id: "t1", nome: "Palco Principal", cabId: 1, gabinete: cabinetSnapshot(roeCb5), cols: 8, rows: 6 }],
  },
  {
    id: "p2", name: "Expo Tech", cliente: "Expo Center Norte", local: "Expo Center Norte",
    dataInicio: relativeDate(9), dataFim: relativeDate(9), status: "planned", obs: "",
    telas: [{ id: "t2", nome: "Painel Hall", cabId: 2, gabinete: cabinetSnapshot(absenA29), cols: 12, rows: 10 }],
  },
  {
    id: "p3", name: "Show Neon Wave", cliente: "Club Ábano", local: "Club Ábano, SP",
    dataInicio: relativeDate(-22), dataFim: relativeDate(-21), status: "done", obs: "",
    telas: [{ id: "t3", nome: "Fundo de Palco", cabId: 1, gabinete: cabinetSnapshot(roeCb5), cols: 6, rows: 6 }],
  },
  {
    id: "p4", name: "Congresso AV Pro", cliente: "WTC", local: "WTC São Paulo",
    dataInicio: relativeDate(26), dataFim: relativeDate(28), status: "planned", obs: "",
    telas: [{ id: "t4", nome: "Telão Auditório", cabId: 2, gabinete: cabinetSnapshot(absenA29), cols: 20, rows: 10 }],
  },
];
