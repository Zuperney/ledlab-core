// pages/project/ProjectEquipamentos.jsx — aba Equipamentos (por projeto, pulável).
//
// Duas coisas: (1) a BIBLIOTECA global de controladoras (reutiliza entre eventos,
// igual os gabinetes) e (2) atribuir uma controladora a cada Screen. A controladora
// define a capacidade de porta e se tem Free Topology → o app escolhe a régua da
// Screen sozinho ("modo guiado pelo equipamento") e avisa quando não cabe.
import { useState } from "react";
import { Cpu, Plus, Trash2, ChevronDown, ChevronUp, AlertTriangle, Check, Zap } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { card, btn, label as lbl, input as inputStyle } from "../../ui/styles.js";
import Select from "../../components/Select.jsx";
import NumField from "../../components/NumField.jsx";
import Placeholder from "../../components/Placeholder.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { useConfirm } from "../../store/UIContext.jsx";
import { genId } from "../../services/ids.js";
import { makeController, equipReport, hzQueCabe, controllerById } from "../../services/equipamentos.js";

export default function ProjectEquipamentos({ project, patch }) {
  const { controllers, setControllers, prefs } = useLedLabContext();
  const confirm = useConfirm();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const telas = project.telas || [];
  const screens = project.screens || [];
  const [libOpen, setLibOpen] = useState(false);
  const [editing, setEditing] = useState(null); // id da controladora em edição inline

  const comTelas = screens.filter((s) => (s.telaIds || []).length);

  // biblioteca (global)
  const addController = () => { const id = genId("ctrl"); setControllers([...controllers, makeController(id, { nome: `Controladora ${controllers.length + 1}` })]); setEditing(id); setLibOpen(true); };
  const patchController = (id, partial) => setControllers(controllers.map((c) => (c.id === id ? { ...c, ...partial } : c)));
  const removeController = async (id) => {
    if (!(await confirm({ title: "Excluir controladora?", message: "Sai da biblioteca. As Screens que a usavam voltam a escolher a régua na mão." }))) return;
    setControllers(controllers.filter((c) => c.id !== id));
    setEditing(null);
  };

  // atribuição (por projeto)
  const assign = (screenId, ctrlId) => patch({ screens: screens.map((s) => (s.id === screenId ? { ...s, equipamentoId: ctrlId || undefined } : s)) });

  if (!telas.length) return <Placeholder icon={Cpu} title="Sem telas" description="Adicione telas na aba Dados e monte as Screens antes de escolher o equipamento." />;

  const { rows, semControlador } = equipReport(project, controllers, telas, numbering);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ color: T.dim, fontSize: 12, lineHeight: 1.5 }}>
        Escolha a controladora de cada Screen. Ela define a capacidade de porta e se tem <b style={{ color: T.mut }}>Free Topology</b> — o app ajusta a régua do cabeamento sozinho e avisa se não couber. É opcional: sem controladora, você escolhe a régua na mão no Cabeamento.
      </div>

      {/* ── atribuição por Screen ── */}
      {!comTelas.length ? (
        <div style={card({ color: T.dim, fontSize: 13, textAlign: "center", padding: 24 })}>
          Monte as Screens na aba <b style={{ color: T.mut }}>Screens</b> primeiro; aqui você escolhe o equipamento de cada uma.
        </div>
      ) : (
        <div style={card()}>
          <div style={{ ...lbl, marginBottom: 10 }}>Controladora por Screen</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comTelas.map((s) => {
              const row = rows.find((r) => r.controller?.id === s.equipamentoId);
              const usadas = row ? row.screens.find((x) => x.screen.id === s.id)?.portas : null;
              const ctrl = controllerById(controllers, s.equipamentoId);
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ color: T.txt, fontWeight: 600, fontSize: 13, minWidth: 120 }}>{s.nome}</span>
                  <Select value={s.equipamentoId || ""} onChange={(e) => assign(s.id, e.target.value)} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "7px 10px", minWidth: 180 }}>
                    <option value="">— sem controladora —</option>
                    {controllers.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                  </Select>
                  {ctrl && usadas != null && (
                    <span style={{ color: T.dim, fontSize: 12 }}>
                      {usadas} {usadas === 1 ? "porta" : "portas"} · {ctrl.freeTopology ? "Free Topology" : "régua de área"}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          {semControlador.length > 0 && (
            <div style={{ color: T.dim, fontSize: 11.5, marginTop: 10 }}>
              {semControlador.length} Screen(s) sem controladora — seguem com a régua manual do Cabeamento.
            </div>
          )}
        </div>
      )}

      {/* ── capacidade ── */}
      {rows.map(({ controller, screens: suas, portasUsadas, portasDisp, over, folga }) => {
        const hz = over ? hzQueCabe(controller, suas.map((x) => x.screen), telas, numbering) : null;
        return (
          <div key={controller?.id || "sem"} style={card({ borderColor: over ? T.red : T.bd })}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {over ? <AlertTriangle size={16} color={T.red} /> : <Check size={16} color={T.grn} />}
              <span style={{ color: T.txt, fontWeight: 600 }}>{controller?.nome || "?"}</span>
              <span style={{ color: over ? T.red : T.mut, fontSize: 13 }}>
                {portasUsadas} de {portasDisp} portas{over ? ` · faltam ${portasUsadas - portasDisp}` : folga > 0 ? ` · sobram ${folga}` : ""}
              </span>
            </div>
            {/* barra de ocupação */}
            <div style={{ height: 6, borderRadius: 3, background: T.card2, marginTop: 8, overflow: "hidden" }}>
              <div style={{ width: `${Math.min(100, portasDisp ? (portasUsadas / portasDisp) * 100 : 0)}%`, height: "100%", background: over ? T.red : T.grn }} />
            </div>
            <div style={{ color: T.dim, fontSize: 12, marginTop: 8 }}>
              {suas.map((x) => `${x.screen.nome} (${x.portas})`).join(" · ")}
            </div>
            {over && (
              <div style={{ display: "flex", gap: 7, alignItems: "flex-start", marginTop: 8, color: T.mut, fontSize: 12 }}>
                <Zap size={13} color={T.amb} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                  Não cabe. Opções: dividir em mais uma controladora, tirar Screens daqui, ou {hz ? <>baixar o refresh — <b style={{ color: T.txt }}>a {hz.hz} Hz caberia ({hz.portas} portas)</b>.</> : <>reduzir a resolução (nem a 30 Hz coube).</>}
                </span>
              </div>
            )}
          </div>
        );
      })}

      {/* ── biblioteca de controladoras ── */}
      <div style={card()}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
          <button onClick={() => setLibOpen((v) => !v)} style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: T.txt, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
            {libOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />} Biblioteca de controladoras <span style={{ color: T.dim, fontWeight: 400 }}>· {controllers.length}</span>
          </button>
          <button style={btn("ghost")} onClick={addController}><Plus size={14} /> Nova</button>
        </div>
        {libOpen && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {controllers.map((c) => {
              const open = editing === c.id;
              return (
                <div key={c.id} style={{ border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", background: T.card2 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <button onClick={() => setEditing(open ? null : c.id)} style={{ background: "transparent", border: "none", color: T.txt, cursor: "pointer", fontWeight: 600, fontSize: 13, flex: 1, textAlign: "left" }}>
                      {c.nome} <span style={{ color: T.dim, fontWeight: 400, fontSize: 12 }}>· {c.portas} portas · {(c.pxPorta / 1000).toLocaleString("pt-BR")}k px/porta · {c.freeTopology ? "Free Topology" : "área"}</span>
                    </button>
                    <button onClick={() => removeController(c.id)} style={{ ...btn("ghost"), color: T.red, padding: "5px 8px" }}><Trash2 size={14} /></button>
                  </div>
                  {open && (
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10, paddingTop: 10, borderTop: `1px solid ${T.bd}`, alignItems: "flex-end" }}>
                      <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={lbl}>Nome</span>
                        <input value={c.nome} onChange={(e) => patchController(c.id, { nome: e.target.value })} style={inputStyle()} />
                      </label>
                      <NumField lbl="Portas" value={c.portas} onChange={(v) => patchController(c.id, { portas: v })} />
                      <NumField lbl="px/porta (8-bit)" value={c.pxPorta} onChange={(v) => patchController(c.id, { pxPorta: v })} />
                      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                        <span style={lbl}>Free Topology</span>
                        <div style={{ display: "flex", gap: 4 }}>
                          {[["sim", true], ["não", false]].map(([l, v]) => (
                            <button key={l} onClick={() => patchController(c.id, { freeTopology: v })}
                              style={{ padding: "7px 12px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${c.freeTopology === v ? T.acc : T.bd}`, background: c.freeTopology === v ? T.acc : T.card, color: c.freeTopology === v ? "#fff" : T.mut }}>{l}</button>
                          ))}
                        </div>
                      </div>
                      <NumField lbl="Máx L (px)" value={c.maxW || 0} onChange={(v) => patchController(c.id, { maxW: v })} />
                      <NumField lbl="Máx A (px)" value={c.maxH || 0} onChange={(v) => patchController(c.id, { maxH: v })} />
                      <label style={{ display: "flex", flexDirection: "column", gap: 4, flex: 1, minWidth: 160 }}>
                        <span style={lbl}>Obs</span>
                        <input value={c.obs || ""} onChange={(e) => patchController(c.id, { obs: e.target.value })} placeholder="ex.: Free Topology exige RC série A" style={inputStyle()} />
                      </label>
                    </div>
                  )}
                </div>
              );
            })}
            {!controllers.length && <div style={{ color: T.dim, fontSize: 12 }}>Nenhuma controladora. Clique em “Nova” e cadastre o seu equipamento.</div>}
            <div style={{ color: T.dim, fontSize: 11, lineHeight: 1.5 }}>
              A biblioteca é global — cadastre uma vez, use em todo evento. <b style={{ color: T.mut }}>Free Topology</b> (regra do retângulo desligada) exige controlador com a função + RC série A; sem ela, a régua fica em Área. Mais em Base de Conhecimento › Sinal.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
