// Testes da mescla de eventos escalados na Agenda.
// Por que importa: o gestor pode estar escalado no PRÓPRIO evento — sem o
// dedupe por project_id o evento apareceria duas vezes na agenda dele.
import { describe, it, expect } from "vitest";
import { mesclarEscalados } from "./escalaMerge.js";

const proj = (id, name) => ({ id, name, dataInicio: "2026-08-10", telas: [] });
const ev = (over = {}) => ({
  id: "uuid-1", project_id: "proj_x", nome: "Show A", cliente: "Mega",
  local: "Espaço X", data_inicio: "2026-08-15", data_fim: "2026-08-16",
  cancelado: false, ...over,
});

describe("mesclarEscalados", () => {
  it("anexa eventos escalados depois dos projetos locais", () => {
    const out = mesclarEscalados([proj("proj_a", "Meu")], [ev()]);
    expect(out).toHaveLength(2);
    expect(out[1]).toMatchObject({
      id: "esc_uuid-1", eventoId: "uuid-1", escalado: true,
      name: "Show A", dataInicio: "2026-08-15", dataFim: "2026-08-16",
    });
  });

  it("não duplica quando o gestor é também escalado (project_id local)", () => {
    const out = mesclarEscalados([proj("proj_x", "Meu evento")], [ev()]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("proj_x");
  });

  it("evento cancelado vira cancelled (a Agenda deriva o status)", () => {
    const out = mesclarEscalados([], [ev({ cancelado: true })]);
    expect(out[0].cancelled).toBe(true);
  });

  it("sem data_inicio o evento é descartado (não quebra as views)", () => {
    const out = mesclarEscalados([], [ev({ data_inicio: null })]);
    expect(out).toHaveLength(0);
  });

  it("data_fim ausente cai na data_inicio (evento de 1 dia)", () => {
    const out = mesclarEscalados([], [ev({ data_fim: null })]);
    expect(out[0].dataFim).toBe("2026-08-15");
  });

  it("listas vazias/nulas não explodem", () => {
    expect(mesclarEscalados(null, null)).toEqual([]);
    expect(mesclarEscalados([], [])).toEqual([]);
  });
});
