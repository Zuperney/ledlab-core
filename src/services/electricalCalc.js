// services/electricalCalc.js
// ─────────────────────────────────────────────────────────────
// "Processador de Sinal" elétrico — funções PURAS (nunca importam React).
// Padrão elétrico brasileiro / infraestrutura de eventos. Erros aqui queimam
// equipamentos, então dimensionamos SEMPRE pelo consumo máximo (pwrMax).
// ─────────────────────────────────────────────────────────────

const SQRT3 = Math.sqrt(3);

// Tabela de configurações de tensão. Chave = "<tensao>_<fase>".
//  div   = divisor de corrente (I = S / div)
//  dl    = rótulo do divisor exibido no passo-a-passo
//  label = nome da fase
//  ph    = nº de fases
//  g     = grupo de tensão ("220" | "380")
export const VOLT = {
  "220_bi":   { div: 220,        dl: "220",      label: "Bifásico",            note: "",                  ph: 2, g: "220" },
  "220_tri":  { div: 220 * SQRT3, dl: "220 × √3", label: "Trifásico",           note: "",                  ph: 3, g: "220" },
  "380_mono": { div: 220,        dl: "220",      label: "Monofásico (F+N)",    note: "F+N → 220V fase",   ph: 1, g: "380" },
  "380_bi":   { div: 440,        dl: "2 × 220",  label: "Bifásico (F+F+N)",    note: "220V por fase",     ph: 2, g: "380" },
  "380_tri":  { div: 380 * SQRT3, dl: "380 × √3", label: "Trifásico (F+F+F+N)", note: "",                  ph: 3, g: "380" },
};

// Escada de disjuntores IEC. Escolhe o 1º padrão >= corrente × 1.25 (margem 25%).
const BREAKER_LADDER = [10, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125];

export function pickBreaker(current) {
  return BREAKER_LADDER.find((b) => b >= current * 1.25) || 160;
}

// Pitch (mm) a partir da resolução e dimensão físicas do gabinete.
export function pitch(cab) {
  const resX = parseFloat(cab.resX);
  const dimW = parseFloat(cab.dimW);
  if (cab.resX && cab.dimW && resX > 0) {
    return (dimW / resX).toFixed(2) + " mm";
  }
  return "—";
}

const clamp01 = (n) => Math.min(1, Math.max(0, Number(n)));

// Cálculo elétrico de uma tela/carga (PICO).
//   W  = tiles × W/tile
//   S  = W / fator de potência        (potência aparente, VA)
//   I  = S / divisor de tensão        (corrente por fase, A)
//   disjuntor = escada(I × 1.25)
export function calcScreen({ tiles, pwrPerTile, pf, vk }) {
  const vc = VOLT[vk] || VOLT["220_tri"]; // fallback defensivo se vk vier inválido/corrompido
  const W = tiles * pwrPerTile;
  const S = W / pf;
  const I = parseFloat((S / vc.div).toFixed(1));
  const breaker = pickBreaker(I);
  return {
    vc,
    W,
    S,
    kVA: (S / 1000).toFixed(2),
    I,
    breaker,
    steps: [
      `S = ${W}W ÷ ${pf} = ${Math.round(S).toLocaleString()} VA`,
      `I = ${Math.round(S)} ÷ (${vc.dl}) = ${I} A`,
      `Disjuntor ≥ ${I}A × 1.25 → ${breaker}A`,
    ],
  };
}

// Consumo TÍPICO por tile ("Modelo Barco"):
//   black level + (máx − preto) × brilho × conteúdo
// Se o black level não for informado, assume 15% do máximo.
export function typicalPerTile(pwrMax, pwrBlack, brilho = 0.7, conteudo = 0.33) {
  const max = Math.max(0, Number(pwrMax) || 0);
  if (max <= 0) return 0;
  let black = Number(pwrBlack) || 0;
  if (black <= 0 || black >= max) black = max * 0.15;
  return black + (max - black) * clamp01(brilho) * clamp01(conteudo);
}
