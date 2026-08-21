// services/screens.js — Screens: agrupamentos que o TÉCNICO monta à mão.
//
// Uma Screen é a "Screen" do NovaLCT: o conjunto de telas que ele decide que vão no
// MESMO sistema (mesmo controlador), montadas do jeito que ele configuraria. O app
// NÃO agrupa sozinho — o técnico junta só as telas que quer, e o motivo muitas vezes
// é a logística do evento (o que é montado quando), não a geometria nem o modelo.
//
// Regras: uma tela fica em NO MÁXIMO uma Screen (pôr numa nova tira da antiga); tela
// fora de qualquer Screen = "sem sistema" (aparece nos disponíveis, ainda não cabeada).
// Um projeto pode ter 1 Screen com tudo (caso Colação) ou N Screens (caso Admicon) —
// é escolha dele. Cada Screen tem origem própria (0,0), igual no NovaLCT.
import { extensaoCoberta, packByModel } from "./layout.js";
import { dimOf, modelKey } from "./canvasCabling.js";

// id vem de fora (genId no componente) pra manter isto puro/testável. sinal começa
// vazio → régua/disposição caem no padrão (Área / regra do retângulo). AC é criado
// sob demanda quando o usuário mexe no cabeamento AC.
export function makeScreen(id, nome) {
  return { id, nome, telaIds: [], pos: {}, sinal: {} };
}

// telas que não estão em nenhuma Screen (a lista de "disponíveis")
export function unassignedTelas(screens, telas) {
  const used = new Set((screens || []).flatMap((s) => s.telaIds || []));
  return (telas || []).filter((t) => !used.has(t.id));
}

// a Screen que contém a tela (ou null)
export function screenOfTela(screens, telaId) {
  return (screens || []).find((s) => (s.telaIds || []).includes(telaId)) || null;
}

// telas de uma Screen, na ordem de telaIds, resolvidas contra project.telas
export function screenTelas(screen, telas) {
  const byId = new Map((telas || []).map((t) => [t.id, t]));
  return (screen?.telaIds || []).map((id) => byId.get(id)).filter(Boolean);
}

// caixa envolvente da Screen (px), origem no canto sup-esq
export function screenSize(screen, telas) {
  let w = 0, h = 0;
  for (const t of screenTelas(screen, telas)) {
    const p = screen.pos?.[t.id] || { x: 0, y: 0 };
    const d = dimOf(t);
    w = Math.max(w, p.x + d.w);
    h = Math.max(h, p.y + d.h);
  }
  return { w, h };
}

/**
 * A RESOLUÇÃO da Screen: o retângulo de pixels que o processador dirige de
 * verdade — SEM O VÃO.
 *
 * ⚠️ VÃO NÃO É PIXEL. O espaço que o técnico deixa entre as telas no canvas é
 * referência visual de como elas vão ficar separadas no palco; não é LED, não é
 * processamento e não pode entrar em conta de resolução. Contar o vão inflava a
 * "Resolução da Screen" do caderno — duas telas de 1024 com um respiro no
 * desenho viravam 2248 px em vez de 2048, e é esse número que alguém digita no
 * NovaLCT.
 *
 * É a mesma régua que já vale pra grade (`screenGrid` conta gabinete real) e
 * pra área em m² do canvas de conteúdo (o vão entre painéis não é LED).
 *
 * A `caixa` continua saindo junto: é a DISPOSIÇÃO, o retângulo que o desenho
 * ocupa. Serve pro canvas da aba e pro caderno declarar o espaçamento — desde
 * que com esse nome, nunca com o nome de resolução.
 */
export function screenResolucao(screen, telas) {
  const membros = screenTelas(screen, telas);
  const rects = membros.map((t) => {
    const p = screen?.pos?.[t.id] || { x: 0, y: 0 };
    const d = dimOf(t);
    return { x: p.x, y: p.y, w: d.w, h: d.h };
  });
  const w = extensaoCoberta(rects.map((r) => [r.x, r.x + r.w]));
  const h = extensaoCoberta(rects.map((r) => [r.y, r.y + r.h]));
  const caixa = screenSize(screen, telas);
  return { w, h, caixa, temVao: w !== caixa.w || h !== caixa.h };
}

// ── CORTES: partir a tela dentro da Screen ───────────────────
//
// Às vezes a tela precisa ser dividida DENTRO DO PROCESSAMENTO de vídeo: a
// parede é uma só no palco, mas o sinal dela entra por dois caminhos. Sem isto,
// o único jeito de representar isso era duplicar a tela no cadastro, encolher as
// duas e chamar de "parte 1" e "parte 2" — o que funciona no desenho e mente em
// todo o resto (peso, área e elétrica passam a contar uma parede que não existe).
//
// O corte é RETO (guilhotina), porque é assim que o processamento parte parede
// de verdade. `x[i]` é o índice da coluna ANTES da qual cai um corte vertical;
// `y[i]` idem pra linha. A PARTE não é guardada: sai da contagem de cortes à
// esquerda e acima (ver `parteDaCelula`).
//
// ⚠️ O CORTE É LIMITE DE PROCESSAMENTO, NÃO FÍSICO. A tela continua inteira no
// cadastro, o painel continua inteiro no palco, e a régua de vão × buraco não
// muda. Quem respeita o corte é o cabeamento de SINAL — só ele.

/**
 * Os cortes de uma tela, SANEADOS na leitura.
 *
 * Corte fora do intervalo é descartado aqui, nunca na escrita: encolher a tela
 * na aba Dados não pode deixar a Screen num estado torto, e um corte na coluna 8
 * de uma tela que virou 6 simplesmente deixa de existir. Mesma régua do "encaixe
 * apontando pra peça que não existe mais vira peça livre".
 *
 * @returns {{x: number[], y: number[]}|null} `null` quando a tela é inteira —
 *   é o que deixa o caminho sem corte idêntico ao de sempre.
 */
export function cortesDe(screen, tela) {
  const bruto = screen?.cortes?.[tela?.id];
  if (!bruto) return null;
  const limpa = (lista, limite) => [...new Set(
    (Array.isArray(lista) ? lista : [])
      .map((v) => Math.round(Number(v)))
      .filter((v) => Number.isFinite(v) && v > 0 && v < limite),
  )].sort((a, b) => a - b);
  const x = limpa(bruto.x, tela?.cols || 1);
  const y = limpa(bruto.y, tela?.rows || 1);
  return x.length || y.length ? { x, y } : null;
}

/** em quantas partes a tela está dividida (1 = inteira) */
export function quantasPartes(screen, tela) {
  const c = cortesDe(screen, tela);
  return c ? (c.x.length + 1) * (c.y.length + 1) : 1;
}

/**
 * Liga/desliga um corte (toggle). `eixo` é "x" (corta colunas) ou "y" (linhas).
 * Puro: devolve a Screen nova, e limpa a chave quando não sobra corte nenhum —
 * Screen sem corte não carrega objeto vazio no arquivo.
 */
export function partirTela(screen, telaId, eixo, indice) {
  const atual = screen?.cortes?.[telaId] || { x: [], y: [] };
  const lista = Array.isArray(atual[eixo]) ? atual[eixo] : [];
  const tem = lista.includes(indice);
  const nova = tem ? lista.filter((v) => v !== indice) : [...lista, indice].sort((a, b) => a - b);
  const daTela = { ...atual, [eixo]: nova };
  const cortes = { ...(screen?.cortes || {}) };
  if (daTela.x?.length || daTela.y?.length) cortes[telaId] = daTela;
  else delete cortes[telaId];
  return { ...screen, cortes };
}

/** tira TODOS os cortes de uma tela — ela volta a ser uma parte só */
export function juntarTela(screen, telaId) {
  const cortes = { ...(screen?.cortes || {}) };
  delete cortes[telaId];
  return { ...screen, cortes };
}

/**
 * O nome da parte pro papel e pro mapa: "Tela A · P2".
 *
 * Tela sem corte devolve o nome puro, então nada muda em projeto que não usa a
 * feature — nem uma linha de relatório.
 */
export function nomeDaParte(tela, parteN) {
  const nome = tela?.nome?.trim() || "sem nome";
  return parteN > 0 ? `${nome} · P${parteN}` : nome;
}

// vão padrão da Screen (px): a folga que o técnico deixa entre telas. 0 = encostadas.
// Vive na Screen (cada Screen é um sistema, com a montagem dela) e só existe quando
// alguém definiu — Screen antiga sem o campo continua encostando, como sempre.
export const vaoOf = (screen) => Math.max(0, Math.round(parseFloat(screen?.vao) || 0));

// arranjo automático dos membros: agrupa por modelo, empilha faixas, separando tudo
// pelo vão padrão da Screen. É SUGESTÃO — o técnico arrasta pra ajustar depois
// (metade dos eventos muda na montagem).
export function arrangeScreen(screen, telas) {
  const items = screenTelas(screen, telas).map((t) => ({ id: t.id, ...dimOf(t), model: modelKey(t) }));
  return packByModel(items, Infinity, vaoOf(screen)).pos;
}

// adiciona uma tela à Screen `screenId`, tirando de qualquer outra (tela ∈ ≤1 Screen).
// posiciona a nova à direita do que já existe (y=0); o técnico arrasta depois.
export function addTela(screens, screenId, telaId, telas) {
  return (screens || []).map((s) => {
    if (s.id === screenId) {
      if ((s.telaIds || []).includes(telaId)) return s;
      const size = screenSize(s, telas);
      const x = size.w ? size.w + vaoOf(s) : 0; // à direita do que já existe, respeitando o vão
      return { ...s, telaIds: [...(s.telaIds || []), telaId], pos: { ...s.pos, [telaId]: { x, y: 0 } } };
    }
    if ((s.telaIds || []).includes(telaId)) return stripTela(s, telaId); // sai da anterior
    return s;
  });
}

export function removeTela(screens, screenId, telaId) {
  return (screens || []).map((s) => (s.id === screenId ? stripTela(s, telaId) : s));
}

// tira a tela de TODAS as Screens — uso: exclusão da tela no projeto. Sem isso a
// Screen fica com telaIds órfãos e o Relatório mostra uma Screen 0×0 com as telas
// reais "fora de qualquer Screen" (LLC-11, visto no caderno do Ademicom Summit).
export function dropTela(screens, telaId) {
  return (screens || []).map((s) => ((s.telaIds || []).includes(telaId) ? stripTela(s, telaId) : s));
}

function stripTela(screen, telaId) {
  const pos = { ...(screen.pos || {}) };
  delete pos[telaId];
  // os cortes saem junto: é o ponto ÚNICO por onde tela sai de Screen, e corte
  // órfão voltaria a valer se a mesma tela fosse readicionada depois
  const cortes = { ...(screen.cortes || {}) };
  delete cortes[telaId];
  return { ...screen, telaIds: (screen.telaIds || []).filter((id) => id !== telaId), pos, cortes };
}

// "criar 1 Screen por tela" (D4): pro técnico que não quer agrupar. makeId gera cada id.
export function oneScreenPerTela(telas, makeId) {
  return (telas || []).map((t) => ({
    id: makeId(),
    nome: t.nome || "Tela",
    telaIds: [t.id],
    pos: { [t.id]: { x: 0, y: 0 } },
    sinal: {},
  }));
}
