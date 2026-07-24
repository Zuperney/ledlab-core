# LedLab Core — convenções

App PWA offline-first (React + Vite) pra técnicos de LED: projetos (telas, Screens,
cabeamento de sinal/AC, relatório, test card), cachês e gestão. 100% PT-BR na UI.

## A GRAMÁTICA DA INTERFACE (obrigatória em toda aba/página nova)

Toda tela de trabalho são **5 faixas**, nesta ordem (faixa sem conteúdo some, mas
nunca muda de ordem nem de forma):

- **F1 · MODO** — escolha exclusiva de sub-modo → `components/Segmented.jsx`.
- **F2 · FERRAMENTAS** — 1 linha: contexto (`Select`, ou chips se o item é criável
  ali) · toggles-ícone de exibição · 🎛 ajustes · exports ··· **UMA primária roxa
  à direita** (`btn("primary")`, tamanho normal, nunca full-width).
- **F3 · CONTEXTO** — chips passivos de resumo + `StatusPill` + `HelpTip` ("?").
- **F4 · CONTEÚDO** — cards com rótulo CAPS; vazio = `Placeholder`; zoom =
  `ZoomTrio`; o conteúdo ganha o resto da tela.
- **F5 · AJUSTES** — o que muda COMO SE VÊ: `BottomSheet` (mobile) / `Drawer`
  (desktop) pra conjuntos grandes, `LightModal` pra ajuste rápido de contexto.

Regras de decisão:
- **R1** — uma primária roxa por aba (a razão de existir da aba).
- **R2** — forma segue papel: exclusivo=Segmented · 1-de-N=Select · chips só se o
  item é criável/gerenciável ali · exibição=ícone com estado (aria-pressed).
- **R3** — três endereços de config: muda *como se vê* → F5 · muda *o que o
  projeto é* → F4 · global e raro → Configurações (drawer da engrenagem).
- **R4** — didática mora no `HelpTip` ("?"); zero parágrafo explicativo fixo.
- **R5** — chip passivo informa; controle tem cara de controle (borda/caret/ícone).
- **R6** — mesmos átomos sempre: `Placeholder`, `ZoomTrio`, `StatusPill`, ícones
  do domínio em `components/icons/LedIcons.jsx` (stroke currentColor).

## Outras convenções

- **Componentes de formulário**: SEMPRE `components/Select.jsx` (nunca `<select>`
  nativo) e `components/NumField.jsx` (nunca `<input type=number>` com
  `parseInt||0` no onChange).
- **Cores**: só via tokens `T` (`ui/tokens.js`) — o app tem DOIS temas (dark/roxo
  e "sol", claro de alto contraste); cor hardcoded quebra o modo sol. `PRINT` é
  só do relatório impresso.
- **Mobile**: rótulo obrigatório em navegação (abas, bottom nav); alvos ≥38px
  (44px em abas); `useIsMobile()` pro breakpoint; features desktop-only marcam
  `desktopOnly` no `nav.js`.
- **Vocabulário**: Tela = bloco de gabinetes iguais (conceito NOSSO) · Screen = o
  sistema do NovaLCT (portas moram nela) · Gabinete = receiving card.
- **Testes**: `npm test` (vitest) — motor de cálculo tem que passar sempre;
  `npx eslint src --max-warnings 0` é bloqueante no CI.
- **Release**: trabalho novo em BRANCH; merge/deploy na main SÓ com o "pode
  soltar" do usuário (deploy = push na main → GitHub Pages).
