# Changelog

Histórico de versões do LedLab Core. Formato inspirado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/), versionamento semântico. A nota curta que aparece dentro do app (aviso de atualização) fica em `src/nav.js` → `WHATS_NEW`.

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
