# Aba "Fluxo" — navegador do caminho do sinal AV

## Contexto

Hoje o LedLab sabe o cabeamento **da Screen pra frente**: quantas portas, que gabinete entra em qual, a serpentina. O que vem **antes** da controladora — o Resolume, o notebook do PPT, o switcher, a fibra, o switch de rede — não existe em lugar nenhum do app. Quem quer esse desenho exporta pro Loomex e monta lá.

A ideia: uma aba do projeto onde a cadeia AV inteira é declarada e navegável. Clicou no Resolume, acende o caminho dele até o destino e o resto do mapa esmaece. Equipamento com camada mostra quantas tem e o que entra em cada uma.

O achado que muda o custo disso: **`src/services/loomex.js` já tem ~80% do modelo**. Vocabulário canônico de sinal (`SINAIS`, 23 tipos em 6 grupos) e um `buildLoomexExport` que já monta blocos com portas tipadas, conexões, etiqueta de cabo e arranjo em colunas. Só que monta na hora de exportar e joga fora — nada fica no projeto, e o modelo só conhece o trecho `controladora → Screen`.

O plano promove esse grafo a cidadão de primeira classe do projeto, estende com fontes/miolo/camadas, desenha na tela, e faz o export do Loomex virar uma **projeção** do grafo em vez de uma segunda derivação.

### Decisões já tomadas (premissas fixas)

| # | Decisão |
|---|---|
| 1 | Aba nova de projeto no LedLab Core |
| 2 | Catálogo curado **+** equipamento genérico |
| 3 | Escopo AV completo — vídeo, áudio, rede, controle, energia, sincronismo |
| 4 | Layout **automático por estágio**. Sem arrastar |
| 5 | Clicar acende a cadeia, o resto esmaece — o mapa inteiro continua à vista |
| 6 | A camada se liga a uma **porta de entrada física** do próprio equipamento |
| 7 | **LedLab é a fonte da verdade; o Loomex continua desenhando/imprimindo** |
| 8 | A cadeia **nasce pronta** das Screens + controladoras; divergência é detectada e reconciliada sob comando |

### Duas decisões do dono ainda em aberto

Estão marcadas no texto com ⚠️ e travam as fases 0 e 7. Ver **Pendências** no fim.

---

## Fase 0 — vocabulário (REGRA ZERO, é dependência de sequência)

A feature inventa termos e um ícone. Por `CLAUDE.md` e `docs/marca/manual.md`, isso vira proposta no manual → aprovação do dono → commit **lá**, antes do código.

| Termo | Significado | Por quê não reusar outro |
|---|---|---|
| **Fluxo** | o caminho do sinal AV do projeto, da fonte ao LED (a aba, e `project.fluxo`) | "Cadeia" já é lei pro encadeamento de gabinetes de uma porta (§12.1); "Cabeamento" já é a aba de porta/circuito |
| **Bloco** | cada caixa do Fluxo | já é o termo do `.loomex.json` (`blocos`) — não é termo novo de fato |
| **Camada** | subdivisão de processamento de um bloco, presa a uma porta de entrada dele | é "layer" em pt-BR, e o app é 100% português |
| **Estágio** | a coluna do arranjo automático | precisa de nome: aparece em chip e no `HelpTip` |
| **Conexão** | a ligação saída → entrada | **Cabo** continua sendo só a etiqueta física |

**Ícone**: `GitBranch`, `Layers`, `LayoutGrid` e `Frame` já têm dono no §5.3. Proposta: **`Waypoints`** (lucide), com a mesma marca "⏳ proposta, aguardando o dono" que o `Frame` carrega.

---

## O modelo — `project.fluxo`

> **Correção importante:** a primeira versão deste plano usava `project.sinal`. É armadilha: **`screen.sinal` já existe e é outra coisa** — a config de cabeamento (`{rule, strategy, cables, overclock, vaoConta}`). Quem ler `p.sinal` num arquivo novo vai assumir aquela forma. `project.fluxo` casa com o nome da aba e não colide com `comp`/`estrutura`/`video`/`config`.

Vai dentro do `project`, então **não precisa de registro**: pega carona no IndexedDB + localStorage + sync + backup, igual `project.comp` e `project.estrutura`.

```js
project.fluxo = {
  versao: 1,
  blocos: [ /* … */ ],
  conexoes: [ /* … */ ],
  semente: { numeracao: "row-tb-lr", em: 1757000000000 },
}
```

### Bloco

```js
{
  id: "b-…",                        // genId — ESTÁVEL, nunca derivado de nome ou índice
  origem: "equip" | "screen" | "generico",
  nome: "VX400 Pro",
  nomeManual: true,                 // o usuário renomeou → a reconciliação não sobrescreve
  papel: "auto" | "fonte" | "processamento" | "destino",   // trava opcional de estágio
  equipamentoId: "nova-vx400pro",   // link vivo com a biblioteca
  equipamento: { …equipSnapshot },  // snapshot congelado
  screenId: "s1",                   // só quando origem === "screen"
  portas: [ { id: "out3", nome: "Porta 3", dir: "out", sinal: "ethernet" } ],
  camadas: [ { id: "c2", nome: "Camada 2", entradaId: "in3", saidaIds: [] } ],
  semente: { assinatura: "sc|2|9,9" },   // insumo da deriva; só em bloco semeado
}
```

**Duas armadilhas que definem o modelo:**

1. **`equipSnapshot()` descarta os ids das portas** (`src/services/equipamentos.js:56` grava só `{nome, dir, sinal}` — é formato de template). Materializar `bloco.portas` com ids próprios é **obrigatório**, não preferência: qualquer referência a `screen.equipamento.portas[i].id` é `undefined`.

2. **Id de porta é monotônico por direção, nunca reaproveitado.** `proximoIdDePorta(bloco, dir)` = `max(n existente) + 1`. Apagou `out2` e criou outra? Ela é `out5`. Reaproveitar `out2` repontaria conexões pra porta errada em silêncio — é o pior bug possível nesta aba.

O id de porta é único **dentro do bloco**; a referência global é o par `{bloco, porta}` — exatamente a forma que o Loomex já usa, o que faz a projeção virar renomeação em vez de remapeamento.

### Camada

`entradaId` aponta pra uma porta `dir:"in"` **do próprio bloco** (decisão 6). O tipo de sinal é **derivado** da porta, nunca gravado. Camada sem vínculo é legítima — documenta "esta máquina tem 8 camadas" sem dizer o que entra — e só não vira salto no realce.

`saidaIds` (vazio = todas as saídas) é um acréscimo pequeno à decisão 6 que responde "sai por qual saída?". Sem ele a resposta só pode ser "por todas".

### Conexão

```js
{ id: "cx-…", de: {bloco, porta}, para: {bloco, porta}, sinal: "ethernet",
  estilo: "solid"|"dashed", cabo: undefined, obs: "" }
```

A **etiqueta de cabo é calculada na projeção**, não guardada: `NET001…` é determinística a partir do sinal e da ordem. Guardar cria um contador mutável que desalinha a cada edição e suja o diff do sync. Só grava quando o usuário fixa uma etiqueta à mão.

### Versão e serializador

`versao: 1` com serializador validante no molde de `src/services/estrutura/serializar.js` — um grafo com referências cruzadas entre arrays é exatamente o caso que aquele arquivo existe pra cobrir: meia leitura desenha um caminho de sinal errado e o técnico só descobre no palco.

- bloco sem `id`/`origem` válida, ou id duplicado → **lança** (`ErroDeFluxo`);
- conexão com ponta pendurada → **descarta a conexão** e segue;
- `camada.entradaId` órfão → vira `null`;
- `versao` futura → lança `"versao-futura"`;
- a versão em memória é a que o **conteúdo** exige, não a máxima suportada — só sobe quando um recurso novo é usado de fato.

**Não materializar cedo:** enquanto o grafo estiver vazio, `project.fluxo` não existe. O sync é por hash de fatia — gravar `{versao:1,blocos:[],conexoes:[]}` em todo projeto acordaria todos eles.

---

## Módulos puros — `src/services/fluxo/`

| Arquivo | O que faz |
|---|---|
| `modelo.js` | `makeBloco`, `makePortaDeBloco`, `proximoIdDePorta`, `makeCamada` |
| `serializar.js` | `VERSAO_FLUXO`, `ErroDeFluxo`, `paraJSON`, `deJSON` |
| `semear.js` | `agruparPorEquipamento`, `semear`, `assinaturaDaScreen`, `assinaturaDoEquip` |
| `estagios.js` | ranqueamento em colunas |
| `cena.js` | geometria pura (posições, âncoras de porta) |
| `realce.js` | `acender(fluxo, blocoId, {modo})` |
| `reconciliar.js` | `deriva`, `reconciliar` |
| `edicao.js` | adicionar/remover bloco, ligar/desligar, validações |

Mais `src/services/sinais.js` — o vocabulário de sinal extraído do `loomex.js` (ver refactor).

---

## Semeadura e reconciliação

`semear(project, numbering)` reaproveita literalmente o que o `buildLoomexExport` já calcula (`loomex.js:91`): `projectScreenReport(project, "sinal", numbering)`, agrupamento de Screens por `equipamentoId` na ordem de aparição, fila de saídas ethernet caindo pra fibra via `dataOuts`, round-robin com `estilo:"dashed"` quando esgota, Screen sem equipamento vira bloco sem conexão. É a mesma verdade, em outra forma.

Cada bloco semeado guarda `semente.assinatura` — **contagem de portas e de gabinetes por porta**, sem nome e sem nada dependente de ordem.

> **Por que a assinatura tem que ser assim:** Screen em estratégia `"livre"` devolve o que o técnico desenhou à mão, e isso muda a cada edição. Assinatura baseada em nome ou ordem viraria ruído permanente — e o usuário aprende a ignorar o `StatusPill`.

> **`numbering` é preferência GLOBAL** (`prefs.cableNumbering`) e altera o `projectScreenReport`. Semear com uma e reconciliar com outra reporta deriva falsa. Por isso `fluxo.semente.numeracao` existe.

`deriva(fluxo, project, numbering)` é puro e barato (roda a cada render num `useMemo`), devolvendo itens **descritivos**, nunca mutações: `screen-nova` · `screen-sumiu` · `screen-renomeada` · `portas-mudaram` · `controladora-trocada` · `controladora-sumiu`.

**O que a reconciliação NUNCA toca** — esta é a metade importante da feature:
- bloco `generico` e qualquer bloco sem `semente` (é o Resolume que o usuário digitou);
- **camadas** — são declaração do usuário, sempre;
- nome com `nomeManual: true`;
- conexão cujas duas pontas continuam existindo;
- posição — não existe posição salva, porque o layout é automático. **Vantagem concreta da decisão 4:** esse conflito nem nasce.

Cada item de deriva tem caixinha própria no modal. `controladora-trocada` mantém o `bloco.id` e reata as conexões **por nome de porta**, depois por índice, listando o que não reatou. `screen-sumiu` oferece remover (dizendo quantas conexões morrem) ou converter em `generico`, mantendo o desenho de pé.

---

## Refactor do `loomex.js`

**Alvo: `buildLoomexExport` mantém assinatura e saída idênticas, e `loomex.test.js` não muda uma linha** — ele vira o teste de regressão do contrato.

```js
export function buildLoomexExport(project, numbering = "row-tb-lr") {
  const fluxo = temFluxo(project) ? deJSON(project.fluxo) : semear(project, numbering);
  return projetarLoomex(fluxo, project, numbering);
}
```

O que preserva o contrato:

1. **ids de bloco** renumerados na saída: `screen` → `SC{n}`, resto → `EQ{n}`, na ordem dos `fluxo.blocos`. O grafo tem ids estáveis; o arquivo continua posicional.
2. **ids de porta** renumerados por posição dentro da direção — `in{i+1}`/`out{i+1}`, Screen → `p{n}`.
3. **etiquetas** pelo mesmo `nextCabo(sinal)` com prefixo do `SINAIS` e `padStart(3,"0")`.
4. **geometria**: `x = 60 + estagio × 400`. Este é o achado que salva o teste — **`X_EQUIP=60` e `X_SCREEN=460` são exatamente estágio 0 e estágio 1 de um passo de 400**. `blockH` e `GAP=40` seguem iguais.
5. `zonas: []`, `ativos`, `bibliotecaEquipamentos` deduplicada por nome com portas sem id, `meta`, e **sem chave `schema`** — tudo emitido sempre, porque o importador do Loomex valida só `data.blocos` e **não aplica default nenhum**.

**Move pra `src/services/sinais.js`**: `GRUPOS_SINAL`, `SINAIS`, `sinalLabel`, `sinalPfx`, e um `grupoDe(id)` novo. O `loomex.js` re-exporta (`export { SINAIS, GRUPOS_SINAL, sinalLabel } from "./sinais.js"`), então `loomex.test.js`, `Equipamentos.jsx` e `seedEquips.js` não mudam nem de import. Sem isso, `fluxo/*` passaria a depender do módulo-ponte-de-exportação — inversão de camada.

---

## Arranjo por estágio

```js
export const GRUPOS_DE_FLUXO = new Set(["video", "rede", "audio", "sincronismo"]);
```

1. **Só arestas desses grupos ranqueiam.** `controle` (usb, rs232, artnet, dmx) e `energia` são desenhadas mas **não movem coluna** — senão um notebook de controle ligado no media server empurra o media server uma coluna pra direita e entorta o mapa inteiro.
2. **`rede` ranqueia pela direção que o usuário declarou** (saída→entrada). Dentro do Fluxo a direção existe, mesmo o Loomex tratando o grupo como agnóstico na hora de desenhar.
3. **Rank = caminho mais longo** (Kahn; `rank[v] = max(rank[u]+1)`).
4. **Ciclo**: o que sobra do Kahn está em ciclo. Escolha determinística (menos entradas não resolvidas, empate pela ordem de criação), rank forçado, aresta de retorno registrada em `ciclos`. Termina sempre, e o resultado é estável entre execuções — importa porque alimenta o hash do sync via projeção.
5. **Destinos à direita**: pós-passe empurrando pra última coluna todo sumidouro ranqueado, todo `origem:"screen"` e todo `papel:"destino"`. Sem isso, uma Screen alimentada direto pelo switcher fica na coluna 1 enquanto outra, atrás de um processador, fica na 3 — e o mapa mente sobre o que é destino.
6. **Órfão** (sem conexão nenhuma) vai pro estágio 0 e entra em `soltos` → chip âmbar na F3, não some do desenho.

`cena.js` faz o resto: altura do bloco (a mesma fórmula do Loomex, mais o bloco de camadas quando houver), uma passada de **baricentro** com duas varreduras ida-e-volta pra reduzir cruzamento, e o empilhamento com `gap`. ~40 linhas, determinístico, e pra grafos de 5–30 blocos é indistinguível de um algoritmo caro.

---

## Acender o caminho

`acender(fluxo, blocoId, { modo })` → `{ blocos, conexoes, portas, camadas }` (Sets).

**Montante e jusante por padrão.** Clicar no Resolume quer dizer "onde isso vai dar"; clicar numa Screen quer dizer "de onde isso vem". Uma direção só faria metade dos cliques dar resposta vazia. A escolha vive na F5 (muda *como se vê*, R3), com "Cadeia inteira" como padrão.

A travessia é adjacência de **salto**, não de nó — e a camada é um salto. Chegando num bloco pela porta de entrada `p`:

- existe camada com `entradaId === p` → acende a camada e continua pelas `saidaIds` dela (vazio = todas);
- o bloco tem camadas mas nenhuma presa em `p` → continua por todas as saídas, sem acender camada — e isso é um achado que vale mostrar, não um bug a esconder;
- o bloco não tem camadas → continua por todas as saídas (a Screen não tem saída, então para ali).

Visitados chaveados por `"bloco/porta/direcao"` — **obrigatório**, porque o arranjo já admite ciclos.

---

## Desenho e interação

**SVG React**, como todo 2D do app. Nada de d3, react-flow ou canvas.

```
<g> conexões apagadas (opacity .18)
<g> blocos
<g> conexões acesas        ← por cima, pra não sumirem sob um bloco apagado
```

**Arestas em Bézier cúbica horizontal** — `M x1 y1 C x1+k y1, x2-k y2, x2 y2`, `k = clamp((x2-x1)*0.5, 30, 160)`. ~15 linhas.

> **Por que não portar o roteador do Loomex:** lá foram ~450 linhas de A* ortogonal + faixas **porque o usuário arrasta os blocos** e nada garante que a origem esteja à esquerda do destino. Aqui o layout é colunar e automático, o fluxo é monotônico da esquerda pra direita, e a Bézier é o que Wire, TouchDesigner e react-flow desenham. Bézier ≈ meio dia; faixas ≈ mais meio dia se ficar feio; A* ortogonal ≈ uma semana e um passivo que esta aba não precisa carregar.

Aresta retrógrada (ciclo, ou `controle` apontando pra trás) usa a mesma Bézier com uma bolha **por cima** do bloco de origem, pra não atravessar o corpo invisivelmente.

**Pan/zoom**: copiar o idioma de `ScreenCabling.jsx:70-91` **verbatim** — roda com zoom no cursor, `<g transform>`, `drag.current.moved` separando clique de arrasto, `touchAction:"none"`, `<ZoomTrio>` no canto, `fit()` em `useEffect`. Copiar em vez de inventar também é o que passa no lint hoje.

**Alvos**: corpo do bloco com `<rect>` cobrindo tudo; cada linha de porta com `<rect>` de altura `ROWH` e `fill="transparent"`. **Piso de usabilidade: se `ROWH × zoom < 12`, desliga o hit-test por porta** e só o bloco recebe clique — porta de 4px é armadilha, não alvo.

**"Apagar o resto" é `opacity`, nunca cor** — opacidade funciona igual no tema escuro e no modo sol, que é justamente o que uma cor de "dim" não faz.

---

## A aba, nas 5 faixas

Registro: uma linha no `TABS` do `ProjectDetail.jsx`, **depois de `cabeamento`** (o Fluxo consome o resultado dele) — `{ id: "fluxo", label: "Fluxo", Icon: Waypoints, Comp: ProjectFluxo }`.

| Faixa | Conteúdo |
|---|---|
| **F1 · MODO** | `Segmented`: **Mapa** · **Camadas** · **Lista**. *Camadas* = tabela "bloco · camada · entrada · quem alimenta", a resposta direta à pergunta que originou a feature. *Lista* = o grafo por estágio, o que se lê em voz alta no palco e o que serve no celular |
| **F2 · FERRAMENTAS** | `Select` "Realçar: ⟨bloco⟩" · toggle-ícone de etiquetas · 🎛 ajustes · `Download` "Loomex" (ghost) ··· **única primária roxa: "Adicionar bloco"** |
| **F3 · CONTEXTO** | chips passivos (N blocos · N conexões · N camadas · N estágios) · `StatusPill` **só com problema**: `Screens mudaram · 2`, `3 blocos sem ligação`, `2 ligações em ciclo`, `4 a confirmar` · `HelpTip` com o gesto e o critério das colunas |
| **F4 · CONTEÚDO** | card `MAPA DO SINAL` (SVG + `ZoomTrio`) e card `LEGENDA`. Editar bloco abre `Drawer` — muda *o que o projeto é* (R3), mesmo padrão do `Equipamentos.jsx` |
| **F5 · AJUSTES** | `LightModal` (desktop) / `BottomSheet` (mobile): direção do realce, quais grupos aparecem, mostrar camadas embutidas, mostrar etiquetas |

**R1 respeitado** — "Adicionar bloco" é a razão de existir da aba. Semear **não disputa a primária**: mora como botão ghost dentro do `Placeholder`, igual o "1 Screen por tela" faz hoje no `ScreenCabling`.

**Estado vazio** (`Placeholder`): *"O caminho do sinal ainda não foi montado. O projeto já sabe o que vem depois da controladora — monte o começo do mapa a partir das Screens, depois acrescente o que vem antes: media server, mesa de corte, notebook."* + `[ Montar do projeto ]` ghost.

**Mobile**: a aba sempre existe. Diferente da Estrutura, aqui a consulta é genuinamente boa no dedo — pan/zoom e tocar pra acender funcionam. Então: abre em **Lista**, o Mapa continua disponível, a primária **some**, e o `HelpTip` diz que montar o caminho é trabalho de computador.

---

## Catálogo

Estende a biblioteca `equips` que já existe — não cria um segundo catálogo.

1. **`camadas: 0` no `makeEquip`**, carregado pelo `equipSnapshot`, com `NumField` no Drawer do `Equipamentos.jsx`. Chave ausente tolerada. ~10 linhas em 3 arquivos.
2. **Seed AV novo** além da controladora: media server, notebook/PPT, switcher, switch de rede, TX/RX de fibra, processadora — com prefixos de id novos e estáveis (`av-*`), **jamais renumerando os `nova-*`**. O Loomex já tem 38 templates, 23 com pinagem NovaStar conferida em datasheet, gerados por `loomex-lab/gerar-biblioteca.js` — é de lá que o seed sai.
3. **Genérico**: bloco sem `equipamentoId`, com nome, nº de entradas, nº de saídas, nº de camadas e sinal padrão de cada lado. Gera `in1..inN`/`out1..outN` na hora.
4. **Camadas são sempre por bloco.** O número na biblioteca é só o padrão inicial; o bloco materializa os objetos que o usuário renomeia e prende às entradas.

> ⚠️ **O modo de falha mais provável da feature inteira.** `AppContext.jsx:205/225` hidrata `equips` com `hydrateArray(KEYS.equips, SEED_EQUIPS)` — **o armazenado vence o seed**. Quem já usa o app **nunca verá os modelos novos**. O dono testa em navegador limpo, vê o catálogo, e nenhum usuário vê nada. Ver **Pendências**.

---

## Ordem de construção

| # | Entrega | Testes |
|---|---|---|
| **0** | ⚠️ Vocabulário e ícone aprovados no manual | — |
| **1** | `services/sinais.js`; `loomex.js` re-exporta | `loomex.test.js` **inalterado**, verde |
| **2** | `fluxo/modelo.js` + `fluxo/serializar.js` | `modelo.test.js`, `serializar.test.js` |
| **3** | `fluxo/semear.js`; `buildLoomexExport` vira projeção | `semear.test.js` + `loomex.test.js` como portão |
| **4** | `fluxo/estagios.js` + `fluxo/cena.js` | `estagios.test.js`, `cena.test.js` |
| **5** | **A aba, só leitura** — `TABS`, Mapa/Lista, semear pelo vazio, pan/zoom, clicar acende | `realce.test.js` |
| **6** | Edição: adicionar/editar/remover bloco, ligar/desligar | `edicao.test.js` |
| **7** | ⚠️ Camadas: campo na biblioteca, seed AV, modo Camadas, camada no realce | cresce em `realce.test.js` |
| **8** | Deriva e reconciliação | `reconciliar.test.js` |
| **9** | Opcional: faixas nas arestas, extrair `usePanZoom`, folha de organograma no Caderno | — |

**A fase 5 já é vendível sozinha**: o técnico abre a aba e vê a cadeia LED semeada, clica e ela acende. E a fase 3 se paga mesmo sem interface — o export do Loomex passa a sair de um grafo que o projeto guarda.

O que cada teste crava:
- `modelo.test.js` — id de porta nunca reaproveitado depois de apagar; bloco de snapshot copia portas com ids únicos.
- `serializar.test.js` — ida-e-volta estável; `versao` futura lança; conexão pendurada descartada; `entradaId` órfão vira `null`; chave vazia não é gravada.
- `semear.test.js` — mesma fixture do `loomex.test.js`: dashed no round-robin, Screen sem equipamento sem conexão, fibra quando não há ethernet.
- `estagios.test.js` — rank por caminho mais longo; ciclo determinístico e reportado; aresta de `controle` **não** move coluna; Screen vai pra última.
- `cena.test.js` — sem sobreposição por coluna; grafo de 2 estágios cai em x=60 e x=460.
- `realce.test.js` — acende nos dois sentidos; entrada presa a camada acende a camada; camada sem vínculo não acende; grafo com ciclo termina.
- `edicao.test.js` — remover bloco leva as conexões; out→out recusado; auto-ligação recusada.
- `reconciliar.test.js` — e o que mais importa: **bloco genérico, camadas e nome manual saem intactos** de uma reconciliação completa.

---

## Riscos e armadilhas desta base

1. **`react-hooks/set-state-in-effect` é bloqueante no CI e já pegou duas vezes.** "Zerar a seleção quando o projeto muda" tem que ser a sentinela em tempo de render do `App.jsx`/`ScreenCabling.jsx:75-76`, não um effect.
2. **Não gravar chave vazia** — o sync é por hash de fatia.
3. **`equipSnapshot()` descarta ids de porta.** Materializar no bloco é obrigatório.
4. **`buildLoomexExport` é contrato externo**, não código interno. Mudar a ordem de `blocos` já quebra o teste — e o importador do Loomex não aplica default nenhum.
5. **`numbering` é preferência global** e altera o `projectScreenReport`.
6. **Screen em estratégia `"livre"`** muda a contagem a cada edição — a assinatura tem que ser por contagem, não por nome ou ordem.
7. **Cor hardcoded quebra o modo sol.** O dim é `opacity`. E não copiar o `background:"#08080f"` do palco do `ScreenCabling.jsx:307` — é violação preexistente, não padrão.
8. **`T` é objeto mutável capturado no import** — nada de `const CORES = {borda: T.bd}` no topo de módulo novo.
9. **Ciclos vão acontecer** assim que alguém desenhar switch↔controladora nos dois sentidos.
10. **`equipamento.pxPorta` é escrito em `sinalCfg.pxPortaBase` mas `cableMeta()` nunca lê** — a capacidade real da controladora não influencia a contagem de portas hoje. Não construir aviso de capacidade em cima disso sem antes confirmar.
11. **`ErrorBoundary` embrulha a aba**: um throw do `deJSON` apaga a aba inteira. Seguir o `abrir()` do `ProjectEstrutura` — capturar, renderizar `Placeholder` explicando, e **não gravar nada** enquanto em erro; gravar por cima apagaria justamente o grafo que o app não conseguiu ler.
12. **Peso do bundle** — SVG puro, sem arrastar three.js nem pdfmake.
13. **A conferir antes da fase 5**: o import de backup e o `factoryReset` do `Settings.jsx`. `project.fluxo` deve viajar de carona por serializar o projeto inteiro, como `project.estrutura`, mas vale ler.

---

## Pendências do dono

**⚠️ 1 — Vocabulário e ícone (trava a fase 0).** Aprovar no manual: **Fluxo** (aba e chave), **Bloco**, **Camada**, **Estágio**, **Conexão**, e o ícone `Waypoints`.

**⚠️ 2 — Como o catálogo AV chega em quem já usa o app (trava a fase 7).** Duas saídas:
- **(a) merge aditivo único** — na hidratação, acrescenta os itens de seed cujo `id` não está no armazenado, uma vez só, gravando `prefs.equipsSeed = 2`. Respeita a decisão histórica ("o catálogo read-only virou seed de fábrica, a biblioteca é livre") e não ressuscita o que o usuário apagou.
- **(b) catálogo AV read-only à parte** (`src/data/catalogoAv.js`), oferecido no picker ao lado da biblioteca e copiado pro bloco, sem tocar em `equips`. Mais fiel à palavra "curado", mas reintroduz o read-only que já foi aposentado uma vez.

---

## Verificação

- `npx vitest run` — os testes puros novos e, principalmente, **`loomex.test.js` verde sem alteração** (prova de que a projeção não mudou o contrato).
- `npx eslint src --max-warnings 0` — bloqueante; atenção ao `set-state-in-effect`.
- `npm run dev` + projeto real com Screen e controladora vinculada: a aba abre semeada com um clique, sem digitar nada.
- Exportar `.loomex.json` e importar no Loomex (`python -m http.server 8321 --directory loomex`) — o projeto tem que nascer lá igual ao que nasce hoje.
- Renomear uma Screen e mudar contagem de porta, voltar na aba: `StatusPill` aparece, reconciliar ajusta a parte derivada e **preserva** os blocos que o usuário acrescentou.
- Trocar pro **modo sol** com o mapa aberto e uma cadeia acesa — o dim tem que continuar legível.
- `npm run build` — conferir que o chunk da aba não puxou three.js nem pdfmake.
