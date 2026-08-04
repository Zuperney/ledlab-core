// Testes do motor puro de Equipe & avisos (fase 1: código de convite).
// Por que importa: o código viaja por WhatsApp e é digitado à mão no celular —
// normalização frouxa aqui vira "código não encontrado" pra código certo.
import { describe, it, expect } from "vitest";
import {
  gerarCodigoConvite,
  normalizarCodigoConvite,
  codigoConviteValido,
  mensagemErroEquipe,
} from "./avisosCalc.js";

describe("gerarCodigoConvite", () => {
  it("gera no formato LED-XXXXXX com alfabeto sem ambíguos", () => {
    for (let i = 0; i < 50; i++) {
      const c = gerarCodigoConvite();
      expect(c).toMatch(/^LED-[A-HJKMNP-Z2-9]{6}$/);
      // corpo nunca tem os caracteres confundíveis (o prefixo LED- tem L, tudo bem)
      expect(c.slice(4)).not.toMatch(/[01OIL]/);
    }
  });

  it("é determinístico com rnd injetado", () => {
    const rnd = () => 0; // sempre o primeiro caractere do alfabeto
    expect(gerarCodigoConvite(rnd)).toBe("LED-AAAAAA");
  });
});

describe("normalizarCodigoConvite", () => {
  it("aceita como o técnico digita: minúsculas, espaços, sem prefixo", () => {
    expect(normalizarCodigoConvite("led-ab2cd3")).toBe("LED-AB2CD3");
    expect(normalizarCodigoConvite("  AB2CD3 ")).toBe("LED-AB2CD3");
    expect(normalizarCodigoConvite("led ab2 cd3")).toBe("LED-AB2CD3");
    expect(normalizarCodigoConvite("LED-AB2CD3")).toBe("LED-AB2CD3");
  });

  it("vazio continua vazio (não vira só o prefixo)", () => {
    expect(normalizarCodigoConvite("")).toBe("");
    expect(normalizarCodigoConvite(null)).toBe("");
    expect(normalizarCodigoConvite("  -  ")).toBe("");
  });
});

describe("codigoConviteValido", () => {
  it("valida tamanho e alfabeto", () => {
    expect(codigoConviteValido("LED-AB2CD3")).toBe(true);
    expect(codigoConviteValido("ab2cd3")).toBe(true); // sem prefixo, minúsculo
    expect(codigoConviteValido("LED-AB2CD")).toBe(false); // curto
    expect(codigoConviteValido("LED-AB2CD34")).toBe(false); // longo
    expect(codigoConviteValido("LED-AB0CD3")).toBe(false); // 0 não existe no alfabeto
    expect(codigoConviteValido("")).toBe(false);
  });
});

describe("mensagemErroEquipe", () => {
  it("traduz os códigos estáveis do RPC", () => {
    expect(mensagemErroEquipe(new Error("codigo_invalido"))).toMatch(/não encontrado/);
    expect(mensagemErroEquipe(new Error("nome_obrigatorio"))).toMatch(/nome/);
    expect(mensagemErroEquipe(new Error("sem_sessao"))).toMatch(/Conecte-se/);
  });
  it("erro desconhecido cai na mensagem genérica", () => {
    expect(mensagemErroEquipe(new Error("fetch failed"))).toMatch(/tente de novo/);
    expect(mensagemErroEquipe(undefined)).toMatch(/tente de novo/);
  });
});
