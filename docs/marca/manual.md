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
Test Card · `LayoutGrid` Composição.

**Ações:** `Plus` criar · `Trash2` excluir · `Pencil` editar · `Copy` copiar ·
`Download` exportar/baixar · `Upload` importar · `Save` salvar predefinição ·
`Printer` imprimir · `Eraser` limpar tudo · `Undo2` desfazer · `Repeat2`
inverter · `RotateCcw` restaurar padrão · `Wand2` automático/sugerir · `X`
fechar/remover · `Check` confirmado · `Search` buscar · `GripVertical` arrastar ·
`ArrowLeft` voltar · `Columns3`/`Rows3` layout de lista.

**Estado:** `TriangleAlert` aviso · `CircleCheck` ok · `CircleX` erro/cancelado ·
`Clock` pendente · `Activity` andamento · `Info` informação · `ShieldCheck`/
`ShieldAlert` armazenamento · `Sparkles` novidades · `Gauge` certificado.

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
   inevitável. **Sem "Desfazer"** (não há rollback assíncrono — a proteção vem
   ANTES, no confirm()).
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
- **Vocabulário fixo**: Tela (bloco de gabinetes — conceito nosso) · Screen (o
  sistema do NovaLCT) · Gabinete (receiving card) · Porta (saída Gigabit) ·
  Predefinição (nunca "preset" na UI) · Cachê.

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

**Status: aguardando aprovação do dono para aplicar.**
