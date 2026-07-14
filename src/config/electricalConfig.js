// config/electricalConfig.js — constantes elétricas/sinal GLOBAIS (fonte única).
// Reunidas aqui para evitar valores duplicados espalhados pelas páginas/serviços.
// NÃO altera as regras de cálculo (pwrMax, disjuntor 125%, consumo típico).

export const PX_PER_PORT = 655360; // capacidade de porta de sinal (Gigabit) @60Hz · 8-bit
// capacidade por profundidade de cor (px/porta @60Hz, Gigabit) — ref. Novastar/Colorlight:
// 10-bit dobra os dados por pixel → metade dos pixels por porta.
export const PX_PER_PORT_BY_BITS = { 8: 655360, 10: 327680 };
export const FASE_V = 220;         // tensão de fase p/ corrente por cabo AC

// amperagem nominal por tipo de conector de energia
export const CONN_AMP = {
  "PowerCON Azul/Branco": 20,
  "PowerCON TRUE1": 16,
  "Neutrik True1": 16,
  "Neutrik True1 TOP": 16, // 16 A sob EN 60320-1/VDE (regime IEC do Brasil); os 20 A são só rating UL/EUA
  "HangTon SD20": 16,      // sem datasheet/certificação localizável — default conservador (= "desconhecido")
  PowerCON: 20,
};
