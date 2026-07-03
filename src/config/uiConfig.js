// config/uiConfig.js — parâmetros globais de UI (breakpoints, toque, z-index, espaçamento).
// Base mobile-first: layout pensado p/ 360–430px; desktop acima do breakpoint.

export const BREAKPOINTS = { mobile: 768 }; // <= mobile: bottom nav + cards

export const TOUCH_MIN = 44;   // área clicável mínima (px)

export const SPACE = { xs: 6, sm: 10, md: 16, lg: 24 };

// camadas (mantém diálogos acima de tudo)
export const Z = { fab: 55, bottomNav: 60, sheet: 90, drawer: 95, dialog: 100 };
