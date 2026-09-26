# Fluxo Projeto → Telas → Cabeamento → Screen → Composição — espeque

> **Status: DECIDIDO, em implementação** na branch `claude/entendimento-descricao-1v6twi`.
> Nasceu do SPEC "Novo fluxo de Projeto → Telas → Cabeamento → Screen →
> Composição" e das respostas do dono em 26/09/2026. Onde este documento e o
> SPEC original divergem, **vale este documento**.
>
> Nada vai pra `main` sem o "pode soltar".

---

## 1 · O objetivo

Cada aba tem **uma responsabilidade**, e o app conduz o técnico numa ordem que
evita erro de montagem. As regras ficam mais **flexíveis**: dividir uma tela
dentro de uma Screen não pode obrigar a ficar indo e voltando entre abas.

```
Projeto → Telas → Cabeamento → Screen (Split dentro) → Composição → Estrutura → Caderno
```

## 2 · Decisões do dono

| # | Assunto | Decisão |
|---|---|---|
| D1 | Gabinetes de tipos diferentes na mesma tela | **Obrigatório.** Casos reais em 3 eventos. A tela passa a ser feita de **blocos** (modelo, colunas × linhas, posição em mm). |
| D2 | Tela montada deitada (ex.: tiras de 50×100 da Boticário) | O giro é **da tela, só na montagem**: **90° anti-horário** (fica mais fácil ler da esquerda pra direita). O gabinete nunca gira: no **Cabeamento** e na **Screen** a tela é sempre **de pé**, como o processador enxerga. O Resolume gira o conteúdo e o painel deitado desgira. |
| D3 | Unidade da posição dos blocos | **mm** (vale pra qualquer mistura de gabinetes). |
| D4 | Índice das portas | **Por Screen**, pela **ordem de inclusão** das telas (não pelo número da tela). Reordenar mostra o diff antes/depois. |
| D5 | Tela em mais de uma Screen | **Não.** (Já é a regra atual.) |
| D6 | Porta atravessando duas telas | **Só no modo Livre.** No automático a contagem de gabinetes por porta tem que fechar por tela. |
| D7 | Disposição do cabeamento | Só **3 opções: Linha, Coluna e Livre**, iguais pro **Sinal e pro AC** (uma frente de layout, não três). Saem "Área" e "AC atrelado ao sinal". |
| D8 | Energia (AC) | Deixa de ser aba; vira **configuração dentro do Cabeamento**. |
| D9 | Split | Parte a tela em pedaços **que mudam de posição** no canvas da Screen (ex.: tira de 29 m × 0,5 m = 58 gab → 5 × (10×1) + 1 × (8×1), empilhadas pra caber numa destination 1920×1080). |
| D10 | Composição | Dois modos: **Conteúdo** (input: as telas como são montadas, deitadas se for o caso) e **Configuração** (output: a Screen de pé, com destination, upscale H/V e diferença de px). Test Card mora aqui. |
| D11 | Caderno | Imprime a tela **como ela foi cadastrada** (medida física, deitada se for o caso). As duas vistas vêm dos dois modos da Composição. |
| D12 | Navegação desktop | App **focado em projeto**. Cachês, Agenda, Financeiro e o resto vão pra um menu secundário. O celular mantém a bottom nav. |
| D13 | Abas do projeto | Projeto · Telas · Cabeamento · Screen · Composição · Estrutura · Caderno. **Equipe sai por enquanto.** Bloqueio progressivo (aba visível e apagada) e indicador de estado (neutro / âmbar / vermelho). |
| D14 | Vocabulário | Continua **Porta** (sinal) e Circuito (AC). Contador: `15/16 portas`. |
| D15 | Visual | Novo estilo com base no **Pixel Flow / NovaStar**. O **Manual de Marca é remontado** em cima dessa referência antes de qualquer token mudar. |

## 3 · O modelo da tela

```js
tela = {
  id, nome,
  // LEGADO (continua valendo): tela de UM modelo
  gabinete, cols, rows,
  // NOVO (opcional): tela de vários blocos
  blocos: [{ id, gabinete, cols, rows, x, y }], // x/y em mm, de pé, a partir do canto sup-esq
  deitada: false, // montagem girada 90° anti-horário (só vistas físicas)
}
```

- **Tela sem `blocos` é um bloco só**, montado de `gabinete/cols/rows` na
  leitura. Projeto salvo abre igual, sem migração.
- **Tudo que é processamento (Cabeamento, Screen, Composição › Configuração)
  vê a tela DE PÉ.** Só as vistas físicas (cadastro, Composição › Conteúdo,
  Estrutura, Caderno) aplicam o `deitada`.
- A porta só encadeia gabinetes do **mesmo modelo** (regra do VX Pro); numa tela
  mista, cada modelo é cabeado à parte.

## 4 · Fases

| Fase | Entrega |
|---|---|
| 0 · Motor | Blocos + `deitada` no modelo, geometria única (`services/blocos.js`), rollups e canvas via blocos, testes. Nada visível muda. |
| 1 · Navegação | Shell desktop focado em projeto, abas novas, bloqueio progressivo, estado por aba. |
| 2 · Modais | Novo projeto → Telas com o modal de nova tela aberto; modal de tela com blocos, giro e preview (px e m). |
| 3 · Cabeamento | Linha / Coluna / Livre pro Sinal e o AC, numeração local por tela, alertas 90% / 100%, Energia como configuração. |
| 4 · Screen + Split | Índice pela ordem de inclusão, contador `X/16`, diff ao reordenar, partes com posição própria, drag com feedback. |
| 5 · Composição | Conteúdo / Configuração, destination Standard/Custom, upscale H/V, Stretch/Fit/Fill, sobrepor cabeamento, test card com marca de TOPO, instrução de giro pro Resolume. |
| 6 · Caderno/PDF | Relatório e PDF entendendo blocos, giro e partes. |
| 7 · Visual | Manual de Marca remontado (Pixel Flow / NovaStar), depois os tokens. |

## 5 · Fora do escopo

Geração nativa de PDF (pdf-lib), agendas e recibos, acervo de ícones.

## 6 · Registro da fase 0 (motor)

**Entregue:** `src/services/blocos.js` é a fonte única da geometria da tela
(`blocosDe`, `celulasDaTela`, `dimTela`, `medidaFisica`, `contagemPorModelo`).
Passam a usar os blocos:

- `canvasCabling.js`: `dimOf`, `modelKey` e `canvasCells`. A célula carrega o
  próprio `gabinete`, e o orçamento da porta sai dele (`telaDoModelo`).
- `screenCabling.js`: orçamento por modelo, chave e referência do modo Livre com
  `bloco`, e linhas de corte.
- `screens.js`: o corte por coluna/linha só vale em tela de **um** bloco. O Split
  por partes móveis (fase 4) substitui isso.
- `projectCalc.js`: `screenRollup` e `aggregateElectrical` somam bloco a bloco.
  O `deitada` gira a medida física e **não gira o pixel**.

Tela legada continua idêntica: os 848 testes de antes passam sem alteração, e
mais 15 testes cobrem a tela mista, a tela deitada e o modo Livre com bloco.

**Ainda leem `tela.gabinete/cols/rows` direto** e migram na fase indicada. Até
lá, nenhuma tela de blocos é criada pela UI (o modal é da fase 2).

| Onde | Fase |
|---|---|
| `cabling.js` (cabeamento por tela: `cableMeta`, `cablePorts`, `signalRoute`) | 3 |
| `ProjectDados.jsx`, `ProjectEnergia.jsx` | 2 / 3 |
| `ProjectScreens.jsx` (Partir) | 4 |
| `layout.js` (`compDimOf`), `ProjectComposicao.jsx`, `ProjectTestCard.jsx`, `pixelMap.js` | 5 |
| `ProjectRelatorio.jsx`, `ReportTelasCanvas.jsx`, `ReportTestCards.jsx`, `reportContent.js`, `pdf/*` | 6 |
| `estrutura/paineis.js` (3D — precisa aplicar o `deitada`) | 6 |
