// store/UIContext.jsx
// Feedback global do app: modal de confirmação (para ações destrutivas) e toasts.
//   const confirm = useConfirm();  if (await confirm({ title, message })) { ... }
//   const toast = useToast();      toast("Item excluído");
import { createContext, useContext, useState, useCallback } from "react";
import { TriangleAlert, X, CircleCheck, Info } from "lucide-react";
import { T } from "../ui/tokens.js";
import { btn } from "../ui/styles.js";

const UIContext = createContext(null);

export function UIProvider({ children }) {
  const [dialog, setDialog] = useState(null); // { title, message, confirmLabel, danger, resolve }
  const [promptState, setPromptState] = useState(null); // { title, message, defaultValue, placeholder, resolve }
  const [toasts, setToasts] = useState([]);

  const confirm = useCallback(
    (opts) => new Promise((resolve) => setDialog({ danger: true, confirmLabel: "Excluir", ...opts, resolve })),
    []
  );
  const closeDialog = (value) => { setDialog((d) => { d?.resolve(value); return null; }); };
  const prompt = useCallback((opts) => new Promise((resolve) => setPromptState({ ...opts, resolve })), []);
  const closePrompt = (value) => { setPromptState((d) => { d?.resolve(value); return null; }); };

  const toast = useCallback((message, type = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2800);
  }, []);

  return (
    <UIContext.Provider value={{ confirm, toast, prompt }}>
      {children}
      {dialog && <ConfirmDialog dialog={dialog} onClose={closeDialog} />}
      {promptState && <PromptDialog dialog={promptState} onClose={closePrompt} />}
      <ToastStack toasts={toasts} />
    </UIContext.Provider>
  );
}

export const useConfirm = () => useContext(UIContext).confirm;
export const useToast = () => useContext(UIContext).toast;
export const usePrompt = () => useContext(UIContext).prompt;

function PromptDialog({ dialog, onClose }) {
  const [val, setVal] = useState(dialog.defaultValue || "");
  return (
    <div onClick={() => onClose(null)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: T.card, border: `1px solid ${T.bd}`, borderRadius: 14, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <h3 style={{ margin: "0 0 6px", color: T.txt, fontSize: 16 }}>{dialog.title || "Digite um valor"}</h3>
        {dialog.message && <p style={{ margin: "0 0 12px", color: T.mut, fontSize: 13 }}>{dialog.message}</p>}
        <input autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder={dialog.placeholder}
          onKeyDown={(e) => { if (e.key === "Enter") onClose(val); if (e.key === "Escape") onClose(null); }}
          style={{ width: "100%", background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 14, outline: "none" }} />
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 18 }}>
          <button style={btn("subtle")} onClick={() => onClose(null)}>Cancelar</button>
          <button style={btn("ghost", { background: T.acc, color: "#fff", borderColor: T.acc })} onClick={() => onClose(val)}>OK</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmDialog({ dialog, onClose }) {
  const { title, message, confirmLabel, danger } = dialog;
  const accent = danger ? T.red : T.acc;
  return (
    <div onClick={() => onClose(false)}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()}
        style={{ width: "100%", maxWidth: 420, background: T.card, border: `1px solid ${T.bd}`, borderRadius: 14, padding: 22, boxShadow: "0 20px 60px rgba(0,0,0,0.5)" }}>
        <div style={{ display: "flex", gap: 14 }}>
          <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: danger ? T.overloadBg : T.sel, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <TriangleAlert size={20} color={accent} />
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: "2px 0 6px", color: T.txt, fontSize: 16 }}>{title || "Tem certeza?"}</h3>
            {message && <p style={{ margin: 0, color: T.mut, fontSize: 13, lineHeight: 1.5 }}>{message}</p>}
          </div>
        </div>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 20 }}>
          <button style={btn("subtle")} onClick={() => onClose(false)}>Cancelar</button>
          <button style={btn("ghost", { background: accent, color: "#fff", borderColor: accent })} onClick={() => onClose(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ToastStack({ toasts }) {
  return (
    <div style={{ position: "fixed", right: 20, bottom: 20, zIndex: 110, display: "flex", flexDirection: "column", gap: 8 }}>
      {toasts.map((t) => {
        const Icon = t.type === "success" ? CircleCheck : Info;
        const color = t.type === "success" ? T.grn : T.acM;
        return (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, background: T.card, border: `1px solid ${T.bd}`, borderLeft: `3px solid ${color}`, borderRadius: 10, padding: "10px 14px", color: T.txt, fontSize: 13, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", minWidth: 220 }}>
            <Icon size={16} color={color} />
            {t.message}
          </div>
        );
      })}
    </div>
  );
}
