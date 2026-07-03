# LedLab Core — Módulo "Diárias" (registro de trabalho do técnico)

> **Status:** RASCUNHO para refinamento — **não implementado**. Documento vivo; vamos ajustar aqui antes de codar.
> **Atualizado em:** 2026-07-03

---

## 1. Objetivo
Permitir que o técnico registre os **serviços/dias trabalhados**, com **check-in/checkout** e **local**, calcule automaticamente **cachês + horas extras** conforme as regras do mercado rental/eventos, e **exporte um fechamento** para o financeiro.

## 2. Decisões de produto
- **Onde vive:** dentro do próprio LedLab Core (mesmo PWA que o técnico já usa em campo), como **módulo autocontido**.
- **Storage isolado:** chaves próprias (`ledlab.worklog.v1`, `ledlab.activitytypes.v1`), separadas de projetos/gabinetes → dá para separar/sincronizar no futuro sem retrabalho.
- **Privacidade:** dado pessoal/financeiro fica **local** (localStorage) e separado do dado de engenharia; entra no backup como dado privado do técnico.
- **Reversível:** se um dia virar produto próprio (técnicos de áudio/luz/vídeo em geral), o isolamento torna a extração barata.

## 3. 🔑 Princípio central — cobrança é **POR EVENTO**, nunca por dia
Cada **cachê = um evento/serviço**, com seu **próprio check-in/checkout** e sua **própria franquia de horas**. O "dia" é apenas **agrupamento visual** (e base da regra de deslocamento) — **nunca** soma horas de eventos diferentes, e **nunca** calcula do primeiro check-in do dia até o último checkout.

> **Exemplo real:** 4 serviços num dia (2h + 3h + 1h + 2h) = **4 cachês independentes**. Se num deles for preciso ficar até tarde, a hora extra sai da **franquia daquele evento** — não das 8h da manhã do primeiro serviço. São serviços separados, já cobrados um a um.

## 4. Tipos de atividade (configuráveis pelo usuário)
Cada tipo tem: **nome**, **cor**, **valor base (cachê)** e duas chaves independentes:

| Chave | Significado |
|---|---|
| `geraHoraExtra` | Se **sim**, aplica a fórmula de horas extras (§5.2). Se **não**, é **flat** (1 cachê, ignora horas, mas registra a duração). |
| `podeSegundoCache` | Se **sim**, pode somar como cachê adicional no mesmo dia (2 eventos = 2 cachês). Se **não**, só cobra se for a **única** atividade do dia. |

> A **franquia de horas (jornada) é global** — a mesma para todos os tipos, definida pelo usuário nas Configurações. Não há jornada por tipo.

**Tipos-semente sugeridos:**

| Tipo | Gera cachê | Hora extra | 2º cachê no dia |
|---|---|---|---|
| Montagem | Sim | **Sim** | Sim |
| Operação | Sim | **Sim** | Sim |
| Desmontagem | Sim | **Sim** | Sim |
| Trabalho em viagem | Sim | **Sim** | Sim |
| **Diária de viagem** (viagem longa paga à parte) | Sim | **Não** (flat) | **Sim** |
| **Dia de deslocamento** (curto) | Sim | **Não** (flat) | **Não** |

> **Deslocamento × Diária de viagem:** deslocamento curto é **absorvido** quando há trabalho no dia (não dobra o cachê — a regra pra não cobrar viagem+trabalho em dobro). Já a **diária de viagem longa empilha** como cachê próprio (clientes que pagam a estrada à parte). O **tipo** define o padrão; o **override por lançamento** (`cobrarSeparado`, §5.5) resolve a exceção "a mesma viagem um cliente paga e outro não".

## 5. Regras de cobrança (motor de cálculo)

### 5.1 Parâmetros
- `J` = **jornada** (franquia de horas) — **global**, configurável pelo usuário (ex.: 8 / 10 / 12h). Igual para todos os tipos.
- `C` = **cachê base** do tipo — **editável por evento** (valor varia por cliente/negociação).
- `W` = **janela de hora extra** — **global**, configurável; padrão **4h**. Passou dela → dobra o cachê.
- `r` = **valor/hora extra** = `arredondaPraCima(C / J)` → **R$ inteiro** (ex.: 350 ÷ 12 = 29,17 → **R$30**).
- `TOL` = **tolerância da fração** — padrão **50 min** (configurável). A fração de hora extra só é cobrada (como **1 hora cheia**) se **passar de 50 min**; até 50 min é **desprezada** (esse tempinho costuma ser espera de Uber / arrumar material, não trabalho de fato). **Nunca há "meia hora"** — a hora extra é sempre em horas inteiras.

### 5.2 Fórmula **por evento** (tipos com `geraHoraExtra = sim`)
```
h = duração em horas do turno (check-in → checkout; PODE cruzar a meia-noite)
Se o lançamento NÃO tem horários (só o cachê): total = C  (sem hora extra).

se h <= J:
    total = C
senão:
    blocos = floor(h / J)
    resto  = h - blocos * J                       # sobra do último bloco (horas + fração)
    # arredonda a fração pra hora cheia SÓ se passar da tolerância (50 min):
    fracMin      = (resto - floor(resto)) * 60
    horasExtras  = floor(resto) + (fracMin > TOL ? 1 : 0)

    se resto <= W:   total = blocos * C + horasExtras * r
    senão:           total = (blocos + 1) * C      # passou da janela → +1 cachê (dobra/triplica…)

total = arredondaPraCima(total)   # sem centavos
```
Regra em palavras: até a jornada = 1 cachê. Passou: conta blocos cheios de `J`; a sobra do último bloco vira **hora extra em horas inteiras** (a fração só conta se **passar de 50 min**). Se a sobra **passar da janela** (4h), vira **mais um cachê cheio** (virar a noite cansado vale cachê dobrado). **Cada bloco tem franquia nova.**

### 5.3 Tabela de referência (J=12h, C=350, W=4h, r=30, TOL=50min)
**Turnos "redondos":**
| Duração | Cálculo | Valor |
|---|---|---|
| até 12h | 1 cachê | **R$ 350** |
| 13h | 350 + 1×30 | R$ 380 |
| 14h / 15h | 350 + 2/3×30 | R$ 410 / 440 |
| 16h (12+4) | 350 + 4×30 | **R$ 470** |
| 17h (passou da janela) | 2 cachês | **R$ 700** |
| 24h | 2 cachês | R$ 700 |
| 28h | 2×350 + 4×30 | R$ 820 |
| 29h / 32h (passou da janela do 2º) | 3 cachês | **R$ 1.050** |

**Turnos com fração (regra dos 50 min):**
| Duração | Sobre a jornada | Cobra | Valor |
|---|---|---|---|
| 12h50 | +50 min | dentro da tolerância → nada | **R$ 350** |
| 12h51 | +51 min | passou de 50 → 1h extra | R$ 380 |
| 13h40 | +1h40 | 1h cheia (40 min = tolerância) | R$ 380 |
| 13h51 | +1h51 | 1h + fração >50 → 2h | R$ 410 |

Serve para qualquer jornada (10h, 8h…): muda só o `J` que o usuário configura.

### 5.4 Tipos **flat** (`geraHoraExtra = não`, ex.: deslocamento / diária de viagem)
`total = C` independentemente das horas (a duração é registrada só para histórico/desgaste).

### 5.5 Agregação do **dia** (empilhamento + deslocamento)
```
eventos_do_dia = registros com mesma dataRef
# "empilha?" = cobrarSeparado (override do lançamento) se definido; senão tipo.podeSegundoCache
stackers    = eventos que empilham    # trabalho / diária de viagem (cada um é 1 cachê)
naoStackers = eventos que não empilham # deslocamento curto

total_dia = soma(valorEvento(e)) para e em stackers
se stackers está vazio e há naoStackers:
    total_dia += 1 cachê de deslocamento     # única atividade do dia; IDA + VOLTA ainda = 1 cachê
    (todos os deslocamentos extras = R$0, apenas registrados)
senão:
    naoStackers = R$0 (registrados)           # já há cachê de trabalho no dia → deslocamento não cobra
```
> Impede o **cachê duplo indevido** ("desmontou de madrugada + voltou de viagem + fez outro evento": os dois trabalhos contam, o deslocamento entre eles não). Um dia só de deslocamento (ida + volta) = **1 cachê**.
> **Override por lançamento:** `cobrarSeparado` (sim/não) força se aquele lançamento gera cachê próprio, ignorando o padrão do tipo — ex.: a mesma viagem paga como diária por um cliente e absorvida por outro.

### 5.6 Arredondamento
Tudo **para cima, sem centavos** (R$ inteiro) — para não gerar "R$7,89 sobrando" e facilitar a conferência. Horas extras sempre em **horas inteiras** (regra dos 50 min, §5.1).

### 5.7 Fuso horário e datas (à prova de viagem)
- **Instantes com offset:** check-in/checkout guardados em ISO **com fuso** (ex.: `2026-07-03T22:00-03:00`).
- **Duração é TZ-safe:** a hora extra vem da **diferença de instantes** → correta mesmo trabalhando em outro fuso (ex.: evento no AM, técnico de Brasília). Viajar não altera o cálculo.
- **`dataRef` manda no agrupamento:** o "dia" do cachê é o campo **explícito** que o técnico define — **nunca** derivado do relógio/fuso do aparelho. Assim a quebra de meia-noite e o agrupamento do dia não bugam em viagem.

## 6. Registro do trabalho (entrada manual + check-in)
O registro é **por evento**, e a **entrada manual é o caminho principal** — o check-in/checkout ao vivo é só um **atalho opcional**.

- **Manual (principal):** pela Agenda, lança o evento com **tipo**, **cliente/local** (ou linka a um Projeto) e, se quiser, **hora de início e fim** — ou nem isso, só marca "1 cachê".
  - Com início/fim → o motor calcula hora extra (§5).
  - **Sem horários → 1 cachê base** do tipo (sem hora extra). Bom para os serviços curtos do dia a dia.
- **Check-in / Checkout (atalho ao vivo):** botão que carimba a **hora** (e o **GPS**, opcional) na entrada e na saída, preenchendo os mesmos campos do lançamento manual.
- **Turno aberto:** banner "check-in ativo desde HH:MM em [local] — [Checkout]".
- **Late checkout:** se ficou um turno aberto de um dia anterior, o app avisa ao abrir e deixa preencher/ajustar a hora de saída (marca `lateCheckout = true`).
- **Tolerância a imprecisão:** como a hora extra é em horas inteiras com tolerância de 50 min (§5.1), pequenos erros de horário **quase nunca mudam o valor** — dá pra registrar "de cabeça" depois sem medo (mudar 1 hora extra exige errar ~1h; mudar um cachê inteiro, ~4h).

## 7. Estruturas de dados (rascunho)
```
ActivityType {
  id, nome, cor,
  valorBase: number,          // R$ (default do cachê)
  geraHoraExtra: boolean,
  podeSegundoCache: boolean,
  ativo: boolean
}

WorkEntry {                    // = um evento/serviço
  id,
  dataRef: "YYYY-MM-DD",       // dia de referência (agrupamento; explícito, não derivado do fuso)
  tipoId,                      // -> ActivityType
  eventoId?: string,           // link opcional a um Projeto do LedLab
  clienteLivre?, localLivre?,  // quando não linkado a projeto
  checkin?: ISOcomOffset,      // opcional; sem checkin/checkout => 1 cachê base (sem hora extra)
  checkout?: ISOcomOffset,
  lateCheckout?: boolean,
  local?: { lat, lng, label? },
  valorOverride?: number,      // cachê específico deste evento
  cobrarSeparado?: boolean,    // override: força gerar (ou não) cachê próprio no dia, ignorando o tipo
  obs?
}
// Sem campo de status de pagamento (decisão: menos fricção; §12.3).

Config (em ledlab.prefs.v1) {
  jornadaH: number = 12,          // global
  janelaExtraH: number = 4,       // global
  toleranciaExtraMin: number = 50,// global (fração só vira hora extra passando disso)
  moeda: "BRL",
  arredondamento: "cima-inteiro"
}

Storage: ledlab.worklog.v1 (WorkEntry[]) · ledlab.activitytypes.v1 (ActivityType[])
```

## 8. Telas / UX (mobile-first)
- **Agenda (grade do mês) — vira o "ponto":** dia **tocável** → bottom sheet "adicionar atividade" (data já preenchida), com **entrada manual** (tipo, cliente/local, horários opcionais) ou **check-in**. Cada dia mostra **marcadores por tipo/cor**; eventos do LedLab ficam de fundo (contexto). FAB **"Check-in agora"**.
- **Check-in / Checkout:** atalho ao vivo (tipo + GPS + hora); banner de turno aberto; late checkout.
- **Financeiro (aba própria):** filtros por **período** e **cliente**; **recibo por evento** — cada evento **datado**, com sua **franquia de horas** e **valor**; quando o dia tem **mais de uma atividade**, agrupa sob o dia com **subtotal do dia**. Total do período no rodapé. Export **PDF** (recibo) + **CSV** (planilha/contador). *(Sem status de pago.)*
- **Configurações:** jornada (global), janela (global), tolerância da fração (global); **CRUD de tipos de atividade** (nome, cor, valor base, "gera hora extra?", "pode 2º cachê?").
- **Dashboard (fase 4):** card "diárias do mês · total do mês".

## 9. Casos de borda (tratados)
- **Turno cruzando a meia-noite:** é **um** evento; a duração vai de check-in a checkout; blocos se repetem dentro dele (32h = 3 cachês).
- **Vários eventos no mesmo dia:** cada um é um cachê independente com franquia própria (nunca soma o span do dia).
- **Sem horários:** lançamento só com o cachê (sem início/fim) = **1 cachê base** do tipo, sem hora extra.
- **Esqueceu o checkout:** late checkout retroativo por evento.
- **Deslocamento:** só cobra se for a **única** atividade do dia (mesmo **ida + volta = 1 cachê**); havendo trabalho no dia, é registrado a R$0.
- **Viagem longa cobrada à parte:** usar o tipo **"Diária de viagem"** (empilha) ou `cobrarSeparado = sim` no lançamento.
- **Tempinho a mais (≤50 min):** tolerância — não vira hora extra (espera de Uber / arrumar material).
- **Fuso em viagem:** duração pelos instantes (com offset); dia pelo `dataRef` explícito (§5.7).
- **Valor variável:** `valorOverride` por evento (cachê não é igual entre técnicos/clientes).

## 10. Fora de escopo (por ora)
- **Auditoria / aprovação externa** (assinatura de produtor, prova de terceiros, GPS contínuo): **não é objetivo** — é um **registro pessoal** do técnico. Quem confere é o **financeiro do contratante**, cruzando os dados e negociando por técnico.
- **Auto-checkout por geofencing** (sair do local): **não é confiável em PWA** (sem GPS em segundo plano garantido, pior no iOS) → checkout manual + late checkout.
- **Reverse-geocode** (coordenada → endereço): precisa de serviço externo → fase posterior; no MVP guarda lat/lng + link pro mapa (ou usa o `local` do evento linkado).
- **Status de pagamento (pago/a receber):** removido de propósito — §12.3.
- **Multiusuário / sync / backend:** só se virar produto — o storage isolado deixa isso barato depois.

## 11. Plano de implementação (fases)
- **Fase 0 — motor + config:** `services/worklog.js` (fórmula §5, por evento; agregação §5.5; **política de fuso §5.7** — instantes com offset), hooks `useWorklog`/`useActivityTypes`, Configurações (jornada, janela, tolerância, tipos).
- **Fase 1 — registro pela Agenda:** grade tocável → **entrada manual** (com/sem horário); marcadores; aviso de cachê duplo (deslocamento). (Sem GPS ainda — já usável.)
- **Fase 2 — check-in/out + GPS + late checkout:** turno com local, checkout, late checkout, cálculo por evento (cruzando meia-noite), aviso de jornada.
- **Fase 3 — Financeiro:** fechamento por período/cliente; recibo por evento **agrupado por dia** (subtotal do dia); export PDF + CSV.
- **Fase 4 — refino:** card no Dashboard, reverse-geocode opcional, valores recorrentes por cliente.

## 12. Decisões (todas fechadas)
- **12.1 ✅ Deslocamento ida + volta no mesmo dia = 1 cachê** (só um por dia; extras registrados a R$0).
- **12.2 ✅ Jornada é GLOBAL** — mesma franquia para todos os tipos. Sem override por tipo.
- **12.3 ✅ Sem status de pagamento** — o financeiro só soma o que foi registrado no período.
- **12.4 ✅ Fechamento por evento** — datado, com franquia e valor; agrupa por dia com subtotal quando há +1 atividade.
- **12.5 ✅ Fração de hora extra = regra dos 50 min** — só vira 1 hora cheia passando de 50 min; até 50 min é tolerância. Sempre horas inteiras. `toleranciaExtraMin` configurável.
- **12.6 ✅ Janela é GLOBAL** e configurável.
- **12.7 ✅ Fuso à prova de viagem** — instantes com offset; duração pela diferença de instantes; `dataRef` explícito manda no dia (§5.7).
- **12.8 ✅ Viagem flexível** — tipo "Diária de viagem" (empilha) × "Deslocamento" (absorvido) + override `cobrarSeparado` por lançamento.
- **12.9 ✅ Entrada manual first-class** — horários opcionais (sem horário = 1 cachê base); check-in ao vivo é atalho. Billing tolerante a imprecisão (§6).

> **Especificação fechada.** Pronta para iniciar a **Fase 0** (motor + config) quando você quiser.

---

### Changelog
- **2026-07-03 (review externo):** fuso horário à prova de viagem (§5.7); **entrada manual first-class** (§6); tipo **"Diária de viagem"** + override `cobrarSeparado` (§4/§5.5); **auditoria externa fora de escopo** (§10, registro pessoal — o financeiro cruza os dados).
- **2026-07-03 (fração de hora extra):** regra dos 50 min (§5.2/§12.5).
- **2026-07-03 (refinos):** jornada e janela globais; sem status de pagamento; deslocamento ida+volta = 1 cachê; fechamento por evento agrupado por dia.
- **2026-07-03** — v0 do rascunho.
