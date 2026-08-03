// services/viewing.js — distâncias de visão × pixel pitch (fecha a Fase 02 do
// roadmap). As quatro réguas da indústria, validadas com fontes em 02/08/2026
// (o artigo "pixel-pitch" da Base de Conhecimento cita as mesmas fontes):
//   • MIN_K (regra 1×): pitch em MM vira METROS — onde as cores fundem e a
//     imagem "fecha" (Linsn, prática de mercado). P3 → 3 m. O fator dimensional
//     mm→m está escondido na regra; não "corrigir".
//   • OTIMA_K (regra 10×): pitch × 10 PÉS = × 3,048 m (Daktronics KB 000030569).
//   • RETINA_K (VAD): pitch × 3,438 m — 1 minuto de arco, visão 20/20; onde o
//     pixel deixa de existir pro olho (Planar, "Understanding Viewing Distance").
//   • MAX_ALTURA_K: distância máxima = altura da tela × 30 (regra de
//     billboard/outdoor — a imagem ainda "vale" de longe; EagerLED).
// AVIXA DISCAS (6×/8× a altura) é critério de LEITURA de texto — pergunta
// diferente de "ver imagem"; fica como nota na KB, fora do motor.
// PURO de propósito (sem imports): números com PONTO; a vírgula é da view.

export const MIN_K = 1; // mm → m (regra 1×)
export const OTIMA_K = 3.048; // 10 pés por mm de pitch
export const RETINA_K = 3.438; // 1 arcminuto (20/20)
export const MAX_ALTURA_K = 30; // × altura da tela

// pitch numérico (mm) a partir do cadastro — dimW/resX chegam como STRING do
// formulário. Fonte canônica do número; a versão formatada ("3.91 mm") segue
// em electricalCalc.pitch().
export function pitchMm(cab) {
  const d = parseFloat(cab?.dimW), r = parseFloat(cab?.resX);
  if (!(d > 0) || !(r > 0)) return null;
  const p = d / r;
  return Number.isFinite(p) ? p : null;
}

// as quatro distâncias (m) pra um pitch (mm); altura da tela (m) é opcional —
// sem ela não existe "máxima" (maxM = null), as outras três não dependem dela
export function viewingOf(pitch, alturaM) {
  if (!(pitch > 0) || !Number.isFinite(pitch)) return null;
  return {
    minM: pitch * MIN_K,
    otimaM: pitch * OTIMA_K,
    retinaM: pitch * RETINA_K,
    maxM: alturaM > 0 && Number.isFinite(alturaM) ? alturaM * MAX_ALTURA_K : null,
  };
}

// classifica uma distância contra as réguas — a chave semântica é do motor
// (testável); cor e rótulo PT ficam na view
export function faixa(distM, v) {
  if (!v || !(distM > 0)) return null;
  if (distM < v.minM) return "muito-perto";
  if (v.maxM != null && distM > v.maxM) return "longe-demais";
  if (distM < v.otimaM) return "aceitavel";
  if (distM < v.retinaM) return "ideal";
  return "retina";
}

// inverso: pra uma primeira fila a distM, qual pitch compra o quê —
// retinaMm = pixel invisível; tetoMm = limite onde a imagem ainda fecha
export function pitchFor(distM) {
  if (!(distM > 0) || !Number.isFinite(distM)) return null;
  return { retinaMm: distM / RETINA_K, tetoMm: distM / MIN_K };
}

// recomendação acionável sobre o CADASTRO do usuário: o gabinete de MAIOR
// pitch que ainda fica retina na distância (o mais econômico que atende);
// se nenhum atende, o de menor pitch (o mais próximo), com atende=false.
// Ordenação determinística: pitch, depois nome.
export function sugerirGabinete(distM, cabs) {
  const alvo = pitchFor(distM);
  if (!alvo) return null;
  const validos = (cabs || [])
    .map((cab) => ({ cab, pitchMm: pitchMm(cab) }))
    .filter((x) => x.pitchMm != null)
    .sort((a, b) => a.pitchMm - b.pitchMm || String(a.cab.nome).localeCompare(String(b.cab.nome)));
  if (!validos.length) return null;
  const atendem = validos.filter((x) => x.pitchMm <= alvo.retinaMm);
  if (!atendem.length) return { ...validos[0], atende: false };
  // maior pitch que atende; entre pitches IGUAIS, o primeiro em ordem de nome
  const melhor = atendem[atendem.length - 1].pitchMm;
  return { ...atendem.find((x) => x.pitchMm === melhor), atende: true };
}
