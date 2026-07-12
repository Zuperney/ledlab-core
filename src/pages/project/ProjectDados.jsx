// pages/project/ProjectDados.jsx — aba Dados: telas + ficha do projeto.
import { useState } from "react";
import { Plus, ChevronRight, Copy, Trash2 } from "lucide-react";
import { newScreen } from "../../store/AppContext.jsx";
import { genId } from "../../services/ids.js";
import { STATUS } from "../../components/StatusBadge.jsx";
import { useCabinets } from "../../hooks/useCabinets.js";
import { useIsMobile } from "../../hooks/useIsMobile.js";
import { T } from "../../ui/tokens.js";
import { card, input, label, btn, iconBtn, dangerIconBtn } from "../../ui/styles.js";
import { useConfirm, useToast } from "../../store/UIContext.jsx";
import { DateField } from "../../components/PickerField.jsx";
import Select from "../../components/Select.jsx";

export default function ProjectDados({ project, patch, patchTela }) {
  const { cabs, favCab } = useCabinets();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const toast = useToast();
  const [editId, setEditId] = useState(null); // id da tela expandida (edição inline) ou null
  const [dimMode, setDimMode] = useState("gab"); // entrada da dimensão: "gab" (colunas×linhas) | "m" (metros)

  const telas = project.telas || [];

  const addTela = () => {
    const t = newScreen(favCab, { nome: `Tela ${telas.length + 1}`, cols: 8, rows: 6 });
    patch({ telas: [t, ...telas] }); // nova entra no topo (já expandida, sem precisar rolar)
    setEditId(t.id);
  };
  const dupTela = (t) => patch({ telas: [...telas, { ...t, id: genId("tela"), nome: `${t.nome} (cópia)` }] });
  const delTela = async (t) => {
    if (await confirm({ title: "Excluir tela?", message: `"${t.nome || "tela"}" será removida deste projeto.` })) {
      patch({ telas: telas.filter((x) => x.id !== t.id) });
      toast("Tela excluída");
    }
  };

  const watts = (t) => (t.cols || 0) * (t.rows || 0) * (parseFloat(t.gabinete?.pwrMax) || 0);

  return (
    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "minmax(320px,1fr) minmax(340px,1fr)", gap: 16, alignItems: "start" }}>
      {/* telas */}
      <div style={card({ minWidth: 0 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 8, flexWrap: "wrap" }}>
          <span style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: T.mut }}>Telas — {telas.length}</span>
          <button style={btn("primary", isMobile ? { width: "100%", justifyContent: "center" } : {})} onClick={addTela}><Plus size={15} /> Adicionar tela</button>
        </div>
        {telas.length === 0 && <div style={{ color: T.dim, fontSize: 13 }}>Nenhuma tela ainda.</div>}
        {telas.map((t) => {
          const open = editId === t.id;
          const g = t.gabinete || {};
          const dW = parseFloat(g.dimW) || 0, dH = parseFloat(g.dimH) || 0;
          const larguraM = (t.cols || 0) * dW / 1000, alturaM = (t.rows || 0) * dH / 1000;
          const usaM = dimMode === "m" && dW;
          const setCols = (n) => patchTela(t.id, { cols: Math.max(0, n || 0) });
          const setRows = (n) => patchTela(t.id, { rows: Math.max(0, n || 0) });
          return (
            <div key={t.id} style={{ borderTop: `1px solid ${T.bd}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 0", flexWrap: "wrap" }}>
                <button onClick={() => setEditId(open ? null : t.id)}
                  style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8, textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer", color: "inherit" }}>
                  <ChevronRight size={16} style={{ color: T.mut, flexShrink: 0, transform: open ? "rotate(90deg)" : "none", transition: "transform .12s" }} />
                  <span style={{ minWidth: 0 }}>
                    <div style={{ color: T.txt, fontWeight: 600 }}>{t.nome}</div>
                    <div style={{ color: T.dim, fontSize: 12, fontFamily: "ui-monospace,monospace", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{g.nome} · {t.cols}×{t.rows} · {watts(t)}W</div>
                  </span>
                </button>
                <div style={{ display: "flex", alignItems: "center", gap: 8, width: isMobile ? "100%" : "auto", justifyContent: isMobile ? "space-between" : "flex-end", flexWrap: "wrap" }}>
                  <button style={iconBtn(isMobile ? { width: 40, height: 40 } : {})} title="Duplicar" onClick={() => dupTela(t)}><Copy size={14} /></button>
                  <button style={dangerIconBtn(isMobile ? { width: 40, height: 40 } : {})} title="Excluir" onClick={() => delTela(t)}><Trash2 size={14} /></button>
                </div>
              </div>
              {open && (
                <div style={{ display: "grid", gap: 12, padding: "2px 0 14px 0", minWidth: 0 }}>
                  <Field lbl="Nome da tela" value={t.nome} onChange={(v) => patchTela(t.id, { nome: v })} />
                  <div>
                    <label style={label}>Gabinete</label>
                    <Select value={t.cabId ?? ""} title="Gabinete" onChange={(e) => {
                      const c = cabs.find((x) => String(x.id) === e.target.value);
                      patchTela(t.id, { cabId: c?.id ?? null, gabinete: c ? { nome: c.nome, resX: c.resX, resY: c.resY, dimW: c.dimW, dimH: c.dimH, peso: c.peso, pwrMax: c.pwrMax, pwrMed: c.pwrMed, fp: c.fp, conector: c.conector } : {} });
                    }} style={input()}>
                      {cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                    </Select>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {["gab", "m"].map((k) => {
                      const l = k === "gab" ? "Gabinetes" : "Metros";
                      const active = dimMode === k;
                      const disabled = k === "m" && !dW;
                      return (
                        <button key={k} onClick={() => !disabled && setDimMode(k)}
                          style={{ flex: 1, minWidth: 120, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", border: `1px solid ${active ? T.acc : T.bd}`, background: active ? T.acc : T.card2, color: active ? "#fff" : T.mut, opacity: disabled ? 0.55 : 1 }}>
                          {l}
                        </button>
                      );
                    })}
                  </div>
                  {usaM ? (
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <Field lbl="Largura (m)" type="number" value={larguraM ? larguraM.toFixed(2) : ""} onChange={(v) => setCols(Math.round((parseFloat(v) || 0) * 1000 / dW))} />
                      <Field lbl="Altura (m)" type="number" value={alturaM ? alturaM.toFixed(2) : ""} onChange={(v) => setRows(Math.round((parseFloat(v) || 0) * 1000 / dH))} />
                    </div>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
                      <Field lbl="Colunas" type="number" value={t.cols} onChange={(v) => setCols(parseInt(v) || 0)} />
                      <Field lbl="Linhas" type="number" value={t.rows} onChange={(v) => setRows(parseInt(v) || 0)} />
                    </div>
                  )}
                  <div style={{ color: T.dim, fontSize: 12, marginTop: -4, overflowWrap: "anywhere" }}>
                    {(t.cols || 0)}×{(t.rows || 0)} = {(t.cols || 0) * (t.rows || 0)} gab{dW ? ` · ${larguraM.toFixed(2)} × ${alturaM.toFixed(2)} m` : ""}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ficha */}
      <div style={card({ minWidth: 0 })}>
        <Field lbl="Nome do projeto" req value={project.name} onChange={(v) => patch({ name: v })} />
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr", gap: 12 }}>
          <Field lbl="Cliente" value={project.cliente} onChange={(v) => patch({ cliente: v })} />
          <Field lbl="Local" value={project.local} onChange={(v) => patch({ local: v })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr", gap: 12 }}>
          <Field lbl="Início" type="date" value={project.dataInicio} onChange={(v) => patch({ dataInicio: v })} />
          <Field lbl="Fim" type="date" value={project.dataFim} onChange={(v) => patch({ dataFim: v })} />
          <div>
            <label style={label}>Status</label>
            <Select value={project.status} title="Status do projeto" onChange={(e) => patch({ status: e.target.value, statusManual: true })} style={input()}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </Select>
          </div>
        </div>
        <label style={label}>Observações</label>
        <textarea value={project.obs} onChange={(e) => patch({ obs: e.target.value })} placeholder="Notas técnicas, demandas, contatos…" rows={4} style={input({ resize: "vertical" })} />
      </div>

    </div>
  );
}

function Field({ lbl, value, onChange, type = "text", req }) {
  return (
    <div style={{ marginBottom: 12, minWidth: 0 }}>
      <label style={label}>{lbl}{req ? <span style={{ color: T.red }}> obrigatório</span> : ""}</label>
      {type === "date"
        ? <DateField value={value} onChange={onChange} />
        : <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={input()} />}
    </div>
  );
}
