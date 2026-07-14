// data/knowledge.js — artigos da Base de Conhecimento.
export const KB_CATEGORIES = ["Guia do App", "Energia", "Sinal", "Cabeamento AC", "Painéis"];

export const KB_ARTICLES = [
  { id: "guia-inicio", category: "Guia do App", title: "Primeiros passos", summary: "Como o LedLab Core organiza gabinetes, projetos e ferramentas.",
    sections: [{ h: "Fluxo básico", blocks: [{ t: "p", text: "Cadastre seus gabinetes uma vez na Biblioteca, crie um Projeto e adicione telas. As abas de Energia, Cabeamento, Test Card e Relatório usam esses dados automaticamente." }, { t: "note", text: "Tudo é salvo no navegador (localStorage). Use Configurações para fazer backup." }] }] },
  { id: "guia-gabinetes", category: "Guia do App", title: "Biblioteca de gabinetes", summary: "Campos técnicos e o gabinete favorito.", sections: [{ h: "Campos", blocks: [{ t: "ul", items: ["pwrMax: consumo máximo (dimensionamento)", "pwrMed: consumo médio", "pwrBlack: black level", "fp: fator de potência"] }] }] },
  { id: "guia-projetos", category: "Guia do App", title: "Projetos e telas", summary: "Estruture eventos com múltiplas telas.", sections: [{ h: "Telas", blocks: [{ t: "p", text: "Cada tela tem um gabinete e uma grade (colunas × linhas). Os totais do projeto somam todas as telas." }] }] },
  { id: "guia-cabeamento", category: "Guia do App", title: "Cabeamento", summary: "Sinal e AC em serpentina.", sections: [{ h: "Modos", blocks: [{ t: "p", text: "Sinal agrupa por capacidade da porta Gigabit; AC agrupa por corrente do conector." }] }] },
  { id: "guia-testcard", category: "Guia do App", title: "Test Card", summary: "Gere cartões de teste e exporte PNG 1:1.", sections: [{ h: "Export", blocks: [{ t: "p", text: "O PNG sai na resolução nativa da tela para mapeamento 1:1 no processador." }] }] },
  { id: "guia-relatorio", category: "Guia do App", title: "Relatório", summary: "Completo, Resumido, Elétrico, Estrutural, Design ou Gabinetes.", sections: [{ h: "PDF", blocks: [{ t: "p", text: "Use Imprimir / Salvar PDF do navegador para exportar." }] }] },
  { id: "guia-ferramentas", category: "Guia do App", title: "Ferramentas rápidas", summary: "Diagramação, Test Cards e Aspect Ratio sem abrir um projeto.", sections: [{ h: "Uso", blocks: [{ t: "p", text: "Diagramação (portas de sinal), Test Cards e Aspect Ratio rodam de forma avulsa — você escolhe um gabinete e uma grade, ou parte de pixels." }, { t: "note", text: "São para estudo/planejamento rápido; não salvam em um projeto." }] }] },
  { id: "guia-config", category: "Guia do App", title: "Configurações e backup", summary: "Exporte, importe e restaure de fábrica.", sections: [{ h: "Backup", blocks: [{ t: "p", text: "Exporte um backup completo antes de limpar dados ou trocar de máquina." }] }] },
  { id: "pico-tipico", category: "Energia", title: "Pico × Típico", summary: "Por que dimensionar pelo pico e estimar o gerador pelo típico.", sections: [{ h: "Conceito", blocks: [{ t: "p", text: "O pico (pwrMax) protege disjuntor e cabo. O consumo típico usa o Modelo Barco: black level + (máx − preto) × brilho × conteúdo." }] }] },
  { id: "tensoes-br", category: "Energia", title: "Tensões no Brasil", summary: "220V/380V, mono/bi/trifásico e seus divisores.", sections: [{ h: "Divisores", blocks: [{ t: "kv", rows: [["220V Bifásico", "÷ 220"], ["220V Trifásico", "÷ 220 × √3"], ["380V Mono (F+N)", "÷ 220"], ["380V Bifásico", "÷ 440"], ["380V Trifásico", "÷ 380 × √3"]] }] }] },
  { id: "disjuntor-125", category: "Energia", title: "Margem de 25% no disjuntor", summary: "De onde vem a margem — e o que a NBR realmente pede.", sections: [{ h: "Regra", blocks: [{ t: "p", text: "O app escolhe o disjuntor padrão imediatamente acima de corrente × 1,25. Essa margem de 25% é a regra NEC/UL (EUA) para carga contínua — disjuntores IEC (NBR NM 60898) já são 100%-rated." }, { t: "note", text: "O que a NBR 5410 exige de fato é In ≤ Iz: o disjuntor não pode passar da capacidade do CABO (corrigida por temperatura e agrupamento). O ×1,25 é conservador e ajuda, mas confira a bitola. Inrush das fontes pede disjuntor curva C (ou D em telas grandes)." }] }] },
  { id: "sinal-porta", category: "Sinal", title: "Capacidade da porta", summary: "Pixels por porta Gigabit: 8-bit ≈ 655k, 10-bit ≈ 327k — e as duas réguas de alocação.",
    sections: [
      { h: "Pixels por porta", blocks: [
        { t: "kv", rows: [["8-bit @ 60 Hz", "≈ 655.360 px"], ["10-bit @ 60 Hz", "≈ 327.680 px"]] },
        { t: "p", text: "10-bit dobra os dados por pixel → metade dos pixels por porta. A capacidade também cai com o refresh: cap × 60 ÷ Hz (ex.: 8-bit a 120 Hz ≈ 327k px)." },
      ] },
      { h: "As duas réguas de alocação", blocks: [
        { t: "ul", items: [
          "Pixels (real) — VX, série A, Colorlight: a porta gasta os pixels de verdade da cadeia de gabinetes; a rota serpenteia livre e corta por contagem.",
          "Área (básico) — controladores de entrada: a porta reserva o RETÂNGULO envolvente (bounding box); um 'L' de 10 gabinetes com caixa 4×5 consome 20.",
        ] },
        { t: "note", text: "No app, telas novas usam a régua de Pixels; dá pra trocar por tela no Cabeamento (seletor 'Porta'). Telas antigas continuam na régua de Área até você mudar." },
      ] },
    ] },
  { id: "serpente", category: "Sinal", title: "Serpentina", summary: "Roteamento zig-zag para minimizar cabo.", sections: [{ h: "Estratégias", blocks: [{ t: "ul", items: ["Linha", "Coluna", "Área (minimiza cabos)"] }] }] },
  { id: "mapa-pixels", category: "Sinal", title: "Mapa de pixels (NovaLCT / Tessera)", summary: "Exporte gabinete → porta → X/Y pra transcrever no controlador, sem redesenhar na régua.",
    sections: [
      { h: "Pra que serve", blocks: [
        { t: "p", text: "Fecha o ciclo projeto → operação: em vez de redesenhar o painel na régua no local, você leva pronto qual gabinete entra em qual porta e em que coordenada. X/Y em pixels, sempre com origem no canto SUPERIOR-esquerdo do painel (padrão do NovaLCT e do Tessera)." },
      ] },
      { h: "Como exportar", blocks: [
        { t: "ul", items: [
          "Aba Cabeamento (modo Sinal) → botão “Mapa de pixels”: baixa um CSV com uma linha por gabinete (porta, ordem no cabo, coluna/linha, X/Y).",
          "Relatório → tipo “Mapa de cabos”: versão impressa com o desenho da rota + tabela do início de cada porta (coluna/linha e X/Y).",
        ] },
        { t: "note", text: "No NovaLCT (Novastar) ou no Tessera (Brompton), monte a topologia porta por porta seguindo a ordem e as coordenadas do mapa. A ordem do cabo começa no canto escolhido no seletor “Início” (aba Cabeamento); a coordenada X/Y é sempre do canto superior-esquerdo." },
      ] },
    ] },
  { id: "ac-conectores", category: "Cabeamento AC", title: "Conectores AC", summary: "PowerCON, True1 e suas correntes (padrão IEC/Brasil).", sections: [{ h: "Amperagens", blocks: [{ t: "kv", rows: [["PowerCON Azul/Branco", "20 A"], ["PowerCON TRUE1", "16 A"], ["Neutrik True1 TOP", "16 A"]] }, { t: "note", text: "Ratings sob EN 60320-1/VDE (regime do Brasil). O True1 TOP também é 16 A aqui — os 20 A que se vê por aí são o rating UL (EUA). Conectores 'aviation' genéricos (ex.: SD20) não têm certificação: trate o limite com cautela." }] }] },
  { id: "seguranca-ac", category: "Cabeamento AC", title: "Segurança elétrica (AC & campo)", summary: "Antes de energizar: conector, cabo, tensão, DR e inrush.",
    sections: [
      { h: "Conector sob carga", blocks: [{ t: "p", text: "powerCON azul/branco NÃO tem breaking capacity: nunca conecte ou desconecte sob carga — desligue o disjuntor do circuito antes de mexer na daisy-chain. True1 e True1 TOP têm breaking capacity e podem ser plugados energizados." }] },
      { h: "O cabo importa", blocks: [{ t: "p", text: "Link cables prontos de 1,5 mm² ou 14 AWG limitam em 15–16 A — abaixo dos 20 A do powerCON azul. Use 2,5 mm²/12 AWG em chains a plena ocupação. A 40 °C ao sol a capacidade do cabo cai ~15%." }] },
      { h: "Tensão", blocks: [{ t: "note", text: "O cálculo de gabinetes por cabo assume 220 V. Em 110–127 V (F-N de praça 127 V) a corrente sobe ~73% e o nº de gabinetes por cabo cai pela metade." }] },
      { h: "Instalação temporária", blocks: [{ t: "ul", items: ["DR ≤ 30 mA obrigatório em área externa/molhada (NBR 5410)", "Aterre gerador e estrutura", "Corrente de fuga (~3 mA/painel) pode limitar a ~5 painéis por circuito com DR de 30 mA"] }] },
      { h: "Energização (inrush)", blocks: [{ t: "p", text: "Fontes SMPS puxam 50–100× a corrente nominal por alguns ms no cold start (~60 A por fonte). Ligue a tela por seções e prefira disjuntor curva C (ou D em telas grandes) para não desarmar." }] },
    ] },
  { id: "pixel-pitch", category: "Painéis", title: "Pixel pitch", summary: "Relação entre resolução, dimensão e distância de visão.", sections: [{ h: "Cálculo", blocks: [{ t: "p", text: "Pitch (mm) = largura do gabinete (mm) ÷ resolução X." }] }] },
  { id: "resolucoes-padrao", category: "Painéis", title: "Resoluções padrão de vídeo", summary: "Referência de resoluções comuns — nome, pixels e aspecto.",
    sections: [{ h: "Tabela de referência", blocks: [
      { t: "p", text: "Resoluções comuns pra configurar processador/mídia e comparar com a resolução do seu painel (veja a proporção na ferramenta Aspect Ratio)." },
      { t: "table", cols: ["Nome", "Resolução", "Aspecto", "Pixels"], rows: [
        ["nHD", "640 × 360", "16:9", "0.23 Mpx"],
        ["HD 720p", "1280 × 720", "16:9", "0.92 Mpx"],
        ["FHD 1080p", "1920 × 1080", "16:9", "2.07 Mpx"],
        ["QHD 1440p", "2560 × 1440", "16:9", "3.69 Mpx"],
        ["4K UHD", "3840 × 2160", "16:9", "8.29 Mpx"],
        ["8K UHD", "7680 × 4320", "16:9", "33.18 Mpx"],
        ["WUXGA", "1920 × 1200", "16:10", "2.30 Mpx"],
        ["UW-FHD", "2560 × 1080", "21:9", "2.76 Mpx"],
        ["UW-QHD", "3440 × 1440", "21:9", "4.95 Mpx"],
        ["XGA", "1024 × 768", "4:3", "0.79 Mpx"],
        ["SXGA", "1280 × 1024", "5:4", "1.31 Mpx"],
        ["DCI 4K", "4096 × 2160", "1.9:1", "8.85 Mpx"],
        ["Quadrado HD", "1080 × 1080", "1:1", "1.17 Mpx"],
      ] },
    ] }] },
];
