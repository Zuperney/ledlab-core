// nav.js — modelo de navegação (itens, ícones e seções da sidebar).
import {
  LayoutDashboard, CalendarDays, Receipt, Wallet, Package, FolderOpen,
  GitBranch, Monitor, Ratio, BookOpen, Settings,
} from "lucide-react";

export const NAV = [
  { id: "dashboard",  label: "Dashboard",            Icon: LayoutDashboard, sec: "HOME" },
  { id: "agenda",     label: "Agenda",               Icon: CalendarDays,    sec: "HOME" },
  { id: "projects",   label: "Projetos / Eventos",   Icon: FolderOpen,      sec: "HOME" },
  { id: "financeiro", label: "Financeiro",           Icon: Receipt,         sec: "FINANCEIRO" },
  { id: "reembolso",  label: "Reembolso",            Icon: Wallet,          sec: "FINANCEIRO" },
  { id: "inventory",  label: "Gabinetes",            Icon: Package,         sec: "GESTÃO" },
  { id: "diagrams",   label: "Diagramação",          Icon: GitBranch,       sec: "FERRAMENTAS" },
  { id: "testcards",  label: "Test Cards",           Icon: Monitor,         sec: "FERRAMENTAS" },
  { id: "aspect",     label: "Aspect Ratio",         Icon: Ratio,           sec: "FERRAMENTAS" },
  { id: "knowledge",  label: "Base de Conhecimento", Icon: BookOpen,        sec: "INFORMATIVO" },
  { id: "settings",   label: "Configurações",        Icon: Settings,        sec: null },
];

// ordem de cima pra baixo na sidebar
export const SECTIONS = ["HOME", "FINANCEIRO", "GESTÃO", "FERRAMENTAS", "INFORMATIVO"];
export const LABELS = Object.fromEntries(NAV.map((n) => [n.id, n.label]));
export const VERSION = "v1.4.1";
// resumo curto do que mudou (aparece no aviso pós-atualização)
export const WHATS_NEW = "🗂️ Menu reorganizado em seções — Home (Dashboard, Agenda, Projetos), Financeiro, Gestão, Ferramentas e Informativo — pra achar tudo mais rápido.";
