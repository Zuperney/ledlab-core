// nav.js — modelo de navegação (itens, ícones e seções da sidebar).
import {
  LayoutDashboard, CalendarDays, Receipt, Wallet, Coins, Package, FolderOpen,
  GitBranch, Monitor, Ratio, BookOpen, Settings, Home, Boxes, Wrench, Cpu,
} from "lucide-react";

export const NAV = [
  { id: "dashboard",  label: "Visão Geral",          Icon: LayoutDashboard, sec: "INÍCIO" },
  { id: "agenda",     label: "Agenda",               Icon: CalendarDays,    sec: "INÍCIO" },
  { id: "projects",   label: "Projetos / Eventos",   Icon: FolderOpen,      sec: "INÍCIO" },
  { id: "diarias",    label: "Cachês",               Icon: Coins,           sec: "FINANCEIRO" },
  { id: "financeiro", label: "Recibos",              Icon: Receipt,         sec: "FINANCEIRO" },
  { id: "reembolso",  label: "Reembolso",            Icon: Wallet,          sec: "FINANCEIRO" },
  { id: "inventory",  label: "Gabinetes",            Icon: Package,         sec: "GESTÃO" },
  // Equipamentos voltou (14/08/2026): reescrita como biblioteca EDITÁVEL de
  // equipamentos de vídeo (o catálogo certificado virou seed) — mobile-ok.
  { id: "equipamentos", label: "Equipamentos",       Icon: Cpu,             sec: "GESTÃO" },
  { id: "diagrams",   label: "Diagramação",          Icon: GitBranch,       sec: "FERRAMENTAS" },
  { id: "testcards",  label: "Test Cards",           Icon: Monitor,         sec: "FERRAMENTAS" },
  { id: "aspect",     label: "Aspect Ratio",         Icon: Ratio,           sec: "FERRAMENTAS" },
  { id: "knowledge",  label: "Base de Conhecimento", Icon: BookOpen,        sec: "INFORMATIVO" },
  { id: "settings",   label: "Configurações",        Icon: Settings,        sec: null },
];

// ordem de cima pra baixo na sidebar (desktop) e das abas de baixo (mobile)
export const SECTIONS = ["INÍCIO", "FINANCEIRO", "GESTÃO", "FERRAMENTAS", "INFORMATIVO"];

// metadados de cada seção pro menu MOBILE: ícone + rótulo curto da aba de baixo.
// `label` é o título da folha (BottomSheet) que lista os itens; `tab` é o texto curto
// embaixo do ícone. Seção com 1 item só navega direto (sem folha).
export const SECTION_META = {
  "INÍCIO":    { label: "Início",      tab: "Início",      Icon: Home },
  FINANCEIRO:  { label: "Financeiro",  tab: "Financeiro",  Icon: Wallet },
  "GESTÃO":    { label: "Gestão",      tab: "Gestão",      Icon: Boxes },
  FERRAMENTAS: { label: "Ferramentas", tab: "Ferram.",     Icon: Wrench },
  INFORMATIVO: { label: "Informativo", tab: "Info",        Icon: BookOpen },
};

// agrupamento próprio da BOTTOM NAV (mobile) — o desktop mantém SECTIONS na sidebar.
// PROJETOS é o coração do app → destino DIRETO de 1 toque (a bottom nav aguenta até
// 5 destinos com rótulo — M3); Ferramentas+Informativo (uso raro) fundem em "Mais".
export const MOBILE_SECTIONS = [
  { sec: "INÍCIO",     label: "Início",     tab: "Início",     Icon: Home,       ids: ["dashboard", "agenda"] },
  { sec: "PROJETOS",   label: "Projetos",   tab: "Projetos",   Icon: FolderOpen, ids: ["projects"] },
  { sec: "FINANCEIRO", label: "Financeiro", tab: "Financeiro", Icon: Wallet,     ids: ["diarias", "financeiro", "reembolso"] },
  { sec: "GESTÃO",     label: "Gestão",     tab: "Gestão",     Icon: Boxes,      ids: ["inventory", "equipamentos"] },
  { sec: "MAIS",       label: "Mais",       tab: "Mais",       Icon: Wrench,     ids: ["diagrams", "testcards", "aspect", "knowledge"] },
];

export const LABELS = Object.fromEntries(NAV.map((n) => [n.id, n.label]));
// injetada do package.json pelo vite (define em vite.config.js) — NÃO hardcodar;
// release = bump da versão SÓ no package.json (+ WHATS_NEW abaixo).
export const VERSION = __APP_VERSION__;
// resumo curto do que mudou (aparece no aviso pós-atualização)
export const WHATS_NEW = "\ud83d\uddbc\ufe0f AS TELAS ENTRAM NO DESENHO 3D, SOLTAS: a aba Estrutura ganhou o modo Telas. Escolha a tela na lista, clique no piso e ela nasce em p\u00e9, virada pra voc\u00ea \u2014 depois \u00e9 s\u00f3 arrastar pra p\u00f4r onde quiser. \u00c9 preview de montagem: a tela vai aonde voc\u00ea mandar, e conferir se aquilo se prende continua sendo do rigger. \ud83e\uddf2 O \u00cdM\u00c3 AGORA CASA QUINA COM QUINA: cada parede tem nove pontos \u2014 as quatro quinas, os quatro meios de borda e o centro. Selecione uma tela e eles aparecem no desenho (pretos na tela que voc\u00ea move, lime nas vizinhas); quando o \u00edm\u00e3 pega, o ponto acende maior. Entre telas o encaixe \u00e9 exato, e com a treli\u00e7a \u00e9 mais solto \u2014 encostar num truss \u00e9 apoiar, n\u00e3o emendar. \u2328\ufe0f SHIFT, CTRL E AS SETAS: cada tecla deixa UM eixo livre \u2014 Shift s\u00f3 sobe e desce, Ctrl s\u00f3 desliza pro lado. As setas fazem o ajuste fino com cota exata: 10 cm por toque, 1 m com Shift, e Ctrl+setas anda pra frente e pra tr\u00e1s. \ud83d\udccf TRENA: modo Medir, dois cliques e a dist\u00e2ncia aparece em metro no desenho. Os cliques grudam nos n\u00f3s da treli\u00e7a e nas quinas das telas, e a medida sai na imagem do Caderno. \u2696\ufe0f PESO SEPARADO: quanto a treli\u00e7a pesa, quanto est\u00e1 SUSPENSO e quanto est\u00e1 APOIADO NO CH\u00c3O \u2014 parede no piso n\u00e3o pendura em nada, e somar as duas dava um n\u00famero que ningu\u00e9m vai i\u00e7ar. \u2702\ufe0f PARTIR A TELA NA SCREEN: quando o processamento divide a parede, marque o corte na aba Screens \u2014 selecione a tela, ligue a tesoura e clique na divis\u00e3o entre gabinetes. Nenhuma porta atravessa o corte, e a tela continua INTEIRA no cadastro: chega de duplicar tela e chamar de parte 1 e parte 2. \ud83d\udd22 CORRE\u00c7\u00c3O IMPORTANTE \u2014 O V\u00c3O N\u00c3O \u00c9 PIXEL: o espa\u00e7o que voc\u00ea deixa entre as telas \u00e9 refer\u00eancia de montagem, e estava entrando na conta de resolu\u00e7\u00e3o. Duas telas de 512 px com um respiro sa\u00edam como 1.536 em vez de 1.024 \u2014 e \u00e9 esse n\u00famero que algu\u00e9m digita no NovaLCT. Confira a Resolu\u00e7\u00e3o da Screen e o canvas de conte\u00fado dos seus projetos.";
