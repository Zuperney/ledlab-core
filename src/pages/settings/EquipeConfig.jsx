// pages/settings/EquipeConfig.jsx — conteúdo da Section "Equipe & avisos".
// Gestor: cria a equipe, compartilha o código de convite, gerencia membros.
// Técnico: entra pelo código com um nome de exibição (o e-mail nunca aparece
// pra ninguém — LGPD/minimização, ver supabase/migrations/01_equipes.sql).
import { useState, useEffect } from "react";
import { Copy, RotateCcw, Trash2, Users, LogOut, UserMinus, BellRing } from "lucide-react";
import { useAuth } from "../../store/AuthContext.jsx";
import { useEquipe } from "../../store/EquipeContext.jsx";
import { useConfirm, useToast } from "../../store/UIContext.jsx";
import { codigoConviteValido, mensagemErroEquipe } from "../../services/avisosCalc.js";
import { suportePush, assinaturaAtiva, ativarAvisos, desativarAvisos } from "../../services/pushAssinatura.js";
import { PrefToggle } from "../../components/CablingPrefs.jsx";
import { T } from "../../ui/tokens.js";
import { btn } from "../../ui/styles.js";

export default function EquipeConfig() {
  const { user } = useAuth();
  const { gerencio, participo, status } = useEquipe();

  if (!user) {
    return <div style={desc}>Conecte-se em <b>Conta &amp; sincronização</b> (acima) pra montar sua equipe ou entrar numa com código de convite.</div>;
  }
  return (
    <div style={{ display: "grid", gap: 4 }}>
      {status === "error" && equipesVazias(gerencio, participo) && (
        <div style={{ ...desc, color: T.red }}>Sem conexão com o servidor — mostrando a última foto salva.</div>
      )}
      {gerencio.map((e) => <EquipeGerencio key={e.id} equipe={e} />)}
      {participo.map((e) => <EquipeParticipo key={e.id} equipe={e} />)}
      {gerencio.length === 0 && <NovaEquipe />}
      {participo.length === 0 && <EntrarComCodigo temAlgo={gerencio.length > 0} />}
      {(gerencio.length > 0 || participo.length > 0) && <AvisosCelular />}
    </div>
  );
}

// ── avisos no celular (Web Push) — opt-in por aparelho ──
function AvisosCelular() {
  const { user } = useAuth();
  const toast = useToast();
  const [ativo, setAtivo] = useState(false);
  const [busy, setBusy] = useState(false);
  const suporte = suportePush();

  useEffect(() => { assinaturaAtiva().then(setAtivo); }, []);

  const alternar = async () => {
    setBusy(true);
    try {
      if (ativo) { await desativarAvisos(); setAtivo(false); toast("Avisos desligados neste aparelho"); }
      else { await ativarAvisos(user.id); setAtivo(true); toast("Avisos ligados neste aparelho"); }
    } catch (err) { toast(err?.message || "Falha ao configurar os avisos", "info"); }
    setBusy(false);
  };

  return (
    <div style={{ ...bloco, borderTop: `1px solid ${T.bd}`, paddingTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <BellRing size={15} style={{ color: T.acM, flexShrink: 0 }} />
        <div style={titulo}>Avisos no celular</div>
      </div>
      <div style={desc}>Escalação, mudança de evento, convocação e lembrete chegam como aviso do sistema — mesmo com o app fechado.</div>
      <div style={{ marginTop: 8 }}>
        {!import.meta.env.PROD ? (
          <div style={desc}>Disponível só no app publicado (o service worker não roda em desenvolvimento).</div>
        ) : suporte === "ios-nao-instalado" ? (
          <div style={desc}>No iPhone/iPad: abra no Safari, toque em <b>Compartilhar → Adicionar à Tela de Início</b> e ligue os avisos por lá (iOS 16.4+).</div>
        ) : suporte === "negado" ? (
          <div style={desc}>O navegador está bloqueando avisos deste site — libere nas permissões e tente de novo.</div>
        ) : suporte === "sem-suporte" ? (
          <div style={desc}>Este navegador não tem suporte a avisos. No celular, instale o app na tela de início.</div>
        ) : (
          <PrefToggle on={ativo} onClick={busy ? undefined : alternar}
            titulo="Avisar neste aparelho" desc="A permissão é do navegador — dá pra desligar quando quiser." />
        )}
      </div>
    </div>
  );
}

const equipesVazias = (a, b) => a.length === 0 && b.length === 0;

// ── gestor: a equipe que eu gerencio ──
function EquipeGerencio({ equipe }) {
  const { user } = useAuth();
  const { removerMembro, regerarCodigo, excluirEquipe } = useEquipe();
  const confirm = useConfirm();
  const toast = useToast();

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(equipe.codigo);
      toast("Código copiado");
    } catch { toast("Não deu pra copiar — anote o código", "info"); }
  };
  const regerar = async () => {
    if (!(await confirm({ title: "Gerar novo código?", message: `O código atual (${equipe.codigo}) deixa de funcionar. Quem já entrou continua na equipe.`, confirmLabel: "Gerar novo" }))) return;
    try { await regerarCodigo(equipe.id); toast("Novo código gerado"); }
    catch (err) { toast(mensagemErroEquipe(err), "info"); }
  };
  const excluir = async () => {
    if (!(await confirm({ title: "Excluir equipe?", message: `"${equipe.nome}" será desfeita: todos os membros perdem o vínculo e a agenda escalada. Não pode ser desfeito.`, confirmLabel: "Excluir" }))) return;
    try { await excluirEquipe(equipe.id); toast("Equipe excluída"); }
    catch (err) { toast(mensagemErroEquipe(err), "info"); }
  };
  const remover = async (m) => {
    if (!(await confirm({ title: "Remover da equipe?", message: `${m.nome_exibicao} sai da equipe e deixa de ver os eventos escalados.`, confirmLabel: "Remover" }))) return;
    try { await removerMembro(equipe.id, m.user_id); toast("Membro removido"); }
    catch (err) { toast(mensagemErroEquipe(err), "info"); }
  };

  return (
    <div style={bloco}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Users size={16} style={{ color: T.acM, flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={titulo}>{equipe.nome}</div>
          <div style={desc}>Você é o gestor · {equipe.membros.length} membro{equipe.membros.length === 1 ? "" : "s"}</div>
        </div>
        <button style={btn("danger")} onClick={excluir} title="Excluir equipe"><Trash2 size={14} /></button>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
        <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 15, letterSpacing: "0.08em", color: T.txt, background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "7px 12px" }}>{equipe.codigo || "······"}</span>
        <button style={btn("ghost")} onClick={copiar}><Copy size={14} /> Copiar</button>
        <button style={btn("ghost")} onClick={regerar}><RotateCcw size={14} /> Novo código</button>
      </div>
      <div style={desc}>Mande o código pro técnico (WhatsApp serve). Ele conecta o e-mail dele no app e entra por aqui.</div>

      {equipe.membros.length > 0 && (
        <div style={{ marginTop: 8 }}>
          {equipe.membros.map((m) => (
            <div key={m.user_id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 0", borderTop: `1px solid ${T.bd}` }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ color: T.txt, fontSize: 14 }}>{m.nome_exibicao}</span>
                {m.user_id === user?.id && <span style={{ color: T.dim, fontSize: 12 }}> · você</span>}
                {m.funcao && <span style={{ color: T.dim, fontSize: 12 }}> · {m.funcao}</span>}
              </div>
              {m.user_id !== user?.id && (
                <button style={btn("ghost")} onClick={() => remover(m)} title="Remover da equipe"><UserMinus size={14} /></button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── técnico: equipe em que eu participo ──
function EquipeParticipo({ equipe }) {
  const { user } = useAuth();
  const { sairDaEquipe } = useEquipe();
  const confirm = useConfirm();
  const toast = useToast();
  const eu = equipe.membros.find((m) => m.user_id === user?.id);

  const sair = async () => {
    if (!(await confirm({ title: "Sair da equipe?", message: `Você sai de "${equipe.nome}" e deixa de ver os eventos em que foi escalado. O gestor pode te convidar de novo.`, confirmLabel: "Sair" }))) return;
    try { await sairDaEquipe(equipe.id); toast("Você saiu da equipe"); }
    catch (err) { toast(mensagemErroEquipe(err), "info"); }
  };

  return (
    <div style={bloco}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Users size={16} style={{ color: T.acM, flexShrink: 0 }} />
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={titulo}>{equipe.nome}</div>
          <div style={desc}>Você participa como <b>{eu?.nome_exibicao || "—"}</b> · {equipe.membros.length} membro{equipe.membros.length === 1 ? "" : "s"}</div>
        </div>
        <button style={btn("ghost")} onClick={sair}><LogOut size={14} /> Sair da equipe</button>
      </div>
    </div>
  );
}

// ── formar equipe nova (gestor) ──
function NovaEquipe() {
  const { criarEquipe } = useEquipe();
  const toast = useToast();
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  const criar = async () => {
    const n = nome.trim();
    if (!n) { toast("Dê um nome pra equipe", "info"); return; }
    setBusy(true);
    try { await criarEquipe(n); toast("Equipe montada — compartilhe o código"); setNome(""); }
    catch (err) { toast(mensagemErroEquipe(err), "info"); }
    setBusy(false);
  };

  return (
    <div style={bloco}>
      <div style={titulo}>Nova equipe</div>
      <div style={desc}>Monte sua equipe e escale os técnicos nos eventos. Cada um entra com o código de convite.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: LedLab Rental." style={{ ...inp, flex: "1 1 180px" }} />
        {/* ghost de propósito: "Entrar na equipe" (logo abaixo) é a primária
            desta superfície — R1, uma primária por vez */}
        <button style={btn("ghost")} onClick={criar} disabled={busy}>{busy ? "Montando…" : "Montar equipe"}</button>
      </div>
    </div>
  );
}

// ── entrar numa equipe (técnico) ──
function EntrarComCodigo({ temAlgo }) {
  const { entrarNaEquipe } = useEquipe();
  const toast = useToast();
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [busy, setBusy] = useState(false);

  const entrar = async () => {
    if (!codigoConviteValido(codigo)) { toast("Código incompleto — confira com quem te convidou", "info"); return; }
    if (!nome.trim()) { toast("Digite seu nome antes de entrar", "info"); return; }
    setBusy(true);
    try {
      const eq = await entrarNaEquipe(codigo, nome.trim());
      toast(`Você entrou na equipe ${eq?.nome || ""}`.trim());
      setCodigo(""); setNome("");
    } catch (err) { toast(mensagemErroEquipe(err), "info"); }
    setBusy(false);
  };

  return (
    <div style={{ ...bloco, borderTop: temAlgo ? `1px solid ${T.bd}` : "none", paddingTop: temAlgo ? 14 : 0 }}>
      <div style={titulo}>Entrar numa equipe</div>
      <div style={desc}>Recebeu um código de convite? Seu nome fica visível pro gestor e colegas da equipe — o e-mail, nunca.</div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
        <input value={codigo} onChange={(e) => setCodigo(e.target.value.toUpperCase())} placeholder="Ex.: LED-AB2CD3." style={{ ...inp, flex: "1 1 140px", fontFamily: "ui-monospace, monospace", letterSpacing: "0.08em" }} />
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Ney." style={{ ...inp, flex: "1 1 140px" }} />
        <button style={btn("primary")} onClick={entrar} disabled={busy}>{busy ? "Entrando…" : "Entrar na equipe"}</button>
      </div>
    </div>
  );
}

const bloco = { padding: "10px 0" };
const titulo = { color: T.txt, fontWeight: 600, fontSize: 14 };
const desc = { color: T.dim, fontSize: 12.5, marginTop: 2 };
const inp = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 16 };
