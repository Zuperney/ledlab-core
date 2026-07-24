// pages/project/reportUi.jsx — "chassi" visual do Relatório: primitivos reutilizáveis
// no espírito de um dossiê técnico (capa, cabeçalho de seção numerado, hero stats,
// tabela com barra de %, chips). Documento CLARO (tokens PRINT), pronto pra impressão.
// Direto ao ponto — rótulos curtos, sem jargão inflado.
import { PRINT } from "../../ui/tokens.js";
import ledlabSquare from "../../assets/ledlab-square.png";

// tipos da CAPA (Folha Técnica) — grotesca + mono, à la cânone técnico
const COV_SANS = '"Helvetica Neue", Helvetica, Arial, system-ui, sans-serif';
const COV_MONO = 'ui-monospace, "SF Mono", "Cascadia Code", monospace';
const covLabel = { fontFamily: COV_MONO, fontSize: "1.05cqi", fontWeight: 700, letterSpacing: "0.11em", textTransform: "uppercase", color: "#8d8b7e" };

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
export function ReportCoverPage({ docType, name, fields = [], generated, stats = [] }) {
  const docNo = (name || "").toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 22);
  // outer = container de query (inline-size); inner usa cqi → escala com a largura do doc
  return (
    <div style={{ breakAfter: "page", pageBreakAfter: "always", containerType: "inline-size" }}>
      <div style={{ background: "#fafaf7", color: "#14140e", minHeight: "66cqi", display: "flex", flexDirection: "column", padding: "4.2cqi 5.6cqi 3cqi", fontFamily: COV_SANS }}>
        {/* topo: tag lime + marca */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <span style={{ fontFamily: COV_MONO, fontSize: "1.45cqi", fontWeight: 700, letterSpacing: "0.22em", textTransform: "uppercase", color: "#14140e", background: "#ebf51e", padding: "0.95cqi 1.35cqi", borderRadius: "0.5cqi" }}>Caderno Técnico{docType ? ` · ${docType}` : ""}</span>
          <img src={ledlabSquare} alt="LedLab" style={{ width: "7.4cqi", height: "7.4cqi", borderRadius: "1.3cqi", display: "block", flex: "none" }} />
        </div>

        {/* nome + acento lime */}
        <div style={{ fontSize: "13.5cqi", lineHeight: 0.9, fontWeight: 800, letterSpacing: "-0.035em", margin: "2.4cqi 0 0" }}>{name}</div>
        <div style={{ height: "0.3cqi", width: "22cqi", background: "#ebf51e", margin: "1.5cqi 0 0" }} />

        {/* dados: EVENTO (esq) | SPECS (dir), empilhados com pipes hairline */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginTop: "2.2cqi" }}>
          <div style={{ display: "flex", flexDirection: "column", paddingRight: "4.6cqi" }}>
            {fields.map((f, i) => (
              <div key={i} style={{ padding: "0.85cqi 0", borderTop: i ? "0.12cqi solid #dad9d0" : undefined }}>
                <div style={covLabel}>{f.label}</div>
                <div style={{ fontSize: "2.1cqi", fontWeight: 600, marginTop: "0.5cqi", letterSpacing: "-0.005em" }}>{f.value || "—"}</div>
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", paddingLeft: "4.6cqi", borderLeft: "0.12cqi solid #dad9d0" }}>
            {stats.map((s, i) => (
              <div key={i} style={{ padding: "0.85cqi 0", borderTop: i ? "0.12cqi solid #dad9d0" : undefined }}>
                <div style={covLabel}>{s.label}</div>
                <div style={{ fontSize: "2.1cqi", fontWeight: 800, marginTop: "0.5cqi", letterSpacing: "-0.02em", color: s.color || "#14140e" }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* rodapé enxuto */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "2cqi", marginTop: "auto", paddingTop: "1.3cqi", borderTop: "0.12cqi solid #dad9d0", fontFamily: COV_MONO }}>
          <span style={{ fontSize: "1.15cqi", fontWeight: 600, color: "#6c6a5d", letterSpacing: "0.02em" }}>Nº <b style={{ color: "#14140e" }}>{docNo || "—"}</b> · Rev <b style={{ color: "#14140e" }}>A</b>{generated ? ` · Gerado em ${generated}` : ""}</span>
          <span style={{ fontSize: "1.15cqi", fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#14140e" }}>LedLab Core <span style={{ color: "#9b998c" }}>· Engenharia de LED</span></span>
        </div>
      </div>
    </div>
  );
}

// cabeçalho de seção: badge numerado + ícone + tag curta + título + meta à direita + régua.
// `color` = cor da disciplina (produção/elétrica/vídeo); `Icon` = ícone lucide da seção.
export function SectionHead({ n, tag, title, right, color = PRINT.ink, Icon }) {
  return (
    <div style={{ marginBottom: 20, marginTop: 4, breakInside: "avoid" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          {n != null && <div style={{ width: 32, height: 32, borderRadius: 8, background: color, color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14, flexShrink: 0 }}>{String(n).padStart(2, "0")}</div>}
          <div style={{ minWidth: 0 }}>
            {tag && <div style={{ fontSize: 9, letterSpacing: "0.16em", color, fontWeight: 700, textTransform: "uppercase" }}>{tag}</div>}
            <div style={{ fontSize: 16, fontWeight: 800, color: PRINT.ink, letterSpacing: "0.01em", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 8 }}>{Icon && <Icon size={17} style={{ color, flexShrink: 0 }} />}{title}</div>
          </div>
        </div>
        {right && <div style={{ textAlign: "right", fontSize: 9.5, letterSpacing: "0.06em", color: PRINT.dim, textTransform: "uppercase", whiteSpace: "nowrap", lineHeight: 1.5 }}>{right}</div>}
      </div>
      <div style={{ height: 1.5, background: color, marginTop: 9, opacity: 0.85 }} />
    </div>
  );
}

// box de AVISO de alta visibilidade (segurança de campo) — borda forte + texto colorido
// (imprime mesmo sem "Gráficos de segundo plano"; o fundo é bônus). tone: amber | red.
export function WarnBox({ title, children, tone = "amber" }) {
  const c = tone === "red" ? { bg: "#fef2f2", bd: PRINT.red } : { bg: "#fffbeb", bd: PRINT.amb };
  return (
    <div style={{ display: "flex", gap: 11, alignItems: "flex-start", background: c.bg, border: `2px solid ${c.bd}`, borderRadius: 10, padding: "12px 14px", marginBottom: 16, breakInside: "avoid" }}>
      <span style={{ color: c.bd, fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>⚠</span>
      <div style={{ fontSize: 12, color: PRINT.ink, lineHeight: 1.55 }}>
        {title && <div style={{ fontWeight: 800, color: c.bd, textTransform: "uppercase", letterSpacing: "0.04em", fontSize: 11, marginBottom: 3 }}>{title}</div>}
        {children}
      </div>
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
export function DenseTable({ columns, data, maxCols = 2, minSplit = 3, gap = 20 }) {
  const th = { textAlign: "left", padding: "5px 8px", fontSize: 8.5, letterSpacing: "0.04em", color: PRINT.dim, textTransform: "uppercase", borderBottom: `1.5px solid ${PRINT.ink}`, whiteSpace: "nowrap" };
  // números não quebram (evita "9528," numa linha e "2112" na outra); só colunas wrap:true quebram
  const td = { padding: "4px 8px", borderBottom: `1px solid ${PRINT.line}`, fontSize: 11, color: PRINT.ink, verticalAlign: "middle", whiteSpace: "nowrap" };
  const one = (rows, start, key) => (
    <table key={key} style={{ flex: 1, minWidth: 0, borderCollapse: "collapse" }}>
      <thead><tr>{columns.map((c) => <th key={c.key} style={{ ...th, textAlign: c.align || "left" }}>{c.label}</th>)}</tr></thead>
      {/* zebrado obrigatório (manual §10.3): tabela de circuito tem dezenas de
          linhas — sem a zebra a linha visual se perde. Índice GLOBAL (start+i)
          mantém a alternância consistente entre as colunas divididas. */}
      <tbody>{rows.map((r, i) => (
        <tr key={start + i} style={{ background: (start + i) % 2 ? "#f8f8f8" : "transparent" }}>{columns.map((c) => <td key={c.key} style={{ ...td, textAlign: c.align || "left", whiteSpace: c.wrap ? "normal" : "nowrap", ...(c.tdStyle ? c.tdStyle(r) : null) }}>{c.render(r)}</td>)}</tr>
      ))}</tbody>
    </table>
  );
  const cols = Math.min(maxCols, data.length);
  if (cols <= 1 || data.length < minSplit) return one(data, 0, 0);
  // divisão ORGÂNICA: colunas travadas em `cols`, distribuição balanceada — as
  // primeiras (n % cols) colunas levam 1 a mais. Ex.: 4 em 3 col = 2,1,1; 5 = 2,2,1;
  // 8 = 3,3,2. Nunca enche uma coluna inteira antes de passar pra próxima.
  const base = Math.floor(data.length / cols), rem = data.length % cols;
  const groups = []; let idx = 0;
  for (let i = 0; i < cols; i++) { const size = base + (i < rem ? 1 : 0); groups.push({ rows: data.slice(idx, idx + size), start: idx }); idx += size; }
  return (
    <div style={{ display: "flex", gap, alignItems: "flex-start" }}>
      {groups.map((g, i) => one(g.rows, g.start, i))}
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
