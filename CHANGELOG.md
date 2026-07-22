# Changelog

Histórico de versões do LedLab Core. Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versionamento semântico. A nota curta que aparece dentro do app (aviso de atualização) fica em `src/nav.js` → `WHATS_NEW`.

## [1.5.0] — 2026-07-22

**Configurações sem sair do lugar + numeração de cabos em serpente.**

### Configurações virou um painel (overlay)
Antes, abrir **Configurações** trocava de página e **desmontava** onde você estava — pra ver o efeito de um ajuste (ex.: a numeração dos cabos) tinha que re-navegar *Projetos › abrir projeto › Cabeamento* toda vez, e o mesmo pra mão de obra e futuras telas. Agora ela abre num **painel deslizante por cima da tela atual**, com **botão de fechar no topo** (ou toque fora / **Esc**). A página de baixo nunca sai, então fechar te devolve **exatamente onde estava** — e como as preferências são reativas, a tela atrás já reflete a mudança na hora. Vale pro celular (tela cheia) e pro desktop (painel lateral). Reaproveita o `Drawer` que já existia; fica **abaixo** dos diálogos de confirmação (o "restaurar de fábrica" segue aparecendo por cima).

### Numeração dos cabos: modo Serpente + seletor visual
A ordem de numeração das portas ganhou o modo **Serpente** (boustrophedon): em vez de toda faixa recomeçar do mesmo lado (**Zigzag**, com o "salto de volta"), o trajeto flui **contínuo**, invertendo o sentido a cada faixa — é o padrão do *Quick Connection* do NovaLCT. O seletor em *Configurações › Elétrica & cabeamento* deixou de ser um dropdown de texto e virou **visual** (estilo "Quick Topo"): um toggle **Zigzag/Serpente** + as **8 ordens** (4 Coluna + 4 Linha) como ícones que desenham o caminho na grade 3×3 (verde = início, vermelho = fim). Antes só apareciam 6 — agora fecham as 8 combinações possíveis. Guardado como sufixo `-serp` no `cableNumbering`; **retrocompatível** (o padrão segue zigzag, nenhum projeto muda).

### Corrigido
- **Check-in de 1 toque (v1.4.3) não some mais.** Sem turno aberto, tocar em "Check-in agora" criava o turno, mas quando o GPS resolvia (quase sempre no desktop) uma segunda escrita partindo do estado **congelado no render** apagava o turno recém-criado. As escritas das Diárias (`addEntry`/`updateEntry`/`removeEntry`) passam a usar *updater* funcional (partem sempre do estado mais recente) — o check-in fica, e o local é anexado nele.

### Qualidade
- 180 → **188 testes** (ordem serpente nos dois níveis de motor + cobertura das 8×2 combinações); lint limpo.

## [1.4.3] — 2026-07-18

**Check-in num toque na Visão Geral.** Sem turno aberto, a Visão Geral (antiga tela inicial) mostra um botão **Check-in agora** que começa o turno na hora — com o tipo de atividade mais recente como padrão — e salva o GPS em segundo plano. Antes eram ~4 toques (Agenda › Diárias › Check-in › confirmar); agora é um só. O checkout já era um toque aí. Também: **"Dashboard" → "Visão Geral"** (nome em português).

## [1.4.2] — 2026-07-18

**Menu por seções no celular.** A barra de baixo passa a ter uma aba por **seção** (as mesmas do desktop): **Início, Financeiro, Gestão, Ferramentas, Informativo**. Tocar numa seção abre uma folha com os itens dela — ou navega direto quando a seção só tem um item. **Configurações** virou a **engrenagem** no topo. Fecha a reorganização iniciada na v1.4.1.

## [1.4.1] — 2026-07-18

**Menu reorganizado em seções.** A barra lateral (desktop) agora agrupa tudo em seções, de cima pra baixo: **Início** (Dashboard, Agenda, Projetos), **Financeiro** (Financeiro, Reembolso), **Gestão** (Gabinetes), **Ferramentas** (Diagramação, Test Cards, Aspect Ratio) e **Informativo** (Base de Conhecimento). Só organização — nenhuma tela mudou de lugar por dentro. (O menu do mobile será revisto na sequência.)

## [1.4.0] — 2026-07-17

**Controles de cabeamento de volta — e sem ficar preso ao Free Topology.** No rework das Screens tinham sumido os controles finos do cabeamento. Voltaram, por Screen, num painel **"Avançado"** recolhido (a Screen já abre cabeada num bom padrão; quem quiser afinar, expande).

- **Régua da porta** (o interruptor do *Free Topology / regra do retângulo*):
  - **Área (retângulo)** — a porta reserva o retângulo circunscrito; buraco é pago. **Agora é o padrão** (é a régua mais usada; Free Topology desligado).
  - **Pixels (real)** — conta o gabinete real (Free Topology ligado), pra controlador que tem a função.
- **Disposição**: **Linha / Coluna / Área** (na régua de área) ou **Automática** (serpentina, na régua de pixels). Cada uma corta a corrente em cabos de um jeito.
- **Profundidade**: **8-bit / 10-bit** (10-bit corta o orçamento da porta pela metade).
- Vale pro **Sinal e pro AC** (o AC não tem régua de pixels — energia conta por corrente; tem Linha/Coluna/Área/Atrelar ao sinal/Livre).
- Os controles ficam num **Avançado** recolhido, com resumo (ex.: "Área · Área · 8-bit"), 1 linha de ajuda e ponteiro pra Base de Conhecimento — poder sem obrigação, pra não pesar na curva de quem está começando.

Reforço técnico: o motor cross-tela reaproveita as estratégias de bloco (Linha/Coluna/Área) do cabeamento por tela sobre a união das telas de cada modelo; a régua de área numa Screen com vãos é literalmente a regra do retângulo.

## [1.3.1] — 2026-07-17

**AC por Screen — consistência com o sinal.** Fecha o rework: o cabeamento de energia (AC) passa a ser organizado por Screen igual ao sinal, pra contabilizar os cabos do mesmo jeito. Antes o AC ficava por tela; agora os dois vivem na mesma tela e na mesma lógica.

- Cabeamento › **Energia (AC)** é por Screen: **Automático** (serpentina por modelo, cortada em cabos pela corrente do conector), **Livre** (desenha à mão), e **Atrelar ao sinal** (a energia acompanha a rota de dados, repartida em cabos balanceados por corrente).
- Mesmos avisos do sinal: **estouro em vermelho** quando o cabo passa da corrente do conector (não bloqueia). Numeração 1..N por Screen.
- Relatório › AC: **uma seção por Screen** (carga por cabo × conector), no mesmo formato do sinal. Test Card e Composição mostram o número real do cabo de AC.
- Um só componente serve sinal e AC (menos código, comportamento idêntico). Sinal em px/porta; AC em gabinetes/cabo por corrente.
- Retrocompatível: projeto sem Screen segue como antes.

## [1.3.0] — 2026-07-17

**Screens — você monta os sistemas.** Reescrita do canvas da v1.2 depois do teste de campo: a v1.2 agrupava as telas sozinha (por modelo de gabinete), e isso estava errado — juntava dois IMAG que ficam a 20 m um do outro num cabo só. Metade dos eventos muda a configuração na montagem, então o app não pode impor um plano. Agora **quem agrupa é o técnico**.

Uma **Screen** é o que você decide que vai no mesmo sistema — como você configuraria no NovaLCT. Um projeto tem uma Screen (caso simples) ou várias (o Admicon vai ter ~8). O agrupamento vem da sua cabeça e da logística do evento, não da geometria.

### Aba Screens (era Canvas)
- Você **cria as Screens à mão**: dá nome, coloca só as telas que quer, arruma arrastando. Cada Screen tem origem própria (0,0), igual no NovaLCT.
- **Auto-arrumar** sugere um arranjo (agrupa por modelo, empilha faixas), mas é só ponto de partida — você ajusta. Aviso de sobreposição, cor por modelo de gabinete.
- Botão **1 Screen por tela** pra quem não quer agrupar. Estado vazio explica o conceito.

### Cabeamento por Screen
- O Cabeamento virou um toggle **Sinal | Energia (AC)**.
- **Sinal** é por Screen: escolhe a Screen e cabeia em **Automático** (serpentina por modelo, com Sentido/Início) ou **Livre** — desenha cada cabo, importa do automático e edita, move gabinete de cabo. É no livre que se faz a "gambiarra" (18 gabinetes numa porta que estoura 1%): o app mostra em vermelho, mas deixa fazer.
- A corrente **atravessa telas** do mesmo modelo. Portas numeradas 1..N **por Screen** (cada Screen é um controlador).
- **AC continua por tela** — circuito elétrico segue o físico, e a tela é um bloco físico.

### Relatório, Test Card e mapa de pixels
- Relatório › Sinal: **uma seção por Screen** (tamanho, portas, telas que cada porta percorre, X/Y de canvas) + aviso de telas que ficaram "sem Screen".
- Test Card e Composição: o selo mostra o **número real da porta** da Screen.
- **Mapa de pixels (CSV)** por Screen, em coordenada de canvas com coluna Screen — o X/Y que se digita no NovaLCT.

### Compatibilidade
- Projeto **sem Screen** funciona como antes (cabeamento por tela). Nada quebra; a migração é você montar as Screens quando quiser.

### Nota de exportação (mobile)
- No **PC** o nome do PDF sai na convenção (`projeto_relatorio_tipo_data`). No **celular**, quando o app está instalado como PWA, o sistema nomeia o PDF pelo nome do app (`ledlabcore.pdf`) e ignora o título da página — limitação do print-de-PWA, não do app. PNG e CSV (download de verdade) saem com o nome certo. Como o fluxo de PDF é no PC, fica como está.

## [1.2.0] — 2026-07-17

**O canvas do processador.** A maior mudança de arquitetura desde a v1.0: o cabeamento de sinal deixa de ser preso à tela e passa a correr sobre a parede inteira. Saiu de um teste de campo real (projeto "Colação de Grau", 7 telas numa VX1000) onde ficou claro que o app "é legal de ver mas não tem utilidade prática" pra planejar.

**O diagnóstico:** "tela" é invenção nossa — um bloco de gabinetes iguais, ótimo pra montar e pra lista de material, mas que **não existe no NovaLCT**. Lá o que existe é a *Screen*: a parede toda, com as portas 1..N da controladora correndo por cima. Enquanto cada tela fosse uma ilha, o cabo nunca atravessava, a tira de 3 gabinetes comia uma porta inteira (15% de uso) e cada tela reiniciava no "Cabo 1".

### Aba Canvas (nova)
- **Canvas do processador**: as telas posicionadas na parede que a controladora enxerga, com arraste, snap, X/Y numérico e aviso de sobreposição. Cor **por modelo de gabinete** — mesma cor significa que a corrente pode encadear entre elas.
- **Auto-arrumar**: agrupa por modelo de gabinete e empilha as faixas. A corrente só encadeia gabinetes iguais (o manual do VX Pro exige *"The size of all cabinets must be the same"* pra topologia livre), então juntar o mesmo modelo é o que **torna** o cabo entre telas possível. Conferido contra um canvas montado à mão no NovaLCT: a regra chega no mesmo 2304×1344 sozinha.
- **Banner que ensina**: *"Cada tela sozinha gasta 10 portas. Neste canvas dá 6 — sobram 4."* Dá pra desperdiçar porta sem saber que a função existe.
- **Opcional de verdade**: o canvas só manda depois que você mexe nele (arrastar ou auto-arrumar). Antes disso é "Pré-visualização" e o projeto segue contando por tela. Projeto sem canvas não muda em nada.

### Sinal
- **A corrente atravessa telas.** Serpentina sobre um conjunto de gabinetes em coordenada de canvas, com os mesmos routing/corner de sempre (os 8 padrões de Quick Connection) e o mesmo corte balanceado. Na Colação de Grau: **10 portas → 6**, e uma delas percorre Tira 4 → Tira 3 → Tira 2 → Tira 1 → Central. Cinco telas, um cabo.
- **Numeração global das portas.** A controladora tem portas 1..N e a contagem não reinicia a cada tela — o relatório diz "Porta 83", que é a porta que o operador pluga. Vale também pros circuitos de AC, que têm numeração própria (circuito não é porta de dados). Antes, um projeto de 7 telas dava sete "Cabo 1".
- **Fonte única.** Relatório, Cabeamento, Test Card, Composição e mapa de pixels leem a mesma alocação. Duas respostas pra "quantas portas" é pior que uma resposta conservadora.

### Relatório e exportação
- Com canvas ativo, o **Sinal** vira a tabela de portas do projeto: porta, gabinetes, uso, **telas que percorre** e início X/Y. Sem canvas, o relatório sai igual ao de antes.
- **Mapa de pixels em coordenada de canvas** (aba Canvas → CSV) — é o X/Y que se digita no NovaLCT, e é o que faltava pro export servir pra alguma coisa. Ganhou coluna **Tela**: sem ela não dá pra achar o gabinete numa porta que cruza. O CSV por tela some quando o canvas manda (X/Y com origem na tela seria armadilha).
- **Cabeamento**: com canvas ativo, o modo Sinal mostra a **rota dentro da tela** (pra conferir o caminho) e avisa que a porta de verdade está no Canvas. O modo **AC continua inteiro nesta aba** — circuito elétrico segue o físico, e a tela é um bloco físico.

### Base de conhecimento
- Artigo **"Regra do retângulo e Free Topology"** ancorado em fonte primária: onde o "650.000" realmente mora nos manuais (nota da Configuração Rápida e constante da fórmula de baixa latência — nunca foi limite de porta em uso normal), a comparação VX1000 × VX Pro Series, e a fórmula `(1 − Y/H) × capacidade` da baixa latência.
- **"Capacidade da porta"**: as duas réguas deixam de ser enquadradas por marca de equipamento — quem decide é o Free Topology, um interruptor por tela no software.

### Limitação conhecida
- **Adjacência no canvas não é adjacência física.** O alocador pode encadear duas telas coladas no canvas mas distantes no palco — o cabo existe, mas é decisão sua. O layout físico (rigging, metragem de cabo) ainda não é modelado.

## [1.1.2] — 2026-07-14

### Diárias / Financeiro
- **Duração deixa de sair em hora decimal.** "9.9h" lia errado — 14:00–23:55 é **9h55**, não 9 horas e 9 décimos. Todas as durações passam a usar `9h55` / `4h` / `55min`, com um formatador **único** (`fmtDur`, no motor) usado pela planilha, pelo recibo, pelo texto do WhatsApp, pelas Diárias e pelo Dashboard — antes eram 3 formatadores duplicados e 5 pontos exibindo decimal.
- Motor passa a expor `duracaoMin` (minutos inteiros), evitando o vai-e-volta por float.
- **Cálculos auditados** (jornada 8h · janela 4h · tolerância 30min): hora extra, dobra de cachê, regra do deslocamento e override de valor conferidos contra dados reais — todos corretos. **Nenhum valor muda nesta versão**, só a exibição.

## [1.1.1] — 2026-07-14

### Relatório
- Tabela **Visão Geral**: colunas reordenadas para **Tela · Dimensão · Grade · Gabinete · Gab. · Peso · Carga** — a dimensão vem logo após a tela e o gabinete depois da grade (pedido de campo). Vale para todos os tipos de relatório que mostram a tabela.

## [1.1.0] — 2026-07-14

**Engenharia de sinal + polimento de UX.** Primeira leva da Fase 2 (o diferencial de engenharia) somada a refinamentos de interface, entregue depois de uma semana de teste de campo positivo.

### Sinal / cabeamento
- **Portas de dados reais (px/porta):** o nº de portas pode ser calculado pela capacidade real do processador (VX / série A / Colorlight) — pixels por porta escalando com refresh e profundidade de cor (8-bit ≈ 655.360 px, 10-bit ≈ 327.680 @60Hz). A régua de "área" (bounding box) continua como opção. Telas novas nascem em px; as existentes ficam em área (sem mudança silenciosa). Seletores Porta + Cor no Cabeamento e na Diagramação.
- **Canto de início da serpentina:** escolha por onde a corrente começa (4 cantos × 2 direções = os 8 padrões do "Quick Connection" do NovaLCT), pro mapa casar com a montagem física.
- **Mapa de pixels exportável:** botão "Mapa de pixels" (CSV: gabinete → porta → X/Y) no Cabeamento + tabela por porta no relatório "Mapa de cabos", pra transcrever no NovaLCT / Tessera.
- Freq (Hz) saiu do cabeamento do projeto (sistema profissional é 60 Hz de base; segue na Diagramação para estudo).

### Interface
- **Reordenar telas por arraste** (drag & drop; mouse e toque) no lugar dos botões ↑/↓.
- **Configurações em 3 sub-menus** (Engenharia · Cachês · Dados) + Cachês em 3 sub-abas (Cálculo · Recibo · Tipos); tudo recolhido por padrão. Corrigido o dropdown que ficava cortado atrás do card de baixo.
- Textos de ajuda enxutos pelo app.

### Qualidade
- 84 → **108 testes**; lint 0; CI verde.

## [1.0.0] — 2026-07-13 🎉

**Marco: primeira versão estável.** O LedLab Core cobre o ciclo completo do técnico de LED — engenharia (elétrica validada com datasheets/normas, cabeamento de sinal e AC, test cards, composição de telas, crop de vídeo), negócio (agenda com check-in/GPS, cachês, recibos, reembolso com comprovantes) e durabilidade (PWA offline total, backup, sincronização opcional na nuvem) — rodando no celular e no desktop.

### Blindagem da v1.0
- **Rede de testes ampliada: 66 → 84 testes.** Os módulos novos ganharam cobertura: cálculo de crop (`fillCrop`, casos validados na UI), nomes de arquivo padronizados (slug/carimbo) e a detecção de sobreposição da Composição (extraída pra `services/layout.js`, testável).
- **Código 100% limpo no lint — e agora o CI BLOQUEIA erro de lint.** Zeramos os 38 avisos pré-existentes com correções reais: padrões modernos de estado do React (ajuste durante o render em vez de setState em effect), medição de largura via ResizeObserver (zoom do relatório/recibo no mobile), cursor dos canvas sem ler ref no render, dependências de hooks completas. O motor de desenho do test card virou serviço (`services/testcardDraw.js`).
- **Infra de deploy atualizada.** GitHub Actions migradas do Node 20 (deprecado) pro Node 22 com checkout/setup-node v5 — sem warnings no pipeline.
- **Test Card:** tela sem gabinete não mostra mais "0×0 px · pitch NaN" no cabeçalho.

## [0.20.13] — 2026-07-13

### Adicionado
- **Composição: aviso de sobreposição.** Se duas telas ficarem uma sobre a outra, ambas ganham **borda vermelha** e aparece um aviso "⚠ telas sobrepostas" — segurança pra garantir que nada fica empilhado na composição. Encostar as bordas (lado a lado) não dispara o aviso; atualiza ao vivo enquanto arrasta.

## [0.20.12] — 2026-07-13

### Removido
- **Composição: crop de sinal por tela.** Tirado o "Marcar crop" por tela (e o selo no bloco) — a Composição é 100% organização de onde cada tela aparece. O cálculo de "quanto cortar" de um sinal fica no Aspect Ratio. A **posição/regiões** das telas (x/y/tamanho pro processador/media server) e o "Copiar regiões" continuam.

## [0.20.11] — 2026-07-13

### Adicionado
- **Aspect Ratio: dois modos de visualização.** Um toggle deixa ver como a imagem ficaria na tela: **Preencher (corta)** — a fonte com a janela de crop revelando a parte usada + o deslocamento (o que já tínhamos) — e **Encaixar (dentro)** — a imagem inteira dentro do painel preservando a proporção, com as **barras** (letterbox/pillarbox) desenhadas e medidas. Os dois usam o X + círculo de referência no conteúdo.

## [0.20.10] — 2026-07-13

### Alterado
- **Aspect Ratio mais focado.** Removidos os "tiles" de formato (que destacavam o aspecto/ratio mais próximo) e o stat de pixels já saíra antes — a visualização ficou só com o **crop** (fonte com X + círculo, janela revelando a parte usada + linha do deslocamento). A **tabela de resoluções padrão** saiu da ferramenta e virou artigo na **Base de Conhecimento** (Painéis › "Resoluções padrão de vídeo"), com um novo tipo de bloco de tabela.

## [0.20.9] — 2026-07-13

### Alterado
- **Aspect Ratio mais enxuto e visual.** Removido o seletor de presets de fonte (é quase sempre 1920×1080 — ficaram só os dois campos de largura/altura) e o stat de "Pixels". A **visualização agora mostra o crop de verdade**: a fonte com um X (diagonais) e um círculo no centro, a **janela de crop revelando** a parte que entra na tela (o resto escurece) e uma **linha tracejada com o valor do deslocamento** — dá pra ver na hora como a imagem fica ao deslocar em X/Y.

## [0.20.8] — 2026-07-13

### Melhorado
- **Crop com deslocamento (Aspect Ratio).** O modo "preencher" agora deixa **deslocar o recorte em X ou Y** (não só centralizado) — pra escolher qual faixa da fonte entra na tela, ex.: encaixar um sinal FHD 1920×1080 num simultâneo montado em pé. Mostra o tamanho do recorte, a escala e a região (x/y), com campo de deslocamento e botão "Centralizar".
- **Crop de sinal por tela (Composição).** Selecione uma tela → **Marcar crop** → informe a resolução do sinal (ex.: 1920×1080): o app calcula o recorte pra aquela tela, com deslocamento ajustável, mostra um selo "✂" com o tamanho no bloco e inclui a info no "Copiar regiões". Cálculo unificado com o Aspect Ratio (`services/crop.js`).

## [0.20.7] — 2026-07-13

### Adicionado
- **Crop / encaixe de vídeo (Aspect Ratio).** Informe a resolução da fonte (ou escolha um preset — Full HD, 4K UHD, 720p, DCI 4K, WUXGA, 8K) e veja como ela entra na sua tela: **encaixar** (mostra tudo, com barras — pillarbox/letterbox, quantos px e a escala) ou **preencher** (enche a tela cortando a fonte — o recorte em px, a região central e quanto corta de cada lado).
- **Regiões de crop na Composição.** A aba Composição passou a tratar o canvas como a **fonte de vídeo** e lista a região de cada tela (x · y · largura × altura), com um botão **Copiar regiões** — pronto pra colar no processador/media server (base pro export de slices do Resolume, fase 2).

## [0.20.6] — 2026-07-13

### Alterado
- **Ordem das abas do projeto.** "Relatório" agora vem **antes** do "Test Card" — o relatório é o entregável do dia a dia, enquanto o test card serve mais pra campo/quando pedirem (fica junto da Composição, no fim). Nova ordem: Dados › Energia (AC) › Cabeamento › Relatório › Test Card › Composição.

## [0.20.5] — 2026-07-13

### Alterado
- **Aviso de nova versão virou um modal.** Depois que o app atualiza, em vez de um toast que sumia rápido (dava pra não ver a tempo), aparece um modal com as novidades da versão — dá pra ler com calma e fechar quando quiser (botão "Entendi", X, clique fora ou Esc). Aparece uma vez por atualização; na primeira instalação não aparece.

## [0.20.4] — 2026-07-13

### Adicionado
- **Relatório "Mapa de cabos".** Novo tipo de relatório dedicado ao cabeamento: reúne o mapa de cabos de **sinal** e de **energia (AC)** de todas as telas num documento só (com os selos de início de cabo e a carga por cabo/porta). Sai com nome `projeto_relatorio_mapa-de-cabos_data-hora`.

### Alterado
- **Relatório Elétrico ficou enxuto.** O mapa de cabos AC saiu do relatório Elétrico (foi pro novo "Mapa de cabos") — o Elétrico agora traz só as tabelas (kW/kVA/corrente/disjuntor/gerador). O relatório "Completo" segue com tudo.

## [0.20.3] — 2026-07-13

### Melhorado
- **Nomes de arquivo padronizados ao salvar.** Relatórios, test cards, composições, recibos e os backups/exportações agora saem com nome automático no padrão `projeto_tipo_data-hora`, sem precisar digitar. Exemplos: `matsuri_relatorio_completo_2026-07-13_1908.pdf`, `matsuri_tela-3_testcard_2026-07-13_1908.png`, `matsuri_composicao_….png`, `matsuri_2026-07-13_1908.ledlab.json`, `ledlab-backup_….json`. Acentos e símbolos viram texto simples e a data/hora mantém os arquivos ordenados. (Para PDF, o navegador usa esse nome como sugestão ao "Salvar como PDF".)

## [0.20.2] — 2026-07-13

### Adicionado
- **Composição: predefinições do Test Card.** A aba Composição ganhou o mesmo seletor de predefinições do Test Card — as embutidas (mapa de gabinetes, alinhamento/geometria, cor sólida, barras de cor, mapa de cabos) **e as que você salva no Test Card**. Aplicar uma predefinição troca o estilo de todas as telas da composição de uma vez, inclusive o **mapa de cabos** (agora renderizado por tela na composição). Os ajustes rápidos (padrão, números, info) continuam disponíveis.

## [0.20.1] — 2026-07-13

### Corrigido
- **Selecionar/trocar o gabinete de uma tela voltou a funcionar** (aba Projetos › Dados). Depois da migração dos dropdowns (v0.19.0), escolher um gabinete gravava "sem gabinete" — o dropdown novo entregava o id do gabinete como número e o código comparava com texto (`String(id) === valor`), então nunca encontrava e zerava a seleção. Isso também deixava o modo **Metros** inacessível (sem gabinete não há dimensão pra converter). Agora o dropdown entrega o valor sempre como texto, igual ao `<select>` nativo — vale pra todos os seletores do app.

## [0.20.0] — 2026-07-13

### Adicionado
- **Composição de telas (aba nova no projeto).** Monte várias telas num único render, no espírito do mapeamento de slices do Resolume: cada tela vira um bloco no tamanho real em pixels que você posiciona **arrastando** (com encaixe automático nas bordas das outras telas) ou pelos campos **X/Y**. O canvas se ajusta sozinho pra envolver todas as telas, e **Exportar PNG** gera uma imagem única com o test card de cada tela na sua posição — ótimo pra telas pequenas (dá pra ver todas juntas). O estilo do test card (padrão, números, info) é compartilhado pela composição, e o botão "Lado a lado" reorganiza tudo numa fileira. Exportar direto pro Resolume (.xml de slices) fica pra uma fase seguinte.

### Corrigido
- **Test Card: telas sem gabinete não mostram mais "NaN".** A caixa de info omite as linhas de pitch e metros quando a tela ainda não tem um gabinete definido (antes aparecia "pitch NaN mm · NaN x NaN m").

## [0.19.4] — 2026-07-13

### Melhorado
- **Test Card: a caixa de informações se ajusta sozinha à resolução da tela.** Antes a info vinha sempre em 5 linhas (ou 1, no modo "em linha") — em telas achatadas ou de baixa resolução isso forçava uma fonte minúscula, difícil de ler. Agora ela **escolhe automaticamente em quantas linhas quebrar (1 a 5)** pra deixar a fonte a maior possível na tela: uma faixa 8×1, por exemplo, vira 2 linhas com fonte legível, enquanto telas normais seguem com as 5 linhas. Continua sem cortar e sem dominar telas grandes.

## [0.19.3] — 2026-07-13

### Corrigido
- **Test Card: a caixa de informações não some mais em telas pequenas nem é cortada em telas estreitas.** A fonte da caixa era proporcional só à **altura** da tela — então em telas pequenas ela virava minúscula (ilegível) e em telas estreitas e altas a caixa ficava mais larga que o canvas e era cortada na borda. Agora a fonte é proporcional à **área** (equilibrada) e **encolhe até a caixa caber inteira** no canvas, com margem — a info fica legível e dentro dos limites em qualquer formato de tela.

## [0.19.2] — 2026-07-12

### Corrigido
- **Caixas de número mais fáceis de preencher.** Ao apagar o conteúdo de um campo numérico, a caixa agora fica **vazia** em vez de saltar pra "0" (era o que obrigava apagar o zero antes de digitar). O número só é gravado quando você digita algo válido; se sair da caixa vazia, aí sim vira 0. Vale pras dimensões das telas (colunas/linhas e largura/altura em metros) e pras grades do Diagramação, Test Cards e Aspect Ratio.
- **Telas em metros não "estouram" mais os zeros.** No modo Metros, digitar no campo (ex.: sobre "3.00") embaralhava o valor — o campo se reformatava a cada tecla e chegava a virar 300.00. Agora ele respeita exatamente o que é digitado e só arredonda pro valor real (múltiplo inteiro de gabinete) quando você sai da caixa. Novo componente `NumField` reutilizável.

## [0.19.1] — 2026-07-12

### Corrigido
- **Telas do projeto: a cópia agora entra no topo** (aba Projetos › Dados). Ao duplicar uma tela ela ia parar no fim da lista; agora entra no topo e já abre expandida — mesmo comportamento do "Adicionar tela".

### Adicionado
- **Reordenar telas.** Cada tela ganhou setas ↑/↓ pra mudar a ordem na lista (aparecem quando há mais de uma tela; desabilitadas nos extremos). Assim dá pra decidir a ordem das telas depois de criadas, sem precisar recriar.

## [0.19.0] — 2026-07-12

### Alterado
- **Seletores (dropdowns) com a cara do app.** Os menus suspensos usavam o estilo padrão do navegador/sistema — no Android abriam aquela lista cinza com bolinha de rádio, destoando do resto do app. Agora todos abrem uma lista **temática** (folha deslizante no celular, popover ancorado no computador), no mesmo padrão dos seletores de data e hora: fundo escuro, cantos arredondados, opção atual em roxo com ✓. Vale pra todo o app — categoria do reembolso, tipo de diária, gabinete/status do projeto, controles de cabeamento e test card, filtros de gabinetes/projetos e as configurações. Novo componente `Select` reutilizável (`src/components/Select.jsx`); os campos fechados continuam iguais.

## [0.18.0] — 2026-07-12

### Adicionado
- **Reembolso: relatório em PDF + WhatsApp.** Novo modo "Relatório" na aba Reembolso — documento imprimível com a tabela de despesas do período, total a reembolsar e os **comprovantes embutidos** (as fotos). Botões Imprimir / Salvar PDF, Copiar texto e WhatsApp, reaproveitando a máquina de impressão do Financeiro. Fecha o ciclo: lançar despesas em campo → gerar o relatório → mandar pro contratante.

## [0.17.2] — 2026-07-12

### Corrigido
- **iOS: zoom automático ao focar campos.** O Safari dava zoom toda vez que se tocava num input/select (exigindo pinça pra voltar — bem frustrante ao demonstrar o app). Padronizamos todos os campos com `font-size ≥ 16px` (input, select, date/time picker, busca, diálogos) — o iOS só dá zoom abaixo de 16px. O pinça-zoom manual continua ativo (acessibilidade preservada).

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
