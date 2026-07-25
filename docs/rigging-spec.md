# Rigging & Estrutura — espeque da fase (F2)

> **Status: GROUND (2026-07-24) · motor calibrado na frota (2026-07-25) · escopo
> CRAVADO (2026-07-25, ver §3).** Motor puro (`services/rigging.js`) com testes.
> UI e Caderno vêm depois das decisões que faltam (§8).
>
> 📚 **Base de pesquisa:** [`rigging-pesquisa.md`](./rigging-pesquisa.md) — como o
> mercado resolve, o que os fabricantes publicam (e em que unidade), regras de
> cálculo, e a triagem da pesquisa paralela. **Leia antes de mexer no motor.**
>
> ⚠️ **Segurança:** tudo aqui é **planejamento e registro de referência**. Carga
> suspensa sobre pessoas é responsabilidade do **rigger habilitado** que dimensiona,
> monta e assina o rigging do evento — o app nunca substitui esse papel (mesma
> postura do box de segurança AC do Caderno).

## 1 · Vocabulário

| Termo | O que é |
| --- | --- |
| **Coluna** | pilha vertical de gabinetes (a tela tem `cols` colunas de `rows` gabinetes). |
| **Bumper** | viga no topo da parede que recebe 1..N colunas penduradas nela. |
| **Ancoragem** | onde a VIGA oferece pra pendurar (olhal, ilhó, garra). É o que o app conta. |
| **Ponto** | no meio técnico, o **ponto de talha** que a produção entrega no teto. O app **não** calcula isso — uma ancoragem costuma subir numa talha, mas bridle e repartição são decisão do rigger. Por isso o app nunca escreve "ponto". |
| **Talha** | a corrente que sobe a parede. **A frota é 100% talha MANUAL de 1 t** — não tem motor elétrico, a subida é na mão (afeta o texto do Caderno: não existe "descer no controle"). |
| **WLL** | Working Load Limit — carga de trabalho da talha/acessório (o fator de projeto ~5:1 do fabricante **já está embutido** no WLL; nunca somar fator por cima do WLL, e nunca passar dele). |
| **Trava (fast-lock)** | o fecho que prende gabinete em gabinete. **É o elo que quase sempre define o limite de empilhamento do fabricante** — não a talha. Dois tipos vistos em campo: **chaveta** (entra na ranhura) e **pino transversal** (gira e trava apoiando no fim de curso mecânico). |
| **Enforcar a talha** | içar até o fim do curso, sem corrente livre entre o gancho de carga e o corpo. **Modo de falha real e observado** — ver §4.1. |
| **Voado (flown)** | parede pendurada em ancoragens. É o escopo desta fase. |
| **Ground support** | parede apoiada no chão com torre/lastro — **fora do escopo** (§3.3). |

## 2 · O modelo (voado)

```
     ancorag.     ancorag.     ancorag.
        │            │            │
   ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
   │ bumper  │  │ bumper  │  │ bumper  │   ← colunasPorBumper (2 no exemplo)
   ├────┬────┤  ├────┬────┤  ├────┬────┤
   │gab │gab │  │gab │gab │  │gab │gab │
   │gab │gab │  │gab │gab │  │gab │gab │   ← rows
   └────┴────┘  └────┴────┘  └────┴────┘
```

- `pesoColuna = rows × peso do gabinete`
- **`colunasPorBumper` é DERIVADO**, não configurado: `floor(largura do bumper ÷ largura do gabinete)`, mínimo 1. Bumper de 100 cm com gabinete de 500 mm = 2 colunas; de 50 cm = 1. Gabinete mais largo que a viga = 1 coluna **com aviso**. Dá pra sobrescrever à mão.
- `bumpers = ceil(cols / colunasPorBumper)` — o último pode ficar incompleto
- `ancoragens = bumpers × ancoragens do bumper`
- **Carga por ancoragem = pior caso** (bumper cheio): `(colunasPorBumper × pesoColuna + pesoBumper) / ancoragens do bumper + acessórios da fixação + extras`
- **Checagem da talha**: `pctTalha = carga por ancoragem ÷ WLL`. `rigTone` espelha o elétrico — **> 80 % laranja, > 100 % vermelho**. Como a frota é só 1 t, não existe "escolher motor maior": ou cabe, ou divide a parede em mais ancoragens.
- **Ângulo**: o motor assume içamento **a prumo** (θ = 0°). Fora da vertical a carga na ancoragem cresce por `1/cos θ` (45° = 1,41× · 60° = 2,00×). Enquanto não houver campo, o Caderno **declara a premissa**.

### Catálogo de bumpers — semente, não verdade

**`ancoragens` é propriedade do BUMPER, não da largura.** Isso ficou provado pela
própria frota: existe bumper de 50 cm com 1 ancoragem **e** bumper de 50 cm com 2
(o do 2.9 RGB Share). E no mercado existe viga de **2 gabinetes de 64 cm
(1,28 m) com uma ancoragem só** — bumper robusto, gabinete de 12 kg (ISD Lumen P10
outdoor). Qualquer regra que derive ancoragens da largura está errada.

Por isso o catálogo é **semente**: o técnico cadastra o bumper dele
(`cfg.bumper` aceita objeto solto com `larguraMm`, `ancoragens`, `pesoKg`).

| Bumper (semente) | Largura | Ancoragens | Colunas (gab. 500 mm) | Peso |
| --- | --- | --- | --- | --- |
| 50 cm · 1 ancoragem | 500 mm | 1 | 1 | ⚠️ 8 kg *(estimado)* |
| 50 cm · 2 ancoragens | 500 mm | 2 | 1 | ⚠️ 8 kg *(estimado)* |
| 100 cm · 2 ancoragens | 1000 mm | 2 | 2 | ⚠️ 14 kg *(estimado)* |

| Fixação | Acessórios | Peso na ancoragem |
| --- | --- | --- |
| Algema/garra | garra | ⚠️ 3 kg *(estimado)* |
| Ilhó + cinta + manilha | cinta de carga, manilha | ⚠️ 5 kg *(estimado)* |

Os pesos ⚠️ são **placeholder** (`estimado: true`) até a pesagem real; enquanto
estiverem assim o motor devolve aviso e o Caderno rotula como estimativa. Bumper
cadastrado pelo técnico **sem peso** também nasce `estimado`. A lista de acessórios
por fixação é o embrião da picking list da locadora.

---

## 3 · O ESCOPO — decisão de 25/07/2026

### 3.1 A virada: o app é REGISTRO, não calculadora

A pergunta não é *"a estrutura aguenta?"* — essa é do Braceworks/rigger, e não é o
nosso páreo. A nossa é: **"o que foi montado, com que ferragem, sob quais
premissas, e o que o técnico avisou?"**

Isso muda o produto de calculadora para **régua comprobatória**. Hoje o mercado
trabalha por pressuposto: ninguém tem os dados do gabinete na mão, e quando algo
dá errado quem estava na ponta do cabo é o culpado padrão. Um documento que
registra o que foi declarado, o que faltou de informação e o que foi avisado
**muda a posição do técnico na conversa** — e, mais importante, força essa conversa
a acontecer *antes* do show.

**Honestidade sobre o alcance:** o Caderno **não transfere responsabilidade legal**
e não substitui ART. O que ele faz é concreto e suficiente: datar e versionar o que
foi projetado, deixar explícito **qual dado não existia**, e registrar os avisos
emitidos. Vender como "blindagem jurídica" seria a mesma mentira do lastro sem
geometria. É **prova de diligência**, não escudo.

### 3.2 Princípio: o app PERGUNTA, não supõe

Consequência direta e a regra mais importante desta fase:

- **Campos preenchidos pelo técnico, por tela**, no projeto. Ele importa/monta a
  tela e completa o que sabe daquele gabinete ali.
- **Vazio é informação.** Sem dado, o app **não estima** — imprime *"não informado"*
  no Caderno. Um campo em branco num documento datado vale mais que um número
  inventado: ele registra que a informação não estava disponível.
- **Identificação pelo que dá pra ver.** O técnico sabe o **pitch** e a **dimensão
  do gabinete**; o código do modelo mora num manual que ninguém tem — *"não me
  recordo exatamente qual o MG"* é a regra, não a exceção. A biblioteca tem que
  funcionar identificada por **fabricante + pitch + dimensão**, com o modelo exato
  como campo opcional.
- **Peso: medir vale mais que datasheet.** Uma balança de gancho resolve o dado mais
  importante da fase inteira, e vale pro gabinete, pro bumper e pra fixação.

### 3.3 Fronteira dura — o que o app NUNCA faz

Não por ser difícil de programar (as fórmulas estão na pesquisa §4), mas porque os
**dados de entrada não existem no app** e o resultado teria cara de laudo:

- dimensionar truss ou estrutura;
- entregar quilos de lastro, tração de catraca, compressão de torre ou carga de vento;
- dizer que uma montagem está **aprovada** ou que pode ficar sobre pessoas;
- substituir o rigger habilitado / a ART do engenheiro.

**O verbo do app é "confira", nunca "pode".** E a seção não se chama "Rigging" —
chamar de rigging promete engenharia. Chama-se **"Peso e ancoragens"**: promete
aritmética e entrega aritmética impecável.

---

## 4 · Checklist de campo — o conhecimento que não é conta

Aqui mora metade do valor da fase, e não custa uma linha de cálculo. São
condições de montagem que o Caderno **imprime junto** com os números. Cada item
carrega o *porquê* — o técnico que entende o motivo não repete o erro.

> Classificação: **[casa]** = prática da casa · **[prática]** = uso corrente da
> indústria · **[manual]** = está escrito em manual de fabricante. Nenhum item aqui
> é norma; tudo é confirmado com o rigger do evento.

### 4.1 Corrente livre — não enforcar a talha **[casa]**

**Regra: deixar no mínimo ~1 m de corrente livre** entre o gancho de carga e o
corpo da talha. Nunca içar até o fim do curso.

Por que importa (três falhas, uma causa):
- içar até o batente joga a força no **fim de curso**, não na corrente — é aí que
  o **parafuso do gancho de carga estoura** (visto 2× na prática da casa, **com
  queda de painel numa delas**);
- sem folga a talha **não se alinha** com a linha de carga e passa a trabalhar
  de través — gancho carrega em linha, não de lado;
- corrente esticada no limite **trava a roldana** e transforma qualquer solavanco
  da montagem em choque direto na ferragem.

É o item mais barato da lista e o que já custou material. Vai em destaque.

### 4.2 Corrente sem torção **[prática]**

Corrente de carga torcida ou enrolada trava o passo na roldana e força o elo de
lado. Conferir o corrimento livre **antes** de pôr carga, com a talha pendurada
solta.

### 4.3 Gancho: trava fechada, carga no fundo **[prática]**

Carga no berço do gancho, nunca na ponta; trava (latch) fechada. A trava é
dispositivo secundário e **não substitui a amarração** — está explícito na
ASME B30.16, que também proíbe **enrolar a corrente de carga na carga**.

### 4.4 Nivelamento da viga **[manual]**

Ajustar o nível do bumper (nas cintas) antes de subir a parede — o manual da
Unilumin pede isso explicitamente. Parede desnivelada **redistribui carga entre as
ancoragens** de um jeito que nenhuma conta prevê, e é a forma mais fácil de estourar
a pior ancoragem sem saber.

### 4.5 Subir as ancoragens juntas **[prática]**

Com talha manual, subir uma ancoragem muito à frente da outra faz aquela pegar
uma fatia desproporcional da parede. Içar em incrementos, alternando.

### 4.6 Secundário quando houver gente embaixo **[prática]**

Talha manual **não tem classificação D8+** (essas são de hoist elétrico), e a
ASME B30.16 exclui içamento de pessoas do escopo. Carga parada sobre público ou
artista pede **secundário (aço de segurança)** e decisão do rigger.

### 4.7 Contenção contra balanço **[prática]**

Parede voada é pêndulo. Amarração de contenção (tie-back) quando houver vão livre
atrás, corredor de vento ou circulação embaixo.

### 4.8 Ferragem específica por altura **[manual]**

Regra de fabricante que **muda a ferragem**, não o número: na YES TECH MG6S,
**abaixo de 8 gabinetes de altura usa 2 conectores C entre gabinetes; acima de 8,
usa 3**. Se a tela do projeto passar do limiar, o Caderno tem que dizer isso na
cara — é o tipo de detalhe que só aparece no manual que ninguém leu.

---

## 5 · A frota real de gabinetes

O parque que ele monta é **YES TECH (série MG)**, em três pitches: **P2.6 · P3.9 ·
P5.9**. O modelo exato não é lembrado em campo — o que confirma a §3.2.

| Pitch | Provável | Ambiente | Status |
| --- | --- | --- | --- |
| 2.6 | MG6S (indoor) | indoor | ⏳ confirmar |
| 3.9 | MG7S | outdoor | ⏳ confirmar |
| 5.9 | MG7S / MG9 | outdoor | ⏳ confirmar |

**Caminho pro dado real (barato e definitivo):** fotografar a **etiqueta do
gabinete** no próximo trabalho. Resolve modelo, série e muitas vezes peso, sem
depender de manual. Enquanto não vier, a biblioteca carrega o que o manual público
da série diz, marcado `conferido: false`.

Dados já levantados da série MG (ver pesquisa §2): içamento até **10 m** (MG7S) ·
gabinete 500×500 mm · a regra dos conectores C acima de 8 de altura (MG6S).

---

## 6 · O que o motor ainda NÃO cobre

- **Limite do fabricante** por modo (voado × empilhado), por barra e por coluna —
  hoje o motor só compara com a talha. É a R2.
- **Ângulo** fora do prumo (§2) — premissa declarada hoje, campo na R4.
- **Layout físico** (telas posicionadas no palco): adiado; a fase calcula por tela.

## 7 · Plano de fases (revisado 25/07)

| Fase | Entrega | Trava |
| --- | --- | --- |
| **R0 ✅** | motor puro + testes; catálogo de bumper/fixação; talha 1 t manual | — |
| **R0.5 ✅** | **Base de Conhecimento: categoria Estrutura** com "Peso e ancoragens — como a conta é feita" e "Checklist de montagem — parede voada" (§4). Conhecimento antes da calculadora: não dependia de decisão nenhuma. | — |
| **R2 ✅** | motor: **cadeia de verificação** — `limitesGabinete()` + `checaLimites()`, modo voado × empilhado, limite por barra, `elo` (quem trava primeiro), e **sem dado nunca vira "ok"** | — |
| **R1 ✅** | **campos do fabricante em "Especificações Avançadas" da Biblioteca de gabinetes** (`Inventory.jsx`): altura voada/empilhada, gabinetes por barra, trava extra acima de N, tipo de trava e procedência (`fonte` + `conferido`) | — |
| **R3 ✅** | seção **"Peso e ancoragens"** no Caderno + PDF nativo: premissas declaradas, stats + tabela por tela, **a cadeia por tela**, avisos (acima / não informado / ferragem extra / sem peso), **checklist da §4** e box de escopo. Saiu como o mockup dos 3 estados. | — |
| **R4** | painel no app (bumper/fixação/ancoragens/ângulo por Screen). O Caderno já lê `project.rigging` — a R4 é quem passa a escrever esse objeto; hoje a seção roda no `DEFAULT_RIG`. É também onde os `avisos` do motor (bumper mais estreito que o gabinete, altura do gabinete ausente) ganham lugar: no papel eles ficariam ruído. | Q4 |
| **R5** | ~~ground support~~ **FORA DE ESCOPO** (§3.3) — sobra só o limite de empilhamento do fabricante em metros | — |
| **R6** | pitch × distância no Aspect Ratio (independente, pode furar fila) | — |

### Pitch × distância (R6)

- distância mínima confortável ≈ `pitch(mm) × 1` em metros (regra de mercado 1×);
- distância "retina" (acuidade 20/20) ≈ `pitch(mm) × 3.438` m;
- faixa recomendada entre as duas + inverso (distância → pitch máximo).

Motor trivial; o valor está na UI, junto do Aspect Ratio.

## 8 · Decisões de produto

### ✅ Respondidas

- **Q1 — Bumper = CATÁLOGO**: 2 tamanhos (50/100 cm) × 2 fixações (algema/garra ·
  ilhó + cinta + manilha). `colunasPorBumper` virou **derivado** da largura.
- **Q2 (parte) — Talhas:** todas **1 t e MANUAIS**. A saída deixou de ser "qual
  motor" e virou "cabe na talha de 1 t?".
- **Q6 — Escopo (25/07):** registro, não engenharia (§3). Ground support, vento,
  lastro e estai **fora**. Sem backend — é aritmética sobre dado local.
- **Q7 — Origem do dado (25/07):** o **técnico preenche**; o app não supõe; vazio
  imprime "não informado".
- **Q2b — Ancoragens por bumper (25/07): É PROPRIEDADE DO BUMPER, e o bumper é
  cadastrável.** Frota: 50 cm → 1 · 100 cm → 2 · 50 cm do 2.9 RGB
  Share → 2. Mercado: viga de 2 gabinetes de 64 cm → 1. `ancoragens`
  virou campo do catálogo; `ancoragensPorBumper` na config só sobrescreve à mão.

### ⏳ Ainda faltam

- **Q2a — Pesos reais:** bumper de 50 e de 100 cm, e o conjunto de fixação.
  Balança de gancho resolve.
- **Q9 — Tipo de trava:** vale registrar no gabinete qual é (chaveta × pino
  transversal)? Não entra em conta nenhuma, mas é **o elo que define o limite de
  empilhamento** — e saber qual é diz o que inspecionar antes de subir.
- **Q3 — Utilização do WLL:** implementado = teto duro no WLL cheio + laranja acima
  de 80%. Confirmar, ou 80% como teto duro?
- **Q4 — Onde mora a UI:** abas do projeto estão "infladas". Sugestão: começar pelo
  Caderno (R3) e só depois o painel (R4).
- **Q5 — Campos de fabricante:** entram no seed certificado ou só na biblioteca
  pessoal? Com a frota sendo uma marca só, o seed fica viável.
- **Q8 — Checklist (§4):** os itens conferem com a prática dele? Falta algum que já
  deu problema? A lista é dele, eu só organizei. *(Ele vai anotando conforme lembrar.)*

---

## 9 · Estado ao fim da sessão de 25/07/2026

Tudo vive na branch **`feat/rigging`** (empurrada pro GitHub). **Nada foi pra
produção** — prod segue na v1.9.1. `npm test` 296 verdes, `eslint` limpo.

> **Atualização — R3 entregue.** A seção do Caderno saiu (ver §7). O que resta
> da fase é a **R4** (painel no app) e os **dados reais** que só ele traz.

### O que já está construído

| Onde | O quê |
| --- | --- |
| `src/services/rigging.js` | motor puro: peso, bumpers, ancoragens, carga na pior ancoragem, checagem contra a talha, **cadeia de limites do fabricante** (modo voado × empilhado, por barra, por altura), `elo` (quem trava primeiro), avisos de procedimento. 37 testes. |
| `src/pages/Inventory.jsx` | os 6 campos de limite do fabricante no **Avançado** do gabinete, com procedência. |
| `src/data/knowledge.js` | categoria **Estrutura** com 2 artigos (a conta + o checklist de montagem). |
| `src/services/reportContent.js` | **o texto do papel**, compartilhado pelos dois renderizadores: `rigCadeia()` (a cadeia pronta pra desenhar), `rigTextoAcima()`, os avisos, o checklist e o glossário novo (Ancoragem, Bumper, Talha, WLL). Testado em `reportContent.test.js`. |
| `ProjectRelatorio.jsx` + `pdf/pdfRelatorio.js` | a seção **"Peso e ancoragens"** nos dois cadernos (DOM e PDF nativo), tipos Completo e Estrutural. |
| `docs/rigging-pesquisa.md` | a pesquisa de base e a triagem da pesquisa paralela. |
| este arquivo | vocabulário, modelo, escopo, checklist de campo, fases, decisões. |

### Como mexer na seção sem quebrar o contrato

Ler §3 (escopo) e §4 (checklist) antes — são as regras que a seção obedece. E
mais quatro, que os testes de `reportContent.test.js` seguram:

1. **Ausência de dado nunca vira "ok".** Sem limite publicado a pílula é *não
   informado* (cinza), nunca *dentro*. Sem peso de gabinete os campos saem "—" e
   o total sai "(parcial)" — um `0 kg` num documento datado leria como fato.
2. **Texto novo entra em `reportContent.js`, não no renderizador.** São dois
   cadernos (DOM e PDF) desenhando a mesma coisa; texto duplicado diverge.
3. **A seção chama "Peso e ancoragens".** Nunca "Rigging" (prometeria
   engenharia), nunca "ponto" pra ancoragem — *ponto* é o ponto de talha que a
   produção entrega. Cor da disciplina: **Estrutura teal `#0f766e`**.
4. **No PDF, nada de `unbreakable`.** A cadeia flui entre páginas de propósito;
   bloco alto demais some no pdfmake (já aconteceu com a Screen 2).

### O que destrava o resto

- **Pesos reais** de bumper e fixação (balança de gancho) — hoje são placeholder
  marcados `estimado`, e o motor avisa.
- **Foto da etiqueta** de um gabinete YES TECH MG — resolve modelo, série e os
  limites de fabricante de uma vez, sem depender de garimpar PDF.
- **Mais itens de checklist** conforme ele for lembrando.
