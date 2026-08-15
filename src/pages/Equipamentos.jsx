// pages/Equipamentos.jsx — Biblioteca de equipamentos de vídeo (CRUD, salvo no
// navegador). Reescrita da antiga página do catálogo certificado (v1.18.0):
// agora é lista LIVRE no estilo dos Gabinetes — nome, marca, categoria e as
// portas nomeadas por tipo de sinal (entradas/saídas). É o que a Screen vincula
// no Cabeamento e o que o export "Loomex" desenha como bloco.
import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Copy, ChevronDown, ChevronUp, Settings, X } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { genId } from "../services/ids.js";
import { makeEquip, makePorta, CATEGORIAS, categoriaLabel } from "../services/equipamentos.js";
import { SINAIS, GRUPOS_SINAL } from "../services/loomex.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Z } from "../config/uiConfig.js";
import { T } from "../ui/tokens.js";
import { card, input, btn, iconBtn, dangerIconBtn } from "../ui/styles.js";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import Select from "../components/Select.jsx";
import Drawer from "../components/Drawer.jsx";

const nIn = (e) => (e.portas || []).filter((p) => p.dir !== "out").length;
const nOut = (e) => (e.portas || []).filter((p) => p.dir === "out").length;
const brandOf = (e) => (e.marca && e.marca.trim()) || "Genérico";

export default function Equipamentos() {
  const { equips, setEquips } = useLedLabContext();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("nome");
  const [catFilter, setCatFilter] = useState("Todas");
  const [drawer, setDrawer] = useState(null); // null | {mode, data}
  const [advOpen, setAdvOpen] = useState(false);

  const rows = useMemo(() => {
    let r = equips.filter((e) => `${e.nome} ${e.marca}`.toLowerCase().includes(q.toLowerCase()));
    if (catFilter !== "Todas") r = r.filter((e) => e.categoria === catFilter);
    r = [...r].sort((a, b) => {
      if (sortBy === "marca") return brandOf(a).localeCompare(brandOf(b)) || a.nome.localeCompare(b.nome);
      if (sortBy === "saidas") return nOut(b) - nOut(a) || a.nome.localeCompare(b.nome);
      return a.nome.localeCompare(b.nome);
    });
    return r;
  }, [equips, q, catFilter, sortBy]);

  const openNew = () => { setDrawer({ mode: "new", data: makeEquip() }); setAdvOpen(false); };
  const openEdit = (e) => { setDrawer({ mode: "edit", data: { ...e, portas: (e.portas || []).map((p) => ({ ...p })) } }); setAdvOpen(false); };
  const duplicate = (e) => {
    setDrawer({ mode: "new", data: { ...e, id: genId("equip"), nome: `${e.nome} (cópia)`, portas: (e.portas || []).map((p) => ({ ...p, id: genId("porta") })) } });
    setAdvOpen(false);
  };
  const remove = async (e) => {
    if (await confirm({ title: "Excluir equipamento?", message: `"${e.nome}" será removido da biblioteca. Screens que já o usam mantêm a cópia congelada. Esta ação não pode ser desfeita.` })) {
      setEquips(equips.filter((x) => x.id !== e.id));
      toast("Equipamento excluído");
    }
  };

  const save = () => {
    const d = drawer.data;
    if (!String(d.nome || "").trim()) return;
    if (drawer.mode === "new") setEquips([...equips, d]);
    else setEquips(equips.map((e) => (e.id === d.id ? d : e)));
    setDrawer(null);
    toast(drawer.mode === "new" ? "Equipamento criado" : "Equipamento salvo");
  };

  const setField = (k, v) => setDrawer({ ...drawer, data: { ...drawer.data, [k]: v } });
  const setPorta = (i, patch) => setField("portas", drawer.data.portas.map((p, j) => (j === i ? { ...p, ...patch } : p)));
  const addPorta = (dir) => setField("portas", [...drawer.data.portas, makePorta({ dir, sinal: dir === "out" ? "ethernet" : "hdmi" })]);
  const removePorta = (i) => setField("portas", drawer.data.portas.filter((_, j) => j !== i));

  const d = drawer?.data;

  return (
    <div>
      <SectionHeader title="Equipamentos" subtitle={`${equips.length} na biblioteca · portas prontas, é só vincular na Screen.`}>
        {!isMobile && <button style={btn("primary")} onClick={openNew}><Plus size={16} /> Novo equipamento</button>}
      </SectionHeader>

      <div style={card({ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" })} className="m-controlbar">
        <input placeholder="Buscar por nome / marca…" value={q} onChange={(e) => setQ(e.target.value)} style={input({ maxWidth: 280 })} />
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Ordenar</span>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={input({ width: "auto" })}>
          <option value="nome">Nome</option>
          <option value="marca">Marca</option>
          <option value="saidas">Saídas</option>
        </Select>
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Categoria</span>
        <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={input({ width: "auto" })}>
          <option value="Todas">Todas</option>
          {CATEGORIAS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </Select>
      </div>

      {!isMobile && (
      <div style={card({ padding: 0, overflow: "hidden" })}>
        <div style={{ overflowX: "auto" }} className="tbl-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ textAlign: "left", color: T.mut, fontSize: 11, textTransform: "uppercase" }}>
                {["Equipamento", "Marca", "Categoria", "Entradas", "Saídas", ""].map((h, i) => (
                  <th key={i} style={{ padding: "12px 16px", position: "sticky", top: 0, background: T.card, zIndex: 1 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((e, i) => (
                <tr key={e.id} style={{ background: i % 2 ? T.zebra : "transparent", borderTop: `1px solid ${T.bd}` }}>
                  <td style={{ padding: "12px 16px" }}><b style={{ color: T.txt }}>{e.nome}</b></td>
                  <td style={{ padding: "12px 16px", color: T.txt }}>{brandOf(e)}</td>
                  <td style={{ padding: "12px 16px", color: T.mut }}>{categoriaLabel(e.categoria)}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.mut }}>{nIn(e)}</td>
                  <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.acM }}>{nOut(e)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={iconBtn({ marginRight: 6 })} title="Duplicar" aria-label="Duplicar" onClick={() => duplicate(e)}><Copy size={14} /></button>
                    <button style={iconBtn({ marginRight: 6 })} title="Editar" aria-label="Editar" onClick={() => openEdit(e)}><Pencil size={14} /></button>
                    <button style={dangerIconBtn()} title="Excluir" aria-label="Excluir" onClick={() => remove(e)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {isMobile && rows.map((e) => (
        <div key={e.id} style={card({ marginBottom: 10 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <b style={{ color: T.txt }}>{e.nome}</b>
              <div style={{ color: T.dim, fontSize: 12, marginTop: 5 }}>{brandOf(e)} · {categoriaLabel(e.categoria)}</div>
              <div style={{ marginTop: 6, fontSize: 12, color: T.mut, fontFamily: "ui-monospace,monospace" }}>{nIn(e)} in · {nOut(e)} out</div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button style={iconBtn({ width: 40, height: 40 })} title="Duplicar" aria-label="Duplicar" onClick={() => duplicate(e)}><Copy size={15} /></button>
              <button style={iconBtn({ width: 40, height: 40 })} title="Editar" aria-label="Editar" onClick={() => openEdit(e)}><Pencil size={15} /></button>
              <button style={dangerIconBtn({ width: 40, height: 40 })} title="Excluir" aria-label="Excluir" onClick={() => remove(e)}><Trash2 size={15} /></button>
            </div>
          </div>
        </div>
      ))}

      {isMobile && (
        <button onClick={openNew} title="Novo equipamento" aria-label="Novo equipamento"
          style={{ position: "fixed", right: 16, bottom: "calc(84px + env(safe-area-inset-bottom))", width: 56, height: 56, borderRadius: "50%", background: T.acc, color: T.accInk, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.fab }}>
          <Plus size={24} />
        </button>
      )}

      <div style={{ color: T.dim, fontSize: 12, marginTop: 10 }}>Vincule o equipamento à Screen no Cabeamento (Avançado da Screen) — as saídas de dados dele viram as conexões do export Loomex.</div>

      <Drawer
        open={!!drawer}
        title={drawer?.mode === "new" ? "Novo equipamento" : "Editar equipamento"}
        onClose={() => setDrawer(null)}
        footer={<><button style={btn("subtle")} onClick={() => setDrawer(null)}>Cancelar</button><button style={btn("primary")} onClick={save}>Salvar equipamento</button></>}
      >
        {d && (
          <div style={{ display: "grid", gap: 14 }}>
            <div>
              <Label>Nome do equipamento <Hint color={T.red}>obrigatório</Hint></Label>
              <input placeholder="Ex.: VX1000 Pro, HDX Compact 4K" value={d.nome} onChange={(e) => setField("nome", e.target.value)} style={input()} />
            </div>
            <Grid2>
              <div>
                <Label>Marca <Hint>(vazio = Genérico)</Hint></Label>
                <input placeholder="Ex.: NovaStar, Colorlight…" value={d.marca ?? ""} onChange={(e) => setField("marca", e.target.value)} style={input()} />
              </div>
              <div>
                <Label>Categoria</Label>
                <Select value={d.categoria} onChange={(e) => setField("categoria", e.target.value)} style={input()}>
                  {CATEGORIAS.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
                </Select>
              </div>
            </Grid2>

            {/* portas — o coração do cadastro: nome + direção + tipo de sinal */}
            <div>
              <Label>Portas <Hint>entrada à esquerda do bloco, saída à direita</Hint></Label>
              {d.portas.length === 0 && (
                <div style={{ color: T.dim, fontSize: 12.5, padding: "10px 0" }}>Nenhuma porta ainda — adicione as entradas de vídeo e as saídas de dados.</div>
              )}
              <div style={{ display: "grid", gap: 6 }}>
                {/* direção sem dropdown: as bolinhas espelham o bloco do Loomex —
                    acesa à ESQUERDA do nome = entrada, acesa à DIREITA (antes do
                    remover) = saída. Clicar numa acende ela e apaga a outra. */}
                {d.portas.map((p, i) => (
                  <div key={p.id} style={{ display: "grid", gridTemplateColumns: "38px 1fr minmax(120px, 150px) 38px 38px", gap: 6, alignItems: "center" }}>
                    <SideDot side="in" active={p.dir !== "out"} onClick={() => setPorta(i, { dir: "in" })} />
                    <input placeholder={p.dir === "out" ? "Ex.: Porta 1" : "Ex.: HDMI In"} value={p.nome} onChange={(e) => setPorta(i, { nome: e.target.value })} style={input({ minHeight: 38 })} />
                    {/* Select da casa não lê <optgroup> — grupo entra no rótulo */}
                    <Select value={p.sinal} onChange={(e) => setPorta(i, { sinal: e.target.value })} style={input({ minHeight: 38 })}>
                      {GRUPOS_SINAL.flatMap(([gid, glabel]) =>
                        SINAIS.filter((s) => s.grupo === gid).map((s) => <option key={s.id} value={s.id}>{`${glabel} · ${s.label}`}</option>)
                      )}
                    </Select>
                    <SideDot side="out" active={p.dir === "out"} onClick={() => setPorta(i, { dir: "out" })} />
                    <button style={dangerIconBtn({ width: 38, height: 38 })} title="Remover porta" aria-label="Remover porta" onClick={() => removePorta(i)}><X size={14} /></button>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                <button style={btn("ghost")} onClick={() => addPorta("in")}><Plus size={14} /> Adicionar entrada</button>
                <button style={btn("ghost")} onClick={() => addPorta("out")}><Plus size={14} /> Adicionar saída</button>
              </div>
              {nOut(d) > 0 && !d.portas.some((p) => p.dir === "out" && (p.sinal === "ethernet" || p.sinal === "fibra")) && (
                <div style={{ color: T.amb, fontSize: 12, marginTop: 8 }}>Sem saída Ethernet ou Fibra Óptica, este equipamento não alimenta LED — serve pro desenho, não pro vínculo com Screen.</div>
              )}
            </div>

            <button onClick={() => setAdvOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between", background: T.sel, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px", color: T.acM, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Settings size={15} /> Avançado (opcional)</span>
              {advOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {advOpen && (
              <div style={{ display: "grid", gap: 14 }}>
                <Grid2>
                  <div>
                    <Label>Pixels por porta <Hint>(vazio = padrão da régua)</Hint></Label>
                    <input type="number" placeholder="Ex.: 650000" value={d.pxPorta || ""} onChange={(e) => setField("pxPorta", e.target.value === "" ? 0 : Number(e.target.value))} style={input()} />
                  </div>
                  <div>
                    <Label>Largura do bloco no Loomex <Hint>(vazio = padrão)</Hint></Label>
                    <input type="number" placeholder="Ex.: 260" value={d.largura || ""} onChange={(e) => setField("largura", e.target.value === "" ? 0 : Number(e.target.value))} style={input()} />
                  </div>
                </Grid2>
                <div>
                  <Label>Observações</Label>
                  <input placeholder="Ex.: só 8-bit; usar com fibra acima de 100 m." value={d.obs ?? ""} onChange={(e) => setField("obs", e.target.value)} style={input()} />
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

// bolinha de direção da porta — a mesma metáfora do bloco no Loomex: o ponto de
// ENTRADA fica na borda esquerda, o de SAÍDA na direita. Toggle com estado visível
// (§5.1.5): acesa = sel + acM; apagada = só o contorno. Alvo de toque 38px.
function SideDot({ side, active, onClick }) {
  const titulo = side === "in" ? "Entrada (lado esquerdo do bloco)" : "Saída (lado direito do bloco)";
  return (
    <button type="button" onClick={onClick} aria-pressed={active} title={titulo} aria-label={titulo}
      style={{ width: 38, height: 38, display: "inline-flex", alignItems: "center", justifyContent: "center", background: active ? T.sel : "transparent", border: `1px solid ${active ? T.acc : T.bd}`, borderRadius: 8, cursor: "pointer", padding: 0 }}>
      <span style={{ width: 12, height: 12, borderRadius: "50%", background: active ? T.acM : "transparent", border: `2px solid ${active ? T.acM : T.dim2}`, display: "block" }} />
    </button>
  );
}

const Grid2 = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
const Label = ({ children }) => <label style={{ display: "block", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.04em", color: T.mut, marginBottom: 6 }}>{children}</label>;
const Hint = ({ children, color }) => <span style={{ color: color || T.dim, fontWeight: 500 }}>{children}</span>;
