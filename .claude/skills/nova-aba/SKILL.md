---
name: nova-aba
description: Como construir qualquer tela nova do LedLab Core seguindo a gramática das 5 faixas, o manual de marca e os átomos da casa — mais o registro no nav/rotas e a criação de fatia de estado nova. Use SEMPRE que for criar ou reestruturar aba, página, sub-aba de projeto, modal, painel de ajustes ou seção de Configurações; e também quando a tarefa só descreve a funcionalidade ("quero uma tela pra X") sem falar de layout. Vale igualmente pra revisar tela existente que parece fora do padrão.
---

# Tela nova no LedLab Core

## Regra zero

Antes de inventar qualquer coisa de interface — cor, ícone, modal, toast, texto — **leia `docs/marca/manual.md`**. Ele cobre paleta, catálogo de ícones com significado fixo, superfícies, toasts, átomos, anti-usos e voz. Caso não coberto pelo manual vira proposta → aprovação do dono → commit lá; nunca exceção solta no código.

O `CLAUDE.md` resume as regras; o manual é a fonte.

## As 5 faixas

Toda tela de trabalho tem esta ordem. Faixa sem conteúdo **some**, mas nunca troca de posição nem de forma:

| Faixa | O que é | Forma |
|---|---|---|
| **F1 · MODO** | escolha exclusiva de sub-modo | `components/Segmented.jsx` |
| **F2 · FERRAMENTAS** | 1 linha: contexto · toggles-ícone · 🎛 ajustes · exports ··· **uma primária roxa à direita** | `btn("primary")`, tamanho normal, nunca full-width |
| **F3 · CONTEXTO** | chips passivos de resumo | + `StatusPill` + `HelpTip` |
| **F4 · CONTEÚDO** | cards com rótulo CAPS; ganha o resto da tela | vazio = `Placeholder`; zoom = `ZoomTrio` |
| **F5 · AJUSTES** | o que muda **como se vê** | `BottomSheet` (mobile) / `Drawer` (desktop); `LightModal` pra ajuste rápido |

### As seis decisões

- **R1** — **uma** primária roxa por aba: a razão de existir dela. Se aparecer uma segunda ação forte, uma das duas é `ghost`.
- **R2** — forma segue papel: exclusivo=`Segmented` · 1-de-N=`Select` · chips só se o item é criável/gerenciável ali · exibição=ícone com estado (`aria-pressed`).
- **R3** — três endereços de config: muda *como se vê* → F5 · muda *o que o projeto é* → F4 · global e raro → Configurações (drawer da engrenagem).
- **R4** — didática mora no `HelpTip` ("?"). Zero parágrafo explicativo fixo: ele ensina uma vez e ocupa pra sempre.
- **R5** — chip passivo informa; controle tem cara de controle (borda/caret/ícone).
- **R6** — sempre os mesmos átomos: `Placeholder`, `ZoomTrio`, `StatusPill`, ícones do domínio em `components/icons/LedIcons.jsx`.

### Superfícies (manual §6)
`LightModal` = ajuste de contexto, picker, "?" no mobile — card que **não** cobre a tela · `BottomSheet` = só lista de `Select` no mobile e menus da bottom nav · `Drawer` = configurações globais e painéis de página inteira · `confirm()` = **toda** ação destrutiva, nomeando alvo e efeito.

Z-order é lei: fab 55 < bottomNav 60 < sheet/lightModal 90 < drawer 95 < dialog 100 < toast 110.

### Toasts (manual §9)
Fala **no passado**, confirma ação resolvida, some sozinho, sem botão, sem emoji. **Nunca** anuncia futuro, nunca aparece sem ação do usuário, nunca mostra progresso.

Corolário que já valeu decisão de arquitetura: notificação que chega sozinha (aviso de escala) **não pode** ser toast — virou central com sino e `Drawer`. Estado contínuo vira texto de status; veredito de problema é `StatusPill`, que só aparece **com** problema — nunca um "OK" verde permanente.

## Obrigatórios de código

- **`components/Select.jsx`** (nunca `<select>` nativo) e **`components/NumField.jsx`** (nunca `<input type=number>` com `parseInt||0` no onChange).
- **Cores só via tokens `T`** (`ui/tokens.js`). O app tem dois temas — dark/roxo e "sol", claro de alto contraste. Cor hardcoded quebra o modo sol em campo, que é onde ele importa. `PRINT` é exclusivo do relatório impresso.
- **Mobile**: rótulo obrigatório em navegação (ícone sem rótulo não tem cheiro de informação); alvos ≥38px, 44px em abas; `useIsMobile()` pro breakpoint; feature desktop-only marca `desktopOnly` no `nav.js`.
- **Vocabulário**: §12.1 do manual é lei. "Adicionar X" (item em lista de contexto) × "Novo X" (entidade de topo), nunca "Criar". Toggle SIM/NÃO. Select desligado = "Desligado". Placeholder "Ex.: …" com ponto. Termo novo → propõe no manual, aprova, commita — nunca inventa no código.

## Registrar a tela

**Aba principal:** criar `src/pages/MinhaAba.jsx` (`export default function MinhaAba({ nav })`) → adicionar ao `NAV` em `src/nav.js` **e** o id ao array `ids` da seção certa em `MOBILE_SECTIONS` (esquecer isso faz a aba sumir no celular) → registrar no mapa `PAGES` do `App.jsx`. A rota `/minhaaba` sai automática.

**Sub-aba de projeto:** entrada no array `TABS` do `src/pages/ProjectDetail.jsx` (`{ id, label, Icon, Comp }`). Aba que só faz sentido em certos casos pode ser injetada condicionalmente — a aba Equipe só existe pra quem gerencia equipe.

**Fatia de estado nova:** chave em `config/storageConfig.js` → `useState` + hidratação + `useEffect(persist)` no `AppContext.jsx` → expor no `value` → decidir se entra no `SyncContext` → e **não esqueça** `exportBackup`, o import de backup e o `factoryReset` do `Settings.jsx`. Cache read-only de servidor é exceção: vai em `CACHE_KEYS`, fora de backup e sync, e é limpo no logout.

## Estado e testes

Context API pura — sem zustand/redux. Hooks de domínio finos (`useWorklog`, `useProjects`) entre contexto e página. Uma prop só desce: `nav`.

A cultura de teste cobre **função pura**: motor em `src/services/x.js` + `x.test.js` irmão (vitest, ambiente node, sem testing-library). Isole a regra testável — cálculo, filtro, montagem de texto, dedupe — e deixe I/O na borda, como `sync.js`. Componente não tem teste; por isso a lógica não pode morar dentro dele.

### A armadilha do lint
`react-hooks/set-state-in-effect` é **bloqueante** no CI e pegou duas vezes nesta base. `setState` síncrono dentro de `useEffect` não passa. Saídas:

- derivar em vez de sincronizar (o melhor caso);
- ajuste **durante o render** com sentinela, padrão que o `App.jsx` já usa:
  ```jsx
  const [prev, setPrev] = useState(chave);
  if (prev !== chave) { setPrev(chave); setEstado(novo); }
  ```
- `setTimeout(..., 0)` quando é orquestração de I/O (padrão do `SyncContext`).

Rode `npm run lint` antes de considerar pronto.
