# Roadmap — LedLab Core

> **Versão visual (dossiê interativo):** [`roadmap.html`](./roadmap.html) — abra no navegador.
>
> Este é um **plano de produto**, não código. Serve para decidir a ordem da próxima versão.
> Fundamentado em pesquisa do setor (fabricantes, plataformas de locação, previz, offline-first)
> combinada à leitura completa do código.

De ferramenta de **engenharia + faturamento** do técnico solo → **plataforma completa de projeto LED**,
mantendo o app 100% offline-first e feito para a obra brasileira (R$, recibo, MEI, WhatsApp).

**Horizonte:** v1.x (hoje) → **v2.0**. São 24 iniciativas em 4 fases + backlog, ordenadas por dependência.

---

## Como ler

| Prioridade | Significado | | Esforço | Escala |
|---|---|---|---|---|
| 🟡 **Necessário** | base de confiança | | **P** | pequeno — dias |
| 🟣 **Diferencial** | o que ninguém mais faz | | **M** | médio — 1–2 semanas |
| ⚪ **Novidade** | valor extra, sem pressa | | **G** | grande — projeto próprio |

A coluna **Ref.** aponta a pesquisa que embasa a proposta.

---

## Onde o app está hoje

### ✅ Forças — a base é sólida
- **Motor de engenharia real** — consumo elétrico, circuitos e mapa de cabos por porta.
- **Ferramentas raras juntas** — Test Card paramétrico, Aspect Ratio e Diagramação num só app.
- **Módulo de Diárias/Cachês** — check-in por GPS, recibo e cópia pro WhatsApp; diferencial pro técnico BR, com motor testado (vitest).
- **PWA offline + tema escuro** e um passe recente de densidade mobile.
- **QA feito** — 5 lotes: fuso corrigido, backup seguro, código limpo, lint + testes.

### ⚠️ A resolver — antes de escalar
- **Tudo em `localStorage`** — sem backup automático, sem multi-dispositivo, sujeito a limite de cota e a modo privado.
- **Testes só no motor de cachês** — cálculos elétricos e de sinal sem rede de segurança.
- **Portas de sinal por "área"** — usa caixa delimitadora, não pixels-por-porta reais do processador.
- **Sem rigging, sem distância de visão, sem orçamento, sem preview visual** do painel.
- **Desktop (Electron) pouco exercitado** — empacotamento existe, mas sem auto-update/assinatura.

---

## Fase 01 — Fundação & confiança · `v1.1`
**Não perca dados. Não quebre nada.** *Antes de crescer, o app precisa ser à prova de falha.*

| Iniciativa | Prio. | Esf. | O que entrega — e por quê | Ref. |
|---|:---:|:---:|---|---|
| **IndexedDB como fonte de verdade** | 🟡 | G | Migrar de `localStorage` → IndexedDB (Dexie): mais cota, dados estruturados, base para sync. *localStorage trava em ~5 MB e é o maior risco de perda de dados hoje.* | offline-first / Dexie |
| **Backup automático + desfazer** | 🟡 | M | Snapshots versionados locais, export/import com validação de schema, "desfazer" global. *Hoje um import errado apaga tudo, sem volta.* | — |
| **Cinturão de testes + CI** | 🟡 | M | Estender o vitest ao motor elétrico, cabeamento e projectCalc; rodar a cada push. *Só o worklog é testado — regressão silenciosa custa caro em campo.* | — |
| **Performance & PWA à prova** | 🟣 | P | Estender o code-splitting, auditar Lighthouse, blindar instalação/cache offline. *O app é usado em obra, muitas vezes sem internet.* | — |
| **Desktop pronto (Electron)** | ⚪ | M | Auto-update, ícones/assinatura, empacotamento Windows testado. *Projeto pesado (diagramação, PDF) é feito no computador do estúdio.* | — |

---

## Fase 02 — Profundidade de engenharia · `v1.5`
**O cálculo que nenhum app de aluguel faz.** *Aqui mora o diferencial — engenharia de verdade, não só inventário.*

| Iniciativa | Prio. | Esf. | O que entrega — e por quê | Ref. |
|---|:---:|:---:|---|---|
| **Portas de dados reais (px/porta)** | 🟣 | M | Nº de portas pela capacidade real do processador — ~650k px/porta a 8-bit 60 Hz, ~320k a 10-bit — escalando com refresh e bit-depth. Substitui a regra de área. *É assim que Novastar/Colorlight distribuem sinal.* | capacidade de porta Novastar |
| **Recomendador pitch × distância** | 🟣 | M | Dado o pitch (ou tamanho + distância), retorna distância mínima/ótima/máxima + VAD e sugere o pitch ideal. Expande a aba Aspect Ratio. *É a primeira pergunta de todo cliente — "de longe fica bom?".* | regra 10×, VAD 3438, altura×30 |
| **Rigging & estrutura** | 🟣 | G | Peso total e por ponto, nº de pontos de içamento (4–8), fator de segurança (≈5:1), voado vs. ground support, carga de vento (outdoor), checklist de motor/hardware. *É o cálculo de maior risco em obra.* | práticas de rigging |
| **Biblioteca de processadores** | 🟣 | M | Cadastro de modelos (Novastar/Colorlight/Brompton) com capacidade de porta e de quadro → nº de processadores/portas automático. *Transforma estimativa em número exato por marca.* | — |
| **Mapa de pixels exportável** | 🟣 | M | Gerar o mapeamento cabinets → portas (visual + CSV/impressão) que o operador transcreve no NovaLCT/Tessera. *Fecha o ciclo do projeto até a operação.* | workflow Novastar/Brompton |

---

## Fase 03 — Fluxo & negócio · `v1.8`
**Do projeto ao pagamento, num app só.** *O cálculo já mora aqui — o orçamento e a logística também deveriam.*

| Iniciativa | Prio. | Esf. | O que entrega — e por quê | Ref. |
|---|:---:|:---:|---|---|
| **Orçamento & proposta (PDF)** | 🟣 | G | Proposta a partir do projeto: m²/gabinetes + mão de obra (puxa das diárias) + logística, com PDF de aceite/assinatura. *Hoje o técnico projeta aqui mas orça no WhatsApp/planilha à parte.* | propostas Flex/Rentman/Goodshuffle |
| **Despesas & reembolso** | 🟣 | M | Lançar as despesas do evento (combustível, pedágio, alimentação, material) com **foto do comprovante** e gerar um relatório de reembolso — reaproveita a máquina de recibo/PDF/WhatsApp do módulo de cachês. *O técnico adianta do bolso e precisa ser ressarcido; é irmã do Financeiro.* (fotos → melhor sobre o IndexedDB da Fase 1) | demanda de campo |
| **Recibo por cadência (semana/mês)** | 🟣 | P | Presets de período no recibo — *esta semana / semana passada*, como já existe pra mês — pra fechar por semana (agenda seg→dom, pagamento na quarta). O trabalho segue lançado por dia; o recibo agrupa e fecha por semana. **A mesma estratégia de período vale pro relatório de reembolso.** *Tem freela que recebe semanalmente; hoje o recibo só pensa em dia/mês.* | demanda de campo |
| **Disponibilidade & conflito** | 🟣 | M | A agenda cruza eventos e avisa quando o mesmo gabinete/tela está reservado em datas sobrepostas. *Dupla-reserva é o erro clássico — e o mais caro.* | conflito Current RMS/Rentman |
| **Escala de equipe** | 🟣 | M | Ligar as diárias a pessoas (função, custo, disponibilidade) e montar a equipe do evento. *O módulo de cachês já sabe quanto; falta saber quem.* | — |
| **Kits & presets reutilizáveis** | ⚪ | P | Salvar telas-modelo e presets de tensão/cabeamento pra montar projeto novo em segundos. *A maioria dos eventos repete configurações.* | — |
| **Ordem de serviço & checklists** | ⚪ | M | Checklist de montagem/desmontagem e OS por evento. *Padroniza a obra e evita esquecer cabo/peça no galpão.* | — |
| **Recibo → nota (BR)** | ⚪ | M | Ponte opcional recibo → NF-e (MEI) e faturamento por evento. *O recibo já existe; formalizar é o que o cliente corporativo pede.* | — |

---

## Fase 04 — Visualização & nuvem · `v2.0`
**Veja antes de montar. Leve pra qualquer tela.** *O cliente aprova o que enxerga — e os dados deixam de viver num aparelho só.*

| Iniciativa | Prio. | Esf. | O que entrega — e por quê | Ref. |
|---|:---:|:---:|---|---|
| **Preview do painel (2D → 3D)** | 🟣 | G | Render do painel em escala real (gabinetes, conteúdo de exemplo, moldura do palco) em vista frontal e isométrica/3D. *A previsualização acelera a aprovação e reduz erro em obra.* | previz Vectorworks/disguise |
| **Sync em nuvem opcional** | 🟣 | G | Backup e sincronização offline-first (last-write-wins + resolução manual de conflito) entre celular e desktop. *Passo natural depois do IndexedDB.* | sync PWA (LWW + 409) |
| **Agenda universal (compartilhada)** | ⚪ | G | Colega vê a agenda de eventos do outro — coordenar cobertura, repasse de trampo, evitar choque de data. Estende o Sync: é sync + compartilhamento + papéis de acesso. *A agenda local (só você vê) já existe hoje.* | demanda de campo |
| **Compartilhar por link** | ⚪ | M | Projeto/proposta num link read-only, pro cliente ver sem instalar nada. | — |
| **Simulação de conteúdo** | ⚪ | M | Testar aspect/arte no painel e exportar imagem de apresentação. *Mostra na hora se a arte "cabe" no pitch e formato reais.* | — |
| **Formas criativas** | ⚪ | G | Telas não-retangulares, curvas e recortes, além do grid regular. *Painel curvo e recorte viraram padrão em palco.* | — |

> **Sobre a agenda universal — é o "boss final", sequencie com cuidado.** Não é uma feature, é virar um serviço: servidor, login, uptime e **responsabilidade legal (LGPD)** por dado pessoal de terceiros. Caminho recomendado, só quando a nuvem já existir: **(1)** começar por *publicar a agenda em link read-only* — colegas **veem** sem precisar de conta (≈10% do trabalho, ~60% do valor); **(2)** se precisar de multi-usuário, usar **Supabase/Firebase** (auth + banco + regra de acesso por linha + free tier) — **nunca** escrever o próprio login; **(3)** manter offline-first: a nuvem é camada opcional por cima, não substituta.

---

## Backlog de ideias — *além do horizonte v2*

- **Preview em AR** — apontar o celular pro espaço e ver o painel em tamanho real.
- **Dimensionamento assistido por IA** — foto do local + distância → sugere pitch, tamanho e consumo.
- **Base de gabinetes da comunidade** — specs compartilhadas entre usuários (um catálogo que se preenche sozinho).
- **Cálculo de gerador** — kVA, folga e combustível pra eventos sem rede elétrica.
- **Companion de campo** — fotos da montagem e assinatura de entrega junto do check-in GPS.

---

## Princípios que não mudam

1. **Offline primeiro** — a obra não tem Wi-Fi. Nuvem é backup e conveniência, nunca requisito.
2. **Engenharia é o diferencial** — plataformas de aluguel fazem inventário; o LedLab faz o cálculo.
3. **Mobile minimalista** — cada tela pensada pro técnico de pé, no celular, no galpão.
4. **Feito pro Brasil** — R$, recibo, MEI, WhatsApp e a linguagem de quem monta LED aqui.

---

## Fundamentação

Pesquisa de fabricantes (Novastar, Brompton), plataformas de locação (Rentman, Flex, Current RMS, Goodshuffle),
ferramentas de previz (Vectorworks, disguise) e arquitetura offline-first:

- [Previz — Vectorworks Spotlight](https://www.vectorworks.net/en-US/spotlight)
- [Modelo 3D de palco LED — disguise](https://www.disguise.one/en/insights/blog/how-to-quickly-build-a-3d-model-of-your-led-stage)
- [LED walls & mapping 2026 — Ticket Fairy](https://www.ticketfairy.com/blog/mastering-led-walls-projection-mapping-in-2026-tech-strategies-for-immersive-event-visuals)
- [Padrões PWA offline-sync](https://rohitraj.tech/en/notes/pwa-offline-sync)
- [Resolução de conflito em PWA offline-first](https://dev.to/crisiscoresystems/sync-conflict-handling-in-offline-first-pwas-how-to-merge-without-lying-to-the-user-59i3)
- [Apps offline-first — Locize](https://www.locize.com/blog/offline-first-apps)

_Última atualização: 2026-07-06._
