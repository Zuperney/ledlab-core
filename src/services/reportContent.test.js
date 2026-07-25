import { describe, it, expect } from "vitest";
import { rigCadeia, rigStatusTela, rigTextoAcima, eloTalhaStatus, nRig, RIG_PILL, DISC, CHECK_SUBIR, AVISO_RIG } from "./reportContent.js";
import { riggingTela } from "./rigging.js";

// O texto da seção "Peso e ancoragens" é COMPARTILHADO entre o Caderno do DOM e
// o PDF nativo. O que se trava aqui é o contrato: nenhuma ausência de dado pode
// virar um "ok" no papel. Regras em docs/rigging-spec.md §3.
const GAB = { nome: "YES TECH MG7S", peso: "16", dimW: "500", dimH: "500" };
const comLimite = { ...GAB, rigging: { voadoMaxM: 10, porBarraMaxQtd: 20, fonte: "Manual cap. 3", conferido: true } };
const tela = (gabinete, cols = 10, rows = 6) => riggingTela({ cols, rows, gabinete });

describe("cadeia de verificação no Caderno (rigCadeia)", () => {
  it("limite publicado e respeitado: pílula 'dentro' com a procedência do manual", () => {
    const c = rigCadeia(tela(comLimite), "YES TECH MG7S");
    const altura = c.find((e) => e.id === "voadoM");
    expect(altura.status).toBe("ok");
    expect(altura.pill).toBe(RIG_PILL.ok);
    expect(altura.valor).toBe("3 de 10 m");
    expect(altura.sub).toBe("YES TECH MG7S — Manual cap. 3 · conferido");
  });

  it("SEM limite publicado nunca vira 'dentro' — sai 'não informado' e sem limite no valor", () => {
    const c = rigCadeia(tela(GAB), "YES TECH MG7S");
    const altura = c.find((e) => e.id === "voadoM");
    expect(altura.status).toBe("semDado");
    expect(altura.pill).toBe("não informado");
    expect(altura.valor).toBe("3 m"); // mostra o que a parede tem, não um limite inventado
    expect(altura.sub).toContain("sem dado de fabricante");
  });

  it("limite digitado sem fonte é aceito, mas o papel diz que não tem procedência", () => {
    const c = rigCadeia(tela({ ...GAB, rigging: { voadoMaxM: 10 } }), "MG7S");
    expect(c.find((e) => e.id === "voadoM").sub).toBe("MG7S — limite cadastrado sem procedência");
  });

  it("acima do limite: pílula 'acima'", () => {
    const c = rigCadeia(tela({ ...comLimite, rigging: { ...comLimite.rigging, voadoMaxM: 2 } }));
    expect(c.find((e) => e.id === "voadoM")).toMatchObject({ status: "acima", pill: "acima", valor: "3 de 2 m" });
  });

  it("a talha entra na cadeia com a % do WLL quando está folgada", () => {
    const t = rigCadeia(tela(comLimite)).find((e) => e.id === "talha");
    expect(t.titulo).toBe("Ancoragem · talha manual 1 t");
    expect(t.status).toBe("ok");
    expect(t.pill).toMatch(/^\d+%$/); // a % é o valor informativo, não um "dentro" genérico
    expect(t.sub).toBe("pior caso: bumper cheio");
  });

  it("sem peso de gabinete a talha sai 'não informado' — 0% seria um ok falso", () => {
    const r = tela({ nome: "X", dimW: "500", dimH: "500" });
    expect(eloTalhaStatus(r)).toBe("semDado");
    const t = rigCadeia(r).find((e) => e.id === "talha");
    expect(t.pill).toBe("não informado");
    expect(t.valor).toBe("—");
    expect(t.pill).not.toContain("0%");
  });

  it("a cadeia termina no que o app NÃO alcança", () => {
    const c = rigCadeia(tela(comLimite));
    const fim = c[c.length - 1];
    expect(fim.titulo).toBe("Treliça e piso");
    expect(fim.pill).toBe("confira com a produção");
    expect(fim.status).toBe("semDado");
  });
});

describe("status e textos da seção", () => {
  it("rigStatusTela: acima manda sobre semDado, que manda sobre ok", () => {
    expect(rigStatusTela(tela(comLimite))).toBe("ok");
    expect(rigStatusTela(tela(GAB))).toBe("semDado");
    expect(rigStatusTela(tela({ ...comLimite, rigging: { ...comLimite.rigging, voadoMaxM: 2 } }))).toBe("acima");
  });

  it("o texto do estouro desarma a saída errada (trocar de talha)", () => {
    const r = tela({ ...comLimite, rigging: { ...comLimite.rigging, voadoMaxM: 2 } });
    const txt = rigTextoAcima(r).map((p) => p.t).join("");
    expect(txt).toContain("passa do limite do fabricante");
    expect(txt).toContain("trocar de talha não resolve");
    expect(txt).toContain("% do WLL"); // mostra a folga da corrente pra provar o ponto
    expect(txt).toContain("3 m contra 2 m publicados"); // e nomeia o número que estourou
  });

  it("nRig: inteiro sem casa, quebrado com vírgula (papel em pt-BR)", () => {
    expect(nRig(3)).toBe("3");
    expect(nRig(3.5)).toBe("3,5");
    expect(nRig(1000)).toBe("1000");
  });

  it("Estrutura tem cor própria de disciplina (teal), distinta das outras", () => {
    expect(DISC.estr).toBe("#0f766e");
    expect(new Set(Object.values(DISC)).size).toBe(Object.keys(DISC).length);
  });

  it("o checklist de campo abre pela corrente livre — o item que já custou material", () => {
    expect(CHECK_SUBIR[0].b).toContain("1 m de corrente livre");
    expect(CHECK_SUBIR.map((c) => c.b + c.t).join(" ")).not.toMatch(/\bponto\b/i); // vocabulário: é ancoragem
    expect(AVISO_RIG.partes.map((p) => p.t).join("")).toContain("rigger habilitado");
  });
});
