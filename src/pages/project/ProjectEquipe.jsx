// pages/project/ProjectEquipe.jsx — aba Equipe do projeto (visão do GESTOR):
// publica o evento na agenda da equipe e escala quem trabalha.
// Sobe só o mínimo do Project (nome, cliente, local, datas, obs) — nada
// financeiro/técnico. O técnico recebe o evento read-only na Agenda dele.
import { useState, useMemo } from "react";
import { Megaphone, Users, CalendarDays, MapPin } from "lucide-react";
import { useEquipe } from "../../store/EquipeContext.jsx";
import { useToast, useConfirm } from "../../store/UIContext.jsx";
import { mensagemErroEquipe } from "../../services/avisosCalc.js";
import { formatRange } from "../../services/dates.js";
import { T } from "../../ui/tokens.js";
import { card, btn } from "../../ui/styles.js";
import Select from "../../components/Select.jsx";
import StatusPill from "../../components/StatusPill.jsx";
import HelpTip from "../../components/HelpTip.jsx";
import Placeholder from "../../components/Placeholder.jsx";

export default function ProjectEquipe({ project }) {
  const { gerencio, publicacaoDoProjeto, publicarEvento, removerPublicacao, status } = useEquipe();
  const toast = useToast();
  const confirm = useConfirm();

  // sem equipe selecionada cai na primeira (sem effect — derivação pura)
  const [equipeId, setEquipeId] = useState("");
  const equipe = gerencio.find((e) => e.id === equipeId) || gerencio[0];

  const pub = publicacaoDoProjeto[project.id]; // publicação existente (ou undefined)
  const publicada = !!pub && pub.equipe_id === equipe?.id;

  // escala em edição local; quando a publicação muda (refresh/publicar), re-parte
  // dela — ajuste DURANTE o render (padrão do App.jsx), não em effect
  const [escalados, setEscalados] = useState(() => new Set(pub?.escalados || []));
  const pubKey = `${pub?.id || ""}:${(pub?.escalados || []).join(",")}`;
  const [prevPubKey, setPrevPubKey] = useState(pubKey);
  if (prevPubKey !== pubKey) {
    setPrevPubKey(pubKey);
    setEscalados(new Set(pub?.escalados || []));
  }
  const [busy, setBusy] = useState(false);

  const escalaDiferente = useMemo(() => {
    const antes = new Set(pub?.escalados || []);
    if (antes.size !== escalados.size) return true;
    return [...escalados].some((u) => !antes.has(u));
  }, [pub, escalados]);
  // dados locais mudaram depois da última publicação?
  const dadosDesatualizados = publicada && project.updatedAt > Date.parse(pub.atualizado_em);

  if (!gerencio.length) {
    return <Placeholder icon={Users} title="Sem equipe pra escalar" description="Monte sua equipe em Configurações → Equipe & avisos e ela aparece aqui." />;
  }

  const publicar = async () => {
    if (!project.dataInicio) { toast("Defina a data do evento na aba Dados antes de publicar", "info"); return; }
    setBusy(true);
    try {
      await publicarEvento(equipe.id, project, [...escalados]);
      toast(publicada ? "Publicação atualizada" : "Evento publicado na agenda da equipe");
    } catch (err) { toast(mensagemErroEquipe(err), "info"); }
    setBusy(false);
  };
  const remover = async () => {
    if (!(await confirm({ title: "Remover publicação?", message: `"${project.name || "Sem nome"}" sai da agenda da equipe — os escalados deixam de ver o evento. Seu projeto local segue intacto.`, confirmLabel: "Remover" }))) return;
    setBusy(true);
    try { await removerPublicacao(equipe.id, project.id); toast("Publicação removida"); }
    catch (err) { toast(mensagemErroEquipe(err), "info"); }
    setBusy(false);
  };
  const alternar = (userId) => {
    setEscalados((prev) => {
      const s = new Set(prev);
      if (s.has(userId)) s.delete(userId); else s.add(userId);
      return s;
    });
  };

  const precisaPublicar = !publicada || escalaDiferente || dadosDesatualizados;

  return (
    <div>
      {/* F2 · ferramentas: contexto (equipe) ··· primária à direita */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
        {gerencio.length > 1 ? (
          <Select value={equipe?.id || ""} title="Equipe" onChange={(e) => setEquipeId(e.target.value)} style={{ width: "auto", minWidth: 180 }}>
            {gerencio.map((e) => <option key={e.id} value={e.id}>{e.nome}</option>)}
          </Select>
        ) : (
          <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: T.mut, fontSize: 13, fontWeight: 600 }}>
            <Users size={15} style={{ color: T.acM }} /> {equipe?.nome}
          </span>
        )}
        <button style={btn("ghost", { visibility: publicada ? "visible" : "hidden" })} onClick={remover} disabled={busy}>
          Remover publicação
        </button>
        <div style={{ flex: 1 }} />
        <button style={btn("primary")} onClick={publicar} disabled={busy || !precisaPublicar}>
          <Megaphone size={15} /> {busy ? "Publicando…" : publicada ? "Atualizar publicação" : "Publicar na agenda da equipe"}
        </button>
      </div>

      {/* F3 · contexto: chips passivos + pill só com problema + didática no "?" */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 14, color: T.dim, fontSize: 12.5 }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><CalendarDays size={13} /> {formatRange(project.dataInicio, project.dataFim)}</span>
        {project.local && <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}><MapPin size={13} /> {project.local}</span>}
        <span>· {escalados.size} escalado{escalados.size === 1 ? "" : "s"}</span>
        {publicada && !precisaPublicar && <span style={{ color: T.mut }}>· publicado</span>}
        {dadosDesatualizados && <StatusPill color={T.amb} label="Publicação desatualizada" />}
        {publicada && escalaDiferente && !dadosDesatualizados && <StatusPill color={T.amb} label="Escala alterada — publique" />}
        {status === "error" && <StatusPill color={T.red} label="Sem conexão" />}
        <HelpTip title="Como funciona a escala">
          Marque quem trabalha este evento e publique. Cada escalado vê o evento
          na Agenda dele (somente leitura) e recebe um aviso. Sobe só o básico —
          nome, cliente, local, datas e observação; valores e projeto técnico
          ficam com você. Editou o projeto ou a escala? Publique de novo.
        </HelpTip>
      </div>

      {/* F4 · conteúdo: a escala (lista de membros com toggle) */}
      <div style={card({ padding: 0, overflow: "hidden" })}>
        <div style={{ padding: "10px 16px", color: T.mut, fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: `1px solid ${T.bd}` }}>
          Escala — {equipe?.nome}
        </div>
        {(equipe?.membros || []).length === 0 && (
          <div style={{ padding: 16, color: T.dim, fontSize: 13 }}>
            Ninguém entrou na equipe ainda — compartilhe o código de convite (Configurações → Equipe &amp; avisos).
          </div>
        )}
        {(equipe?.membros || []).map((m) => {
          const on = escalados.has(m.user_id);
          return (
            <button key={m.user_id} onClick={() => alternar(m.user_id)} aria-pressed={on}
              style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "12px 16px", minHeight: 44, background: on ? T.sel : "transparent", border: "none", borderBottom: `1px solid ${T.bd}`, cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
              <span aria-hidden style={{ width: 18, height: 18, borderRadius: 5, flexShrink: 0, border: `2px solid ${on ? T.acc : T.bd}`, background: on ? T.acc : "transparent", display: "inline-flex", alignItems: "center", justifyContent: "center", color: T.accInk, fontSize: 12, fontWeight: 800 }}>{on ? "✓" : ""}</span>
              <span style={{ color: T.txt, fontSize: 14, fontWeight: on ? 600 : 500, flex: 1, minWidth: 0 }}>{m.nome_exibicao}</span>
              {m.funcao && <span style={{ color: T.dim, fontSize: 12 }}>{m.funcao}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
