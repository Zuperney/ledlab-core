# Rigging — pesquisa de base (2026-07-25)

> Estudo que antecede a implementação. Objetivo: entender **como o mercado resolve
> isso**, **quais são as regras de cálculo reais** e **o que o LedLab pode afirmar
> sem mentir**. O espeque da fase (vocabulário, motor, plano) está em
> [`rigging-spec.md`](./rigging-spec.md).
>
> Inclui o cruzamento com uma **pesquisa paralela feita no Gemini** pelo dono
> (§6): o que foi aceito, o que foi rejeitado e por quê.
>
> 📖 **Vocabulário:** este documento cita o mercado, que fala em *"ponto"* (point
> load, hoist point). No **nosso** produto isso se chama **ancoragem** — o que a viga
> oferece pra pendurar. "Ponto" fica reservado ao ponto de talha da produção, que o
> app não calcula. Ver [`rigging-spec.md`](./rigging-spec.md) §1.
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

> Esse mesmo erro apareceu, com outras palavras, na pesquisa paralela do Gemini
> ("um ponto que sofre 200 kg exige manilha e motor de 1.000 kg de WLL"). Dois
> achados independentes com o mesmo vício = é o consenso errado do mercado, não um
> deslize isolado. Ver §6.

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
   gabinetes* (os *fast-locks*) e sobre a *barra*. Ou seja: a parede pode estar
   folgadíssima de motor e mesmo assim estar ilegal por empilhamento.
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
carga da ancoragem = carga que a viga entrega ali + peso do bumper + acessórios
```
Regra de bolso da indústria pra fechar a conta quando falta dado: **ferragem ≈ 15%
do peso dos painéis, cabos ≈ 5%**. Serve como *sanity check* do nosso total, não
como substituto do peso real do bumper — **e nunca somada por cima dos pesos
reais**, senão é a mesma dupla contagem do fator de segurança.

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

### 3.5 Ângulo — o multiplicador que faltava no nosso motor

Enquanto a talha está **a prumo** sobre o ponto do bumper, a carga no cabo é a
carga vertical. Assim que o cabo sai da vertical — bridle pra desviar de uma
perna de truss, ponto que não fica em cima do bumper, tela inclinada —, a força
no cabo cresce por `1/cos(θ)`:

```
carga no cabo = carga vertical ÷ cos(θ)        θ = ângulo em relação à VERTICAL
```

| Ângulo (da vertical) | Multiplicador | Leitura |
| --- | --- | --- |
| 0° (a prumo) | **1,00×** | ideal — é o nosso caso hoje |
| 30° | 1,15× | aceitável |
| 45° | **1,41×** | limite prático da indústria |
| 60° | **2,00×** | dobra a carga — evitar |

É trigonometria simples e **está correta**. Vale registrar porque hoje o motor
assume implicitamente 0° sem dizer isso em lugar nenhum — o que é uma premissa
escondida, exatamente o tipo de coisa que a gente não deixa passar no elétrico.
Mínimo aceitável: o Caderno **declarar a premissa** ("cálculo assume içamento a
prumo"). Ideal (R4): campo de ângulo por Screen, com o multiplicador aplicado e
alerta acima de 45°.

### 3.6 O que trava primeiro (a cadeia)

Essa é a ideia central do produto. A parede tem uma **cadeia de elos**, e o app
deve dizer **qual elo trava primeiro**, não só cuspir um número:

```
gabinete/trava  →  bumper  →  ancoragem (talha, manilha, cinta)  →  truss/estrut.  →  chão
   (fabricante)    (fabricante)        (WLL)                    (tabela de vão)   (kg/m²)
```

Na prática, com painel leve e talha de 1 t, **o elo que trava é quase sempre o
primeiro (limite de empilhamento do fabricante) ou o penúltimo (point load do
truss)** — raramente a talha. Um app que só compara com a talha dá "tudo certo"
numa parede irregular.

Sobre o truss: as tabelas de vão dos fabricantes dão carga distribuída (UDL) e
**point load** por vão, e uma parede de LED pendurada em 2-3 pontos é justamente
point load. Todo fabricante de truss carimba a mesma frase — *tabela é referência,
o plot tem que ser revisto por engenheiro*.

### 3.7 Ground support / empilhado

- Limite do fabricante em metros (Unilumin: **6 m**), quase sempre menor que o voado.
- Contrapeso: os manuais falam em **adicionar contrapeso (sacos de areia) na viga
  de base conforme a condição do local** — ou seja, não existe fórmula fechada
  publicada; existe cálculo de tombamento que depende de vento, piso e geometria
  real da base (§4).
- ROE Visual mantém uma **calculadora de ballast** própria: prova de que até
  fabricante trata isso como ferramenta separada e assistida.

---

## 4 · Vento, tombamento e estaiamento — a matemática da fase R5+

> Registrado agora porque a pesquisa paralela trouxe as fórmulas certas, **mas
> nada disto vira número no app tão cedo** (ver a ressalva no fim da seção).

### 4.1 Força do vento

```
F = A · q · Cf                    q = 0,5 · ρ · v²  ≈  0,6125 · v²   (ρ = 1,225 kg/m³)
```
`F` em newtons · `A` = área frontal (m²) · `q` = pressão dinâmica (Pa) · `v` em m/s
· `Cf` = coeficiente de forma/permeabilidade. Base física do Eurocode EN 1991-1-4 /
ASCE 7. Para kgf: `F ÷ 9,81`.

### 4.2 Cf — permeabilidade (e a armadilha)

Painel sólido é **vela de barco**; painel vazado (*blow-through*) deixa o ar passar.

| Tipo | Transparência | Cf estimado |
| --- | --- | --- |
| Sólido (padrão) | 0% | 1,2 – 1,3 |
| Vazado (touring) | ~10–15% | 0,8 – 1,0 |
| Mesh | > 30% | 0,4 – 0,6 |

**Armadilha:** 20% de transparência **não** reduz 20% da força — a turbulência na
grade segura a resistência lá em cima. Ou se usa o Cf publicado pelo fabricante
(a ROE publica nos manuais das séries CB/Vanish), ou se trava **1,3 conservador**.
Esses valores da tabela são **estimativas de ordem de grandeza**, não dado de
datasheet — tratar como tal.

### 4.3 Tombamento (ground support)

```
Momento de tombamento   Mt = F · Hcg          (Hcg = altura do centro da tela)
Momento resistente      Mr = (peso próprio + lastro) · braço da base
Critério                Mr ≥ Mt × FS          FS ≥ 1,5
```

### 4.4 Estaiamento (cabo de aço + catraca) — e o perigo silencioso

Trocar lastro por estai resolve logística e cria um risco novo: a catraca não só
puxa a torre pra trás, ela **puxa pra baixo**, e a torre pode flambar.

```
θ = arctan(Hestai / Dbase)            ângulo do cabo com o CHÃO
Tx = F · (Hcg / Hestai)               força horizontal exigida na ancoragem
T  = Tx / cos(θ)                      tração real no cabo → dita o WLL da catraca
Fcomp = T · sen(θ)                    COMPRESSÃO que desce pela torre
```
`Fcomp + peso da tela` não pode passar da **carga axial admissível** da torre.
Quanto **mais perto** a âncora fica da base, maior o ângulo e maior o esmagamento
— o alerta prático é **ângulo > 60° = afastar a âncora**. A matemática confere.

### 4.5 Ressalva — por que isto NÃO vira número no app agora

As fórmulas estão certas, mas o resultado depende de **geometria e dados que o app
não tem**: peso próprio e braço real da base, tipo/estado do piso, ancoragem
disponível, carga axial admissível da torre, e a velocidade de vento de projeto
(que é dado normativo regional, não escolha do técnico). Cuspir "você precisa de
X kg de lastro" com essas lacunas é pior do que não dizer nada — o número parece
laudo e não é.

O que o app **pode** fazer na R5, sem mentir: mostrar a **área de vela** da tela
(A) e a força estimada por faixa de vento, como *ordem de grandeza*, e imprimir o
**plano operacional por faixa** (semáforo abaixo), deixando lastro e estai
explicitamente para o engenheiro.

Semáforo operacional de vento (prática de mercado, **não** norma):
**verde < 15 m/s** operação normal · **amarelo 15–20 m/s** preparar equipe para
baixar, retirar backdrops sólidos ao redor · **vermelho > 20 m/s** baixar.
Os limiares reais saem do laudo do evento — o app apresenta como *padrão editável*.

---

## 5 · Proposta de aplicação no LedLab

### 5.1 Princípio: dado com procedência, não chute

O app **não inventa limite de fabricante**. Cada campo de rigging do gabinete
carrega de onde veio e se foi conferido:

```js
rigging: {
  voadoMaxM: 10,          // altura máx. voada, em metros
  voadoMaxQtd: null,      // ou em gabinetes, quando o manual fala assim
  empilhadoMaxM: 6,       // ground stack (quase sempre menor que o voado)
  porBarraMaxQtd: 20,     // painéis por barra de içamento (limite da Absen)
  travaExtraAcima: 8,     // "acima de N de altura, entra conector extra" (YES TECH)
  cfVento: 1.3,           // coeficiente de forma (só relevante em outdoor/R5)
  fonte: "Manual UpadIV v1.0, cap. 2.2",
  conferido: true,        // false = veio de brochura/revenda
}
```

**Sem dado → o app não estima.** Ele diz *"o fabricante não publica limite de
empilhamento pra este gabinete — confirme no manual"* e segue calculando só o que
sabe (peso e carga por ancoragem). Isso é a diferença entre uma ferramenta que o
técnico confia e uma que ele aprende a ignorar. Mesma escolha que a gente já fez
no elétrico ao não inflar `pwrMax`.

### 5.2 A saída: cadeia de verificação, não um número

Por Screen/tela, o Caderno mostra:

1. **Peso** — por coluna, por tela, total do projeto (em kg e t).
2. **Bumpers e ancoragens** — quantos, e a carga **na pior ancoragem** (com a nota
   de que não é peso÷ancoragens, e por quê).
3. **Talha** — carga vs WLL em %, com o mesmo semáforo do elétrico
   (**>80% laranja, >100% vermelho**).
4. **Premissa do ângulo** — declarada ("içamento a prumo"), e aplicada quando o
   técnico informar o ângulo.
5. **Limite do fabricante** — ✅ dentro / ⚠️ sem dado / 🔴 acima, **por modo**
   (voado × empilhado), citando a fonte.
6. **Avisos de procedimento** — o conector extra acima de N de altura, o
   secundário com talha manual, o "confira o point load do truss com a produção".
7. **Box de segurança** — rigger habilitado + ART, gêmeo do box AC.

### 5.3 Fases revisadas (substituem R1–R5 do espeque)

| Fase | Entrega | Trava |
| --- | --- | --- |
| **R1** | campos de rigging no gabinete **com procedência** + UI de preenchimento na biblioteca pessoal | Q5 (seed × pessoal) |
| **R2** | motor: cadeia de verificação (limite do fabricante por modo, por barra e por coluna) — hoje ele só olha a talha | R1 |
| **R3** | seção **Rigging** no Caderno Técnico + PDF | Q2a/Q2b/Q4 |
| **R4** | painel no app (bumper/fixação/ancoragens/**ângulo** por Screen) | R3 |
| **R5** | empilhado/ground: limite em metros, área de vela + semáforo de vento, lembrete de contrapeso (**sem** número de lastro) | R2 |
| **R6** | pitch × distância no Aspect Ratio (independente, pode furar fila) | — |

### 5.4 O que o app NUNCA vai fazer

Isto entra no espeque como regra dura, do mesmo naipe do "nunca somar fator em
cima do WLL":

- dimensionar truss ou estrutura;
- **entregar quilos de lastro, tração de catraca ou compressão de torre como
  resultado** (as fórmulas estão na §4 para estudo, não para virar laudo);
- dizer que uma montagem está **aprovada**, ou que pode ficar sobre pessoas;
- substituir o rigger habilitado / a ART do engenheiro.

O verbo do app é **"confira"**, nunca **"pode"**.

---

## 6 · Cruzamento com a pesquisa paralela (Gemini, 25/07)

O dono rodou uma pesquisa em paralelo. Triagem item a item:

### ✅ Aceito e incorporado

| Item | Onde entrou | Comentário |
| --- | --- | --- |
| **Multiplicador de ângulo** `1/cos θ` (0°=1,00 · 30°=1,15 · 45°=1,41 · 60°=2,00) | §3.5 | Conferido — a trigonometria está certa. Era um **buraco real** no nosso motor, que assume prumo sem declarar. |
| **`max_hang_qty` = limite dos fast-locks**, não da talha | §2 | Bate com o que os manuais mostram; reforça a tese da cadeia de elos. |
| **Fórmula de vento** `F = A·q·Cf`, `q ≈ 0,6125·v²` | §4.1 | Física correta (Eurocode/ASCE). |
| **Cf / permeabilidade** + o alerta "20% de transparência ≠ −20% de força" | §4.2 | Conceito válido e bem colocado; os valores da tabela são ordem de grandeza. |
| **Momento de tombamento** `Mt = F·Hcg`, FS ≥ 1,5 | §4.3 | Correto como conceito. |
| **Estaiamento e compressão na torre** (`T = Tx/cos θ`, `Fcomp = T·sen θ`) | §4.4 | Matemática internamente consistente e conferida. A sacada da **flambagem por estai curto** é boa e não estava na minha pesquisa. |
| **Semáforo operacional de vento** (verde/amarelo/vermelho) | §4.5 | Casa com a gramática de tom que o app já usa no elétrico. |
| **ANSI E1.21** (estruturas temporárias outdoor) | §7 | Norma pertinente que eu não tinha listado. |

### ❌ Rejeitado (e por quê)

| Item | Por que não entra |
| --- | --- |
| **"Ponto sofre 200 kg → manilha e motor de 1.000 kg de WLL" (5:1 sobre a carga)** | **Fator sobre fator.** O WLL já embute o fator de projeto do fabricante; exigir WLL 5× a carga pede ~25:1 até a ruptura. É o mesmo erro da Show Tech (§1) e levaria a comprar talha de 1 t pra 200 kg. **A conta é `carga ≤ WLL`.** |
| **"10:1 quando suspenso acima do público"** | Mesma confusão: 10:1 é o **fator de projeto de um hoist C1**, característica do equipamento — não um multiplicador a aplicar na carga. |
| **Somar 15–20% automaticamente ao peso** | Válido só como estimativa **quando falta dado**. Nós temos (ou teremos) o peso real do bumper e dos acessórios — somar os dois é dupla contagem. Fica como *sanity check* (§3.1). |
| **A função JS `calcularVentoELastro`** | Tem `distanciaPivoBase = 1.0` **fixo**, ignora o peso próprio da estrutura e usa FS 1:1 "simplificado". Isso **subestima o lastro** — é a direção perigosa do erro. Código não aproveitável. |
| **"Novastar" listada como fabricante de painel** | Novastar faz controladora/receiving card. No nosso catálogo isso já está separado; importar essa confusão bagunçaria a Gestão de Equipamentos. |
| **Peso do CB5 como 14,5 kg** | Nosso valor auditado em datasheet é **13,5 kg**. Mantém o nosso. |

**Padrão que os dois lados revelam:** o erro de fator-sobre-fator aparece em fonte
independente, com palavras diferentes. Não é deslize de um app — é o **consenso
errado do mercado**. Vale um parágrafo no Caderno explicando por que o nosso
número é menor que o da planilha da locadora; senão o técnico acha que o app está
"folgado" e desconfia da ferramenta certa.

---

## 7 · Perguntas que a pesquisa levantou

Anotadas pra responder quando der — separadas das 5 do espeque §6.

**Sobre os dados de fabricante (travam a R1):**

1. 🔴 **Ele não tem os manuais** (respondido 25/07). Então a R1 muda de forma: em vez
   de "campo pra ele preencher", vira **eu caçar os manuais públicos e popular o seed
   certificado com procedência** — igual fizemos com `pwrMax`. Pra isso preciso saber
   **quais modelos ele realmente voa** (a biblioteca-semente tem 16, mas a frota real
   é menor).
2. Os bumpers de 50/100 cm são **genéricos da casa** ou barras **do fabricante do
   painel**? Importa: o "20 painéis por barra" é da barra **Absen**. Com viga genérica,
   o limite publicado do fabricante do painel **não se aplica** — e aí quem responde
   pela viga é quem a fabricou (que talvez não publique nada).

**Sobre a prática de campo:**

3. Qual a **altura máxima** que ele costuma voar e empilhar (em gabinetes)? Quero saber
   se o limite de 6 m empilhado é restrição real no dia a dia ou folga.
4. As paredes ficam **sobre público ou artista**? Com talha manual isso muda o texto
   do Caderno (secundário/aço de segurança).
5. Ele usa **aço de segurança / secundário** hoje nas paredes voadas?
6. O içamento é sempre **a prumo**, ou ele usa bridle/desvio? (Define se o ângulo da
   §3.5 vira campo ou só premissa declarada.)

**Sobre o produto:**

7. Sem dado de fabricante, prefere o app **mudo com aviso** (minha recomendação) ou um
   **padrão conservador** assumido? O conservador é mais confortável e mais perigoso.
8. O app deve perguntar a **estrutura** (tipo de truss e vão) pra alertar sobre point
   load, ou isso é papel da produção/rigger e a gente só imprime o lembrete?

---

## 8 · Fontes

- Absen — [PL V2 Series (manual/specs)](https://www.absen.com/product/pl-v2-series/) · [PL V2 no Manuals+](https://manuals.plus/absen/pl-v2-series-outdoor-led-psco-rental-manual) · [AX Series, cap. Hanging Bar](https://www.manualslib.com/manual/1959631/Absen-Ax-Series.html?page=16)
- Unilumin — [UpadIV, manual do produto (PDF)](https://impact-even.com/userfiles/files/telechargement/video/unilumin_upadiv_manuel.pdf) · [UpadIV2 no ManualsLib](https://www.manualslib.com/manual/2591691/Unilumin-Upadiv2.html) · [métodos de montagem](https://www.unilumin.com/blog/led-wall-mounting.html)
- YES TECH — [MG7S](https://www.yes-led.com/product/rental-staging/mg7s-series.html) · [MG6S, manual (PDF)](https://audioeffetti.com/product/documents/YES/P1.9MG6SI21-01.pdf)
- Software — [Vectorworks Braceworks](https://www.vectorworks.net/en-US/braceworks) · [conceito da análise estrutural](https://app-help.vectorworks.net/2024/eng/VW2024_Guide/Braceworks/Concept_Braceworks_structural_analysis.htm) · [Show Tech, guia de cálculos](https://www.showtechapp.com/guides/led-video-wall-calculations) · [Show Tech, calculadora de peso/rigging](https://www.showtechapp.com/calculators/led-weight-rigging) · [ROE Visual, calculadora de ballast](https://www.roevisual.com/news/news-blog/build-your-led-screen-safe-using-the-roe-visual-ballast-calculator.html)
- Normas e prática — [ANSI ES1.18 Event Safety – Rigging](https://static1.squarespace.com/static/6154c1e0c2f7b519ccf2e2a9/t/649dc23552394e751859ea33/1688060472871/ANSI+ES1.18+-+2022+Event+Safety+-+Rigging.pdf) · [ANSI E1.6-1 Powered Hoist Systems](https://www.sapsis-rigging.com/Tech/standards/E1-6-1_2012.pdf) · **ANSI E1.21** (estruturas temporárias p/ eventos outdoor — indicada pela pesquisa paralela, ainda não lida) · [D8 × D8+ × C1](https://www.glowchaser.com/blog/d8-d8plus-c1-hoist-differences/) · [BGV overview (Hall Stage)](https://hallstage.com/wp-content/uploads/BGV-Overview.pdf) · [ASME B30.16 (talha manual)](https://www.asme.org/codes-standards/find-codes-standards/b30-16-overhead-underhung-stationary-hoists) · [prática de talha manual](https://riggingresource.com/manual-hoists/)
- Vento — EN 1991-1-4 (Eurocode 1, ações do vento) · ASCE 7 · [cálculo de carga de vento em LED outdoor](https://sightled.com/outdoor-led-screen-load-calculation-and-structural-safety-design/)
- Estrutura — [Global Truss F34, tabelas de vão (PDF)](https://www.globaltruss.com/pub/media/categorycustomlink/pdf/F34_Truss_Load_Span_Tables.pdf) · [guia de tabelas de carga XSF](https://www.xsftruss.com/load-table-and-ratings-guide/) · [distribuição em içamento multiponto](https://www.eng-tips.com/threads/load-distribution-in-multipoint-rigging-using-lifting-beam.470019/)
- Brasil — [CONFEA, estruturas para eventos temporários (PDF)](https://www.confea.org.br/midias/uploads-imce/CONTECC2025/CIV/ESTRUTURAS_PARA_EVENTOS_TEMPOR%C3%81RIOS_UM_OLHAR_T%C3%89CNICO.pdf) · [CONFEA, diretrizes de responsabilidade técnica (PDF)](https://www.confea.org.br/midias/uploads-imce/DIRETRIZES%20SOBRE%20AS%20ATIVIDADES%20T%C3%89CNICAS%20DE%20ENGENHARIA%20EM%20EVENTOS%20TEMPOR%C3%81RIOS%20E%20A%20FORMALIZA%C3%87%C3%83O%20DE%20SUAS%20RESPONSABILIDADES.pdf)
- Pesquisa paralela — [conversa no Gemini (25/07/2026)](https://gemini.google.com/share/299e27dc3254) — triada na §6
