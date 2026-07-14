# Roadmap — LedLab Core

> **Versão visual (dossiê interativo):** [`roadmap.html`](./roadmap.html) — abra no navegador.
>
> Este é um **plano de produto**, não código. Serve para decidir a ordem da próxima versão.
> Fundamentado em pesquisa do setor (fabricantes, plataformas de locação, previz, offline-first)
> combinada à leitura completa do código.

De ferramenta de **engenharia + faturamento** do técnico solo → **plataforma completa de projeto LED**,
mantendo o app 100% offline-first e feito para a obra brasileira (R$, recibo, MEI, WhatsApp).

**Horizonte:** v1.1 (hoje) → **v2.0**. São 25 iniciativas em 4 fases + backlog, ordenadas por dependência.
**Estado:** Fase 01 ✅ concluída (marcada pela v1.0.0) · **Fase 02 em curso** (2 de 5, na v1.1.0) · Fase 03 iniciada (Reembolso entregue).

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
- ✅ **Persistência** — *resolvido:* saiu do `localStorage` puro para IndexedDB + backup + **sync na nuvem** (v0.10–v0.12). Ver "Já entregue" abaixo.
- ✅ **Testes** — *resolvido:* vitest no motor elétrico, cabeamento, projeto, crop, layout e cachês (**113 testes**) + CI a cada push, com **lint bloqueante** desde a v1.0.0.
- ✅ **Portas de sinal por "área"** — *resolvido (v1.1.0):* a régua de **pixels reais** (px/porta, 8/10-bit, escalando com refresh) virou o padrão; a régua de área continua como opção pra controlador básico.
- **Sem rigging, sem distância de visão, sem orçamento** — o trio que falta pra fechar a engenharia + o negócio.
- **Preview do painel ainda é 2D** — a Composição (v0.20) monta várias telas num render; falta o 3D/previz da Fase 04.
- ~~Desktop (Electron)~~ — **fora do escopo** (decisão de produto, jul/2026): o PWA atende o desktop; o empacotamento segue no repo, sem investimento.

---

## ✅ Já entregue (v0.9 → v1.1)

A **rota de durabilidade** saiu do papel — do "dado preso num navegador" ao "dado que te segue em qualquer aparelho" — e, na v1.1, **a Fase 02 começou a entregar**:

| Entregue | Fase | Versão |
|---|:---:|:---:|
| **IndexedDB como fonte de verdade** (localStorage vira espelho) | 1 | v0.11.0 |
| **Armazenamento persistente + backup + lembrete** | 1 | v0.10.0 |
| **PWA à prova: service worker se auto-atualiza + fix de "chunk órfão"** | 1 *(parcial)* | v0.9.1 |
| **Sincronização na nuvem** — login por código (OTP) + motor de sync last-write-wins; opt-in, offline-first | 4 | v0.12.0 |
| **Aviso de nova versão** — hoje um modal pós-atualização que o usuário fecha | 1 | v0.13 → v0.20.5 |
| **Cinturão de testes + CI** — vitest no motor elétrico/cabeamento/projeto + CI a cada push | 1 | v0.15.0 |
| **Performance & PWA à prova** — precache completo: offline total após a 1ª carga | 1 | v0.15.2 |
| **Validação elétrica vs datasheets/normas** — ratings IEC, margem de segurança AC, alertas, dados de gabinete | 1–2 | v0.13–v0.15 |
| **Reembolso completo** — despesa + **foto do comprovante** (local, no IndexedDB) + relatório PDF/WhatsApp | 3 | v0.17–v0.18 |
| **UX mobile** — `Select` temático (fim do dropdown do Android), `NumField` (campo sem "pulo pra 0"), safe-area e anti-zoom no iOS | 1 | v0.17–v0.19 |
| **Composição de telas** — várias telas num render só (estilo *slice mapping*), com aviso de sobreposição | 4 *(parcial)* | v0.20.0 |
| **Crop de vídeo** — Aspect Ratio com *encaixar × preencher* + deslocamento X/Y | 2 | v0.20.7 |
| **🎉 v1.0 — marco de estabilidade** — 84 testes, lint zerado e **bloqueante** no CI, Actions no Node 22 | 1 | **v1.0.0** |
| **🟣 Portas de dados reais (px/porta)** — 8/10-bit escalando com refresh + **canto de início da serpentina** (os 8 padrões do NovaLCT) | **2** | **v1.1.0** |
| **🟣 Mapa de pixels exportável** — CSV (gabinete → porta → X/Y) + tabela por porta no relatório, p/ NovaLCT/Tessera | **2** | **v1.1.0** |
| **Drag & drop pra reordenar telas** + Configurações em sub-menus + auditoria de UX (textos enxutos) | 1 | v1.1.0 |
| **Duração em h/min** (fim da hora decimal "9.9h") + **auditoria do motor de cachês** (nenhum valor mudou) | 3 | v1.1.2 |

O **backend (Supabase + RLS) agora existe** — o que também destrava a *agenda escalada* no futuro (mesma infra).

---

## Fase 01 — Fundação & confiança · ✅ **concluída** *(v0.9 → v1.0)*
**Não perca dados. Não quebre nada.** *Antes de crescer, o app precisa ser à prova de falha.*

| Iniciativa | Prio. | Esf. | O que entrega — e por quê | Ref. |
|---|:---:|:---:|---|---|
| ✅ **IndexedDB como fonte de verdade** *(v0.11.0)* | 🟡 | G | **Feito:** `localStorage` → IndexedDB (wrapper próprio, **sem dependência**), com o localStorage de espelho. Mais cota, base pra fotos e sync. | offline-first |
| ✅ **Backup + persistência** *(v0.10.0 · parcial)* | 🟡 | M | **Feito:** export/import com validação, **armazenamento persistente** (`storage.persist()`) e lembrete de backup. **Falta:** "desfazer" global. | — |
| ✅ **Cinturão de testes + CI** *(v0.15.0)* | 🟡 | M | **Feito:** vitest no motor elétrico, cabeamento e projectCalc (66 testes); CI a cada push + o deploy só publica se os testes passarem. | — |
| ✅ **Performance & PWA à prova** *(v0.15.2)* | 🟣 | P | **Feito:** code-splitting (picker/supabase lazy) + **precache completo** = offline total após a 1ª carga (verificado no build de produção). Auditoria Lighthouse formal fica p/ um passe futuro. | — |
| ✅ **Aviso de nova versão (opt-in)** *(v0.13.0)* | 🟣 | P | **Feito:** banner *"nova versão — Atualizar"* + toast de novidades; o SW novo espera em vez de trocar sozinho (usuário decide). | — |
| ✅ **Cinturão de testes maduro** *(v1.0.0)* | 🟡 | M | **Feito:** 113 testes (elétrico, cabeamento, projeto, crop, layout, cachês) e **lint bloqueante** no CI — erro novo derruba o build. | — |
| ~~**Desktop pronto (Electron)**~~ | ⚪ | M | **Fora do escopo** *(jul/2026)*: o PWA atende bem o desktop (instalável, offline). O empacotamento segue no repo, sem investimento em auto-update/assinatura. | — |

> **Fase 01 concluída** ✅ — durabilidade (IndexedDB + backup + sync), testes + CI bloqueante, aviso de versão e PWA offline total entregues; Electron saiu do escopo. A fundação está à prova, marcada pela **v1.0.0**. O salto de valor agora é a **Fase 02**, que já começou a entregar na v1.1.

---

## Fase 02 — Profundidade de engenharia · `v1.1 → v1.5` · **em curso** *(2 de 5)*
**O cálculo que nenhum app de aluguel faz.** *Aqui mora o diferencial — engenharia de verdade, não só inventário.*

| Iniciativa | Prio. | Esf. | O que entrega — e por quê | Ref. |
|---|:---:|:---:|---|---|
| ✅ **Portas de dados reais (px/porta)** *(v1.1.0)* | 🟣 | M | **Feito:** nº de portas pela capacidade real do processador — 655.360 px/porta a 8-bit 60 Hz, 327.680 a 10-bit — escalando com refresh e bit-depth. A régua de área virou opção (controlador básico). Inclui o **canto de início da serpentina** (4 cantos × 2 direções = os 8 padrões do *Quick Connection* do NovaLCT), pro mapa casar com a montagem física. | capacidade de porta Novastar |
| ✅ **Mapa de pixels exportável** *(v1.1.0)* | 🟣 | M | **Feito:** CSV com uma linha por gabinete (porta · ordem no cabo · coluna/linha · X/Y, origem sup-esq) + tabela de início por porta no relatório "Mapa de cabos". Modelo conferido **contra o NovaLCT real** (aba *Screen Connection*): bate 1:1 com o que o operador digita. **Gerar `.scr` binário foi descartado** — formato proprietário (`DSCI`+checksum), risco de desconfigurar parede em campo. | workflow Novastar/Brompton |
| **Recomendador pitch × distância** | 🟣 | M | Dado o pitch (ou tamanho + distância), retorna distância mínima/ótima/máxima + VAD e sugere o pitch ideal. Expande a aba Aspect Ratio. *É a primeira pergunta de todo cliente — "de longe fica bom?".* **← próximo** | regra 10×, VAD 3438, altura×30 |
| **Rigging & estrutura** | 🟣 | G | Peso total e por ponto, nº de pontos de içamento (4–8), fator de segurança (≈5:1), voado vs. ground support, carga de vento (outdoor), checklist de motor/hardware. *É o cálculo de maior risco em obra.* | práticas de rigging |
| **Biblioteca de processadores** | 🟣 | M | Cadastro de modelos (Novastar/Colorlight/Brompton) com capacidade de porta e de quadro → nº de processadores/portas automático. *Transforma estimativa em número exato por marca.* **Destrava também o "Sending Card + Porta" físico no mapa de pixels** (hoje o app diz "Porta 1..N", não "Card 2 / saída 1"). | — |

---

## Fase 03 — Fluxo & negócio · `v1.8`
**Do projeto ao pagamento, num app só.** *O cálculo já mora aqui — o orçamento e a logística também deveriam.*

| Iniciativa | Prio. | Esf. | O que entrega — e por quê | Ref. |
|---|:---:|:---:|---|---|
| **Orçamento & proposta (PDF)** | 🟣 | G | Proposta a partir do projeto: m²/gabinetes + mão de obra (puxa das diárias) + logística, com PDF de aceite/assinatura. *Hoje o técnico projeta aqui mas orça no WhatsApp/planilha à parte.* | propostas Flex/Rentman/Goodshuffle |
| ✅ **Despesas & reembolso** *(v0.17–v0.18)* | 🟣 | M | **Feito:** aba própria — despesa (data/categoria/valor/descrição/cliente) com **foto do comprovante comprimida e local no IndexedDB** (não sobe pra nuvem, por decisão de custo) + relatório imprimível com comprovantes embutidos, PDF/Copiar/WhatsApp. **Falta (se pedir):** vínculo despesa↔evento e período custom (hoje é por mês). | demanda de campo |
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
| **Preview do painel (2D → 3D)** *(2D parcial: v0.20.0)* | 🟣 | G | Render do painel em escala real (gabinetes, conteúdo de exemplo, moldura do palco) em vista frontal e isométrica/3D. *A previsualização acelera a aprovação e reduz erro em obra.* **Parcial:** a **Composição** já monta várias telas num render 2D (arraste + snap + aviso de sobreposição + export PNG); falta a escala real com moldura e o 3D. *Exportar o mapeamento como `.xml` de slices do Resolume ficou adiado.* | previz Vectorworks/disguise |
| ✅ **Sync em nuvem opcional** *(v0.12.0)* | 🟣 | G | **Feito:** login por código (OTP, Supabase + RLS) + sync offline-first last-write-wins por fatia entre aparelhos. Opt-in, à prova de loop. | sync PWA (LWW) |
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
- **Sistema de cores / temas** — acento configurável e **modo claro**. *Avaliado em jul/2026 e adiado:* é cosmético e o diferencial é engenharia. O acento já é barato (3 tokens em `ui/tokens.js`); o modo claro é o degrau caro — só vale pelo ganho funcional de **legibilidade no sol**, se isso virar dor real em campo.

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

_Última atualização: 2026-07-14 (v1.1.2 · Fase 02 em curso)._
