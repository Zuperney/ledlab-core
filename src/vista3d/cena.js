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
  AmbientLight, BufferGeometry, CanvasTexture, Color, ConeGeometry, DirectionalLight,
  DynamicDrawUsage, GridHelper, InstancedMesh, Line, LineBasicMaterial,
  Matrix4, Mesh, MeshBasicMaterial, MeshLambertMaterial, PerspectiveCamera, Plane, Raycaster,
  Scene, SphereGeometry, Sprite, SpriteMaterial, Vector2, Vector3,
  WebGLRenderer,
} from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { NIVEIS, geometriaDaPeca, geometriaPainel, limparCache } from "./geometria.js";
import { caixaEnvolvente, centroDoChao, nivelDoChao } from "../services/estrutura/metricas.js";

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
  const LADO_DA_GRADE = 40000;
  const grade = new GridHelper(LADO_DA_GRADE, 40, cores.gradeEixo, cores.grade);
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
  const corConflito = new Color(cores.conflito ?? "#dc2626");

  // COR POR PEÇA DO CATÁLOGO (§8.6, D1). Vem de fora — a cena não sabe o que é
  // uma barra de 2 m, só recebe `catalogoId → hex`. Sem mapa, tudo na cor do
  // tema, que é como a cena nasceu.
  let coresPorPeca = cores.porPeca ?? null;
  const cacheCor = new Map();
  function corDoCatalogo(catalogoId) {
    const hex = coresPorPeca?.[catalogoId];
    if (!hex) return corPeca;
    let c = cacheCor.get(hex);
    if (!c) { c = new Color(hex); cacheCor.set(hex, c); }
    return c;
  }

  // ── marcadores de conector e prévia fantasma (modo Montar) ─
  // O conector é invisível na peça real; aqui ele vira uma bolinha CLICÁVEL —
  // é o alvo do encaixe, e ter alvo é o que separa montar de adivinhar.
  const geoConector = new SphereGeometry(75, 10, 10);
  const matConector = new MeshBasicMaterial({ color: cores.selecao, transparent: true, opacity: 0.4 });
  const matConectorAtivo = new MeshBasicMaterial({ color: cores.selecao, transparent: true, opacity: 0.9 });
  const matFantasma = new MeshLambertMaterial({
    color: cores.selecao, transparent: true, opacity: 0.45, depthWrite: false,
  });
  let malhaConectores = null;
  let listaConectores = [];
  let conectorAtivo = null;
  let fantasma = null;

  // ── os PAINÉIS de LED (E4) ─────────────────────────────────
  // Uma malha por painel, e não InstancedMesh: cada parede tem a medida dela, e
  // são poucas. O material é o do painel APAGADO — é registro de montagem, não
  // simulação de imagem; painel aceso na cena viraria expectativa de preview.
  const matPainel = new MeshLambertMaterial({ color: 0x2b2f3a });
  const matPainelSel = new MeshLambertMaterial({ color: cores.selecao });
  const matPainelRuim = new MeshLambertMaterial({ color: cores.conflito ?? "#dc2626" });
  const malhasDePainel = new Map(); // id → Mesh

  function limparPaineis() {
    for (const m of malhasDePainel.values()) {
      scene.remove(m);
      m.geometry.dispose();
    }
    malhasDePainel.clear();
  }

  /**
   * @param {Array} lista [{ id, matriz, larguraMm, alturaMm, espessuraMm, cols, rows,
   *                         selecionado, problema }]
   */
  function mostrarPaineis(lista) {
    limparPaineis();
    for (const p of lista ?? []) {
      if (!p?.matriz) continue;
      const malha = new Mesh(geometriaPainel(p), p.selecionado ? matPainelSel : p.problema ? matPainelRuim : matPainel);
      malha.frustumCulled = false;
      malha.matrixAutoUpdate = false;
      malha.matrix.fromArray(p.matriz);
      malha.userData.painelId = p.id;
      scene.add(malha);
      malhasDePainel.set(p.id, malha);
    }
    solicitar();
  }

  // ── a seta da FACE CEGA ────────────────────────────────────
  // O cubo tem uma face que veio tapada de fábrica, e ela é INVISÍVEL no
  // desenho: o técnico só descobre onde ela parou quando tenta encaixar ali e
  // não consegue. A seta responde isso de olho, na peça selecionada.
  //
  // O cone nasce apontando pro +Y do three; quem chama manda a matriz pronta
  // (calculada com a álgebra do motor), então a cena não precisa saber de
  // orientação — só desenha.
  const geoSeta = new ConeGeometry(85, 240, 12);
  const matSeta = new MeshBasicMaterial({ color: cores.selecao });
  let malhaSetas = null;

  // ── a TRENA (E5) ──────────────────────────────────────
  // Dois pontos, a reta entre eles e o número em cima. `depthTest: false` de
  // propósito: quem mede o vão de um pórtico mede ATRAVÉS da treliça, e uma
  // linha escondida atrás da peça não mede nada.
  const matTrena = new LineBasicMaterial({
    color: cores.selecao, transparent: true, depthTest: false,
  });
  const matPonta = new MeshBasicMaterial({ color: cores.selecao, depthTest: false });
  const geoPonta = new SphereGeometry(60, 12, 12);
  let linhaTrena = null;
  let pontasTrena = null;
  let rotuloTrena = null;
  let texturaRotulo = null;

  // O RÓTULO É UM SPRITE, e o tamanho dele é corrigido a cada quadro pela
  // distância da câmera: sprite em perspectiva encolhe com o afastamento, e uma
  // medida que vira dois pixels quando a pessoa se afasta não serve de medida.
  const ALTURA_DO_ROTULO = 0.045; // fração da altura da tela
  const FONTE_DO_ROTULO = "700 102px system-ui, sans-serif";
  function desenharRotulo(texto) {
    const cv = document.createElement("canvas");
    const regua = cv.getContext("2d");
    regua.font = FONTE_DO_ROTULO;
    // medir ANTES de dimensionar: mexer em width/height zera o contexto inteiro
    cv.width = Math.ceil(regua.measureText(texto).width) + 78;
    cv.height = 184;
    const ctx = cv.getContext("2d");
    ctx.font = FONTE_DO_ROTULO;
    ctx.fillStyle = cores.fundo;
    ctx.globalAlpha = 0.88;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = cores.selecao;
    ctx.lineWidth = 6;
    ctx.strokeRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = cores.selecao;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(texto, cv.width / 2, cv.height / 2);
    return { cv, proporcao: cv.width / cv.height };
  }

  function limparTrena() {
    for (const o of [linhaTrena, pontasTrena, rotuloTrena]) {
      if (!o) continue;
      scene.remove(o);
      if (o.geometry) o.geometry.dispose();
      if (o.dispose) o.dispose();
      if (o.isSprite) o.material.dispose();
    }
    if (texturaRotulo) { texturaRotulo.dispose(); texturaRotulo = null; }
    linhaTrena = null;
    pontasTrena = null;
    rotuloTrena = null;
  }

  /**
   * A medida na cena: `{ a, b, texto }`. Só com `a`, desenha a primeira ponta;
   * `null` limpa tudo.
   */
  function mostrarMedida(medida) {
    limparTrena();
    const pontos = [medida?.a, medida?.b].filter(Boolean);
    if (pontos.length) {
      pontasTrena = new InstancedMesh(geoPonta, matPonta, pontos.length);
      pontasTrena.frustumCulled = false;
      pontasTrena.renderOrder = 5;
      pontos.forEach((p, i) => pontasTrena.setMatrixAt(i, mat4.makeTranslation(p[0], p[1], p[2])));
      pontasTrena.instanceMatrix.needsUpdate = true;
      scene.add(pontasTrena);
    }
    if (pontos.length === 2) {
      const geo = new BufferGeometry().setFromPoints(
        pontos.map((p) => new Vector3(p[0], p[1], p[2])),
      );
      linhaTrena = new Line(geo, matTrena);
      linhaTrena.frustumCulled = false;
      linhaTrena.renderOrder = 5;
      scene.add(linhaTrena);

      if (medida.texto) {
        const rot = desenharRotulo(medida.texto);
        texturaRotulo = new CanvasTexture(rot.cv);
        rotuloTrena = new Sprite(new SpriteMaterial({
          map: texturaRotulo, transparent: true, depthTest: false,
        }));
        rotuloTrena.renderOrder = 6;
        rotuloTrena.userData.proporcao = rot.proporcao;
        rotuloTrena.position.set(
          (medida.a[0] + medida.b[0]) / 2,
          (medida.a[1] + medida.b[1]) / 2,
          (medida.a[2] + medida.b[2]) / 2,
        );
        scene.add(rotuloTrena);
      }
    }
    solicitar();
  }

  const grupos = new Map(); // `${catalogoId}#${nivel}` → InstancedMesh
  let pecas = [];
  // SELEÇÃO É CONJUNTO (§8.6, C2): com `Shift + clique` o técnico marca várias,
  // e apagar cinco peças num gesto só foi o que ele pediu.
  let selecao = new Set();
  let conflitos = new Set();
  let pendente = 0;
  let vivo = true;
  const raycaster = new Raycaster();
  const ponteiro = new Vector2();
  const mat4 = new Matrix4();
  // o piso como plano matemático, pra saber onde o clique encosta nele
  const planoDoChao = new Plane(new Vector3(0, 1, 0), 0);
  // o plano do arraste da tela: muda a cada gesto, então nasce vazio
  const planoLivre = new Plane(new Vector3(0, 1, 0), 0);
  const normalDoPlano = new Vector3();
  const pontoDoPlano = new Vector3();
  const alvoDoChao = new Vector3();

  // ── render sob demanda ─────────────────────────────────────
  function desenhar() {
    pendente = 0;
    controls.update();
    // o rótulo da trena mantém o TAMANHO NA TELA: a escala em mm de mundo sai da
    // distância, senão a medida vira dois pixels quando a pessoa se afasta
    if (rotuloTrena) {
      const d = camera.position.distanceTo(rotuloTrena.position);
      const alt = 2 * d * Math.tan((camera.fov * Math.PI) / 360) * ALTURA_DO_ROTULO;
      rotuloTrena.scale.set(alt * rotuloTrena.userData.proporcao, alt, 1);
    }
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

  // A PRIORIDADE DAS CORES, e ela tem razão de campo:
  // selecionada > em conflito > cor do catálogo. A seleção ganha do vermelho
  // porque é ela que guia a próxima ação — quem clicou numa peça sobreposta
  // clicou justamente pra apagá-la, e precisa ver qual pegou.
  function aplicarSelecao() {
    for (const [chave, malha] of grupos) {
      const base = corDoCatalogo(chave.slice(0, chave.lastIndexOf("#")));
      const ids = malha.userData.indices ?? [];
      for (let i = 0; i < malha.count; i++) {
        const idx = ids[i];
        malha.setColorAt(i, selecao.has(idx) ? corSel : conflitos.has(idx) ? corConflito : base);
      }
      if (malha.instanceColor) malha.instanceColor.needsUpdate = true;
    }
  }

  // ── conectores clicáveis ───────────────────────────────────
  function mostrarConectores(lista) {
    listaConectores = lista ?? [];
    if (malhaConectores) {
      scene.remove(malhaConectores);
      malhaConectores.dispose();
      malhaConectores = null;
    }
    if (listaConectores.length) {
      malhaConectores = new InstancedMesh(geoConector, matConector, listaConectores.length);
      malhaConectores.frustumCulled = false;
      listaConectores.forEach((c, i) =>
        malhaConectores.setMatrixAt(i, mat4.makeTranslation(c.pos[0], c.pos[1], c.pos[2])),
      );
      malhaConectores.instanceMatrix.needsUpdate = true;
      scene.add(malhaConectores);
    }
    conectorAtivo = null;
    solicitar();
  }

  /** qual conector está sob o ponteiro (mesma tolerância em anéis do `pecaEm`) */
  function conectorEm(evento, toleranciaPx = 20) {
    if (!malhaConectores) return null;
    const r = canvas.getBoundingClientRect();
    const tentar = (dx, dy) => {
      ponteiro.x = ((evento.clientX + dx - r.left) / r.width) * 2 - 1;
      ponteiro.y = -((evento.clientY + dy - r.top) / r.height) * 2 + 1;
      raycaster.setFromCamera(ponteiro, camera);
      const hit = raycaster.intersectObject(malhaConectores, false)[0];
      return hit ? hit.instanceId : null;
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

  function realcarConector(indice) {
    if (conectorAtivo === indice) return;
    conectorAtivo = indice;
    if (malhaConectores) malhaConectores.material = indice == null ? matConector : matConectorAtivo;
    solicitar();
  }

  /** as setas de face cega, uma matriz de mundo por seta */
  function mostrarSetas(matrizes) {
    const lista = matrizes ?? [];
    if (malhaSetas) {
      scene.remove(malhaSetas);
      malhaSetas.dispose();
      malhaSetas = null;
    }
    if (lista.length) {
      malhaSetas = new InstancedMesh(geoSeta, matSeta, lista.length);
      malhaSetas.frustumCulled = false;
      malhaSetas.renderOrder = 3;
      lista.forEach((m, i) => malhaSetas.setMatrixAt(i, mat4.fromArray(m)));
      malhaSetas.instanceMatrix.needsUpdate = true;
      scene.add(malhaSetas);
    }
    solicitar();
  }

  function limparFantasma() {
    if (fantasma?.visible) {
      fantasma.visible = false;
      solicitar();
    }
  }

  /** a prévia fantasma: a peça ONDE ELA VAI FICAR, antes de comitar */
  function mostrarFantasma(catalogoId, matriz) {
    const geo = geometriaDaPeca(catalogoId, 0);
    if (!geo || !matriz) {
      limparFantasma();
      return;
    }
    if (!fantasma) {
      fantasma = new Mesh(geo, matFantasma);
      fantasma.frustumCulled = false;
      fantasma.matrixAutoUpdate = false;
      fantasma.renderOrder = 2;
      scene.add(fantasma);
    } else {
      fantasma.geometry = geo;
    }
    fantasma.matrix.fromArray(matriz);
    fantasma.visible = true;
    solicitar();
  }

  // ── API ────────────────────────────────────────────────────
  function sincronizar(montagem) {
    pecas = montagem?.pecas ?? [];
    // O PISO ACOMPANHA A ESTRUTURA, nos três eixos.
    //
    // Em ALTURA: fica sempre abaixo da peça mais baixa (regra do dono, 19/08).
    // Peça atravessada pelo chão é desenho que mente sobre o que está apoiado e
    // o que está no ar — e é com esse desenho que se decide içamento.
    //
    // No PLANO: fica centrado na estrutura (20/08). A grade nasce na origem do
    // mundo, mas a estrutura nasce onde o técnico clicou; num projeto de verdade
    // isso é longe da origem, e o desenho ficava com a estrutura num canto e o
    // piso no outro, como se ela estivesse fora do palco.
    //
    // As duas réguas moram no motor, porque são regra e não detalhe de
    // renderização — e é lá que estão testadas.
    const [cx, cz] = centroDoChao(montagem);
    grade.position.set(cx, nivelDoChao(montagem), cz);
    // peça apagada encurta a lista: índice que não existe mais sai da seleção,
    // senão o destaque salta pra peça errada na renderização seguinte
    for (const i of [...selecao]) if (i >= pecas.length) selecao.delete(i);
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

  /** aceita um índice, uma lista deles, ou null pra limpar */
  /**
   * ⚠️ O HORIZONTE, e ele já custou caro uma vez.
   *
   * Todo plano infinito tem um lugar onde o raio da câmera fica quase paralelo a
   * ele, e o encontro dos dois vai parar a QUILÔMETROS. Foi assim que um clique
   * de raspão nasceu uma peça a 20 km, e é assim que um arraste de raspão joga
   * uma parede pra fora do mundo.
   *
   * A régua é o PALCO: a grade tem 40 × 40 m e é ela que o técnico enxerga. Fora
   * dela o ponteiro não está apontando pra lugar nenhum, e a resposta honesta é
   * não devolver ponto. Medida a partir do CENTRO DA GRADE, que acompanha a
   * estrutura — clicar longe da origem é clique legítimo.
   */
  function dentroDoPalco(p) {
    const limite = LADO_DA_GRADE / 2;
    return Math.abs(p.x - grade.position.x) <= limite
      && Math.abs(p.z - grade.position.z) <= limite
      && Math.abs(p.y - grade.position.y) <= limite;
  }

  /**
   * Onde o ponteiro encosta NO PISO, em mm de mundo — ou `null` se ele estiver
   * apontando pro céu.
   *
   * É o que permite a peça nova nascer onde o técnico clica, em vez de sempre na
   * origem (§8.7). O plano é o do piso DESENHADO, não o zero absoluto: quando a
   * grade desce por causa de uma peça pendurada, clicar nela nasce peça lá.
   */
  function pontoNoChao(evento) {
    const r = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - r.left) / r.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, camera);
    planoDoChao.constant = -grade.position.y;
    const p = raycaster.ray.intersectPlane(planoDoChao, alvoDoChao);
    // fora da grade o clique não vale nada — é céu, não chão (ver `dentroDoPalco`)
    if (!p || !dentroDoPalco(p)) return null;
    return [p.x, p.y, p.z];
  }

  /**
   * Qual painel está sob o ponteiro. Sem os anéis de tolerância do `pecaEm`: o
   * painel é uma chapa cheia, e chapa cheia se acerta no tiro direto.
   */
  function painelEm(evento) {
    const alvos = [...malhasDePainel.values()];
    if (!alvos.length) return null;
    const r = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - r.left) / r.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, camera);
    const hit = raycaster.intersectObjects(alvos, false)[0];
    return hit ? hit.object.userData.painelId ?? null : null;
  }

  /**
   * Onde o ponteiro encosta num PLANO qualquer, em mm de mundo.
   *
   * É o que sustenta o arraste da tela (§12): o plano é escolhido no momento em
   * que se pega o painel — horizontal pra passear pelo palco, vertical de frente
   * pra câmera pra subir e descer — e a tela acompanha o ponteiro dentro dele.
   */
  function pontoNoPlano(evento, ponto, normal) {
    const r = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - r.left) / r.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, camera);
    normalDoPlano.set(normal[0], normal[1], normal[2]).normalize();
    pontoDoPlano.set(ponto[0], ponto[1], ponto[2]);
    planoLivre.setFromNormalAndCoplanarPoint(normalDoPlano, pontoDoPlano);
    const p = raycaster.ray.intersectPlane(planoLivre, alvoDoChao);
    return p && dentroDoPalco(p) ? [p.x, p.y, p.z] : null;
  }

  /**
   * Onde o clique ENCOSTA na cena: na peça, no painel, ou no piso.
   *
   * É o ponto de partida da trena. Encostar na superfície e não no centro da
   * peça é o que permite medir de uma quina à outra — quem chama depois gruda
   * isso no ponto notável mais próximo, que é conta do motor.
   */
  function pontoDeCena(evento) {
    const r = canvas.getBoundingClientRect();
    ponteiro.x = ((evento.clientX - r.left) / r.width) * 2 - 1;
    ponteiro.y = -((evento.clientY - r.top) / r.height) * 2 + 1;
    raycaster.setFromCamera(ponteiro, camera);
    const alvos = [...grupos.values(), ...malhasDePainel.values()];
    const hit = alvos.length ? raycaster.intersectObjects(alvos, false)[0] : null;
    if (hit) return [hit.point.x, hit.point.y, hit.point.z];
    return pontoNoChao(evento);
  }

  /**
   * Pra onde a câmera olha, no plano do chão — o vetor que sai da cena EM
   * DIREÇÃO a quem está vendo.
   *
   * A tela nova nasce virada pra cá. Painel que nasce de costas obriga a girar
   * antes de qualquer outra coisa, e ninguém desenha uma parede pra ela olhar
   * pro fundo do palco.
   */
  function olharDaCamera() {
    const v = new Vector3().subVectors(camera.position, controls.target);
    v.y = 0;
    if (v.lengthSq() < 1e-6) return [0, 0, 1];
    v.normalize();
    return [v.x, 0, v.z];
  }

  /**
   * Quantos MILÍMETROS DE MUNDO cabem num pixel de tela, na profundidade de um
   * ponto.
   *
   * É o que deixa o ímã com o mesmo tamanho na MÃO em qualquer zoom: 300 mm de
   * alcance é generoso a dois metros e virou meio pixel a quarenta. Mesma régua
   * que o `snap.js` já usa pros conectores — quem sabe converter tolerância de
   * tela em mm é a vista, nunca o motor.
   */
  function mmPorPixel(ponto) {
    const d = camera.position.distanceTo(
      pontoDoPlano.set(ponto[0], ponto[1], ponto[2]),
    );
    const alturaVisivel = 2 * d * Math.tan((camera.fov * Math.PI) / 360);
    return alturaVisivel / Math.max(1, canvas.clientHeight);
  }

  /** trava a órbita enquanto se arrasta uma tela — senão o palco gira junto */
  function travarOrbita(v) { controls.enabled = !v; }

  function selecionar(indices) {
    selecao = new Set(
      indices == null
        ? []
        : (Array.isArray(indices) ? indices : [indices]).filter((i) => i != null),
    );
    aplicarSelecao();
    solicitar();
  }

  /** as peças montadas uma dentro da outra — saem em vermelho */
  function marcarConflitos(indices) {
    conflitos = new Set(indices ?? []);
    aplicarSelecao();
    solicitar();
  }

  /** troca o mapa `catalogoId → hex`; `null` devolve tudo à cor do tema */
  function definirCores(mapa) {
    coresPorPeca = mapa ?? null;
    aplicarSelecao();
    solicitar();
  }

  function trocarTema(novas) {
    scene.background = new Color(novas.fundo);
    corPeca.set(novas.peca);
    corSel.set(novas.selecao);
    if (novas.conflito) corConflito.set(novas.conflito);
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
    const antes = {
      l: canvas.clientWidth, a: canvas.clientHeight, bg: scene.background,
      grade: grade.visible,
      conectores: malhaConectores?.visible ?? false,
      fantasma: fantasma?.visible ?? false,
      setas: malhaSetas?.visible ?? false,
    };
    // o PAINEL fica: ele é parte do que foi montado, não andaime de tela
    // Some com os ANDAIMES DA TELA. Grade, marcadores de conector e prévia
    // fantasma existem pra ajudar a montar; no papel viram ruído — e o fantasma
    // chega a mentir, desenhando uma peça que ainda não foi colocada.
    grade.visible = false;
    if (malhaConectores) malhaConectores.visible = false;
    if (fantasma) fantasma.visible = false;
    if (malhaSetas) malhaSetas.visible = false;

    if (fundo) scene.background = new Color(fundo);
    renderer.setSize(largura, altura, false);
    camera.aspect = largura / altura;
    camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const png = canvas.toDataURL("image/png");

    scene.background = antes.bg;
    grade.visible = antes.grade;
    if (malhaConectores) malhaConectores.visible = antes.conectores;
    if (fantasma) fantasma.visible = antes.fantasma;
    if (malhaSetas) malhaSetas.visible = antes.setas;
    renderer.setSize(antes.l, antes.a, false);
    camera.aspect = antes.l / antes.a;
    camera.updateProjectionMatrix();
    solicitar();
    return png;
  }

  function destruir() {
    vivo = false;
    if (malhaConectores) { scene.remove(malhaConectores); malhaConectores.dispose(); }
    if (malhaSetas) { scene.remove(malhaSetas); malhaSetas.dispose(); }
    limparTrena();
    matTrena.dispose();
    matPonta.dispose();
    geoPonta.dispose();
    limparPaineis();
    matPainel.dispose();
    matPainelSel.dispose();
    matPainelRuim.dispose();
    if (fantasma) scene.remove(fantasma);
    geoSeta.dispose();
    matSeta.dispose();
    geoConector.dispose();
    matConector.dispose();
    matConectorAtivo.dispose();
    matFantasma.dispose();
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
    sincronizar, redimensionar, enquadrar, aproximar, pecaEm, pontoNoChao, selecionar,
    marcarConflitos, definirCores,
    trocarTema, capturar, destruir, solicitar,
    mostrarConectores, conectorEm, realcarConector, mostrarFantasma, limparFantasma, mostrarSetas,
    mostrarPaineis, painelEm, pontoNoPlano, pontoDeCena, olharDaCamera, travarOrbita, mostrarMedida,
    mmPorPixel,
    mostrarGrade: (v) => { grade.visible = v; solicitar(); },
  };
}
