// vista3d/cena.js — o motor de desenho. Imperativo de propósito: quem arrasta
// uma peça muda uma matriz 60 vezes por segundo, e isso não passa pelo React.
//
// Espeque: docs/estrutura3d-spec.md §4.1 e §7.4.
//
// TRÊS DECISÕES QUE SUSTENTAM O DESEMPENHO:
// 1. InstancedMesh por (peça × nível) — 1 draw call por grupo. Em GPU cada draw
//    call custa ~0,1 ms de CPU e o quadro a 60fps tem 16,6 ms: ~100 draw calls
//    comem o quadro inteiro só de overhead.
// 2. LOD por distância — um InstancedMesh por nível, porque InstancedMesh NÃO
//    faz LOD sozinho.
// 3. RENDER SOB DEMANDA — num editor a câmera fica parada quase o tempo todo, e
//    redesenhar pixels idênticos a 60fps aquece o aparelho até o clock cair.

import {
  AmbientLight, Color, DirectionalLight, DynamicDrawUsage, GridHelper, InstancedMesh,
  Matrix4, MeshLambertMaterial, PerspectiveCamera, Raycaster, Scene, Vector2, Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { NIVEIS, geometriaDaPeca, limparCache } from "./geometria.js";
import { caixaEnvolvente } from "../services/estrutura/metricas.js";

// distância da câmera (mm) a partir da qual a peça cai de nível
const CORTES_LOD = [6000, 16000, 40000];
const MAX_INSTANCIAS = 4096;

const nivelPorDistancia = (d) => {
  for (let i = 0; i < CORTES_LOD.length; i++) if (d < CORTES_LOD[i]) return i;
  return NIVEIS.length - 1;
};

export function criarCena(canvas, cores) {
  const renderer = new WebGLRenderer({
    canvas,
    antialias: true,
    // NÃO ligar preserveDrawingBuffer: penaliza todo quadro. A captura pro PDF
    // renderiza e lê na MESMA volta do event loop (ver `capturar`).
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new Scene();
  scene.background = new Color(cores.fundo);

  const camera = new PerspectiveCamera(45, 1, 50, 200000);
  camera.position.set(6000, 4500, 8000);

  scene.add(new AmbientLight(0xffffff, 1.4));
  const sol = new DirectionalLight(0xffffff, 1.9);
  sol.position.set(1, 2, 1.5);
  scene.add(sol);
  const contra = new DirectionalLight(0xffffff, 0.6);
  contra.position.set(-1, 0.4, -1);
  scene.add(contra);

  // grade de 1 m, 40 × 40 m — a referência de escala do palco
  const grade = new GridHelper(40000, 40, cores.gradeEixo, cores.grade);
  scene.add(grade);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 600;
  controls.maxDistance = 120000;
  // não deixa a câmera passar por baixo do chão — desorienta e não mostra nada
  controls.maxPolarAngle = Math.PI / 2 - 0.02;
  controls.target.set(0, 1500, 0);

  // Material BRANCO de propósito: a cor real vem por INSTÂNCIA (setColorAt), e
  // branco × cor da instância = a cor da instância. É o que permite destacar UMA
  // peça sem quebrar o InstancedMesh — pintar o material acenderia o grupo
  // inteiro, e o técnico clicaria numa barra vendo quatro acenderem.
  const material = new MeshLambertMaterial({ color: 0xffffff });
  const corPeca = new Color(cores.peca);
  const corSel = new Color(cores.selecao);

  const grupos = new Map(); // `${catalogoId}#${nivel}` → InstancedMesh
  let pecas = [];
  let selecionada = null;
  let pendente = 0;
  let vivo = true;
  const raycaster = new Raycaster();
  const ponteiro = new Vector2();
  const mat4 = new Matrix4();

  // ── render sob demanda ─────────────────────────────────────
  function desenhar() {
    pendente = 0;
    controls.update();
    renderer.render(scene, camera);
    // o damping continua se movendo depois do gesto: mantém o laço vivo só
    // enquanto desacelera, e para sozinho
    if (controls.enableDamping && movendo) solicitar();
  }
  let movendo = false;
  function solicitar() {
    if (!vivo || pendente) return;
    pendente = requestAnimationFrame(desenhar);
  }

  controls.addEventListener("start", () => { movendo = true; solicitar(); });
  controls.addEventListener("change", () => { agendarLod(); solicitar(); });
  controls.addEventListener("end", () => { movendo = false; agendarLod(); solicitar(); });

  // ── LOD (recalculado com folga, não a cada quadro) ─────────
  let lodTimer = 0;
  function agendarLod() {
    if (lodTimer) return;
    lodTimer = setTimeout(() => { lodTimer = 0; montarGrupos(); solicitar(); }, 200);
  }

  // ── montagem dos InstancedMesh ─────────────────────────────
  function montarGrupos() {
    const alvo = new Map(); // chave → lista de {peca, indice}
    const cam = camera.position;

    for (const [indice, p] of pecas.entries()) {
      const d = Math.hypot(p.matriz[12] - cam.x, p.matriz[13] - cam.y, p.matriz[14] - cam.z);
      const nivel = nivelPorDistancia(d);
      const chave = `${p.catalogoId}#${nivel}`;
      const lista = alvo.get(chave);
      if (lista) lista.push({ p, indice });
      else alvo.set(chave, [{ p, indice }]);
    }

    // some com os grupos que não existem mais
    for (const [chave, malha] of grupos) {
      if (!alvo.has(chave)) {
        scene.remove(malha);
        malha.dispose();
        grupos.delete(chave);
      }
    }

    for (const [chave, itens] of alvo) {
      const [catalogoId, nivel] = chave.split("#");
      let malha = grupos.get(chave);
      // InstancedMesh tem contagem FIXA: se cresceu, refaz
      if (!malha || malha.instanceMatrix.count < itens.length) {
        if (malha) { scene.remove(malha); malha.dispose(); }
        const geo = geometriaDaPeca(catalogoId, Number(nivel));
        if (!geo) continue;
        malha = new InstancedMesh(geo, material, Math.min(MAX_INSTANCIAS, Math.max(16, itens.length * 2)));
        malha.instanceMatrix.setUsage(DynamicDrawUsage);
        malha.frustumCulled = false;
        malha.userData.indices = [];
        scene.add(malha);
        grupos.set(chave, malha);
      }
      malha.count = itens.length;
      malha.userData.indices = itens.map((i) => i.indice);
      itens.forEach((item, i) => malha.setMatrixAt(i, mat4.fromArray(item.p.matriz)));
      malha.instanceMatrix.needsUpdate = true;
      // a esfera envolvente do InstancedMesh é CACHEADA na primeira vez; sem
      // invalidar, o raycast passa a errar peça que se moveu
      malha.boundingSphere = null;
    }

    aplicarSelecao();
  }

  function aplicarSelecao() {
    for (const malha of grupos.values()) {
      const ids = malha.userData.indices ?? [];
      for (let i = 0; i < malha.count; i++) {
        malha.setColorAt(i, ids[i] === selecionada ? corSel : corPeca);
      }
      if (malha.instanceColor) malha.instanceColor.needsUpdate = true;
    }
  }

  // ── API ────────────────────────────────────────────────────
  function sincronizar(montagem) {
    pecas = montagem?.pecas ?? [];
    if (selecionada != null && selecionada >= pecas.length) selecionada = null;
    montarGrupos();
    solicitar();
  }

  function redimensionar() {
    const l = canvas.clientWidth || 1;
    const a = canvas.clientHeight || 1;
    renderer.setSize(l, a, false);
    camera.aspect = l / a;
    camera.updateProjectionMatrix();
    solicitar();
  }

  /** enquadra a estrutura inteira (ou volta ao padrão se estiver vazia) */
  function enquadrar(montagem) {
    const caixa = caixaEnvolvente(montagem ?? { pecas });
    if (!caixa) {
      camera.position.set(6000, 4500, 8000);
      controls.target.set(0, 1500, 0);
      solicitar();
      return;
    }
    const centro = new Vector3(
      (caixa.min[0] + caixa.max[0]) / 2,
      (caixa.min[1] + caixa.max[1]) / 2,
      (caixa.min[2] + caixa.max[2]) / 2,
    );
    const raio = Math.max(
      1000,
      0.5 * Math.hypot(caixa.larguraMm, caixa.alturaMm, caixa.profundidadeMm),
    );
    const dist = (raio / Math.sin((camera.fov * Math.PI) / 360)) * 1.25;
    const dir = new Vector3(0.7, 0.5, 1).normalize();
    camera.position.copy(centro).addScaledVector(dir, dist);
    controls.target.copy(centro);
    controls.update();
    agendarLod();
    solicitar();
  }

  function aproximar(fator) {
    const dir = new Vector3().subVectors(camera.position, controls.target);
    const nova = Math.min(controls.maxDistance, Math.max(controls.minDistance, dir.length() * fator));
    camera.position.copy(controls.target).addScaledVector(dir.normalize(), nova);
    controls.update();
    agendarLod();
    solicitar();
  }

  /**
   * Raycast a partir de um evento de ponteiro → índice da peça, ou null.
   *
   * COM TOLERÂNCIA, e não é frescura: treliça é quase toda AR. Medido nesta
   * cena, um raio matematicamente fino acerta alguma peça em apenas **2,2% dos
   * pixels** — clicar numa diagonal viraria loteria. Quando o tiro direto erra,
   * a gente tenta dois anéis ao redor do ponteiro e pega o primeiro que pega.
   * São 17 raios por clique: irrelevante na frequência de um clique.
   */
  function pecaEm(evento, toleranciaPx = 14) {
    const r = canvas.getBoundingClientRect();
    const alvos = [...grupos.values()];
    if (!alvos.length) return null;

    const tentar = (dx, dy) => {
      ponteiro.x = ((evento.clientX + dx - r.left) / r.width) * 2 - 1;
      ponteiro.y = -((evento.clientY + dy - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ponteiro, camera);
      // lista EXPLÍCITA: nunca `scene.children`, senão grade e luzes entram no raio
      for (const hit of raycaster.intersectObjects(alvos, false)) {
        const idx = hit.object.userData.indices?.[hit.instanceId];
        if (idx != null) return idx;
      }
      return null;
    };

    const direto = tentar(0, 0);
    if (direto != null) return direto;

    for (const raio of [toleranciaPx / 2, toleranciaPx]) {
      for (let a = 0; a < 8; a++) {
        const ang = (a * Math.PI) / 4;
        const achado = tentar(Math.cos(ang) * raio, Math.sin(ang) * raio);
        if (achado != null) return achado;
      }
    }
    return null;
  }

  function selecionar(indice) {
    selecionada = indice;
    aplicarSelecao();
    solicitar();
  }

  function trocarTema(novas) {
    scene.background = new Color(novas.fundo);
    corPeca.set(novas.peca);
    corSel.set(novas.selecao);
    aplicarSelecao();
    grade.material.color = new Color(novas.grade);
    solicitar();
  }

  /**
   * Captura a cena como PNG pra levar ao Caderno (E3).
   * Renderiza e lê na MESMA volta do event loop: por padrão o WebGL descarta o
   * drawing buffer depois do swap e um `toDataURL` atrasado devolveria PRETO.
   */
  function capturar({ largura = 2000, altura = 1400, fundo } = {}) {
    const antes = { l: canvas.clientWidth, a: canvas.clientHeight, bg: scene.background };
    if (fundo) scene.background = new Color(fundo);
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const png = canvas.toDataURL("image/png");
    scene.background = antes.bg;
    renderer.setSize(antes.l, antes.a, false);
    camera.aspect = antes.l / antes.a;
    camera.updateProjectionMatrix();
    solicitar();
    return png;
  }

  function destruir() {
    vivo = false;
    if (pendente) cancelAnimationFrame(pendente);
    if (lodTimer) clearTimeout(lodTimer);
    controls.dispose();
    for (const malha of grupos.values()) { scene.remove(malha); malha.dispose(); }
    grupos.clear();
    material.dispose();
    grade.geometry.dispose();
    limparCache();
    renderer.dispose();
  }

  redimensionar();

  return {
    sincronizar, redimensionar, enquadrar, aproximar, pecaEm, selecionar,
    trocarTema, capturar, destruir, solicitar,
    mostrarGrade: (v) => { grade.visible = v; solicitar(); },
  };
}
