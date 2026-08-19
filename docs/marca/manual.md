# Manual de Marca & Sistema — LedLab Core

> **Regra zero (uso): não inventa.** Antes de criar qualquer coisa nova de
> interface — cor, ícone, modal, toast, componente, espaçamento, texto — **leia
> este manual e implemente o que ele manda**. Caso não coberto → o manual
> absorve o caso (proposta → aprovação do dono → commit aqui), nunca uma
> exceção solta no código.
>
> **Regra zero (projeto): o domínio acima da estética.** O LedLab não é app de
> consumo; é ferramenta técnica. Densidade de informação importa mais que
> espaço em branco generoso — mas precisão de toque num evento ao vivo é
> inegociável. **Tudo o que se toca respira; tudo o que se lê pode ser adensado.**

Arquivos: `docs/marca/manual.md` (esta — a lei, lida pela IA) ·
`manual.html` (visual) · `CLAUDE.md` aponta pra cá.

---

## 1 · A marca

- **Logo**: "led/lab" empilhado, tinta **preta** sobre bloco **lime**, cantos
  arredondados. `src/assets/logo.png` (app) · `ledlab-square.png` (relatório).
- Respiro mínimo = altura do "l". Tamanho mínimo 24 px. Nunca: recolorir,
  esticar, sombrear, lime sobre claro sem contraste.
- Escreve-se **LedLab Core** (produto), **led/lab** (marca gráfica).

## 2 · Cor — três ecossistemas independentes

O app opera em TRÊS temas de cor que não se misturam: **Palco** (escuro,
padrão), **Sol** (claro de alto contraste) e **Print** (o Caderno Técnico no
papel). Mais as **paletas funcionais** (cabos, disciplinas), que são de
engenharia e ficam fora da marca.

### 2.1 Cores da marca
| Nome | Hex | Uso |
|---|---|---|
| **Lime LedLab** | `#ebf51e` | identidade + ação primária (Palco) |
| **Preto LedLab** | `#111111` | tinta da marca; primária no Sol |

**Leis do lime**: sobre lime a tinta é SEMPRE preta (`accInk`). Lime nunca é
texto sobre fundo claro. Lime **nunca significa estado** — estado tem cor
própria (§2.5). No papel, lime vira **oliva** (§2.4).

### 2.2 Tema PALCO (escuro, padrão) — tokens `T`
Feito pra operar na house mix. Fundos quase-pretos **neutros** (nunca
azulados/roxos — fadigam menos).

| Token | Hex | Papel | equivalente Material |
|---|---|---|---|
| `bg` | `#0f0f0d` | fundo do app | background |
| `sb` | `#131311` | sidebar/painéis | surface-container-low |
| `card` | `#191917` | cartão | surface |
| `card2` | `#121210` | campo/controle em cartão | surface-variant |
| `bd` | `#2b2b26` | borda | outline |
| `bdA` | `#5a5f14` | borda de destaque | outline-variant |
| `acc` | `#ebf51e` | **ação primária** | primary |
| `accInk` | `#111111` | tinta sobre acc | on-primary |
| `acM` | `#e3ee45` | acento de texto/ícone | on-primary-container |
| `acL` | `#f2f877` | realce fino | — |
| `sel` | `#272b0d` | fundo selecionado | primary-container |
| `txt` | `#ececea` | texto principal | on-surface |
| `mut` | `#a6a69c` | texto suave | on-surface-variant |
| `dim` | `#72726a` | apagado | on-surface-dim |
| `dim2` | `#4e4e47` | guias | — |
| `strip` `#1b1d10` · `hero` `#191b0e` · `indBg` `#20230d` · `zebra` `#151513` | | faixas/fundos | — |

> A nomenclatura no CÓDIGO segue `T.*` (não renomear pra md-sys — o mapeamento
> acima existe pra raciocinar em papéis, não pra refatorar).

### 2.3 Tema SOL (claro, alto contraste)
Feito pra montagem de dia no pátio. O lime como fundo no claro fica cego —
**a marca INVERTE**: primária quase-preta `#161711` com tinta LIME.

| Token | Hex |
|---|---|
| `bg` `#f4f4ee` · `sb` `#e9e9e1` · `card` `#ffffff` · `card2` `#ecece4` | fundos |
| `bd` `#a9a99b` | borda FORTE (no sol, sombra não existe — borda trabalha) |
| `acc` `#161711` / `accInk` `#ebf51e` | primária preta, tinta lime |
| `acM` `#5c6600` · `acL` `#454d00` | acentos oliva |
| `txt` `#141410` · `mut` `#3c3c34` · `dim` `#5c5c52` · `dim2` `#8c8c80` | textos |
| `sel` `#e7ecc0` · `strip` `#eef0d8` · `zebra` `#ebebe4` | fundos lime-claros |

### 2.4 Tema PRINT (o Caderno Técnico) — tokens `PRINT`
**O Caderno não é o app.** Papel branco, tinta preta, acento **oliva**.

| Token | Valor | Nota |
|---|---|---|
| `ink` `#0f172a` · `mut` `#475569` · `dim` `#64748b` | tintas | |
| `line` `#e2e8f0` · `head` `#f1f5f9` | réguas/cabeçalhos | |
| `acc` | **`#4d5500` (oliva)** | era roxo; oliva encontra a capa lime |
| `grn` `#047857` · `amb` `#b45309` · `red` `#b91c1c` | semânticas de papel | |

**Leis do Print** (§10 detalha): zebrado obrigatório em tabela longa; aviso de
segurança é LARANJA (nunca vermelho — vermelho no papel = falha, não
precaução); dado técnico em mono; a capa é a ÚNICA área lime do papel.

### 2.5 Semânticas (INTOCÁVEIS — engenharia)
| Papel | Palco | Sol | Print | Regra |
|---|---|---|---|---|
| OK / dentro do limite | `#34d399` | `#047857` | `#047857` | verde é veredito |
| Aviso / precaução | `#fb923c` | `#b45309` | `#b45309` | **LARANJA** (saiu o amarelo: colava no lime) |
| Estouro / falha / destrutivo | `#f87171` | `#b91c1c` | `#b91c1c` | vermelho SÓ problema real |
| "Info" | — | — | — | **não existe cor info** (sem azul avulso); informação usa neutros + acento |

### 2.6 Paletas funcionais (fora da marca)
- **Cores de cabo** (`PALETTE`): identificação técnica policromática das portas
  1..N nos diagramas — configurável pelo usuário. Default atual mantido por
  continuidade de campo (os mapas reais já usam). Não segue tema.
- **Disciplinas do relatório** (produção slate / vídeo azul / elétrica laranja):
  mantidas — são sinalização editorial do Caderno.

### 2.7 Contraste (lei)
Texto ≥ 4.5:1 · texto grande/ícone ≥ 3:1 · lime sobre branco NUNCA · no Sol,
tudo se resolve em quase-preto sobre claro; sem sombras (borda forte no lugar).

## 3 · Tipografia

- **UI**: `system-ui` (o app é PWA; a fonte é a do sistema).
- **Mono** (`ui-monospace`): **TODO dado técnico** — px, W/kVA/A, grades
  (`24×14`), coordenadas, specs. Número técnico fora do mono é erro. A leitura
  cruzada de matrizes (tabelas de porta, planilhas) depende do alinhamento mono.
- **Escala** (px): 10-11 legendas CAPS (spacing 0.04-0.08em) · 12-12.5 apoio ·
  13-13.5 controles · 14 corpo · 15 título de cartão · 17 título de página
  mobile · 18-20 desktop. Pesos 400 / 600 / 700 / 800 (marca).
- Inputs mobile ≥16px (anti-zoom iOS). 100% PT-BR (§12).

## 4 · Espaçamento, densidade e toque

- **Escala de espaço** (px): `2 · 4 · 6 · 8 · 10 · 12 · 16 · 24 · 32`. Valores
  fora da escala não nascem.
- **Raios**: 6-8 controles · 8 botões/inputs · 10-12 cartões · 14-16 modais ·
  999 pills. Nada além.
- **Espremível (alta densidade)**: matrizes numéricas, tabelas, grids de specs,
  formulários em lote — gap 4-8, células com padding mínimo, inputs 36px.
- **INTOCÁVEL (respiro tátil — Lei de Fitts)**: navegação, primárias, toggles,
  lixeiras. **Área de toque real ≥ 44×44** (abas/navegação) e ≥ 38px (toolbar
  densa) — se o desenho é menor, EXPANDE a área clicável (padding/minHeight;
  em CSS de classe, pseudo-elemento de hitbox).
- Regra-síntese: **o que se toca respira; o que se lê adensa.**

## 5 · Ícones

### 5.1 Regras
1. **1 ícone = 1 significado** (o catálogo é contrato; sem reuso, sem duplicata).
2. **Inegociável (domínio)**: conceito do negócio (numeração, regiões, ordens
   zigzag/serpente…) mora em `LedIcons.jsx` — viewBox 24, stroke 1.8,
   `currentColor`. **Negociável (utilitário)**: ações genéricas vêm do lucide.
3. Tamanhos: 13-14 inline · 15-16 botões · 18-22 navegação · maior só em vazios.
4. Botão só-ícone SEMPRE com `title` + `aria-label`. Em navegação, ícone nunca
   anda sem rótulo.
5. Toggle de exibição = ícone com estado (`aria-pressed`; aceso = `sel`+`acM`).

### 5.2 A tríade dos ajustes (lei)
| Ícone | Significado | Abre |
|---|---|---|
| `SlidersHorizontal` | ajustes de **VISUALIZAÇÃO** (como se vê) | LightModal |
| `Settings2` | **avançado do CONTEXTO** (a Screen/item atual) | LightModal |
| `Settings` | **Configurações GLOBAIS** | Drawer |

### 5.3 Catálogo (significados fixos)
**Navegação:** `LayoutDashboard` Visão Geral · `CalendarDays` Agenda ·
`FolderOpen` Projetos · `Coins` Cachês · `Receipt` Recibos · `Wallet`
Reembolso/Financeiro · `Package` Gabinetes · `Cpu` Equipamentos/controladora ·
`GitBranch` sinal (Cabeamento, Diagramação) · `Monitor` Test Card · `Ratio`
Aspect Ratio · `BookOpen` Conhecimento · `Home` Início · `Boxes` Gestão ·
`Wrench` Ferramentas/Mais.

**Abas do projeto:** `Folder` Dados · `Zap` Energia/AC (elétrica em geral) ·
`Layers` Screens · `GitBranch` Cabeamento · `FileText` Relatório · `Monitor`
Test Card · `LayoutGrid` Composição · `Frame` **Estrutura** (box truss).

> ⏳ **`Frame` = Estrutura — PROPOSTA, aguardando o dono** (19/08/2026). O
> catálogo não cobria estrutura de truss e a REGRA ZERO manda o manual absorver o
> caso em vez de abrir exceção no código. `Frame` é um quadro fechado: lê como
> pórtico, não colide com `LayoutGrid` (Composição) nem com `Layers` (Screens).
> Alternativas descartadas: `Construction` (lê como obra civil, não palco) e
> `Grid3x3` (já é vocabulário de grade/canvas no app).

**Ações:** `Plus` criar · `Trash2` excluir · `Pencil` editar · `Copy` copiar ·
`Download` exportar/baixar · `Upload` importar · `Save` salvar predefinição ·
`Printer` imprimir · `Eraser` limpar tudo · `Undo2` desfazer · `Repeat2`
inverter · `RotateCcw` restaurar padrão · `Wand2` automático/sugerir · `X`
fechar/remover · `Check` confirmado · `Search` buscar · `GripVertical` arrastar ·
`ArrowLeft` voltar · `Columns3`/`Rows3` layout de lista.

**Estado:** `TriangleAlert` aviso · `CircleCheck` ok · `CircleX` erro/cancelado ·
`Clock` pendente · `Activity` andamento · `Info` informação · `ShieldCheck`/
`ShieldAlert` armazenamento · `Sparkles` novidades · `Gauge` certificado ·
`ChevronsUp` overclock (arredondar limite pra cima, por escolha — estado
âmbar "risco escolhido", entre o ok e o estouro vermelho; nunca usar pra
outra coisa).

**Tema/privacidade:** `Sun`/`Moon` · `Eye`/`EyeOff` (valores R$).
**Campo:** `MapPin` GPS · `Play`/`Square` abrir/fechar turno · `Camera`
comprovante · `Cloud` sync.
**Domínio (LedIcons):** `IconNumeros` · `IconInfoBox` · `IconLadoALado` ·
`IconRegioes` · `NumberingIcon` (8 ordens zigzag/serpente).

## 6 · Superfícies (modais, folhas, drawers)

| Superfície | Quando | Nunca |
|---|---|---|
| **LightModal** | ajustes de contexto, pickers, "?" no mobile. Card centrado, NÃO cobre a tela — o projeto continua visível atrás | conteúdo longo, multi-etapa |
| **BottomSheet** | SÓ a lista do `Select` no mobile + menus da bottom nav | ajustes |
| **Drawer** | Configurações globais, painéis página-inteira | ajuste rápido |
| **confirm()** | TODA ação destrutiva — **nomeando o alvo e o efeito** ("\"AD Summit\" será removido. Não pode ser desfeito.") | ação reversível |
| **prompt()** | pedir um texto curto | formulários |
| **UpdateModal** | novidades, 1× por versão | outro anúncio |

- **Scrim**: `rgba(0,0,0,.55)` (dialogs) / `.35-.5` (superfícies leves); o
  dialog destrutivo usa o scrim mais denso.
- **Z-order (lei)**: `fab 55 < bottomNav 60 < sheet/lightModal 90 < drawer 95 <
  dialog 100 < toast 110`. Toast fica ACIMA de tudo (confirma por cima do modal
  que fechou).
- Todos fecham com X, toque no fundo e Esc; `safe-area-inset` no iOS.

## 7 · Componentes (átomos) — papel e anti-uso

| Átomo | Papel | Anti-uso |
|---|---|---|
| `Segmented` | escolha EXCLUSIVA de modo (F1) | listas >7; itens criáveis |
| `Select` | 1 de N itens | modo exclusivo; números |
| `NumField` | numérico (zero só no blur) | `<input type=number>` cru |
| chips de contexto | item CRIÁVEL/gerenciável ali | escolha fixa |
| chip passivo | resumo; no máx. abre a folha | controle disfarçado |
| `StatusPill` | veredito — **só aparece com problema** | "OK" permanente |
| `PrefToggle` | liga/desliga com rótulo+desc curta | descrições longas |
| `Switch` | liga/desliga compacto | preferências com contexto |
| `ZoomTrio` | zoom de canvas (34px) | outro conjunto de zoom |
| `HelpTip` "?" | TODA didática (popover desktop / LightModal mobile) | parágrafo fixo |
| `PresetPicker` | predefinições (Test Card + Composição) | seletor duplicado |
| `Placeholder` | TODO estado vazio | card de texto avulso |

**Botões** (`btn()` em `ui/styles.js`): `primary` (acc+accInk) — **UMA por
aba** (R1), a razão da aba, tamanho normal à direita da toolbar, nunca
full-width · `ghost` (card2+borda) secundária · `subtle` (transparente)
terciária · `danger` só destrutiva **e sempre seguida de confirm()**.
Botão-ícone 36-40px com borda. FAB só em lista de criação.

## 8 · Navegação e overflow

- Barra rolável horizontal (abas, chips) **DEVE sinalizar o transbordo**: ou o
  último item aparece CORTADO no viewport (nosso padrão atual), ou fade-out na
  borda (mask-image). O usuário nunca adivinha que existe mais conteúdo.
- Scrollbar escondida (`no-scrollbar`) só quando o corte/fade sinaliza.
- Bottom nav: 5 destinos com rótulo; seções com 1 item navegam direto.
- Rótulo em navegação é OBRIGATÓRIO (ícone mudo não navega).

## 9 · Toasts & feedback

1. Toast fala **no passado** — confirma ação resolvida: "Backup exportado".
2. Curto, sem botão, some sozinho em **~2.8s**, 1 por ação, empilha no máximo o
   inevitável. Exceção única (backlog Rev A · LLC-05): **"Desfazer" só em
   REARRANJO reversível em memória** (ex.: reordenar telas) — uma única ação no
   toast, ~5s, que restaura o estado anterior. Ação DESTRUTIVA continua
   protegida ANTES, no confirm() — nunca por undo.
3. Posição: **desktop** canto inferior-direito · **mobile** centro-inferior,
   ACIMA da bottom nav (nunca atrás dela).
4. `success` (padrão) confirma · `info` orienta/erro recuperável com instrução.
5. Toast NUNCA: valida formulário (inline), anuncia futuro, substitui confirm,
   aparece sem ação do usuário, mostra progresso (estado contínuo = texto de
   status no lugar; catástrofe = ErrorBoundary).

## 10 · O Caderno Técnico (Print) — leis do papel

1. **O Caderno não é o app.** Público: cliente, produção, campo, locadora.
   Sem referência ao app, sem abreviação, papel branco, tinta preta.
2. **Acento oliva `#4d5500`** — o lime fluorescente é ilegível no papel; a capa
   (Folha Técnica, lime + preto) é a única área de marca saturada.
3. **Zebrado obrigatório** em tabela longa (portas 1..48, circuitos AC):
   linhas pares com cinza levíssimo — sem isso a linha visual se perde.
4. **Dado técnico em mono**, colunas alinhadas (kW/kVA/A, resoluções, matrizes).
5. **Aviso de segurança = LARANJA** (borda `#b45309` + fundo claro âmbar).
   NUNCA vermelho: no papel, vermelho significa falha/incêndio, não precaução.
6. Paisagem por padrão · um tópico por página · cor+ícone por disciplina ·
   glossário no fim (padrões da v1.5.4-1.5.5, mantidos).
7. **A PRANCHA (30/07/2026)** — toda página do PDF (menos a capa) é folha de
   engenharia: **moldura** (caixa 1,4 pt, inset 16 pt) + **carimbo** em faixa
   no rodapé, nos moldes da prancha clássica de arquitetura. Blocos, na ordem:
   marca (logo DO PROJETO; sem logo, a marca LedLab) · campos (Caderno
   Técnico · tipo / Evento / Cliente / Local + datas) · Projetou (assinatura
   das Configurações › Conta — global, nunca por impressão) / Gerado / Nº ·
   **FOLHA NN/total** grande no canto. Tinta preta, hairlines, rótulos mono;
   "A4 · s/ esc." declara que o Caderno não é desenho em escala. A capa segue
   sendo a única página SEM moldura — e é da marca LedLab; o logo do projeto
   mora no carimbo.
8. **REFERÊNCIA DE IMAGEM (18/08/2026)** — o caderno de **Design** carrega a
   folha **Test Card · Referência de imagem**: o card de cada tela desenhado de
   verdade (o estilo que o projeto escolheu na Composição, com o número REAL da
   porta), **uma tela por folha**, com a ficha técnica ao lado — ou embaixo,
   quando o card é fita. É REFERÊNCIA — o arquivo pra controladora sai na aba
   Test Card, em resolução real. Card de calibração **nunca vai em formato com
   perda**: PNG a ~145 dpi na folha cheia (JPEG borra a junção e suja a cor).
   Imagem no PDF entra pelo dicionário `images` por NOME; dataURL inline no nó
   multiplica o embed e inflou um caderno real de 236 KB pra 1,4 MB.
   **O primeiro card não quebra página** — ele divide a folha com o cabeçalho da
   seção; sem isso sobra uma folha só com título (o mesmo motivo da exceção
   `section:first-of-type` na impressão do DOM).
9. **PREMISSA DECLARADA** — número que depende de uma ESCOLHA do técnico sai
   nomeado na folha da Screen, ao lado da resolução e das portas: hoje
   **Overclock** (arredondar a capacidade pra cima) e **Vão no retângulo**
   (o vazio entre painéis ocupando ou não cota de porta). A premissa só aparece
   quando muda algum número do caderno — declaração que não altera nada é
   ruído. Caderno é documento datado: quem lê seis meses depois precisa saber
   sob qual regra a conta foi feita.
10. **A FOLHA DE TEST CARDS não é caderno (18/08/2026)** — é a exceção
    documentada a estas leis, e a única saída do app com **tamanho de folha fora
    do padrão**: a folha tem a PROPORÇÃO do canvas de conteúdo, lado maior de
    **1,20 m** (rolo de plotter) e cada Test Card em **resolução nativa** na
    posição real da Composição, sobre papel, com margem de respiro. Sem prancha,
    sem moldura, sem carimbo, sem "s/ esc." — quem carimba é o Caderno. Arquivo
    separado por imposição do motor: o pdfmake aceita UM tamanho de página por
    documento, então folha fora do padrão nunca seria página do caderno.
    **Nada por cima da arte**: o card já se identifica por dentro, e o que falta
    (resolução por tela, tamanho em metros, manual de conteúdo) mora na folha de
    Conteúdo do caderno. A folha carrega só uma linha na margem — projeto,
    canvas, tamanho impresso e data. Sobrepor rótulo à arte foi tentado e virou
    poluição (dono, 18/08).
11. **A FOLHA DE CONTEÚDO (18/08/2026)** — o caderno de **Design** carrega
    **Conteúdo · Manual de vídeo**, no formato do rider que o pessoal de
    conteúdo já lê: cada tela em ESCALA COMUM (painel de 16 m sai três vezes o de
    4,5 m), com a **resolução em cima** e o **tamanho em metros embaixo**, FORA
    do desenho; a geometria de test card (grade, círculo e diagonais) identifica
    a peça sem precisar da arte. Fecham a folha duas fichas: **Painel de LED** (o
    que existe no palco) e **Manual de conteúdo** (o que tem que ser entregue —
    formato, codec, taxa de quadros, varredura, aspecto de pixel). Campo vazio
    cai no padrão da casa: folha de conteúdo com lacuna é convite pra chegar
    arquivo errado.

## 11 · A gramática (estrutura de toda tela)

**5 faixas**: F1 Modo (Segmented) → F2 Ferramentas (1 linha; primária à
direita) → F3 Contexto (chips passivos + StatusPill + "?") → F4 Conteúdo
(cards/Placeholder/ZoomTrio) → F5 Ajustes (LightModal). Regras R1-R6 no
`CLAUDE.md`.

## 12 · Voz e texto

- **PT-BR 100%**; tom técnico-pra-técnico, direto, sem jargão de marketing.
  Personalidade cabe ("a queridinha do rental"); gordura não.
- Botão diz o que FAZ; toast diz o que FEZ; confirm nomeia o alvo e o efeito.
- Número sempre com unidade, em mono; formato pt-BR (`2.496 × 2.912 px`,
  vírgula decimal, `·` separa fatos).
- **Vocabulário**: a convenção completa é o §12.1 abaixo — uma palavra por
  conceito, um conceito por palavra. Texto novo segue o §12.1 SEMPRE.

## 12.1 · Vocabulário — a convenção de termos

Cravada pelo dono em 03/08/2026 (auditoria completa de UI + conteúdo; as
decisões Circuito / aba Caderno / Proporção + Fração / cadeia são escolhas
explícitas dele). Caso novo → propõe aqui, aprova, commita — nunca inventa
termo solto no código.

**O núcleo do domínio**
- **Tela** — bloco de gabinetes iguais montados juntos (conceito NOSSO).
- **Screen** — o sistema como a controladora enxerga (NovaLCT); maiúscula, sem
  tradução. "Sistema" só como glosa didática única.
- **Gabinete** — o módulo físico COMPLETO (cabinet + receiving card). A
  receiving card é o cartão dentro dele, campo do cadastro — não sinônimo.
  Nunca "módulo", "case", "cabinet", "painel".
- **Painel** — o objeto físico montado inteiro (a parede de LED real).
  "Parede" só no nome consagrado *parede voada* (KB Estrutura).
- **Controladora** — a caixa NovaStar/Colorlight (sempre no feminino). Nunca
  "processador", "controlador", "dispositivo". **Media server** é OUTRO
  equipamento (máquina de conteúdo) e só aparece quando é dele que se fala.
- **Grade** — a matriz colunas × linhas de gabinetes. Só descreve a Screen
  quando ela é um retângulo cheio de um modelo só; com vão no meio, o caderno
  informa a CONTAGEM de gabinetes e cala a grade (a caixa envolvente não é
  grade — dividi-la pela resolução conta gabinete que não existe).
- **Vão** — a folga em px entre telas dentro da Screen (0 = encostadas). A
  Screen tem um vão PADRÃO: arrastar encaixa nele, o auto-arrumar separa por
  ele e a tela nova entra respeitando-o; a cota do canvas mede a folga real até
  o vizinho que a tela encara. Nunca "gap" nem "espaço"; "folga" só como glosa.
  **Vão não ocupa cota de porta** (§10.9): na régua de Área cada painel
  encostado é uma região própria; o vazio do palco só entra se a Screen
  declarar. Buraco DENTRO do painel não é vão — esse a regra do retângulo cobra.
- **Canvas de conteúdo** — a caixa envolvente da Composição (par fixo:
  "Canvas de conteúdo (caixa envolvente)").

**Sinal × AC (a distinção que mais escorregava)**
- **Porta** — a saída Gigabit numerada = a unidade do SINAL. Nunca "cabo".
- **Circuito** — a unidade numerada de ENERGIA (com fase). Nunca "Cabo 3".
  **Cabo AC** = só o objeto físico (bitola, margem, comprimento).
- **Cadeia** — o encadeamento físico de gabinetes que a porta/circuito
  percorre. **Corrente é SÓ ampères** (a corrente de aço da talha na KB é
  literal e fica).
- **Régua** — SÓ o critério de alocação de porta: **Pixels (Free Topology)**
  × **Área (retângulo)** — grafia única. **Regra** = fórmula (regra dos 80%,
  regra 1×/10×). As quatro **distâncias de visão** (Mínima · Ótima · Retina ·
  Máxima) NÃO são réguas.
- **Serpentina** — o desenho da rota. **Zigzag** (sem hífen) — ordem de
  numeração.

**Elétrica**
- **Consumo** em W: **Pico** (pwrMax, branco pleno — dimensiona tudo) ×
  **Típico** (médio em operação — estima) × **Base** (tela preta/black level).
  "Máximo" não substitui Pico em rótulo.
- **Carga** — SÓ a solicitação de um circuito AC (A · % do conector). kW da
  Visão Geral = **Pico**; pixels da controladora = **Ocupação**.
- **Fases R/S/T** em **rodízio**, reiniciando a cada Screen. **Quadro** = só o
  quadro elétrico. **Proteção/disjuntor** é do eletricista (Ib ≤ In ≤ Iz);
  nunca "breaker". Gerador = faixa (pico × 1,25 + % ocupado).

**Vídeo e distância**
- **Pitch** nos rótulos ("pixel pitch" só na 1ª menção didática) ·
  **Proporção** (16:9) · **Fração** (0,429) · **Resolução (px)** ·
  crop = **preencher (corta)** × **encaixar (barras)** · **Frequência** (Hz,
  nunca "Refresh") · **Test Card** sem tradução.
- Distâncias de visão: **Mínima · Ótima · Retina · Máxima** (nesta ordem);
  vereditos Pixel visível / Aceitável / Confortável / Retina / Longe demais;
  **"1 minuto de arco"** (nunca "arcminuto"); "mín/máx" só dentro de desenho.

**O produto impresso**
- **Caderno Técnico** (o produto; "o Caderno" em texto corrido) — a ABA se
  chama **Caderno**. "Relatório" é só o de Reembolso. As 9 seções têm par
  título·tag cravado (Visão Geral · Composição do painel — Vídeo / Resolução ·
  Sinal e proporção — Conteúdo · Manual de vídeo — Test Card · Referência de
  imagem — Informações Elétricas · Energia, dimensionamento — Cabeamento de
  Sinal · Portas de dados — Cabeamento AC · Circuitos de força — Critérios de
  Cálculo · Normas e referências — Glossário · Termos técnicos).
- **Folha de Test Cards** — a folha sem tamanho padrão (§10.10): proporção do
  canvas de conteúdo, 1,20 m no lado maior, card em resolução nativa. É saída à
  parte, não uma folha do Caderno. Nunca "poster" nem "mapa de test cards".
- **Manual de conteúdo** — o combinado com quem monta o vídeo (formato, codec,
  taxa de quadros, varredura, aspecto de pixel). Vive no projeto, sai na folha
  de Conteúdo (§10.11). Nunca "specs de vídeo" nem "requisitos".
- **Prancha · carimbo · FOLHA N/M · REV · Nº DOC**. "Gab." só em tabela densa
  (a exceção documentada do §10.1). **Planilha de pagamento** (pra aprovar) ×
  **Recibo de mão de obra** (validado).

**Trabalho e dinheiro**
- **Cachê** (o dinheiro e o módulo) · **Turno** (check-in→checkout aberto) ·
  **Atividade** (o tipo) · **Lançamento** (o registro salvo) · **fixo** (nunca
  "flat") · grafias **check-in** / **checkout**. "Diária" não existe na UI.

**Equipe e avisos** (aprovado pelo dono em 04/08/2026, junto com o plano do
módulo)
- **Equipe** — o grupo; **Gestor** (quem montou a equipe) × **Técnico**
  (quem entrou). Papel é POR EQUIPE, não da conta.
- **Escala / Escalar / Escalado** — quem trabalha o evento. Nunca "assign".
- **Publicar na agenda da equipe / Publicação** — o ato de compartilhar um
  evento com a equipe (sobe o mínimo: nome, cliente, local, datas, chamada).
- **Aviso** — a mensagem que chega (in-app e no celular). A central é
  **Avisos**. "Push"/"notification" NÃO existem na UI; didática: "avisos no
  celular".
- **Convocar equipe / Convocação** — o disparo manual do gestor. Toast:
  "Equipe convocada".
- **Lembrete** — o aviso automático por horário · **Chamada / horário de
  chamada** — a hora de apresentação no evento.
- **Código de convite** — o vínculo (formato `LED-XXXXXX`). Botões: "Entrar
  na equipe" · "Sair da equipe" · "Montar equipe" (nunca "Criar").
- **Mão de obra** — o cadastro do que cada técnico faz; **Habilidade** é
  cada item (Montagem, Resolume, Endereçamento…), e o conjunto delas é o
  **catálogo** da equipe. Nunca "skill", "competência" ou "tag". Na escala,
  o filtro pergunta **"Precisa de:"**.
- **Função** — o posto do membro na equipe ("Técnico de LED", "Operador"),
  texto livre. Não confundir com **Habilidade**: função é o cargo, a
  habilidade é o que ele sabe fazer.

**Interface**
- Título da página = rótulo do nav (no mobile ele é o único).
- Três endereços (R3): **Ajustes** (como se vê) · **Avançado** (o que a Screen
  é) · **Configurações** (global).
- **Adicionar X** (item em lista do contexto) · **Novo X** (entidade de topo) ·
  nunca "Criar" · sentence case ("Novo projeto").
- Toasts no passado, sem emoji. Toggles SIM/NÃO; selects "Desligado" (nunca
  "Off"). Placeholders **"Ex.:"** com ponto. Cantos: **Inf-esq · Inf-dir ·
  Sup-esq · Sup-dir** nos controles; por extenso no Caderno.
- StatusPill só com problema (§7) — nunca OK permanente.

**Anglicismos — lista fechada**
- Sancionados: Screen · Test Card · Aspect Ratio (nome da aba) · Overclock ·
  Free Topology · crop · canvas · check-in/checkout · backup · status ·
  Indoor/Outdoor · nit · receiving/sending card · All-in-One · black level
  (com a glosa "base") · letterbox/pillarbox (só como glosa) · media server ·
  snap · preview.
- Banidos: preset → Predefinição · display → tela/painel · breaker →
  disjuntor · flat → fixo · Off → Desligado · Refresh → Frequência ·
  controller → controladora · KB → Base de Conhecimento (por extenso, sempre).

**Grafias fixas**
- **NovaStar · NovaLCT · SmartLCT · Tessera · Brompton · Colorlight ·
  COEX (VMP) · Unico** (nunca "Novastar", nunca "LCT" solto).
- **powerCON · powerCON TRUE1** (grafia Neutrik — nunca "PowerCON"/"True1").

## 13 · Movimento & acessibilidade

- Transições 0.15s (controles) a 0.25s (superfícies); nada >0.3s; movimento só
  comunica estado; `prefers-reduced-motion` respeitado.
- Dois temas SEMPRE; cor nunca é o único sinal; `aria-label`/`aria-pressed`/
  `role="switch"` onde couber; `env(safe-area-inset-*)` nos extremos.

## 14 · Aplicação da paleta (pendências de implementação)

1. `ui/tokens.js`: DARK e SOL trocam pros valores §2.2-2.3; **token novo
   `accInk`**; todo `color:"#fff"` hardcoded sobre `T.acc` → `T.accInk`
   (btn primary, Segmented ativo, tabBtn das Configurações, CornerPicker,
   NumberingPicker, chips ativos…).
2. `amb` amarelo → **laranja** nos dois temas (+ `ambBg`).
3. `PRINT.acc` roxo → **oliva `#4d5500`** (revisar SectionHead/chips do Caderno).
4. Toast mobile: mover pra centro-inferior acima da bottom nav (§9.3).
5. Zebra: conferir DenseTable/tabelas longas do Caderno (§10.3).
6. Revisão visual tela a tela nos DOIS temas + smoke no Caderno impresso.

**Status: ✅ APLICADA (2026-07-24, commit `41362f5`)** — o app veste a marca nos
três ecossistemas. Esta seção fica como registro do que a aplicação envolveu.
