// pages/project/ProjectEquipamentos.jsx — aba EQUIPAMENTOS (desktop-only, pulável).
//
// O técnico ATRIBUI uma controladora do CATÁLOGO CERTIFICADO a cada Screen; o app
// confere se as Screens cabem nas portas dela (e na resolução máx), com o lever de Hz.
// O catálogo é READ-ONLY (curado por nós) — o usuário SELECIONA, não cadastra: evita
// dado errado no circuito. A régua área/pixels segue manual no Cabeamento (sem Free
// Topology aqui — é combinação controladora × receiving card, do gabinete).
import { Cpu, AlertTriangle, Check, Zap, Gauge } from "lucide-react";
import { T } from "../../ui/tokens.js";
import { card, label as lbl } from "../../ui/styles.js";
import Select from "../../components/Select.jsx";
import Placeholder from "../../components/Placeholder.jsx";
import { useLedLabContext } from "../../store/AppContext.jsx";
import { CATALOGO, equipById, cargaTotal, equipReport, hzQueCabe } from "../../services/equipamentos.js";

const fmtPx = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n.toLocaleString("pt-BR"));

export default function ProjectEquipamentos({ project, patch }) {
  const { prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const telas = project.telas || [];
  const screens = project.screens || [];
  const comTelas = screens.filter((s) => (s.telaIds || []).length);

  const assign = (screenId, equipId) => patch({ screens: screens.map((s) => (s.id === screenId ? { ...s, equipamentoId: equipId || undefined } : s)) });

  if (!telas.length) return <Placeholder icon={Cpu} title="Sem telas" description="Adicione telas na aba Dados e monte as Screens antes de escolher o equipamento." />;

  const { rows, semEquip } = equipReport(project, telas, numbering);
  const barColor = (pct) => (pct > 100 ? T.red : pct > 85 ? T.amb : T.grn);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ color: T.dim, fontSize: 12.5, lineHeight: 1.55 }}>
        Escolha a <b style={{ color: T.mut }}>controladora</b> de cada Screen — o app confere se as Screens cabem nas <b style={{ color: T.mut }}>portas</b> e na resolução dela. É opcional. Os modelos vêm de um <b style={{ color: T.mut }}>catálogo certificado</b> (não editável): você <b style={{ color: T.mut }}>seleciona</b>, o dado é conferido por nós.
      </div>

      {/* ── atribuição + capacidade ── */}
      {!comTelas.length ? (
        <div style={card({ color: T.dim, fontSize: 13, textAlign: "center", padding: 24 })}>
          Monte as Screens na aba <b style={{ color: T.mut }}>Screens</b> primeiro; aqui você escolhe a controladora de cada uma.
        </div>
      ) : (
        <div style={card()}>
          <div style={{ ...lbl, marginBottom: 12 }}>Controladora por Screen</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {comTelas.map((s) => {
              const eq = equipById(s.equipamentoId);
              const row = rows.find((r) => r.equip?.id === s.equipamentoId);
              const mine = row?.screens.find((x) => x.screen.id === s.id);
              return (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", padding: "8px 10px", borderRadius: 8, background: T.card2, border: `1px solid ${T.bd}` }}>
                  <span style={{ flex: "1 1 130px", minWidth: 0, color: T.txt, fontWeight: 600, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.nome}</span>
                  <Select value={s.equipamentoId || ""} onChange={(e) => assign(s.id, e.target.value)} title="Controladora" style={{ ...selSty, flex: "1 1 190px" }}>
                    <option value="">— sem controladora</option>
                    {CATALOGO.map((c) => <option key={c.id} value={c.id}>{c.modelo} · {c.portas} portas</option>)}
                  </Select>
                  {mine && (
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13, fontWeight: 700, color: mine.resOver ? T.red : T.mut, whiteSpace: "nowrap" }}>
                      <Cpu size={13} />{mine.portas} {mine.portas === 1 ? "porta" : "portas"}
                      {mine.resOver && <span style={{ color: T.red, display: "inline-flex", alignItems: "center", gap: 3 }}><AlertTriangle size={12} /> estoura {eq.maxW}×{eq.maxH}</span>}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── capacidade por controladora (o coração: cabe ou não?) ── */}
      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={lbl}>Capacidade</div>
          {rows.map((r) => {
            const pct = r.portasDisp ? Math.round((r.portasUsadas / r.portasDisp) * 100) : 0;
            const lever = r.over ? hzQueCabe(r.equip, r.screens.map((x) => x.screen), telas, numbering) : null;
            return (
              <div key={r.equip.id} style={card({ borderColor: r.over ? T.red : T.bd })}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 7, color: T.txt, fontWeight: 700, fontSize: 15 }}><Cpu size={15} color={T.acM} />{r.equip.modelo}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: r.over ? T.red : T.mut }}>
                    {r.over ? <><AlertTriangle size={13} style={{ verticalAlign: "-2px" }} /> {r.portasUsadas} de {r.portasDisp} portas — estoura {r.portasUsadas - r.portasDisp}</> : <><Check size={13} style={{ verticalAlign: "-2px", color: T.grn }} /> {r.portasUsadas} de {r.portasDisp} portas — folga {r.folga}</>}
                  </span>
                </div>
                <div style={{ height: 8, background: T.bd, borderRadius: 999, overflow: "hidden", margin: "9px 0 8px" }}>
                  <div style={{ width: `${Math.min(100, pct)}%`, height: "100%", background: barColor(pct) }} />
                </div>
                <div style={{ color: T.dim, fontSize: 12 }}>
                  {r.screens.map((x) => `${x.screen.nome} (${x.portas})`).join(" · ")}
                </div>
                {lever && (
                  <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.amb, fontWeight: 600 }}>
                    <Zap size={13} /> A <b>{lever.hz} Hz</b> caberia ({lever.portas} portas).
                  </div>
                )}
                {r.algumResOver && (
                  <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.red, fontWeight: 600 }}>
                    <AlertTriangle size={13} /> Alguma Screen passa da resolução máxima ({r.equip.maxW}×{r.equip.maxH}).
                  </div>
                )}
              </div>
            );
          })}
          {semEquip.length > 0 && (
            <div style={{ color: T.dim, fontSize: 12 }}><b style={{ color: T.mut }}>{semEquip.length}</b> Screen(s) sem controladora — seguem a régua manual do Cabeamento.</div>
          )}
        </div>
      )}

      {/* ── catálogo certificado (referência, read-only) ── */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 4 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={lbl}>Catálogo certificado</div>
          <span style={{ fontSize: 11, color: T.dim, display: "inline-flex", alignItems: "center", gap: 4 }}><Gauge size={12} /> NovaStar · conferido nos datasheets</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          {CATALOGO.map((e) => (
            <div key={e.id} style={card({ padding: 14 })}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                <span style={{ color: T.txt, fontWeight: 700, fontSize: 15 }}>{e.modelo}</span>
                <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: e.status === "ativo" ? T.grn : T.dim }}>{e.status}</span>
              </div>
              <div style={{ color: T.dim, fontSize: 11.5, marginBottom: 8 }}>{e.marca} · {e.categoria === "all-in-one" ? "All-in-One" : "Sending card"}</div>
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px", fontSize: 12.5, color: T.mut }}>
                <span style={{ color: T.dim }}>Portas</span><b style={{ color: T.txt }}>{e.portas} × {fmtPx(e.pxPorta)} px</b>
                <span style={{ color: T.dim }}>Carga</span><b style={{ color: T.txt }}>{fmtPx(cargaTotal(e))} px</b>
                <span style={{ color: T.dim }}>Máx</span><b style={{ color: T.txt }}>{e.maxW.toLocaleString("pt-BR")} × {e.maxH.toLocaleString("pt-BR")}</b>
                <span style={{ color: T.dim }}>Cor</span><b style={{ color: T.txt }}>{e.bits.join("/")}-bit</b>
                <span style={{ color: T.dim }}>Entradas</span><b style={{ color: T.txt }}>{e.entradas.join(" · ")}</b>
              </div>
              {e.obs && <div style={{ color: T.dim, fontSize: 11, marginTop: 8, lineHeight: 1.4, fontStyle: "italic" }}>{e.obs}</div>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const selSty = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 14, fontWeight: 600 };
