// pages/project/ProjectDados.jsx — aba Dados: telas + ficha do projeto.
import { useState } from "react";
import { Plus, Pencil, Copy, Trash2 } from "lucide-react";
import { useLedLabContext, newScreen } from "../../store/AppContext.jsx";
import { genId } from "../../services/ids.js";
import { STATUS } from "../../components/StatusBadge.jsx";
import { T } from "../../ui/tokens.js";
import { card, input, label, btn, iconBtn, dangerIconBtn } from "../../ui/styles.js";
import { useConfirm, useToast } from "../../store/UIContext.jsx";
import Drawer from "../../components/Drawer.jsx";

export default function ProjectDados({ project, patch, patchTela }) {
  const { cabs, prefs } = useLedLabContext();
  const confirm = useConfirm();
  const toast = useToast();
  const [edit, setEdit] = useState(null); // tela em edição

  const telas = project.telas || [];
  const favCab = cabs.find((c) => c.id === prefs.favCabId) || cabs[0];

  const addTela = () => {
    const t = newScreen(favCab, { nome: `Tela ${telas.length + 1}`, cols: 8, rows: 6 });
    patch({ telas: [...telas, t] });
    setEdit(t);
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
    <div style={{ display: "grid", gridTemplateColumns: "minmax(320px,1fr) minmax(340px,1fr)", gap: 16, alignItems: "start" }}>
      {/* telas */}
      <div style={card()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <span style={{ textTransform: "uppercase", fontSize: 11, letterSpacing: "0.06em", color: T.mut }}>Telas — {telas.length}</span>
          <button style={btn("primary")} onClick={addTela}><Plus size={15} /> Adicionar tela</button>
        </div>
        {telas.length === 0 && <div style={{ color: T.dim, fontSize: 13 }}>Nenhuma tela ainda.</div>}
        {telas.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderTop: `1px solid ${T.bd}` }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: T.txt, fontWeight: 600 }}>{t.nome}</div>
              <div style={{ color: T.dim, fontSize: 12, fontFamily: "ui-monospace,monospace" }}>{t.gabinete?.nome} · {t.cols}×{t.rows} = {t.cols * t.rows} gab · {watts(t).toLocaleString()} W</div>
            </div>
            <button style={iconBtn()} onClick={() => setEdit(t)}><Pencil size={14} /></button>
            <button style={iconBtn()} title="Duplicar" onClick={() => dupTela(t)}><Copy size={14} /></button>
            <button style={dangerIconBtn()} title="Excluir" onClick={() => delTela(t)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      {/* ficha */}
      <div style={card()}>
        <Field lbl="Nome do projeto" req value={project.name} onChange={(v) => patch({ name: v })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field lbl="Cliente" value={project.cliente} onChange={(v) => patch({ cliente: v })} />
          <Field lbl="Local" value={project.local} onChange={(v) => patch({ local: v })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <Field lbl="Início" type="date" value={project.dataInicio} onChange={(v) => patch({ dataInicio: v })} />
          <Field lbl="Fim" type="date" value={project.dataFim} onChange={(v) => patch({ dataFim: v })} />
          <div>
            <label style={label}>Status</label>
            <select value={project.status} onChange={(e) => patch({ status: e.target.value, statusManual: true })} style={input()}>
              {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.l}</option>)}
            </select>
          </div>
        </div>
        <label style={label}>Observações</label>
        <textarea value={project.obs} onChange={(e) => patch({ obs: e.target.value })} placeholder="Notas técnicas, demandas, contatos…" rows={4} style={input({ resize: "vertical" })} />
      </div>

      <Drawer open={!!edit} title="Editar tela" onClose={() => setEdit(null)} footer={<button style={btn("primary")} onClick={() => setEdit(null)}>Concluir</button>}>
        {edit && (
          <div style={{ display: "grid", gap: 12 }}>
            <Field lbl="Nome da tela" value={edit.nome} onChange={(v) => { patchTela(edit.id, { nome: v }); setEdit({ ...edit, nome: v }); }} />
            <div>
              <label style={label}>Gabinete</label>
              <select value={edit.cabId ?? ""} onChange={(e) => {
                const c = cabs.find((x) => String(x.id) === e.target.value);
                const partial = { cabId: c?.id ?? null, gabinete: c ? { nome: c.nome, resX: c.resX, resY: c.resY, dimW: c.dimW, dimH: c.dimH, peso: c.peso, pwrMax: c.pwrMax, pwrMed: c.pwrMed, pwrBlack: c.pwrBlack, fp: c.fp, ip: c.ip, conector: c.conector } : edit.gabinete };
                patchTela(edit.id, partial); setEdit({ ...edit, ...partial });
              }} style={input()}>
                {cabs.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
              </select>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field lbl="Colunas" type="number" value={edit.cols} onChange={(v) => { const n = parseInt(v) || 0; patchTela(edit.id, { cols: n }); setEdit({ ...edit, cols: n }); }} />
              <Field lbl="Linhas" type="number" value={edit.rows} onChange={(v) => { const n = parseInt(v) || 0; patchTela(edit.id, { rows: n }); setEdit({ ...edit, rows: n }); }} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function Field({ lbl, value, onChange, type = "text", req }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={label}>{lbl}{req ? <span style={{ color: T.red }}> obrigatório</span> : ""}</label>
      <input type={type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={input()} />
    </div>
  );
}
