// pages/Processadores.jsx — Catálogo de processadores/controladoras (CRUD global).
//
// Biblioteca reutilizável de processadores de vídeo (NovaStar/Colorlight/Brompton…),
// no mesmo padrão da biblioteca de Gabinetes. Cada projeto, na aba Equipamentos,
// atribui um destes a cada Screen — a controladora define a capacidade de porta e se
// tem Free Topology (que guia a régua do cabeamento). Cadastra uma vez, usa em todo
// evento. Fonte única: a fatia `controllers` (persiste + sincroniza).
import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Cpu, Check, Minus } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { genId } from "../services/ids.js";
import { makeController } from "../services/equipamentos.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Z } from "../config/uiConfig.js";
import { T } from "../ui/tokens.js";
import { card, input, btn, iconBtn, dangerIconBtn } from "../ui/styles.js";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Select from "../components/Select.jsx";
import Drawer from "../components/Drawer.jsx";
import NumField from "../components/NumField.jsx";

const EMPTY = { nome: "", marca: "", portas: 4, pxPorta: 655360, freeTopology: false, maxW: 0, maxH: 0, obs: "" };
const REQUIRED = ["nome", "portas", "pxPorta"];
const pxK = (n) => `${Math.round((n || 0) / 1000).toLocaleString("pt-BR")}k`;
const totalMpx = (c) => ((c.portas || 0) * (c.pxPorta || 0)) / 1e6;
const brandOf = (c) => (c.marca && c.marca.trim()) || "Genérico";

export default function Processadores() {
  const { controllers, setControllers } = useLedLabContext();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("marca");
  const [marcaFilter, setMarcaFilter] = useState("Todas");
  const [ftFilter, setFtFilter] = useState("Todos");
  const [drawer, setDrawer] = useState(null); // null | { mode, data }

  const brands = useMemo(() => ["Todas", ...Array.from(new Set(controllers.map(brandOf))).sort()], [controllers]);

  const rows = useMemo(() => {
    let r = controllers.filter((c) => `${c.nome} ${c.marca || ""}`.toLowerCase().includes(q.toLowerCase()));
    if (marcaFilter !== "Todas") r = r.filter((c) => brandOf(c) === marcaFilter);
    if (ftFilter !== "Todos") r = r.filter((c) => (ftFilter === "Com" ? c.freeTopology : !c.freeTopology));
    r = [...r].sort((a, b) => {
      if (sortBy === "portas") return (b.portas || 0) - (a.portas || 0);
      if (sortBy === "capacidade") return totalMpx(b) - totalMpx(a);
      if (sortBy === "marca") return brandOf(a).localeCompare(brandOf(b)) || a.nome.localeCompare(b.nome);
      return (a.nome || "").localeCompare(b.nome || "");
    });
    return r;
  }, [controllers, q, marcaFilter, ftFilter, sortBy]);

  const openNew = () => setDrawer({ mode: "new", data: { ...EMPTY } });
  const openEdit = (c) => setDrawer({ mode: "edit", data: { ...c } });
  const remove = async (c) => {
    if (await confirm({ title: "Excluir processador?", message: `"${c.nome}" sai do catálogo. As Screens que o usavam voltam a escolher a régua na mão.` })) {
      setControllers(controllers.filter((x) => x.id !== c.id));
      toast("Processador excluído");
    }
  };

  const save = () => {
    const raw = drawer.data;
    if (REQUIRED.some((f) => !String(raw[f] ?? "").toString().trim())) return;
    if (drawer.mode === "new") setControllers([...controllers, makeController(genId("ctrl"), raw)]);
    else setControllers(controllers.map((c) => (c.id === raw.id ? { ...c, ...raw } : c)));
    setDrawer(null);
  };

  const setField = (k, v) => setDrawer({ ...drawer, data: { ...drawer.data, [k]: v } });
  const d = drawer?.data;

  return (
    <div>
      <SectionHeader title="Catálogo de processadores" subtitle={`${controllers.length} cadastrados · cadastre uma vez, use em todos os projetos.`}>
        {!isMobile && <button style={btn("primary")} onClick={openNew}><Plus size={16} /> Novo processador</button>}
      </SectionHeader>

      <div style={card({ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" })} className="m-controlbar">
        <input placeholder="Buscar por modelo / marca…" value={q} onChange={(e) => setQ(e.target.value)} style={input({ maxWidth: 280 })} />
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Ordenar</span>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={input({ width: "auto" })}>
          <option value="marca">Marca</option>
          <option value="nome">Modelo</option>
          <option value="portas">Portas</option>
          <option value="capacidade">Capacidade</option>
        </Select>
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Marca</span>
        <Select value={marcaFilter} onChange={(e) => setMarcaFilter(e.target.value)} style={input({ width: "auto" })}>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </Select>
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Free Topology</span>
        <Select value={ftFilter} onChange={(e) => setFtFilter(e.target.value)} style={input({ width: "auto" })}>
          <option>Todos</option><option>Com</option><option>Sem</option>
        </Select>
      </div>

      {!isMobile && (
        <div style={card({ padding: 0, overflow: "hidden" })}>
          <div style={{ overflowX: "auto" }} className="tbl-scroll">
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ textAlign: "left", color: T.mut, fontSize: 11, textTransform: "uppercase" }}>
                  <th style={{ padding: "12px 16px" }}>Modelo</th>
                  <th style={{ padding: "12px 16px" }}>Marca</th>
                  <th style={{ padding: "12px 16px" }}>Portas</th>
                  <th style={{ padding: "12px 16px" }}>px/porta</th>
                  <th style={{ padding: "12px 16px" }}>Capacidade</th>
                  <th style={{ padding: "12px 16px" }}>Free Topology</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rows.map((c, i) => (
                  <tr key={c.id} style={{ background: i % 2 ? T.zebra : "transparent", borderTop: `1px solid ${T.bd}` }}>
                    <td style={{ padding: "12px 16px" }}><b style={{ color: T.txt }}>{c.nome}</b></td>
                    <td style={{ padding: "12px 16px", color: T.txt }}>{brandOf(c)}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.acM, fontWeight: 700 }}>{c.portas}</td>
                    <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.mut }}>{pxK(c.pxPorta)} <span style={{ color: T.dim, fontSize: 11 }}>@8-bit</span></td>
                    <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.mut }}>{totalMpx(c).toFixed(1)} Mpx</td>
                    <td style={{ padding: "12px 16px" }}><FtBadge on={c.freeTopology} /></td>
                    <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                      <button style={iconBtn({ marginRight: 6 })} onClick={() => openEdit(c)}><Pencil size={14} /></button>
                      <button style={dangerIconBtn()} title="Excluir" onClick={() => remove(c)}><Trash2 size={14} /></button>
                    </td>
                  </tr>
                ))}
                {!rows.length && (
                  <tr><td colSpan={7} style={{ padding: 28, textAlign: "center", color: T.dim, fontSize: 13 }}>
                    {controllers.length ? "Nenhum resultado com esses filtros." : "Catálogo vazio — clique em “Novo processador”."}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {isMobile && rows.map((c) => (
        <div key={c.id} style={card({ marginBottom: 10 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <b style={{ color: T.txt }}>{c.nome}</b>
              <div style={{ color: T.dim, fontSize: 12, marginTop: 5, fontFamily: "ui-monospace,monospace" }}>{brandOf(c)} · {c.portas} portas · {pxK(c.pxPorta)} px/porta</div>
              <div style={{ marginTop: 6 }}><FtBadge on={c.freeTopology} /></div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button style={iconBtn({ width: 40, height: 40 })} title="Editar" onClick={() => openEdit(c)}><Pencil size={15} /></button>
              <button style={dangerIconBtn({ width: 40, height: 40 })} title="Excluir" onClick={() => remove(c)}><Trash2 size={15} /></button>
            </div>
          </div>
        </div>
      ))}
      {isMobile && !rows.length && (
        <div style={card({ color: T.dim, fontSize: 13, textAlign: "center", padding: 24 })}>
          {controllers.length ? "Nenhum resultado com esses filtros." : "Catálogo vazio — toque em + pra cadastrar um processador."}
        </div>
      )}

      {isMobile && (
        <button onClick={openNew} title="Novo processador"
          style={{ position: "fixed", right: 16, bottom: "calc(84px + env(safe-area-inset-bottom))", width: 56, height: 56, borderRadius: "50%", background: T.acc, color: "#fff", border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.fab }}>
          <Plus size={24} />
        </button>
      )}

      <div style={{ color: T.dim, fontSize: 12, marginTop: 10, lineHeight: 1.5 }}>
        <Cpu size={12} style={{ verticalAlign: "-2px", color: T.acM }} /> A capacidade por porta é medida a <b>8-bit / 60 Hz</b> (10-bit corta pela metade; refresh menor sobe). <b>Free Topology</b> (cabo livre / régua de pixels) exige o processador ter a função + receiving card compatível; sem ela, a régua fica em Área. Cada Screen escolhe seu processador na aba <b>Equipamentos</b> do projeto.
      </div>

      <Drawer
        open={!!drawer}
        title={drawer?.mode === "new" ? "Novo processador" : "Editar processador"}
        onClose={() => setDrawer(null)}
        footer={<><button style={btn("subtle")} onClick={() => setDrawer(null)}>Cancelar</button><button style={btn("primary")} onClick={save}>Salvar processador</button></>}
      >
        {d && (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <Label>Modelo <Hint color={T.red}>obrigatório</Hint></Label>
              <input placeholder="Ex: VX1000, MX40 Pro, Tessera SX40" value={d.nome} onChange={(e) => setField("nome", e.target.value)} style={input()} />
            </div>
            <div>
              <Label>Marca / Fabricante</Label>
              <input list="ll-proc-marcas" placeholder="Ex: NovaStar, Colorlight, Brompton…" value={d.marca ?? ""} onChange={(e) => setField("marca", e.target.value)} style={input()} />
              <datalist id="ll-proc-marcas">{brands.filter((b) => b !== "Todas").map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <Grid2>
              <NumField lbl="Portas (Gigabit)" value={d.portas} onChange={(v) => setField("portas", v)} />
              <NumField lbl="px/porta (8-bit, 60 Hz)" value={d.pxPorta} onChange={(v) => setField("pxPorta", v)} />
            </Grid2>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, background: T.sel, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ color: T.txt, fontWeight: 600, fontSize: 13 }}>Free Topology</div>
                <div style={{ color: T.dim, fontSize: 11.5, marginTop: 2 }}>Cabo livre / régua de pixels. Sem ela → régua de Área.</div>
              </div>
              <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                {[["Sim", true], ["Não", false]].map(([l, v]) => (
                  <button key={l} onClick={() => setField("freeTopology", v)}
                    style={{ padding: "7px 14px", borderRadius: 7, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${d.freeTopology === v ? T.acc : T.bd}`, background: d.freeTopology === v ? T.acc : T.card, color: d.freeTopology === v ? "#fff" : T.mut }}>{l}</button>
                ))}
              </div>
            </div>
            <Grid2>
              <NumField lbl="Resolução máx — largura (px)" value={d.maxW || 0} onChange={(v) => setField("maxW", v)} />
              <NumField lbl="Resolução máx — altura (px)" value={d.maxH || 0} onChange={(v) => setField("maxH", v)} />
            </Grid2>
            <div style={{ color: T.dim, fontSize: 12 }}>Capacidade total: <b style={{ color: T.acM }}>{totalMpx(d).toFixed(1)} Mpx</b> ({d.portas || 0} × {pxK(d.pxPorta)} px) @ 8-bit / 60 Hz.</div>
            <div>
              <Label>Observações <Hint>(opcional)</Hint></Label>
              <input placeholder="Ex: Free Topology exige RC série A (Armor); descontinuada…" value={d.obs ?? ""} onChange={(e) => setField("obs", e.target.value)} style={input()} />
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

function FtBadge({ on }) {
  return on
    ? <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 999, color: T.grn, background: T.grnBg }}><Check size={12} /> Free Topology</span>
    : <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11.5, fontWeight: 600, padding: "2px 9px", borderRadius: 999, color: T.mut, background: T.sel }}><Minus size={12} /> Área</span>;
}

const Grid2 = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
const Label = ({ children }) => <label style={{ display: "block", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.04em", color: T.mut, marginBottom: 6 }}>{children}</label>;
const Hint = ({ children, color }) => <span style={{ color: color || T.dim, fontWeight: 500 }}>{children}</span>;
