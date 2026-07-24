// pages/Knowledge.jsx — Base de Conhecimento (artigos por categoria).
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { KB_CATEGORIES, KB_ARTICLES } from "../data/knowledge.js";
import { T } from "../ui/tokens.js";
import { card, btn } from "../ui/styles.js";
import SectionHeader from "../components/SectionHeader.jsx";

function Block({ b }) {
  if (b.t === "p") return <p style={{ color: T.mut, lineHeight: 1.7 }}>{b.text}</p>;
  if (b.t === "note") return <div style={{ background: T.strip, border: `1px solid ${T.bd}`, borderRadius: 8, padding: 12, color: T.acM, fontSize: 13 }}>{b.text}</div>;
  if (b.t === "ul") return <ul style={{ color: T.mut, lineHeight: 1.8 }}>{b.items.map((i, k) => <li key={k}>{i}</li>)}</ul>;
  if (b.t === "kv") return (
    <table style={{ borderCollapse: "collapse", width: "100%" }}>
      <tbody>{b.rows.map((r, k) => <tr key={k}><td style={{ padding: "6px 10px", borderBottom: `1px solid ${T.bd}`, color: T.txt }}>{r[0]}</td><td style={{ padding: "6px 10px", borderBottom: `1px solid ${T.bd}`, color: T.acM, fontFamily: "ui-monospace,monospace", textAlign: "right" }}>{r[1]}</td></tr>)}</tbody>
    </table>
  );
  if (b.t === "table") return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 380, fontSize: 13 }}>
        <thead><tr>{b.cols.map((c, k) => <th key={k} style={{ textAlign: "left", padding: "6px 10px", borderBottom: `1px solid ${T.bd}`, color: T.mut, fontSize: 11, textTransform: "uppercase" }}>{c}</th>)}</tr></thead>
        <tbody>{b.rows.map((r, k) => <tr key={k}>{r.map((cell, j) => <td key={j} style={{ padding: "6px 10px", borderBottom: `1px solid ${T.bd}`, color: j === 0 ? T.txt : T.mut, fontWeight: j === 0 ? 600 : 400, fontFamily: j === 0 ? "inherit" : "ui-monospace,monospace" }}>{cell}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
  if (b.t === "links") return (
    <ul style={{ color: T.mut, lineHeight: 1.9, listStyle: "none", padding: 0, margin: 0 }}>
      {b.items.map((i, k) => <li key={k} style={{ marginBottom: 4 }}><a href={i.url} target="_blank" rel="noopener noreferrer" style={{ color: T.acM, textDecoration: "none", fontWeight: 600 }}>{i.label} ↗</a></li>)}
    </ul>
  );
  return null;
}

export default function Knowledge() {
  const [cat, setCat] = useState("Todos");
  const [open, setOpen] = useState(null);

  if (open) {
    const a = KB_ARTICLES.find((x) => x.id === open);
    return (
      <div>
        <button style={btn("ghost", { marginBottom: 16 })} onClick={() => setOpen(null)}><ArrowLeft size={15} /> Voltar</button>
        <div style={card({ maxWidth: 760 })}>
          <div style={{ color: T.acM, fontSize: 12, fontWeight: 700, textTransform: "uppercase" }}>{a.category}</div>
          <h2 style={{ color: T.txt, margin: "6px 0 4px" }}>{a.title}</h2>
          <p style={{ color: T.mut, marginTop: 0 }}>{a.summary}</p>
          {a.sections.map((s, i) => (
            <div key={i} style={{ marginTop: 20 }}>
              <h3 style={{ color: T.txt, borderBottom: `1px solid ${T.bd}`, paddingBottom: 6 }}>{s.h}</h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>{s.blocks.map((b, k) => <Block key={k} b={b} />)}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const cats = ["Todos", ...KB_CATEGORIES];
  const list = cat === "Todos" ? KB_ARTICLES : KB_ARTICLES.filter((a) => a.category === cat);

  return (
    <div>
      <SectionHeader title="Base de Conhecimento" subtitle={`${KB_ARTICLES.length} artigos sobre energia, sinal, cabeamento e painéis.`} />
      <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
        {cats.map((c) => <button key={c} onClick={() => setCat(c)} style={{ padding: "6px 12px", borderRadius: 999, cursor: "pointer", fontSize: 13, fontWeight: 600, border: `1px solid ${cat === c ? T.acc : T.bd}`, background: cat === c ? T.acc : "transparent", color: cat === c ? T.accInk : T.mut }}>{c}</button>)}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px,1fr))", gap: 12 }}>
        {list.map((a) => (
          <button key={a.id} onClick={() => setOpen(a.id)} style={card({ textAlign: "left", cursor: "pointer" })}>
            <div style={{ color: T.acM, fontSize: 11, fontWeight: 700, textTransform: "uppercase" }}>{a.category}</div>
            <div style={{ color: T.txt, fontWeight: 600, margin: "6px 0 4px" }}>{a.title}</div>
            <div style={{ color: T.dim, fontSize: 13 }}>{a.summary}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
