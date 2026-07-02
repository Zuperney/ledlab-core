// pages/Inventory.jsx — Biblioteca de gabinetes (CRUD, salvo no navegador).
import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Star, Columns3 } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { pitch } from "../services/electricalCalc.js";
import { genNumericId } from "../services/ids.js";
import { T } from "../ui/tokens.js";
import { card, input, label, btn, iconBtn } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";
import DropdownMenu from "../components/DropdownMenu.jsx";
import Drawer from "../components/Drawer.jsx";

const EMPTY = { nome: "", resX: "", resY: "", dimW: "", dimH: "", peso: "", pwrMax: "", pwrMed: "", pwrBlack: "", fp: "0.9", ip: "Indoor", brilho: "", receivingCard: "", conector: "PowerCON Azul/Branco", conectorCustom: "" };
const REQUIRED = ["nome", "resX", "resY", "dimW", "dimH", "peso", "pwrMax"];

const COLS = [
  { key: "pitch", label: "Pitch" },
  { key: "resolucao", label: "Resolução" },
  { key: "dimensoes", label: "Dimensões" },
  { key: "pwrMax", label: "W Máx." },
  { key: "pwrMed", label: "W Méd." },
  { key: "peso", label: "Peso" },
  { key: "ip", label: "IP" },
];

export default function Inventory() {
  const { cabs, setCabs, prefs, setPrefs } = useLedLabContext();
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("nome");
  const [ipFilter, setIpFilter] = useState("Todos");
  const [drawer, setDrawer] = useState(null); // null | {mode, data}

  const cols = prefs.cabCols || {};
  const toggleCol = (k) => setPrefs({ ...prefs, cabCols: { ...cols, [k]: !cols[k] } });

  const rows = useMemo(() => {
    let r = cabs.filter((c) => c.nome.toLowerCase().includes(q.toLowerCase()));
    if (ipFilter !== "Todos") r = r.filter((c) => c.ip === ipFilter);
    r = [...r].sort((a, b) => (sortBy === "pwrMax" ? (parseFloat(b.pwrMax) || 0) - (parseFloat(a.pwrMax) || 0) : a.nome.localeCompare(b.nome)));
    return r;
  }, [cabs, q, ipFilter, sortBy]);

  const openNew = () => setDrawer({ mode: "new", data: { ...EMPTY } });
  const openEdit = (c) => setDrawer({ mode: "edit", data: { ...c } });
  const remove = (id) => setCabs(cabs.filter((c) => c.id !== id));
  const setFav = (id) => setPrefs({ ...prefs, favCabId: prefs.favCabId === id ? null : id });

  const save = () => {
    const d = drawer.data;
    if (REQUIRED.some((f) => !String(d[f] || "").trim())) return;
    if (drawer.mode === "new") setCabs([...cabs, { ...d, id: genNumericId(cabs.length) }]);
    else setCabs(cabs.map((c) => (c.id === d.id ? d : c)));
    setDrawer(null);
  };

  const setField = (k, v) => {
    const next = { ...drawer.data, [k]: v };
    if (k === "pwrMax") { const n = parseFloat(v); if (n > 0) next.pwrMed = String(Math.round(n / 3)); }
    setDrawer({ ...drawer, data: next });
  };

  return (
    <div>
      <SectionHeader title="Biblioteca de gabinetes" subtitle={`${cabs.length} cadastrados · cadastre uma vez, use em todos os projetos (salvo neste navegador).`}>
        <DropdownMenu items={[{ label: "Exportar biblioteca (.json)", onClick: () => exportCabs(cabs) }]} />
        <button style={btn("primary")} onClick={openNew}><Plus size={16} /> Novo gabinete</button>
      </SectionHeader>

      <div style={card({ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" })}>
        <input placeholder="Buscar por nome / modelo…" value={q} onChange={(e) => setQ(e.target.value)} style={input({ maxWidth: 280 })} />
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Ordenar</span>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={input({ width: "auto" })}>
          <option value="nome">Nome</option>
          <option value="pwrMax">Potência</option>
        </select>
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>IP</span>
        <select value={ipFilter} onChange={(e) => setIpFilter(e.target.value)} style={input({ width: "auto" })}>
          <option>Todos</option><option>Indoor</option><option>Outdoor</option>
        </select>
        <DropdownMenu label="Colunas" Icon={Columns3} items={COLS.map((c) => ({ label: c.label, active: !!cols[c.key], onClick: () => toggleCol(c.key) }))} />
      </div>

      <div style={card({ padding: 0, overflow: "hidden" })}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ textAlign: "left", color: T.mut, fontSize: 11, textTransform: "uppercase" }}>
              <th style={{ padding: "12px 16px" }}>Modelo</th>
              {COLS.filter((c) => cols[c.key]).map((c) => <th key={c.key} style={{ padding: "12px 16px" }}>{c.label}</th>)}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((c, i) => (
              <tr key={c.id} style={{ background: i % 2 ? T.zebra : "transparent", borderTop: `1px solid ${T.bd}` }}>
                <td style={{ padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                  <Star size={15} onClick={() => setFav(c.id)} style={{ cursor: "pointer", color: prefs.favCabId === c.id ? T.amb : T.dim2, fill: prefs.favCabId === c.id ? T.amb : "none" }} />
                  <b style={{ color: T.txt }}>{c.nome}</b>
                </td>
                {cols.pitch && <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.acM }}>{pitch(c)}</td>}
                {cols.resolucao && <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.mut }}>{c.resX}×{c.resY}</td>}
                {cols.dimensoes && <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.mut }}>{c.dimW}×{c.dimH} mm</td>}
                {cols.pwrMax && <td style={{ padding: "12px 16px", color: T.red, fontWeight: 700 }}>{c.pwrMax}W</td>}
                {cols.pwrMed && <td style={{ padding: "12px 16px", color: T.amb }}>{c.pwrMed}W</td>}
                {cols.peso && <td style={{ padding: "12px 16px", color: T.txt }}>{c.peso} kg</td>}
                {cols.ip && <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, color: c.ip === "Outdoor" ? T.grn : T.acM, background: c.ip === "Outdoor" ? T.grnBg : T.indBg }}>{c.ip}</span></td>}
                <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                  <button style={iconBtn({ marginRight: 6 })} onClick={() => openEdit(c)}><Pencil size={14} /></button>
                  <button style={iconBtn()} onClick={() => remove(c.id)}><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ color: T.dim, fontSize: 12, marginTop: 10 }}><Star size={12} style={{ color: T.amb, fill: T.amb, verticalAlign: "-2px" }} /> O gabinete favorito é carregado automaticamente ao adicionar telas novas nos projetos.</div>

      <Drawer
        open={!!drawer}
        title={drawer?.mode === "new" ? "Novo gabinete" : "Editar gabinete"}
        onClose={() => setDrawer(null)}
        footer={<><button style={btn("subtle")} onClick={() => setDrawer(null)}>Cancelar</button><button style={btn("primary")} onClick={save}>Salvar</button></>}
      >
        {drawer && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {[["nome", "Nome / Modelo", "text"], ["resX", "Resolução X", "number"], ["resY", "Resolução Y", "number"], ["dimW", "Largura (mm)", "number"], ["dimH", "Altura (mm)", "number"], ["peso", "Peso (kg)", "number"], ["pwrMax", "Potência máx. (W)", "number"], ["pwrMed", "Potência méd. (W)", "number"], ["pwrBlack", "Black level (W)", "number"], ["fp", "Fator de potência", "number"], ["brilho", "Brilho (nits)", "number"], ["receivingCard", "Receiving card", "text"]].map(([k, lbl, type]) => (
              <div key={k} style={{ gridColumn: k === "nome" || k === "receivingCard" ? "1 / -1" : "auto" }}>
                <label style={label}>{lbl}{REQUIRED.includes(k) ? " *" : ""}</label>
                <input type={type} value={drawer.data[k]} onChange={(e) => setField(k, e.target.value)} style={input()} />
              </div>
            ))}
            <div>
              <label style={label}>IP</label>
              <select value={drawer.data.ip} onChange={(e) => setField("ip", e.target.value)} style={input()}><option>Indoor</option><option>Outdoor</option></select>
            </div>
            <div>
              <label style={label}>Conector AC</label>
              <select value={drawer.data.conector} onChange={(e) => setField("conector", e.target.value)} style={input()}>
                <option>PowerCON Azul/Branco</option><option>PowerCON TRUE1</option><option>Neutrik True1</option><option>Neutrik True1 TOP</option><option>HangTon SD20</option>
              </select>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function exportCabs(cabs) {
  const blob = new Blob([JSON.stringify({ schema: "ledlab.cabinets.v1", cabinets: cabs }, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "gabinetes-ledlab.json";
  a.click();
}
