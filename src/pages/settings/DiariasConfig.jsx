// pages/settings/DiariasConfig.jsx — config do módulo Diárias em Configurações:
// parâmetros globais (jornada/janela/tolerância) + CRUD dos tipos de atividade.
import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useActivityTypes } from "../../hooks/useActivityTypes.js";
import { useConfirm, useToast } from "../../store/UIContext.jsx";
import { DEFAULT_WORKLOG_CFG } from "../../services/worklog.js";
import { T } from "../../ui/tokens.js";
import { card, input, btn, iconBtn, dangerIconBtn, label as lbl } from "../../ui/styles.js";
import Drawer from "../../components/Drawer.jsx";

export default function DiariasConfig() {
  const { prefs, setPrefs } = useLedLabContext();
  const { activityTypes, addType, updateType, removeType } = useActivityTypes();
  const confirm = useConfirm();
  const toast = useToast();
  const [edit, setEdit] = useState(null); // tipo em edição (form) ou null

  const cfg = { ...DEFAULT_WORKLOG_CFG, ...(prefs.worklog || {}) };
  const setCfg = (partial) => setPrefs({ ...prefs, worklog: { ...cfg, ...partial } });
  const num = (v, min) => Math.max(min, parseInt(v) || min);

  const fixo = prefs.fixo || { valor: 0, cliente: "" };
  const setFixo = (partial) => setPrefs({ ...prefs, fixo: { ...fixo, ...partial } });
  const emit = prefs.emitente || { nomeFantasia: "", razaoSocial: "", cnpj: "", endereco: "" };
  const setEmit = (partial) => setPrefs({ ...prefs, emitente: { ...emit, ...partial } });

  const openNew = () => setEdit({ id: null, nome: "", cor: "#7c3aed", valorBase: "", geraHoraExtra: true, podeSegundoCache: true, ativo: true });
  const save = () => {
    if (!edit.nome.trim()) { toast("Dê um nome ao tipo", "info"); return; }
    const data = { nome: edit.nome.trim(), cor: edit.cor, valorBase: Number(edit.valorBase) || 0, geraHoraExtra: edit.geraHoraExtra, podeSegundoCache: edit.podeSegundoCache, ativo: edit.ativo };
    if (edit.id) updateType({ ...data, id: edit.id }); else addType(data);
    setEdit(null);
  };
  const del = async (t) => { if (await confirm({ title: "Excluir tipo?", message: `"${t.nome}" será removido.` })) { removeType(t.id); toast("Tipo excluído"); } };

  return (
    <>
      <div style={card({ maxWidth: 640, marginBottom: 16 })}>
        <div style={{ color: T.txt, fontWeight: 600 }}>Cachês — parâmetros de cálculo</div>
        <div style={{ color: T.dim, fontSize: 13, margin: "2px 0 12px" }}>Franquia de horas e tolerância que valem para todos os tipos (ver a lógica no módulo Cachês).</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
          <div><div style={lbl}>Jornada (horas)</div><input type="number" value={cfg.jornadaH} onChange={(e) => setCfg({ jornadaH: num(e.target.value, 1) })} style={input()} /></div>
          <div><div style={lbl}>Janela hora extra (h)</div><input type="number" value={cfg.janelaExtraH} onChange={(e) => setCfg({ janelaExtraH: num(e.target.value, 0) })} style={input()} /></div>
          <div><div style={lbl}>Tolerância da fração (min)</div><input type="number" value={cfg.toleranciaExtraMin} onChange={(e) => setCfg({ toleranciaExtraMin: num(e.target.value, 0) })} style={input()} /></div>
        </div>
        <div style={{ color: T.dim, fontSize: 12, marginTop: 10 }}>Ex.: cachê ÷ jornada = valor da hora extra; a fração só vira 1 hora cheia passando da tolerância.</div>
      </div>

      <div style={card({ maxWidth: 640, marginBottom: 16 })}>
        <div style={{ color: T.txt, fontWeight: 600 }}>Fixo mensal (opcional)</div>
        <div style={{ color: T.dim, fontSize: 13, margin: "2px 0 12px" }}>Valor fixo por mês de um cliente prioritário (ex.: acordo de prioridade), somado no Financeiro além dos cachês. Deixe 0 se não usa.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><div style={lbl}>Valor por mês (R$)</div><input type="number" value={fixo.valor} onChange={(e) => setFixo({ valor: Math.max(0, parseInt(e.target.value) || 0) })} placeholder="Ex.: 6000" style={input()} /></div>
          <div><div style={lbl}>Cliente do fixo</div><input value={fixo.cliente} onChange={(e) => setFixo({ cliente: e.target.value })} placeholder="Ex.: Mega Led" style={input()} /></div>
        </div>
      </div>

      <div style={card({ maxWidth: 640, marginBottom: 16 })}>
        <div style={{ color: T.txt, fontWeight: 600 }}>Dados do recibo (emitente)</div>
        <div style={{ color: T.dim, fontSize: 13, margin: "2px 0 12px" }}>Aparecem no cabeçalho e na assinatura do recibo de mão de obra. Opcional — preencha se for entregar recibo formal.</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div><div style={lbl}>Nome fantasia</div><input value={emit.nomeFantasia} onChange={(e) => setEmit({ nomeFantasia: e.target.value })} placeholder="Ex.: LedLab" style={input()} /></div>
          <div><div style={lbl}>Razão social / nome fiscal</div><input value={emit.razaoSocial} onChange={(e) => setEmit({ razaoSocial: e.target.value })} placeholder="Ex.: Fulano ME" style={input()} /></div>
          <div><div style={lbl}>CNPJ / CPF</div><input value={emit.cnpj} onChange={(e) => setEmit({ cnpj: e.target.value })} placeholder="00.000.000/0001-00" style={input()} /></div>
          <div><div style={lbl}>Endereço</div><input value={emit.endereco} onChange={(e) => setEmit({ endereco: e.target.value })} placeholder="Rua, nº, cidade/UF" style={input()} /></div>
        </div>
      </div>

      <div style={card({ maxWidth: 640 })}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <div><div style={{ color: T.txt, fontWeight: 600 }}>Tipos de atividade</div><div style={{ color: T.dim, fontSize: 13 }}>Nome, cor, cachê base e regras de cobrança.</div></div>
          <button style={btn("primary")} onClick={openNew}><Plus size={15} /> Novo tipo</button>
        </div>
        {activityTypes.map((t) => (
          <div key={t.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderTop: `1px solid ${T.bd}` }}>
            <span style={{ width: 14, height: 14, borderRadius: 4, background: t.cor, flexShrink: 0 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ color: T.txt, fontWeight: 600 }}>{t.nome} {!t.ativo && <span style={{ color: T.dim, fontWeight: 400, fontSize: 12 }}>(inativo)</span>}</div>
              <div style={{ color: T.dim, fontSize: 12 }}>
                R$ {(t.valorBase || 0).toLocaleString("pt-BR")}
                {t.geraHoraExtra ? " · hora extra" : " · flat"}
                {t.podeSegundoCache ? " · empilha" : " · não empilha"}
              </div>
            </div>
            <button style={iconBtn()} title="Editar" onClick={() => setEdit({ ...t, valorBase: t.valorBase })}><Pencil size={14} /></button>
            <button style={dangerIconBtn()} title="Excluir" onClick={() => del(t)}><Trash2 size={14} /></button>
          </div>
        ))}
      </div>

      <Drawer open={!!edit} title={edit?.id ? "Editar tipo" : "Novo tipo"} onClose={() => setEdit(null)}
        footer={<><button style={btn("subtle")} onClick={() => setEdit(null)}>Cancelar</button><button style={btn("primary")} onClick={save}>Salvar</button></>}>
        {edit && (
          <div style={{ display: "grid", gap: 14 }}>
            <div><div style={lbl}>Nome</div><input value={edit.nome} onChange={(e) => setEdit({ ...edit, nome: e.target.value })} placeholder="Ex.: Montagem" style={input()} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: 12, alignItems: "end" }}>
              <div><div style={lbl}>Cor</div><input type="color" value={edit.cor} onChange={(e) => setEdit({ ...edit, cor: e.target.value })} style={{ width: 48, height: 40, background: "none", border: `1px solid ${T.bd}`, borderRadius: 8, cursor: "pointer" }} /></div>
              <div><div style={lbl}>Cachê base (R$)</div><input type="number" value={edit.valorBase} onChange={(e) => setEdit({ ...edit, valorBase: e.target.value })} placeholder="Ex.: 350" style={input()} /></div>
            </div>
            <Toggle on={edit.geraHoraExtra} onClick={() => setEdit({ ...edit, geraHoraExtra: !edit.geraHoraExtra })}
              titulo="Gera hora extra" desc="Passou da jornada, cobra extra (senão é flat, ex.: deslocamento)." />
            <Toggle on={edit.podeSegundoCache} onClick={() => setEdit({ ...edit, podeSegundoCache: !edit.podeSegundoCache })}
              titulo="Empilha no dia" desc="Pode ser um 2º cachê no mesmo dia (deslocamento = não)." />
            <Toggle on={edit.ativo} onClick={() => setEdit({ ...edit, ativo: !edit.ativo })}
              titulo="Ativo" desc="Aparece na hora de lançar uma atividade." />
          </div>
        )}
      </Drawer>
    </>
  );
}

function Toggle({ on, onClick, titulo, desc }) {
  return (
    <button onClick={onClick} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, textAlign: "left", background: T.card2, border: `1px solid ${on ? T.acc : T.bd}`, borderRadius: 8, padding: "10px 12px", cursor: "pointer" }}>
      <span><span style={{ color: T.txt, fontWeight: 600, fontSize: 14 }}>{titulo}</span><br /><span style={{ color: T.dim, fontSize: 12 }}>{desc}</span></span>
      <span style={{ flexShrink: 0, fontSize: 12, fontWeight: 700, color: on ? T.acM : T.mut }}>{on ? "SIM" : "NÃO"}</span>
    </button>
  );
}
