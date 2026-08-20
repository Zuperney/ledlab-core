// orientacao.test.js — as regras de rotação (D2 a D7), do jeito que a tecla faz.
import { describe, it, expect } from "vitest";
import {
  direcoesLivres, direcoesOcupadas, faceCegaEm, poseComFaceCegaEm, poseDoGiro,
  poseDoTombo, proximaFaceCega,
} from "./orientacao.js";
import {
  adicionarPecaEncaixada, adicionarPecaLivre, definirPose, juntas, matrizApoiada,
  novaMontagem, pecaDaMontagem,
} from "./montagem.js";
import { caixaEnvolvente } from "./metricas.js";
import { porticoDeExemplo, torreDeExemplo } from "./exemplos.js";
import { HORIZONTAIS } from "./direcoes.js";

// as duas teclas, exatamente como a aba as dispara
const girar = (m, id) => definirPose(m, id, poseDoGiro(m, id));
const tombar = (m, id) => definirPose(m, id, poseDoTombo(m, id));

const posicoes = (m) => Object.fromEntries(m.pecas.map((p) => [p.id, p.matriz.join(",")]));

/** o caso da imagem do dono: cubo no alto com três juntas */
function cuboComTresJuntas() {
  let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", {
    id: "pe", matriz: matrizApoiada("p30-b2000"),
  });
  m = adicionarPecaEncaixada(m, { id: "cubo", catalogoId: "p30-cubo5", de: "pe", conAlvo: "b", conNovo: "norte" });
  const livres = direcoesLivres(m, "cubo", "horizontal").filter((d) => d !== faceCegaEm(m, "cubo"));
  // pendura duas barras em duas horizontais livres → 3 juntas ao todo
  let n = 0;
  for (const c of ["topo", "norte", "sul", "leste", "oeste"]) {
    if (n === 2) break;
    try {
      const tentativa = adicionarPecaEncaixada(m, { id: `b${n}`, catalogoId: "p30-b1000", de: "cubo", conAlvo: c, conNovo: "a" });
      m = tentativa;
      n += 1;
    } catch { /* conector já ocupado */ }
  }
  return { montagem: m, livresIniciais: livres };
}

describe("D2 · direção ocupada e direção livre", () => {
  it("conta a junta com a mãe E a junta de cada filha", () => {
    const { montagem } = cuboComTresJuntas();
    expect(juntas(montagem)).toHaveLength(3);
    expect(direcoesOcupadas(montagem, "cubo").size).toBe(3);
    expect(direcoesLivres(montagem, "cubo")).toHaveLength(3);
  });

  it("a face cega está SEMPRE numa direção livre — não há onde parafusar nela", () => {
    const { montagem } = cuboComTresJuntas();
    expect(direcoesLivres(montagem, "cubo")).toContain(faceCegaEm(montagem, "cubo"));
  });

  it("cubo solto não tem junta nenhuma: as seis estão livres", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    expect(direcoesOcupadas(m, "c").size).toBe(0);
    expect(direcoesLivres(m, "c")).toHaveLength(6);
  });
});

describe("D3 · rotação NUNCA arrasta", () => {
  // É a propriedade que pega regressão de verdade: gira CADA peça de duas
  // montagens completas e exige que todas as outras fiquem com a matriz idêntica.
  for (const [nome, montagem] of [["o pórtico", porticoDeExemplo()], ["a torre", torreDeExemplo(3)]]) {
    it(`girando qualquer peça d${nome}, nenhuma outra se mexe`, () => {
      for (const alvo of montagem.pecas) {
        for (const tecla of [girar, tombar]) {
          const antes = posicoes(montagem);
          const depois = posicoes(tecla(montagem, alvo.id));
          for (const p of montagem.pecas) {
            if (p.id === alvo.id) continue;
            expect(`${p.id}: ${depois[p.id]}`).toBe(`${p.id}: ${antes[p.id]}`);
          }
        }
      }
    });

    it(`e ninguém se solta d${nome}`, () => {
      const total = juntas(montagem).length;
      for (const alvo of montagem.pecas) {
        expect(juntas(girar(montagem, alvo.id))).toHaveLength(total);
        expect(juntas(tombar(montagem, alvo.id))).toHaveLength(total);
      }
    });
  }
});

describe("D4 · peça reta gira só no próprio eixo", () => {
  const semMexer = (m, id) => {
    const antes = pecaDaMontagem(m, id).matriz;
    const depois = pecaDaMontagem(girar(m, id), id).matriz;
    expect(depois.slice(12, 15)).toEqual(antes.slice(12, 15)); // não saiu do lugar
    expect(depois.slice(0, 12)).not.toEqual(antes.slice(0, 12)); // mas girou
  };

  it("barra em pé, solta", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", {
      id: "a", matriz: matrizApoiada("p30-b2000"),
    });
    semMexer(m, "a");
  });

  it("barra deitada, solta", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-b2000", {
      id: "a", matriz: matrizApoiada("p30-b2000"),
    });
    m = tombar(m, "a");
    semMexer(m, "a");
  });

  it("barra encaixada no meio da torre", () => {
    const m = torreDeExemplo(3);
    const barra = m.pecas.find((p) => p.encaixe && p.catalogoId.startsWith("p30-b"));
    semMexer(m, barra.id);
  });

  it("a sapata também: ela gira, e o que está em cima nem sente", () => {
    const m = torreDeExemplo(2);
    const sapata = m.pecas.find((p) => p.catalogoId === "p30-sapata-baixa");
    semMexer(m, sapata.id);
  });
});

describe("D5 · o cubo gira movendo a face cega", () => {
  it("o R anda no plano do chão, o Shift+R vai pra vertical", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    expect(HORIZONTAIS).toContain(proximaFaceCega(m, "c", "horizontal"));
    expect(["CIMA", "BAIXO"]).toContain(proximaFaceCega(m, "c", "vertical"));
  });

  it("quatro R num cubo solto passam pelas quatro horizontais e voltam", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    m = definirPose(m, "c", poseComFaceCegaEm(m, "c", "N"));
    const vistas = [faceCegaEm(m, "c")];
    for (let i = 0; i < 4; i++) {
      m = girar(m, "c");
      vistas.push(faceCegaEm(m, "c"));
    }
    expect(vistas.slice(0, 4).sort()).toEqual([...HORIZONTAIS].sort());
    expect(vistas[4]).toBe(vistas[0]); // fechou a volta
  });

  it("a pose pedida realmente põe a face cega onde se mandou", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    for (const d of ["N", "L", "S", "O", "CIMA", "BAIXO"]) {
      const pose = poseComFaceCegaEm(m, "c", d);
      if (!pose) continue; // já está lá
      m = definirPose(m, "c", pose);
      expect(faceCegaEm(m, "c")).toBe(d);
    }
  });
});

describe("D6 · direção com junta é trava", () => {
  it("o R só passa pelas direções livres — as com peça são puladas", () => {
    const { montagem } = cuboComTresJuntas();
    const ocupadas = direcoesOcupadas(montagem, "cubo");
    let m = montagem;
    for (let i = 0; i < 6; i++) {
      const proxima = proximaFaceCega(m, "cubo", "horizontal");
      if (!proxima) break;
      expect(ocupadas.has(proxima)).toBe(false);
      m = girar(m, "cubo");
      expect(direcoesOcupadas(m, "cubo").size).toBe(3); // e as juntas seguem lá
    }
  });

  it("cubo cercado nas quatro horizontais: o R não faz nada", () => {
    let m = adicionarPecaLivre(novaMontagem(), "p30-cubo5", { id: "c" });
    m = definirPose(m, "c", poseComFaceCegaEm(m, "c", "CIMA"));
    for (const face of ["norte", "sul", "leste", "oeste"]) {
      try {
        m = adicionarPecaEncaixada(m, { id: `b-${face}`, catalogoId: "p30-b0200", de: "c", conAlvo: face, conNovo: "a" });
      } catch { /* a face cega está em uma delas */ }
    }
    expect(direcoesLivres(m, "c", "horizontal")).toEqual([]);
    expect(proximaFaceCega(m, "c", "horizontal")).toBeNull();
    expect(poseDoGiro(m, "c")).toBeNull();
  });
});

describe("D7 · a peça solta tomba, a encaixada não", () => {
  it("em pé vira deitada, e cai apoiada no chão", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", {
      id: "a", matriz: matrizApoiada("p30-b2000"),
    });
    const caixa = caixaEnvolvente(tombar(m, "a"));
    expect(caixa.min[1]).toBe(0);
    expect(caixa.alturaMm).toBe(300);
  });

  it("tombar duas vezes devolve a barra em pé, no mesmo lugar", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", {
      id: "a", matriz: matrizApoiada("p30-b2000"),
    });
    const voltou = tombar(tombar(m, "a"), "a");
    expect(caixaEnvolvente(voltou).alturaMm).toBe(2000);
    expect(caixaEnvolvente(voltou).min[1]).toBe(0);
  });

  it("barra ENCAIXADA não tomba — quem manda na direção dela é a junta", () => {
    const m = torreDeExemplo(2);
    const barra = m.pecas.find((p) => p.encaixe && p.catalogoId.startsWith("p30-b"));
    expect(poseDoTombo(m, barra.id)).toBeNull();
  });
});

describe("ida e volta", () => {
  it("aplicar a pose e reaplicar a anterior devolve TUDO idêntico", () => {
    const { montagem } = cuboComTresJuntas();
    const antes = pecaDaMontagem(montagem, "cubo").matriz;
    const girado = girar(montagem, "cubo");
    const voltou = definirPose(girado, "cubo", antes);
    expect(posicoes(voltou)).toEqual(posicoes(montagem));
    expect(voltou.pecas.map((p) => JSON.stringify(p.encaixe)))
      .toEqual(montagem.pecas.map((p) => JSON.stringify(p.encaixe)));
  });
});

describe("não quebra com pouco", () => {
  it("id que não existe, montagem vazia, pose nula", () => {
    const vazia = novaMontagem();
    expect(faceCegaEm(vazia, "nada")).toBeNull();
    expect(direcoesOcupadas(vazia, "nada").size).toBe(0);
    expect(poseDoGiro(vazia, "nada")).toBeNull();
    expect(poseDoTombo(vazia, "nada")).toBeNull();
    expect(definirPose(vazia, "nada", null)).toBe(vazia);
  });
});

describe("D7 · o limite do tombo: peça solta COM peça pendurada", () => {
  // Tombar é o único movimento que muda posição, e a raiz de uma torre é uma
  // peça solta: deitá-la deitaria a torre junto, atropelando a D3.
  it("a sapata da torre não tomba — tem estrutura em cima dela", () => {
    const m = torreDeExemplo(2);
    const sapata = m.pecas.find((p) => p.catalogoId === "p30-sapata-baixa");
    expect(poseDoTombo(m, sapata.id)).toBeNull();
    expect(poseDoGiro(m, sapata.id)).not.toBeNull(); // mas gira no próprio eixo
  });

  it("a mesma sapata, sozinha, tomba normalmente", () => {
    const m = adicionarPecaLivre(novaMontagem(), "p30-b2000", {
      id: "a", matriz: matrizApoiada("p30-b2000"),
    });
    expect(poseDoTombo(m, "a")).not.toBeNull();
  });
});
