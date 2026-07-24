# Manual de Marca & Sistema — LedLab Core

> **Regra zero: não inventa.** Antes de criar qualquer coisa nova de interface —
> cor, ícone, modal, toast, componente, texto — **leia este manual e implemente
> o que ele manda**. Se o caso não está coberto, o manual é que ganha o caso
> novo (proposta → aprovação do dono → commit aqui) — nunca uma exceção solta
> no código. Versão viva: `docs/marca/manual.md` (esta) + `manual.html` (visual).

---

## 1 · A marca

- **Logo**: "led/lab" empilhado (led sobre lab), tinta **preta** sobre bloco
  **lime**, cantos arredondados. Arquivos: `src/assets/logo.png` (app) e
  `src/assets/ledlab-square.png` (capa do relatório).
- **Área de respiro**: margem mínima ao redor = altura da letra "l" do logo.
- **Tamanho mínimo**: 24 px de altura em tela; nunca menor que isso.
- **Não fazer**: não recolorir o logo; não esticar; não aplicar sombra; não
  colocar o bloco lime sobre fundo claro sem borda/contraste; não usar o lime
  da marca como cor de STATUS (aviso/ok/erro têm as suas cores — §2.4).
- **Nome**: escreve-se **LedLab Core** (produto) e **led/lab** (marca gráfica).

## 2 · Cor

### 2.1 Cores da marca
| Nome | Hex | Uso |
|---|---|---|
| **Lime LedLab** | `#ebf51e` | A cor da identidade. Ação primária (dark), acentos, capa do relatório |
| **Preto LedLab** | `#111111` | A tinta da marca. Texto sobre lime, primária no tema claro |

**Regra de tinta**: sobre lime, a tinta é SEMPRE preta (`accInk`). Lime nunca
vira texto pequeno sobre fundo claro (não lê). No claro, a marca aparece
invertida: **preto com detalhe lime**.

### 2.2 Paleta funcional — tema ESCURO ("Palco", padrão)
Fundos quase-pretos NEUTROS (morre o azul-roxo da era anterior).

| Token | Hex | Papel |
|---|---|---|
| `bg` | `#0f0f0d` | fundo do app |
| `sb` | `#131311` | sidebar / painéis |
| `card` | `#191917` | cartão |
| `card2` | `#121210` | campo/controle dentro de cartão |
| `bd` | `#2b2b26` | borda |
| `bdA` | `#5a5f14` | borda de destaque |
| `acc` | `#ebf51e` | **ação primária** (tinta `accInk` #111) |
| `accInk` | `#111111` | tinta sobre `acc` |
| `acM` | `#e3ee45` | acento médio (texto/ícone de destaque) |
| `acL` | `#f2f877` | acento claro (realce fino) |
| `txt` | `#ececea` | texto principal |
| `mut` | `#a6a69c` | texto suave |
| `dim` | `#72726a` | texto apagado |
| `dim2` | `#4e4e47` | quase invisível (guias) |
| `sel` | `#272b0d` | fundo selecionado |
| `strip` | `#1b1d10` | faixa informativa |
| `hero` | `#191b0e` | destaque de bloco |
| `indBg` | `#20230d` | fundo indicador |
| `zebra` | `#151513` | linha zebrada |

### 2.3 Paleta funcional — tema SOL (claro, alto contraste)
Existe pra LER NO SOL: contraste máximo, não estética.

| Token | Hex | Papel |
|---|---|---|
| `bg` | `#f4f4ee` · `sb` `#e9e9e1` · `card` `#ffffff` · `card2` `#ecece4` | fundos |
| `bd` | `#a9a99b` | borda FORTE (sol lava borda fraca) |
| `acc` | `#161711` | **primária preta** (tinta `accInk` = lime `#ebf51e`) |
| `acM` | `#5c6600` | acento de texto (lime escurecido/oliva) |
| `acL` | `#454d00` | acento profundo |
| `txt` | `#141410` · `mut` `#3c3c34` · `dim` `#5c5c52` | textos quase-pretos |
| `sel` | `#e7ecc0` | seleção lime-clara |

### 2.4 Semânticas (INTOCÁVEIS — engenharia)
| Papel | Escuro | Sol | Regra |
|---|---|---|---|
| OK / dentro do limite | `#34d399` | `#047857` | verde é veredito, nunca decoração |
| Aviso / atenção | `#fb923c` | `#b45309` | **LARANJA** (saiu o amarelo: confundia com o lime da marca) |
| Estouro / perigo / destrutivo | `#f87171` | `#b91c1c` | vermelho só pra problema real |

O lime **nunca** significa estado — significa identidade e ação.

### 2.5 Outras paletas
- **PRINT** (relatório impresso): documento claro próprio; `acc` do print vira
  **oliva `#4d5500`** na aplicação da marca (capa já é lime + preto). Não segue tema.
- **Cores de cabo** (`PALETTE`): funcional, configurável pelo usuário — fora da marca.
- **Cores por disciplina do relatório** (produção/vídeo/elétrica): mantidas.

### 2.6 Contraste (lei)
Texto normal ≥ 4.5:1; texto grande/ícone ≥ 3:1. Lime sobre `bg` escuro passa;
lime sobre branco NUNCA. No sol, tudo se resolve em quase-preto sobre claro.

## 3 · Tipografia

- **Família**: `system-ui` (FONT em tokens) — o app é PWA, a fonte é a do sistema.
- **Mono** (`ui-monospace`): TODO dado técnico — medidas, px, W/kVA/A, specs de
  gabinete, coordenadas. Número técnico sem mono é erro.
- **Escala** (px): 10/11 legendas caps · 12/12.5 apoio · 13/13.5 controles ·
  14 corpo · 15 título de cartão · 17 título de página (mobile) · 18-20 desktop.
- **Rótulos de seção**: MAIÚSCULAS, 10-12 px, `letter-spacing` 0.04-0.08em, `mut`/`dim`.
- **Pesos**: 400 corpo · 600 controles/ênfase · 700 títulos/valores · 800 marca.
- **Idioma**: 100% PT-BR. Zero rótulo em inglês na UI (§9).

## 4 · Ícones

### 4.1 Regras
1. **1 ícone = 1 significado.** O catálogo (§4.2) é contrato: não reusar um
   ícone pra outro conceito, não usar dois ícones pro mesmo conceito.
2. Ícone novo de DOMÍNIO nasce em `components/icons/LedIcons.jsx` — viewBox 24,
   stroke 1.8, `currentColor` (theme-aware de graça).
3. Genérico vem do lucide; se o lucide não conta a história, desenha no LedIcons.
4. **Tamanhos**: 13-14 inline no texto · 15-16 em botões · 18-22 em navegação ·
   maior só em Placeholder/vazios.
5. Botão só-ícone **sempre** com `title` + `aria-label`. Ícone mudo é proibido
   em NAVEGAÇÃO (aba/menu tem rótulo sempre).
6. Toggle de exibição = ícone com estado (`aria-pressed`, aceso = `sel`+`acM`).

### 4.2 Catálogo (significados fixos)

**A tríade dos ajustes (lei):**
| Ícone | Significado |
|---|---|
| `SlidersHorizontal` | ajustes de **VISUALIZAÇÃO** (como se vê) — abre LightModal |
| `Settings2` | **avançado do CONTEXTO** (config da Screen/item atual) — abre LightModal |
| `Settings` | **Configurações GLOBAIS** — abre o Drawer |

**Navegação (sidebar/bottom nav):** `LayoutDashboard` Visão Geral · `CalendarDays`
Agenda · `FolderOpen` Projetos · `Coins` Cachês · `Receipt` Recibos · `Wallet`
Reembolso/seção Financeiro · `Package` Gabinetes · `Cpu` Equipamentos/controladora ·
`GitBranch` sinal (Cabeamento, Diagramação) · `Monitor` Test Card · `Ratio` Aspect
Ratio · `BookOpen` Base de Conhecimento · `Home` Início · `Boxes` Gestão · `Wrench`
Ferramentas/Mais.

**Abas do projeto:** `Folder` Dados · `Zap` Energia/AC (elétrica em geral) ·
`Layers` Screens · `GitBranch` Cabeamento · `FileText` Relatório · `Monitor`
Test Card · `LayoutGrid` Composição.

**Ações:** `Plus` criar · `Trash2` excluir · `Pencil` editar · `Copy` copiar
texto · `Download` exportar/baixar · `Upload` importar · `Save` salvar
predefinição · `Printer` imprimir · `Eraser` limpar tudo · `Undo2` desfazer ·
`Repeat2` inverter · `RotateCcw` restaurar padrão · `Wand2` automático/sugerir ·
`X` fechar/remover · `Check` confirmado · `Search` buscar · `GripVertical`
alça de arrastar · `ArrowLeft` voltar · `Columns3`/`Rows3` layout de lista.

**Estado & feedback:** `TriangleAlert` aviso · `CircleCheck` ok/sucesso ·
`CircleX` erro/cancelado · `Clock` pendente/horário · `Activity` em andamento ·
`Info` informação · `ShieldCheck`/`ShieldAlert` armazenamento protegido/não ·
`Sparkles` novidades de versão · `Gauge` certificado/conferido.

**Tema & privacidade:** `Sun`/`Moon` modo sol/escuro · `Eye`/`EyeOff` valores R$.

**Campo:** `MapPin` GPS/local · `Play`/`Square` abrir/fechar turno · `Camera`
comprovante · `Cloud` sincronização.

**Domínio (LedIcons.jsx):** `IconNumeros` numeração de gabinetes · `IconInfoBox`
caixa de info do test card · `IconLadoALado` dispor lado a lado · `IconRegioes`
regiões do canvas (copiar) · `NumberingIcon` as 8 ordens de numeração
(zigzag/serpente — usado no NumberingPicker).

## 5 · Superfícies (modais, folhas, drawers)

| Superfície | Componente | Quando | Nunca |
|---|---|---|---|
| **Modal leve** | `LightModal` | Ajustes de contexto, pickers (predefinição), "?" no mobile. Card centrado, NÃO cobre a tela | Conteúdo longo, fluxo multi-etapa |
| **Folha de baixo** | `BottomSheet` | SÓ a lista do `Select` no mobile (e menus de seção da bottom nav) | Ajustes (migrado p/ LightModal) |
| **Drawer** | `Drawer` | Configurações globais e painéis página-inteira (recibo, tipos) | Ajuste rápido de contexto |
| **Diálogo de confirmação** | `useConfirm` | TODA ação destrutiva — **sempre nomeando o alvo** ("\"AD Summit\" será removido") | Confirmar ação reversível |
| **Prompt** | `usePrompt` | Pedir um texto (nome de predefinição) | Formulários |
| **Modal de novidades** | `UpdateModal` | Uma vez por versão | Qualquer outro anúncio |

**Z-order (lei)**: `fab 55 < bottomNav 60 < sheet/lightModal 90 < drawer 95 <
dialog 100`. Confirmação destrutiva fica por cima de tudo.
Todos fecham com: X, toque no fundo e Esc. Drawer/LightModal respeitam
`safe-area-inset` no iOS.

## 6 · Componentes (átomos) — quando usar cada um

| Componente | Papel | Anti-uso |
|---|---|---|
| `Segmented` | escolha EXCLUSIVA de modo (F1) | listas longas (>7), itens criáveis |
| `Select` | escolher 1 de N itens | modo exclusivo (é Segmented), número (é NumField) |
| `NumField` | entrada numérica (rascunho, zero só no blur) | NUNCA `<input type=number>` cru |
| chips de contexto | item CRIÁVEL/gerenciável ali (Screens, telas) | escolha fixa 1-de-N |
| chip passivo | resumo/informação; no máx. abre a folha | virar controle disfarçado |
| `StatusPill` | veredito OK/Alerta/Faltam — **só aparece quando há problema** | selo "OK" permanente (ruído) |
| `PrefToggle` | liga/desliga com rótulo+desc curta | mais de ~2 linhas de descrição |
| `Switch` | liga/desliga compacto em formulário | preferências com contexto (é PrefToggle) |
| `ZoomTrio` | zoom de canvas (−/enquadrar/+, 34px) | qualquer outro conjunto de zoom |
| `HelpTip` ("?") | TODA didática — popover (desktop) / LightModal (mobile) | parágrafo fixo na tela |
| `PresetPicker` | predefinições de test card (Test Card + Composição) | duplicar seletor próprio |
| `Placeholder` | TODO estado vazio | card de texto avulso |
| `DropdownMenu` | menu de opções marcáveis | navegação |

**Botões**: `btn("primary")` = **UMA por aba** (R1), a razão da aba, tamanho
normal à direita da toolbar — nunca full-width. `ghost` ação secundária ·
`subtle` terciária · `danger` só destrutiva. Botão-ícone 36-40px com borda.
FAB (`+`) apenas em listas de criação (Projetos).

## 7 · Toasts & feedback

1. Toast confirma ação **já feita**, no passado: "Backup exportado",
   "Predefinição salva". Curto (≤ 6 palavras no ideal).
2. Auto-some em ~2.8s. **Sem botão**, sem ação, não empilha por gosto — 1 por ação.
3. `type="success"` (padrão) confirma; `type="info"` orienta ou reporta erro
   recuperável **com instrução** ("Digite seu e-mail").
4. Toast NUNCA: valida formulário (isso é inline), anuncia futuro, substitui
   confirmação destrutiva, aparece sem ação do usuário.
5. Erro que impede o fluxo = mensagem inline no lugar; catástrofe = ErrorBoundary.
6. Progresso/estado contínuo (sync) = texto de status no lugar, não toast.

## 8 · A gramática (estrutura de toda tela)

Toda aba/página de trabalho = **5 faixas** na ordem: **F1** Modo (Segmented) →
**F2** Ferramentas (1 linha; primária à direita) → **F3** Contexto (chips
passivos + StatusPill + "?") → **F4** Conteúdo (cards, Placeholder, ZoomTrio) →
**F5** Ajustes (LightModal). Regras R1-R6 completas no `CLAUDE.md` (raiz).

## 9 · Voz e texto

- **PT-BR, 100%.** Sem inglês em rótulo ("Início", nunca "Home").
- Tom: **técnico falando com técnico** — direto, sem enrolação, sem jargão de
  marketing. Pode ter personalidade ("a queridinha do rental"), nunca gordura.
- Botão diz o que FAZ: "Exportar PNG", "Salvar predefinição". Toast diz o que FEZ.
- Números sempre com unidade (`px`, `W`, `kVA`, `A`, `m²`, `Hz`) em mono.
- Formato pt-BR: `2.496 × 2.912 px`, vírgula decimal, `·` como separador de fatos.
- **Vocabulário fixo**: Tela (bloco de gabinetes, conceito nosso) · Screen (o
  sistema do NovaLCT) · Gabinete (receiving card) · Porta (saída Gigabit) ·
  Cachê · Predefinição (não "preset" na UI).
- Destrutivo pede confirmação nomeando o alvo e o efeito ("Não pode ser desfeito").

## 10 · Movimento

- Transições: 0.15s (estados de controle), 0.2-0.25s (superfícies). Nada acima de 0.3s.
- Zero animação decorativa. Movimento só comunica mudança de estado.
- Respeitar `prefers-reduced-motion` em qualquer animação nova.

## 11 · Acessibilidade

- Alvos: ≥38px topbar mobile, ≥44px navegação/abas, 34px aceitável em toolbar densa.
- Dois temas SEMPRE (escuro + sol); cor nunca é o único sinal (ícone/texto junto).
- `aria-label` em todo botão-ícone; `aria-pressed` em toggle; `role="switch"` em switch.
- Inputs mobile com fonte ≥16px (anti-zoom iOS). `env(safe-area-inset-*)` nos extremos.

## 12 · Aplicação da paleta (nota de implementação)

A paleta §2 substitui o roxo em `ui/tokens.js` (DARK e SOL). A aplicação exige:
1. Token novo `accInk` (tinta sobre acc) e troca de TODO `color:"#fff"`
   hardcoded sobre `T.acc` → `T.accInk` (botões primários, Segmented ativo,
   tabBtn, chips ativos, CornerPicker, NumberingPicker…).
2. `amb` muda de amarelo → laranja nos DOIS temas (afastar do lime).
3. `PRINT.acc` roxo → oliva `#4d5500` (o interior do relatório encontra a capa).
4. Revisão visual tela a tela nos dois temas (o modo sol já ajuda: tokens certos
   = telas certas).
Status: **aguardando aprovação do dono para aplicar** (mudança visual total).
