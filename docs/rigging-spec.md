# Rigging & Estrutura — espeque da fase (F2)

> **Status: GROUND (2026-07-24).** Domínio mapeado + motor puro (`services/rigging.js`)
> com testes. UI e relatório vêm depois das decisões de produto (§6).
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
| **Ponto** | onde o bumper pendura: motor (talha de corrente), spanset na truss, olhal. |
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
- `bumpers = ceil(cols / colunasPorBumper)` — o último pode ficar incompleto
- `pontos = bumpers × pontosPorBumper`
- **Carga por ponto = pior caso** (bumper cheio): `(colunasPorBumper × pesoColuna + pesoBumper) / pontosPorBumper + extras` (manilhas/cintas/estropo/cabos somados como `extraKgPorPonto`)
- **Sugestão de motor** = menor WLL de `{250, 500, 1000, 2000}` kg que aguenta a carga × utilização; acima de tudo = **estouro** (vermelho, como no elétrico)
- `utilizacao` = fração do WLL admitida (1 = usar o WLL cheio; 0.8 = margem p/ carga dinâmica — decisão de produto, §6)

Tudo já sai dos dados que o app tem hoje (`cols`, `rows`, `gabinete.peso`); nenhuma
migração é necessária pro motor.

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

- **Q1 — Bumper:** vira catálogo próprio (como controladoras) ou par de campos
  (`peso`, `colunas`) direto na config? Pesos/larguras REAIS da frota dele mandam.
- **Q2 — Prática da casa:** quantas colunas por bumper ele usa (1 ou 2)? Quantos
  pontos por bumper? Quais motores existem na frota (250/500/1000/2000)?
- **Q3 — Utilização do WLL:** usar 100% do WLL ou padrão 80% (margem dinâmica),
  espelhando a regra dos 80% do elétrico?
- **Q4 — Onde mora a UI:** as abas do projeto estão "infladas" (palavra dele).
  Opções: (a) card na aba Dados por tela; (b) seção só no Relatório/Caderno;
  (c) página de Gestão desktop-only (como Equipamentos). Sugestão: começar por
  (b) — o Caderno é onde a locadora/produção lê peso hoje.
- **Q5 — Campo novo no gabinete:** `maxRows` voado (datasheet). Entra no seed
  certificado ou só na biblioteca pessoal?
