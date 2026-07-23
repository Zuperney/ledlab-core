// pages/project/reportUi.jsx — "chassi" visual do Relatório: primitivos reutilizáveis
// no espírito de um dossiê técnico (capa, cabeçalho de seção numerado, hero stats,
// tabela com barra de %, chips). Documento CLARO (tokens PRINT), pronto pra impressão.
// Direto ao ponto — rótulos curtos, sem jargão inflado.
import { PRINT } from "../../ui/tokens.js";

// capa: faixa escura com a marca + título do projeto + meta e geração
export function ReportCover({ docType, name, meta, generated, config }) {
  return (
    <div style={{ background: PRINT.ink, borderRadius: 14, padding: "24px 26px", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap", marginBottom: 24 }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 9.5, letterSpacing: "0.16em", color: "#c4b5fd", fontWeight: 700, textTransform: "uppercase" }}>Documentação técnica{docType ? ` · ${docType}` : ""}</div>
        <div style={{ fontSize: 25, fontWeight: 800, margin: "6px 0 4px", letterSpacing: "0.01em" }}>{name}</div>
        {meta && <div style={{ color: "#cbd5e1", fontSize: 12.5 }}>{meta}</div>}
      </div>
      <div style={{ textAlign: "right", fontSize: 11, color: "#94a3b8", lineHeight: 1.6, whiteSpace: "nowrap" }}>
        {generated && <div>Gerado em {generated}</div>}
        {config && <div>{config}</div>}
      </div>
    </div>
  );
}

// PÁGINA DE ROSTO dedicada: título + resumo executivo (stats em cards) + rodapé.
// breakAfter:page → o conteúdo começa na página seguinte. É a "capa".
export function ReportCoverPage({ docType, name, meta, generated, config, stats = [] }) {
  return (
    <div style={{ breakAfter: "page", pageBreakAfter: "always", minHeight: 820, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
      <div style={{ background: PRINT.ink, borderRadius: 16, padding: "44px 40px", color: "#fff" }}>
        <div style={{ fontSize: 11, letterSpacing: "0.22em", color: "#c4b5fd", fontWeight: 700, textTransform: "uppercase" }}>Documentação técnica{docType ? ` · ${docType}` : ""}</div>
        <div style={{ fontSize: 46, fontWeight: 800, margin: "18px 0 12px", letterSpacing: "0.01em", lineHeight: 1.04 }}>{name}</div>
        {meta && <div style={{ color: "#cbd5e1", fontSize: 14.5 }}>{meta}</div>}
        <div style={{ height: 1, background: "rgba(255,255,255,0.14)", margin: "26px 0 14px" }} />
        <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 8, fontSize: 12, color: "#94a3b8" }}>
          {config && <span>{config}</span>}
          {generated && <span>Gerado em {generated}</span>}
        </div>
      </div>
      {stats.length > 0 && (
        <div style={{ marginTop: 20, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(118px, 1fr))", gap: 12 }}>
          {stats.map((s, i) => (
            <div key={i} style={{ border: `1px solid ${PRINT.line}`, borderRadius: 12, padding: "13px 15px", background: PRINT.head }}>
              <div style={{ fontSize: 9, letterSpacing: "0.1em", color: PRINT.dim, textTransform: "uppercase" }}>{s.label}</div>
              <div style={{ fontSize: 21, fontWeight: 800, color: s.color || PRINT.ink, marginTop: 4 }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}
      <div style={{ marginTop: 0, paddingTop: 16, display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: `1px solid ${PRINT.line}`, color: PRINT.dim, fontSize: 10, letterSpacing: "0.08em", textTransform: "uppercase" }}>
        <span>LedLab Core · Engenharia de LED</span>
        {docType && <span>{docType}</span>}
      </div>
    </div>
  );
}

// cabeçalho de seção: badge numerado + tag curta + título + meta à direita + régua
export function SectionHead({ n, tag, title, right }) {
  return (
    <div style={{ marginBottom: 20, marginTop: 4, breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {n != null && <div style={{ width: 32, height: 32, borderRadius: 8, background: PRINT.ink, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{String(n).padStart(2, "0")}</div>}
          <div style={{ minWidth: 0 }}>
            {tag && <div style={{ fontSize: 9, letterSpacing: "0.16em", color: PRINT.acc, fontWeight: 700, textTransform: "uppercase" }}>{tag}</div>}
            <div style={{ fontSize: 16, fontWeight: 800, color: PRINT.ink, letterSpacing: "0.01em", textTransform: "uppercase" }}>{title}</div>
          </div>
        </div>
        {right && <div style={{ textAlign: "right", fontSize: 9.5, letterSpacing: "0.06em", color: PRINT.dim, textTransform: "uppercase", whiteSpace: "nowrap", lineHeight: 1.5 }}>{right}</div>}
      </div>
      <div style={{ height: 1.5, background: PRINT.ink, marginTop: 9, opacity: 0.85 }} />
    </div>
  );
}

// sub-cabeçalho de uma subdivisão dentro da seção (ex.: "04.1 · Screen 1")
export function SubHead({ n, title, right }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, margin: "12px 0 6px", breakInside: "avoid", breakAfter: "avoid" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 9, minWidth: 0 }}>
        {n != null && <span style={{ fontSize: 12, fontWeight: 800, color: PRINT.acc, letterSpacing: "0.03em", flexShrink: 0 }}>{n}</span>}
        <span style={{ fontSize: 14, fontWeight: 700, color: PRINT.ink }}>{title}</span>
      </div>
      {right && <span style={{ fontSize: 11, color: PRINT.dim, whiteSpace: "nowrap" }}>{right}</span>}
    </div>
  );
}

// linha de stats rotuladas (label pequeno em caixa-alta + valor grande)
export function StatRow({ items }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 34, marginBottom: 26, marginTop: 4 }}>
      {items.map((s, i) => (
        <div key={i}>
          <div style={{ fontSize: 9.5, letterSpacing: "0.1em", color: PRINT.dim, textTransform: "uppercase" }}>{s.label}</div>
          <div style={{ fontSize: 19, fontWeight: 800, color: s.color || PRINT.ink, marginTop: 2 }}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// número-herói num card (ex.: resolução total)
export function HeroStat({ label, value, sub }) {
  return (
    <div style={{ border: `1px solid ${PRINT.line}`, borderRadius: 14, padding: 20, textAlign: "center", background: PRINT.head, marginBottom: 16, breakInside: "avoid" }}>
      {label && <div style={{ fontSize: 10, letterSpacing: "0.18em", color: PRINT.dim, textTransform: "uppercase", marginBottom: 8 }}>{label}</div>}
      <div style={{ fontSize: 42, fontWeight: 800, color: PRINT.ink, letterSpacing: "-0.01em", lineHeight: 1.05 }}>{value}</div>
      {sub && <div style={{ display: "inline-block", marginTop: 10, background: "#fff", border: `1px solid ${PRINT.line}`, borderRadius: 999, padding: "4px 14px", fontSize: 12, color: PRINT.mut }}>{sub}</div>}
    </div>
  );
}

// chip (hardware, pitch, etc.)
export function Chip({ color, title, sub }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${PRINT.line}`, borderRadius: 8, padding: "7px 12px" }}>
      {color && <span style={{ width: 11, height: 11, borderRadius: 3, background: color, flexShrink: 0 }} />}
      <span style={{ fontSize: 12.5 }}><b style={{ color: PRINT.ink }}>{title}</b>{sub && <span style={{ color: PRINT.dim, marginLeft: 6 }}>{sub}</span>}</span>
    </span>
  );
}

// tabela densa: colunas declarativas + quebra automática em 2 colunas quando há
// muitas linhas (projetos grandes) — mantém TODAS as linhas, mas na metade da altura.
// columns: [{ key, label, align, render(row), tdStyle(row)? }]
export function DenseTable({ columns, data, twoColFrom = 12, gap = 22 }) {
  const th = { textAlign: "left", padding: "5px 8px", fontSize: 8.5, letterSpacing: "0.04em", color: PRINT.dim, textTransform: "uppercase", borderBottom: `1.5px solid ${PRINT.ink}`, whiteSpace: "nowrap" };
  // números não quebram (evita "9528," numa linha e "2112" na outra); só colunas wrap:true quebram
  const td = { padding: "4px 8px", borderBottom: `1px solid ${PRINT.line}`, fontSize: 11, color: PRINT.ink, verticalAlign: "middle", whiteSpace: "nowrap" };
  const one = (rows, start = 0) => (
    <table style={{ flex: 1, minWidth: 0, borderCollapse: "collapse" }}>
      <thead><tr>{columns.map((c) => <th key={c.key} style={{ ...th, textAlign: c.align || "left" }}>{c.label}</th>)}</tr></thead>
      <tbody>{rows.map((r, i) => (
        <tr key={start + i}>{columns.map((c) => <td key={c.key} style={{ ...td, textAlign: c.align || "left", whiteSpace: c.wrap ? "normal" : "nowrap", ...(c.tdStyle ? c.tdStyle(r) : null) }}>{c.render(r)}</td>)}</tr>
      ))}</tbody>
    </table>
  );
  if (data.length < twoColFrom) return one(data);
  const half = Math.ceil(data.length / 2);
  return (
    <div style={{ display: "flex", gap, alignItems: "flex-start" }}>
      {one(data.slice(0, half), 0)}
      {one(data.slice(half), half)}
    </div>
  );
}

// barra de uso (% com cor por faixa; vermelho quando estoura)
export function UsageBar({ pct, color }) {
  const over = pct > 100;
  const c = over ? PRINT.red : color || PRINT.acc;
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 8, minWidth: 130 }}>
      <div style={{ width: 90, height: 6, background: PRINT.line, borderRadius: 999, overflow: "hidden" }}>
        <div style={{ width: `${Math.min(100, Math.max(0, pct))}%`, height: "100%", background: c }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 700, color: over ? PRINT.red : PRINT.ink }}>{pct}%</span>
    </div>
  );
}
