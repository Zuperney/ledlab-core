// services/loomex.js — a ponte com o Loomex (editor de arquitetura de sinal AV).
// Gera um .loomex.json que o importador do Loomex aceita direto: o projeto
// "nasce" lá com os equipamentos, as Screens e as conexões já desenhadas.
//
// CONTRATO (verificado no código do Loomex): a única validação do importador é
// `data.blocos` truthy, e NENHUM default é aplicado por bloco/porta/conexão —
// por isso todo campo é emitido sempre, mesmo vazio. O arquivo NÃO leva o campo
// `schema` da casa (ledlab.<coisa>.vN): o importador faz `state = data`, e uma
// chave estranha ficaria pendurada pra sempre no state de lá. O contrato é o
// nome do arquivo (.loomex.json) + a estrutura.
import { projectScreenReport } from "./screenCabling.js";
import { categoriaLabel } from "./equipamentos.js";

// ── Vocabulário canônico de sinal — espelho fiel do SIGNAL_TYPES do Loomex ──
// (id, rótulo exibido, gaveta de filtro, prefixo da etiqueta de cabo)
// É a fonte única do app inteiro: o cadastro de equipamentos usa estes ids.
export const GRUPOS_SINAL = [
  ["video", "Vídeo"],
  ["rede", "Rede"],
  ["controle", "Controle"],
  ["audio", "Áudio"],
  ["energia", "Energia"],
  ["sincronismo", "Sincronismo"],
];

export const SINAIS = [
  { id: "hdmi", label: "HDMI", grupo: "video", pfx: "H" },
  { id: "sdi", label: "SDI", grupo: "video", pfx: "S" },
  { id: "displayport", label: "DisplayPort", grupo: "video", pfx: "DP" },
  { id: "vga", label: "VGA", grupo: "video", pfx: "VGA" },
  { id: "composto", label: "Composto/Componente", grupo: "video", pfx: "CV" },
  { id: "ndi", label: "NDI", grupo: "video", pfx: "NDI" },
  { id: "ethernet", label: "Ethernet", grupo: "rede", pfx: "NET" },
  { id: "fibra", label: "Fibra Óptica", grupo: "rede", pfx: "FIB" },
  { id: "wifi", label: "Wi-Fi", grupo: "rede", pfx: "WIFI" },
  { id: "linkinterno", label: "Link Direto (ex.: 100G)", grupo: "rede", pfx: "LNK" },
  { id: "usb", label: "USB", grupo: "controle", pfx: "U" },
  { id: "thunderbolt", label: "Thunderbolt", grupo: "controle", pfx: "TB" },
  { id: "rs232", label: "RS-232/422", grupo: "controle", pfx: "RS" },
  { id: "gpio", label: "GPIO / Contact Closure", grupo: "controle", pfx: "GPIO" },
  { id: "dmx", label: "DMX", grupo: "controle", pfx: "DMX" },
  { id: "artnet", label: "Art-Net / sACN", grupo: "controle", pfx: "ART" },
  { id: "dante", label: "Dante", grupo: "audio", pfx: "DAN" },
  { id: "aes", label: "AES/EBU", grupo: "audio", pfx: "AES" },
  { id: "analogico", label: "Áudio Analógico", grupo: "audio", pfx: "AUD" },
  { id: "acpower", label: "Energia AC", grupo: "energia", pfx: "PWR" },
  { id: "genlock", label: "Genlock / Referência", grupo: "sincronismo", pfx: "REF" },
  { id: "timecode", label: "Timecode", grupo: "sincronismo", pfx: "TC" },
  { id: "custom", label: "Outro / Custom", grupo: "controle", pfx: "C" },
];

export const sinalLabel = (id) => SINAIS.find((s) => s.id === id)?.label || id;
const sinalPfx = (id) => SINAIS.find((s) => s.id === id)?.pfx || "C";

// ── geometria do Loomex (constantes de lá; altura de bloco é DERIVADA) ──
const ROWH = 22, HEADH = 38, PADH = 8;
const GAP = 40;           // respiro vertical entre blocos (sem sobreposição)
const X_EQUIP = 60;       // coluna dos equipamentos
const X_SCREEN = 460;     // coluna das Screens
const Y0 = 60;
const blockH = (b) => HEADH + Math.max(b.portasEsq.length, b.portasDir.length, 1) * ROWH + PADH;

// bloco Loomex de uma Screen: as portas de dados calculadas viram ENTRADAS
// (grupo rede é não-direcional no Loomex, então ethernet à esquerda é válido)
function screenBloco(r, seq) {
  return {
    id: `SC${seq}`,
    nome: r.nome || `Screen ${seq}`,
    categoria: `LED · ${r.size.w}×${r.size.h}px`,
    x: X_SCREEN, y: 0, w: 230,
    portasEsq: r.ports.map((p) => ({ id: `p${p.n}`, nome: `Porta ${p.n} · ${p.count} gab`, sinal: "ethernet" })),
    portasDir: [],
  };
}

// bloco Loomex de um equipamento (snapshot congelado da Screen)
function equipBloco(snap, seq) {
  const ins = (snap.portas || []).filter((p) => p.dir !== "out");
  const outs = (snap.portas || []).filter((p) => p.dir === "out");
  return {
    id: `EQ${seq}`,
    nome: snap.nome || `Equipamento ${seq}`,
    categoria: [snap.marca, categoriaLabel(snap.categoria)].filter(Boolean).join(" · "),
    x: X_EQUIP, y: 0, w: Number(snap.largura) > 0 ? Number(snap.largura) : 210,
    portasEsq: ins.map((p, i) => ({ id: `in${i + 1}`, nome: p.nome || `In ${i + 1}`, sinal: p.sinal || "custom" })),
    portasDir: outs.map((p, i) => ({ id: `out${i + 1}`, nome: p.nome || `Out ${i + 1}`, sinal: p.sinal || "custom" })),
  };
}

// gera o arquivo completo. Puro: entra o projeto (+ numeração global de cabos),
// sai o objeto pronto pro JSON.stringify.
export function buildLoomexExport(project, numbering = "row-tb-lr") {
  const screensById = new Map((project?.screens || []).map((s) => [s.id, s]));
  const report = projectScreenReport(project, "sinal", numbering);

  // agrupa Screens pelo equipamento vinculado (na ordem de aparição); Screen sem
  // snapshot vira bloco solto, sem conexões — comportamento documentado.
  const groups = new Map();
  const soltas = [];
  for (const r of report) {
    const s = screensById.get(r.id);
    if (s?.equipamento) {
      const key = s.equipamentoId || `solo-${r.id}`;
      if (!groups.has(key)) groups.set(key, { snap: s.equipamento, items: [] });
      groups.get(key).items.push(r);
    } else {
      soltas.push(r);
    }
  }

  const blocos = [];
  const conexoes = [];
  const cabSeq = {};
  const nextCabo = (sinal) => {
    const pfx = sinalPfx(sinal);
    cabSeq[pfx] = (cabSeq[pfx] || 0) + 1;
    return pfx + String(cabSeq[pfx]).padStart(3, "0");
  };

  let eqSeq = 0, scSeq = 0, connSeq = 0;
  let yEq = Y0, ySc = Y0;

  for (const { snap, items } of groups.values()) {
    // alinha o par equipamento × suas Screens no mesmo topo (adjacência visual)
    const y0 = Math.max(yEq, ySc);
    const eq = equipBloco(snap, ++eqSeq);
    eq.y = y0;
    blocos.push(eq);
    yEq = y0 + blockH(eq) + GAP;

    // a fila de saídas que alimenta LED: ethernet; sem nenhuma, cai pra fibra
    const eth = eq.portasDir.filter((p) => p.sinal === "ethernet");
    const fila = eth.length ? eth : eq.portasDir.filter((p) => p.sinal === "fibra");

    let qi = 0;
    ySc = y0;
    for (const r of items) {
      const sc = screenBloco(r, ++scSeq);
      sc.y = ySc;
      blocos.push(sc);
      ySc += blockH(sc) + GAP;
      for (const porta of sc.portasEsq) {
        if (!fila.length) break; // equipamento sem saída de dados — sem conexão
        // fila esgotada → reutiliza em round-robin com tracejado ("A confirmar"
        // no Loomex): sinaliza que falta switch/daisy-chain na vida real.
        const out = fila[qi % fila.length];
        const estilo = qi < fila.length ? "solid" : "dashed";
        qi++;
        conexoes.push({
          id: `c${String(++connSeq).padStart(3, "0")}`,
          origem: { bloco: eq.id, porta: out.id },
          destino: { bloco: sc.id, porta: porta.id },
          sinal: out.sinal,
          cabo: nextCabo(out.sinal),
          estilo,
        });
      }
    }
    // colunas voltam a andar juntas entre grupos
    yEq = ySc = Math.max(yEq, ySc);
  }

  for (const r of soltas) {
    const sc = screenBloco(r, ++scSeq);
    sc.y = ySc;
    blocos.push(sc);
    ySc += blockH(sc) + GAP;
  }

  // modelos pra biblioteca do Loomex (merge aditivo por nome, lá; portas SEM id)
  const vistos = new Set();
  const bibliotecaEquipamentos = [];
  for (const { snap } of groups.values()) {
    const nome = snap.nome || "";
    if (!nome || vistos.has(nome)) continue;
    vistos.add(nome);
    bibliotecaEquipamentos.push({
      nome,
      categoria: [snap.marca, categoriaLabel(snap.categoria)].filter(Boolean).join(" · "),
      largura: Number(snap.largura) > 0 ? Number(snap.largura) : undefined,
      portasEsq: (snap.portas || []).filter((p) => p.dir !== "out").map((p) => ({ nome: p.nome, sinal: p.sinal })),
      portasDir: (snap.portas || []).filter((p) => p.dir === "out").map((p) => ({ nome: p.nome, sinal: p.sinal })),
    });
  }

  return {
    meta: {
      nome: project?.name || "Projeto LedLab",
      cliente: project?.cliente || "",
      local: project?.local || "",
      data: [project?.dataInicio, project?.dataFim].filter(Boolean).join(" – "),
    },
    blocos,
    conexoes,
    zonas: [],
    ativos: SINAIS.map((s) => s.id),
    bibliotecaEquipamentos,
  };
}
