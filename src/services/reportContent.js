// services/reportContent.js — conteúdo e helpers COMPARTILHADOS entre o Caderno
// Técnico do DOM (ProjectRelatorio) e o motor de PDF nativo (services/pdf/*).
// Fonte única de propósito: dois renderizadores, um só texto — se divergir em 3
// meses, o bug é aqui, não em dois lugares.

// disciplinas do caderno técnico: cor de índice por seção (produção / vídeo /
// elétrica / estrutura)
export const DISC = { prod: "#475569", video: "#1d4ed8", elec: "#c2410c", estr: "#0f766e" };

// rótulos de status de projeto — espelho dos de components/StatusBadge.jsx (que
// carrega ícones/tema e não entra no chunk puro do PDF). Novo status? Muda lá E cá.
export const STATUS_LABEL = { active: "Em andamento", planned: "Planejamento", done: "Concluído", cancelled: "Cancelado" };

// peso legível: ≥ 1 tonelada vira "t"
export const fmtPeso = (kg) => (kg >= 1000 ? `${(kg / 1000).toFixed(1)} t` : `${Math.round(kg)} kg`);

// "porta 7" · "portas 7–12" · "sem portas" — a faixa que a tela ocupa na numeração
// global do projeto. Tela vazia tem 0 portas: sem isso sairia o intervalo "1–0".
export const portLabel = (off, n, sing) => (n === 0 ? `sem ${sing}s` : n === 1 ? `${sing} ${off + 1}` : `${sing}s ${off + 1}–${off + n}`);

const gcd = (a, b) => (b ? gcd(b, a % b) : a);
// resolução/aspecto/pitch de uma tela a partir do gabinete e da grade
export const videoOf = (t) => {
  const g = t.gabinete || {};
  const pxW = (parseInt(g.resX) || 0) * (t.cols || 0), pxH = (parseInt(g.resY) || 0) * (t.rows || 0);
  const d = gcd(pxW, pxH) || 1;
  const arSimple = pxW && pxH && pxW / d <= 100 && pxH / d <= 100 ? `${pxW / d}:${pxH / d}` : null;
  const dec = pxH ? (pxW / pxH).toFixed(2) : "—";
  const pitch = parseFloat(g.dimW) && parseInt(g.resX) ? parseFloat(g.dimW) / parseInt(g.resX) : 0;
  return { pxW, pxH, mp: (pxW * pxH) / 1e6, ar: arSimple || `${dec}:1`, dec, pitch };
};

// Tamanho do NOME do projeto na capa, em cqi (1cqi = 1% da largura da capa).
// A capa impressa tem 186 mm úteis de altura (A4 paisagem, margem 12 mm) e o
// corpo dela já ocupa ~177. Em 13.5cqi cabem ~12 caracteres por linha, então um
// nome comum de 20 quebrava em duas linhas e a capa ia pra uma SEGUNDA PÁGINA no
// Imprimir do navegador (231,8 mm medidos). O título encolhe pra caber — mesmo
// princípio do PDF nativo (LLC-01), que já fazia isso e o DOM não.
// ~171 = largura útil ÷ avanço médio da grotesca bold com letter-spacing -0.035em.
export const capaNomeCqi = (nome) => Math.max(5.5, Math.min(13.5, 171 / Math.max((nome || "").length || 1, 1)));

// glossário do caderno técnico (leitor leigo/cliente) — termos que aparecem no doc
export const GLOSSARIO = [
  { t: "Pico × Típico", d: "Pico = branco pleno, dimensiona disjuntor e cabo. Típico = consumo médio real do conteúdo, estima energia e gerador." },
  { t: "kVA × kW", d: "kW é a potência real; kVA a aparente (kW ÷ FP). Disjuntor e gerador se dimensionam em kVA/corrente." },
  { t: "FP (fator de potência)", d: "Relação entre potência real e aparente do gabinete (ex.: 0,90). Entra na corrente e no kVA." },
  { t: "Pitch", d: "Distância entre centros de LEDs (mm). Menor pitch = mais resolução por m² e menor distância mínima de visão." },
  { t: "APL / conteúdo", d: "Nível médio da imagem — quanto do branco pleno o vídeo acende, em média. Escala o consumo típico." },
  { t: "Gabinete", d: "Módulo físico de LED (cabinet + receiving card). Menor unidade de montagem e cabeamento." },
  { t: "Tela", d: "Bloco de gabinetes iguais montados juntos — a unidade de projeto do app." },
  { t: "Screen", d: "O sistema como a controladora enxerga, onde correm as portas 1..N. Pode reunir várias telas." },
  { t: "Porta × Circuito", d: "Porta = saída de dados Gigabit da controladora. Circuito = cabo de energia (AC)." },
  { t: "Disjuntor", d: "Proteção do circuito, dimensionada acima da corrente de pico (margem de carga contínua)." },
  { t: "Trifásico (F+F+F+N)", d: "Alimentação em 3 fases + neutro — distribui a carga e reduz a corrente por fase." },
  { t: "Serpentina", d: "Roteamento em zigue-zague dos cabos para minimizar comprimento e cruzamentos." },
  { t: "Ancoragem", d: "Onde a viga (bumper) oferece para pendurar. Não confundir com o ponto de talha que a produção entrega no teto — esse é decisão do rigger." },
  { t: "Bumper", d: "Viga de içamento que recebe a coluna de gabinetes. Quem dimensiona quantos entram — e as ancoragens — é o rigger." },
  { t: "Talha", d: "Equipamento de içamento manual. Sobe a carga pela corrente; a corrente livre é o que impede a talha de trabalhar no fim de curso." },
];

// ── ESTRUTURA (F2) — texto compartilhado da seção "Peso e estrutura" ──
// ⚠️ Escopo cravado (docs/rigging-spec.md §3): esta seção REGISTRA peso e checa
// limite publicado, não dimensiona estrutura. Nunca chamar de "Rigging"; nunca
// usar "ponto" pra ancoragem.

// rótulos dos elos da cadeia — o id vem dos checks de services/rigging.js
export const RIG_ELO = {
  voadoM: { titulo: "Trava entre gabinetes · altura voada", sub: "quanto o fabricante deixa pendurar" },
  voadoQtd: { titulo: "Trava entre gabinetes · gabinetes de altura", sub: "limite publicado em gabinetes, não em metros" },
  empilhadoM: { titulo: "Empilhamento no piso · altura", sub: "o limite empilhado costuma ser menor que o voado" },
};
// último elo da cadeia: o app não tem esse dado e diz isso na cara
export const RIG_ELO_FIM = { titulo: "Bumpers, talhas, treliça e piso", sub: "dimensionamento do rigger — fora do alcance do app" };
export const RIG_PILL = { ok: "dentro", acima: "acima", semDado: "não informado" };

// número de campo: inteiro sem casa, quebrado com vírgula (3 → "3" · 3.5 → "3,5")
export const nRig = (v) => (Number.isInteger(v) ? String(v) : (Math.round(v * 10) / 10).toFixed(1).replace(".", ","));

// A CADEIA de uma tela, pronta pra renderizar: elos do fabricante + o elo que o
// app NÃO alcança. Construtor único — o DOM e o PDF só desenham as linhas, sem
// decidir nada, senão divergem em 3 meses.
// Cada linha: { id, titulo, sub, valor, status, pill }.
export function rigCadeia(rig, gabNome = "") {
  const gab = gabNome || "Gabinete";
  const { fonte, conferido } = rig.limites || {};
  const linhas = (rig.checks || []).map((k) => {
    const meta = RIG_ELO[k.id] || { titulo: k.label, sub: "" };
    const proc = k.status === "semDado" ? "sem dado de fabricante"
      : fonte ? `${fonte}${conferido ? " · conferido" : ""}`
        // limite digitado sem procedência vale menos que limite com manual atrás
        : "limite cadastrado sem procedência";
    return {
      id: k.id,
      titulo: meta.titulo,
      sub: `${gab} — ${proc}`,
      valor: k.limite == null ? `${nRig(k.valor)} ${k.unidade}` : `${nRig(k.valor)} de ${nRig(k.limite)} ${k.unidade}`,
      status: k.status,
      pill: RIG_PILL[k.status],
    };
  });
  linhas.push({ id: "fim", titulo: RIG_ELO_FIM.titulo, sub: RIG_ELO_FIM.sub, valor: "", status: "semDado", pill: "confira com a produção" });
  return linhas;
}

// AGRUPA telas que contam a MESMA história. A cadeia é propriedade do gabinete e
// da geometria, não da tela: num caderno real, 6 telas ×14 do mesmo painel geraram
// 6 blocos byte a byte iguais — mais 6 avisos repetidos. Isso não é informação, é
// ruído: estica a seção e faz o conteúdo virar página à toa.
// Agrupa por CONTEÚDO renderizado — bloco novo só quando diz algo diferente.
export function rigGrupos(telasRig) {
  const out = [];
  const idx = new Map();
  for (const { tela, rig } of telasRig) {
    const gabNome = tela?.gabinete?.nome || "";
    const cadeia = rigCadeia(rig, gabNome);
    const travaExtra = rig.limites?.travaExtraAcima != null && rig.rows > rig.limites.travaExtraAcima;
    const chave = JSON.stringify([gabNome, travaExtra, cadeia.map((e) => [e.titulo, e.sub, e.valor, e.pill])]);
    const achado = idx.get(chave);
    if (achado) { achado.telas.push(tela); continue; }
    const grupo = { telas: [tela], rig, gabNome, cadeia, travaExtra };
    idx.set(chave, grupo);
    out.push(grupo);
  }
  return out;
}

// título do grupo: os nomes das telas que ele cobre (o leitor precisa saber a
// QUAIS paredes aquela cadeia se aplica) e, à direita, a grade quando é uma só
export const rigGrupoTitulo = (g) => g.telas.map((t) => t.nome || "sem nome").join(" · ");
export const rigGrupoMeta = (g) =>
  (g.telas.length === 1 ? `${g.rig.cols}×${g.rig.rows}` : `${g.telas.length} telas · mesma cadeia`) + (g.gabNome ? ` · ${g.gabNome}` : "");

// status do LIMITE de uma tela, pro resumo da tabela (o pior manda)
export const rigStatusTela = (rig) => (rig.limiteAcima ? "acima" : rig.limiteSemDado ? "semDado" : "ok");

// texto do ESTOURO: nomeia o elo que travou e desarma a saída errada ("troca a
// ferragem") — o limite é do fabricante, não da corrente.
export function rigTextoAcima(rig) {
  const falhou = (rig.checks || []).filter((k) => k.status === "acima");
  const lista = falhou.map((k) => `${k.label.toLowerCase()} ${nRig(k.valor)} ${k.unidade} contra ${nRig(k.limite)} ${k.unidade} publicados`).join(" · ");
  const frase = lista.charAt(0).toUpperCase() + lista.slice(1); // abre frase depois do ponto
  return [
    { t: "A parede passa do limite do fabricante — e ferragem não resolve.", b: true },
    { t: ` ${frase}. O limite é da trava entre gabinetes, publicado no manual. Reduza a altura ou divida a parede.` },
  ];
}

// texto do SEM DADO: o vazio é declarado, e diz o que continua válido
export const RIG_SEM_DADO = {
  titulo: "Limite do fabricante não informado",
  partes: [
    { t: "O fabricante não publica — ou ninguém cadastrou — o limite deste gabinete.", b: true },
    { t: " O peso continua válido: sai da grade e do peso do gabinete. O limite de altura, não. Confirme no manual do painel antes da montagem e registre em Gestão › Gabinetes › Especificações Avançadas." },
  ],
};

// texto do SEM PESO: sem o peso do gabinete a seção inteira fica sem chão
export const RIG_SEM_PESO = {
  titulo: "Peso do gabinete não informado",
  partes: [
    { t: "Sem o peso por gabinete não dá pra calcular carga nenhuma.", b: true },
    { t: " Os campos de peso saem em branco de propósito — um zero aqui leria como fato. O peso está na etiqueta do gabinete e no datasheet; registre em Gestão › Gabinetes." },
  ],
};

// aviso de escopo — o contorno do que a seção É (espelha o cabeçalho do motor)
export const AVISO_RIG = {
  titulo: "Planejamento de referência",
  partes: [
    { t: "Os números desta seção são " }, { t: "aritmética sobre os dados do projeto", b: true },
    { t: " e não constituem dimensionamento estrutural. Quem dimensiona, monta e assina o rigging é o " },
    { t: "rigger habilitado", b: true },
    { t: " — no Brasil, com ART de engenheiro. Confira treliça, pontos de talha e carga pontual com a produção antes da montagem." },
  ],
};

// checklist de campo (docs/rigging-spec.md §4) — o conhecimento que não é conta.
// Mesmo texto do artigo "estrutura-checklist" da Base de Conhecimento.
export const CHECK_SUBIR = [
  { b: "Deixe ~1 m de corrente livre", t: " entre o gancho de carga e o corpo da talha — nunca ice até o fim do curso. É onde o parafuso do gancho de carga estoura." },
  { b: "Corrente sem torção", t: ", trava do gancho fechada e carga no berço do gancho, nunca na ponta." },
  { b: "Nivele o bumper", t: " nas cintas antes de subir — parede desnivelada redistribui carga entre as ancoragens de um jeito que nenhuma conta prevê." },
  { b: "Suba as ancoragens juntas", t: ", em incrementos alternados: com talha manual, uma ancoragem à frente da outra pega uma fatia desproporcional da parede." },
  { b: "Contenção contra balanço", t: " quando houver vão livre atrás, corredor de vento ou circulação embaixo — parede voada é pêndulo." },
];

// aviso de segurança da seção de AC — texto único do campo (DOM e PDF)
export const AVISO_AC = {
  titulo: "Atenção — energização",
  partes: [
    { t: "Conectores " }, { t: "powerCON azuis NÃO podem ser (des)conectados sob carga", b: true },
    { t: ". Cabo de 1,5 mm² limita cada circuito em " }, { t: "16 A", b: true },
    { t: " (cálculo a 220 V) — confira a corrente por cabo na tabela antes de energizar." },
  ],
};
