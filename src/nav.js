// nav.js — modelo de navegação (itens, ícones e seções da sidebar).
import {
  LayoutDashboard, CalendarDays, Receipt, Wallet, Package, FolderOpen,
  GitBranch, Monitor, Ratio, BookOpen, Settings,
} from "lucide-react";

export const NAV = [
  { id: "dashboard", label: "Dashboard",            Icon: LayoutDashboard, sec: null },
  { id: "agenda",    label: "Agenda",               Icon: CalendarDays,    sec: null },
  { id: "financeiro", label: "Financeiro",          Icon: Receipt,         sec: null },
  { id: "reembolso", label: "Reembolso",            Icon: Wallet,          sec: null },
  { id: "inventory", label: "Gabinetes",            Icon: Package,         sec: "GESTÃO" },
  { id: "projects",  label: "Projetos / Eventos",   Icon: FolderOpen,      sec: "GESTÃO" },
  { id: "diagrams",  label: "Diagramação",          Icon: GitBranch,       sec: "FERRAMENTAS RÁPIDAS" },
  { id: "testcards", label: "Test Cards",           Icon: Monitor,         sec: "FERRAMENTAS RÁPIDAS" },
  { id: "aspect",    label: "Aspect Ratio",         Icon: Ratio,           sec: "FERRAMENTAS RÁPIDAS" },
  { id: "knowledge", label: "Base de Conhecimento", Icon: BookOpen,        sec: "REFERÊNCIA" },
  { id: "settings",  label: "Configurações",        Icon: Settings,        sec: null },
];

export const SECTIONS = ["GESTÃO", "FERRAMENTAS RÁPIDAS", "REFERÊNCIA"];
export const LABELS = Object.fromEntries(NAV.map((n) => [n.id, n.label]));
export const VERSION = "v1.2.0";
// resumo curto do que mudou (aparece no aviso pós-atualização)
export const WHATS_NEW = "🖼️ Aba Canvas nova: monte a parede como a controladora enxerga e o cabo passa a atravessar telas — tela pequena não come mais uma porta inteira. Num projeto real de 7 telas isso foi de 10 portas pra 6. As portas agora são numeradas 1..N no projeto (chega de sete “Cabo 1”) e o mapa de pixels sai na coordenada que se digita no NovaLCT. Quem não mexer no Canvas não sente diferença.";
