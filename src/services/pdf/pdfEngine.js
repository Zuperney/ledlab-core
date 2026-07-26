// services/pdf/pdfEngine.js — o motor PESADO: pdfmake + fontes. Este módulo só
// entra pelo import() dinâmico do botão "Baixar PDF" — vira chunk separado e
// não pesa no boot do app (o precache do PWA inclui chunk E fontes pro offline).
//
// Fontes EMBUTIDAS: IBM Plex Sans (texto) + IBM Plex Mono (dados) — numeral
// tabular, PT-BR completo e o mesmo desenho em qualquer leitor de PDF. As TTFs
// são as ESTÁTICAS do repo IBM/plex v6.4.1 — as do Google Fonts (variáveis) e as
// woff2 do @ibm/plex-* QUEBRAM o subset do fontkit ("Offset is outside the
// bounds of the DataView"); se atualizar, valide o embed antes. O pdfkit embute
// só o SUBSET usado (~30-60 KB por caderno). Helvetica+Courier standard seguem
// registradas (zero bytes) como fallback.
// o bundle pré-compilado pro browser (o source ESM puxa builtins do Node)
import pdfMake from "pdfmake/build/pdfmake.min.js";
import Helvetica from "pdfmake/build/standard-fonts/Helvetica.js";
import Courier from "pdfmake/build/standard-fonts/Courier.js";
import { buildRelatorioDoc } from "./pdfRelatorio.js";
import { fileName } from "../filenames.js";
import ledlabSquare from "../../assets/ledlab-square.png";
import plexSans from "../../assets/fonts/IBMPlexSans-Regular.ttf";
import plexSansBold from "../../assets/fonts/IBMPlexSans-Bold.ttf";
import plexMono from "../../assets/fonts/IBMPlexMono-Regular.ttf";
import plexMonoBold from "../../assets/fonts/IBMPlexMono-Bold.ttf";

// o vite devolve o asset como caminho RELATIVO ("/src/..." no dev, "./assets/..."
// no build com base './') — o pdfmake só busca por rede quando a URL é ABSOLUTA;
// relativa ele procura num "virtual file system" e explode. Resolve contra a página.
const abs = (u) => new URL(u, document.baseURI).href;

pdfMake.addFonts({
  ...Helvetica,
  ...Courier,
  // o caderno não usa itálico — mapeia pro reto pra nunca faltar variante
  PlexSans: { normal: abs(plexSans), bold: abs(plexSansBold), italics: abs(plexSans), bolditalics: abs(plexSansBold) },
  PlexMono: { normal: abs(plexMono), bold: abs(plexMonoBold), italics: abs(plexMono), bolditalics: abs(plexMonoBold) },
});

// logo do asset → dataURL (pdfmake precisa de base64; o asset já está no precache)
let logoCache = null;
async function logoDataUrl() {
  if (logoCache) return logoCache;
  try {
    const blob = await (await fetch(ledlabSquare)).blob();
    logoCache = await new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsDataURL(blob);
    });
  } catch { logoCache = null; }
  return logoCache;
}

// baixa o Caderno em PDF (nome de arquivo no padrão do app)
export async function baixarRelatorioPdf({ project, tipo, cfg, gerado, numbering, palette, render, cabs }) {
  const logo = await logoDataUrl();
  const doc = buildRelatorioDoc({ project, tipo, cfg, logo, gerado, numbering, palette, render, cabs });
  await pdfMake.createPdf(doc).download(fileName([project.name, "caderno", tipo], "pdf"));
}

// gera um blob-URL (pra pré-visualizar/verificar sem baixar)
export async function relatorioPdfUrl({ project, tipo, cfg, gerado, numbering, palette, render, cabs }) {
  const logo = await logoDataUrl();
  const doc = buildRelatorioDoc({ project, tipo, cfg, logo, gerado, numbering, palette, render, cabs });
  const blob = await pdfMake.createPdf(doc).getBlob();
  return URL.createObjectURL(blob);
}
