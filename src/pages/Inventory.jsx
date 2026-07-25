// pages/Inventory.jsx — Biblioteca de gabinetes (CRUD, salvo no navegador).
import { useState, useMemo } from "react";
import { Plus, Pencil, Trash2, Star, Columns3, ChevronDown, ChevronUp, Settings } from "lucide-react";
import { useLedLabContext } from "../store/AppContext.jsx";
import { pitch } from "../services/electricalCalc.js";
import { genNumericId } from "../services/ids.js";
import { useIsMobile } from "../hooks/useIsMobile.js";
import { Z } from "../config/uiConfig.js";
import { T } from "../ui/tokens.js";
import { card, input, btn, iconBtn, dangerIconBtn } from "../ui/styles.js";
import { useConfirm, useToast } from "../store/UIContext.jsx";
import SectionHeader from "../components/SectionHeader.jsx";
import DropdownMenu from "../components/DropdownMenu.jsx";
import Select from "../components/Select.jsx";
import Drawer from "../components/Drawer.jsx";

// `rigging` = limites que o FABRICANTE publica. Vazio nunca vira estimativa: o
// Caderno imprime "não informado". Ver docs/rigging-spec.md §3.2.
const EMPTY_RIG = { voadoMaxM: "", empilhadoMaxM: "", porBarraMaxQtd: "", travaExtraAcima: "", trava: "", fonte: "", conferido: false };
const EMPTY = { nome: "", marca: "", resX: "", resY: "", dimW: "", dimH: "", peso: "", pwrMax: "", pwrMed: "", pwrBlack: "", fp: "0.9", ip: "Indoor", brilho: "", receivingCard: "", conector: "PowerCON Azul/Branco", conectorCustom: "", rigging: { ...EMPTY_RIG } };
const TRAVAS = ["", "Chaveta", "Pino transversal", "Outra"];
const firstWord = (s) => (s || "").trim().split(/\s+/)[0] || "";
const REQUIRED = ["nome", "resX", "resY", "dimW", "dimH", "peso", "pwrMax"];
const CONECTORES = ["PowerCON Azul/Branco", "PowerCON TRUE1", "Neutrik True1", "Neutrik True1 TOP", "HangTon SD20", "Personalizado"];

const COLS = [
  { key: "marca", label: "Marca" },
  { key: "pitch", label: "Pitch" },
  { key: "resolucao", label: "Resolução" },
  { key: "dimensoes", label: "Dimensões" },
  { key: "pwrMax", label: "W Máx." },
  { key: "pwrMed", label: "W Méd." },
  { key: "peso", label: "Peso" },
  { key: "ip", label: "IP" },
];

// marca: campo explícito; senão infere pela 1ª palavra do nome (dados antigos); senão "Genérico"
const brandOf = (c) => (c.marca && c.marca.trim()) || firstWord(c.nome) || "Genérico";
const pitchValue = (c) => { const r = parseFloat(c.resX), d = parseFloat(c.dimW); return r > 0 ? d / r : Infinity; };

export default function Inventory() {
  const { cabs, setCabs, prefs, setPrefs } = useLedLabContext();
  const isMobile = useIsMobile();
  const confirm = useConfirm();
  const toast = useToast();
  const [q, setQ] = useState("");
  const [sortBy, setSortBy] = useState("nome");
  const [ipFilter, setIpFilter] = useState("Todos");
  const [marcaFilter, setMarcaFilter] = useState("Todas");
  const [drawer, setDrawer] = useState(null); // null | {mode, data}
  const [advOpen, setAdvOpen] = useState(false);
  const [marcaAuto, setMarcaAuto] = useState(true); // sugerir marca pelo nome até o usuário editar

  const cols = prefs.cabCols || {};
  const toggleCol = (k) => setPrefs({ ...prefs, cabCols: { ...cols, [k]: !cols[k] } });
  const brands = useMemo(() => ["Todas", ...Array.from(new Set(cabs.map(brandOf))).sort()], [cabs]);

  const rows = useMemo(() => {
    let r = cabs.filter((c) => c.nome.toLowerCase().includes(q.toLowerCase()));
    if (ipFilter !== "Todos") r = r.filter((c) => c.ip === ipFilter);
    if (marcaFilter !== "Todas") r = r.filter((c) => brandOf(c) === marcaFilter);
    r = [...r].sort((a, b) => {
      if (sortBy === "pwrMax") return (parseFloat(b.pwrMax) || 0) - (parseFloat(a.pwrMax) || 0);
      if (sortBy === "pitch") return pitchValue(a) - pitchValue(b);
      if (sortBy === "marca") return brandOf(a).localeCompare(brandOf(b)) || a.nome.localeCompare(b.nome);
      return a.nome.localeCompare(b.nome);
    });
    return r;
  }, [cabs, q, ipFilter, marcaFilter, sortBy]);

  const openNew = () => { setDrawer({ mode: "new", data: { ...EMPTY } }); setAdvOpen(false); setMarcaAuto(true); };
  const openEdit = (c) => { setDrawer({ mode: "edit", data: { ...c } }); setAdvOpen(false); setMarcaAuto(false); };
  const remove = async (c) => {
    if (await confirm({ title: "Excluir gabinete?", message: `"${c.nome}" será removido da biblioteca. Esta ação não pode ser desfeita.` })) {
      setCabs(cabs.filter((x) => x.id !== c.id));
      toast("Gabinete excluído");
    }
  };
  const setFav = (id) => setPrefs({ ...prefs, favCabId: prefs.favCabId === id ? null : id });

  const save = () => {
    const raw = drawer.data;
    if (REQUIRED.some((f) => !String(raw[f] || "").trim())) return;
    const d = { ...raw, marca: (raw.marca || "").trim() || "Genérico" };
    if (drawer.mode === "new") setCabs([...cabs, { ...d, id: genNumericId(cabs.length) }]);
    else setCabs(cabs.map((c) => (c.id === d.id ? d : c)));
    setDrawer(null);
  };

  const setField = (k, v) => {
    const next = { ...drawer.data, [k]: v };
    if (k === "pwrMax") { const n = parseFloat(v); next.pwrMed = n > 0 ? String(Math.round(n / 3)) : ""; }
    if (k === "marca") setMarcaAuto(false);
    if (k === "nome" && marcaAuto) next.marca = firstWord(v); // sugere a marca pela 1ª palavra
    setDrawer({ ...drawer, data: next });
  };

  // gabinete antigo (ou da semente) não tem `rigging` — nasce vazio ao editar
  const setRig = (k, v) => {
    const rig = { ...EMPTY_RIG, ...(drawer.data.rigging || {}), [k]: v };
    setDrawer({ ...drawer, data: { ...drawer.data, rigging: rig } });
  };

  const d = drawer?.data;
  const rig = { ...EMPTY_RIG, ...(d?.rigging || {}) };

  return (
    <div>
      <SectionHeader title="Biblioteca de gabinetes" subtitle={`${cabs.length} cadastrados · cadastre uma vez, use em todos os projetos.`}>
        {!isMobile && <button style={btn("primary")} onClick={openNew}><Plus size={16} /> Novo gabinete</button>}
      </SectionHeader>

      <div style={card({ display: "flex", gap: 12, alignItems: "center", marginBottom: 16, flexWrap: "wrap" })} className="m-controlbar">
        <input placeholder="Buscar por nome / modelo…" value={q} onChange={(e) => setQ(e.target.value)} style={input({ maxWidth: 280 })} />
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Ordenar</span>
        <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={input({ width: "auto" })}>
          <option value="nome">Nome</option>
          <option value="marca">Marca</option>
          <option value="pitch">Pixel pitch</option>
          <option value="pwrMax">Potência</option>
        </Select>
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>Marca</span>
        <Select value={marcaFilter} onChange={(e) => setMarcaFilter(e.target.value)} style={input({ width: "auto" })}>
          {brands.map((b) => <option key={b}>{b}</option>)}
        </Select>
        <span style={{ color: T.mut, fontSize: 11, textTransform: "uppercase" }}>IP</span>
        <Select value={ipFilter} onChange={(e) => setIpFilter(e.target.value)} style={input({ width: "auto" })}>
          <option>Todos</option><option>Indoor</option><option>Outdoor</option>
        </Select>
        {!isMobile && <DropdownMenu label="Colunas" triggerLabel="Colunas" Icon={Columns3} items={COLS.map((c) => ({ label: c.label, active: !!cols[c.key], onClick: () => toggleCol(c.key) }))} />}
      </div>

      {!isMobile && (
      <div style={card({ padding: 0, overflow: "hidden" })}>
        <div style={{ overflowX: "auto" }} className="tbl-scroll">
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            {/* cabeçalho FIXO no scroll (NN/g: tabela com mais de uma tela precisa
                de sticky header pra você saber o que está olhando) */}
            <thead>
              <tr style={{ textAlign: "left", color: T.mut, fontSize: 11, textTransform: "uppercase" }}>
                <th style={{ padding: "12px 16px", position: "sticky", top: 0, background: T.card, zIndex: 1 }}>Modelo</th>
                {COLS.filter((c) => cols[c.key]).map((c) => <th key={c.key} style={{ padding: "12px 16px", position: "sticky", top: 0, background: T.card, zIndex: 1 }}>{c.label}</th>)}
                <th style={{ position: "sticky", top: 0, background: T.card, zIndex: 1 }} />
              </tr>
            </thead>
            <tbody>
              {rows.map((c, i) => (
                <tr key={c.id} style={{ background: i % 2 ? T.zebra : "transparent", borderTop: `1px solid ${T.bd}` }}>
                  <td style={{ padding: "12px 16px" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
                      <Star size={15} onClick={() => setFav(c.id)} style={{ cursor: "pointer", color: prefs.favCabId === c.id ? T.amb : T.dim2, fill: prefs.favCabId === c.id ? T.amb : "none" }} />
                      <b style={{ color: T.txt }}>{c.nome}</b>
                    </span>
                  </td>
                  {cols.marca && <td style={{ padding: "12px 16px", color: T.txt }}>{brandOf(c)}</td>}
                  {cols.pitch && <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.acM }}>{pitch(c)}</td>}
                  {cols.resolucao && <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.mut }}>{c.resX}×{c.resY}</td>}
                  {cols.dimensoes && <td style={{ padding: "12px 16px", fontFamily: "ui-monospace,monospace", color: T.mut }}>{c.dimW}×{c.dimH} mm</td>}
                  {cols.pwrMax && <td style={{ padding: "12px 16px", color: T.red, fontWeight: 700 }}>{c.pwrMax}W</td>}
                  {cols.pwrMed && <td style={{ padding: "12px 16px", color: T.amb }}>{c.pwrMed}W</td>}
                  {cols.peso && <td style={{ padding: "12px 16px", color: T.txt }}>{c.peso} kg</td>}
                  {cols.ip && <td style={{ padding: "12px 16px" }}><span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, color: c.ip === "Outdoor" ? T.grn : T.acM, background: c.ip === "Outdoor" ? T.grnBg : T.indBg }}>{c.ip}</span></td>}
                  <td style={{ padding: "12px 16px", textAlign: "right", whiteSpace: "nowrap" }}>
                    <button style={iconBtn({ marginRight: 6 })} onClick={() => openEdit(c)}><Pencil size={14} /></button>
                    <button style={dangerIconBtn()} title="Excluir" onClick={() => remove(c)}><Trash2 size={14} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {isMobile && rows.map((c) => (
        <div key={c.id} style={card({ marginBottom: 10 })}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Star size={16} onClick={() => setFav(c.id)} style={{ cursor: "pointer", flexShrink: 0, color: prefs.favCabId === c.id ? T.amb : T.dim2, fill: prefs.favCabId === c.id ? T.amb : "none" }} />
                <b style={{ color: T.txt }}>{c.nome}</b>
              </div>
              <div style={{ color: T.dim, fontSize: 12, marginTop: 5, fontFamily: "ui-monospace,monospace" }}>{brandOf(c)} · pitch {pitch(c)} · {c.resX}×{c.resY}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, fontSize: 12, color: T.mut }}>
                <span style={{ color: T.red, fontWeight: 700 }}>{c.pwrMax}W</span>
                <span>· {c.peso} kg ·</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 999, color: c.ip === "Outdoor" ? T.grn : T.acM, background: c.ip === "Outdoor" ? T.grnBg : T.indBg }}>{c.ip}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button style={iconBtn({ width: 40, height: 40 })} title="Editar" onClick={() => openEdit(c)}><Pencil size={15} /></button>
              <button style={dangerIconBtn({ width: 40, height: 40 })} title="Excluir" onClick={() => remove(c)}><Trash2 size={15} /></button>
            </div>
          </div>
        </div>
      ))}

      {isMobile && (
        <button onClick={openNew} title="Novo gabinete"
          style={{ position: "fixed", right: 16, bottom: "calc(84px + env(safe-area-inset-bottom))", width: 56, height: 56, borderRadius: "50%", background: T.acc, color: T.accInk, border: "none", boxShadow: "0 8px 24px rgba(0,0,0,0.45)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", zIndex: Z.fab }}>
          <Plus size={24} />
        </button>
      )}

      <div style={{ color: T.dim, fontSize: 12, marginTop: 10 }}><Star size={12} style={{ color: T.amb, fill: T.amb, verticalAlign: "-2px" }} /> O gabinete favorito é carregado automaticamente ao adicionar telas novas nos projetos.</div>

      <Drawer
        open={!!drawer}
        title={drawer?.mode === "new" ? "Novo gabinete" : "Editar gabinete"}
        onClose={() => setDrawer(null)}
        footer={<><button style={btn("subtle")} onClick={() => setDrawer(null)}>Cancelar</button><button style={btn("primary")} onClick={save}>Salvar gabinete</button></>}
      >
        {d && (
          <div style={{ display: "grid", gap: 14 }}>
            <Field lbl="Nome do gabinete" ph="Ex: P2.6 Indoor, P3.9 Outdoor" value={d.nome} onChange={(v) => setField("nome", v)} full />
            <div>
              <Label>Marca / Fabricante <Hint>(vazio = Genérico)</Hint></Label>
              <input list="ll-marcas" placeholder="Ex: ROE, Absen, Unilumin…" value={d.marca ?? ""} onChange={(e) => setField("marca", e.target.value)} style={input()} />
              <datalist id="ll-marcas">{brands.filter((b) => b !== "Todas").map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <Grid2>
              <Field lbl="Resolução — largura (px)" ph="Ex: 256" type="number" value={d.resX} onChange={(v) => setField("resX", v)} />
              <Field lbl="Resolução — altura (px)" ph="Ex: 256" type="number" value={d.resY} onChange={(v) => setField("resY", v)} />
            </Grid2>
            <Grid2>
              <Field lbl="Largura do gabinete (mm)" ph="Ex: 500" type="number" value={d.dimW} onChange={(v) => setField("dimW", v)} />
              <Field lbl="Altura do gabinete (mm)" ph="Ex: 500" type="number" value={d.dimH} onChange={(v) => setField("dimH", v)} />
            </Grid2>
            <Grid2>
              <div>
                <Label>Pixel pitch <Hint>(calculado)</Hint></Label>
                <input readOnly value={pitch(d)} style={input({ color: T.acM, fontFamily: "ui-monospace,monospace", background: T.card })} />
              </div>
              <Field lbl="Peso por gabinete (kg)" ph="Ex: 7.5" type="number" value={d.peso} onChange={(v) => setField("peso", v)} />
            </Grid2>
            <Grid2>
              <div>
                <Label>Consumo máximo (W) <Hint color={T.red}>obrigatório</Hint></Label>
                <input type="number" placeholder="Ex: 300" value={d.pwrMax} onChange={(e) => setField("pwrMax", e.target.value)} style={input()} />
              </div>
              <div>
                <Label>Consumo médio (W) <Hint>auto (1/3 do máx.)</Hint></Label>
                <input readOnly value={d.pwrMed} placeholder="Preenchido automaticamente" style={input({ background: T.card, color: T.mut })} />
              </div>
            </Grid2>
            <div>
              <Label>Consumo no preto (W) <Hint color={T.acM}>black level — base do consumo típico</Hint></Label>
              <input type="number" placeholder="Ex: 45 (datasheet; ~15% do máx. se vazio)" value={d.pwrBlack} onChange={(e) => setField("pwrBlack", e.target.value)} style={input()} />
            </div>

            {/* Especificações avançadas */}
            <button onClick={() => setAdvOpen((o) => !o)} style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", justifyContent: "space-between", background: T.sel, border: `1px solid ${T.bd}`, borderRadius: 8, padding: "10px 12px", color: T.acM, cursor: "pointer", fontWeight: 600, fontSize: 13 }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Settings size={15} /> Especificações Avançadas (opcional)</span>
              {advOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {advOpen && (
              <div style={{ display: "grid", gap: 14 }}>
                <Grid2>
                  <Field lbl="Fator de potência (FP)" type="number" value={d.fp} onChange={(v) => setField("fp", v)} />
                  <div>
                    <Label>Classe IP</Label>
                    <Select value={d.ip} onChange={(e) => setField("ip", e.target.value)} style={input()}><option>Indoor</option><option>Outdoor</option></Select>
                  </div>
                </Grid2>
                <Grid2>
                  <Field lbl="Brilho (nit)" ph="Ex: 5000" type="number" value={d.brilho} onChange={(v) => setField("brilho", v)} />
                  <Field lbl="Receiving card" ph="Ex: MRV328, Armor…" value={d.receivingCard} onChange={(v) => setField("receivingCard", v)} />
                </Grid2>
                <div>
                  <Label>Conector de energia</Label>
                  <Select value={CONECTORES.includes(d.conector) ? d.conector : "Personalizado"} onChange={(e) => setField("conector", e.target.value)} style={input()}>
                    {CONECTORES.map((c) => <option key={c}>{c}</option>)}
                  </Select>
                </div>
                {d.conector === "Personalizado" && (
                  <Field lbl="Conector personalizado" ph="Descreva o conector" value={d.conectorCustom} onChange={(v) => setField("conectorCustom", v)} full />
                )}

                {/* ── Estrutura: limites do FABRICANTE ──
                    Preenche uma vez por gabinete e vale pra todos os projetos.
                    Campo vazio NÃO vira estimativa — o Caderno imprime "não
                    informado". Ver docs/rigging-spec.md §3.2. */}
                <div style={{ borderTop: `1px solid ${T.bd}`, paddingTop: 14, display: "grid", gap: 14 }}>
                  <div>
                    <Label>Estrutura — limites do fabricante <Hint>o que estiver no manual do painel</Hint></Label>
                    <p style={{ color: T.dim, fontSize: 12, margin: "0 0 2px", lineHeight: 1.45 }}>
                      Preencha só o que você confirmou. O que ficar em branco sai como <b style={{ color: T.mut }}>“não informado”</b> no Caderno — nunca como estimativa.
                    </p>
                  </div>
                  <Grid2>
                    <Field lbl="Altura máx. voada (m)" ph="Ex: 10" type="number" value={rig.voadoMaxM} onChange={(v) => setRig("voadoMaxM", v)} />
                    <Field lbl="Altura máx. empilhada (m)" ph="Ex: 6 (costuma ser menor)" type="number" value={rig.empilhadoMaxM} onChange={(v) => setRig("empilhadoMaxM", v)} />
                  </Grid2>
                  <Grid2>
                    <Field lbl="Gabinetes por barra de içamento" ph="Ex: 20" type="number" value={rig.porBarraMaxQtd} onChange={(v) => setRig("porBarraMaxQtd", v)} />
                    <Field lbl="Trava extra acima de (gabinetes)" ph="Ex: 8" type="number" value={rig.travaExtraAcima} onChange={(v) => setRig("travaExtraAcima", v)} />
                  </Grid2>
                  <Grid2>
                    <div>
                      <Label>Tipo de trava <Hint>registro — não entra em cálculo</Hint></Label>
                      <Select value={rig.trava} onChange={(e) => setRig("trava", e.target.value)} style={input()}>
                        {TRAVAS.map((t) => <option key={t || "vazio"} value={t}>{t || "Não informado"}</option>)}
                      </Select>
                    </div>
                    <div>
                      <Label>Procedência</Label>
                      <Select value={rig.conferido ? "sim" : "nao"} onChange={(e) => setRig("conferido", e.target.value === "sim")} style={input()}>
                        <option value="nao">Não confirmado</option>
                        <option value="sim">Confirmado no manual/etiqueta</option>
                      </Select>
                    </div>
                  </Grid2>
                  <Field lbl="Fonte do dado" ph="Ex: Manual MG7S, cap. 3 — ou foto da etiqueta" value={rig.fonte} onChange={(v) => setRig("fonte", v)} full />
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
}

const Grid2 = ({ children }) => <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>;
const Label = ({ children }) => <label style={{ display: "block", textTransform: "uppercase", fontSize: 11, letterSpacing: "0.04em", color: T.mut, marginBottom: 6 }}>{children}</label>;
const Hint = ({ children, color }) => <span style={{ color: color || T.dim, fontWeight: 500 }}>{children}</span>;

function Field({ lbl, value, onChange, type = "text", ph, full }) {
  return (
    <div style={full ? undefined : {}}>
      <Label>{lbl}</Label>
      <input type={type} placeholder={ph} value={value ?? ""} onChange={(e) => onChange(e.target.value)} style={input()} />
    </div>
  );
}
