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
          "Pixels (real) — a porta gasta os pixels de verdade da cadeia de gabinetes; a rota serpenteia livre e corta por contagem.",
          "Área (retângulo) — a porta reserva o RETÂNGULO envolvente (bounding box); um 'L' de 10 gabinetes com caixa 4×5 consome 20.",
        ] },
        { t: "p", text: "Quem decide qual régua vale é o Free Topology — um interruptor POR TELA no software da controladora, não um atributo fixo da marca. Veja “Regra do retângulo e Free Topology”." },
        { t: "note", text: "No app, telas novas usam a régua de Pixels; dá pra trocar por tela no Cabeamento (seletor 'Porta'). Telas antigas continuam na régua de Área até você mudar." },
      ] },
    ] },
  { id: "serpente", category: "Sinal", title: "Serpentina", summary: "Roteamento zig-zag para minimizar cabo.", sections: [{ h: "Estratégias", blocks: [{ t: "ul", items: ["Linha", "Coluna", "Área (minimiza cabos)"] }] }] },
  { id: "free-topology", category: "Sinal", title: "Regra do retângulo e Free Topology", summary: "Quando os buracos da tela consomem banda da porta — e o interruptor que desliga isso.",
    sections: [
      { h: "O que a regra do retângulo faz", blocks: [
        { t: "p", text: "Sem Free Topology, a controladora desenha um retângulo circunscrito em volta dos gabinetes daquela porta — e cobra banda por TODO o retângulo, inclusive pelos buracos. Numa corrente que sobe uma coluna, atravessa uma linha e sobe outra, o retângulo engole a tela inteira." },
        { t: "note", text: "Isto NÃO é teoria de manual: foi medido no simulador do Unico com uma VX2000, mudando só o interruptor e sem tocar no cabeamento." },
        { t: "table", cols: ["Free Topology", "Porta 1 marca", "O que ele contou"], rows: [
          ["Ligado", "90%", "os 16 gabinetes reais"],
          ["Desligado", "405% (vermelho)", "o retângulo inteiro: 8 × 9 = 72 posições"],
        ] },
        { t: "p", text: "Mesma corrente de 16 gabinetes de 192×192. Ligado cobra 16; desligado cobra 72. A diferença é de 4,5× — é o que decide se a sua tela vazada cabe em 1 porta ou em 5." },
      ] },
      { h: "O interruptor", blocks: [
        { t: "p", text: "No Unico, “Free Topology” fica em Screen Properties › Screen. É configuração POR TELA — dá pra ligar numa tela e deixar desligada na outra, dentro do mesmo projeto." },
        { t: "ul", items: [
          "LIGADO → os buracos não consomem banda. A porta conta só o gabinete que existe.",
          "DESLIGADO → vale a regra do retângulo. Todo vazio dentro do retângulo da porta é cobrado.",
        ] },
      ] },
      { h: "Quem tem o interruptor", blocks: [
        { t: "p", text: "Free Topology se configura no software (NovaLCT / Unico), então nenhum manual de controladora a documenta como recurso próprio — ela aparece só de passagem. Mas comparar dois manuais lado a lado entrega a diferença: os dois descrevem a MESMA função de baixa latência, e só o Pro admite topologia livre." },
        { t: "table", cols: ["", "VX1000 (simples)", "VX Pro Series"], rows: [
          ["Baixa latência", "Liga / Desliga", "Liga / Desliga / Auto"],
          ["Cabo precisa correr…", "na vertical", "vertical OU topologia livre"],
        ] },
        { t: "p", text: "A palavra “topologia” não aparece uma única vez no manual da VX1000 simples. No do Pro, topologia livre é tratada como coisa que o usuário já faz. E o manual do VX Pro Series cobre VX400 Pro, VX600 Pro, VX1000 Pro e VX2000 Pro — a VX2000 medida no simulador é dessa família. Bate com o que se vê em campo: selo Pro + receiving card série A (Armor) libera o cabo livre; o mesmo gabinete numa VX1000 simples, não." },
        { t: "note", text: "Isto é evidência de manual, não teste ao vivo — são gerações de documento diferentes, e o vínculo com a receiving card série A segue sem prova (no simulador o gabinete é genérico). Antes de contar com a função num evento, confira na controladora que você vai levar." },
      ] },
      { h: "Capacidade: 655.360 px por porta", blocks: [
        { t: "p", text: "A régua que o software aplica na VX2000 (8-bit, 60 Hz) é 655.360 px por porta Gigabit — não os 650.000 que aparecem em catálogo. Dois testes independentes fecham no mesmo número:" },
        { t: "table", cols: ["Teste no Unico", "Pixels", "Resultado"], rows: [
          ["40 gabinetes de 128×128", "655.360", "100% exato, verde"],
          ["Retângulo de 72 × 36.864", "2.654.208", "405% = 4,05 × 655.360"],
        ] },
        { t: "note", text: "Com 650.000 as duas contas quebrariam: os 40 gabinetes dariam 100,8% (vermelho) e o retângulo daria 408%. Um gabinete de 128×128 (3.9 mm) fecha 40 por porta, cravado, sem sobra." },
      ] },
      { h: "De onde vem o 650.000", blocks: [
        { t: "p", text: "O 650.000 é real e está nos manuais — mas nos dois lugares onde ele aparece, não é “a capacidade da porta no uso normal”:" },
        { t: "ul", items: [
          "Nota da Configuração Rápida (o assistente do botão do painel frontal), ao lado de “porta 1 ≥ porta 2 ≥ …” e “gabinetes por porta = múltiplo inteiro das linhas ou colunas”. São as regras do atalho.",
          "Constante da fórmula de baixa latência, no apêndice do VX Pro Series.",
        ] },
        { t: "p", text: "O apêndice chama o 650.000 de capacidade máxima da porta “em modo comum” — é o único ponto que conflita de verdade com os 655.360 medidos. Só que ele erra a própria conta: a fórmula é (1 − Y/H) × TOTAL, mas o exemplo com Y=1200 e H=2160 escreve “≈ 0,556 × 650.000”, quando 1 − 1200/2160 = 0,444." },
        { t: "note", text: "Entre um número medido duas vezes e um apêndice que se contradiz, o app fica com 655.360. Repare também que 655.360 = 640 × 1.024 — cara de limite de hardware. 650.000 é número redondo de gente." },
      ] },
      { h: "Baixa latência cobra o seu preço", blocks: [
        { t: "p", text: "Achado do manual do VX Pro Series, e vale guardar: com baixa latência ligada, a capacidade da porta ENCOLHE conforme os gabinetes daquela porta ficam mais baixos na tela." },
        { t: "kv", rows: [["Fórmula", "(1 − Y ÷ H) × capacidade"], ["Y", "menor coordenada Y dos gabinetes da porta"], ["H", "altura total do canvas"]] },
        { t: "p", text: "Uma porta que só começa na metade de baixo da tela perde metade da banda. A coordenada X não influi. É por isso que o modo Auto só se liga sozinho quando os retângulos das portas estão encostados no topo." },
        { t: "note", text: "Baixa latência vem DESLIGADA de fábrica — por isso ela não entra no cálculo do app. Se você ligar na mão pra um evento com câmera, lembre que as portas de baixo encolhem." },
      ] },
      { h: "O que ainda NÃO está verificado", blocks: [
        { t: "p", text: "Esta página separa o que foi medido (simulador do Unico, VX2000) do que foi lido em manual — e do que ainda não passou por nenhum dos dois:" },
        { t: "ul", items: [
          "Se ligar o Free Topology exige mesmo receiving card série A (Armor): há evidência de campo e de manual, não teste.",
          "As outras famílias (MX/COEX, Série H, TU, MCTRL, Taurus) — não testadas aqui.",
          "Se a capacidade de 655.360 vale igual nas outras linhas.",
        ] },
        { t: "note", text: "Uma lição que ficou: a Série H chegou a ser dada como “não tem a função” porque o manual dela não cita nada disso. Mas o manual da VX2000 também não cita — e a VX2000 tem. Ausência no manual não prova ausência da função." },
        { t: "note", text: "Regra de bolso enquanto não há teste: planeje como se a regra do retângulo valesse. Errar pra mais custa uma porta sobrando; errar pra menos custa a parede não fechar no dia." },
      ] },
    ] },
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
