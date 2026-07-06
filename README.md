# LedLab Core

Ferramenta tática de engenharia para técnicos de painéis de LED (mercado rental/eventos):
cálculo elétrico, dimensionamento de dados/sinal, gestão de gabinetes e projetos, test cards e relatórios.

> App **React + Vite + Electron**, 100% client-side (dados salvos no navegador via `localStorage`).
> Tema dark/roxo. Sem TypeScript por enquanto.

## 🌐 App online (PWA)

Publicado no **GitHub Pages** — abra no celular e **instale** (menu do navegador → *Adicionar à tela inicial*). Funciona **offline** após o primeiro acesso; os dados ficam no aparelho.

### 👉 https://zuperney.github.io/ledlab-core/

<a href="https://zuperney.github.io/ledlab-core/">
  <img src="qrcode.png" alt="QR code para abrir o LedLab Core no celular" width="200" />
</a>

_Aponte a câmera do celular para o QR code acima._

## 🗺️ Roadmap

Plano de produto da próxima versão (v1.x → v2.0), em 4 fases: **[docs/roadmap/ROADMAP.md](docs/roadmap/ROADMAP.md)**.
Versão visual (dossiê interativo): [`docs/roadmap/roadmap.html`](docs/roadmap/roadmap.html).

## Rodar em desenvolvimento

```bash
npm install
npm run dev        # abre em http://localhost:5173
```

No Windows, você também pode dar duplo-clique em `iniciar.bat`.

## Build / Desktop

```bash
npm run build      # gera o dist/ (web)
npm run dist       # empacota o app Windows (Electron + NSIS)
```

## Arquitetura (Separation of Concerns)

```
src/
  ui/          tokens de cor (T), estilos compartilhados, index.css global
  data/        dados-semente (gabinetes, projetos, base de conhecimento)
  services/    funções puras: electricalCalc, projectCalc, cabinets, dates, ids
  store/       AppContext (estado global + persistência em localStorage)
  components/  "dumb components": NavBtn, StatusBadge, Drawer, DropdownMenu, ...
  pages/       telas: Dashboard, Agenda, Inventory, Projects (+detalhe), Calc*, Diagrams, TestCards, Knowledge, Settings
```

### Regras de negócio elétricas (não quebrar)

- Dimensionamento **sempre** pelo consumo máximo (`pwrMax`), nunca pelo médio.
- Divisores de tensão: 220V bi `÷220`, 220V tri `÷220·√3`, 380V mono(F+N) `÷220`, 380V bi `÷440`, 380V tri `÷380·√3`.
- Disjuntor = primeiro valor padrão da escada IEC `≥ corrente × 1,25`.
- Consumo típico ("Modelo Barco") = `black + (máx − preto) × brilho × conteúdo`.

## Chaves de armazenamento

`ledlab.cabs.v1`, `ledlab.projects.v1`, `ledlab.prefs.v1`, `ledlab.testcard-presets.v1`.
