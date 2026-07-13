// services/filenames.js — nomes de arquivo padronizados: projeto_tipo_timestamp.
// Evita nome manual sem padrão nos PDFs (relatório/recibo/reembolso), nos PNGs
// (test card/composição) e nos .json (projeto/backup/gabinetes).

// slug seguro p/ nome de arquivo: sem acento, minúsculo, espaços/símbolos → "-"
const slug = (s) =>
  (s || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // remove os acentos decompostos
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

// carimbo de data/hora LOCAL, ordenável e seguro p/ arquivo: 2026-07-13_1852
export function fileStamp(d = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(d.getHours())}${p(d.getMinutes())}`;
}

// junta as partes (com slug), acrescenta o carimbo e (se houver) a extensão.
// ex.: fileName(["Matsuri", "relatório", "Completo"], "pdf")
//      -> "matsuri_relatorio_completo_2026-07-13_1852.pdf"
// sem ext (p/ título do PDF via impressão): "matsuri_relatorio_completo_2026-07-13_1852"
export function fileName(parts, ext) {
  const base = (Array.isArray(parts) ? parts : [parts]).map(slug).filter(Boolean).join("_") || "ledlab";
  const full = `${base}_${fileStamp()}`;
  return ext ? `${full}.${ext}` : full;
}

// imprime (Salvar como PDF do navegador) usando `title` como nome sugerido do arquivo.
// O navegador usa document.title como nome do PDF; restauramos o título ao terminar.
export function printAs(title) {
  if (typeof document === "undefined") return;
  const prev = document.title;
  document.title = title;
  const restore = () => {
    document.title = prev;
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore);
  window.print();
}
