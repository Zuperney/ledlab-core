// services/videoTiming.js — timing de vídeo VESA CVT (padrão CRT/GTF e Reduced Blanking),
// reproduzindo o gerador Novastar do MCTRL4K (validado célula a célula contra a planilha).
// Dá a resolução total (active/porch/sync/blank/total H e V), pixel clock, frequências e
// polaridades — os parâmetros que se programa numa resolução custom / EDID da fonte.

const CELL_GRAN = 8;         // granularidade horizontal (pixels)
const MIN_VSYNC_BP = 550;    // us (padrão)
const MIN_V_PORCH = 3;       // linhas (padrão)
const MIN_V_BPORCH = 6;      // linhas
const H_SYNC_PER = 8;        // % do período de linha (padrão)
const M_PRIME = 300;         // GTF: K/256*M  (K=128, M=600)
const C_PRIME = 30;          // GTF: ((C-J)*K/256)+J  (C=40, J=20)
const RB_H_BLANK = 160;      // pixels fixos de blanking (reduced)
const RB_H_SYNC = 32;        // pixels fixos de sync (reduced)
const RB_MIN_V_BLANK = 460;  // us (reduced)
const RB_V_FPORCH = 23;      // linhas — valor do gerador Novastar (VESA usa 3)
const CLOCK_STEP = 0.001;    // MHz

// aspecto -> largura de VSYNC (linhas), conforme tabela CVT
const ASPECTS = [["4:3", 4 / 3, 4], ["16:9", 16 / 9, 5], ["16:10", 16 / 10, 6], ["5:4", 5 / 4, 7], ["15:9", 15 / 9, 7]];

function detectAspect(hrnd, vrnd) {
  for (const [name, r, vsync] of ASPECTS) {
    if (hrnd === CELL_GRAN * Math.floor((vrnd * r) / CELL_GRAN)) return { name, vsync };
  }
  return { name: "Custom", vsync: 10 };
}

// Calcula o timing CVT para uma resolução/refresh. reducedBlanking=true (recomendado p/ LED).
export function cvtTiming(H, V, refresh, { reducedBlanking = true } = {}) {
  H = Math.round(H); V = Math.round(V); const Fr = Number(refresh);
  if (!H || !V || !Fr) return null;
  const Hrnd = Math.floor(H / CELL_GRAN) * CELL_GRAN; // largura arredondada p/ múltiplo de 8
  const Vrnd = Math.floor(V);
  const asp = detectAspect(Hrnd, Vrnd);
  const vSync = Math.floor(asp.vsync);
  const TAP = Hrnd; // total active pixels (sem margens)

  let hPeriodEst, totalVLines, totalPixels, pixelClock;
  let hBlank, hSync, hBack, hFront, vBlank, vFront, vBack, hPolPos, vPolPos;

  if (reducedBlanking) {
    hPeriodEst = (1e6 / Fr - RB_MIN_V_BLANK) / Vrnd; // us
    const vbiLines = Math.floor(RB_MIN_V_BLANK / hPeriodEst) + 1;
    const rbMinVbi = RB_V_FPORCH + vSync + MIN_V_BPORCH;
    const actVbi = Math.max(vbiLines, rbMinVbi);
    totalVLines = actVbi + Vrnd;
    totalPixels = RB_H_BLANK + TAP;
    pixelClock = CLOCK_STEP * Math.floor((Fr * totalVLines * totalPixels / 1e6) / CLOCK_STEP);
    hBlank = RB_H_BLANK; hSync = RB_H_SYNC; hBack = hBlank / 2; hFront = hBlank - hBack - hSync;
    vBlank = actVbi; vFront = RB_V_FPORCH; vBack = vBlank - vFront - vSync;
    hPolPos = true; vPolPos = false;
  } else {
    hPeriodEst = ((1 / Fr) - MIN_VSYNC_BP / 1e6) / (Vrnd + MIN_V_PORCH) * 1e6; // us
    const vSyncBpEst = Math.floor(MIN_VSYNC_BP / hPeriodEst) + 1;
    const vSyncBp = Math.max(vSyncBpEst, vSync + MIN_V_BPORCH);
    totalVLines = Vrnd + vSyncBp + MIN_V_PORCH;
    const idealDuty = C_PRIME - (M_PRIME * hPeriodEst / 1000);
    const duty = idealDuty < 20 ? 20 : idealDuty;
    hBlank = Math.floor(TAP * duty / (100 - duty) / (2 * CELL_GRAN)) * (2 * CELL_GRAN);
    totalPixels = TAP + hBlank;
    pixelClock = CLOCK_STEP * Math.floor((totalPixels / hPeriodEst) / CLOCK_STEP);
    hSync = Math.floor(H_SYNC_PER / 100 * totalPixels / CELL_GRAN) * CELL_GRAN;
    hBack = hBlank / 2; hFront = hBlank - hBack - hSync;
    vBlank = vSyncBp + MIN_V_PORCH; vFront = MIN_V_PORCH; vBack = vBlank - vFront - vSync;
    hPolPos = false; vPolPos = true;
  }

  const hFreq = 1000 * pixelClock / totalPixels; // kHz
  const vFreq = 1000 * hFreq / totalVLines;      // Hz

  return {
    reducedBlanking, aspect: asp.name,
    h: { active: Hrnd, front: hFront, sync: hSync, back: hBack, blank: hBlank, total: totalPixels, polPos: hPolPos },
    v: { active: Vrnd, front: vFront, sync: vSync, back: vBack, blank: vBlank, total: totalVLines, polPos: vPolPos },
    pixelClock, hFreq, vFreq,
  };
}

// Limites de controladores (extensível). MCTRL4K conforme o gerador oficial Novastar.
export const CONTROLLERS = {
  MCTRL4K: { name: "Novastar MCTRL4K", maxPixels: 4096 * 2160, maxClock: (H, V) => 590 - (H / V) * 8.9 },
};

export function controllerCheck(ctrl, H, V, pixelClock) {
  const c = CONTROLLERS[ctrl]; if (!c) return null;
  const maxClock = c.maxClock(H, V);
  const clockOver = pixelClock > maxClock;
  const pxOver = H * V > c.maxPixels;
  return { name: c.name, maxClock, maxPixels: c.maxPixels, clockOver, pxOver, ok: !clockOver && !pxOver };
}
