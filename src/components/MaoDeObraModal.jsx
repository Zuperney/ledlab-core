// components/MaoDeObraModal.jsx — cadastro de mão de obra de UM membro.
// Ajuste rápido de contexto → LightModal (manual §6). Quem marca é o GESTOR:
// é o cadastro dele, na avaliação dele (decisão do dono, 05/08/2026).
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useEquipe } from "../store/EquipeContext.jsx";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import { normalizarHabilidade, habilidadeJaExiste, mensagemErroEquipe } from "../services/avisosCalc.js";
import { T } from "../ui/tokens.js";
import { btn } from "../ui/styles.js";
import LightModal from "./LightModal.jsx";

export default function MaoDeObraModal({ equipe, membro, onClose }) {
  const { marcarHabilidade, adicionarHabilidade, excluirHabilidade, definirFuncao } = useEquipe();
  const confirm = useConfirm();
  const toast = useToast();
  const [funcao, setFuncao] = useState(membro.funcao || "");
  const [nova, setNova] = useState("");
  const [busy, setBusy] = useState(false);

  const marcadas = new Set(membro.habilidades || []);

  const alternar = async (hab) => {
    setBusy(true);
    try { await marcarHabilidade(equipe.id, membro.user_id, hab.id, !marcadas.has(hab.id)); }
    catch (err) { toast(mensagemErroEquipe(err), "info"); }
    setBusy(false);
  };

  const salvarFuncao = async () => {
    if (funcao.trim() === (membro.funcao || "")) return;
    try { await definirFuncao(equipe.id, membro.user_id, funcao); toast("Função salva"); }
    catch (err) { toast(mensagemErroEquipe(err), "info"); }
  };

  const criar = async () => {
    const nome = normalizarHabilidade(nova);
    if (!nome) { toast("Digite o nome da habilidade", "info"); return; }
    if (habilidadeJaExiste(nome, equipe.habilidades)) { toast("Essa habilidade já existe no catálogo", "info"); return; }
    setBusy(true);
    try {
      await adicionarHabilidade(equipe.id, nome, (equipe.habilidades?.length || 0) + 1);
      setNova("");
      toast("Habilidade adicionada");
    } catch (err) { toast(mensagemErroEquipe(err), "info"); }
    setBusy(false);
  };

  const apagar = async (hab) => {
    if (!(await confirm({ title: "Excluir habilidade?", message: `"${hab.nome}" sai do catálogo da equipe e de todo mundo que estava marcado com ela.`, confirmLabel: "Excluir" }))) return;
    try { await excluirHabilidade(hab.id); toast("Habilidade excluída"); }
    catch (err) { toast(mensagemErroEquipe(err), "info"); }
  };

  return (
    <LightModal title={`Mão de obra — ${membro.nome_exibicao}`} onClose={onClose} width={440}>
      <div style={{ display: "grid", gap: 14 }}>
        <div>
          <div style={rotulo}>Função na equipe</div>
          <div style={ajuda}>Como você chama o posto dele. Aparece junto do nome na escala.</div>
          <input value={funcao} onChange={(e) => setFuncao(e.target.value)} onBlur={salvarFuncao}
            placeholder="Ex.: Técnico de LED." style={campo} />
        </div>

        <div>
          <div style={rotulo}>O que ele faz</div>
          <div style={ajuda}>Toque pra marcar. É o que aparece na hora de montar a escala do evento.</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 8 }}>
            {(equipe.habilidades || []).map((h) => {
              const on = marcadas.has(h.id);
              return (
                <button key={h.id} onClick={() => alternar(h)} aria-pressed={on} disabled={busy}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 13px", minHeight: 38, borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600, fontFamily: "inherit", border: `1px solid ${on ? T.acc : T.bd}`, background: on ? T.sel : "transparent", color: on ? T.acM : T.mut }}>
                  {on && <span aria-hidden>✓</span>}{h.nome}
                </button>
              );
            })}
            {!(equipe.habilidades || []).length && <div style={ajuda}>Catálogo vazio — adicione a primeira habilidade abaixo.</div>}
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 12 }}>
          <div style={rotulo}>Catálogo da equipe</div>
          <div style={ajuda}>Vale pra todos os membros. Adicione o que a sua operação usa.</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            <input value={nova} onChange={(e) => setNova(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") criar(); }}
              placeholder="Ex.: Solda de conector." style={{ ...campo, flex: "1 1 160px" }} />
            <button style={btn("ghost")} onClick={criar} disabled={busy}><Plus size={14} /> Adicionar</button>
          </div>
          {(equipe.habilidades || []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
              {equipe.habilidades.map((h) => (
                <button key={h.id} onClick={() => apagar(h)} title={`Excluir "${h.nome}" do catálogo`}
                  style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 9px", borderRadius: 999, cursor: "pointer", fontSize: 11.5, fontFamily: "inherit", border: `1px solid ${T.bd}`, background: "transparent", color: T.dim }}>
                  {h.nome} <Trash2 size={11} />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </LightModal>
  );
}

const rotulo = { color: T.txt, fontWeight: 600, fontSize: 13.5, marginBottom: 2 };
const ajuda = { color: T.dim, fontSize: 12, marginBottom: 4 };
const campo = { width: "100%", background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 16, fontFamily: "inherit" };
