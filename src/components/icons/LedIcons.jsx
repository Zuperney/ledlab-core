// components/icons/LedIcons.jsx — ícones PRÓPRIOS do domínio LED (autorizado pelo
// usuário na simplificação mobile). Mesmo contrato do lucide: stroke currentColor,
// viewBox 24, prop `size` — theme-aware de graça (herdam a cor do texto).
//
// Usar onde o ícone genérico não conta a história: toggles de exibição do test
// card/composição, regiões, lado a lado. Em NAVEGAÇÃO o rótulo continua (regra).

const base = (size) => ({
  width: size, height: size, viewBox: "0 0 24 24", fill: "none",
  stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round",
});

// numeração de gabinetes: o gabinete com o "1" no canto (como no mapa de cabos)
export function IconNumeros({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M8 8.5l2-1.5v6" />
      <path d="M14 17h5M14 13h7" strokeWidth={1.6} opacity="0.55" />
    </svg>
  );
}

// caixa de info da tela (retângulo com o bloco de informações no canto)
export function IconInfoBox({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <rect x="6" y="13" width="7" height="4.5" rx="1" fill="currentColor" stroke="none" opacity="0.85" />
    </svg>
  );
}

// telas lado a lado (a disposição em fila, encostadas)
export function IconLadoALado({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <rect x="3" y="6" width="8.5" height="12" rx="1.5" />
      <rect x="12.5" y="6" width="8.5" height="12" rx="1.5" />
    </svg>
  );
}

// regiões do canvas (marcas de recorte + região) — usado no "copiar regiões"
export function IconRegioes({ size = 16 }) {
  return (
    <svg {...base(size)}>
      <path d="M3 8V4a1 1 0 0 1 1-1h4M16 3h4a1 1 0 0 1 1 1v4M21 16v4a1 1 0 0 1-1 1h-4M8 21H4a1 1 0 0 1-1-1v-4" />
      <rect x="8" y="8" width="8" height="8" rx="1" />
    </svg>
  );
}
