// pages/Settings.jsx — configurações globais em categorias colapsáveis:
// cabeamento, cachês, test card, dados/backup e manutenção. Centraliza export/import
// (backup, projetos e gabinetes) que antes ficavam espalhados nas abas.
import { useRef, useState, useEffect } from "react";
import { Download, Upload, Eraser, RotateCcw, Trash2, ChevronDown, ChevronUp, Zap, Receipt, Monitor, Database, TriangleAlert, Palette, ShieldCheck, ShieldAlert, Cloud, LayoutDashboard, Cable, EyeOff } from "lucide-react";
import { useLedLabContext, KEYS, DEFAULT_PREFS, newProject } from "../store/AppContext.jsx";
import { VERSION } from "../nav.js";
import { useAuth } from "../store/AuthContext.jsx";
import { useSync } from "../store/SyncContext.jsx";
import { genId, genNumericId } from "../services/ids.js";
import { isPersisted, requestPersist, storageUsage } from "../services/storage.js";
import { VOLT } from "../services/electricalCalc.js";
import { PRESET_LABELS } from "../services/testcardDraw.js";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import { SEED_CABINETS } from "../data/mockCabinets.js";
import Select from "../components/Select.jsx";
import { NumeracaoPrefs, MapaCabosPrefs, CoresPrefs, PrefToggle } from "../components/CablingPrefs.jsx";
import { SEED_PROJECTS } from "../data/mockProjects.js";
import { SEED_ACTIVITY_TYPES } from "../data/seedActivityTypes.js";
import { T } from "../ui/tokens.js";
import { card, btn } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import DiariasConfig from "./settings/DiariasConfig.jsx";
import { fileName } from "../services/filenames.js";

const download = (name, obj) => {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
};

// `embedded`: renderizado dentro do Drawer de Configurações (o Drawer já dá o título
// e o X), então esconde o SectionHeader próprio pra não duplicar o cabeçalho.
export default function Settings({ embedded = false }) {
  const { cabs, setCabs, projects, setProjects, prefs, setPrefs, tcPresets, setTcPresets, setWorklog, setActivityTypes, setDespesas, exportBackup } = useLedLabContext();
  const confirm = useConfirm();
  const toast = useToast();
  const backupRef = useRef(null);
  const projRef = useRef(null);
  const cabRef = useRef(null);

  // ── Backup completo ──
  const onExportBackup = () => { exportBackup(); toast("Backup exportado"); };
  const importBackup = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      let d;
      try { d = JSON.parse(reader.result); } catch { toast("Arquivo inválido", "info"); return; }
      if (!d || typeof d !== "object" || (d.schema && !String(d.schema).startsWith("ledlab.backup"))) { toast("Este arquivo não é um backup do LedLab", "info"); return; }
      const campos = ["cabs", "projects", "prefs", "tcPresets", "worklog", "activityTypes"];
      if (!campos.some((k) => d[k] != null)) { toast("Backup vazio ou não reconhecido", "info"); return; }
      if (!(await confirm({ title: "Importar backup?", message: "Isso substitui seus dados atuais (gabinetes, projetos, cachês e preferências) pelos do arquivo. Não pode ser desfeito.", confirmLabel: "Importar" }))) return;
      if (Array.isArray(d.cabs)) setCabs(d.cabs);
      if (Array.isArray(d.projects)) setProjects(d.projects);
      if (d.prefs) setPrefs({ ...DEFAULT_PREFS, ...d.prefs });
      if (Array.isArray(d.tcPresets)) setTcPresets(d.tcPresets);
      if (Array.isArray(d.worklog)) setWorklog(d.worklog);
      if (Array.isArray(d.activityTypes)) setActivityTypes(d.activityTypes);
      if (Array.isArray(d.despesas)) setDespesas(d.despesas); // fotos não vêm no .json (ficam no aparelho)
      toast("Backup importado");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Projetos (só a lista de projetos) ──
  const exportProjects = () => download(fileName(["projetos-ledlab"], "json"), { schema: "ledlab.projects.bundle.v1", projects });
  const importProjects = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        const incoming = Array.isArray(d) ? d : d.project ? [d.project] : Array.isArray(d.projects) ? d.projects : [];
        const fresh = incoming.filter((p) => p && typeof p === "object").map((p) => ({
          ...newProject({}), ...p, id: genId("proj"), updatedAt: Date.now(),
          telas: (p.telas || []).map((t) => ({ ...t, id: genId("tela") })),
        }));
        if (!fresh.length) { toast("Nenhum projeto no arquivo", "info"); return; }
        setProjects([...projects, ...fresh]);
        toast(`${fresh.length} projeto${fresh.length > 1 ? "s" : ""} importado${fresh.length > 1 ? "s" : ""}`);
      } catch { toast("Arquivo inválido", "info"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Biblioteca de gabinetes ──
  const exportCabs = () => download(fileName(["gabinetes-ledlab"], "json"), { schema: "ledlab.cabinets.v1", cabinets: cabs });
  const importCabs = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const incoming = Array.isArray(parsed) ? parsed : parsed.cabinets || parsed.cabs || [];
        if (!Array.isArray(incoming) || !incoming.length) { toast("Nenhum gabinete no arquivo.", "info"); return; }
        const byName = new Map(cabs.map((c) => [c.nome.toLowerCase(), c]));
        let added = 0, updated = 0;
        for (const raw of incoming) {
          if (!raw || !raw.nome) continue;
          const k = raw.nome.toLowerCase();
          if (byName.has(k)) { const ex = byName.get(k); byName.set(k, { ...ex, ...raw, id: ex.id }); updated++; }
          else { byName.set(k, { ...raw, id: genNumericId(byName.size) }); added++; }
        }
        setCabs(Array.from(byName.values()));
        toast(`Importado: ${added} novo(s), ${updated} atualizado(s).`);
      } catch { toast("Arquivo inválido. Use um .json exportado do LedLab Core.", "info"); }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // ── Manutenção ──
  const clearProjects = async () => {
    if (await confirm({ title: "Limpar todos os projetos?", message: "Todos os projetos serão removidos. Os gabinetes da biblioteca são mantidos." })) {
      setProjects([]);
      toast("Projetos removidos");
    }
  };
  const factoryReset = async () => {
    if (!(await confirm({ title: "Restaurar de fábrica?", message: "Isso apaga TODOS os seus dados (gabinetes e projetos) e recarrega os dados de exemplo. Não pode ser desfeito." }))) return;
    Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
    setCabs(SEED_CABINETS); setProjects(SEED_PROJECTS); setPrefs(DEFAULT_PREFS); setTcPresets([]);
    setWorklog([]); setActivityTypes(SEED_ACTIVITY_TYPES); setDespesas([]);
    toast("Dados restaurados de fábrica");
  };

  // (numeração, mapa de cabos e cores moram em components/CablingPrefs.jsx —
  //  compartilhados com o ajuste contextual da aba Cabeamento)

  // categorias SEMPRE recolhidas (desktop = mobile, pedido do usuário); 3 sub-menus organizam
  const open = false;
  const [group, setGroup] = useState("eng"); // sub-menu ativo: "eng" | "cache" | "dados"

  return (
    <div style={{ maxWidth: embedded ? "none" : 640 }}>
      {!embedded && <SectionHeader title="Configurações" subtitle="Preferências, dados e manutenção." />}

      {/* 3 sub-menus: reduz o "muro" de cards, principalmente no mobile */}
      <div style={tabsWrap}>
        {GROUPS.map(({ id, label, Icon }) => {
          const active = group === id;
          return (
            <button key={id} onClick={() => setGroup(id)} title={label} style={tabBtn(active)}>
              <Icon size={15} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</span>
            </button>
          );
        })}
      </div>

      {group === "eng" && (<>
      <Section icon={Zap} title="Elétrica & cabeamento" subtitle="Tensão, numeração e margem do cabo AC" defaultOpen={open}>
        <div style={subLabel}>Tensão padrão</div>
        <div style={subDesc}>Padrão de projetos novos (muda por projeto na aba Energia).</div>
        <Select value={prefs.vk || "220_tri"} title="Tensão padrão" onChange={(e) => setPrefs({ ...prefs, vk: e.target.value })} style={selStyle}>
          {Object.entries(VOLT).map(([k, v]) => <option key={k} value={k}>{v.g}V · {v.label}</option>)}
        </Select>

        <div style={{ ...subLabel, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.bd}` }}>Numeração dos cabos</div>
        <NumeracaoPrefs />

        <div style={{ ...subLabel, marginTop: 18, paddingTop: 16, borderTop: `1px solid ${T.bd}` }}>Margem de segurança do cabo AC</div>
        <div style={subDesc}>Regra dos 80% pra carga contínua (show longo). 100% = sem margem.</div>
        <Select value={String(prefs.acMargin ?? 1)} title="Margem do cabo AC" onChange={(e) => setPrefs({ ...prefs, acMargin: Number(e.target.value) })} style={selStyle}>
          <option value="1">100% — sem margem (padrão)</option>
          <option value="0.9">90% — margem leve</option>
          <option value="0.8">80% — carga contínua</option>
        </Select>
      </Section>

      <Section icon={Cable} title="Mapa de cabos" subtitle="Setas, numeração e posição do número no gabinete" defaultOpen={open}>
        <div style={subDesc}>Como o cabeamento aparece no Cabeamento, na Diagramação e no Relatório. <b>Atalho:</b> os mesmos ajustes ficam no ícone de ajustes da aba Cabeamento.</div>
        <MapaCabosPrefs />
      </Section>

      <Section icon={Palette} title="Cores dos cabos" subtitle="Paleta dos cabos e portas" defaultOpen={open}>
        <CoresPrefs />
      </Section>
      </>)}

      {group === "cache" && (<>
      <Section icon={LayoutDashboard} title="Visão Geral" subtitle="Privacidade e exibição da tela inicial" defaultOpen={open}>
        <PrefToggle on={!!prefs.dashOcultarValor} onClick={() => setPrefs({ ...prefs, dashOcultarValor: !prefs.dashOcultarValor })}
          titulo="Ocultar valores em R$" desc="Esconde o total de cachês na tela inicial — também no ícone de olho do card." />
      </Section>

      <Section icon={Receipt} title="Cachês (Diárias)" subtitle="Cálculo, fixo mensal, recibo e tipos" defaultOpen={open}>
        <DiariasConfig />
      </Section>
      </>)}

      {group === "dados" && (<>
      <Section icon={Monitor} title="Predefinições de test card" subtitle="Do sistema (ocultáveis) e as suas salvas" defaultOpen={open}>
        <div style={subLabel}>Do sistema</div>
        <div style={subDesc}>Aparecem nos seletores do Test Card e da Composição. Oculte as que você não usa — dá pra restaurar quando quiser.</div>
        {Object.entries(PRESET_LABELS).map(([k, l]) => {
          const hidden = (prefs.tcHiddenPresets || []).includes(k);
          return (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 0", borderTop: `1px solid ${T.bd}` }}>
              <span style={{ color: hidden ? T.dim : T.txt, fontSize: 14, textDecoration: hidden ? "line-through" : "none" }}>{l}</span>
              <button style={btn("ghost")} onClick={() => {
                const cur = prefs.tcHiddenPresets || [];
                setPrefs({ ...prefs, tcHiddenPresets: hidden ? cur.filter((x) => x !== k) : [...cur, k] });
                toast(hidden ? "Predefinição restaurada" : "Predefinição ocultada");
              }}>{hidden ? <><RotateCcw size={14} /> Restaurar</> : <><EyeOff size={14} /> Ocultar</>}</button>
            </div>
          );
        })}
        {tcPresets.length > 0 && (<>
          <div style={{ ...subLabel, marginTop: 18, paddingTop: 14, borderTop: `1px solid ${T.bd}` }}>Salvas por você</div>
          {tcPresets.map((p) => (
            <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "9px 0", borderTop: `1px solid ${T.bd}` }}>
              <span style={{ color: T.txt, fontSize: 14 }}>{p.name}</span>
              <button style={btn("danger")} onClick={async () => { if (await confirm({ title: "Excluir predefinição?", message: `"${p.name}" será removida.` })) { setTcPresets(tcPresets.filter((x) => x.id !== p.id)); toast("Predefinição excluída"); } }}><Trash2 size={14} /> Excluir</button>
            </div>
          ))}
        </>)}
      </Section>

      <Section icon={Cloud} title="Conta & sincronização" subtitle="Acesse seus dados de qualquer aparelho (opcional)" defaultOpen={false}>
        <AccountSection />
      </Section>

      <Section icon={Database} title="Dados & backup" subtitle="Exportar / importar arquivos (.json)" defaultOpen={open}>
        <StorageStatus />
        <IoRow first title="Backup completo" desc="Tudo num arquivo: gabinetes, projetos, cachês e preferências." onExport={onExportBackup} onImport={() => backupRef.current?.click()} />
        <input ref={backupRef} type="file" accept="application/json" onChange={importBackup} style={{ display: "none" }} />
        <IoRow title="Projetos" desc="Só os projetos/eventos — o importado é adicionado (não substitui)." onExport={exportProjects} onImport={() => projRef.current?.click()} />
        <input ref={projRef} type="file" accept=".json,application/json" onChange={importProjects} style={{ display: "none" }} />
        <IoRow title="Biblioteca de gabinetes" desc="Só os gabinetes — mescla por nome (adiciona novos, atualiza iguais)." onExport={exportCabs} onImport={() => cabRef.current?.click()} />
        <input ref={cabRef} type="file" accept="application/json" onChange={importCabs} style={{ display: "none" }} />
      </Section>

      <Section icon={TriangleAlert} title="Manutenção" subtitle="Ações destrutivas — não podem ser desfeitas" defaultOpen={false}>
        <div style={rowStyle(true)}>
          <div><div style={mTitle}>Limpar projetos</div><div style={mDesc}>Remove todos os projetos, mantém a biblioteca de gabinetes.</div></div>
          <button style={btn("danger")} onClick={clearProjects}><Eraser size={14} /> Limpar</button>
        </div>
        <div style={rowStyle(false)}>
          <div><div style={mTitle}>Restaurar de fábrica</div><div style={mDesc}>Apaga tudo e recarrega os dados de exemplo.</div></div>
          <button style={btn("danger")} onClick={factoryReset}><RotateCcw size={14} /> Restaurar</button>
        </div>
      </Section>
      </>)}

      {/* versão do app (o badge saiu do topbar mobile pra cá) */}
      <div style={{ color: T.dim, fontSize: 11.5, textAlign: "center", padding: "14px 0 4px" }}>LedLab Core <b style={{ color: T.mut }}>{VERSION}</b></div>
    </div>
  );
}

// ── categoria colapsável (o "dropdown" de configurações) ──
function Section({ icon: Icon, title, subtitle, defaultOpen, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={card({ marginBottom: 12, padding: 0, overflow: "hidden" })}>
      <button onClick={() => setOpen((v) => !v)} aria-expanded={open}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "13px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", fontFamily: "inherit" }}>
        <span style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {Icon && <Icon size={18} style={{ color: T.acM, flexShrink: 0 }} />}
          <span style={{ minWidth: 0 }}>
            <span style={{ display: "block", color: T.txt, fontWeight: 600, fontSize: 14.5 }}>{title}</span>
            {subtitle && <span style={{ display: "block", color: T.dim, fontSize: 12, marginTop: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</span>}
          </span>
        </span>
        {open ? <ChevronUp size={18} style={{ color: T.mut, flexShrink: 0 }} /> : <ChevronDown size={18} style={{ color: T.mut, flexShrink: 0 }} />}
      </button>
      {open && <div style={{ padding: "12px 16px 16px", borderTop: `1px solid ${T.bd}` }}>{children}</div>}
    </div>
  );
}

// linha de exportar/importar
function IoRow({ title, desc, onExport, onImport, first }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderTop: first ? "none" : `1px solid ${T.bd}`, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0, flex: "1 1 180px" }}><div style={mTitle}>{title}</div><div style={mDesc}>{desc}</div></div>
      <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
        <button style={btn("ghost")} onClick={onImport}><Upload size={14} /> Importar</button>
        <button style={btn("ghost")} onClick={onExport}><Download size={14} /> Exportar</button>
      </div>
    </div>
  );
}

// status do armazenamento persistente (durabilidade dos dados)
function StorageStatus() {
  const [persisted, setPersisted] = useState(null);
  const [usage, setUsage] = useState(null);
  const toast = useToast();
  const refresh = () => { isPersisted().then(setPersisted); storageUsage().then(setUsage); };
  useEffect(() => { refresh(); }, []);
  const proteger = async () => {
    const ok = await requestPersist();
    refresh();
    if (ok) toast("Armazenamento protegido");
    else toast("O navegador não concedeu agora — instale o app na tela inicial (menu do navegador → Instalar) que ele protege sozinho.", "info");
  };
  const ok = persisted === true;
  const mb = usage != null ? (usage / 1048576).toFixed(usage < 1048576 ? 2 : 1) : null;
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "2px 0 12px", borderBottom: `1px solid ${T.bd}`, marginBottom: 4, flexWrap: "wrap" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {ok ? <ShieldCheck size={18} style={{ color: "#34d399", flexShrink: 0 }} /> : <ShieldAlert size={18} style={{ color: T.red, flexShrink: 0 }} />}
        <div style={{ minWidth: 0 }}>
          <div style={mTitle}>{persisted === null ? "Verificando armazenamento…" : ok ? "Armazenamento protegido" : "Armazenamento não protegido"}</div>
          <div style={mDesc}>{ok ? "O navegador foi instruído a não descartar seus dados." : "O navegador pode descartar seus dados sob pressão de espaço."}{mb != null ? ` · ${mb} MB em uso` : ""}</div>
        </div>
      </div>
      {persisted === false && <button style={btn("ghost")} onClick={proteger}><ShieldCheck size={14} /> Proteger</button>}
    </div>
  );
}

// login/sync opcional na nuvem — código OTP de 6 dígitos (sem senha, qualquer navegador)
function AccountSection() {
  const { user, signIn, verifyCode, signOut } = useAuth();
  const { status, lastSyncedAt, syncNow } = useSync();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState("email"); // "email" | "code"
  const [busy, setBusy] = useState(false);

  const enviar = async () => {
    const e = email.trim();
    if (!e) { toast("Digite seu e-mail", "info"); return; }
    setBusy(true);
    try {
      const { error } = await signIn(e);
      if (error) toast(error.status === 429 ? "Muitos pedidos — aguarde alguns minutos." : (error.message || "Falha ao enviar"), "info");
      else { setStep("code"); toast("Código enviado pro seu e-mail"); }
    } catch {
      toast("Falha ao enviar o código", "info");
    }
    setBusy(false);
  };

  const entrar = async () => {
    if (!code.trim()) { toast("Digite o código", "info"); return; }
    setBusy(true);
    try {
      const { error } = await verifyCode(email, code);
      if (error) toast(error.message || "Código inválido ou expirado", "info");
      else toast("Conectado!");
    } catch {
      toast("Falha ao entrar", "info");
    }
    setBusy(false);
  };

  if (user) {
    const label = { syncing: "Sincronizando…", synced: "Sincronizado", offline: "Offline — sincroniza ao reconectar", error: "Erro ao sincronizar" }[status] || "Pronto";
    const color = status === "error" ? T.red : status === "synced" ? "#34d399" : T.mut;
    return (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 10 }}>
            <Cloud size={18} style={{ color: "#34d399", flexShrink: 0 }} />
            <div style={{ minWidth: 0 }}><div style={mTitle}>Conectado</div><div style={mDesc}>{user.email}</div></div>
          </div>
          <button style={btn("ghost")} onClick={signOut}>Sair</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", borderTop: `1px solid ${T.bd}`, paddingTop: 10 }}>
          <div style={mDesc}><span style={{ color, fontWeight: 600 }}>{label}</span>{status === "synced" && lastSyncedAt ? ` · ${fmtAgo(lastSyncedAt)}` : ""}</div>
          <button style={btn("ghost")} onClick={syncNow} disabled={status === "syncing"}>Sincronizar agora</button>
        </div>
      </div>
    );
  }
  return (
    <div>
      <div style={{ ...subDesc, marginBottom: 10 }}>Código de 6 dígitos no seu e-mail — sem senha, funciona em qualquer navegador.</div>
      {step === "code" ? (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={mDesc}>Código enviado pra <b>{email}</b>. Digite abaixo:</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" placeholder="000000" style={{ ...selStyle, flex: "1 1 140px", letterSpacing: "0.3em", fontFamily: "ui-monospace, monospace" }} />
            <button style={btn("primary")} onClick={entrar} disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button>
          </div>
          <button onClick={() => { setStep("email"); setCode(""); }} style={{ background: "none", border: "none", color: T.mut, fontSize: 12.5, cursor: "pointer", textAlign: "left", padding: 0 }}>Trocar e-mail / reenviar código</button>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="seu@email.com" style={{ ...selStyle, flex: "1 1 200px" }} />
          <button style={btn("primary")} onClick={enviar} disabled={busy}>{busy ? "Enviando…" : "Enviar código"}</button>
        </div>
      )}
    </div>
  );
}

function fmtAgo(ms) {
  const s = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return "agora";
  const m = Math.floor(s / 60);
  if (m < 60) return `há ${m} min`;
  return `há ${Math.floor(m / 60)}h`;
}

// 3 sub-menus das Configurações (segmented control no topo)
const GROUPS = [
  { id: "eng", label: "Engenharia", Icon: Zap },
  { id: "cache", label: "Cachês", Icon: Receipt },
  { id: "dados", label: "Dados", Icon: Database },
];
const tabsWrap = { display: "flex", gap: 6, marginBottom: 14, background: T.card2, border: `1px solid ${T.bd}`, borderRadius: 10, padding: 4 };
const tabBtn = (active) => ({ flex: 1, minWidth: 0, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "9px 8px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600, border: "none", background: active ? T.acc : "transparent", color: active ? "#fff" : T.mut });

const mTitle = { color: T.txt, fontWeight: 600, fontSize: 14 };
const mDesc = { color: T.dim, fontSize: 12 };
const selStyle = { width: "100%", background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "9px 12px", fontSize: 16 };
const subLabel = { color: T.txt, fontWeight: 600, fontSize: 13.5, marginBottom: 2 };
const subDesc = { color: T.dim, fontSize: 12.5, marginBottom: 8 };
const rowStyle = (first) => ({ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, padding: "12px 0", borderTop: first ? "none" : `1px solid ${T.bd}`, flexWrap: "wrap" });
