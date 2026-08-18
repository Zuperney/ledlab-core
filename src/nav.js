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
export const WHATS_NEW = "\uD83D\uDCD0 VÃO NA SCREEN: defina a folga entre telas em pixels e ela vira encaixe — arrastar cola exatamente nessa distância, o auto-arrumar separa tudo por ela e a cota aparece no canvas dizendo quantos px tem ali. Acabou o \"três vãos parecidos e nenhum igual\". \uD83E\uDDEE CONTA NO CAMPO: qualquer campo de número aceita conta — digite 1920/2 ou 192*3 e ele guarda o resultado, sem abrir calculadora. \uD83D\uDCD6 CADERNO DE DESIGN: cada Test Card ganhou uma folha inteira, a capa mostra a RESOLUÇÃO do canvas no lugar do peso, e nasceu a folha CONTEÚDO — o painel em escala com resolução e metros, mais o manual de vídeo (arquivo, codec, taxa de quadros) que você edita em Dados. \uD83D\uDDBC\uFE0F FOLHA 1:1: botão novo no Caderno de Design — um PDF só, do tamanho do canvas (1,20 m no lado maior), com cada card em resolução real, pra plotar e conferir. \u26A1 CORREÇÕES: o vão entre telas inflava a contagem de gabinetes da Screen e comia cota da porta — o vazio do palco não conta mais (e tem botão pra contar, se a sua Screen for um retângulo só).";
