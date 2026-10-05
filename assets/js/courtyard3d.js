/* 康家滩欣院 · 三维云游
   模型：康家滩宅院建筑细节复原研究第三版（jin-courtyard-v3）courtyard.glb，
   网页版经 prune / dedup / meshopt 压缩，构件命名与 extras（来源照片、可信度）保持不变。
   坐标：+X 东，-Z 北，单位为模型名义米（未实测）。 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';

const MODEL_URL = new URL('../models/kangjiatan-courtyard-v3.glb', import.meta.url).href;

/* 视点：pos 相机位置，target 注视点 */
const VIEWS = {
  overview: { label: '全景', pos: [15.5, 13.5, -17], target: [1.5, 0.4, 2] },
  A: { pos: [0.3, 2.0, -4.2], target: [0, 2.7, 7] },
  B: { pos: [-2.6, 1.7, 0.4], target: [7, 2.1, 0] },
  C: { pos: [2.6, 1.7, -0.4], target: [-7, 2.1, 0] },
  D: { pos: [-0.3, 1.9, 3.9], target: [0, 2.5, -7] },
  E: { pos: [0.6, 1.9, -3.2], target: [6.0, 2.4, -4.7] },
  F: { pos: [19, 3.1, -6.2], target: [10, 2.3, -7.4] },
  G: { pos: [9.6, 2.0, -7.3], target: [6.0, 2.1, -7.4] },
  H: { pos: [-10.8, 6.6, -2.4], target: [-6.0, 1.9, -7.4] },
  I: { pos: [8.0, 1.8, -6.0], target: [8.3, 1.9, -10.5] },
  Z: { pos: [17, 15, 31], target: [0, 0, 15] },
};
const ORDER = ['overview', 'F', 'G', 'E', 'A', 'B', 'C', 'D', 'H', 'I', 'Z'];
/* 标签锚点 */
const ANCHORS = {
  A: [0, 6.25, 7.2], B: [7.3, 5.85, 0], C: [-7.3, 5.85, 0], D: [0, 5.1, -7.0],
  E: [6.05, 3.4, -4.6], F: [9.2, 5.1, -7.4], G: [5.8, 4.5, -7.4], H: [-6.1, 4.3, -7.3],
  I: [8.3, 3.9, -11], Z: [0, 0.6, 16],
};
const HYP = new Set(['H', 'I', 'Z']);

/* 时辰：az 为自北顺时针方位角，el 为高度角（度） */
const TIMES = {
  dawn: { az: 72, el: 13, sun: '#ffc895', sunI: 2.4, sky: '#c7d1dc', ground: '#6b5944', hemiI: 0.6, top: '#6c8db8', hor: '#f2c79d', bot: '#5a4c3c', exp: 1.0, glow: 1, night: 0, fog: '#d9c3a6' },
  noon: { az: 165, el: 58, sun: '#fff3df', sunI: 3.0, sky: '#d6e3ef', ground: '#7b6a52', hemiI: 0.85, top: '#4b7db6', hor: '#dfe6ea', bot: '#6b5b45', exp: 0.92, glow: 0.6, night: 0, fog: '#d8dcdc' },
  dusk: { az: 292, el: 12, sun: '#ffa765', sunI: 2.8, sky: '#c3bccb', ground: '#6a5848', hemiI: 0.72, top: '#536792', hor: '#eab38a', bot: '#4f4234', exp: 1.08, glow: 1, night: 0.15, fog: '#c9ab90' },
  night: { az: 210, el: 38, sun: '#9fb4ff', sunI: 0.42, sky: '#2b3757', ground: '#0d0c0b', hemiI: 0.32, top: '#060a15', hor: '#1c2542', bot: '#07070a', exp: 1.3, glow: 0.15, night: 1, fog: '#121827' },
};

/* 模型 extras.confidence（英文）归并为中文标签 */
function confTags(set) {
  const tags = new Set();
  set.forEach((c) => {
    const s = c.toLowerCase();
    if (s.includes('user confirmed')) tags.add('存在经确认，位置与尺寸为推定');
    else if (s.includes('hypothesis') || s.includes('not directly visible')) tags.add('含推定构件');
    if (/photo-supported|photo-informed|observed|source-informed/.test(s)) tags.add('原照可见形制');
    if (/approximation|not replicated|not exact|not a measured/.test(s)) tags.add('纹饰为近似');
  });
  tags.add('尺寸未实测');
  return [...tags].join(' · ');
}

/* ---------- 程序化细节纹理（三平面投影，按世界坐标贴附） ---------- */
function rng(seed) {
  return () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function canvasTex(size, draw, maxAniso) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  draw(g, size);
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.NoColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
function speckle(g, s, r, amp, n) {
  for (let i = 0; i < n; i++) {
    const v = Math.round(128 + (r() - 0.5) * amp);
    g.fillStyle = `rgba(${v},${v},${v},${0.25 + r() * 0.35})`;
    g.fillRect(r() * s, r() * s, 1 + r() * 2.2, 1 + r() * 2.2);
  }
}
function makeTextures(maxAniso) {
  const brick = canvasTex(512, (g, s) => {
    const r = rng(7);
    g.fillStyle = 'rgb(94,94,92)'; g.fillRect(0, 0, s, s);
    const ch = s / 16, bw = s / 4, m = 3;
    for (let row = 0; row < 16; row++) {
      const off = row % 2 ? bw / 2 : 0;
      for (let k = -1; k < 5; k++) {
        const v = Math.round(132 + (r() - 0.5) * 34);
        const w = Math.round(v + (r() - 0.5) * 6);
        g.fillStyle = `rgb(${v},${v},${w})`;
        g.fillRect(k * bw + off + m / 2, row * ch + m / 2, bw - m, ch - m);
      }
    }
    speckle(g, s, r, 70, 9000);
    for (let i = 0; i < 26; i++) { // 风化斑
      const x = r() * s, y = r() * s, rad = 20 + r() * 60;
      const gr = g.createRadialGradient(x, y, 0, x, y, rad);
      const d = r() > 0.5 ? 255 : 0;
      gr.addColorStop(0, `rgba(${d},${d},${d},0.07)`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, maxAniso);
  const pave = canvasTex(512, (g, s) => {
    const r = rng(11);
    g.fillStyle = 'rgb(92,92,90)'; g.fillRect(0, 0, s, s);
    const ph = s / 8, pw = s / 4, m = 3;
    for (let row = 0; row < 8; row++) {
      const off = row % 2 ? pw / 2 : 0;
      for (let k = -1; k < 5; k++) {
        const v = Math.round(130 + (r() - 0.5) * 30);
        g.fillStyle = `rgb(${v},${v},${v - 2})`;
        g.fillRect(k * pw + off + m / 2, row * ph + m / 2, pw - m, ph - m);
      }
    }
    speckle(g, s, r, 60, 7000);
  }, maxAniso);
  const stone = canvasTex(256, (g, s) => {
    const r = rng(23);
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, s, s);
    speckle(g, s, r, 90, 6000);
    g.strokeStyle = 'rgba(80,80,80,.25)';
    for (let i = 0; i < 6; i++) { g.beginPath(); g.moveTo(r() * s, r() * s); for (let j = 0; j < 5; j++) g.lineTo(r() * s, r() * s); g.stroke(); }
  }, maxAniso);
  const wood = canvasTex(256, (g, s) => {
    const r = rng(31);
    for (let x = 0; x < s; x++) {
      const v = Math.round(128 + Math.sin(x * 0.21 + Math.sin(x * 0.05) * 3) * 10 + (r() - 0.5) * 16);
      g.fillStyle = `rgb(${v},${v},${v})`; g.fillRect(x, 0, 1, s);
    }
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(60,60,60,${0.08 + r() * 0.1})`; g.fillRect(r() * s, r() * s, 1 + r() * 2, 20 + r() * 80); }
  }, maxAniso);
  const noise = canvasTex(256, (g, s) => {
    const r = rng(41);
    g.fillStyle = 'rgb(128,128,128)'; g.fillRect(0, 0, s, s);
    speckle(g, s, r, 50, 5000);
  }, maxAniso);
  return { brick, pave, stone, wood, noise };
}

function addDetail(mat, tex, scale, strength) {
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uDetail = { value: tex };
    shader.uniforms.uDetailScale = { value: scale };
    shader.uniforms.uDetailStrength = { value: strength };
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDWPos;')
      .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvDWPos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vDWPos;\nuniform sampler2D uDetail;\nuniform float uDetailScale;\nuniform float uDetailStrength;')
      .replace('#include <map_fragment>', `#include <map_fragment>
        {
          vec3 dn = normalize(cross(dFdx(vDWPos), dFdy(vDWPos)));
          vec3 bw = pow(abs(dn), vec3(6.0));
          bw /= (bw.x + bw.y + bw.z + 1e-5);
          vec3 p = vDWPos * uDetailScale;
          vec3 dt = texture2D(uDetail, p.zy).rgb * bw.x + texture2D(uDetail, p.xz).rgb * bw.y + texture2D(uDetail, p.xy).rgb * bw.z;
          diffuseColor.rgb *= mix(vec3(1.0), dt * 2.0, uDetailStrength);
        }`);
  };
  mat.customProgramCacheKey = () => 'xy-detail';
  mat.needsUpdate = true;
}

/* ---------- 天空 ---------- */
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      uTop: { value: new THREE.Color() }, uHor: { value: new THREE.Color() }, uBot: { value: new THREE.Color() },
      uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color() }, uGlow: { value: 1 },
    },
    vertexShader: 'varying vec3 vDir; void main(){ vDir = position; vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }',
    fragmentShader: `uniform vec3 uTop; uniform vec3 uHor; uniform vec3 uBot; uniform vec3 uSunDir; uniform vec3 uSunCol; uniform float uGlow; varying vec3 vDir;
      void main(){
        vec3 d = normalize(vDir);
        float h = d.y;
        vec3 col = h > 0.0 ? mix(uHor, uTop, pow(h, 0.55)) : mix(uHor, uBot, pow(-h, 0.35));
        float s = max(dot(d, normalize(uSunDir)), 0.0);
        col += uSunCol * (pow(s, 1400.0) * 5.0 + pow(s, 10.0) * 0.4) * uGlow;
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(600, 48, 24), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return mesh;
}

function makeStars() {
  const r = rng(5);
  const n = 1400;
  const pos = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const u = r() * Math.PI * 2, v = 0.06 + r() * 0.94;
    const y = v, rr = Math.sqrt(1 - y * y);
    pos.set([Math.cos(u) * rr * 520, y * 520, Math.sin(u) * rr * 520], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: '#dfe6ff', size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const p = new THREE.Points(g, m);
  p.frustumCulled = false;
  return p;
}

/* ---------- 黄土地形与树 ---------- */
function makeTerrain(tex) {
  const size = 900, seg = 160;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position;
  const col = new Float32Array(p.count * 3);
  const r = rng(3);
  const ph = [r() * 6, r() * 6, r() * 6, r() * 6];
  const c1 = new THREE.Color('#8f7d5f'), c2 = new THREE.Color('#c09a66'), c3 = new THREE.Color('#a88456'), tmp = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), z = p.getZ(i);
    const d = Math.hypot(x - 2, z - 4);
    const ang = Math.atan2(z, x);
    const ridge = Math.sin(ang * 3 + ph[0]) * 0.5 + Math.sin(ang * 7 + ph[1]) * 0.3 + Math.sin(x * 0.021 + ph[2]) * Math.cos(z * 0.017 + ph[3]) * 0.6;
    const k = THREE.MathUtils.smoothstep(d, 70, 300);
    let y = k * (22 + ridge * 14 + Math.sin(d * 0.045) * 4) - 0.03;
    if (d < 70) y = -0.03;
    p.setY(i, y);
    const terr = 0.5 + 0.5 * Math.sin(y * 1.6);
    tmp.copy(c1).lerp(c2, THREE.MathUtils.clamp(y / 30, 0, 1)).lerp(c3, terr * 0.35 * k);
    col.set([tmp.r, tmp.g, tmp.b], i * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0 });
  addDetail(mat, tex, 1 / 3, 0.35);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'context_terrain';
  return mesh;
}
function makeTrees() {
  const group = new THREE.Group();
  group.name = 'context_trees';
  const r = rng(17);
  const trunkMat = new THREE.MeshStandardMaterial({ color: '#4a3a2a', roughness: 1 });
  const leafMats = ['#56622f', '#636f37', '#4d5a2c', '#6b7440'].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
  const spots = [[-22, 10], [-26, -6], [-21, -20], [-30, 24], [27, 14], [31, 2], [24, 30], [-8, 36], [9, 42], [-16, -34], [-42, 4], [42, 32], [-36, -30], [-4, -46]];
  spots.forEach(([x, z], i) => {
    const s = 0.8 + r() * 0.6;
    const t = new THREE.Mesh(new THREE.CylinderGeometry(0.16 * s, 0.26 * s, 3.4 * s, 7), trunkMat);
    t.position.set(x, 1.7 * s, z);
    t.castShadow = true;
    group.add(t);
    const blobs = 3 + Math.floor(r() * 3);
    for (let b = 0; b < blobs; b++) {
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry((1.4 + r() * 1.2) * s, 0), leafMats[(i + b) % leafMats.length]);
      m.position.set(x + (r() - 0.5) * 2.4 * s, (3.6 + r() * 1.8) * s, z + (r() - 0.5) * 2.4 * s);
      m.rotation.set(r() * 3, r() * 3, r() * 3);
      m.castShadow = true;
      group.add(m);
    }
  });
  return group;
}

const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const v3 = (a) => new THREE.Vector3(a[0], a[1], a[2]);

/* ====================================================== */
export async function initCourtyard(stage, opts = {}) {
  const COMP = opts.components || {};
  const canvas = stage.querySelector('.stage__canvas');
  const labelsEl = stage.querySelector('.stage__labels');
  const progressEl = stage.querySelector('[data-progress]');
  const card = stage.querySelector('[data-card]');
  stage.dataset.state = 'loading';

  const small = Math.min(window.innerWidth, window.innerHeight) < 700 || (navigator.hardwareConcurrency || 8) <= 4;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: !!opts.preserve });
  } catch (e) {
    stage.dataset.state = 'error';
    stage.querySelector('.stage__fallback').hidden = false;
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, small ? 1.35 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 1500);
  camera.position.copy(v3(VIEWS.overview.pos));

  const controls = new OrbitControls(camera, canvas);
  controls.target.copy(v3(VIEWS.overview.target));
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance = 1.2;
  controls.maxDistance = 110;
  controls.maxPolarAngle = Math.PI * 0.495;
  controls.screenSpacePanning = true;
  controls.zoomToCursor = true;
  controls.autoRotate = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  controls.autoRotateSpeed = 0.35;
  controls.update();

  // 场景元素
  const tex = makeTextures(maxAniso);
  const sky = makeSky();
  scene.add(sky);
  const stars = makeStars();
  scene.add(stars);
  scene.fog = new THREE.Fog('#d1a37f', 80, 420);
  scene.add(makeTerrain(tex.noise));
  scene.add(makeTrees());

  const hemi = new THREE.HemisphereLight('#ffffff', '#555555', 0.6);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffffff', 2.5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(small ? 1024 : 2048, small ? 1024 : 2048);
  Object.assign(sun.shadow.camera, { left: -26, right: 26, top: 26, bottom: -26, near: 1, far: 160 });
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.02;
  sun.target.position.set(2, 0, 3);
  scene.add(sun, sun.target);
  const fill = new THREE.DirectionalLight('#9fb3d6', 0.25);
  scene.add(fill);
  const lamps = [[-4.6, 2.3, 3.6], [4.6, 2.3, 3.6], [0, 2.2, -3.9], [10.6, 2.8, -7.4], [7.4, 2.2, 0], [-7.4, 2.2, 0]].map((p) => {
    const l = new THREE.PointLight('#ffb062', 0, 14, 2);
    l.position.set(p[0], p[1], p[2]);
    scene.add(l);
    return l;
  });

  // 载入模型
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await new Promise((resolve, reject) => {
    loader.load(MODEL_URL, resolve, (xhr) => {
      if (xhr.total) progressEl.textContent = `${Math.round((xhr.loaded / xhr.total) * 100)}%`;
      else progressEl.textContent = `${(xhr.loaded / 1048576).toFixed(1)} MB`;
    }, reject);
  });
  const model = gltf.scene;
  model.name = 'courtyard_v3';
  scene.add(model);

  // 材质增强与构件分组
  const seen = new Set();
  const paperMats = [];
  const hypMeshes = [];
  const routeMeshes = [];
  const compInfo = {};
  const hypMat = new THREE.MeshStandardMaterial({ color: '#e08a35', emissive: '#7a3a0a', emissiveIntensity: 0.55, roughness: 0.7, flatShading: true });
  const rearMat = new THREE.MeshStandardMaterial({ color: '#c9d3da', roughness: 1, transparent: true, opacity: 0.45, depthWrite: false });
  const compOf = (name) => {
    if (name.startsWith('Z_')) return 'Z';
    const m = /^([A-I])_/.exec(name);
    return m ? m[1] : null;
  };
  model.traverse((o) => {
    if (!o.isMesh) return;
    const g = o.geometry;
    if (!g.attributes.normal) g.computeVertexNormals();
    const name = o.name || '';
    const flat = /^00_|^Z_|floor|paving|level/.test(name);
    o.castShadow = !flat;
    o.receiveShadow = true;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    mats.forEach((m) => {
      if (seen.has(m)) return;
      seen.add(m);
      const n = m.name || '';
      m.flatShading = true;
      if (/^brick(_\d)?$|^brick_light$|^mortar$/.test(n)) addDetail(m, tex.brick, 1 / 1.2, 0.85);
      else if (n === 'carved_brick') addDetail(m, tex.noise, 1 / 0.8, 0.45);
      else if (n === 'floor') addDetail(m, tex.pave, 1 / 2.4, 0.8);
      else if (/^stone/.test(n)) addDetail(m, tex.stone, 1 / 1.4, 0.6);
      else if (/wood/.test(n)) addDetail(m, tex.wood, 1 / 0.9, 0.45);
      else if (/^roof$|^tile$|^clay_\d$/.test(n)) addDetail(m, tex.noise, 1, 0.35);
      if (n === 'paper' || n === 'ivory') { m.emissive = new THREE.Color('#ffb15e'); m.emissiveIntensity = 0; paperMats.push(m); }
    });
    if (name === 'Z_rear_placeholder') o.material = rearMat;
    if (/^Z_connection/.test(name)) { o.visible = false; routeMeshes.push(o); }
    if (/hypothesis|schematic|^Z_rear_dashed/.test(name)) { o.userData.origMat = o.material; hypMeshes.push(o); }
    const c = compOf(name);
    if (c) {
      const info = compInfo[c] || (compInfo[c] = { photos: new Set(), conf: new Set() });
      const ex = o.userData || {};
      (ex.source_photos || []).forEach((p) => info.photos.add(p));
      if (ex.confidence) info.conf.add(ex.confidence);
    }
  });

  // 标签
  const labels = Object.keys(ANCHORS).map((k) => {
    const c = COMP[k] || { name: k };
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `hs${HYP.has(k) ? ' is-hyp' : ''}`;
    b.innerHTML = `<b>${k}</b><span>${c.name}${HYP.has(k) ? '（推定）' : ''}</span>`;
    b.setAttribute('aria-label', `${k} ${c.name}`);
    b.addEventListener('click', () => api.focus(k));
    labelsEl.appendChild(b);
    return { k, el: b, p: v3(ANCHORS[k]) };
  });

  // 视点按钮
  const viewsEl = stage.querySelector('[data-views]');
  viewsEl.innerHTML = ORDER.map((k) => `<button type="button" data-view="${k}" aria-pressed="${k === 'overview'}">${k === 'overview' ? VIEWS.overview.label : `${k} ${(COMP[k] || {}).name || ''}`}</button>`).join('');
  viewsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-view]');
    if (b) { stopTour(); api.focus(b.dataset.view); }
  });

  // 时辰
  const cur = {};
  const tmpC = new THREE.Color();
  const colorKeys = ['sun', 'sky', 'ground', 'top', 'hor', 'bot', 'fog'];
  const numKeys = ['az', 'el', 'sunI', 'hemiI', 'exp', 'glow', 'night'];
  function snapshot(p) {
    const o = {};
    colorKeys.forEach((k) => { o[k] = new THREE.Color(p[k]); });
    numKeys.forEach((k) => { o[k] = p[k]; });
    return o;
  }
  Object.assign(cur, snapshot(TIMES.dawn));
  let timeAnim = null;
  function applyTime() {
    const az = THREE.MathUtils.degToRad(cur.az), el = THREE.MathUtils.degToRad(cur.el);
    const dir = new THREE.Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), -Math.cos(az) * Math.cos(el));
    sun.position.copy(sun.target.position).addScaledVector(dir, 80);
    sun.color.copy(cur.sun);
    sun.intensity = cur.sunI;
    fill.position.copy(sun.target.position).addScaledVector(new THREE.Vector3(-dir.x, 0.6, -dir.z), 60);
    fill.intensity = 0.18 + 0.2 * (1 - cur.night);
    hemi.color.copy(cur.sky);
    hemi.groundColor.copy(cur.ground);
    hemi.intensity = cur.hemiI;
    const u = sky.material.uniforms;
    u.uTop.value.copy(cur.top); u.uHor.value.copy(cur.hor); u.uBot.value.copy(cur.bot);
    u.uSunDir.value.copy(dir); u.uSunCol.value.copy(cur.sun); u.uGlow.value = cur.glow;
    scene.fog.color.copy(cur.fog);
    renderer.toneMappingExposure = cur.exp;
    stars.material.opacity = THREE.MathUtils.smoothstep(cur.night, 0.4, 1) * 0.9;
    const glow = THREE.MathUtils.smoothstep(cur.night, 0.1, 1);
    paperMats.forEach((m) => { m.emissiveIntensity = glow * 1.35; });
    lamps.forEach((l) => { l.intensity = glow * 9; });
  }
  applyTime();
  function setTime(name, instant) {
    const p = TIMES[name];
    if (!p) return;
    stage.querySelectorAll('[data-time]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.time === name)));
    const to = snapshot(p);
    if (instant) { Object.assign(cur, to); applyTime(); timeAnim = null; return; }
    const from = snapshot({ ...Object.fromEntries(colorKeys.map((k) => [k, `#${cur[k].getHexString()}`])), ...Object.fromEntries(numKeys.map((k) => [k, cur[k]])) });
    let dAz = to.az - from.az;
    if (dAz > 180) dAz -= 360; if (dAz < -180) dAz += 360;
    timeAnim = { from, to, dAz, t0: performance.now(), dur: 1600 };
  }
  stage.querySelector('[data-times]').addEventListener('click', (e) => {
    const b = e.target.closest('[data-time]');
    if (b) setTime(b.dataset.time);
  });

  // 推定标示
  let research = false;
  function setResearch(on) {
    research = on;
    hypMeshes.forEach((m) => { m.material = on ? hypMat : m.userData.origMat; });
    routeMeshes.forEach((m) => { m.visible = on; });
    rearMat.color.set(on ? '#7fb0d6' : '#c9d3da');
    rearMat.opacity = on ? 0.7 : 0.45;
    stage.querySelector('[data-act="hyp"]').setAttribute('aria-pressed', String(on));
  }

  // 相机过渡
  let camAnim = null;
  let active = 'overview';
  function flyTo(view, instant) {
    const v = VIEWS[view];
    if (!v) return;
    controls.autoRotate = false;
    if (instant) {
      camera.position.copy(v3(v.pos)); controls.target.copy(v3(v.target)); controls.update(); camAnim = null; return;
    }
    const dist = camera.position.distanceTo(v3(v.pos));
    camAnim = { p0: camera.position.clone(), t0p: controls.target.clone(), p1: v3(v.pos), t1: v3(v.target), s: performance.now(), dur: THREE.MathUtils.clamp(900 + dist * 55, 1100, 2600), lift: Math.min(dist * 0.18, 9) };
  }
  function showCard(k) {
    const c = COMP[k];
    if (!c || k === 'overview') { card.hidden = true; return; }
    const info = compInfo[k];
    card.querySelector('[data-card-tag]').textContent = `构件 ${k}`;
    card.querySelector('[data-card-title]').textContent = c.title;
    const conf = info && info.conf.size ? confTags(info.conf) : c.conf;
    card.querySelector('[data-card-conf]').textContent = conf;
    card.querySelector('[data-card-desc]').textContent = c.desc;
    const photos = info && info.photos.size ? [...info.photos].sort() : c.photos;
    card.querySelector('[data-card-photos]').textContent = photos.length ? `模型依据原照：${photos.join('、')}` : '暂无直接原照，形制为推定';
    const acts = card.querySelector('[data-card-acts]');
    acts.innerHTML = '';
    if (c.plate && opts.openPlate) {
      const b = document.createElement('button');
      b.className = 'btn btn--ink btn--sm'; b.type = 'button'; b.textContent = '看盛景图';
      b.addEventListener('click', () => opts.openPlate(c.plate));
      acts.appendChild(b);
    }
    if (c.photos.length && opts.openPhotos) {
      const b = document.createElement('button');
      b.className = 'btn btn--line btn--sm'; b.type = 'button'; b.textContent = '看原照';
      b.addEventListener('click', () => opts.openPhotos(c.photos));
      acts.appendChild(b);
    }
    card.hidden = false;
  }
  const api = {
    focus(k, instant) {
      if (!VIEWS[k]) return;
      active = k;
      flyTo(k, instant);
      showCard(k);
      labels.forEach((l) => l.el.classList.toggle('is-on', l.k === k));
      viewsEl.querySelectorAll('[data-view]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.view === k)));
    },
    setTime,
    setResearch,
    views: ORDER,
    renderer, scene, camera, controls,
  };

  // 导览
  let tourTimer = null;
  function stopTour() {
    if (!tourTimer) return;
    clearInterval(tourTimer); tourTimer = null;
    stage.querySelector('[data-act="tour"]').setAttribute('aria-pressed', 'false');
  }
  function startTour() {
    let i = Math.max(0, ORDER.indexOf(active));
    const next = () => { i = (i + 1) % ORDER.length; api.focus(ORDER[i]); };
    next();
    tourTimer = setInterval(next, 6500);
    stage.querySelector('[data-act="tour"]').setAttribute('aria-pressed', 'true');
  }
  stage.addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const act = b.dataset.act;
    if (act === 'hyp') setResearch(!research);
    if (act === 'tour') (tourTimer ? stopTour() : startTour());
    if (act === 'reset') { stopTour(); api.focus('overview'); }
    if (act === 'close') { card.hidden = true; labels.forEach((l) => l.el.classList.remove('is-on')); }
    if (act === 'fs') {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (stage.requestFullscreen) stage.requestFullscreen();
    }
  });
  controls.addEventListener('start', () => { stopTour(); camAnim = null; controls.autoRotate = false; });
  controls.addEventListener('end', () => { if (camera.position.distanceTo(controls.target) > 16) active = 'overview'; });

  // 尺寸
  function resize() {
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.9 ? 55 : 42;
    camera.updateProjectionMatrix();
  }
  new ResizeObserver(resize).observe(stage);
  resize();

  // 渲染循环
  let visible = true;
  new IntersectionObserver(([en]) => { visible = en.isIntersecting; if (visible) loop(); }, { threshold: 0.01 }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
  const proj = new THREE.Vector3();
  let rafId = 0;
  let running = false;
  function updateLabels() {
    const w = stage.clientWidth, h = stage.clientHeight;
    labels.forEach((l) => {
      proj.copy(l.p).project(camera);
      const behind = proj.z > 1 || proj.z < -1;
      const x = (proj.x * 0.5 + 0.5) * w, y = (-proj.y * 0.5 + 0.5) * h;
      const off = behind || x < -40 || x > w + 40 || y < 40 || y > h - 50;
      const far = camera.position.distanceTo(l.p) > 70;
      const close = active !== 'overview' && camera.position.distanceTo(controls.target) < 16;
      l.el.classList.toggle('is-hidden', off || ((far || close) && l.k !== active));
      if (!off) l.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
    });
  }
  function frame(now) {
    if (timeAnim) {
      const t = Math.min(1, (now - timeAnim.t0) / timeAnim.dur), e = ease(t);
      colorKeys.forEach((k) => { cur[k].copy(timeAnim.from[k]).lerp(timeAnim.to[k], e); });
      numKeys.forEach((k) => { cur[k] = timeAnim.from[k] + (timeAnim.to[k] - timeAnim.from[k]) * e; });
      cur.az = timeAnim.from.az + timeAnim.dAz * e;
      applyTime();
      if (t >= 1) timeAnim = null;
    }
    if (camAnim) {
      const t = Math.min(1, (now - camAnim.s) / camAnim.dur), e = ease(t);
      camera.position.lerpVectors(camAnim.p0, camAnim.p1, e);
      camera.position.y += Math.sin(Math.PI * e) * camAnim.lift;
      controls.target.lerpVectors(camAnim.t0p, camAnim.t1, e);
      if (t >= 1) camAnim = null;
    }
    controls.update();
    sky.position.copy(camera.position);
    stars.position.copy(camera.position);
    renderer.render(scene, camera);
    updateLabels();
  }
  function loop() {
    if (running) return;
    running = true;
    const tick = (now) => {
      if (!visible || document.hidden) { running = false; return; }
      frame(now);
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
  }
  api.renderOnce = () => frame(performance.now());

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    cancelAnimationFrame(rafId);
    stage.dataset.state = 'error';
    stage.querySelector('.stage__fallback').hidden = false;
  });

  // 预编译后首帧
  if (renderer.compileAsync) { try { await renderer.compileAsync(scene, camera); } catch (e) { /* 忽略 */ } }
  frame(performance.now());
  stage.dataset.state = 'ready';
  loop();
  return api;
}
