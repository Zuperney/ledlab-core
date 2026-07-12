# Changelog

Histórico de versões do LedLab Core. Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versionamento semântico. A nota curta que aparece dentro do app (aviso de atualização) fica em `src/nav.js` → `WHATS_NEW`.

## [0.17.1] — 2026-07-12

### Corrigido
- **iOS: topo escondido atrás da barra de status.** No iPhone (PWA), o header do app — título da aba, olho de privacidade e versão — ficava por baixo da status bar/notch. Agora o header respeita a safe-area (`env(safe-area-inset-top/left/right)`) e o conteúdo começa abaixo da barra, com o fundo do header preenchendo a área. Sem efeito em Android/desktop (inset = 0).

## [0.17.0] — 2026-07-12

### Adicionado
- **Aba Reembolso (MVP).** Lance despesas do evento (data, categoria, valor, descrição, cliente) com **foto do comprovante** — a foto é comprimida no aparelho (~1200 px, JPEG) e guardada **local no IndexedDB**, sem ir pro sync/Supabase (pra não estourar a cota conforme cresce o nº de fotos/pessoas). Navegação por mês, total do mês e lista com miniatura do comprovante. Acessível no menu (sidebar no desktop, "Mais" no mobile). Próximo passo: relatório de reembolso em PDF/WhatsApp.

## [0.16.1] — 2026-07-12

### Adicionado
- **Checkout no Dashboard.** Quando há um turno em andamento (check-in sem checkout), aparece um card no Dashboard com o turno (tipo, desde quando, há quanto tempo, local) e um botão **Checkout** — dá pra fechar o turno sem abrir a Agenda › Cachês. Mesma origem de dados das Diárias. (A notificação de checkout foi descartada — o card no Dashboard já cobre o "esqueci de fechar".)

## [0.16.0] — 2026-07-10

### Alterado
- **Ocultar valores em R$ agora esconde os cards inteiros** (em vez de mascarar com "R$ ••••"), no Dashboard e na aba de Cachês (Diárias) — pensado pra quando você mostra o app a um colega. Um **olho no topo** liga/desliga rápido (também fica em Configurações › Dashboard). Esconde o card de cachês do Dashboard e os valores do mês/dia nas Diárias.
- **Aviso de atualização simplificado:** como o navegador/PWA já atualiza sozinho, tiramos o banner "Nova versão — Atualizar" e deixamos só o toast "Atualizado para vX — novidades" depois que atualiza.

## [0.15.2] — 2026-07-10

### Melhorado
- **Offline total após a primeira carga.** O service worker agora faz precache de todos os módulos do build (inclusive os carregados sob demanda, como o seletor de datas) — antes só o núcleo ia pro cache, então abrir uma tela nova offline sem ter visitado antes podia falhar. Verificado no build de produção.

### Interno
- Corrigidos 2 avisos reais de hooks (`useDebouncedCallback` escrevia numa ref durante o render; `useIsMobile` tinha dependência incompleta). Roadmap Fase 01 concluída.

## [0.15.1] — 2026-07-10

### Corrigido
- **Dados dos gabinetes-exemplo CB5 e ER5.9** ajustados ao datasheet. O "CB5" era genérico (500×500 / 300 W) e virou o tile real (600×1200 / 650 W em TRUE1); o ER5.9 passou de 420 W → 600 W (mesmo tamanho). Ambos subestimavam a potência por painel do produto nomeado — risco de subdimensionar o cabo AC de quem confiasse no exemplo. BP2 e PL3.9 Pro já estavam acima do real (conservadores) e ficaram como estão. Afeta só instalações novas / restaurar de fábrica; quem já tem sua própria biblioteca não muda nada.

## [0.15.0] — 2026-07-10

### Adicionado
- **Margem de segurança do cabo AC** (Configurações › Elétrica): reduz os gabinetes por cabo pensando em carga contínua — a regra dos 80% de touring. Padrão 100% (sem mudança); opções 90% e 80%.
- **Avisos de segurança elétrica**: nota no modo AC do Cabeamento (powerCON sob carga, bitola do cabo, cálculo em 220 V) e novo artigo "Segurança elétrica (AC & campo)" na Base de Conhecimento.

### Corrigido
- Base de Conhecimento: True1 TOP corrigido para 16 A (padrão IEC, consistente com a v0.13.2); a margem de 25% do disjuntor documentada como regra NEC (a NBR pede In ≤ Iz do cabo).
- `calcScreen`: fallback defensivo quando a tensão vier inválida/corrompida (antes quebrava).

### Interno
- Rede de testes estendida ao motor elétrico, cabeamento e cálculo de projeto (66 testes) + CI a cada push (GitHub Actions); o deploy só publica se os testes passarem.

## [0.14.0] — 2026-07-10

### Adicionado
- **Ocultar valores em R$ no dashboard.** Nova opção de privacidade: esconde o total de cachês na tela inicial (mostra `R$ ••••`), útil ao apresentar o app para clientes ou colegas. Alterna rápido pelo ícone de olho no próprio card, ou em Configurações › Dashboard. A escolha fica salva.

## [0.13.2] — 2026-07-10

### Corrigido
- **Ratings de conectores AC alinhados ao padrão IEC.** `Neutrik True1 TOP` e `HangTon SD20` passaram de 20 A → **16 A** em `CONN_AMP`. Sob EN 60320-1/VDE (o regime do Brasil) o True1 TOP é 16 A — os 20 A eram apenas o rating UL/EUA (confirmado em 4 datasheets oficiais Neutrik). O SD20 não tem datasheet/certificação localizável, então cai no default conservador. Ambos reduzem gabinetes por cabo (direção segura).

### Validado
- **Modelo de cálculo elétrico AC** confrontado com datasheets (Neutrik), manuais de fabricante (ROE/Absen), Barco e normas (NEC / NBR 5410 / IEC 60320/60364). Confirmados corretos e **mantidos**: divisão pelo fator de potência, modelo Barco de consumo típico e o divisor "380 bifásico ÷ 440" (modela painéis de 220 V F-N balanceados entre 2 fases, `I/fase = S/(2×220)` — a troca para ÷380 seria incorreta para LED). Pendências levantadas para lotes futuros: auditar o `pwrMax` dos gabinetes-semente, margem de segurança configurável no `acBudget` e alertas de segurança na UI.

## [0.13.1] — 2026-07-09

### Corrigido
- **Balanceamento de fase no AC "atrelado ao sinal".** O cabeamento AC que segue a rota do sinal agora divide a carga em segmentos equilibrados (ex.: **13+12** em vez de 22+3), mantendo o mesmo número mínimo de cabos e a ordem da rota. Carga por fase mais estável.

## [0.13.0] — 2026-07-09

### Adicionado
- **Aviso de nova versão (PWA).** Banner "Nova versão disponível — Atualizar": o service worker novo espera em vez de trocar sozinho, e o usuário decide quando aplicar. Após atualizar, um toast mostra um resumo do que mudou.

### Corrigido
- **Aspect Ratio no mobile** não estoura mais: a visualização ganhou `viewBox` + altura automática e a tabela de resoluções rola na horizontal dentro do próprio container.
- **Cabeamento, disposição "Área"** não subdivide painel estreito à toa: 3×6 com budget 26 agora gera **1 cabo de 18** (antes 15+3).

## Anteriores

- **0.12.0** — Sincronização na nuvem opt-in: login por código OTP (Gmail SMTP) + motor de sync por fatia (last-write-wins). Conclui a rota de durabilidade (Passo 3).
- **0.11.0** — IndexedDB como armazenamento primário, com espelho em localStorage (durabilidade Passo 2).
- **0.10.0** — Armazenamento persistente (`storage.persist`) + lembrete de backup (durabilidade Passo 1).
- **0.9.1** — Correção do "chunk órfão" 404 após deploy do PWA (recarga automática ao detectar chunk purgado).
