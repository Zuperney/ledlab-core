# Estrutura 3D — espeque da fase

> **Status: E0 a E3 ENTREGUES (2026-08-19), na branch `feat/estrutura-3d`.**
> Motor puro em `src/services/estrutura/`, cena em `src/vista3d/`, a aba
> Estrutura montando de verdade e a **folha ESTRUTURA no Caderno e no PDF** —
> lista de peças, peso, medidas, ferragem e a vista 3D capturada. 626 testes.
> A próxima é a **E4** (os painéis pendurados na estrutura).
>
> 📚 **Base de pesquisa:** [`estrutura3d-pesquisa.md`](./estrutura3d-pesquisa.md) —
> dissecação do TrussTool, mercado, stack medida e os dados reais do truss
> brasileiro. **Leia antes de mexer no motor.**
>
> 🧊 **Destrava o rigging.** O [`rigging-spec.md`](./rigging-spec.md) foi reservado
> em 08/2026 esperando "o 3D entrar". É este documento.
>
> ⚠️ **Segurança:** o app **não dimensiona estrutura**. Ele registra o que foi
> montado, com que peças e quanto pesa. Quem responde por carga é o **rigger
> habilitado** e o **engenheiro com ART no CREA**. Mesma postura do box de
> segurança AC do Caderno.

---

## 1 · O que é — e o que não é

**É** um montador de box truss em 3D que produz **três artefatos**: a **lista de
peças**, o **peso** e as **medidas reais** da estrutura. Depois disso, ele deixa
**pendurar as telas do projeto** na estrutura montada.

**Não é** calculadora estrutural. Não diz se aguenta, não dimensiona vão, não
sugere ponto de talha, não emite laudo.

**Por que essa fronteira é a certa:** a referência do dono, o TrussTool, também
não calcula nada — e é a ferramenta mais usada da categoria. O TAFtool, idem.
Quem calcula é o Braceworks, a US$ 2.530/ano, e mesmo ele avisa na própria
landing que **não fornece cálculo certificado**. E no Brasil **nenhum fabricante
publica tabela de carga digitalizada** — inclusive a Feeling, que publicou em 2002
e hoje manda consultar o comercial. Inventar número aqui seria o pior tipo de
mentira: a que parece laudo.

**O verbo do app é "confira", nunca "pode".**

---

## 2 · Vocabulário (entra no §12.1 do manual)

| Termo | O que é |
| --- | --- |
| **Estrutura** | a montagem inteira de um projeto (o que o TrussTool chama de *construction*) |
| **Peça** | uma unidade do catálogo colocada na cena — barra, cubo ou base |
| **Barra** | o segmento reto de box truss. **Nunca "torre"** — a Feeling chama a barra de "torre", mas no app *torre* é uma montagem vertical, não uma peça |
| **Cubo** | o bloco de canto. Um cubo de N faces resolve L, T, X e cruz — não existe "canto soldado" no nosso catálogo |
| **Base** | a chapa/quadro de apoio no chão. **Com sapata** ou **sem sapata** (a Feeling tem as duas) |
| **Encaixe** | a junção de duas peças. **Uma junta = 4 parafusos**, um por banzo |
| **Conector** | a face de acoplamento de uma peça — onde ela aceita encaixe. É o que o motor conta |
| **Banzo** | o tubo principal (2" no P30 e no P50). Quatro por peça |
| **Linha** | P30 · L30 · R30 · P50 — a família do fabricante. **Não é a medida** |
| **Sistema** | a seção: **300** (P30/L30/R30) ou **500** (P50). É o que define se encaixa |

⚠️ **A distinção linha × sistema é a regra mais importante do catálogo.** L30, P30
e R30 são todos 300×300 e **encaixam entre si** (a Feeling vende a mesma base e o
mesmo sleeve block pras três) — mas a L30 vale **metade da carga** da P30 e a R30
é treliçada em 3 faces. Um app que só guardasse "300×300" deixaria o técnico
misturar leve com pesado sem perceber. **O relatório diz a linha de cada barra.**

---

## 3 · O escopo cravado (decisões do dono, 19/08/2026)

| Decisão | O que fica |
| --- | --- |
| **Fabricante de referência** | **Feeling** — é com quem ele trabalha e tem estoque |
| **Sistemas** | **só 300 (P30)** — o dono não tem P50. O campo `sistema` fica no modelo de dados (§3.2.2), o catálogo não |
| **Peças** | **barra reta · cubo (300³) · sapata em dois modelos (baixa e alta, 750×750)**. Mais **parafusaria** como item de lista |
| **Medidas** | **nominais e fechadas** — 2 m é 2000 mm. O modelo SketchUp ensina a *forma*, não a *cota* (§5.3) |
| **Peso** | proxy da Auratec até o dono pesar na balança, **peça por peça, com os parafusos incluídos** |
| **Sem** | curva, arco, círculo, cumeeira, dobradiça, sleeve block, pau de carga — nada disso na v1 |
| **Fixação** | **parafuso**, não spigot cônico. Junta = 4× parafuso 5/8" A325 CH27 + 4× porca A194-2H + 8× arruela F-436 |
| **Entrega essencial** | **lista de peças + peso + medidas reais** |
| **Depois** | pendurar os painéis de LED |
| **Plataforma** | **desktop-only.** "É horrível fazer isso no celular, eu já tentei usar o TrussTool no celular e não foi uma boa experiência" |
| **Carga** | **fora.** Nenhum número de carga sem a revisão atual confirmada pela Feeling |

### 3.1 Por que o cubo mata o catálogo de cantos

O TrussTool tem uma categoria `CORNERS` inteira porque a Global Truss vende canto
soldado em 7 ângulos. **A Feeling vende cubo** — e um cubo de 5 ou 6 faces
resolve L, T, X, cruz e virada pra cima com **uma peça só**. Isso não é
simplificação de preguiça: é como o mercado brasileiro monta.

No motor, o cubo é a peça mais simples que existe: um bloco de 300³ (ou 500³) com
um conector por face.

### 3.2 O catálogo v1 — o galpão do dono (cravado 19/08)

**Dez itens. É o catálogo inteiro.** Não é o catálogo da Feeling — é o estoque real.

| id | Peça | Medida | Peso semente (kg) | Fonte do peso |
| --- | --- | --- | --- | --- |
| `p30-b0200` | Barra P30 0,2 m | 200 mm | 6 | Auratec |
| `p30-b0300` | Barra P30 0,3 m | 300 mm | 7 | 🔺 interpolado |
| `p30-b0500` | Barra P30 0,5 m | 500 mm | 10 | Auratec |
| `p30-b0600` | Barra P30 0,6 m | 600 mm | 11 | 🔺 interpolado |
| `p30-b1000` | Barra P30 1 m | 1000 mm | 13 | Auratec |
| `p30-b2000` | Barra P30 2 m | 2000 mm | 22 | Auratec |
| `p30-b3000` | Barra P30 3 m | 3000 mm | 30 | Auratec |
| `p30-b4000` | Barra P30 4 m | 4000 mm | 38 | Auratec |
| `p30-cubo5` | Cubo 5 faces | 300 × 300 × 300 | 12 | Auratec |
| `p30-sapata-baixa` | Sapata baixa | 750 × 750 × 55 | 8 | 🔺 proxy (base 800×800 Auratec) |

**Nenhum peso é conferido.** Todos nascem `conferido: false` e o Caderno imprime a
procedência. O dono troca peça por peça na balança, com os parafusos incluídos.

⚠️ **A barra de 0,3 m não é o cubo.** São 300 mm nas duas, e é armadilha fácil:
a barra tem cabeceira nas duas pontas e conecta em **2 faces**; o cubo conecta em
**5**. Ids e nomes distintos desde o começo.

#### 3.2.1 O cubo de 5 faces

Cinco conectores, não seis — **a face fechada é orientável**, igual a qualquer
outra peça: o técnico gira o cubo ao encaixar. Assim o app não precisa cravar
*qual* face vem tapada de fábrica (no modelo da casa a fechada parece ser a de
baixo, mas isso é detalhe de desenho, não regra).

#### 3.2.2 O P50 sai da v1

**O dono não tem P50.** O campo `sistema` (300 | 500) **continua no modelo de
dados** — é uma linha, e sem ela o dia do P50 vira retrabalho no motor e nos
projetos já salvos. Mas o catálogo v1 não traz nenhum item 500, e a UI não oferece.

### 3.3 O que a v1 deixa de fora — e por quê

- **Curva/arco** — o dono não usa, e o raio nominal não tem convenção publicada
  (eixo? banzo interno? externo?).
- **Sleeve block e pau de carga** — são peças de *içamento*, e içamento é o
  território do rigger. Entram junto com os painéis, se entrarem.
- **P76 e D25** — fora do estoque dele.
- **Mistura P30 × P50** — não encaixam direto (precisam de adaptador 500×300).
  A v1 **avisa e recusa**; o adaptador entra depois.

---

## 4 · Arquitetura — a fronteira que decide tudo

```
src/pages/project/ProjectEstrutura.jsx     ← a aba (React, as 5 faixas)
src/services/estrutura/                    ← MOTOR: 100% testável em vitest
  vetor.js          álgebra própria (sem three — ver §4.0.1)
  catalogo.js       peças, dimensões, conectores, peso com procedência
  encaixe.js        resolverEncaixe(conectorA, conectorB, giro) → Matrix4
  snap.js           grade espacial, busca de candidato, tolerância
  montagem.js       árvore de peças, validação, colisão, juntas
  historico.js      comandos inversíveis (desfazer/refazer)
  serializar.js     ↔ JSON do projeto, versão e migração
  metricas.js       peso total, caixa envolvente, lista de peças, parafusaria
src/vista3d/                               ← VISTA: não testada por unidade
  cena.js           WebGLRenderer, luzes, InstancedMesh, LOD, render sob demanda
  controles.js      OrbitControls, raycast, seleção
  captura.js        render → PNG → pdfmake
```

**A regra de corte: o motor não sabe que existe uma tela.** Nada de `Scene`,
`Mesh`, `Material`, `camera`, `canvas`, `window`.

#### 4.0.1 O motor não importa `three` — correção de rota (E0, 19/08)

O plano original dizia "use os tipos matemáticos do three, que rodam em Node
puro". Roda mesmo (pesquisa §3.7) — mas **esbarra numa restrição que o próprio
espeque criou**: o `metricas.js` alimenta o **relatório**, que abre no **celular**
e é **offline**, enquanto o chunk 3D fica **fora do precache** (§7.2). Um
`import { Vector3 } from 'three'` no motor promoveria a biblioteca inteira pro
chunk principal — engordaria o app pra todo mundo e quebraria as duas coisas
de uma vez.

São ~10 operações. Elas moram em **`vetor.js`**, sem dependência nenhuma, com as
matrizes em **coluna-maior idêntica ao `Matrix4.toArray()`** — a vista faz
`fromArray()` e segue, sem conversão. O `three` fica 100% dentro de `src/vista3d/`,
com **portão de ESLint** garantindo isso (§7.3).

Isso segue o precedente da casa: `cableScene.js` já é "geometria pura
compartilhada entre o PDF e o DOM, testável sem pdfmake nem DOM".

### 4.1 A stack

**three.js puro, `WebGLRenderer`. Sem react-three-fiber, sem Babylon.**

187 KB gzip contra 338 do R3F e 541 do Babylon. O R3F custa +151 KB porque faz
`import * as THREE` internamente, e o `peerDependencies` dele (`react: >=19 <19.3`)
**prenderia o upgrade do React do app inteiro**. Um editor é imperativo por
natureza — o modelo declarativo não paga aqui. Detalhes e números na pesquisa §3.

React cuida do **entorno** (as 5 faixas, os controles, os ajustes); o `<canvas>`
fica num componente com um `useEffect` que monta a cena e um `useRef` pra
instância do motor. **Uma fronteira só, explícita.**

---

## 5 · O modelo de dados

### 5.1 Peça do catálogo

```js
{
  id: "p30-b200",
  sistema: 300,               // 300 | 500 — é o que define compatibilidade
  linha: "P30",               // P30 | L30 | R30 | P50
  tipo: "barra",              // barra | cubo | base
  nome: "Barra P30 2 m",
  comprimentoMm: 2000,        // barra
  ladoMm: 300,                // seção externa — MEDIDO: 299,6
  entreEixosMm: 250,          // CAMPO PRÓPRIO, nunca derivado (ver §5.2)
  banzoMm: 50,                // desenho; o tubo real é 2" = 50,8 (ver §5.2.1)
  diagonalMm: 40,
  passoNoMm: 250,             // espaçamento das travessas ao longo da barra
  anguloDiagonalGraus: 51,
  cabeceiraMm: 25,
  geometria: { fonte: "modelo SketchUp da casa (linha próxima à Feeling)", medido: true },
  peso: { kg: 22, fonte: "Auratec AL-P30", conferido: false },
  conectores: [ /* ver 5.4 */ ],
}
```

> **Os números de geometria são medidos, não chutados.** O dono entregou o modelo
> SketchUp que usa pra projetar; a malha foi analisada e os valores estão na
> [pesquisa §4.8](./estrutura3d-pesquisa.md). **Geometria e peso têm procedências
> separadas** — a geometria é medida, o peso ainda é proxy.

### 5.2 Por que `entreEixos` é campo, não conta

A regra é `externo − Ø do banzo`, e o Ø varia por fabricante. E entre os europeus a
coisa embola: o Prolyte X30V é 290/239 e o H30V é **287**/239 — **mesmo
entre-eixos, externos diferentes**. Derivar quebra ali. Guardar o número resolve.

#### 5.2.1 O caso do Ø50 × 2"

O modelo da casa desenha o banzo com **50 mm redondos**, o que dá o entre-eixos
limpo de **250** — e 250 é exatamente o passo dos nós medido na malha. O tubo real
do mercado brasileiro é **2" = 50,8 mm**, o que daria 249,2.

**Decisão: desenhar com 250 / Ø50.** A diferença de 0,8 mm é invisível em tela e em
papel, e o número redondo evita erro de acumulação numa torre de 20 barras. O 2"
fica registrado como a **medida real do tubo**, pra quem for conferir ferragem.

### 5.3 Medida nominal manda — o modelo só ensina a desenhar

**Decisão do dono (19/08): as medidas do catálogo são as da Feeling, fechadas.**
Barra de 2 m é **2000 mm**, ponto. O modelo SketchUp entra como **fonte da forma**
(o desenho interno da treliça), nunca como fonte da cota.

Isso resolve os três desencontros de uma vez:

| Grandeza | Malha | **Catálogo (vale este)** |
| --- | --- | --- |
| Barra "1,5 m" | 1.420 mm *(peça errada no desenho)* | **1500** |
| Seção externa | 299,6 | **300** |
| Cubo | 298,5–300 | **300 × 300 × 300** |
| Sapata baixa / alta | 740 / 742,5 | **750 × 750** |

**Consequência prática:** o gerador é paramétrico, então qualquer comprimento da
lista da Feeling sai de graça — inclusive os que não existem no SketchUp
(700, 1100, 1200, 1300, 1400, 2400, 3700, 5500 mm).

#### 5.3.1 A escada e os "V" (corrigido pelo dono em 19/08)

**Escada** — as travessas horizontais ficam em **duas faces opostas, a cada
500 mm**, e as duas são **defasadas de 250**: uma começa em 0, a outra em 250.

**"V"** — o ziguezague das diagonais fica nas outras duas faces, com passo
próprio de **200 mm** (é dele que saem os 51° medidos), e **nas mesmas posições
dos dois lados** — não espelhado.

> ⚠️ **A primeira versão errou, e vale registrar por quê.** Eu li a malha
> projetando **as duas faces num histograma só**, e duas escadas de 500 defasadas
> de 250 somam exatamente como **uma** escada de 250. Daí saiu uma "regra da
> sobra no meio" que nunca existiu — inventada pra explicar um padrão que era
> artefato da medição. **Projeção que soma faces esconde defasagem.**

#### 5.3.2 A chapa de topo (a emenda)

Cada ponta de peça leva uma **chapa fechada, cobrindo a seção inteira** —
300 × 300 × **14 mm**, sem furo, sem parafuso desenhado. Vale nas três peças: nas
duas pontas da barra, em cada face aberta do cubo e no topo da sapata.

**Por que fechada e sem detalhe (decisão do dono, 19/08).** A chapa precisa
comunicar UMA coisa: **a peça acaba aqui**. Duas chapas encostadas viram uma
junta que se lê a três metros. Duas tentativas anteriores erraram por excesso —
um disco por banzo, depois duas chapas laterais com cabeça de parafuso: viraram
detalhe de produto e, na distância de trabalho, sumiam no contorno da treliça.
**Menos desenho comunicou mais.**

A peça real é *plated* / bolt plate, com **4 parafusos de 5/8" por junta** — e
eles continuam contados na **lista de material**, que é onde decidem alguma coisa
(quantos levar na caixa). Referência de forma: **XSF 12"×12" Plated Utility
Truss** (12" externo, banzos a 10", tubo 2"×1/8", parafuso 5/8" — praticamente a
geometria do P30).

⚠️ A chapa é **recuada meia espessura pra dentro** do comprimento nominal. Sem
isso uma barra de 2 m mediria 2,028 m na cena e a cota do Caderno mentiria.


### 5.4 Conector

```js
{ id: "A", pos: [0, 0, 0], dir: [0, 0, -1], rolo: [0, 1, 0], sistema: 300 }
```

- `dir` — a normal que **sai** do encaixe (unitária)
- `rolo` — a referência de rolagem: qual banzo é "o de cima"
- **Sem `rolo` a peça encaixa girada 45° e os banzos não alinham.** É o campo que
  todo mundo esquece.
- **Gênero não existe aqui.** No spigot cônico há macho e fêmea; no parafuso são
  **duas faces chatas se encontrando**. A junta brasileira é mais simples de
  modelar que a europeia.
- Passo de giro: **90°** (4 banzos). Guardado como **inteiro `k` de 0 a 3**,
  nunca como float — senão o ângulo deriva depois de 50 giros e o JSON deixa de
  ser exato.

### 5.5 A montagem, dentro do projeto

```js
project.estrutura = {
  versao: 1,
  pecas: [
    { id: "e1", catalogoId: "p30-b200", matriz: [/* 16 floats */] },
    { id: "e2", catalogoId: "p30-cubo5",
      encaixe: { de: "e1", conA: "B", conB: "sul", k: 0 },
      matriz: [/* cache */] },
  ],
}
```

**Guardar o encaixe simbólico, não só a matriz.** Se um dia a geometria de uma
peça for corrigida no catálogo, os projetos antigos **se reconstroem certos**. A
matriz fica como cache derivado, pra carregar rápido. E `versao` desde o dia 1 —
isso vai pro IndexedDB e vai precisar migrar.

---

## 6 · O encaixe — a matemática inteira

```js
// encaixar o conector B da peça nova no conector A da peça existente
const q = new Quaternion().setFromUnitVectors(dirB.clone().negate(), dirA)
q.premultiply(new Quaternion().setFromAxisAngle(dirA, k * Math.PI / 2))
const pos = posA.clone().sub(posB.clone().applyQuaternion(q))
const m = new Matrix4().compose(pos, q, new Vector3(1, 1, 1))
```

Três passos: **enfrentar as normais** → **rolar em torno do eixo** → **juntar os
centros**. É o mesmo desenho do TrussTool, com um terço do código, porque a
geometria é procedural e os conectores são conhecidos.

⚠️ **Não corte o passo 2.** Quando `dirA` e `dirB` são exatamente opostos, o
`setFromUnitVectors` cai num caso degenerado (infinitos eixos válidos) e o three
escolhe um perpendicular **arbitrário** — o rolo resultante fica imprevisível. O
passo 2 sobrescreve o rolo explicitamente e é o que protege.

### 6.1 O snap

1. pega os conectores **livres** da peça em movimento
2. procura conectores livres de outras peças dentro de uma **tolerância** —
   em metros **e em pixels de tela**, usando o maior dos dois (com a câmera longe,
   tolerância em metros vira impossível de acertar)
3. filtra por **sistema igual** e por **oposição** (`dirA · dirB < −0,5`)
4. ordena por distância, pega o melhor, mostra **prévia fantasma**
5. solta → comita

Busca em **grade espacial** (hash de células de 0,5 m), não O(n²). Com 2.000
barras são 4.000 conectores; a grade reduz cada consulta a dezenas de comparações.
~40 linhas, e mora no motor puro.

### 6.2 Desfazer/refazer

**Comandos inversíveis, nunca snapshots** — com 2.000 peças o histórico de
snapshots estoura a memória. `AdicionarPeca ↔ RemoverPeca`, `MoverPeca(de, para) ↔
MoverPeca(para, de)`. Duas pilhas; comando novo limpa a de refazer. Um arraste
inteiro é **um** comando, não 60 por segundo.

100% lógica pura → é o candidato mais óbvio a teste de unidade.

---

## 7 · Decisões de plataforma

### 7.1 Desktop-only

A aba nasce com **`desktopOnly` no `nav.js`**, como as outras features que não
cabem no dedo. Decisão do dono, e a pesquisa concorda: todas as ferramentas da
categoria são desktop, e o `TransformControls` do three tem problemas conhecidos
em touch.

**O celular não fica de fora — ele fica com a consulta:** ver a estrutura já
montada (câmera orbitando, sem editar) e **o relatório de peças**, que é o que se
consulta no galpão. Isso é o mais barato de fazer e o mais usado.

### 7.2 O service worker — **decidido: o 3D sai do precache**

O `stampServiceWorker` do `vite.config.js` precacheia **tudo** que está em
`dist/assets`. Foi de propósito: garante offline total após a 1ª carga. Mas o
chunk 3D seria lazy pro roteador e **não pra rede** — todo usuário baixaria
187 KB **a cada deploy**, mesmo sem nunca abrir a aba.

**Decisão do dono (19/08): tirar o chunk 3D do precache.** Abrir o editor **pela
primeira vez** passa a exigir estar online; depois disso ele fica em cache. O
**relatório e a consulta seguem 100% offline**, que é o que se usa no galpão.

O que isso exige na implementação:

1. dar **nome estável** ao chunk 3D (`manualChunks` ou `chunkFileNames`), senão o
   hash muda a cada build e não dá pra filtrar;
2. **excluir esse padrão** do `BUILD_ASSETS` no `stampServiceWorker` do
   `vite.config.js`;
3. conferir que o `RUNTIME` cache do `sw.js` guarda o chunk no primeiro acesso —
   o *stale-while-revalidate* que já existe pra GET do mesmo domínio deve cobrir;
4. **testar offline depois do primeiro uso** — é o cenário que importa e é o que
   quebra silenciosamente.

⚠️ E deixar um aviso honesto na aba: se o chunk ainda não foi baixado e não há
rede, o editor precisa dizer isso — não pode ficar girando eternamente. Um
`Placeholder` com o texto certo resolve.

### 7.3 O portão do ESLint

**Nenhum arquivo fora da rota 3D pode importar `three`.** Um `import { Vector3 }`
num helper compartilhado promove o three inteiro pro chunk principal. Defesa:
`no-restricted-imports` com `three` e `three/*`, desligado só dentro de
`src/services/estrutura/**` e `src/vista3d/**`. O CI já é zero-warnings — pega na hora.

### 7.4 Desempenho

`InstancedMesh` por variante de peça · **3 níveis de LOD** (treliça cheia →
treliça pobre → caixa) com um `InstancedMesh` por nível · `EdgesGeometry` no lugar
de sombra (lê melhor e é muito mais barato) · **render sob demanda**, não
`requestAnimationFrame` em loop · `setPixelRatio(min(dpr, 2))`.

Alvo: **500 peças confortável, 2.000 como teto.** Uma estrutura real de show
raramente passa de 200.

---

### 7.5 O clique tem tolerância — medido, não achado

Treliça é quase toda **ar**. Medido nesta cena, um raio matematicamente fino
acerta alguma peça em apenas **2,2% dos pixels**: clicar numa diagonal seria
loteria. Quando o tiro direto erra, o `pecaEm` tenta **dois anéis** ao redor do
ponteiro (17 raios no total, irrelevante na frequência de um clique) — e a taxa
sobe pra **7,2%**. O mesmo vale pros marcadores de conector, com tolerância maior.

No modo Montar o **conector tem prioridade sobre a peça**: o alvo do clique é
onde a peça vai entrar, não a peça que está atrás do marcador.

## 8 · A aba, nas 5 faixas

Aba **Estrutura** dentro do projeto — junto de Composição, Screens e Cabeamento.
Não é ferramenta solta: os painéis vêm depois, e eles já moram no projeto.

| Faixa | Conteúdo |
| --- | --- |
| **F1 · MODO** | `Segmented`: **Montar** · **Ver** *(no celular, nenhum: a aba é consulta)* |
| **F2 · FERRAMENTAS** | `Select` da **peça** · giro da peça nova (0/90/180/270°) · grade · desfazer · refazer · girar/excluir a selecionada ··· **primária: "Adicionar peça"** |
| **F3 · CONTEXTO** | chips passivos: nº de peças · nº de juntas · **peso total** · **L×A×P** · `StatusPill` de sistema misturado · `HelpTip` |
| **F4 · CONTEÚDO** | o `<canvas>`, ocupando o resto da tela. Vazio = `Placeholder`. Zoom = `ZoomTrio` |
| **F5 · AJUSTES** | `Drawer` (desktop): unidade, cor do tema da cena, densidade da grade, qualidade |

**R1 — uma primária por aba:** "Adicionar peça" é a razão de existir da aba.

### 8.1 O fluxo de montagem, em três gestos

1. **escolhe a peça** no seletor da F2;
2. **passa o ponteiro num conector livre** — ele acende e a peça aparece em
   **fantasma**, exatamente onde vai ficar; o botão de graus gira de 90 em 90
   antes de comitar;
3. **clica** → a peça entra.

A primária **"Adicionar peça"** põe uma peça **solta na origem** — é assim que se
começa a segunda torre sem estar preso à primeira. Clicar numa peça montada
seleciona; daí dá pra **girar** (leva junto o que estiver preso nela) ou
**excluir** (o que estava preso vira peça solta, no lugar onde estava).

### 8.3 A imagem que vai pro Caderno

O Caderno abre **no celular e offline**, e o chunk 3D não está lá (§7.2) — então
a vista não pode ser gerada na hora do relatório. Quem tem a cena montada é quem
tira a foto: um botão na F2 captura a vista atual e ela viaja com o projeto.

Na captura, os **andaimes da tela somem**: grade, marcadores de conector e prévia
fantasma existem pra ajudar a montar; no papel viram ruído — e o fantasma chega a
**mentir**, desenhando uma peça que ainda não foi colocada.

⚠️ **A imagem NÃO mora dentro do projeto.** São ~300 KB, e a fatia `projects` do
sync sobe inteira pro Supabase a cada mudança: guardar o PNG ali mandaria 300 KB
pra nuvem em todo sync, de todo projeto, pra sempre. Ela vive no **IndexedDB**
(`services/estrutura/imagem.js`) e o projeto guarda só a referência
(`estruturaImg: { em, largura, altura, kb }`). É a mesma régua que o `fotos.js`
já aplicou nas fotos de comprovante — com um argumento a mais: esta imagem é
**derivada**, dá pra refazer a qualquer momento clicando de novo. Dado derivado
não ocupa nuvem.

### 8.2 A gravação

A montagem vive em **`project.estrutura`**, no formato do §5.5, e vai pro
IndexedDB e pro sync com o resto do projeto. A aba só grava quando o **JSON muda
de verdade** — sem essa comparação, todo render marcaria o projeto como alterado
e o sync acordaria à toa.

---

### 8.4 A folha ESTRUTURA

Uma fonte só (`services/estrutura/folha.js`) alimenta o DOM e o PDF — o padrão
que o `cableScene.js` já estabeleceu na casa. A folha traz:

1. a **vista 3D** capturada, ao lado do quadro de **peças · juntas · peso** e das
   **medidas** (largura × altura × profundidade);
2. a **lista de peças** com a **linha** do fabricante, peso unitário e total;
3. a **ferragem** — contagem por junta, com a nota de que é contagem e não massa;
4. a **procedência do peso**, item a item;
5. o **aviso de responsabilidade técnica**, sempre.

Duas regras duras: a folha **some** quando não há estrutura (imprimir "0 peças"
ocuparia papel sem informar), e o peso **nunca sai como número seco** enquanto
não for conferido na balança — quem lê o papel não tem como saber que é proxy de
catálogo.

## 8.5 Auditoria da montagem (19/08) — o que foi verificado

O dono pediu conferência de consistência antes de seguir. Rodei os casos; segue o
que é fato, não impressão.

### ✅ Persiste

A montagem grava em `project.estrutura`, vai pro IndexedDB e **sobrevive ao
reload da página** (verificado no navegador). Trocar de aba e voltar mantém tudo.

### 🔴 Sobreposição NÃO é checada — confirmado

Duas barras de 2 m na **mesma posição** são aceitas sem um pio, e a caixa
envolvente sai como se fosse uma peça só. Dá pra montar peça dentro de peça.

O app já sabe avisar isso em 2D: o `layout.js` tem `overlappingIds` e a
Composição alerta quando duas telas se sobrepõem, porque conteúdo escondido é
erro de campo. Estrutura merece a mesma régua.

### 🔴 O cubo não gira pra liberar face — e o culpado não é o giro

Medido: com o cubo entrando pelo `topo` na ponta de uma barra vertical, **nenhum
dos 4 giros libera uma face pra cima**. As faces livres só rodam no plano
horizontal:

| giro | norte | sul | leste | oeste |
| --- | --- | --- | --- | --- |
| 0 | −Z | +Z | −X | +X |
| 1 | −X | +X | +Z | −Z |
| 2 | +Z | −Z | +X | −X |
| 3 | +X | −X | −Z | +Z |

**É geometria, não bug.** O giro acontece **em torno do eixo do encaixe** — que
ali é vertical. A face fechada está *em cima desse eixo*, então ela gira em torno
de si mesma e nunca sai do topo. Nenhum ajuste no `girarPeca` conserta isso.

O que falta é outra coisa: **escolher por qual face a peça ENTRA na junta**. Hoje
o `conectorDeEntrada()` crava `"topo"` pro cubo. Medido, entrar por qualquer face
lateral resolve os quatro casos:

| entra por | sobra face livre pra cima? |
| --- | --- |
| topo | **não** |
| norte · sul · leste · oeste | **sim** |

### ⚠️ Três buracos menores de persistência

1. **Peça fora do catálogo some calada.** A aba carrega com
   `descartarDesconhecidas: true` — se um dia o catálogo mudar, a peça é
   descartada sem avisar. Perder peça em silêncio é pior que falhar alto.
2. **O desfazer morre ao trocar de aba.** A montagem fica gravada, mas o
   histórico é estado do componente e o componente desmonta.
3. **Imagem órfã.** Excluir o projeto não apaga o PNG do IndexedDB — e a
   referência (`estruturaImg`) **sincroniza** enquanto o PNG **não**, então em
   outro aparelho o Caderno sai sem imagem e a aba diz "guardados no aparelho"
   sem explicar qual aparelho.

---

## 8.6 O plano da consolidação (fase E3.5)

Antes dos painéis (E4), fechar o que a auditoria abriu. Em ordem de dependência.

### A · O Caderno (decisão do dono, 19/08)

| # | O que |
| --- | --- |
| **A1** | a folha Estrutura sai de *Resumido* e *Gabinetes* — fica **só no Completo** |
| **A2** | novo tipo de caderno **"Estrutura"** no `Segmented` da aba Caderno: capa + a folha, e nada mais. É o caderno que vai pra **equipe de montagem** |

### B · Integridade da montagem

| # | O que | Como |
| --- | --- | --- |
| **B1** | **detectar sobreposição** | no motor, `colisoes(montagem)`: cada peça vira um **segmento-eixo com raio**; duas peças conflitam quando os segmentos se aproximam a menos da folga **em pontos INTERIORES de ambas**. O "interior" é o que evita o falso positivo óbvio — duas barras num cubo se encostam **nas pontas**, e isso é montagem correta, não colisão. **Avisa, não bloqueia**: `StatusPill` vermelho na F3, as peças em conflito destacadas na cena, e a folha do Caderno registrando |
| **B2** | peça desconhecida **falha alto** | tirar o `descartarDesconhecidas` da aba; mostrar quantas peças o arquivo tem que o catálogo não conhece, em vez de sumir com elas |
| **B3** | histórico sobrevive à aba | subir o `historico` pra um nível que não desmonta (estado no `ProjectDetail`, ou um `useRef` guardado por projeto) |
| **B4** | imagem não vira órfã | `apagarImagem(projectId)` no excluir do projeto (o `Reembolso.jsx` já faz isso com `delFoto`) · e a aba dizer que a imagem **é deste aparelho**, porque a referência sincroniza e o PNG não |

### C · Manipulação

| # | O que | Detalhe |
| --- | --- | --- |
| **C1** | **face de entrada** — o conserto do cubo | um controle na F2 ao lado do seletor de peça, com o **fantasma atualizando ao vivo**. Padrão inteligente: escolher automaticamente a entrada que **deixa face livre pra cima** quando o alvo aponta pra cima; o técnico alterna se quiser. Sem isso, cubo no topo de torre é beco sem saída |
| **C2** | **seleção múltipla** | `Shift + clique` acumula; `Esc` limpa. O estado vira lista, não índice — mexe na aba e no `selecionar()` da cena (que hoje já pinta **por instância**, então aceitar várias é barato) |
| **C3** | **atalhos** | `Delete`/`Backspace` apaga a seleção · **`Ctrl` segurado = conta-gotas** (o ponteiro muda e a peça clicada vira a peça de inserção) · `Ctrl+Z` desfaz · `Ctrl+Shift+Z` refaz · `R` gira · `Esc` limpa seleção |

> ✅ **Decidido pelo dono (19/08): é CONTA-GOTAS, não duplicar.** Nas palavras
> dele: *"quando o Ctrl estiver segurado muda o ícone do rato pra outra coisa, e
> aí muda a peça de inserção — a peça que eu clicar vira a peça que vai ser
> inserida na próxima junção."*
>
> O que justifica: a peça escolhida **sobrevive como última escolhida**, então o
> gesto de montar já é *clicar e colar, clicar e colar*. O conta-gotas é o jeito
> de **trocar de peça sem tirar o olho da cena** — sem subir até o seletor da F2,
> achar o nome na lista e voltar. Numa torre repetitiva é o que mais economiza
> clique, e é exatamente o que o dono descreveu.
>
> **O ponteiro tem que mudar enquanto o `Ctrl` estiver segurado** (`cursor:
> copy`) — sem esse aviso visual o modo é invisível, e modo invisível é modo que
> pega o técnico de surpresa. Muda no `keydown` e volta no `keyup`; sai da tela
> (`blur`) também volta, senão o ponteiro fica preso no modo.
>
> **Duplicar fica de fora**: a cópia nasceria em cima da original — justo o que o
> B1 passa a acusar como sobreposição.

### D · Cor e legenda

| # | O que | Detalhe |
| --- | --- | --- |
| **D1** | **cor por peça do catálogo** | mora nas **prefs globais** (Configurações), não no projeto: o catálogo é o galpão, e a cor da barra de 2 m é a mesma em todo projeto. Precedente na casa: a paleta do mapa de cabos |
| **D2** | **legenda** | chips de cor + nome, no canto do canvas e na folha do Caderno — a mesma legenda nos dois, como o mapa de cabos já faz |

> 💡 **Isso custa quase nada na cena.** O destaque de seleção já pinta **por
> instância** (`setColorAt`), justamente pra não acender o grupo inteiro. Cor por
> peça usa o mesmo caminho: a peça selecionada pega o acento, o resto pega a cor
> do catálogo.

### E · Backlog (não é desta fase)

**Catálogo por categoria, sem fabricante** — reorganizar as peças em
**categorias** (barra reta · cubo · base) × **modelos** (a medida), largando o
prefixo de fabricante nos ids. Fica anotado como card à parte; mexe em ids
gravados em projeto e pede migração, então não entra no meio da consolidação.

---


## 8.7 O ajuste fino da montagem (E3.6) — pedido do dono, 19/08

Três correções em cima da E3.5, todas nascidas de usar a coisa.

### A tecla `V` — modo Ver enquanto segurada

> *"um atalho pra tecla V, quando ela estiver apertada muda pro modo ver, assim
> pode clicar nas peças sem adicionar uma nova"*

Em modo Montar o CONECTOR tem prioridade no clique — é o que faz encaixar ser um
gesto só. O efeito colateral é que **selecionar uma peça vira uma corrida contra
os conectores**, e o técnico encaixa peça sem querer.

`V` segurado força o modo Ver: conectores somem, fantasma some, clique seleciona.
Solta, volta a montar. É um modificador momentâneo, igual ao `Ctrl` do
conta-gotas, e pelo mesmo motivo — o técnico não larga o gesto pra trocar de modo
no `Segmented`.

O `Segmented` da F1 **acompanha** enquanto a tecla está apertada, e um
`StatusPill` diz "Ver — solte o V para montar". Modo sem aviso é modo que prende.

### As DUAS rotações: `R` gira, `Ctrl+R` troca a face de entrada

> *"a forma como vc lidou com a rotação do cubo ainda não está legal (…) acho que
> deve sempre estar no modo automático a entrada do cubo (…) R continua fazendo o
> pan e control + R faz o tilt, acho que assim fica mais fácil sem ter que lidar
> com uma interface complexa"*

Ele tem razão, e o diagnóstico dele bate com o do §8.5. São **duas rotações
independentes**, e a E3.5 tinha exposto a segunda como um `Select` na F2 — um
controle a mais pra aprender, com nome de face que ninguém quer decorar.

| tecla | o que faz | por que existe |
| --- | --- | --- |
| `R` | gira em torno do **eixo do encaixe** | alinha a peça na junta |
| `Ctrl+R` | troca a **face por onde a peça entra** | é o único jeito de mover a face cega do cubo — ela mora NO eixo do `R` (§8.5) |

O `Select` de face de entrada **saiu da tela**. A entrada é sempre a
**automática** (a que não fecha o topo da estrutura), e o `Ctrl+R` anda na lista a
partir dela. Com peça selecionada, as duas teclas mexem no que já está montado —
`Ctrl+R` vira o comando `ENTRADA` no motor, com desfazer.

O `Ctrl+R` **pede `preventDefault`**: no navegador ele recarrega a página, e
recarregar no meio de uma montagem leva o desfazer junto.

O ciclo do `Ctrl+R` **pula face ocupada**, e o motor recusa a troca que roubaria
um conector com peça pendurada — duas juntas disputando o mesmo conector fariam a
montagem mentir sobre si mesma.

### A seta na face cega

> *"quando ele for clicado deixar uma seta na face aberta do cubo"*

O cubo de 5 faces tem uma face **sem conector**, e ela é invisível no desenho: o
técnico só descobre onde parou quando tenta encaixar ali e não consegue — que foi
exatamente o que aconteceu com ele.

Peça selecionada, um **cone no acento** marca essa face e aponta pra fora dela.
Some na captura do Caderno, junto com grade, conectores e fantasma: é andaime de
tela, não desenho.

Só vale pra peça em forma de caixa (`tipo: "cubo"`). Na barra, os quatro lados
também não têm conector e ninguém chama isso de face cega — são o corpo da peça.

### O piso nunca corta a peça

> *"a primeira peça nasce no centro do piso, passando metade pra baixo e metade
> pra cima, crie uma regra que o piso sempre seja abaixo da peça mais baixa, ou
> sobe a estrutura ou abaixa o piso"*

Ele ofereceu as duas saídas, e as duas fazem falta — resolvem coisas diferentes.

**1 · A peça solta nasce APOIADA** (`matrizApoiada`). Barra e cubo têm origem no
CENTRO, porque é o que deixa a matemática do encaixe simples; o efeito colateral
é que nascer na origem é nascer com metade da peça enterrada. A sapata nunca
mostrou o problema porque a origem dela já é o chão — agora as três se comportam
igual. É a regra do galpão: peça solta se apoia.

**2 · O piso DESCE se algo passar dele** (`nivelDoChao`). Encaixar pra baixo é
legítimo (uma sapata na ponta de baixo, uma torre que cresce pro fosso), e aí a
peça atravessaria a grade. Peça cortada pelo piso é desenho que mente sobre o que
está apoiado e o que está no ar — e é com esse desenho que se decide içamento.

> **O piso só DESCE, nunca sobe.** Estrutura inteira no ar continua com a grade
> no zero, que é o palco. Se o chão subisse atrás de uma estrutura voada, o
> desenho perderia justamente a informação de que ela está voada — que é a
> informação mais cara que ele carrega.

A régua mora no motor (`metricas.nivelDoChao`), não na cena: é regra de projeto,
não detalhe de renderização, e assim ela é testável sem WebGL.

### A paleta do catálogo

> *"outra coisa que ainda não entrou foi um card que tenha a lista de todas as
> peças separadas por categoria"*

Um card **CATÁLOGO** na F4, ao lado do desenho, com as peças agrupadas em
**Barras · Cubos · Bases** (`catalogoPorCategoria`, no motor — o mesmo lugar que a
branch do catálogo por categoria vai mexer).

Ele faz **duas coisas com um controle só**:
1. é o **seletor** da peça de inserção — e por isso o `Select` de peça saiu da F2;
2. é a **legenda** do desenho: cor de cada peça e **quantas estão montadas**.

Ter as duas separadas obrigava a cruzar "laranja" da legenda com "Barra P30 2 m"
do seletor. Aqui é a mesma linha. A legenda flutuante que morava no canto do
canvas saiu — ela dizia o mesmo, duas vezes.

> ⚠️ **Proposta pro manual de marca.** A gramática da casa manda `Select` pra
> escolha 1-de-N (R2), e a paleta é uma escolha 1-de-N que virou card na F4. Ela
> se justifica por acumular a legenda, mas é caso novo: entra no manual como
> **proposta**, junto com o ícone `Frame` da aba, aguardando o dono.

---

## 8.8 O gesto de montar (E3.7) — segunda rodada do dono, 19/08

### A peça nasce no piso, e o botão sai

> *"a peça deve nascer uma única vez, ache que ao ser clicado na lista de peça
> ela vem pra memória de seleção, e aí ao ser clicado ela nasce no piso, acho que
> o botão de adicionar peça não se faz necessário"*

Ele está certo, e o sintoma denunciava: com "Adicionar peça" toda peça solta
nascia **na origem**, uma em cima da outra — e o aviso de sobreposição do §8.6-B1
acusava um problema que o próprio app criava.

Agora o fluxo é o que ele descreveu: a peça clicada no **catálogo** entra na
memória de seleção (já era assim, e é o que o conta-gotas explora), e **clicar no
piso** a faz nascer ali, apoiada. A primária da F2 passa a ser **Imagem do
Caderno** — com a montagem virando gesto, o que sobra de razão de existir na aba
é ENTREGAR a estrutura pro Caderno.

Duas notas de implementação:
- o plano de clique é o **piso desenhado**, não o zero absoluto. Quando a grade
  desce por causa de peça pendurada (§8.7), clicar nela nasce peça lá;
- o ponto é arredondado em **10 cm**. No campo se mede em centímetro inteiro, e
  ponto solto na terceira casa deixaria a medida do Caderno com um resto que
  ninguém pediu.

### `Shift+R` no lugar de `Ctrl+R`

> *"o control + r ainda recarrega o navegador, podemos mudar pra outro atalho,
> talvez shift + r"*

O `preventDefault` no `Ctrl+R` **não segura em todo lugar** — e recarregar no meio
de uma montagem leva o histórico de desfazer junto, que é memória de sessão
(§8.6-B3). Atalho que às vezes apaga trabalho não é atalho, é armadilha.
`Shift+R` está livre: `Shift + clique` é seleção múltipla, mas a tecla sozinha
não disputa com nada.

### Girar mexe SÓ na peça selecionada

> *"ao rotacionar as peças ficam travadas e rotacionam em conjunto, somente as
> peças selecionadas podem rotacionar"*

O diagnóstico dele descreve exatamente o sintoma: selecionar uma barra no meio da
torre e apertar `R` girava **tudo que estava acima** — e a peça escolhida, que
gira em torno do PRÓPRIO eixo, parecia travada. Era o `recalcular` fazendo o
certo pelo modelo (a verdade é o encaixe simbólico) e o errado pra quem monta.

**Como os filhos ficam parados sem quebrar junta.** O filho é posicionado pelo
`rolo` do conector do pai mais o `giro` dele. Girar o pai em +k gira esse `rolo`
em +k·90°; dar **−k no giro do filho** cancela exatamente. E quando o conector do
pai está **no eixo do giro** — o caso de toda barra, que se encaixa pelas pontas —
a posição do filho nem chega a mudar. Resultado: só a peça girada se mexe, a
junta continua inteira, e o desfazer devolve tudo.

Basta compensar os filhos **diretos**: com eles parados, os netos nem sabem que
houve giro.

> ⚠️ **O limite, e ele é físico.** No cubo as faces laterais ficam FORA do eixo
> do giro. Girar um cubo muda o lugar dessas faces, e o que estiver aparafusado
> nelas viaja junto — não há compensação que segure, e no truss de verdade
> também não há. A ajuda da aba diz isso com todas as letras.

O comportamento antigo continua disponível no motor
(`girarPeca(m, id, giro, { compensarFilhos: false })`), porque girar a torre
inteira a partir da base ainda é uma operação legítima — só não é o `R`.

---

## 8.9 Girar o CUBO sem arrastar nada (E3.8)

> ⚠️ **SUPERADA pela §8.11**, que nomeou a regra em vez de
> consertar sintoma. A análise da geometria aqui continua válida; o modelo de
> rotação (eixo da junta, face de entrada) foi trocado pelo das seis direções.

> *"ao clicar utilizando a tecla v pra selecionar o cubo e usando R e shift + R
> as peças estão rodando juntas, verifica o teste com o cubo selecionado"*

A E3.7 tinha resolvido a barra e **declarado o cubo como limite físico**. Estava
errado — o cubo tem conserto, e a sonda mostrou o tamanho do problema: com o cubo
selecionado, o braço aparafusado nele viajava 90° junto.

### O conserto: reancorar na face que assumiu a pose

A compensação da E3.7 só mexia no `giro` do filho, e isso basta enquanto o
conector do pai **não sai do lugar** (barra, que encaixa pelas pontas). No cubo as
faces laterais saem.

Mas numa peça simétrica **outra face vai parar exatamente na pose antiga**. Então
o filho é **reancorado nessa face** e o `giro` dele é corrigido nos passos de 90°
que a rolagem andou. O filho não se move um milímetro e continua aparafusado no
mesmo cubo — só que na face que agora está onde a outra estava.

É o que o técnico faz: gira o cubo e reaperta a viga na face que ficou virada pro
lado certo.

A conta de compensação é a mesma de sempre — `passosDeRolagem(depois, antes,
eixo)` — e o caso da barra virou caso particular deste (a face que assume a pose
antiga é ela mesma).

### E quando não há face nenhuma ali: PULAR

> ⚠️ **REVOGADO pelo §8.10** (mesmo dia). O dono derrubou a ideia de pular: travar
> orientação é tratar desenho como parafuso. O texto fica porque a análise da
> geometria segue válida — só a **conclusão** mudou.

O cubo tem **5 faces, não 6**. Quando o giro leva a **face cega** pra cima do
lugar onde há peça aparafusada, não existe furo pra reaparafusar.

A saída não é arrastar a peça: é reconhecer que **aquela orientação é fisicamente
impossível** com aquela peça montada ali. O cubo não gira pra deixar a face
tapada olhando pra uma viga que está parafusada nele.

Então `R` e `Shift+R` **pulam** para o próximo passo que não arrasta ninguém
(`proximoGiroLivre` / `proximaEntradaLivre`, no motor). Medido: o cubo do projeto
de teste pulou de `g1` direto pra `g3`. Quando nenhuma orientação está livre, a
aba avisa em vez de fingir que girou.

> A orientação pulada volta a existir assim que a peça que a impedia sai. Não é
> uma trava do app: é a estrutura dizendo o que ela é.

### O bug do HORIZONTE (encontrado nos dados do dono)

Nascer peça ao clicar no piso (§8.8) tinha um buraco que só aparece em uso: perto
da **linha do horizonte** o raio da câmera fica quase paralelo ao piso, e o
encontro dos dois vai parar a quilômetros. Um clique de raspão ali nascia uma
peça a **20 km** — invisível na tela e catastrófica no relatório, que passou a
medir *11 326 m × 8,30 m × 20 425 m*.

Agora o clique fora da grade (40 × 40 m) simplesmente não vale: ali é céu, não
chão. Foi encontrado no projeto `teste estrutura` do dono, com uma peça exatamente
nesse estado.

---

## 8.10 Nada de travar: é desenho, não parafuso (E3.9)

> ⚠️ **SUPERADA pela §8.11**, que nomeou a regra em vez de
> consertar sintoma. A análise da geometria aqui continua válida; o modelo de
> rotação (eixo da junta, face de entrada) foi trocado pelo das seis direções.

> *"acho que talvez esteja lidando com a coisa toda de uma forma muito literal,
> uma peça só é parafusada quando está concluída [ou seja quando finalizei o
> projeto], tudo o que vem a ser montado está livre pra edição desde que não
> quebre as regras, todas as peças podem e devem poder ser rotacionadas (…) é
> melhor o serviço de refazer o desenho em caso de exigência de terceiros que o
> desenho siga uma regra do que travar todo o motor"*

**Correção de rumo do dono, e ela derruba a decisão do §8.9.** Eu vinha modelando
parafuso onde ainda é desenho: tratei "peça encaixada" como peça montada de
verdade e, a partir daí, fui inventando regra física — primeiro arrastar o filho,
depois **pular** a orientação "impossível". As duas eram trava.

**A régua certa:** a peça só está aparafusada quando o projeto acabou. Até lá é
composição, e composição tem que ceder ao que o evento pede — desenho de luz,
vão, pedido do cliente, ou simplesmente a peça que o app supôs numa pose e o
técnico quer noutra. **Quando existirem regras duras de posição, elas entram como
regra explícita; até lá, o motor não decide orientação por ninguém.**

### O que saiu

- `proximoGiroLivre` e `proximaEntradaLivre` — as consultas que **pulavam** a
  orientação que arrastaria um filho. Foram embora com os testes delas;
- o aviso "sem orientação livre". Não existe mais orientação bloqueada.

### O que ficou

- **`R` sempre gira um passo.** Os quatro giros de qualquer peça encaixada estão
  sempre disponíveis. Medido no projeto de teste: `g3 → g0 → g1 → g2 → g3`;
- a **compensação** do §8.7/§8.9 continua: o filho é reancorado na face que
  assumiu a pose antiga e não sai do lugar. Ela é um *conforto*, não uma lei —
  quando não há face pra reancorar, o filho acompanha e ninguém é impedido de
  nada;
- `Shift+R` continua pulando **só o que é regra**: face que já tem peça pendurada
  não serve de entrada, porque seriam duas juntas disputando o mesmo parafuso.

### E a peça LIVRE também gira

O item mais escondido do pedido — *"todas as peças podem e devem poder ser
rotacionadas"* — era um lock que ninguém tinha visto: peça solta não tem junta,
então `girarPeca` devolvia a montagem intacta. Uma barra que só sabe ficar em pé
não desenha vão nenhum.

Agora, com peça solta selecionada:

| tecla | o que faz |
| --- | --- |
| `R` | gira 90° em torno da **vertical** — muda a direção no chão |
| `Shift+R` | **tomba** 90° — é assim que barra em pé vira barra deitada |

Ela gira em cima do **próprio centro** e volta com a base no **mesmo nível de
antes**: deitar uma barra em pé deixa ela deitada NO CHÃO, não meio enterrada.
A conta não precisa extrair quatérnio da matriz — numa matriz rígida as três
primeiras colunas são as imagens dos eixos locais, então girar a peça é girar
cada uma delas.

O comando novo é `ACOES.MATRIZ`: peça livre não tem junta de onde derivar pose,
então o comando carrega a matriz inteira e o inverso carrega a anterior. Exato no
desfazer, sem acumular erro de float.

---

## 8.11 A regra das seis direções (E3.10)

A rotação foi construída em três rodadas, e cada uma consertou um sintoma sem
nomear a regra. O dono cortou o nó: **enquanto o projeto não acabou, é desenho** —
mas desenho tem regra, e a regra é do **piso**, não da junta.

Estas sete são o vocabulário. Comportamento novo sai delas; se não sair, é a regra
que precisa mudar, não um remendo ao lado.

### D1 · As seis direções do piso

`N · S · L · O · CIMA · BAIXO`, fixas no mundo, ancoradas na grade. **Nunca se
movem**; peça nenhuma as leva junto.

| id | nome | vetor |
| --- | --- | --- |
| `N` | Norte | `[0, 0, -1]` |
| `L` | Leste | `[1, 0, 0]` |
| `S` | Sul | `[0, 0, 1]` |
| `O` | Oeste | `[-1, 0, 0]` |
| `CIMA` | Cima | `[0, 1, 0]` |
| `BAIXO` | Baixo | `[0, -1, 0]` |

> ⚠️ **Não confundir com os nomes dos conectores.** O catálogo chama os conectores
> do cubo de `topo/norte/sul/leste/oeste`, mas aqueles são **locais**: viajam com a
> peça quando ela gira. Estes são do **mundo**. É a distinção que torna a regra
> dizível — *"a face cega está no OESTE"* é verdade absoluta; *"a face cega é a
> `oeste`"* deixa de significar nada no primeiro giro.

### D2 · Direção ocupada

Uma direção está **ocupada** quando há junta ali — a junta com a mãe ou a junta de
qualquer filha. O resto está **livre**. A face cega está sempre numa direção livre,
por construção: não há onde parafusar nela.

### D3 · Rotação nunca arrasta

Girar uma peça **não move nenhuma outra**, nunca.

O que faz isso funcionar é uma observação simples sobre peça simétrica: quando ela
gira, **outro conector vai parar exatamente na pose que o primeiro tinha**. Então
nada precisa se mexer — basta reancorar a junta da própria peça com a mãe e a junta
de cada filha. É o que o técnico faz no galpão: gira o cubo e reaperta a viga na
face que ficou virada pro lado certo.

### D4 · Peça reta gira só no próprio eixo

Barra e sapata giram **em torno do próprio eixo longo**. Posição e direção não
mudam — o que muda é qual face leva a escada. Vale em pé, deitada, solta ou
encaixada. As pontas da barra ficam EM CIMA desse eixo, então a junta nem sente.

### D5 · Cubo gira movendo a face cega

O estado visível de um cubo é **pra onde a face cega aponta**. Não é convenção: o
`geometriaCubo` desenha chapa em *toda face aberta*, então a cega é a única sem
chapa e as outras cinco são intercambiáveis.

- **`R`** leva a face cega pra próxima direção **horizontal** livre, no ciclo da
  bússola `N → L → S → O`;
- **`Shift+R`** leva pra **CIMA** ou **BAIXO**, se estiver livre.

### D6 · Direção com junta é trava

A face cega **não pode** ir pra uma direção ocupada: ali existe peça aparafusada, e
a junta precisa da flange. As ocupadas são puladas; quando não sobra nenhuma, a
tecla não faz nada e a aba **diz o que está travando, pelo nome**.

É a mesma regra que garante a D3: com a face cega proibida de cair onde há junta,
sempre sobra conector no lugar antigo pra reancorar. Não são duas regras — é uma.

### D7 · A exceção da peça solta

Peça solta não tem junta, então nada trava. E ela ganha o único movimento que muda
posição: **`Shift+R` tomba a barra 90°** (em pé ↔ deitada), caindo apoiada no piso.
É o que permite nascer uma barra horizontal sem depender de cubo.

> ⚠️ **Nem toda peça solta tomba.** A raiz de uma torre também é uma peça solta:
> deitá-la deitaria a torre inteira junto, atropelando a D3. Então peça solta **com
> peça encaixada nela** não tomba. Girar a estrutura toda é outra operação — não é
> "girar a peça". *(Este limite foi encontrado pelo teste de propriedade da D3, não
> por leitura do código.)*

---

### Como isso vira código

| onde | o quê |
| --- | --- |
| `services/estrutura/direcoes.js` | a tabela do D1, `direcaoDe`, `vetorDe`, `listaDeNomes` |
| `services/estrutura/orientacao.js` | D2 a D7 — e `poseDoGiro` / `poseDoTombo`, que são **o que cada tecla faz**. Moram no motor pra que o teste exercite exatamente o que o dedo exercita |
| `montagem.js` · `definirPose` | recebe uma **pose de mundo** e reancora os dois lados da árvore. Único caminho de rotação |
| `historico.js` · `ACOES.POSE` | um comando só, pra barra e cubo, solta e encaixada. O inverso carrega a matriz anterior |
| `ProjectEstrutura.jsx` | as teclas, o chip **"Face cega · Oeste"** na F3 e o aviso que nomeia a trava |

O `giro` de cada junta é achado por **tentativa** sobre os quatro passos, em vez de
deduzido: são quatro contas baratas, e o resultado é exato por construção em vez de
exato por argumento.

### O que foi medido

No pórtico de exemplo, cubo selecionado, `R` quatro vezes:

```
face cega:  Cima → Norte → Sul → Oeste → Norte
peças que mudaram de matriz: [e-cubo]
```

O ciclo **pulou o Leste** — que é exatamente onde a viga está aparafusada — e
**nenhuma das outras oito peças se mexeu**. No `Shift+R`, a face cega foi pro Cima e
ficou lá, porque Baixo tem a torre: *"A face cega não cabe pra cima nem pra baixo:
Baixo e Leste têm peça aparafusada"*.

---

## 8.12 Junta se conta na geometria, não na árvore (E3.11)

> *"a contagem de faces que estão sendo conectadas [juntas] está contabilizando
> praticamente o total de peças −1, verifica isso"*

Ele viu certo, e o motivo é estrutural: a montagem é uma **árvore**, cada peça tem
no máximo uma mãe. Contar encaixes dá sempre `peças − soltas`, e um número que é
sempre outro número não informa nada.

Pior: **fica curto**. Estrutura de verdade FECHA. No pórtico, a viga se aparafusa
nos **dois** cubos, e a segunda ponta não é filha de ninguém — a árvore não tinha
onde anotar.

Medido no pórtico de exemplo:

| | juntas |
| --- | --- |
| encaixes da árvore | 7 |
| faces que se encontram na geometria | **8** |

A que faltava é a ponta direita da viga (`d-cubo:leste ↔ viga:b`). E junta que
some da conta é **parafusaria a menos na caixa**: 28 parafusos em vez de 32. A
equipe descobre isso no galpão, com a estrutura no chão.

### A regra

**Junta é onde duas faces de peças diferentes se encontram**: mesmo ponto, normais
se enfrentando, mesmo sistema. É o que um parafuso veria — e não depende de qual
peça o app decidiu chamar de mãe.

`montagem.juntas` passa a medir isso, com a **grade espacial** do `snap.js` (a
mesma que já existia pra achar encaixe) pra não virar O(n²).

### O que veio junto de graça

Como `conectoresOcupados` deriva de `juntas`, a mudança se propaga inteira:

- **conector de fechamento deixa de ser oferecido**: antes, a ponta direita da
  viga aparecia como livre e dava pra montar uma peça DENTRO dela — o detector de
  sobreposição (§8.6-B1) reclamaria depois;
- **a regra D6 passa a enxergar o fechamento**: a face cega de um cubo não vai
  mais parar em cima de uma peça que encosta nele sem ser filha dele;
- **a parafusaria do Caderno fecha**: 32 parafusos, 32 porcas, 64 arruelas no
  pórtico.

> A árvore continua sendo árvore: mexer numa ponta ainda não propaga pela outra.
> O que mudou é que a CONTAGEM não depende mais dela. Propagar por fechamento é
> o dia que o modelo vira grafo — e aí é outra fase.

---

## 9 · As fases

| Fase | Entrega | Trava |
| --- | --- | --- |
| **E0 · Catálogo e motor** ✅ | `services/estrutura/` inteiro — catálogo com procedência, encaixe, snap, montagem, histórico, serialização, métricas. **129 testes em vitest, sem uma linha de 3D.** Nada visível no app | — |
| **E1 · A cena** ✅ | chunk lazy com three.js (**148 KB gzip, fora do precache**), geometria procedural, InstancedMesh + LOD, órbita, grade, seleção por instância. Aba Estrutura com pórtico de exemplo. **Ainda não edita** | E0 |
| **E2 · Montar** ✅ | conectores clicáveis, prévia fantasma, encaixe, giro de 90° (na peça nova e na já montada), apagar, desfazer/refazer, e a montagem gravada em `project.estrutura` (IndexedDB + sync) | E1 |
| **E3 · O relatório** ✅ | **a entrega que o dono pediu**: lista de peças com linha e peso, **peso total**, **medidas reais**, juntas → **parafusaria**, procedência do peso, aviso de responsabilidade e a **vista 3D capturada**. Folha ESTRUTURA no Caderno **e** no PDF, e ela abre no celular | E2 |
| **E3.5 · Consolidação** ✅ | fecha a auditoria do §8.5: **caderno próprio de Estrutura** (e a folha sai do Resumido/Gabinetes), **detecção de sobreposição** por SAT que avisa sem bloquear, **face de entrada** (o conserto do cubo), histórico que atravessa a aba, peça desconhecida que falha alto, imagem que não vira órfã, **seleção múltipla + atalhos + conta-gotas**, e **cor por peça com legenda** na cena e no Caderno | E3 |
| **E3.6 · O ajuste fino** ✅ | §8.7: `V` segurado = modo Ver · **as duas rotações** (`R` gira, `Ctrl+R` troca a face de entrada) e o seletor de face fora da tela · **seta na face cega** do cubo · **paleta do catálogo** por categoria, que também é a legenda · **o piso nunca corta a peça** (nasce apoiada, e a grade desce se algo passar dela) | E3.5 |
| **E3.7 · O gesto de montar** ✅ | §8.8: a peça **nasce ao clicar no piso** e o botão "Adicionar peça" sai (a primária vira a imagem do Caderno) · `Shift+R` no lugar do `Ctrl+R`, que recarregava o navegador · **girar mexe só na peça selecionada**, com os filhos compensados | E3.6 |
| **E3.8 · O cubo também** ✅ | §8.9: girar o **cubo** deixou de arrastar o que está encaixado nele — o filho é **reancorado na face que assumiu a pose antiga** · conserto do **clique no horizonte**, que nascia peça a 20 km | E3.7 |
| **E3.9 · Destravar** ✅ | §8.10: o motor **não decide orientação por ninguém** — fora as consultas que pulavam giro, `R` sempre gira · e a **peça livre passa a girar** (`R` no chão, `Shift+R` tomba), que era o lock que ninguém tinha visto | E3.8 |
| **E3.10 · As seis direções** ✅ | §8.11: a rotação passa a se descrever pelo **piso** (`N · S · L · O · CIMA · BAIXO`), e não pelo eixo da junta · sete regras nomeadas (D1–D7) · **um comando só** (`ACOES.POSE`) · chip da face cega na F3 · teste de **propriedade** provando que girar qualquer peça não move nenhuma outra | E3.9 |
| **E3.11 · A junta se mede** ✅ | §8.12: junta deixa de ser contada na ÁRVORE e passa a ser medida na GEOMETRIA — o pórtico fecha nas duas pontas, e a segunda valia parafuso que não entrava na caixa (8 juntas, não 7) | E3.10 |
| **E4 · Os painéis** | pendurar as telas do projeto na estrutura; o peso da parede aparece somado; a barra de içamento vira peça. **É o diferencial que ninguém tem** | E3 |
| **E5 · A biblioteca do galpão** | o dono cadastra o estoque real — peso pesado na balança, com procedência, igual à biblioteca de gabinetes | E3 |
| **E6 · Backlog** | campo **ART** no projeto · tabela de carga da Feeling *(só com a revisão confirmada)* · **DXF 2D** de planta e elevação · export **GLB** · import/export **MVR** | — |

### 9.1 A ordem tem uma razão

**E0 antes de tudo, sem tela nenhuma.** Todo o risco do projeto está na matemática
de encaixe e no modelo de dados — e os dois são testáveis sem WebGL. Fazer a cena
primeiro é a forma clássica de descobrir tarde que o modelo estava errado.

**E3 é o marco de valor.** Depois dela o módulo já paga o próprio custo mesmo que
E4 nunca aconteça: lista de peças e peso é o que a produção pede.

---

## 10 · O que o app NUNCA vai fazer

Regra dura, do mesmo naipe do "nunca somar fator em cima do WLL" do
[`rigging-pesquisa.md`](./rigging-pesquisa.md):

- **dizer se a estrutura aguenta** — nem com semáforo, nem com "provavelmente";
- **publicar número de carga sem procedência confirmada** — a divergência entre a
  tabela oficial da Feeling (2002, assinada com CREA) e a republicada por terceiros
  chega a **2,5×** no vão de 1 m. Arbitrar entre as duas seria inventar;
- **reaproveitar tabela europeia no P30** — liga diferente (6351-T6 × 6082-T6),
  parede diferente, junta diferente;
- **dizer que a montagem está aprovada**, ou que pode ficar sobre pessoas;
- **substituir o rigger habilitado ou a ART do engenheiro.**

---

## 11 · O que trava, e quem destrava

### ✅ Resolvido em 19/08 — a geometria

O dono entregou o **modelo SketchUp que usa pra projetar**, e a malha foi medida
([pesquisa §4.8](./estrutura3d-pesquisa.md)). Seção 300 · entre-eixos 250 · banzo
Ø50 · diagonal Ø40 · nós a cada 250 mm · diagonais a 51° · cabeceira 25 mm.
**A barra já pode ser gerada em código.** O modelo confirmou também que é Q30
brasileiro de verdade (300), não um F34 europeu rebatizado (290).

✅ **Cubo e sapatas resolvidos (19/08).** Vieram em pastas próprias:
`truss-3d/corner` → cubo de **300³** · `truss-3d/sapata` → **dois modelos de base**,
740×740×55 (baixa) e 742,5×742,5×100 (alta), ambos **750 × 750 nominais**.

✅ **Peso resolvido por ora (19/08).** Fica o proxy da Auratec, marcado como não
conferido. O dono atualiza **peça por peça, na balança**, quando o material estiver
em mãos — **e já incluindo o peso dos parafusos**. O campo `peso.fonte` é o que
carrega essa história.

> ⚠️ **Não contar parafuso duas vezes.** Se o peso da peça já embute a parafusaria,
> a linha de parafusos do relatório é **contagem, não massa** — ela responde
> "quantos levar na caixa", e o peso já está no total. O catálogo precisa de um
> `peso.incluiParafusos: true|false` pra que o motor saiba disso, senão o total
> infla em silêncio. Mesma família de erro do fator-sobre-fator do WLL.

✅ **Catálogo e service worker resolvidos (19/08).** O estoque virou o catálogo
de 10 itens do §3.2, sem P50; o chunk 3D sai do precache (§7.2).

### Nada trava a E0

Todas as decisões de escopo estão tomadas. **A implementação pode começar.**

### Ligações pra Feeling *(comercial@feeling.com.br · (12) 3500-0858)*

1. **Peso por barra** de cada comprimento (o site não publica nenhum) — **é o único
   dado que ainda falta pro relatório**.
2. **A revisão atual das tabelas de carga P30 e P50** — a que existe arquivada é
   de maio/2002 e a versão que circula por terceiros diverge dela.
3. Medidas do **cubo** e da **base** (o site lista as variantes, não as cotas).

### O que dá pra fazer sem esperar

Tudo de E0 a E3. O catálogo nasce com os pesos da Auratec marcados como
**proxy não conferido**, e o Caderno imprime a procedência. **Uma balança e uma
tarde no galpão** substituem qualquer telefonema — e aí o número é dele, não da
internet.
