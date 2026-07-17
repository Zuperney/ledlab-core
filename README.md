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
| ⚡ **Elétrica** | Pico/típico por tela, corrente por fase, disjuntor e gerador — modelo validado com datasheets e normas (NBR/IEC) |
| 🖥️ **Screens** | Monte seus sistemas como no controlador: agrupe as telas que vão juntas; o cabo atravessa telas e as portas são numeradas por Screen |
| 🔌 **Cabeamento** | Sinal por Screen (automático ou livre) e cabos AC por tela, com balanceamento, margem de segurança e mapa visual |
| 🖥️ **Test cards** | Cartões de teste na resolução nativa do painel, com números, geometria, mapa de cabos e export PNG |
| 🧩 **Composição** | Várias telas posicionadas num render só (estilo mapeamento de slices), com alerta de sobreposição |
| 📐 **Aspect Ratio & crop** | Proporção da tela e cálculo de crop do sinal (encaixar × preencher, com deslocamento) |
| 📅 **Agenda & cachês** | Diárias com check-in/checkout por GPS, tipos de atividade e total do mês |
| 🧾 **Financeiro** | Recibo/planilha de pagamento por período e cliente — imprimir, PDF ou WhatsApp |
| 💸 **Reembolso** | Despesas do evento com foto do comprovante e relatório pronto pra enviar |
| 📄 **Relatórios** | Completo, resumido, elétrico, mapa de cabos, estrutural… em PDF com um toque |
| ☁️ **Backup & nuvem** | Backup em arquivo + sincronização opcional entre aparelhos |

## 🧾 Versões

**Atual: v1.3.0** — **Screens**: você monta os sistemas como faria no controlador e cabeia cada um (automático ou livre). O cabo atravessa telas, o relatório e o mapa de pixels saem por Screen. *(170 testes automáticos, código 100% limpo, CI travado contra regressão)*

| Versão | Destaques |
|---|---|
| **1.3.0** | **Aba Screens**: você agrupa as telas em sistemas; cabeamento de sinal por Screen (auto ou livre); relatório, test card e mapa de pixels por Screen |
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
- Disjuntor = primeiro valor padrão da escada IEC `≥ corrente × 1,25`.
- Consumo típico ("Modelo Barco") = `black + (máx − preto) × brilho × conteúdo`.
