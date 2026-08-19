# Estrutura 3D — pesquisa de base (2026-08-19)

> Estudo que antecede a implementação do **módulo 3D de estrutura** (box truss) do
> LedLab Core. Objetivo: entender **o que o mercado já resolve**, **o que a
> referência do dono (TrussTool) realmente faz**, **qual stack aguenta um PWA
> offline** e **quais são os dados reais do truss brasileiro**.
>
> O espeque (escopo, modelo de dados, fases) está em
> [`estrutura3d-spec.md`](./estrutura3d-spec.md).
>
> 📚 **Leia junto:** [`rigging-pesquisa.md`](./rigging-pesquisa.md) — a pesquisa de
> 07/2026 sobre carga, WLL e limites de fabricante. Ela continua valendo; este
> documento é o lado da **estrutura**, aquele é o lado da **carga**.
>
> ⚠️ **Segurança:** nada aqui autoriza montagem. Estrutura de evento é
> responsabilidade de **rigger habilitado** e, no Brasil, de **engenheiro com ART
> no CREA**. O app é planejamento e registro — mesma postura do box de segurança AC.

---

## 1 · A referência: o que o TrussTool 3.0 realmente é

O dono apontou o [TrussTool da Global Truss](https://trusstool.com/en/jstool/) como
referência. Ele carrega os scripts publicamente, então deu pra ler a arquitetura
inteira em vez de adivinhar pela tela.

### 1.1 A stack (e a idade dela)

TYPO3 6.1 (CMS de 2013) · jQuery · **three.js muito antigo** (usa
`geometry.vertices`, `material.ambient` e `THREE.Euler` com `_quaternion` — algo
entre r6x e r7x) · helpers THREEx (domevent, screenshot, fullscreen,
windowresize, keyboardstate) · OBJLoader · OrbitControls · Tween.js · stats.js.
**Cada peça é um arquivo OBJ** servido pelo backend. Login e "salvar construção"
usam o `rsaauth` do próprio TYPO3.

### 1.2 O modelo de dados

| Constante | O que é |
| --- | --- |
| `TYPE_F32 = 2` · `F33 = 3` · `F34 = 4` | **o número de banzos** (plana, triangular, quadrada) |
| `CAT_STRAIGHTS · CORNERS · ROUNDED · SPECIAL` | as 4 categorias de peça |
| `GENDER_HYBRID · MALE · FEMALE` | macho/fêmea do spigot (compatibilidade de encaixe) |
| `MODE_SELECT · CONNECT · ALIGN · CONTROL · DIALOG` | a máquina de estados da UI |

O item de catálogo carrega: `id, cls, image, type, category, width/height/depth,
weight (em gramas), angle, diameter, lastused, conns{hasF32,hasF33,hasF34}`.
**Nenhum campo de carga.** A unidade da cena é o **centímetro** (a ficha mostra
`width` em cm e converte peso com um `g2kg()`).

### 1.3 O conector — a peça-chave do desenho

```js
Connector(id, parentTruss, type, gender, face, rollFace, center, correction)
```

- `face` — vetor de **direção** (a normal que sai do encaixe)
- `rollFace` — vetor de **referência de rolagem** (qual banzo é "o de cima")
- `rollLockAngle = 2π / n` → **F32: 180° · F33: 120° · F34: 90°** — os passos
  discretos em que a peça pode girar depois de encaixada
- `isIdle` — conector ainda livre. O total de conexões da obra é
  `(conectores − livres) / 2`

### 1.4 O auto-detector (e por que ele não vai existir aqui)

Como os modelos são OBJ, o TrussTool **descobre o centro exato do encaixe varrendo
os vértices da malha**: projeta "zonas" nas posições esperadas dos banzos e tira a
média dos vértices num raio de 2,8 (≈ 28 mm, o raio do tubo de 50 mm).

Os offsets confirmam a geometria: F34 usa ±12 no `rollFace` e ±12 no produto
vetorial → **240 mm entre eixos de banzo**; F33 usa circunraio 13,85 → triângulo de
lado 240 mm. **Toda a família F3x sai de um parâmetro só.**

> **Consequência pro nosso projeto:** com **geometria procedural** esse módulo
> inteiro é desnecessário. Quem gera a barra já *sabe* onde estão os conectores.
> O auto-detector é dívida de quem escolheu OBJ.

### 1.5 O encaixe — três operações, e é só isso

1. **Direção** — gira a peça nova até `dirNova = −dirAlvo`
   (eixo = produto vetorial, ângulo = `angleTo`; no caso degenerado de 180°,
   gira em torno do `rollFace`).
2. **Rolagem** — gira em torno do eixo do conector até os `rollFace` casarem
   (com um fallback tentando o sentido oposto).
3. **Posição** — translada até os dois centros coincidirem.
   (existe uma variante recuada 5 unidades = o "quase encaixado" da prévia)

Depois disso o usuário gira em passos de `rollLockAngle`.

### 1.6 O que ele entrega — e o que NÃO entrega

**Entrega:** montagem por encaixe · giro em passos · medição · grade · eixos ·
tela cheia · **screenshot** · salvar/carregar na conta · presets · desfazer ·
**peso total** · **caixa envolvente (L×A×P)** · **lista de material** (`Nx CÓDIGO`,
com tradução de espaçadores pro código de loja) · **exportar pro carrinho**.
O projeto serializa como string `q{n}|id#posição#matriz4#nConectores:livres...`.

**NÃO entrega: nenhum cálculo estrutural.** Sem carga, sem vão, sem flecha, sem
ponto de talha. É um LEGO com peso e lista de peças — e o produto real é vender
truss ("DON'T RIG SHIT – TRUST GLOBAL TRUSS!"). Grátis, com cadastro, catálogo
travado em F32/F33/F34, **sem português**, sem offline.

---

## 2 · O mercado — três camadas e um buraco

### 2.1 Configuradores de fabricante (a camada do TrussTool)

| Ferramenta | Empresa | Plataforma | Preço | 3D | Carga | Saída |
| --- | --- | --- | --- | --- | --- | --- |
| **TrussTool 3.0** | Global Truss | web | grátis | ✅ | ❌ | screenshot |
| **TAFtool 5.0** | Truss Aluminium Factory | desktop + tablet + **VR** | grátis, sem limite | ✅ | ❌ | **PDF com 3D + lista de peças + cotas**, e **controle de estoque** |
| **LiteCAD Evolution** | Litec / Area Four | cloud | n/c | ✅ | ❌ | n/c |
| **PLY_demo** | terceiros | plugin SketchUp | n/c | ✅ | ❌ | o que o SketchUp exporta |

> **O TAFtool é o comparável mais direto do que o dono pediu** — "relatório de
> peças, peso e medidas" já existe, validado por outro fabricante, e ainda com
> estoque dentro do projetista.

### 2.2 Calculadoras de carga (sem 3D)

**GT Toolbox** (Global Truss, grátis, iOS/Android) — GT Load Master com ponto
único, UDL e cargas em 1/3, 1/4 e 1/5 do vão, **já considerando peso próprio**;
mais nível de bolha e AR de cubos. **KYLo** (Prolyte) — ponto, UDL e **cantilever**
pra linha inteira. **XSF iTruss** — entra com 3 de 4 parâmetros, devolve o 4º.

O padrão dessa camada: **interpolar a tabela do fabricante**, não fazer FEM.

### 2.3 CAD e previz profissional

| Ferramenta | Preço | Carga estrutural |
| --- | --- | --- |
| Vectorworks Spotlight | **US$ 1.530/ano** | ❌ |
| **+ Braceworks** | ≈ **US$ 2.530/ano** | ✅ FEM + Eurocodes, **o mais forte** |
| WYSIWYG (CAST) | não público | ❌ |
| Capture | €469 a €1.810 | ❌ |
| Depence (Syncronorm) | €2.395 o módulo Stage | ❌ |
| LD Assistant | US$ 1.895 (histórico) | ❌ |
| SkyCiv Structural 3D | US$ 69–109/mês | ✅ FEA na nuvem |
| Realizzer | — | **descontinuado** (2020) |

E o próprio Vectorworks avisa na landing do Braceworks que **não fornece cálculo
certificado** — só engenheiro habilitado fornece.

### 2.4 Open source — o que existe de fato

- **[truss-load-calculator](https://github.com/underdog1234/truss-load-calculator)**
  — o mais próximo do nosso caso: planejamento de vão, cargas de motor, reações,
  motores arrastáveis, fator de carga dinâmica e **verificação contra tabela do
  fabricante com interpolação**. HTML/CSS/JS estático, sem build. **2D.**
- **[ASLS Studio](https://github.com/ASLS-op/studio)** — DMX + visualizador 3D
  WebGL rodando inteiro como app estático. Prova de que 3D pesado cabe nesse formato.
- **[BlenderDMX](https://blenderdmx.eu/)** / **[pymvr](https://github.com/open-stage)**
  — import/export **MVR** completo, com treliças. É a referência de interoperabilidade.
- **[mvrdevelopment/spec](https://github.com/mvrdevelopment/spec)** — **DIN SPEC
  15800 (GDTF 1.2)** e **15801 (MVR 1.6)**, as specs abertas do setor.

> Buscar "rigging" no GitHub traz *rigging de personagem 3D*. Os termos que
> funcionam são **GDTF**, **MVR** e **stage-lighting**.

### 2.5 O lado LED

| Ferramenta | 3D | Estrutura | O que faz |
| --- | --- | --- | --- |
| **Show Tech** | ❌ | peso e point loads, **não verifica a treliça** | potência, processamento, peso, truck pack; Pro faz PDF com marca |
| **LED.FYI** | ✅ 2D e 3D | ❌ | layout, data paths, 300+ painéis, BOM, raster map |
| **ROE Calculator** | ❌ | ballast/empilhamento | tamanho, resolução, potência, cabeamento |
| disguise Designer · Notch · Vioso | ✅ | ❌ | previz de mídia, warp/blend |
| Brompton · Absen | ❌ | ❌ | sem ferramenta de projeto 3D própria |

### 2.6 O denominador comum (o mínimo pra entrar na conversa)

1. catálogo de peças reais com **dimensão e peso unitário**
2. **montagem por encaixe** com orientação válida
3. **peso total + dimensões gerais** calculados na hora
4. **lista de peças** — o artefato que vai pro galpão
5. salvar/carregar projeto
6. métrico e imperial
7. alguma saída visual (screenshot ou PDF)

### 2.7 Os buracos — onde ninguém resolve

**A fronteira LED × estrutura é terra de ninguém.** O lado LED para no peso total
da parede; o lado truss trata a parede como "uma caixa com X kg". Quando o
Braceworks tenta, entra como **carga distribuída** — e a própria documentação do
Vectorworks avisa que editar a parede pra formas complexas **quebra a integração
com os cálculos**. Nos fóruns, riggers relatam modelar a tela **na mão, como série
de cargas pontuais nos pickup points**.

E a física dá razão a eles: a parede **não é UDL**. Ela desce por barras de
suspensão a cada N gabinetes → é um **pente de cargas concentradas**. Carga
pontual no meio do vão **derruba a capacidade pela metade** frente à distribuída.

Some a isso o que some da conta de todo mundo: **ferragem é 15–25% do total**, e
cabo de energia e dados sozinho pesa 20–50 kg num sistema típico.

**Ninguém é offline.** TrussTool, Show Tech e LED.FYI são web; LiteCAD é cloud com
biblioteca que atualiza no login; os apps móveis são calculadoras isoladas.

**Ninguém fala português, e ninguém tem catálogo brasileiro.** O TrussTool tem 8
idiomas, nenhum é PT-BR. As bibliotecas são F32/F34/H30V/QX30SA — e **Q30/P30 não
existe em ferramenta nenhuma**.

---

## 3 · A stack — medida, não estimada

> Números obtidos instalando as libs nas versões de **agosto/2026** e rodando
> builds Vite 8 reais (esbuild, `target: es2022`, React externalizado, gzip -9).
> Versões: `three 0.185.1` · `@react-three/fiber 9.7.0` · `@react-three/drei
> 10.7.8` · `@babylonjs/core 9.21.2`.

### 3.1 Tamanho real (gzip)

| Build | gzip |
| --- | --- |
| three — só a matemática (`Vector3`, `Quaternion`, `Matrix4`, `Box3`, `Ray`) | **29,9 KB** |
| three — cena mínima | 136,9 KB |
| three — editor enxuto (+ InstancedMesh, OrbitControls) | 145,5 KB |
| **three — editor completo** (+ TransformControls, GLTFExporter, LOD, EdgesGeometry) | **187,0 KB** |
| three/webgpu | 233,0 KB |
| **R3F sem drei** | **338,0 KB** |
| R3F + drei realista | 401,9 KB |
| **Babylon core mínimo** | **540,9 KB** |
| Babylon + glTF + gizmos | 897,4 KB |

### 3.2 Os três achados que decidem

**a) Tree-shaking no three é quase inexistente — e isso é bom.** Cena mínima
136,9 KB, biblioteca inteira 198,6 KB. O núcleo é praticamente monolítico: não
vale esforço em "importar só o necessário". O que varia de verdade são os
`three/examples/jsm/*`, esses sim módulos independentes.

**b) O R3F custa +151 KB e anula o tree-shaking.** O `react-three-fiber.esm.js`
faz `import * as THREE from 'three'` pra montar o catálogo de JSX — **você paga o
three inteiro, sempre**. E o R3F 9.5+ **embutiu o reconciler do React** porque o
19.2 quebrou compatibilidade interna com o 19.1.

**c) O `peerDependencies` do fiber 9.7.0 diz `react: ">=19 <19.3"`.** O projeto
está em `react: ^19.2.6` — o caret permite subir pra 19.3, e nesse dia o
`npm install` quebra. Adotar R3F **acopla a cadência de upgrade do React do app
inteiro** a uma lib de terceiros.

### 3.3 WebGPU em 2026 — ainda não

[caniuse](https://caniuse.com/webgpu) dá 84,0% + 1,6% parcial. A
[MDN](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) classifica como
**"Limited availability" — explicitamente não é Baseline**. Custa +46 KB gzip e
obriga materiais de node. Uma cena de truss é geometria simples: o gargalo nunca
vai ser o driver. **`WebGLRenderer`, que tem 100% de alcance.**

### 3.4 Geometria — procedural ganha, e não é perto

Barra P30 de 2 m realista (4 banzos + 24 diagonais), medida:

| Nível | Triângulos | Buffer |
| --- | --- | --- |
| LOD0 treliça (8 segmentos radiais) | 896 | 50,8 KB |
| LOD1 treliça (5 segmentos) | 560 | 33,0 KB |
| LOD2 treliça (3 segmentos, 12 diagonais) | 192 | 12,1 KB |
| LOD3 caixa | 12 | 0,8 KB |

E a cena inteira:

| Barras | InstancedMesh | Geometria clonada |
| --- | --- | --- |
| 200 | 0,06 MB · **1 draw call** | 9,9 MB · 200 draw calls |
| 500 | 0,08 MB · **1 draw call** | 24,8 MB · 500 draw calls |
| 2.000 | **0,17 MB · 1 draw call** | **99,1 MB** · 2.000 draw calls |

Com `InstancedMesh` a geometria sobe uma vez e **cada barra a mais custa 64 bytes**
(uma `Matrix4`). Em GPU mobile cada draw call custa ~0,1 ms de CPU e o orçamento
de quadro a 60fps é 16,6 ms — **~100 draw calls já comem o quadro inteiro só de
overhead**.

Procedural ainda ganha em quatro pontos: peso de rede zero · paramétrico é
requisito (truss vem em N comprimentos) · **os conectores vêm de graça** ·
e recuperação de contexto WebGL vira trivial (a cena se reconstrói do JSON).

⚠️ **`InstancedMesh` não faz LOD sozinho.** O padrão é **um `InstancedMesh` por
nível**, redistribuindo as barras por distância. `BatchedMesh` resolve com menos
ginástica, mas exige declarar totais de vértices adiantado — fica como plano B.

**Capacidade estimada:** 500 barras confortável, 2.000 como teto com LOD ligado.
Uma estrutura real de show raramente passa de 200. *(estimativa por orçamento de
triângulos, não medida em aparelho — medir num Android antes de fechar escopo)*

### 3.5 Exportação

| Formato | Situação |
| --- | --- |
| **GLB / GLTF** | ✅ nativo (`GLTFExporter`, ~20 KB gzip), padrão da indústria |
| **DXF** | ⚠️ **todas as libs JS abandonadas** (`@tarikjabiri/dxf` 2023 · `dxf-writer` 2022 · `dxf-doc` 2021) — **e são 2D de qualquer jeito** |
| **DWG** | ❌ formato fechado da Autodesk, sem caminho em JS |
| **PNG → pdfmake** | ✅ via data URL |

Pro DXF a saída honesta é **escrever à mão**: planta e elevação em LINE, ~50 linhas
de template ASCII, sem depender de lib morta.

⚠️ **A armadilha do screenshot:** por padrão o WebGL descarta o drawing buffer
depois do swap, e `toDataURL()` chamado depois **devolve preto**. A correção é
chamar `render()` e `toDataURL()` **na mesma volta do event loop**, síncrono —
melhor do que ligar `preserveDrawingBuffer`, que penaliza todo quadro. E
renderizar **maior que a tela** (ex. 2000×1400) antes de capturar, senão borra no
papel. Usar o **fundo claro do tema PRINT**, não o escuro do app.

### 3.6 Mobile e o service worker

`setPixelRatio(Math.min(devicePixelRatio, 2))` é a otimização de maior retorno —
DPR 3 renderiza **9× mais pixels** que DPR 1. Sombras: desligadas (não comunicam
nada num editor de truss; `EdgesGeometry` lê melhor e é mais barato). Antialias:
off quando DPR ≥ 2. E **render sob demanda** em vez de `requestAnimationFrame` em
loop — num editor a câmera fica parada quase o tempo todo, e redesenhar pixels
idênticos a 60fps **aquece o aparelho até o SoC baixar o clock**.

⚠️ **O `stampServiceWorker` do `vite.config.js` precacheia tudo em `dist/assets`.**
O chunk 3D seria lazy pro roteador mas **não pra rede**: todo usuário baixaria os
187 KB a cada deploy, mesmo sem abrir a aba. Ver a decisão no espeque §7.
E o regex atual (`js|css|ttf|png|jpe?g`) **não cobre `.glb`** — mais um argumento
pra geometria procedural.

### 3.7 Testabilidade

Verificado rodando em Node puro, sem jsdom e sem mock:

```
setFromUnitVectors OK · compose/decompose OK · Ray/Plane/Box3 OK
WebGLRenderer -> ReferenceError: document is not defined
OrbitControls: IMPORTOU sem erro · GLTFExporter: IMPORTOU sem erro
```

**Toda a matemática do three roda em vitest com `environment: 'node'`.** Só o
`WebGLRenderer` explode, e apenas na construção. Isso sustenta a separação
`motor/` (testado) × `vista/` (não testado) do espeque §4.

⚠️ **`q` e `−q` representam a mesma rotação** — comparar quaternion componente a
componente dá falso negativo. Compare o **efeito** (aplique a 3 vetores base) ou
use `angleTo`.

---

## 4 · O truss brasileiro — os dados reais

### 4.1 A nomenclatura não tem padrão nacional

Cada fabricante inventa a letra. Na **Feeling** (o fabricante do dono):
**D**=Decorativa · **L**=Leve · **P**=Profissional · **R**=coluna de palco.
No mercado geral: **Q**=Quadrada · **P**=alta carga · **L**=aliviada · **T**=triangular.

**O número é a medida externa da seção em centímetros, de tubo a tubo.** Então
**Q30 ≡ P30 ≡ 300×300 mm** e **Q50 ≡ P50 ≡ 500×500 mm** — mesma seção, nome de
linha diferente. O "P50" do dono é a **Profissional Pesada 500×500**.

### 4.2 As linhas da Feeling e os comprimentos de fábrica

| Linha | Seção | Comprimentos (mm) |
| --- | --- | --- |
| D25 Decorativa | 250×250 | 500 a 4000, de 500 em 500 |
| L30 Prof. Leve | 300×300 | 500, 600, 1000, 1500, 2000, 2500, 3000, 3500, 4000 |
| **P30 Profissional** | **300×300** | **200, 300, 400, 500, 600, 700, 800, 1000, 1100, 1200, 1300, 1400, 1500, 2000, 2400, 2500, 3000, 3500, 3700, 4000, 5000, 5500, 6000** |
| R30 Coluna de palco | 300×300 | 1000, 2000, 3000, 4000, 5000 |
| **P50 Prof. Pesada** | **500×500** | **1000, 2000, 2000 reforçada, 2500, 3000, 4000** |
| P76 | 760×660 | 2360, 2450 |

**Cubos P30:** 2 faces a 15° · 2 em L · 3 em U · 3 a 45° · 3 em L · 4 · 4 opostas ·
**5 faces** · **6 faces** · blocos laterais 15° e 22,5° · cumeeira 4 faces.
**Cubos P50:** 3 em L · 3 em U · 3 a 45° · 4 · 4 opostas · 5 faces · **e três
variantes com redução pra 300 mm**.

**Bases:** P30/L30/R30 = **750×750 mm**, em tubo retangular 3×2 ou 4×2 ou redondo
2", **com ou sem sapata** (códigos distintos). D25 = 550×550×60.

**Sleeve blocks:** P30 = 515×520, 4 faces · P50 = 515×519×519, 4 faces.

**Pau de carga:** existe em versão talha manual e motor elétrico pra D25/L30/P30 —
**a P50 não tem** no catálogo, só dobradiça e sleeve block.

**Adaptadores de redução:** 380×300 · **500×300 (P50→P30)** · 760×300 · 760×380.

### 4.3 A ficha técnica — o que a Feeling não publica

A Feeling **não publica diâmetro de tubo, parede, liga nem peso**. Toda página de
linha termina em *"para informações sobre a carga, favor consultar nosso
Departamento Comercial"*. O que o mercado publica pra **mesma seção**:

| Dado | P30 / Q30 | P50 / Q50 |
| --- | --- | --- |
| Externo | 300×300 mm | 500×500 mm |
| Liga | **6351-T6** | **6351-T6** |
| Banzo Ø × parede | **2" × 2,40 mm** (50,8) | **2" × 3,17 mm** (50,8) |
| Variante "linha pesada" | 2" × 1/8" (3,175) + cabeceira em cantoneira L 4"×1/8", solda TIG | — |
| Diagonal | **NÃO PUBLICADO** | **NÃO PUBLICADO** |
| Entre-eixos | **249,2 mm** *(derivado: 300 − 50,8)* | **449,2 mm** *(derivado)* |

Confirmação normativa independente: edital público exige *"box truss P-30 em liga
estrutural 6351-T6, conexões de solda AWS D1.2 e conexões mecânicas ASTM A325"*.

> **A regra do entre-eixos é `externo − Ø do banzo`, não uma constante.** Nos
> europeus: Milos M290 publica 290/240 · Prolyte X30V 290/239 (tubo 51) · H30V
> **287**/239 (tubo 48). **X30 e H30 têm o mesmo entre-eixos e externos
> diferentes** — por isso `entreEixos` tem que ser campo próprio, nunca derivado.

### 4.4 Peso — duas classes convivem sob o mesmo nome

A Feeling não publica peso. A **Auratec** (Betim-MG) publica ficha item a item pra
mesma seção e mesma fixação:

| Peça | 0,5 m | 1 m | 1,5 m | 2 m | 3 m | 4 m |
| --- | --- | --- | --- | --- | --- | --- |
| **Torre P30** | 10 kg | 13 | 17 | 22 | 30 | 38 |
| **Torre P50** | 14 kg | 20 | 26 | — | — | — |

Derivando: **P30 ≈ 8,0 kg/m + ~5,0 kg fixo de cabeceira** · **P50 ≈ 12,0 kg/m +
~8,0 kg fixo**. Os pesos Auratec são perfeitamente lineares acima de 1 m.

Outras peças (Auratec): cubo 5 faces P30 (300³) = **12 kg** · cubo 5 faces P50
(500³) = **22 kg** · base 800×800×50 P30 = **8 kg** · sleeve block 4 faces P30
(500³) = **19 kg** · sleeve com adaptação P50 (600³) = **25 kg** · pau de carga
manual P30 = **6 kg** · cumeeira 15° 4 faces 900 mm = **25 kg**.

⚠️ **Duas classes de peso sob o nome "Q30/P30":**
- **pesada** (Auratec AL-P30, Petruss Q30) — ~8,0 kg/m + 5 kg → 1 m = 13 kg
- **leve** (locadoras) — 7,0 kg/m linear puro → 1 m = 7 kg, quase metade

**Pesar uma barra do estoque calibra tudo.**

### 4.5 A fixação — a chave 27 confere

**Parafuso passante com porca e arruelas** — não é spigot cônico. Duas fontes
independentes (Auratec e MultItens) publicam a mesma especificação:

> **Parafuso estrutural 5/8" × 2" ASTM A325 zincado sextavado, chave 27** ·
> porca 5/8" **A194-2H**, chave 27 · arruela 5/8" lisa **F-436**, **2 por parafuso**.

**Chave 27 = parafuso 5/8" A325.** Não é M18 nem 3/4". Serve pra P30 **e** P50
(as linhas menores usam 1/2" ou 3/8").

**Por junta:** os jogos das linhas menores vêm como 4 parafusos + 4 porcas + 8
arruelas, e o kit AL-P30 de 4×6 m (7 torres + 2 bases = 8 junções) lista
"08 jogos" → **1 jogo = 1 junta = 4 parafusos, um por banzo**.
*(a composição do jogo é catálogo; a equivalência jogo↔junta é inferida)*

### 4.6 Tabelas de carga — a Feeling **já publicou**, e hoje não publica mais

Recuperada do arquivo do próprio site: **tabela oficial da linha P-30, assinada
pelo Eng. Cláudio K. Iochimoto, CREA-SP 5061099450, revisão maio/2002.**

| Vão (m) | TOTAL (kgf) | UDL (kgf/m) | CPL (kgf) | Flecha (mm) |
| --- | --- | --- | --- | --- |
| 1 | 1791 | 1791 | 597 | 0,09 |
| 2 | 1672 | 836 | 557 | 0,60 |
| 3 | 1641 | 547 | 547 | 1,78 |
| 4 | 1570 | 393 | 523 | 3,83 |
| 5 | 1472 | 294 | 491 | 6,96 |
| 6 | 1246 | 208 | 489 | 11,33 |
| 8 | 957 | 120 | 479 | 24,48 |
| 10 | 718 | 72 | 359 | 44,44 |
| 12 | 400 | 33 | 200 | 72,36 |
| 14 | 190 | 14 | 95 | 116,88 |

*(a tabela completa traz também DPL/TPL/QPL — 2, 3 e 4 cargas pontuais)*

A **L-30 vale ~metade da P-30** em quase todo vão (6 m: 623 × 1246 kgf).

⚠️ **E aqui mora o problema.** A **LPL Professional Lighting** republica tabelas
"Fonte: Feeling Structures" — inclusive uma de **P50**, a única que existe. Mas a
**P30 da LPL não bate com a oficial da Feeling**: 1 m = 4400 kg contra 1791 kgf;
6 m = 800 contra 1246. Só convergem em 12 m. A da LPL tem flecha = L/200 exata e
CPL = UDL/2 exato — **cheira a tabela derivada por fórmula**; a da Feeling é
assinada por engenheiro com CREA.

> **Conclusão: nenhum número de carga entra no app sem a revisão atual confirmada
> pelo comercial da Feeling.** A divergência é grande demais pra arbitrar sozinho.

### 4.7 Compatibilidade

**L30, P30 e R30 encaixam entre si.** Prova pelos códigos de peça da própria
Feeling: a página da L-30 lista **a mesma base (00-05-0083-1 / 00-05-0089-1) e o
mesmo sleeve block (00-05-0440-1)** que a página da P-30. Peça idêntica servindo
as duas ⇒ mesma pegada 300×300 e mesma furação.

O que muda: **L30 = metade da carga** · **P30 = treliçada nas 4 faces** · **R30 =
treliçada em 3 faces com tubo reforçado** (a face aberta é proposital, pra acesso).

**P30 × P50 não encaixam direto** — precisam de adaptador 500×300, cubo P50 com
redução, ou sleeve block P30 com adaptação P50.

**P30 × Global Truss F34 não encaixam.** 300 × 290 mm, tubo 2"×2,40 × 50×2, liga
6351-T6 × 6082-T6, parafuso A325 × spigot cônico. **Nada é adaptável de prateleira
— e nenhuma tabela de carga europeia vale pro Q30.**

### 4.8 A geometria MEDIDA — o modelo da casa (2026-08-19)

> O dono não conseguiu ficha técnica da Feeling, mas entregou **o modelo SketchUp
> que ele usa pra projetar hoje** ("uma linha bem próxima deles"), exportado em
> OBJ/DAE/STL: `C:\_claude\files\truss-3d\linhas-retas`. Os números abaixo foram
> **medidos na malha**, não lidos de catálogo.

**Procedência:** `modelo SketchUp da casa, linha próxima à Feeling` — **não** é
catálogo Feeling. Vale pra desenhar; não vale como especificação do fabricante.

#### O que o modelo mede

| Grandeza | Medido | Confere com |
| --- | --- | --- |
| **Seção externa** | **299,6 mm** → 300 | ✅ Q30/P30 brasileiro (300). **Não é F34 europeu**, que seria 290 |
| **Entre-eixos dos banzos** | **250,0 mm** | as travessas medem exatamente 250, e a diagonal do quadrado dá **353,6 = 250 × √2** |
| **Ø do banzo** | **50 mm** (300 − 250) | o real é 2" = **50,8** — o modelo arredondou (ver nota) |
| **Ø da diagonal e da travessa** | **40 mm** | 🔺 nenhum fabricante publica esse número |
| **Passo dos nós** | **250 mm** ao longo do comprimento | picos de densidade em 0 · 250 · 500 · 750 · 1000 · 1250 … e depois **250 a partir da outra ponta** (1475 · 1725 · 1975) |
| **Ângulo das diagonais** | **≈ 51°** em relação ao eixo da barra | detectado pelas normais das faces |
| **Cabeceira** | ~**25 mm** de espessura em cada ponta | os nós em 25 e em L−25 |

> ⚠️ **Nota do Ø50 × 2".** O modelo desenha tubo de **50 mm redondo**, o que dá o
> entre-eixos limpo de 250. O tubo real brasileiro é **2" = 50,8 mm**, o que daria
> 249,2. **Adotar 250 / Ø50 no desenho** — 0,8 mm é invisível e 250 casa exatamente
> com o passo dos nós. O 2" fica registrado como a medida real do tubo.

#### Os comprimentos que existem no modelo

`0,2` · `0,5` · `0,6` · `1` · `1,5` · `2` · `2,5` · `3` · `3,5` · `4` · `5` · `6` m
(nomes lidos do DAE; o de 0,2 m está no arquivo mas não foi colocado na cena)

⚠️ O componente `q30 - 1,5m` mede **1.420 mm** na malha, e é o único que não bate.
**Resolvido (dono, 19/08): a peça está errada no desenho** — provavelmente mexida
sem querer. **Vale 1.500.** Ver a regra de medidas nominais no espeque §5.3.

#### Cubo — `truss-3d/corner`

| Grandeza | Medido |
| --- | --- |
| **Cubo** | **300 × 300 × 298,5 mm** → cubo de **300³** |

Confirma a previsão: o cubo é um bloco do lado da seção, com um conector por face.

#### Sapatas — `truss-3d/sapata` (dois modelos)

| Componente | bbox medido | Leitura |
| --- | --- | --- |
| `base_baixa` | **740 × 740 × 55 mm** | **modelo A — base baixa** |
| `Group1` | **742,5 × 742,5 × 100 mm** | **modelo B — base alta** |
| `Group3` | 304,5 × 110 × 297,6 | o tarugo de 300 que recebe a barra |
| `Group4` | 294,5 × 38 × 290 | chapa intermediária |
| `Group5` | 250 × 250 × 20 | chapa (a mesma que aparece solta em `linhas-retas`) |

**740 e 742,5 batem com os 750 × 750 nominais do catálogo Feeling.** Adotar **750**
(regra do §5.3 do espeque).

#### O que isso destrava

A **geometria procedural da barra** sai inteira desses números: 4 banzos de Ø50 num
quadrado de 250, travessas e diagonais de Ø40 a cada 250 mm, diagonais a 51°,
cabeceira de 25 mm. **É o dado que nenhum catálogo do mundo publica**, e é o que
separa uma barra que parece truss de uma barra que é aquele truss.

### 4.9 Preço de referência (venda, ago/2026)

Torre P30: 1 m R$ 856–1.300 · 2 m R$ 1.327–2.300 · 3 m R$ 1.675–2.800 ·
4 m R$ 2.120–3.700. Torre P50: 1 m R$ 1.241–1.700 · 3 m R$ 2.380 · 6 m R$ 4.119.
Cubo 5 faces P30 R$ 1.550 · P50 R$ 2.500. Base 80×80 R$ 1.200.
Ordem de grandeza: **R$ 550–930/m no P30** e **R$ 690–1.860/m no P50**.
**Tabela de locação em R$/m: não publicada** — o mercado orça sob consulta.

---

## 5 · Normas

### 5.1 Internacionais

| Norma | O que é | Situação |
| --- | --- | --- |
| **EN 1999 / Eurocode 9** | projeto de estruturas de alumínio | a base de cálculo europeia (Prolyte e Milos declaram conformidade). ⚠️ 1ª geração sai em **30/03/2028** |
| **DIN 4113** | estruturas de alumínio (alemã clássica) | **substituída** pela EN 1999-1-1; ainda aparece em certificado de garra |
| **ANSI/ESTA E1.2** | **treliças e torres de alumínio** no entretenimento — nomeia head block, sleeve block, base, corner block | **E1.2-2021**, a norma americana do truss |
| **ANSI/ESTA E1.21** | **estruturas temporárias ao ar livre** | **E1.21-2024**, referenciada pela E1.2 |
| **EN 17206** | máquinas de palco (talhas, movimentação) | substituiu a DIN 56950-1; cobre explicitamente **truss, ground support e torres em eventos** |

⚠️ A **Milos** declara: *"todos os dados de carga devem ser multiplicados por 0,85
para atender BS 7905-2 e ANSI E1.2"* — **18% de diferença** entre a convenção
europeia e a americana.

### 5.2 Brasil — o achado que importa

**Não existe NBR de projeto de estruturas de alumínio.** A NBR 8800 (revisada em
2024) é explicitamente **aço e mistas aço-concreto**. O documento do CONFEA sobre
eventos temporários confirma: os requisitos caem em normas gerais e **as
especificações do fabricante e as diretrizes internacionais suprem o resto**.

| Instrumento | Aplicação |
| --- | --- |
| **ART / CREA** | **obrigatória** — projeto, montagem e laudo. É o principal instrumento legal |
| **NBR 6120** | ações e cargas |
| **NBR 6123** | **forças de vento** — crítica em parede de LED (área de vela enorme) |
| **NBR 8800 / 14762** | estruturas de aço (torres, bases, ground support) |
| **IT do Corpo de Bombeiros estadual** | ex. **IT-33 (CBMMG)** "Eventos Temporários" — é o que o fiscal cobra na porta |

**As falhas recorrentes apontadas pelo CONFEA:** ausência de ART, mão de obra não
qualificada e improvisações estruturais.

> 💡 **Isso vira feature.** Um campo **ART** no projeto (número + responsável +
> CREA), com o Caderno imprimindo "sem ART" quando vazio, ataca exatamente a
> falha nº 1 do setor — e é **registro**, que é o que a gente faz bem.

---

## 6 · Fontes

**TrussTool** — [jstool](https://trusstool.com/en/jstool/) · scripts públicos em
`typo3conf/ext/trusstool/Tool/tt3d/` · [prolighting.de/trusstool](https://www.prolighting.de/en/trusstool)

**Mercado** — [TAFtool](https://taftool.com/) · [LiteCAD Evolution](https://www.areafourindustries.com/media/press-releases/discover-the-litecad-evolution-cad-truss-structure) · [Braceworks](https://www.vectorworks.net/en-US/braceworks) · [Vectorworks — LED walls](https://app-help.vectorworks.net/2026/eng/VW2026_Guide/EventDesign1/Creating_LED_walls.htm) · [WYSIWYG 2026](https://cast-soft.com/WYSIWYG-2026/) · [Capture](https://www.capture.se/Products/News-in-2022) · [Depence](https://www.syncronorm.com/products/depence2/licensing) · [SkyCiv rigging](https://skyciv.com/industries/rigging/) · [Show Tech](https://www.showtechapp.com/) · [Show Tech — LED rigging](https://www.showtechapp.com/guides/led-rigging-structural) · [LED.FYI](https://led.fyi/) · [ROE Calculator](https://plsn.com/newsroom/all-news/introducing-the-roe-calculator-app-your-ultimate-companion-for-led-screen-prepping/) · [GT Toolbox](https://apps.apple.com/au/app/global-truss/id508719976) · [KYLo](https://www.fast-and-wide.com/equipment-releases/mobile-applications/3691-prolyte-kylo-know-your-load-calculator) · [XSF iTruss](https://www.xsftruss.com/itruss-mobile-app/)

**Open source** — [truss-load-calculator](https://github.com/underdog1234/truss-load-calculator) · [ASLS Studio](https://github.com/ASLS-op/studio) · [BlenderDMX](https://blenderdmx.eu/) · [mvrdevelopment/spec](https://github.com/mvrdevelopment/spec) · [Perastage](https://github.com/PeramatoG/Perastage)

**Stack** — [caniuse WebGPU](https://caniuse.com/webgpu) · [MDN WebGPU](https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API) · [three.js InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) · [BatchedMesh](https://threejs.org/docs/pages/BatchedMesh.html) · [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html) · [Codrops — Instances](https://tympanus.net/codrops/2025/07/10/three-js-instances-rendering-multiple-objects-simultaneously/) · [Draw calls](https://threejsroadmap.com/blog/draw-calls-the-silent-killer) · [TransformControls no raycast](https://discourse.threejs.org/t/transformcontrols-is-always-retrieved-when-using-raycast/41849) · [Raycaster no mobile](https://discourse.threejs.org/t/raycaster-on-mobile/65703) · [webglfundamentals — screenshot](https://webglfundamentals.org/webgl/lessons/webgl-tips.html) · [pdfmake — imagens](https://pdfmake.github.io/docs/0.1/document-definition-object/images/) · [@tarikjabiri/dxf](https://www.npmjs.com/package/@tarikjabiri/dxf)

**Truss BR** — [Feeling — box truss](https://www.feeling.com.br/estruturas-em-aluminio-boxtruss/) · [Feeling — tabela P30 (arquivo, 2002)](http://web.archive.org/web/20030423082858/http://www.feeling.com.br/download/TabelasFeelingp30.PDF) · [Feeling — tabela L30 (arquivo)](http://web.archive.org/web/20030224173533/http://www.feeling.com.br/download/TabelasFeelingl30.PDF) · [LPL — tabela P50](https://www.lpl.com.br/pt/ferramentas/tabela-de-cargas-de-linha-p50.html) · [Auratec — loja](https://loja.auratec.com.br/) · [MultItens — parafusos ASTM](https://multitensnotavel.com.br/products/parafusos-astm-p30) · [Petruss Q30](https://www.petruss.com.br/box-truss-q30) · [Equipashow — nomenclatura](https://equipashow.com.br/ver2/arquivos/318)

**Truss internacional** — [Prolyte H30V PDS](https://www.prolyte.com/getmedia/d41813c5-e5c5-46cf-982f-76c17ddea6fb/Product-Data-Sheet-H30V.pdf.aspx) · [Prolyte couplers 2022](https://prostage.no/media/multicase/documents/pdf%20prolyte/prolyte%20catalogue%202022%20couplers%20and%20acc.pdf) · [Milos M290](https://www.milos-systems.co.uk/getmedia/5969b17c-98dd-498c-89b5-ae4a92518b93/M290-regular.pdf.aspx?ext=.pdf) · [Global Truss F34 load span 2026](https://www.globaltruss.com/pub/media/cpsdownloads/downloads/f/3/f34_load_tables-2026.pdf) · [ROE Carbon specs](https://www.roevisual.com/uploads/Images/Products/Carbon/cb-specs.pdf)

**Normas** — [ANSI E1.2-2021](https://blog.ansi.org/ansi/ansi-e1-2-2021-aluminum-trusses-and-towers/) · [ANSI E1.21-2024](https://blog.ansi.org/ansi/ansi-e1-21-2024-temporary-structures-outdoor-events/) · [EN 17206](https://en17206.com/) · [CONFEA — diretrizes eventos temporários](https://www.confea.org.br/midias/uploads-imce/DIRETRIZES%20SOBRE%20AS%20ATIVIDADES%20T%C3%89CNICAS%20DE%20ENGENHARIA%20EM%20EVENTOS%20TEMPOR%C3%81RIOS%20E%20A%20FORMALIZA%C3%87%C3%83O%20DE%20SUAS%20RESPONSABILIDADES.pdf) · [CONTECC 2025](https://www.confea.org.br/midias/uploads-imce/CONTECC2025/CIV/ESTRUTURAS_PARA_EVENTOS_TEMPOR%C3%81RIOS_UM_OLHAR_T%C3%89CNICO.pdf) · [IT-33 CBMMG](https://www.bombeiros.mg.gov.br/storage/files/shares/intrucoestecnicas/IT_33_3a_Ed_portaria_61_errata_42.pdf) · [PCC Rigging Guidelines](https://www.paconvention.com/assets/doc/PCC-Rigging-Guidelines-and-Regulations-Updated-December-2020-1a404bc292.pdf)
