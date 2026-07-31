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
// `s` = nome curto padronizado pra UI compacta (barra segmentada da aba Energia)
export const VOLT = {
  "220_bi":   { div: 220,        dl: "220",      label: "Bifásico (F+F)",      note: "",                  ph: 2, g: "220", s: "220V·2F" },
  "220_tri":  { div: 220 * SQRT3, dl: "220 × √3", label: "Trifásico (F+F+F)",   note: "",                  ph: 3, g: "220", s: "220V·3F" },
  "380_mono": { div: 220,        dl: "220",      label: "Monofásico (F+N)",    note: "F+N → 220V fase",   ph: 1, g: "380", s: "380V·F+N" },
  "380_bi":   { div: 440,        dl: "2 × 220",  label: "Bifásico (F+F+N)",    note: "220V por fase",     ph: 2, g: "380", s: "380V·2F+N" },
  "380_tri":  { div: 380 * SQRT3, dl: "380 × √3", label: "Trifásico (F+F+F+N)", note: "",                  ph: 3, g: "380", s: "380V·3F+N" },
};

// rótulo completo pra impressão: "220 V · Trifásico (F+F+F)" — o `label` sozinho
// não carrega a tensão, e no papel a tensão é metade da informação
export const voltFull = (vc) => `${vc.g} V · ${vc.label}`;

// ── Divisão de FASES dos cabos AC (rodízio) ──
// Fase do cabo `n` (1-based). O tipo de circuito depende da configuração:
//   380 tri  → circuito 220 V é F+N  → rodízio R, S, T
//   220 tri  → circuito 220 V é F+F  → rodízio de PARES: RS, ST, TR
//   380 bi   → duas fases disponíveis (F+N) → alterna R, S
//   monofásico e 220 bi → uma configuração só de fase → sem rodízio (null)
// O rodízio REINICIA a cada Screen (decisão do dono, 30/07: cada Screen é um
// quadro); no legado sem Screens a numeração global do projeto faz esse papel.
export function phaseOf(n, vc) {
  if (!vc || !(n >= 1)) return null;
  if (vc.ph === 3) {
    const seq = vc.g === "220" ? ["RS", "ST", "TR"] : ["R", "S", "T"];
    return seq[(n - 1) % 3];
  }
  if (vc.ph === 2 && vc.g === "380") return ["R", "S"][(n - 1) % 2];
  return null;
}

// Balanço de carga por fase: soma ARITMÉTICA da corrente dos cabos que TOCAM
// cada fase (par RS soma em R e em S — no F+F a corrente passa nos dois
// condutores; a soma aritmética é a leitura prática/conservadora de quadro).
// `cabos` = [{ n, load }] com a numeração que o rodízio usa.
export function phaseBalance(cabos, vc) {
  const letras = ["R", "S", "T"].slice(0, vc?.ph === 3 ? 3 : vc?.ph === 2 && vc?.g === "380" ? 2 : 0);
  if (!letras.length) return { temRodizio: false, fases: [] };
  const acc = Object.fromEntries(letras.map((f) => [f, { fase: f, cabos: 0, A: 0 }]));
  for (const c of cabos || []) {
    const fase = phaseOf(c.n, vc);
    if (!fase) continue;
    for (const letra of fase) {
      acc[letra].cabos += 1;
      acc[letra].A += c.load || 0;
    }
  }
  return { temRodizio: true, fases: letras.map((f) => ({ ...acc[f], A: Math.round(acc[f].A * 10) / 10 })) };
}

// ── Regra dos 80% (carga contínua) ──
// Circuito carregado por horas (painel de LED em show) não deve passar de 80%
// da capacidade nominal do conector (prática NEC de carga contínua — na NBR 5410
// o critério formal é Ib ≤ In ≤ Iz; auditoria 30/07/2026).
// Acima de 80% = ATENÇÃO (laranja); acima de 100% = ESTOURO (vermelho).
export const AC_WARN_PCT = 80;
export function acTone(pct) {
  return pct > 100 ? "over" : pct > AC_WARN_PCT ? "warn" : "ok";
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
// O app NÃO sugere disjuntor (decisão do dono, 30/07/2026): entrega a corrente
// e a proteção é dimensionada pelo eletricista do quadro (tabela no KB).
export function calcScreen({ tiles, pwrPerTile, pf, vk }) {
  const vc = VOLT[vk] || VOLT["220_tri"]; // fallback defensivo se vk vier inválido/corrompido
  const W = tiles * pwrPerTile;
  const S = W / pf;
  const I = parseFloat((S / vc.div).toFixed(1));
  return {
    vc,
    W,
    S,
    kVA: (S / 1000).toFixed(2),
    I,
    steps: [
      `S = ${W}W ÷ ${pf} = ${Math.round(S).toLocaleString()} VA`,
      `I = ${Math.round(S)} ÷ (${vc.dl}) = ${I} A`,
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
