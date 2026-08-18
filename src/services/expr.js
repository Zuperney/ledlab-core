// services/expr.js — conta dentro do campo numérico.
//
// Por que existe: no evento a dimensão sai de conta de cabeça — "1920/2",
// "192*3", "(1920-64)/2". Abrir a calculadora, fazer a conta e digitar o
// resultado é passo a mais e fonte de erro de digitação. O campo aceita a conta
// e guarda o RESULTADO (o NumField commita o número, nunca o texto).
//
// Sem eval/new Function: o app é PWA e avaliar texto de usuário não entra.
// É uma descida recursiva sobre + − × ÷ e parênteses — expressão inválida
// (meio de digitação, "1920/") devolve null, e quem chama simplesmente não
// commita.
//
// Número em pt-BR: vírgula é decimal; ponto agrupando 3 dígitos ("1.920") é
// separador de milhar. "1.5" continua sendo um e meio (ninguém escreve mil e
// quinhentos com um dígito na frente do ponto).

const isDigit = (c) => c >= "0" && c <= "9";
const isNumChar = (c) => c !== undefined && (isDigit(c) || c === "." || c === ",");

// texto de UM número → número. Exportado porque o milhar pt-BR é regra da casa.
export function parseNum(tok) {
  let s = String(tok ?? "").trim();
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", "."); // milhar + decimal pt-BR
  else if (/^\d{1,3}(\.\d{3})+$/.test(s)) s = s.replace(/\./g, ""); // só milhar ("1.920")
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

// tem conta pra fazer? (o "−" da frente é sinal, não operação)
export const isExpr = (raw) => /[+*/xX×÷()]/.test(String(raw ?? "")) || /.-/.test(String(raw ?? ""));

// "1920/2" → 960 · "192*3" → 576 · "1920/" → null · "" → null.
// Divisão por zero e resultado não-finito também caem em null: campo não
// guarda Infinity.
export function evalExpr(raw) {
  const s = String(raw ?? "")
    .replace(/[xX×]/g, "*") // 192x3 e 192×3 são multiplicação (a grade se escreve com ×)
    .replace(/÷/g, "/")
    .replace(/\s+/g, "");
  if (!s) return null;
  let i = 0;
  const peek = () => s[i];

  function num() {
    const j0 = i;
    while (isNumChar(s[i])) i++;
    return i === j0 ? null : parseNum(s.slice(j0, i));
  }
  function primary() {
    if (peek() === "(") {
      i++;
      const v = expr();
      if (v == null || peek() !== ")") return null;
      i++;
      return v;
    }
    if (peek() === "-") { i++; const v = primary(); return v == null ? null : -v; }
    if (peek() === "+") { i++; return primary(); }
    return num();
  }
  function term() {
    let v = primary();
    if (v == null) return null;
    while (peek() === "*" || peek() === "/") {
      const op = s[i++];
      const r = primary();
      if (r == null || (op === "/" && r === 0)) return null;
      v = op === "*" ? v * r : v / r;
    }
    return v;
  }
  function expr() {
    let v = term();
    if (v == null) return null;
    while (peek() === "+" || peek() === "-") {
      const op = s[i++];
      const r = term();
      if (r == null) return null;
      v = op === "+" ? v + r : v - r;
    }
    return v;
  }

  const v = expr();
  // i === s.length: sobrou lixo ("12)3") = expressão inválida, não meio-resultado
  return v != null && i === s.length && Number.isFinite(v) ? v : null;
}
