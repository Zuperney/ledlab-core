// config/electricalConfig.js — constantes elétricas/sinal GLOBAIS (fonte única).
// Reunidas aqui para evitar valores duplicados espalhados pelas páginas/serviços.
// NÃO altera as regras de cálculo (pwrMax, disjuntor 125%, consumo típico).

export const PX_PER_PORT = 655360; // capacidade de porta de sinal (Gigabit) @60Hz
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
