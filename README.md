# LedLab Core

**O canivete suíço do técnico de painel de LED.** Engenharia elétrica e de sinal, agenda com cachês, recibos, reembolso e test cards — tudo num app só, feito pra rodar **no celular, em campo, até sem internet**.

## 📲 Acesse agora

### 👉 https://zuperney.github.io/ledlab-core/

<a href="https://zuperney.github.io/ledlab-core/">
  <img src="qrcode.png" alt="QR code para abrir o LedLab Core no celular" width="200" />
</a>

_Aponte a câmera do celular para o QR code._

- **Instale como app:** abra o link e use *Adicionar à tela inicial* (menu do navegador). Vira um app de verdade, com ícone.
- **Funciona offline** depois do primeiro acesso — no galpão, no palco ou na estrada.
- **Seus dados ficam no seu aparelho.** Nada vai pra internet, a não ser que você ative a sincronização (opcional, por login com código no e-mail).
- **Atualiza sozinho:** quando sair versão nova, o app troca sozinho e mostra as novidades.

## ✨ O que dá pra fazer

| | |
|---|---|
| ⚡ **Elétrica** | Pico/típico por tela, corrente por fase e faixa de gerador (pico ×1,25 + % ocupado) — modelo validado com datasheets e normas (NBR/IEC), regra dos 80% de carga contínua; a proteção fica com o eletricista do quadro |
| 🖥️ **Screens** | Monte seus sistemas como no controlador: agrupe as telas que vão juntas; o cabo atravessa telas e as portas são numeradas por Screen |
| 🔌 **Cabeamento** | Sinal e AC por Screen (automático, livre ou — no AC — atrelado ao sinal), com balanceamento, **overclock de porta** opcional, link único entre telas afastadas, margem de segurança, aviso de estouro e mapa visual |
| 🏗️ **Peso** | Peso da parede por tela e total, direto do datasheet do gabinete — na capa e na Visão Geral do Caderno (o dimensionamento de estrutura fica com quem é do ofício) |
| 🎛️ **Equipamentos** | Catálogo de controladoras certificado nos datasheets (NovaStar VX/MX) + "Verificar projeto": portas usadas × disponíveis por Screen |
| 🖥️ **Test cards** | Cartões de teste na resolução nativa do painel, com números, geometria, mapa de cabos e export PNG |
| 🧩 **Composição** | Várias telas posicionadas num render só (estilo mapeamento de slices), com alerta de sobreposição |
| 📐 **Aspect Ratio & distância** | Proporção da tela, crop do sinal (encaixar × preencher) e **distância de visão pelo pitch** — as quatro réguas da indústria + sugestão de gabinete do cadastro |
| 📅 **Agenda & cachês** | Diárias com check-in/checkout por GPS, tipos de atividade e total do mês |
| 🧾 **Financeiro** | Recibo/planilha de pagamento por período e cliente — imprimir, PDF ou WhatsApp |
| 💸 **Reembolso** | Despesas do evento com foto do comprovante e relatório pronto pra enviar |
| 📄 **Caderno Técnico** | PDF nativo (funciona offline, no celular) em **prancha de engenharia**: moldura + carimbo com logo do projeto, revisão e folha N/M; tipos Completo, Resumido, Elétrico, Mapa de cabos, Design e Gabinetes |
| 📚 **Base de Conhecimento** | Artigos de campo — sinal, segurança elétrica, estrutura, painéis — na linguagem de quem monta |
| ☁️ **Backup & nuvem** | Backup em arquivo + sincronização opcional entre aparelhos (login por código no e-mail) |

## 🧾 Versões

**Atual: v1.17.0** — **A cena do pitch**: no modo Distância, a parede de LED em escala, uma pessoa de 1,70 m arrastável e o quadro "o que o olho vê" — os LEDs se separam quando perto demais e a imagem fica lisa da retina em diante. E o preview de crop agora recorta uma **imagem de verdade**. *(334 testes automáticos, código 100% limpo, CI travado contra regressão)*

| Versão | Destaques |
|---|---|
| **1.17.0** | **Cena do pitch** (parede em escala + pessoa de 1,70 m arrastável + chão com as faixas + "o que o olho vê" com pixels reais) e **imagem real no preview de crop** (com toggle pro esquema) |
| 1.16.0 | **Pitch × distância** (réguas 1×/10×/retina 3,438/altura×30 com fontes, régua visual, sugestão do cadastro; pitch + distâncias agrupadas no Caderno; KB completa) + regra das 15 linhas no cabeamento (tabela alta abre na própria página; mapa grande) — **Fase 02 concluída** |
| 1.15.0 | **Mapa de cabos estilo SmartLCT** (pastel por cabo, serpentina com setas, entrada verde, fim vermelho — PDF e Caderno DOM, cruzando com a tabela pela cor); **rigging sai do app** (peso fica; estrutura é de quem é do ofício, até o 3D) |
| 1.14.0 | **Caderno v2**: telas na disposição da Composição, balanço por fase pico+típico, folha "Critérios de Cálculo" (regras, normas e referências), tabelas AC sem estourar página, PDF ~2,5× mais leve |
| 1.13.0 | **Auditoria de engenharia do motor AC** (fórmulas confirmadas com fontes): o app entrega corrente e kVA — **sem sugerir disjuntor**; gerador vira **faixa honesta** (pico ×1,25 + % ocupado); tabela de bitolas × distância × proteção na Base de Conhecimento |
| 1.12.0 | **Prancha de engenharia no PDF**: moldura + carimbo em toda página (logo do projeto, Projetou, REV manual, FOLHA N/M); assinatura do Caderno na conta |
| 1.11.0 | **Overclock de porta** (arredonda gabinetes/porta pra cima, com laranja honesto no que passa do nominal), **link único entre telas** da mesma Screen, logo do projeto, e a estrutura vira **"Peso e estrutura"** (montagem voada × sentada, sem dimensionamento especulativo) |
| 1.10.x | **Peso e ancoragens no Caderno**: cadeia de limites do fabricante com procedência no cadastro do gabinete; "não informado" nunca vira "ok" |
| 1.9.x | **Caderno Técnico em PDF nativo** (offline, com sumário e mapas vetoriais) + regra dos 80% como padrão da elétrica |
| 1.8.0 | O app vestiu a marca: manual de marca + paleta lime/preto nos 3 ecossistemas (Palco, Sol, Print) |
| 1.7.x | Interface repaginada: gramática das 5 faixas, **modo SOL** de alto contraste, refino mobile |
| 1.6.0 | Página **Equipamentos**: catálogo de controladoras (VX/MX) certificado nos datasheets + "Verificar projeto" |
| 1.5.x | Relatório vira **Caderno Técnico** (paisagem + capa Folha Técnica), mapa de cabos redesenhado, numeração serpente, Financeiro reorganizado |
| 1.4.0 | **Controles de cabeamento por Screen**: régua Área/Pixels (regra do retângulo / Free Topology), disposição Linha/Coluna/Área, 8/10-bit — num "Avançado"; padrão = Área |
| 1.3.1 | **AC por Screen** (consistência com o sinal): automático / livre / atrelar ao sinal, com aviso de estouro de corrente |
| 1.3.0 | **Aba Screens**: você agrupa as telas em sistemas; cabeamento de sinal por Screen (auto ou livre); relatório, test card e mapa de pixels por Screen |
| 1.2.0 | Canvas do processador (base do rework): cabo atravessando telas, portas 1..N, mapa de pixels na coordenada do NovaLCT |
| 1.1.x | Portas de dados reais (px/porta), mapa de pixels, arrastar telas, Configurações em sub-menus, duração em 9h55 (não "9.9h") |
| 1.0.0 | Marco de estabilidade: rodada de blindagem (testes, lint zerado e bloqueante no CI, infra de deploy atualizada) |
| 0.20.x | Composição de telas, crop de vídeo com deslocamento, relatório "Mapa de cabos", nomes de arquivo padronizados, aviso de sobreposição, modal de novidades |
| 0.19.x | Dropdowns com a cara do app (fim do visual do sistema no Android), campos numéricos sem "pulos", reordenar telas |
| 0.17–0.18 | **Reembolso completo** (despesa + foto do comprovante + relatório PDF/WhatsApp) e correções de iOS (topo atrás da status bar, zoom automático) |
| 0.14–0.16 | Cinturão de testes + CI, margem de segurança do cabo AC, alertas elétricos, offline total, privacidade (ocultar R$), checkout no dashboard |
| 0.13 | Validação elétrica contra datasheets/normas (True1 TOP → 16 A) e aviso de nova versão |
| 0.10–0.12 | Rota de durabilidade: armazenamento persistente, IndexedDB e **sincronização na nuvem** (login por código) |

Histórico completo, versão por versão: **[CHANGELOG.md](CHANGELOG.md)**.

## 🗺️ Roadmap

Plano de produto (v1.x → v2.0) em 4 fases: **[docs/roadmap/ROADMAP.md](docs/roadmap/ROADMAP.md)** · versão visual: [`docs/roadmap/roadmap.html`](docs/roadmap/roadmap.html)

---

## 🔧 Notas técnicas (para desenvolvedores)

React 19 + Vite 8, 100% client-side (PWA offline-first; dados em IndexedDB com espelho em `localStorage` — chaves em `src/config/storageConfig.js`). Deploy automático no GitHub Pages a cada push (testes e lint bloqueiam o pipeline).

```
src/
  ui/          tokens de cor (T), estilos compartilhados, index.css global
  data/        dados-semente (gabinetes, base de conhecimento)
  services/    lógica pura + testes vitest: electricalCalc, cabling, projectCalc,
               worklog, crop, layout, testcardDraw, filenames…
  store/       contexts (estado global + persistência + sync opcional)
  components/  componentes reutilizáveis: Select, NumField, PickerField, BottomSheet…
  pages/       telas (Dashboard, Agenda, Financeiro, Reembolso, Projects + abas…)
```

### Regras de negócio elétricas (não quebrar)

- Dimensionamento **sempre** pelo consumo máximo (`pwrMax`), nunca pelo médio.
- Divisores de tensão: 220V bi `÷220` · 220V tri `÷220·√3` · 380V mono (F+N) `÷220` · 380V bi `÷440` · 380V tri `÷380·√3`.
- Gerador = `kVA de pico × 1,25` (margem de partida), com % ocupado pelo típico (janela saudável 60–80%). O app **não sugere disjuntor** — entrega corrente e kVA; a proteção é do projeto elétrico do quadro.
- Consumo típico ("Modelo Barco") = `black + (máx − preto) × brilho × conteúdo`.
