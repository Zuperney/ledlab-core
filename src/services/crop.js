// services/crop.js — cálculo de crop "preencher" (cover) pra sistemas de processamento:
// a região da FONTE (srcW×srcH) que enche a TELA (scrW×scrH) sem distorcer, com
// deslocamento no eixo que sobra. Ex.: FHD 1920×1080 → simultâneo em pé 704×1056
// vira um recorte 720×1080, e o deslocamento X escolhe qual faixa do 1920 entra.
export function fillCrop(srcW, srcH, scrW, scrH, offFrac = 0.5) {
  const sw = Math.max(1, Math.round(srcW) || 1);
  const sh = Math.max(1, Math.round(srcH) || 1);
  const W = Math.max(1, Math.round(scrW) || 1);
  const H = Math.max(1, Math.round(scrH) || 1);
  const k = Math.max(W / sw, H / sh); // escala p/ cobrir a tela (cover)
  const cropW = Math.min(sw, Math.round(W / k));
  const cropH = Math.min(sh, Math.round(H / k));
  const slackX = sw - cropW;
  const slackY = sh - cropH;
  const f = Math.min(1, Math.max(0, offFrac));
  const x = Math.round(slackX * f);
  const y = Math.round(slackY * f);
  // eixo onde há sobra (onde o deslocamento age); null = fonte já tem o aspecto da tela
  const axis = slackX > slackY ? "x" : slackY > 0 ? "y" : null;
  return { cropW, cropH, x, y, slackX, slackY, axis, scale: k };
}
