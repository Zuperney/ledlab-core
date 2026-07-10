# Changelog

Histórico de versões do LedLab Core. Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versionamento semântico. A nota curta que aparece dentro do app (aviso de atualização) fica em `src/nav.js` → `WHATS_NEW`.

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
