// pages/project/ProjectEquipamentos.jsx — aba Equipamentos (por projeto, pulável).
//
// Aqui o técnico atribui um PROCESSADOR (do Catálogo global — menu Processadores) a
// cada Screen. O processador define a capacidade de porta e se tem Free Topology → o
// app escolhe a régua da Screen sozinho ("modo guiado pelo equipamento") e avisa
// quando não cabe. O cadastro/edição dos processadores mora no Catálogo, não aqui.
import { Cpu, AlertTriangle, Check, Zap } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { card, label as lbl } from "../../ui/styles.js";
import Select from "../../components/Select.jsx";
import Placeholder from "../../components/Placeholder.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { equipReport, hzQueCabe, controllerById } from "../../services/equipamentos.js";

export default function ProjectEquipamentos({ project, patch }) {
  const { controllers, prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const telas = project.telas || [];
  const screens = project.screens || [];
  const comTelas = screens.filter((s) => (s.telaIds || []).length);

  // atribuição (por projeto) — o cadastro dos processadores é no Catálogo
  const assign = (screenId, ctrlId) => patch({ screens: screens.map((s) => (s.id === screenId ? { ...s, equipamentoId: ctrlId || undefined } : s)) });

  if (!telas.length) return <Placeholder icon={Cpu} title="Sem telas" description="Adicione telas na aba Dados e monte as Screens antes de escolher o equipamento." />;

  const { rows, semControlador } = equipReport(project, controllers, telas, numbering);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ color: T.dim, fontSize: 12, lineHeight: 1.5 }}>
        Escolha o processador de cada Screen. Ele define a capacidade de porta e se tem <b style={{ color: T.mut }}>Free Topology</b> — o app ajusta a régua do cabeamento sozinho e avisa se não couber. É opcional: sem processador, você escolhe a régua na mão no Cabeamento. Os modelos vêm do <b style={{ color: T.mut }}>Catálogo de Processadores</b> (menu lateral).
      </div>

      {!controllers.length && (
        <div style={card({ display: "flex", gap: 8, alignItems: "flex-start", borderColor: T.acc })}>
          <Cpu size={16} color={T.acM} style={{ flexShrink: 0, marginTop: 1 }} />
          <span style={{ color: T.mut, fontSize: 13, lineHeight: 1.5 }}>
            O catálogo está vazio. Cadastre seus processadores em <b style={{ color: T.txt }}>Processadores</b> (menu lateral, seção Gestão) pra poder atribuí-los às Screens aqui.
          </span>
        </div>
      )}

      {/* ── atribuição por Screen ── */}
      {!comTelas.length ? (
        <div style={card({ color: T.dim, fontSize: 13, textAlign: "center", padding: 24 })}>
          Monte as Screens na aba <b style={{ color: T.mut }}>Screens</b> primeiro; aqui você escolhe o equipamento de cada uma.
        </div>
      ) : (
        <div style={card()}>
          <div style={{ ...lbl, marginBottom: 10 }}>Processador por Screen</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {comTelas.map((s) => {
              const row = rows.find((r) => r.controller?.id === s.equipamentoId);
              const usadas = row ? row.screens.find((x) => x.screen.id === s.id)?.portas : null;
              const ctrl = controllerById(controllers, s.equipamentoId);
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ color: T.txt, fontWeight: 600, fontSize: 13, minWidth: 120 }}>{s.nome}</span>
                  <Select value={s.equipamentoId || ""} onChange={(e) => assign(s.id, e.target.value)} style={{ background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "7px 10px", minWidth: 180 }}>
                    <option value="">— sem processador —</option>
                    {controllers.map((c) => <option key={c.id} value={c.id}>{c.marca ? `${c.marca} ${c.nome}` : c.nome}</option>)}
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
              {semControlador.length} Screen(s) sem processador — seguem com a régua manual do Cabeamento.
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
              <span style={{ color: T.txt, fontWeight: 600 }}>{controller?.marca ? `${controller.marca} ${controller.nome}` : controller?.nome || "?"}</span>
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
                  Não cabe. Opções: dividir em mais um processador, tirar Screens daqui, ou {hz ? <>baixar o refresh — <b style={{ color: T.txt }}>a {hz.hz} Hz caberia ({hz.portas} portas)</b>.</> : <>reduzir a resolução (nem a 30 Hz coube).</>}
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
