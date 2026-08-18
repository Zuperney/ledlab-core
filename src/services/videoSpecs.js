// services/videoSpecs.js — o MANUAL DE CONTEÚDO do projeto: o que o pessoal de
// vídeo precisa saber pra entregar arquivo que roda no evento.
//
// Por que existe: o caderno sempre soube a resolução do painel, mas quem monta o
// conteúdo também precisa do resto do combinado — formato de arquivo, codec, taxa
// de quadros, varredura, aspecto de pixel. Isso vivia no WhatsApp e chegava
// errado (arquivo H.264 num Resolume que quer DXV, 25 fps num show a 60).
//
// Os padrões abaixo são os da casa (Resolume + DXV3, o combo que roda no rental
// brasileiro). Ficam EDITÁVEIS por projeto: evento com media server de outra
// marca troca o que precisar em Dados, e a folha do caderno segue o projeto.
export const VIDEO_PADRAO = {
  imagens: "PNG",
  software: "Resolume Arena",
  arquivo: ".MOV",
  codec: "DXV3 Normal Quality",
  fps: "30/60 fps",
  varredura: "Progressiva",
  pixel: "Square Pixel",
};

// rótulo de cada campo — fonte única pro formulário (Dados) e pra folha do
// caderno (DOM e PDF), na ordem em que saem no papel
export const VIDEO_CAMPOS = [
  ["imagens", "Imagens estáticas", "Ex.: PNG"],
  ["software", "Software de vídeo", "Ex.: Resolume Arena"],
  ["arquivo", "Arquivo de vídeo", "Ex.: .MOV"],
  ["codec", "Codec de vídeo", "Ex.: DXV3 Normal Quality"],
  ["fps", "Taxa de quadros", "Ex.: 30/60 fps"],
  ["varredura", "Varredura", "Ex.: Progressiva"],
  ["pixel", "Aspecto de pixel", "Ex.: Square Pixel"],
];

// specs do projeto com o padrão da casa por baixo. Campo apagado no formulário
// volta pro padrão em vez de sair vazio no papel — folha de conteúdo com lacuna
// é convite pra chegar arquivo errado.
export function videoSpecs(project) {
  const salvo = project?.video || {};
  const out = {};
  for (const [k] of VIDEO_CAMPOS) {
    const v = String(salvo[k] ?? "").trim();
    out[k] = v || VIDEO_PADRAO[k];
  }
  return out;
}
