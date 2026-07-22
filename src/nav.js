// nav.js — modelo de navegação (itens, ícones e seções da sidebar).
import {
  LayoutDashboard, CalendarDays, Receipt, Wallet, Package, FolderOpen,
  GitBranch, Monitor, Ratio, BookOpen, Settings, Home, Boxes, Wrench,
} from "lucide-react";

export const NAV = [
  { id: "dashboard",  label: "Visão Geral",          Icon: LayoutDashboard, sec: "INÍCIO" },
  { id: "agenda",     label: "Agenda",               Icon: CalendarDays,    sec: "INÍCIO" },
  { id: "projects",   label: "Projetos / Eventos",   Icon: FolderOpen,      sec: "INÍCIO" },
  { id: "financeiro", label: "Financeiro",           Icon: Receipt,         sec: "FINANCEIRO" },
  { id: "reembolso",  label: "Reembolso",            Icon: Wallet,          sec: "FINANCEIRO" },
  { id: "inventory",  label: "Gabinetes",            Icon: Package,         sec: "GESTÃO" },
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

export const LABELS = Object.fromEntries(NAV.map((n) => [n.id, n.label]));
export const VERSION = "v1.5.0";
// resumo curto do que mudou (aparece no aviso pós-atualização)
export const WHATS_NEW = "⚙️ Configurações agora abre num painel POR CIMA da tela: mexeu, fechou (X, toque fora ou Esc) e você continua exatamente onde estava. 🔌 Numeração dos cabos ganhou o modo Serpente (contínuo, à la NovaLCT) e um seletor visual com as 8 ordens. E o check-in de 1 toque parou de sumir quando o GPS resolvia.";
