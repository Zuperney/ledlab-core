// pages/Equipamentos.jsx — EQUIPAMENTOS (Gestão, desktop-only).
//
// Caminho SEPARADO do projeto (as abas de projeto já estão infladas): o técnico traz
// um projeto pra cá e verifica quantos equipamentos usar / qual a melhor estratégia.
// O catálogo é READ-ONLY, CERTIFICADO POR NÓS (à la Fido LED): o usuário SELECIONA,
// não cadastra — dado errado de controladora vira info errada no circuito. A régua
// área/pixels segue manual no Cabeamento (sem Free Topology — é combinação
// controladora × receiving card, do gabinete).
import { useState } from "react";
import { Cpu, AlertTriangle, Check, Zap, Gauge, FolderOpen } from "lucide-react";
import { T } from "../ui/tokens.js";
import { card, label as lbl } from "../ui/styles.js";
import Select from "../components/Select.jsx";
import { useLedLabContext } from "../store/AppContext.jsx";
import { CATALOGO, equipById, cargaTotal, equipReport, hzQueCabe } from "../services/equipamentos.js";

const fmtPx = (n) => (n >= 1e6 ? `${(n / 1e6).toFixed(1)}M` : n.toLocaleString("pt-BR"));

const SERIES = [
  { id: "VX", titulo: "Série VX", sub: "all-in-one clássica do rental" },
  { id: "MX", titulo: "Série MX", sub: "COEX (VMP), a geração nova" },
];

export default function Equipamentos({ nav }) {
  const { projects, setProjects, prefs } = useLedLabContext();
  const numbering = prefs.cableNumbering || "row-tb-lr";
  const [projectId, setProjectId] = useState("");

  const project = projects.find((p) => p.id === projectId) || null;
  const telas = project?.telas || [];
  const screens = project?.screens || [];
  const comTelas = screens.filter((s) => (s.telaIds || []).length);
  const patch = (partial) => setProjects(projects.map((p) => (p.id === project.id ? { ...p, ...partial, updatedAt: Date.now() } : p)));
  const assign = (screenId, equipId) => patch({ screens: screens.map((s) => (s.id === screenId ? { ...s, equipamentoId: equipId || undefined } : s)) });

  const { rows, semEquip } = project ? equipReport(project, telas, numbering) : { rows: [], semEquip: [] };
  const barColor = (pct) => (pct > 100 ? T.red : pct > 85 ? T.amb : T.grn);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ color: T.dim, fontSize: 12.5, lineHeight: 1.55 }}>
        Traga um <b style={{ color: T.mut }}>projeto</b> e escolha a <b style={{ color: T.mut }}>controladora</b> de cada Screen — o app confere se cabem nas <b style={{ color: T.mut }}>portas</b>, na <b style={{ color: T.mut }}>carga</b> e na resolução. Os modelos vêm de um <b style={{ color: T.mut }}>catálogo certificado</b> (não editável): você <b style={{ color: T.mut }}>seleciona</b>, o dado é conferido por nós.
      </div>

      {/* ── verificação com um projeto ── */}
      <div style={card()}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          <div style={{ ...lbl, marginBottom: 0, flex: "0 0 auto" }}>Verificar projeto</div>
          <Select value={projectId} onChange={(e) => setProjectId(e.target.value)} title="Projeto" style={{ ...selSty, flex: "1 1 240px", maxWidth: 380 }}>
            <option value="">— escolha um projeto</option>
            {projects.map((p) => <option key={p.id} value={p.id}>{p.name || "Sem nome"}</option>)}
          </Select>
          {project && (
            <button onClick={() => nav?.openProject?.(project.id)} title="Abrir o projeto"
              style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${T.bd}`, color: T.mut, borderRadius: 8, padding: "7px 12px", fontSize: 12.5, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>
              <FolderOpen size={13} /> Abrir projeto
            </button>
          )}
        </div>

        {project && !comTelas.length && (
          <div style={{ color: T.dim, fontSize: 13, marginTop: 12 }}>
            Este projeto ainda não tem Screens montadas — monte na aba <b style={{ color: T.mut }}>Screens</b> do projeto; aqui você escolhe a controladora de cada uma.
          </div>
        )}

        {comTelas.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 14 }}>
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
        )}
      </div>

      {/* ── capacidade por controladora (o coração: cabe ou não?) ── */}
      {rows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={lbl}>Capacidade</div>
          {rows.map((r) => {
            const pct = r.portasDisp ? Math.round((r.portasUsadas / r.portasDisp) * 100) : 0;
            const lever = r.over ? hzQueCabe(r.equip, r.screens.map((x) => x.screen), telas, numbering) : null;
            const ruim = r.over || r.cargaOver;
            return (
              <div key={r.equip.id} style={card({ borderColor: ruim ? T.red : T.bd })}>
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
                  <span style={{ color: r.cargaOver ? T.red : T.dim }}> · carga {fmtPx(r.pxUsados)} de {fmtPx(r.carga)} px</span>
                </div>
                {lever && (
                  <div style={{ marginTop: 8, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.amb, fontWeight: 600 }}>
                    <Zap size={13} /> A <b>{lever.hz} Hz</b> caberia ({lever.portas} portas).
                  </div>
                )}
                {r.cargaOver && (
                  <div style={{ marginTop: 6, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: T.red, fontWeight: 600 }}>
                    <AlertTriangle size={13} /> As Screens somam {fmtPx(r.pxUsados)} px — acima do que o dispositivo processa ({fmtPx(r.carga)} px).
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

      {/* ── catálogo certificado (referência, read-only, por série) ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <div style={lbl}>Catálogo certificado</div>
        <span style={{ fontSize: 11, color: T.dim, display: "inline-flex", alignItems: "center", gap: 4 }}><Gauge size={12} /> NovaStar · conferido nos datasheets</span>
      </div>
      {SERIES.map((serie) => {
        const equips = CATALOGO.filter((e) => e.serie === serie.id);
        if (!equips.length) return null;
        return (
          <div key={serie.id} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <span style={{ color: T.txt, fontWeight: 700, fontSize: 14 }}>{serie.titulo}</span>
              <span style={{ color: T.dim, fontSize: 11.5 }}>{serie.sub}</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
              {equips.map((e) => (
                <div key={e.id} style={card({ padding: 14 })}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 6 }}>
                    <span style={{ color: T.txt, fontWeight: 700, fontSize: 15 }}>{e.modelo}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.04em", color: e.status === "ativo" ? T.grn : T.dim }}>{e.status}</span>
                  </div>
                  <div style={{ color: T.dim, fontSize: 11.5, marginBottom: 8 }}>{e.marca} · {e.categoria === "all-in-one" ? "All-in-One" : "Sending card"}</div>
                  <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "3px 10px", fontSize: 12.5, color: T.mut }}>
                    <span style={{ color: T.dim }}>Portas</span><b style={{ color: T.txt }}>{e.portas} × {fmtPx(e.pxPorta)} px</b>
                    <span style={{ color: T.dim }}>Carga</span><b style={{ color: T.txt }}>{fmtPx(cargaTotal(e))} px</b>
                    <span style={{ color: T.dim }}>Máx</span><b style={{ color: T.txt }}>{e.maxW ? `${e.maxW.toLocaleString("pt-BR")} × ${e.maxH.toLocaleString("pt-BR")}` : "—"}</b>
                    <span style={{ color: T.dim }}>Cor</span><b style={{ color: T.txt }}>{e.bits.join("/")}-bit</b>
                    <span style={{ color: T.dim }}>Entradas</span><b style={{ color: T.txt }}>{e.entradas.join(" · ")}</b>
                  </div>
                  {e.obs && <div style={{ color: T.dim, fontSize: 11, marginTop: 8, lineHeight: 1.4, fontStyle: "italic" }}>{e.obs}</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

const selSty = { background: T.card2, color: T.txt, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "8px 10px", fontSize: 14, fontWeight: 600 };
