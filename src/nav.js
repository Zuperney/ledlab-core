// nav.js — modelo de navegação (itens, ícones e seções da sidebar).
import {
  LayoutDashboard, CalendarDays, Receipt, Wallet, Coins, Package, FolderOpen,
  GitBranch, Monitor, Ratio, BookOpen, Settings, Home, Boxes, Wrench, Cpu,
} from "lucide-react";
// (Wrench segue em uso no agrupamento mobile "Mais")

export const NAV = [
  { id: "dashboard",  label: "Visão Geral",          Icon: LayoutDashboard, sec: "INÍCIO" },
  { id: "agenda",     label: "Agenda",               Icon: CalendarDays,    sec: "INÍCIO" },
  { id: "projects",   label: "Projetos / Eventos",   Icon: FolderOpen,      sec: "INÍCIO" },
  { id: "diarias",    label: "Cachês",               Icon: Coins,           sec: "FINANCEIRO" },
  { id: "financeiro", label: "Recibos",              Icon: Receipt,         sec: "FINANCEIRO" },
  { id: "reembolso",  label: "Reembolso",            Icon: Wallet,          sec: "FINANCEIRO" },
  { id: "inventory",  label: "Gabinetes",            Icon: Package,         sec: "GESTÃO" },
  // Equipamentos é desktop-only (aposta de diferenciar features mobile×desktop)
  { id: "equipamentos", label: "Equipamentos",       Icon: Cpu,             sec: "GESTÃO", desktopOnly: true },
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
export const WHATS_NEW = "📐 \"De longe fica bom?\" agora tem resposta de engenharia: a aba Aspect Ratio ganhou o modo DISTÂNCIA — as quatro réguas sobre o pitch (mínima 1×, ótima 10×, RETINA ×3,438 e máxima altura×30, com fontes) numa régua visual com o veredito da primeira fila, o pitch ideal pra cada distância e a sugestão de gabinete DO SEU CADASTRO. O Caderno mostra o pitch e a distância de visão por tela (agrupadas — sem repetição), os Critérios explicam as réguas e o artigo completo está na Base de Conhecimento. 📄 E no cabeamento: tabela de cabos com mais de 15 linhas por coluna abre na própria página — o mapa fica GRANDE na folha dele, e acabou o resto de tabela vazando de página.";
