# Rigging & Estrutura — espeque da fase (F2)

> **Status: GROUND (2026-07-24) · motor calibrado na frota da casa (2026-07-25).**
> Domínio mapeado + motor puro (`services/rigging.js`) com testes. UI e relatório
> vêm depois das decisões que ainda faltam (§6).
>
> ⚠️ **Segurança:** tudo aqui é **planejamento de referência**. Carga suspensa sobre
> pessoas é responsabilidade do **rigger habilitado** que dimensiona, monta e assina
> o rigging do evento — o app nunca substitui esse papel (mesma postura do box de
> segurança AC do Caderno).

## 1 · Vocabulário

| Termo | O que é |
| --- | --- |
| **Coluna** | pilha vertical de gabinetes (a tela tem `cols` colunas de `rows` gabinetes). |
| **Bumper** | viga no topo da parede que recebe 1..N colunas penduradas nela. |
| **Ponto** | onde o bumper pendura: talha de corrente, spanset na truss, olhal. |
| **Talha** | a corrente que sobe a parede. **A frota é 100% talha MANUAL de 1 t** — não tem motor elétrico, a subida é na mão (afeta o texto do Caderno: não existe "descer no controle"). |
| **WLL** | Working Load Limit — carga de trabalho da talha/acessório (o fator de projeto ~5:1 do fabricante **já está embutido** no WLL; nunca somar fator por cima do WLL, e nunca passar dele). |
| **Voado (flown)** | parede pendurada em pontos. É o escopo desta fase. |
| **Ground support** | parede apoiada no chão com torre/ballast — **fase seguinte** (entra vento, torre, contrapeso). |

## 2 · O modelo (voado)

```
      ponto        ponto        ponto
        │            │            │
   ┌────┴────┐  ┌────┴────┐  ┌────┴────┐
   │ bumper  │  │ bumper  │  │ bumper  │   ← colunasPorBumper (2 no exemplo)
   ├────┬────┤  ├────┬────┤  ├────┬────┤
   │gab │gab │  │gab │gab │  │gab │gab │
   │gab │gab │  │gab │gab │  │gab │gab │   ← rows
   └────┴────┘  └────┴────┘  └────┴────┘
```

- `pesoColuna = rows × peso do gabinete`
- **`colunasPorBumper` é DERIVADO**, não configurado: `floor(largura do bumper ÷ largura do gabinete)`, mínimo 1. Bumper de 100 cm com gabinete de 500 mm = 2 colunas; de 50 cm = 1. Gabinete mais largo que a viga (CB5 de 600 mm no bumper de 50 cm) = 1 coluna **com aviso**. Dá pra sobrescrever à mão.
- `bumpers = ceil(cols / colunasPorBumper)` — o último pode ficar incompleto
- `pontos = bumpers × pontosPorBumper`
- **Carga por ponto = pior caso** (bumper cheio): `(colunasPorBumper × pesoColuna + pesoBumper) / pontosPorBumper + acessórios da fixação + extras`
- **Checagem da talha**: `pctTalha = carga por ponto ÷ WLL`. `rigTone` espelha o elétrico — **> 80 % laranja, > 100 % vermelho**. Como a frota é só 1 t, não existe "escolher motor maior": ou cabe, ou divide a parede em mais pontos.
- `utilizacao` = limite DURO opcional em fração do WLL (padrão 1 — o aviso de 80% já vem pelo tom)

### Catálogo da casa (frota real, respostas de 25/07)

| Bumper | Largura | Colunas (gab. 500 mm) | Peso |
| --- | --- | --- | --- |
| Bumper 50 cm | 500 mm | 1 | ⚠️ 8 kg *(estimado)* |
| Bumper 100 cm | 1000 mm | 2 | ⚠️ 14 kg *(estimado)* |

| Fixação | Acessórios | Peso no ponto |
| --- | --- | --- |
| Algema/garra | garra | ⚠️ 3 kg *(estimado)* |
| Ilhó + cinta + manilha | cinta de carga, manilha | ⚠️ 5 kg *(estimado)* |

Os pesos marcados ⚠️ são **placeholder** (`estimado: true` no código) até a pesagem
real da frota; enquanto estiverem assim, o motor devolve o aviso *"Pesos de
bumper/acessórios ainda são estimativa"* e o Caderno tem que rotular como tal.
A lista de acessórios por fixação já é o embrião da picking list da locadora.

Tudo mais já sai dos dados que o app tem hoje (`cols`, `rows`, `gabinete.peso`,
`gabinete.dimW`); nenhuma migração é necessária pro motor.

## 3 · O que o motor NÃO cobre (ainda)

- **Empilhamento máximo** do gabinete (datasheet: "max hanging 8 high"): precisa de
  campo novo no gabinete (§6-Q5). O motor aceita `maxRows` opcional e avisa.
- **Ground support / vento / ballast** — fase seguinte.
- **Layout físico da montagem** (o 3º layout, telas posicionadas no palco): fica
  adiado; esta fase calcula **por tela**, sem posições.

## 4 · Pitch × distância (a outra metade da fase)

Recomendador simples, expande o Aspect Ratio:
- distância mínima confortável ≈ `pitch(mm) × 1` em metros (regra de mercado 1×);
- distância "retina" (pixel invisível, acuidade 20/20) ≈ `pitch(mm) × 3.438` m;
- faixa recomendada exibida entre as duas, + inverso (distância → pitch máximo).

Motor trivial; o valor está na UI (onde mostrar: junto do Aspect Ratio, que já
recebe "expansões" da F2). Implementa depois do rigging.

## 5 · Plano de fases

| Fase | Entrega | Depende de |
| --- | --- | --- |
| **R0 ✅** | motor puro `services/rigging.js` + testes (este ground) | — |
| **R1** | seção **Rigging** no Caderno Técnico (disciplina "estrutura", peso por tela → bumpers/pontos/motor por tela + total do projeto) | Q1–Q4 |
| **R2** | painel no app (onde morar — §6-Q4) com os controles finos | R1 |
| **R3** | campos de datasheet no gabinete (`maxRows` voado) + validação | Q5 |
| **R4** | pitch×distância no Aspect Ratio | — |
| **R5+** | ground support (torre/ballast/vento) | tudo acima |

## 6 · Decisões de produto (pro dono)

### ✅ Respondidas (25/07/2026)

- **Q1 — Bumper = CATÁLOGO** (`BUMPERS` em `rigging.js`): 2 tamanhos, 50 cm e
  100 cm, com 2 tipos de fixação (algema/garra · ilhó + cinta de carga + manilha).
  Como a largura da viga está no catálogo, `colunasPorBumper` virou **derivado** —
  o técnico não digita mais esse número.
- **Q2 (parte) — Talhas:** todas de **1 t e MANUAIS**. `TALHAS_KG = [1000]`, e a
  saída do motor deixou de ser "qual motor" pra ser "cabe na talha de 1 t?".
  O termo "motor" saiu do domínio (`sugereMotor` → `sugereTalha`).

### ⏳ Ainda faltam

- **Q2a — Pesos reais:** quanto pesa o bumper de 50 cm e o de 100 cm? E o conjunto
  de fixação (garra / cinta+manilha)? Hoje são estimativas marcadas no código.
- **Q2b — Pontos por bumper:** o de 100 cm sobe em 1 ponto ou 2? (o de 50 cm
  presumo 1). Isso muda a carga por ponto pela metade — é o número mais sensível.
- **Q3 — Utilização do WLL:** proposta implementada = **limite duro no WLL cheio +
  laranja acima de 80%**, idêntico ao elétrico. Confirma, ou quer 80% como teto duro?
- **Q4 — Onde mora a UI:** as abas do projeto estão "infladas" (palavra dele).
  Opções: (a) card na aba Dados por tela; (b) seção só no Relatório/Caderno;
  (c) página de Gestão desktop-only (como Equipamentos). Sugestão: começar por
  (b) — o Caderno é onde a locadora/produção lê peso hoje.
- **Q5 — Campo novo no gabinete:** `maxRows` voado (datasheet). Entra no seed
  certificado ou só na biblioteca pessoal?
