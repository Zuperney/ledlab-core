// services/pdf/pdfEngine.js — o motor PESADO: pdfmake + fontes. Este módulo só
// entra pelo import() dinâmico do botão "Baixar PDF" — vira chunk separado e
// não pesa no boot do app (o precache do PWA o inclui pro offline).
//
// F1 usa as fontes STANDARD do PDF (Helvetica + Courier — zero bytes embutidos,
// Latin-1 cobre o PT-BR). A troca por IBM Plex embutida está no plano (F3).
// o bundle pré-compilado pro browser (o source ESM puxa builtins do Node)
import pdfMake from "pdfmake/build/pdfmake.min.js";
import Helvetica from "pdfmake/build/standard-fonts/Helvetica.js";
import Courier from "pdfmake/build/standard-fonts/Courier.js";
import { buildRelatorioDoc } from "./pdfRelatorio.js";
import { fileName } from "../filenames.js";
import ledlabSquare from "../../assets/ledlab-square.png";

pdfMake.addFonts({ ...Helvetica, ...Courier });

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
export async function baixarRelatorioPdf({ project, tipo, cfg, gerado, numbering, palette }) {
  const logo = await logoDataUrl();
  const doc = buildRelatorioDoc({ project, tipo, cfg, logo, gerado, numbering, palette });
  await pdfMake.createPdf(doc).download(fileName([project.name, "caderno", tipo], "pdf"));
}

// gera um blob-URL (pra pré-visualizar/verificar sem baixar)
export async function relatorioPdfUrl({ project, tipo, cfg, gerado, numbering, palette }) {
  const logo = await logoDataUrl();
  const doc = buildRelatorioDoc({ project, tipo, cfg, logo, gerado, numbering, palette });
  const blob = await pdfMake.createPdf(doc).getBlob();
  return URL.createObjectURL(blob);
}
