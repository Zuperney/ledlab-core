// components/NumField.jsx — input numérico que NÃO força 0 ao apagar.
//
// Problema que resolve:
//  1) Campos `value={numero}` com `onChange={(v)=>set(parseInt(v)||0)}` viravam "0"
//     assim que a caixa era esvaziada (o `||0` era pra não passar NaN pro cálculo).
//  2) Campos DERIVADOS que exibiam `valor.toFixed(2)` se reformatavam a cada tecla —
//     ex.: o campo em metros das telas ia de 3.00 -> 300.00 porque reconvertia e
//     reformatava no meio da digitação, brigando com o cursor.
//
// Como funciona: enquanto o campo está em foco, ele mostra um RASCUNHO de texto (o que
// o usuário digitou — pode ficar vazio, sem reformatar). O número só é commitado quando
// é válido (cálculo ao vivo); ao sair vazio, grava 0. Fora de foco, espelha o valor
// canônico já formatado (inteiro ou 2 casas).
//
// O rascunho aceita CONTA ("1920/2", "192*3", "(1920-64)/2" — services/expr.js): o
// que é commitado é sempre o resultado, e enquanto se digita o resultado aparece
// num balão "= n" pra conferir antes de sair do campo.
import { useState } from "react";
import { input, label as lblStyle } from "../ui/styles.js";
import { T } from "../ui/tokens.js";
import { evalExpr, isExpr } from "../services/expr.js";

const fmtInt = (n) => (n == null || Number.isNaN(n) ? "" : String(Math.trunc(n)));
const fmtDec2 = (n) => (n == null || Number.isNaN(n) ? "" : n ? Number(n).toFixed(2) : "0");

export default function NumField({ lbl, value, onChange, fmt = "int", placeholder = "0", req, style }) {
  // fmt: "int" | "dec2" | (num)=>string. Callers clampam (min/max) no próprio onChange.
  const format = typeof fmt === "function" ? fmt : fmt === "dec2" ? fmtDec2 : fmtInt;
  const isInt = fmt === "int";
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);

  const commit = (raw) => {
    const n = evalExpr(raw);
    if (n == null) return; // conta pela metade ("1920/") espera a próxima tecla
    onChange(isInt ? Math.round(n) : n);
  };

  // resultado ao vivo: só quando há conta de verdade e ela já fecha
  const conta = editing && isExpr(draft) ? evalExpr(draft) : null;

  const el = (
    <input
      type="text"
      inputMode={isInt ? "numeric" : "decimal"}
      value={editing ? draft : format(value)}
      placeholder={placeholder}
      onFocus={() => {
        setDraft(format(value));
        setEditing(true);
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.,+\-*/xX×÷() ]/g, ""); // dígitos, separador e operadores
        setDraft(raw);
        if (raw.trim() !== "") commit(raw); // commita ao vivo; vazio espera (não vira 0 agora)
      }}
      onBlur={() => {
        if (draft.trim() === "") onChange(0); // saiu vazio -> 0 (o caller pode clampar p/ min)
        setEditing(false);
      }}
      style={style || input()}
    />
  );

  // o balão flutua (position absolute) pra não empurrar layout nenhum — o campo
  // segue do mesmo tamanho com ou sem conta em cima.
  const campo = (
    <span style={{ position: "relative", display: "block", minWidth: 0 }}>
      {el}
      {conta != null && (
        <span style={{ position: "absolute", left: 0, top: "calc(100% + 3px)", zIndex: 3, whiteSpace: "nowrap",
          background: T.card, border: `1px solid ${T.bd}`, borderRadius: 999, padding: "2px 8px",
          color: T.txt, fontSize: 11, fontFamily: "ui-monospace, monospace" }}>
          = {format(isInt ? Math.round(conta) : conta)}
        </span>
      )}
    </span>
  );

  if (!lbl) return campo; // modo "bare": só o input (p/ layouts inline com label próprio)
  return (
    <div style={{ marginBottom: 12, minWidth: 0 }}>
      <label style={lblStyle}>
        {lbl}
        {req ? <span style={{ color: T.red }}> obrigatório</span> : ""}
      </label>
      {campo}
    </div>
  );
}
