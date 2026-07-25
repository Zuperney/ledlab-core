# Rigging — pesquisa de base (2026-07-25)

> Estudo que antecede a implementação. Objetivo: entender **como o mercado resolve
> isso**, **quais são as regras de cálculo reais** e **o que o LedLab pode afirmar
> sem mentir**. O espeque da fase (vocabulário, motor, plano) está em
> [`rigging-spec.md`](./rigging-spec.md).
>
> ⚠️ Nada aqui autoriza montagem. Carga suspensa é responsabilidade do **rigger
> habilitado** e, no Brasil, de **engenheiro com ART** (CONFEA). O app é
> planejamento de referência — mesma postura do box de segurança AC.

---

## 1 · Como o mercado resolve isso hoje

Existem **três camadas** de ferramenta, e elas não competem entre si:

| Camada | Exemplos | O que faz | O que custa |
| --- | --- | --- | --- |
| **Engenharia** | Vectorworks **Braceworks** | análise estrutural de verdade (núcleo FEA sobre truss/pipes, relatório exportável em DSTV pro engenheiro assinar) | caro, desktop, exige modelar o rig inteiro em 3D |
| **Calculadora de show** | Show Tech, Lumina, planilhas de locadora | soma peso, estima ferragem, sugere pontos | barato, mas **superficial e às vezes errado** |
| **Configurador de fabricante** | ROE Visual (calculadora de ballast), sistemas de ground support | responde só pelo produto da própria casa | não serve pro parque misto |

**O achado mais importante da camada do meio:** a calculadora de show mais
divulgada aplica *"5:1 mínimo para rigging aéreo"* **sobre o peso total** — no
exemplo dela, 561 kg de parede viram uma exigência de 2.805 kg de WLL. Isso é
**fator em cima de fator**: o WLL da talha e da manilha **já embute** o fator de
projeto do fabricante (5:1 nas correntes de elevação; 8:1 sob DIN 56950-1 /
EN 17206; 10:1 num hoist C1). Exigir WLL ≥ 5× a carga equivale a pedir 25:1 até a
ruptura. Não é conservador — é errado, e na prática o técnico ignora o número ou
compra motor que não precisa.

**A conta certa é direta: `carga no ponto ≤ WLL do elo mais fraco do ponto`.**
O LedLab já acertou isso por acidente no motor atual, e é a linha que separa a
gente da camada do meio.

---

## 2 · O que os fabricantes realmente publicam

Aqui está a descoberta que muda o modelo de dados: **cada fabricante expressa o
limite numa unidade diferente**. Um campo `maxRows` não dá conta.

| Fabricante | Como o limite é publicado | Valor encontrado |
| --- | --- | --- |
| **Absen** (PL V2) | **quantidade de painéis por barra de içamento** | 20 painéis de 500×500 mm · 10 painéis de 500×1000 mm por barra |
| **Absen** (AX) | barras em 2 tamanhos (0,61 m e 1,22 m) — mesma lógica da frota dele | — |
| **Unilumin** (UpadIV / UpadIV2) | **metros verticais**, e **diferente por modo de montagem** | **voado: ≤ 10 m** · **empilhado no chão: ≤ 6 m**; horizontal "não restrito" |
| **YES TECH** (MG7S) | **altura de içamento** | até 10 m |
| **YES TECH** (MG6S) | **regra de ferragem que muda com a altura** | < 8 gabinetes: 2 conectores C entre gabinetes · > 8 gabinetes: **3 conectores C** |

Quatro consequências práticas:

1. **O limite do fabricante quase nunca é sobre a talha** — é sobre a *trava entre
   gabinetes* e sobre a *barra*. Ou seja: a parede pode estar folgadíssima de
   motor e mesmo assim estar ilegal por empilhamento.
2. **"Por barra" ≠ "por coluna".** A Absen limita o **total de painéis pendurados
   na barra** (20 de 500×500 — numa barra de 1 m com 2 colunas, dá 10 de altura).
   Nosso motor hoje conta coluna; precisa contar **os dois**.
3. **Voado e empilhado têm limites diferentes** (Unilumin: 10 m × 6 m). Tratar
   como um número só é errado nos dois sentidos.
4. **Existe regra que muda a ferragem, não só o limite** (YES TECH: acima de 8 de
   altura, entra um terceiro conector). Isso não é um número — é um **aviso de
   procedimento**, e o Caderno é o lugar certo pra ele aparecer.

> ⚠️ Confiança dos números acima: **média-alta**. Vieram de manuais e spec sheets
> públicos, mas *por série*, e fabricante troca ferragem entre revisões. Nenhum
> desses valores deve entrar no catálogo certificado sem o PDF do modelo na mão —
> a mesma régua que a gente usou na auditoria de `pwrMax`.

---

## 3 · As regras de cálculo (o que é sólido)

### 3.1 Carga morta

```
carga da tela   = cols × rows × peso do gabinete
carga do ponto  = carga que a viga entrega ali + peso do bumper + acessórios
```
Regra de bolso da indústria pra fechar a conta quando falta dado: **ferragem ≈ 15%
do peso dos painéis, cabos ≈ 5%**. Serve como *sanity check* do nosso total, não
como substituto do peso real do bumper.

### 3.2 WLL — o fator de projeto já está lá dentro

- WLL = carga de trabalho **já dividida** pelo fator do fabricante.
- **Nunca** multiplicar a carga por 5 pra comparar com o WLL. **Nunca** passar do WLL.
- Fatores de referência (informativo, não pra multiplicar): corrente de elevação
  8:1 sob DIN 56950-1 / EN 17206 · hoist D8 ≈ 5:1 · **C1 = 10:1**.
- Estrutura de solo (torre/ballast) é outra história: aí o guia de mercado fala em
  **2:1 mínimo** — porque não é acessório certificado com WLL, é estrutura.

### 3.3 Talha manual — o caso da frota dele

A frota é **talha manual de 1 t**. Isso tem uma implicação que os apps não contam:

- As classificações **D8 / D8+ / C1 são de hoists elétricos**. Talha manual não
  tem D8+, então **não existe "essa talha é homologada pra ficar sobre gente"**.
- ASME B30.16 (que cobre talha de corrente manual) é explícito em excluir
  içamento de pessoas do escopo, e trata o fecho do gancho como **dispositivo
  secundário que não substitui a amarração**.
- Conclusão pro Caderno: com talha manual, **carga parada sobre público/artista
  pede secundário (aço de segurança) e decisão do rigger** — não é coisa que o app
  aprove. O app pode no máximo **lembrar** disso.

### 3.4 Distribuição entre pontos — onde quase todo mundo erra

- **2 pontos** numa viga: estaticamente determinado. Simétrico = 50/50; fora do
  centro, o ponto mais próximo do CG puxa mais.
- **3 ou mais pontos colineares numa viga rígida: estaticamente INDETERMINADO.**
  Não existe solução única sem conhecer a flexibilidade da viga. A prática de
  engenharia é **dimensionar pelo pior caso** — em içamento de 3 lingas, dimensiona-se
  como se **só duas** carregassem.
- Traduzindo pro nosso motor: **dividir o peso total pelo número de pontos é a
  conta errada**, e é exatamente a conta que a camada do meio faz. Nosso "pior
  caso com o bumper cheio" já é a postura certa; só precisa ficar explícito no
  relatório *por que* o número é maior que peso÷pontos.

### 3.5 O que trava primeiro (a cadeia)

Essa é a ideia central do produto. A parede tem uma **cadeia de elos**, e o app
deve dizer **qual elo trava primeiro**, não só cuspir um número:

```
gabinete/trava  →  bumper  →  ponto (talha, manilha, cinta)  →  truss/estrutura  →  chão
   (fabricante)    (fabricante)        (WLL)                    (tabela de vão)   (kg/m²)
```

Na prática, com painel leve e talha de 1 t, **o elo que trava é quase sempre o
primeiro (limite de empilhamento do fabricante) ou o penúltimo (point load do
truss)** — raramente a talha. Um app que só compara com a talha dá "tudo certo"
numa parede irregular.

Sobre o truss: as tabelas de vão dos fabricantes dão carga distribuída e **point
load** por vão, e uma parede de LED pendurada em 2-3 pontos é justamente point
load. Todo fabricante de truss carimba a mesma frase — *tabela é referência,
o plot tem que ser revisto por engenheiro*.

### 3.6 Ground support / empilhado

- Limite do fabricante em metros (Unilumin: **6 m**), quase sempre menor que o voado.
- Contrapeso: os manuais falam em **adicionar contrapeso (sacos de areia) na viga
  de base conforme a condição do local** — ou seja, não existe fórmula fechada
  publicada; existe cálculo de tombamento que depende de vento e piso.
- Vento é o que domina em área externa (pressão básica regional, coeficiente de
  forma ≈ +0,8 na face windward, altura). **Fora do escopo do app** — é conta de
  engenheiro com norma local.
- ROE Visual mantém uma **calculadora de ballast** própria: prova de que até
  fabricante trata isso como ferramenta separada e assistida.

---

## 4 · Proposta de aplicação no LedLab

### 4.1 Princípio: dado com procedência, não chute

O app **não inventa limite de fabricante**. Cada campo de rigging do gabinete
carrega de onde veio e se foi conferido:

```js
rigging: {
  voadoMaxM: 10,          // altura máx. voada, em metros
  voadoMaxQtd: null,      // ou em gabinetes, quando o manual fala assim
  empilhadoMaxM: 6,       // ground stack (quase sempre menor que o voado)
  porBarraMaxQtd: 20,     // painéis por barra de içamento (limite da Absen)
  travaExtraAcima: 8,     // "acima de N de altura, entra conector extra" (YES TECH)
  fonte: "Manual UpadIV v1.0, cap. 2.2",
  conferido: true,        // false = veio de brochura/revenda
}
```

**Sem dado → o app não estima.** Ele diz *"o fabricante não publica limite de
empilhamento pra este gabinete — confirme no manual"* e segue calculando só o que
sabe (peso e carga por ponto). Isso é a diferença entre uma ferramenta que o
técnico confia e uma que ele aprende a ignorar. Mesma escolha que a gente já fez
no elétrico ao não inflar `pwrMax`.

### 4.2 A saída: cadeia de verificação, não um número

Por Screen/tela, o Caderno mostra:

1. **Peso** — por coluna, por tela, total do projeto (em kg e t).
2. **Bumpers e pontos** — quantos, e a carga **no pior ponto** (com a nota de que
   não é peso÷pontos, e por quê).
3. **Talha** — carga vs WLL em %, com o mesmo semáforo do elétrico
   (**>80% laranja, >100% vermelho**).
4. **Limite do fabricante** — ✅ dentro / ⚠️ sem dado / 🔴 acima, **por modo**
   (voado × empilhado), citando a fonte.
5. **Avisos de procedimento** — o conector extra acima de N de altura, o
   secundário com talha manual, o "confira o point load do truss com a produção".
6. **Box de segurança** — rigger habilitado + ART, gêmeo do box AC.

### 4.3 Fases revisadas (substituem R1–R5 do espeque)

| Fase | Entrega | Trava |
| --- | --- | --- |
| **R1** | campos de rigging no gabinete **com procedência** + UI de preenchimento na biblioteca pessoal | Q5 (seed × pessoal) |
| **R2** | motor: cadeia de verificação (limite do fabricante por modo, por barra e por coluna) — hoje ele só olha a talha | R1 |
| **R3** | seção **Rigging** no Caderno Técnico + PDF | Q2a/Q2b/Q4 |
| **R4** | painel no app (ajuste de bumper/fixação/pontos por Screen) | R3 |
| **R5** | empilhado/ground: limite em metros + lembrete de contrapeso (**sem** cálculo de vento) | R2 |
| **R6** | pitch × distância no Aspect Ratio (independente, pode furar fila) | — |

### 4.4 O que o app NUNCA vai fazer

Isto entra no espeque como regra dura, do mesmo naipe do "nunca somar fator em
cima do WLL":

- dimensionar truss ou estrutura;
- calcular vento, ballast ou tombamento;
- dizer que uma montagem está **aprovada**, ou que pode ficar sobre pessoas;
- substituir o rigger habilitado / a ART do engenheiro.

O verbo do app é **"confira"**, nunca **"pode"**.

---

## 5 · Perguntas que a pesquisa levantou

Anotadas pra você responder quando der — separadas das 5 do espeque §6.

**Sobre os dados de fabricante (travam a R1):**
1. Você tem os **manuais em PDF** dos gabinetes que roda (Absen, YES TECH, Unilumin)?
   Sem eles, os campos de limite nascem vazios — o que é honesto, mas o app fica mudo
   justo na parte nova.
2. Os seus bumpers de 50/100 cm são **genéricos da casa** ou barras **do fabricante
   do painel**? Isso importa: o "20 painéis por barra" da Absen é da barra Absen. Com
   barra genérica, o limite publicado do fabricante do painel **não se aplica** — e aí
   quem responde pela viga é quem a fabricou.

**Sobre a prática de campo:**
3. Qual a **altura máxima** que você costuma voar (em gabinetes) e empilhar? Quero saber
   se o limite de 6 m empilhado é uma restrição real no seu dia a dia ou folga.
4. As suas paredes ficam **sobre público ou artista**? Com talha manual isso mexe no
   texto do Caderno (secundário/aço de segurança).
5. Você usa **aço de segurança / secundário** hoje nas paredes voadas?

**Sobre o produto:**
6. Quando não houver dado do fabricante, prefere o app **mudo com aviso** (minha
   recomendação) ou um **padrão conservador** assumido? O padrão conservador é mais
   confortável e mais perigoso.
7. O app deve perguntar a **estrutura** (tipo de truss e vão) pra alertar sobre point
   load, ou isso é papel da produção/rigger e a gente só imprime o lembrete?

---

## 6 · Fontes

- Absen — [PL V2 Series (manual/specs)](https://www.absen.com/product/pl-v2-series/) · [PL V2 no Manuals+](https://manuals.plus/absen/pl-v2-series-outdoor-led-psco-rental-manual) · [AX Series, cap. Hanging Bar](https://www.manualslib.com/manual/1959631/Absen-Ax-Series.html?page=16)
- Unilumin — [UpadIV, manual do produto (PDF)](https://impact-even.com/userfiles/files/telechargement/video/unilumin_upadiv_manuel.pdf) · [UpadIV2 no ManualsLib](https://www.manualslib.com/manual/2591691/Unilumin-Upadiv2.html) · [métodos de montagem](https://www.unilumin.com/blog/led-wall-mounting.html)
- YES TECH — [MG7S](https://www.yes-led.com/product/rental-staging/mg7s-series.html) · [MG6S, manual (PDF)](https://audioeffetti.com/product/documents/YES/P1.9MG6SI21-01.pdf)
- Software — [Vectorworks Braceworks](https://www.vectorworks.net/en-US/braceworks) · [conceito da análise estrutural](https://app-help.vectorworks.net/2024/eng/VW2024_Guide/Braceworks/Concept_Braceworks_structural_analysis.htm) · [Show Tech, guia de cálculos](https://www.showtechapp.com/guides/led-video-wall-calculations) · [Show Tech, calculadora de peso/rigging](https://www.showtechapp.com/calculators/led-weight-rigging) · [ROE Visual, calculadora de ballast](https://www.roevisual.com/news/news-blog/build-your-led-screen-safe-using-the-roe-visual-ballast-calculator.html)
- Normas e prática — [ANSI ES1.18 Event Safety – Rigging](https://static1.squarespace.com/static/6154c1e0c2f7b519ccf2e2a9/t/649dc23552394e751859ea33/1688060472871/ANSI+ES1.18+-+2022+Event+Safety+-+Rigging.pdf) · [ANSI E1.6-1 Powered Hoist Systems](https://www.sapsis-rigging.com/Tech/standards/E1-6-1_2012.pdf) · [D8 × D8+ × C1](https://www.glowchaser.com/blog/d8-d8plus-c1-hoist-differences/) · [BGV overview (Hall Stage)](https://hallstage.com/wp-content/uploads/BGV-Overview.pdf) · [ASME B30.16 (talha manual)](https://www.asme.org/codes-standards/find-codes-standards/b30-16-overhead-underhung-stationary-hoists) · [prática de talha manual](https://riggingresource.com/manual-hoists/)
- Estrutura — [Global Truss F34, tabelas de vão (PDF)](https://www.globaltruss.com/pub/media/categorycustomlink/pdf/F34_Truss_Load_Span_Tables.pdf) · [guia de tabelas de carga XSF](https://www.xsftruss.com/load-table-and-ratings-guide/) · [distribuição em içamento multiponto](https://www.eng-tips.com/threads/load-distribution-in-multipoint-rigging-using-lifting-beam.470019/)
- Brasil — [CONFEA, estruturas para eventos temporários (PDF)](https://www.confea.org.br/midias/uploads-imce/CONTECC2025/CIV/ESTRUTURAS_PARA_EVENTOS_TEMPOR%C3%81RIOS_UM_OLHAR_T%C3%89CNICO.pdf) · [CONFEA, diretrizes de responsabilidade técnica (PDF)](https://www.confea.org.br/midias/uploads-imce/DIRETRIZES%20SOBRE%20AS%20ATIVIDADES%20T%C3%89CNICAS%20DE%20ENGENHARIA%20EM%20EVENTOS%20TEMPOR%C3%81RIOS%20E%20A%20FORMALIZA%C3%87%C3%83O%20DE%20SUAS%20RESPONSABILIDADES.pdf)
