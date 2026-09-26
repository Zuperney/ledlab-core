// services/blocos.js — a tela feita de BLOCOS de gabinete (fonte única da geometria).
//
// Até aqui, tela = UM modelo × colunas × linhas. No campo não é sempre assim: três
// eventos reais misturaram 50×100 com 50×50 na mesma parede. A tela passa a ser uma
// lista de blocos — cada um com o seu gabinete, colunas × linhas e posição em mm.
// Espeque: docs/fluxo-telas-spec.md (D1, D2, D3).
//
// ⚠️ TELA SEM `blocos` É UM BLOCO SÓ, montado de gabinete/cols/rows na leitura.
// Projeto salvo abre igual — nenhuma migração, e o caminho de sempre continua
// idêntico (mesma célula, mesma coordenada, mesma chave).
//
// ⚠️ DE PÉ × DEITADA. A geometria aqui é SEMPRE de pé: é como o processador
// enxerga os gabinetes, e é o que o Cabeamento e a Screen usam. `deitada` (montagem
// girada 90° anti-horário) só existe pras vistas FÍSICAS — cadastro, Composição ›
// Conteúdo, Estrutura e Caderno —, via `medidaFisica`. O motor de portas nem sabe
// que o giro existe (D2).

const num = (v) => parseFloat(v) || 0;

/** a chave do MODELO pela resolução (mesma regra do canvas: gabinete vazio = 128) */
export const modelKeyGab = (g) => `${num(g?.resX) || 128}x${num(g?.resY) || 128}`;

/**
 * Os blocos da tela, normalizados. Tela legada vira `[um bloco]` na origem.
 *
 * `x`/`y` em mm, de pé, a partir do canto superior esquerdo da tela.
 */
export function blocosDe(tela) {
  const lista = Array.isArray(tela?.blocos) ? tela.blocos.filter(Boolean) : [];
  if (!lista.length) {
    return [{ id: "b0", gabinete: tela?.gabinete || {}, cols: tela?.cols || 0, rows: tela?.rows || 0, x: 0, y: 0 }];
  }
  return lista.map((b, i) => ({
    id: b.id || `b${i}`,
    gabinete: b.gabinete || {},
    cols: Math.max(0, Math.round(num(b.cols))),
    rows: Math.max(0, Math.round(num(b.rows))),
    x: num(b.x),
    y: num(b.y),
  }));
}

/** a tela foi cadastrada em blocos? Sem a lista, é legada (gabinete/cols/rows) e segue o caminho de sempre. */
export const temBlocos = (tela) => Array.isArray(tela?.blocos) && tela.blocos.some(Boolean);

/** mistura modelos diferentes? (é o que impede, por ex., o corte por coluna) */
export const ehMista = (tela) => new Set(blocosDe(tela).map((b) => modelKeyGab(b.gabinete))).size > 1;

// px por mm do gabinete, pra levar a posição do bloco (mm) pro canvas (px). Sem
// medida cadastrada, a posição já é tratada como px — não inventa pitch.
function pxPorMm(g) {
  const w = num(g?.dimW), h = num(g?.dimH);
  return { sx: w ? (num(g?.resX) || 128) / w : 1, sy: h ? (num(g?.resY) || 128) / h : 1 };
}

/** origem do bloco em px de canvas (de pé) */
export function origemPx(b) {
  const { sx, sy } = pxPorMm(b.gabinete);
  return { x: Math.round(b.x * sx), y: Math.round(b.y * sy) };
}

/**
 * Os gabinetes da tela, DE PÉ, em px relativos ao canto da tela.
 *
 * Cada célula: `{ bloco, c, r, x, y, w, h, gabinete, model }`. `c`/`r` são do
 * bloco — numa tela de um bloco só, é exatamente a grade de sempre.
 */
export function celulasDaTela(tela) {
  const out = [];
  blocosDe(tela).forEach((b, bi) => {
    const resX = num(b.gabinete?.resX) || 128, resY = num(b.gabinete?.resY) || 128;
    const o = origemPx(b), model = modelKeyGab(b.gabinete);
    // tela legada sem colunas/linhas desenha 1×1 (mesma regra do dimOf de sempre)
    const cols = temBlocos(tela) ? b.cols : b.cols || 1, rows = temBlocos(tela) ? b.rows : b.rows || 1;
    for (let r = 0; r < rows; r++)
      for (let c = 0; c < cols; c++)
        out.push({ bloco: bi, c, r, x: o.x + c * resX, y: o.y + r * resY, w: resX, h: resY, gabinete: b.gabinete, model });
  });
  return out;
}

/** resolução da tela em px (caixa envolvente, de pé) */
export function dimTela(tela) {
  if (!temBlocos(tela)) {
    const g = tela?.gabinete;
    return { w: (tela?.cols || 1) * (num(g?.resX) || 128), h: (tela?.rows || 1) * (num(g?.resY) || 128) };
  }
  let w = 0, h = 0;
  for (const c of celulasDaTela(tela)) { w = Math.max(w, c.x + c.w); h = Math.max(h, c.y + c.h); }
  return { w, h };
}

/**
 * A medida FÍSICA da tela em mm — a que vai pro palco e pro Caderno.
 *
 * De pé é a caixa dos blocos; `deitada` troca largura por altura (giro de 90°).
 * `area_mm2` soma os blocos (buraco entre blocos não é LED).
 */
export function medidaFisica(tela) {
  let w = 0, h = 0, area = 0;
  for (const b of blocosDe(tela)) {
    const bw = b.cols * num(b.gabinete?.dimW), bh = b.rows * num(b.gabinete?.dimH);
    w = Math.max(w, b.x + bw); h = Math.max(h, b.y + bh);
    area += bw * bh;
  }
  return tela?.deitada ? { w: h, h: w, area_mm2: area } : { w, h, area_mm2: area };
}

/** quantos gabinetes de cada modelo — pra lista de material e o resumo do cadastro */
export function contagemPorModelo(tela) {
  const m = new Map();
  for (const b of blocosDe(tela)) {
    const k = modelKeyGab(b.gabinete);
    const atual = m.get(k) || { model: k, gabinete: b.gabinete, gab: 0 };
    atual.gab += b.cols * b.rows;
    m.set(k, atual);
  }
  return [...m.values()];
}
