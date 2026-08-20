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
export const WHATS_NEW = "\ud83c\udfd7\ufe0f ESTRUTURA EM 3D: nasceu a aba Estrutura, pra montar o box truss P30 do seu estoque \u2014 barra de 0,2 a 4 m, cubo de 5 faces e sapata. Escolha a pe\u00e7a no cat\u00e1logo, clique no piso e ela nasce apoiada ali; depois \u00e9 s\u00f3 clicar nos pontos claros pra emendar, com a pe\u00e7a aparecendo em fantasma antes de voc\u00ea soltar. \u00c9 s\u00f3 no computador: montar 3D com o dedo n\u00e3o funciona. \ud83d\udcd0 O QUE O CADERNO ENTREGA: lista de pe\u00e7as, PESO e MEDIDAS reais, mais a conta da parafusaria (parafuso 5/8\" chave 27, porca e arruela) pra conferir a caixa. Sai no Completo e ganhou caderno pr\u00f3prio \u2014 tipo \u201cEstrutura\u201d, capa e a folha, o que vai pra equipe de montagem. D\u00e1 pra guardar uma vista 3D da estrutura pra sair impressa junto. \u2328\ufe0f NO TECLADO: segure V pra clicar nas pe\u00e7as sem encaixar nada, segure Ctrl pra virar conta-gotas (a pe\u00e7a que voc\u00ea clicar vira a de inser\u00e7\u00e3o), Shift+clique escolhe v\u00e1rias, Delete apaga e Ctrl+Z desfaz. \ud83d\udd04 GIRAR PELO PISO: R e Shift+R giram pelas dire\u00e7\u00f5es do palco \u2014 norte, sul, leste, oeste, cima e baixo. No cubo, o que gira \u00e9 a face cega (aquela tapada, que a seta marca), e ela s\u00f3 vai pra onde n\u00e3o tem pe\u00e7a aparafusada. Girar uma pe\u00e7a nunca arrasta as outras. \ud83c\udfa8 COR E LEGENDA: cada pe\u00e7a do cat\u00e1logo tem sua cor \u2014 barra curta fria, barra longa quente \u2014, com legenda no desenho e no Caderno. Muda em Configura\u00e7\u00f5es. \u26a0\ufe0f O APP N\u00c3O DIZ SE A ESTRUTURA AGUENTA. V\u00e3o, carga e ponto de i\u00e7amento seguem sendo do rigger habilitado e do engenheiro com ART. Aqui \u00e9 registro do que foi montado \u2014 e ele avisa quando duas pe\u00e7as ficam uma dentro da outra.";
