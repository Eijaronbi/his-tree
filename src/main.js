import * as THREE from 'three';
import { makeGltfLoader } from './core/GLTF.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { Input } from './core/Input.js';
import { ThirdPersonController, collectColliders } from './core/ThirdPersonController.js';
import { loadLofi, Flight } from './core/Flight.js';
import { AudioManager } from './core/AudioManager.js';
import { Narrator } from './core/Narrator.js';
import { PostFX } from './core/PostFX.js';
import { QualityController } from './core/Quality.js';
import { ASSET_ORIGIN, ASSET_VERSION, requestPersistentStorage, storageEstimate } from './core/Assets.js';
import { disposeTree, memorySnapshot, releaseOwner } from './core/Memory.js';
import { setAssetTier } from './core/AssetTiers.js';
import { CameraDirector } from './core/CameraDirector.js';
import { MaliTown } from './world/MaliTown.js';
import { skyDome } from './world/Materials.js';
import { exteriorEnvironment, interiorEnvironment, applyEnvironment } from './world/Environment.js';
import { loadCharacters, instantiateCharacters } from './world/Characters.js';
import { dressMaliCourt } from './world/Attire.js';
import { buildHall1865 } from './world/Hall1865.js';
import { buildTrench1917, buildArchive1989 } from './world/OtherEras.js';
import { Quest, loadSave } from './core/Quest.js';
import { Ask } from './core/Ask.js';
import { Combat } from './core/Combat.js';
import { UI } from './ui/UI.js';
import { poseCharacter } from './world/CharacterAnim.js';
import { CHAPTERS, DIALOGUE } from './data/story.js';
import { Cinematic } from './ui/Cinematic.js';
import { Waypoint } from './ui/Waypoint.js';
import { WorldMap } from './ui/WorldMap.js';
import { AvatarPicker } from './ui/AvatarPicker.js';
import { AvatarPreview } from './ui/AvatarPreview.js';
import { loadMount } from './world/Mounts.js';

const safeStore = (() => {
  try {
    const k = '__his_tree_probe';
    window.localStorage.setItem(k, '1');
    window.localStorage.removeItem(k);
    return window.localStorage;
  } catch (e) {
    const mem = new Map();
    return {
      getItem: (k) => (mem.has(k) ? mem.get(k) : null),
      setItem: (k, v) => mem.set(k, String(v)),
      removeItem: (k) => mem.delete(k),
    };
  }
})();

const AVATARS = [
  { id: 'frock', name: 'Augustin Roux', era: 'Merchant, 1324', blurb: 'A coat cut for counting coin.', thumb: './thumbs/faces/frock.png', file: './assets/models/characters/audience_lod/char_adult_m_frock.glb' },
  { id: 'officer', name: 'Nathaniel Ward', era: 'Officer, 1865', blurb: 'Buttons polished, conscience not.', thumb: './thumbs/faces/officer.png', file: './assets/models/characters/audience_lod/char_adult_m_officer.glb' },
  { id: 'elegant', name: 'Clara Bellamy', era: 'Singer, 1865', blurb: 'Knows every door in the city.', thumb: './thumbs/faces/elegant.png', file: './assets/models/characters/audience_lod/char_adult_f_elegant.glb' },
  { id: 'simple', name: 'Maren Holt', era: 'Seamstress, 1917', blurb: 'Thread and nerves both thin.', thumb: './thumbs/faces/simple.png', file: './assets/models/characters/audience_lod/char_adult_f_simple.glb' },
  { id: 'worker', name: 'Silas Pike', era: 'Dockhand, 1893', blurb: 'Carries what the century drops.', thumb: './thumbs/faces/worker.png', file: './assets/models/characters/audience_lod/char_worker.glb' },
  { id: 'soldier', name: 'Tommy Doyle', era: 'Private, 1917', blurb: 'Sixteen, and already old.', thumb: './thumbs/faces/soldier.png', file: './assets/models/characters/audience_lod/char_soldier_blue.glb' },
  { id: 'elder-m', name: 'Elias Crane', era: 'Archivist, 1989', blurb: 'Kept the file nobody wanted.', thumb: './thumbs/faces/elder-m.png', file: './assets/models/characters/audience_lod/char_old_m_top.glb' },
  { id: 'elder-f', name: 'Agnes Pike', era: 'Widow, 1917', blurb: 'Has buried better men than you.', thumb: './thumbs/faces/elder-f.png', file: './assets/models/characters/audience_lod/char_old_f_bonnet.glb' },
  { id: 'lofi', name: 'Lofi', era: 'Yeti, out of time', blurb: 'Floats. Flies. Judges you.', thumb: './thumbs/faces/lofi.png', file: './assets/models/characters/lofi.glb' }
];

const EXTRA_CARDS = [];

const CONTINENT_BY_CHAPTER = {
  'mali-1324': 'Africa',
  'washington-1865': 'North America',
  'france-1917': 'Europe',
  'berlin-1989': 'Europe'
};

const CARD_BY_CHAPTER = {
  'mali-1324': './assets/textures/scenery/pano_desert.jpg',
  'washington-1865': './assets/textures/scenery/playbill.webp'
};

let cine = null;
let waypoint = null;
let lastObjectiveStep = null;
let worldMap = null;
let avatarPicker = null;
let avatarPreview = null;
let pickerHoverTimer = 0;
let pickerHoverToken = 0;
let pendingChapterId = null;
let chosenAvatar = null;
let avatarModel = null;
let avatarLoading = null;

const canvas = document.getElementById('scene');
const loadingBar = document.getElementById('loading');
const title = document.getElementById('title');
const statsEl = document.getElementById('stats');
const params = new URLSearchParams(location.search);
const MODE_KEY = 'his-tree:mode:v1';
const historyBadgeEl = document.getElementById('history-badge');
let historyMode = 'real';
let historyDivergences = 0;
try {
  const stored = localStorage.getItem(MODE_KEY);
  if (stored === 'rewrite' || stored === 'real') historyMode = stored;
} catch (e) { /* ignore */ }
if (params.get('mode') === 'rewrite') historyMode = 'rewrite';
if (params.get('mode') === 'real') historyMode = 'real';
const qualityParam = params.get('q');
const autostartParam = params.get('chapter');
const autoParam = params.get('auto') === '1';
const camParam = params.get('cam');
const avatarParam = params.get('avatar');
const flags = {
  shadow: params.get('shadow') !== '0',
  lights: params.get('lights') !== '0',
  px: params.get('px') === '1',
  post: params.get('post') !== '0'
};

const renderer = new THREE.WebGLRenderer({ canvas, antialias: !flags.px, powerPreference: 'high-performance' });

function detectTier() {
  if (qualityParam && ['high', 'medium', 'low'].includes(qualityParam)) return qualityParam;
  const saved = safeStore.getItem('his-tree:quality');
  if (saved) return saved;
  try {
    const gl = renderer.getContext();
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : '';
    if (/swiftshader|llvmpipe|software|basic render/i.test(name)) return 'low';
    if (/mali|adreno|powervr|intel.*(hd|uhd) graphics (5|6|7)\d\d/i.test(name)) return 'medium';
  } catch (e) { /* ignore */ }
  return 'high';
}

let tier = detectTier();
setAssetTier(tier);
const adaptEnabled = params.get('adapt') !== '0';
renderer.setPixelRatio(flags.px ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight, false);
renderer.domElement.style.width = '100%';
renderer.domElement.style.height = '100%';
renderer.shadowMap.enabled = flags.shadow;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = 0.92;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 900);
camera.position.set(0, 6, 12);

const hemi = new THREE.HemisphereLight(0x9dc0ec, 0x9c8058, 0.22);
const ambient = new THREE.AmbientLight(0xbcd4ef, 0.055);
const sun = new THREE.DirectionalLight(0xffe6c0, 3.1);
sun.position.set(58, 74, 42);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 260;
sun.shadow.camera.left = -70;
sun.shadow.camera.right = 70;
sun.shadow.camera.top = 70;
sun.shadow.camera.bottom = -70;
sun.shadow.bias = -0.0006;
sun.shadow.normalBias = 0.02;
scene.add(sun, sun.target, hemi, ambient);

const input = new Input(canvas);
const audio = new AudioManager();
const loader = makeGltfLoader();
const director = new CameraDirector(camera);
const ui = new UI();

let post = null;
try { localStorage.removeItem('his-tree:pov'); } catch (e) { /* private mode */ }

const quality = new QualityController(renderer, {
  tier,
  manual: !adaptEnabled || !!qualityParam,
  targetFps: params.get('fps') ? Number(params.get('fps')) : undefined,
  onChange: (state) => {
    if (sun && sun.shadow) {
      const size = state.step >= 2 ? 1024 : (tier === 'low' ? 1024 : tier === 'medium' ? 1536 : 2048);
      if (sun.shadow.mapSize.x !== size) {
        sun.shadow.mapSize.set(size, size);
        if (sun.shadow.map) {
          sun.shadow.map.dispose();
          sun.shadow.map = null;
        }
      }
    }
    if (post) post.setResolutionScale(state.scale);
  }
});
let controller = null;
let player = null;
let mixer = null;
let world = null;
let narrator = null;
let npcs = {};
let props = {};
let quest = null;
let cfg = null;
let activeChapter = null;
let sky = null;
let ask = null;
let combat = null;
let mounts = [];
let activeMount = null;
let flight = null;
let lofiRoot = null;
let lofiHolder = null;
let avatarMode = 'default';
let playerBody = null;
let playerPose = null;
let clock = new THREE.Clock();

const baseModels = {};
const baseClips = {};

function loadModel(key, file, retries = 2) {
  return new Promise((resolve) => {
    const attempt = (n) => {
      loader.load(file, (gltf) => {
        baseModels[key] = gltf.scene;
        baseClips[key] = gltf.animations || [];
        resolve(true);
      }, undefined, () => {
        if (n < retries) {
          setTimeout(() => attempt(n + 1), 500 * (n + 1));
        } else {
          console.warn('asset failed after retries', file);
          resolve(false);
        }
      });
    };
    attempt(0);
  });
}

const CHAPTER_ASSETS = {
  'mali-1324': [
    ['palm', './assets/models/tree_palm.glb'],
    ['camel', './assets/models/camel-base.glb'],
    ['donkey', './assets/models/donkey-base.glb'],
    ['horse', './assets/models/horse-base.glb']
  ]
};
const chapterAssetPromises = {};

function ensureChapterAssets(chapterId) {
  const list = CHAPTER_ASSETS[chapterId] || [];
  if (!list.length) return Promise.resolve([]);
  if (!chapterAssetPromises[chapterId]) {
    chapterAssetPromises[chapterId] = Promise.all(list.map(([k, f]) => loadModel(k, f)));
  }
  return chapterAssetPromises[chapterId];
}

function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;
  if (location.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(location.hostname)) return;
  navigator.serviceWorker.register('./sw.js?v=10').catch(() => undefined);
}

async function boot() {
  registerServiceWorker();
  const jobs = [
    ['player', './assets/models/characters/player_1865.glb']
  ];
  let done = 0;
  await Promise.all(jobs.map(async ([k, f]) => {
    await loadModel(k, f);
    done++;
    loadingBar.style.width = `${Math.round((done / jobs.length) * 100)}%`;
  }));
  setTimeout(() => { loadingBar.style.width = '0%'; }, 400);

  if (flags.post) post = new PostFX(renderer, scene, camera, tier, 'mali');
  if (post) post.setResolutionScale(quality.scale);

  if (avatarParam === 'lofi') avatarMode = 'lofi';
  const save = loadSave();
  if (avatarParam) {
    const a = AVATARS.find((v) => v.id === avatarParam);
    if (a) { chosenAvatar = a; await applyAvatar(a); }
  }
  if (autostartParam) startChapter(autostartParam);
  else if (params.get('menu') === '1') ui.menu(CHAPTERS.map((c) => ({
    ...c,
    tagline: (save.completed || []).includes(c.id) ? `${c.tagline} · completed` : c.tagline
  })), startChapter, () => {
    safeStore.removeItem('his-tree:save:v1');
    location.reload();
  }, (mode) => setHistoryMode(mode));
  else openMap();

  waypoint = new Waypoint();

  narrator = new Narrator();
  narrator.load().then(() => {
    ui.narratorVoices = narrator.voices;
    ui.narratorVoice = narrator.voice;
    ui.narratorEnabled = narrator.enabled;
    if (ui.menuEl) {
      const sel = ui.menuEl.querySelector('.nr-voice');
      if (sel) {
        sel.innerHTML = narrator.voices.map((v) => `
          <option value="${v.id}" ${v.id === narrator.voice ? 'selected' : ''}>${v.label}</option>`).join('');
        sel.value = narrator.voice;
      }
      const box = ui.menuEl.querySelector('.nr-mute-box');
      if (box) box.checked = narrator.enabled;
    }
  });
  ui.onLine = (line) => narrator.speak(line && line.text);
  ui.onEndingText = (text) => narrator.speak(text);
  ui.onNarratorVoice = (id) => narrator.setVoice(id);
  ui.onNarratorMute = (on) => narrator.setEnabled(on);

  const storedQuality = safeStore.getItem('his-tree:quality');
  ui.graphicsQuality = storedQuality || 'auto';
  ui.onGraphicsQuality = (value) => {
    const v = value === 'auto' ? 'auto' : value;
    ui.graphicsQuality = v;
    try {
      if (v === 'auto') safeStore.removeItem('his-tree:quality');
      else safeStore.setItem('his-tree:quality', v);
    } catch (e) { /* ignore */ }
    if (v === 'auto') {
      quality.setManual(false);
    } else {
      tier = v;
      setAssetTier(v);
      quality.setTier(v, true);
      if (post) post.setTier(v);
    }
  };

  window.__game = { scene, camera, renderer, quality: quality.state, memory: () => memorySnapshot(renderer), assets: { origin: ASSET_ORIGIN, version: ASSET_VERSION }, setPOV, togglePOV, get pov() { return !!(controller && controller.firstPerson); }, get flight() { return flight; }, get state() { return { world, npcs, props, quest, player, post, chapter: activeChapter, controller, input, flight, playerPose, avatarMode, mounts, narrator, get activeMount() { return activeMount; } }; }, THREE };
  loop();
}

function disposeWorld() {
  if (waypoint) waypoint.clear();
  if (combat) { combat.disable(); combat = null; }
  if (activeMount) { dismount(); }
  for (const m of mounts) { scene.remove(m.root); }
  mounts = [];
  ask = null;
  if (world && world.group) {
    world.group.traverse((o) => {
      if (o.isMesh && o.userData.ownedGeometry && o.geometry) o.geometry.dispose();
    });
    disposeTree(world.group);
    scene.remove(world.group);
  }
  Object.values(npcs).forEach((n) => {
    scene.remove(n.root);
    n.root.traverse((o) => {
      if (o.isMesh && o.geometry && o.geometry.userData.shared !== true) o.geometry.dispose();
    });
    disposeTree(n.root);
  });
  releaseOwner(activeChapter ? activeChapter.id : 'none');
  npcs = {};
  props = {};
  world = null;
  quest = null;
}

async function ensureLofi() {
  if (lofiRoot) return lofiRoot;
  if (!lofiHolder) {
    lofiHolder = new THREE.Group();
    lofiHolder.visible = false;
    scene.add(lofiHolder);
  }
  lofiRoot = await loadLofi(lofiHolder);
  if (lofiRoot) {
    lofiRoot.traverse((o) => {
      if (o.isMesh && (o.name === 'Cube' || o.name === 'Cube.001')) o.visible = false;
    });
  }
  return lofiRoot;
}

function setAvatar(kind) {
  if (!player || !controller) return;
  const pivot = player;
  let rig = pivot.children.find((c) => c.userData.poseRig);
  if (!rig) {
    rig = new THREE.Group();
    rig.userData.poseRig = true;
    pivot.add(rig);
  }
  for (const child of [...rig.children]) rig.remove(child);
  avatarMode = kind;
  let model = null;
  let height = 1.8;
  if (kind === 'lofi' && lofiRoot) {
    model = lofiRoot;
    height = 1.72;
    model.position.set(0, 0, 0);
    rig.add(model);
    const fb = new THREE.Box3().setFromObject(model);
    if (Number.isFinite(fb.min.y) && Math.abs(fb.min.y) > 0.005) model.position.y -= fb.min.y;
  } else if (baseModels.player) {
    model = buildAvatarModel('default');
    height = model.userData.height || 1.8;
    rig.add(model);
  }
  playerBody = model;
  playerPose = (model && !/pose=0/.test(location.search)) ? poseCharacter(model, { armDown: 'auto', legAmp: 0.32, armAmp: 0.38, armOut: 0.035 }) : null;
  mixer = new THREE.AnimationMixer(model || rig);
  controller.mixer = mixer;
  controller.actions = {};
  controller.walkAction = null;
  controller.runAction = null;
  controller.idleAction = null;
  controller.height = height * 0.84;
  controller.eyeHeight = height * 0.9;
  controller.povForward = 0.22;
  controller.groundY = 0;
  if (flight) {
    flight.rig = rig;
    flight.baseEye = controller.eyeHeight;
    flight.enable(kind === 'lofi');
  }
  ui.setPowers(kind === 'lofi'
    ? [{ key: 'F', label: 'Float' }, { key: 'G', label: 'Fly' }, { key: 'V', label: 'Change avatar' }]
    : []);
  ui.toast(kind === 'lofi' ? 'You are Lofi the Yeti' : 'Back to your own body', 1800);
}

async function ensureAvatar(file) {
  if (avatarModel && avatarModel.userData.file === file) return avatarModel;
  if (avatarLoading) await avatarLoading.catch(() => {});
  avatarLoading = new Promise((resolve) => {
    if (!file) { resolve(null); return; }
    loader.load(file, (gltf) => {
      const model = gltf.scene;
      model.userData.file = file;
      avatarModel = model;
      resolve(model);
    }, undefined, () => resolve(null));
  });
  return avatarLoading;
}

function buildAvatarModel(kind) {
  if (kind === 'lofi' && lofiRoot) {
    lofiRoot.updateMatrixWorld(true);
    return lofiRoot;
  }
  const src = avatarModel || baseModels.player;
  if (!src) return null;
  const model = cloneSkinned(src);
  model.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(model);
  const c = new THREE.Vector3();
  box.getCenter(c);
  const height = Math.max(0.4, box.max.y - box.min.y);
  model.position.set(-c.x, -box.min.y, -c.z);
  model.userData.height = height;
  return model;
}

function makePlayer(chapter, source = null) {
  const pivot = new THREE.Group();
  const rig = new THREE.Group();
  rig.userData.poseRig = true;
  pivot.add(rig);
  let model = null;
  let height = 1.8;
  if (avatarMode === 'lofi' && lofiRoot) {
    model = lofiRoot;
    height = 1.72;
    rig.add(model);
  } else if (chapter.id === 'mali-1324' && source && chapter.playerFile !== null) {
    model = cloneSkinned(source.pristine || source.root);
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const c = new THREE.Vector3();
    box.getCenter(c);
    const h = Math.max(0.4, box.max.y - box.min.y);
    model.position.set(-c.x, -box.min.y, -c.z);
    model.userData.height = h;
    height = h;
    rig.add(model);
  } else if (baseModels.player && chapter.playerFile !== null) {
    model = buildAvatarModel('default');
    height = model.userData.height || 1.8;
    rig.add(model);
  } else {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.0, 6, 12), new THREE.MeshStandardMaterial({ color: 0x8a5a35, roughness: 0.85 }));
    body.position.y = 0.9;
    body.castShadow = true;
    rig.add(body);
  }
  pivot.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  scene.add(pivot);
  mixer = new THREE.AnimationMixer(model || rig);
  const clips = [];
  controller = new ThirdPersonController(camera, pivot, mixer, clips, input, 0);
  controller.height = height * 0.84;
  controller.eyeHeight = height * 0.9;
  controller.povForward = 0.22;
  flight = new Flight({ player: pivot, controller, camera, scene, ui, input, rig });
  flight.baseEye = controller.eyeHeight;
  controller.setFirstPerson(false);
  if (quality) quality.setScaleLock(false);
  povLabel(false);
  playerBody = model;
  playerPose = (model && !/pose=0/.test(location.search)) ? poseCharacter(model, { armDown: 'auto', legAmp: 0.32, armAmp: 0.38, armOut: 0.035 }) : null;
  flight.enable(avatarMode === 'lofi');
  if (typeof syncTouchPowers === 'function') syncTouchPowers();
  if (avatarMode === 'lofi') {
    ui.setPowers([{ key: 'F', label: 'Float' }, { key: 'G', label: 'Fly' }, { key: 'V', label: 'Change avatar' }]);
  }
  return pivot;
}

function setAtmosphere(chapter) {
  if (sky) { scene.remove(sky); sky = null; }
  const isMali = chapter.id === 'mali-1324';
  if (isMali) {
    sky = skyDome();
    scene.add(sky);
    const env = exteriorEnvironment({ top: 0x4a7fb5, horizon: 0xe6cfa4, ground: 0xb08a5c, sunDir: new THREE.Vector3(0.55, 0.62, 0.42), sunColor: 0xfff0d4 });
    applyEnvironment(scene, env, 0.75);
    scene.background = new THREE.Color(0x9fc0e0);
    scene.fog = new THREE.FogExp2(0xd8bf94, 0.0032);
    sun.intensity = 3.1;
    sun.color.setHex(0xffe6c0);
    sun.castShadow = flags.shadow;
    hemi.intensity = 0.22;
    ambient.intensity = 0.028;
  } else {
    const env = interiorEnvironment({
      top: chapter.palette.clothIndigo,
      horizon: chapter.palette.haze,
      ground: chapter.palette.adobeDark,
      sunColor: chapter.palette.sun
    });
    applyEnvironment(scene, env, 0.35);
    scene.background = new THREE.Color(chapter.palette.haze).multiplyScalar(0.32);
    scene.fog = new THREE.FogExp2(
      chapter.id === 'washington-1865' ? 0x2a1c14 : chapter.palette.haze,
      chapter.id === 'france-1917' ? 0.022 : chapter.id === 'washington-1865' ? 0.016 : 0.012
    );
    sun.intensity = 0.28;
    sun.color.setHex(0x8ea4bd);
    sun.castShadow = false;
    hemi.intensity = 0.055;
    hemi.color.setHex(0x6c7f9c);
    hemi.groundColor.setHex(0x3a2f26);
    ambient.intensity = 0.055;
  }
  if (post) post.setPreset(chapter.post);
}

function overlayObjective(chapter) {
  ui.setChapter(chapter);
}

const MOUNT_SPAWNS = {
  'mali-1324': [
    { kind: 'donkey', file: './assets/models/donkey-base.glb', x: 52.5, z: -19.5, rot: 2.4 },
    { kind: 'horse', file: './assets/models/horse-base.glb', x: 47.0, z: -31.0, rot: 0.8 }
  ],
  'washington-1865': []
};

async function spawnMounts(chapterId) {
  const list = MOUNT_SPAWNS[chapterId] || [];
  for (const spec of list) {
    const pre = baseModels[spec.kind] ? { scene: baseModels[spec.kind], clips: baseClips[spec.kind] } : null;
    const m = await loadMount(spec.kind, spec.file, scene, spec, pre);
    if (m) {
      if (world && world.groundHeight) m.root.position.y = world.groundHeight(m.root.position.x, m.root.position.z);
      mounts.push(m);
    }
  }
}

const MALI_TOWNSFOLK = [
  { x: -7.5, z: 17.2, rot: 1.4, role: 'trader', scale: 1.0 },
  { x: 6.8, z: 14.6, rot: -1.1, role: 'noble', scale: 0.97 },
  { x: -11.2, z: 11.0, rot: 2.2, role: 'guide', scale: 1.02 },
  { x: 9.4, z: 9.2, rot: -2.0, role: 'trader', scale: 0.99 },
  { x: -4.4, z: 8.0, rot: 0.6, role: 'guard', scale: 1.03 },
  { x: 3.6, z: 19.5, rot: 2.8, role: 'noble', scale: 0.96 },
  { x: -14.5, z: 18.4, rot: -1.6, role: 'trader', scale: 1.01 },
  { x: 12.6, z: 17.8, rot: 1.9, role: 'guide', scale: 0.98 },
  { x: -22.0, z: -4.0, rot: 0.4, role: 'guide', scale: 1.0 },
  { x: 19.0, z: -9.0, rot: -2.6, role: 'trader', scale: 0.97 }
];

function spawnMaliTownsfolk() {
  const sources = ['bakary', 'amina', 'salim', 'musa'];
  MALI_TOWNSFOLK.forEach((spot, i) => {
    const source = npcs[sources[i % sources.length]];
    if (!source || !source.pristine) return;
    const [character] = instantiateCharacters(source.pristine, [{
      x: spot.x,
      z: spot.z,
      rot: spot.rot,
      scale: spot.scale,
      label: 'Townsfolk',
      dress: (root) => dressMaliCourt(root, spot.role)
    }], scene);
    if (character) npcs['town' + i] = character;
  });
}

function nearestMount(maxDist = 3.2) {
  if (!player) return null;
  let best = null;
  let bestD = maxDist;
  for (const m of mounts) {
    if (m.occupied) continue;
    const d = Math.hypot(m.root.position.x - player.position.x, m.root.position.z - player.position.z);
    if (d < bestD) { bestD = d; best = m; }
  }
  return best;
}

function mountUp(m) {
  if (!m || activeMount) return;
  activeMount = m;
  controller.frozen = true;
  controller.velocity.set(0, 0, 0);
  m.attach(player);
  if (playerPose) playerPose.setPose('sit');
  ui.toast('Press R to dismount', 1600);
}

function dismount() {
  const m = activeMount;
  if (!m) return;
  activeMount = null;
  const rider = m.detach();
  if (rider) {
    const side = new THREE.Vector3(1.1, 0, 0.4).applyAxisAngle(new THREE.Vector3(0, 1, 0), m.root.rotation.y);
    rider.position.set(m.root.position.x + side.x, 0, m.root.position.z + side.z);
    rider.rotation.y = m.root.rotation.y;
  }
  if (controller) { controller.frozen = false; controller.velocity.set(0, 0, 0); }
  if (playerPose) playerPose.setPose('idle');
}

function updateRiding(dt, t) {
  const m = activeMount;
  if (!m || !player || !controller) return;
  controller.frozen = true;
  const axis = input.axis();
  const moving = axis.len > 0.06;
  const speedCap = input.run ? m.speeds.run : m.speeds.walk;
  const forward = new THREE.Vector3(Math.sin(controller.yaw), 0, Math.cos(controller.yaw));
  const right = new THREE.Vector3(-forward.z, 0, forward.x);
  const desired = new THREE.Vector3()
    .addScaledVector(forward, axis.y)
    .addScaledVector(right, axis.x);
  if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(speedCap * axis.len);
  const accel = moving ? 6 : 9;
  m.velocity = m.velocity || new THREE.Vector3();
  m.velocity.lerp(desired, Math.min(1, dt * accel));
  const planar = Math.hypot(m.velocity.x, m.velocity.z);
  m.root.position.addScaledVector(m.velocity, dt);
  if (world && world.groundHeight) m.root.position.y = world.groundHeight(m.root.position.x, m.root.position.z);
  if (world && world.resolveCollisions) world.resolveCollisions(m.root.position, 0.9);
  if (planar > 0.15) {
    const target = Math.atan2(m.velocity.x, m.velocity.z);
    let diff = target - m.root.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    m.root.rotation.y += diff * Math.min(1, dt * 5.5);
  }
  m.update(dt, t, speedCap > 0 ? planar / speedCap : 0);
  const seat = m.seatPosition(new THREE.Vector3());
  player.position.copy(seat);
  player.rotation.y = m.root.rotation.y;
  controller.speed = planar;
  controller.walkPhase += planar * dt * 1.6;
  controller.state = planar > m.speeds.walk * 1.1 ? 'run' : (planar > 0.15 ? 'walk' : 'idle');
}

async function startChapter(id) {
  const chapter = CHAPTERS.find((c) => c.id === id);
  if (!chapter) return;
  ui.removeMenu();
  disposeWorld();
  if (player) { scene.remove(player); player = null; }
  setAtmosphere(chapter);
  activeChapter = chapter;
  historyDivergences = 0;
  if (ui) ui.setHistoryMode(historyMode);
  updateHistoryBadge();
  overlayObjective(chapter);

  await ensureChapterAssets(chapter.id);

  if (chapter.id === 'mali-1324') {
    world = new MaliTown(scene, baseModels, chapter.palette, { palms: true, lights: flags.lights, clips: baseClips });
    props = {
      stall: { position: new THREE.Vector3(0, 1.3, 24), label: 'The cloth stall', desc: 'Indigo bolts, unrolled cloth, a wooden counter with a hidden ledge beneath it. A folded page has been pushed under the ledge.' },
      'crate-a': { position: new THREE.Vector3(46, 1.0, -20), label: 'The astronomy crate', desc: 'Ptolemy, corrected in Toledo. The water has reached the second folio; the tables on eclipses are still dry.' },
      'crate-b': { position: new THREE.Vector3(48.4, 1.0, -20), label: 'The medical crate', desc: 'A physician’s compendium on fevers. Someone has written a note in the margin: “for the children, first”.' },
      camels: { position: new THREE.Vector3(-30, 1.2, -40), label: 'The water skins', desc: 'Four skins, two of them half-empty and one patched with a boot sole. A guide who does not check the water is selling something else.' }
    };
    cfg = {
      spawn: new THREE.Vector3(0, 0, 6),
      npcs: [
        { id: 'amina', file: './assets/models/characters/amina.glb', fallback: './assets/models/character-female-c.glb', label: 'Amina', scale: 1.0 },
        { id: 'bakary', file: './assets/models/characters/bakary.glb', fallback: './assets/models/character-male-a.glb', label: 'Bakary' },
        { id: 'salim', file: './assets/models/characters/salim.glb', fallback: './assets/models/character-male-a.glb', label: 'Al-Hajj Salim' },
        { id: 'musa', file: './assets/models/characters/musa.glb', fallback: './assets/models/character-male-a.glb', label: 'Mansa Musa' }
      ],
      positions: {
        amina: { x: 2.4, z: 21 }, bakary: { x: -4.6, z: 24.5 },
        salim: { x: 45, z: -15 }, musa: { x: 0, z: -55 }
      }
    };
  } else if (chapter.id === 'washington-1865') {
    world = buildHall1865(scene);
    props = world.props;
    cfg = {
      spawn: world.spawn,
      npcs: [
        { id: 'parker', file: './assets/models/characters/parker.glb', fallback: './assets/models/character-male-a.glb', label: 'Officer Parker' },
        { id: 'grant', file: './assets/models/characters/grant.glb', fallback: './assets/models/character-male-a.glb', label: 'General Grant' },
        { id: 'booth', file: './assets/models/characters/booth.glb', fallback: './assets/models/character-male-a.glb', label: 'The actor' }
      ],
      positions: world.npcPositions
    };
  } else if (chapter.id === 'france-1917') {
    world = buildTrench1917(scene);
    props = world.props;
    cfg = {
      spawn: world.spawn,
      npcs: [{ id: 'sergeant', file: './assets/models/characters/sergeant.glb', fallback: './assets/models/character-male-a.glb', label: 'Sergeant Reed' }],
      positions: world.npcPositions
    };
  } else {
    world = buildArchive1989(scene);
    props = world.props;
    cfg = {
      spawn: world.spawn,
      npcs: [{ id: 'miep', file: './assets/models/characters/miep.glb', fallback: './assets/models/character-female-c.glb', label: 'Miep' }],
      positions: world.npcPositions
    };
  }

  if (avatarMode === 'lofi' && !lofiRoot) await ensureLofi();
  npcs = await loadCharacters(cfg.npcs, scene, cfg.positions);
  player = makePlayer(chapter, npcs.bakary || null);
  if (world && world.group && controller) {
    controller.setColliders(collectColliders(world.group));
    if (world.groundHeight) controller.setGroundHeight((x, z) => world.groundHeight(x, z));
    controller.setCollisionResolver((pos, radius) => {
      if (world && world.resolveCollisions) world.resolveCollisions(pos, radius);
    });
  }
  player.position.copy(cfg.spawn);
  player.rotation.y = Math.PI;
  camera.position.set(cfg.spawn.x, 4.2, cfg.spawn.z + 5.4);

  await spawnMounts(chapter.id);
  if (chapter.id === 'mali-1324') {
    if (npcs.musa) dressMaliCourt(npcs.musa.root, 'royal');
    if (npcs.salim) dressMaliCourt(npcs.salim.root, 'noble');
    if (npcs.amina) dressMaliCourt(npcs.amina.root, 'noble');
    if (npcs.bakary) dressMaliCourt(npcs.bakary.root, 'noble');
    spawnMaliTownsfolk();
  }
  quest = new Quest({
    chapter, scene, ui, player, npcs, props, world, save: loadSave(),
    auto: autoParam,
    onChoice: (opt) => recordHistoryChoice(opt),
    introExtra: historyMode === 'rewrite' ? (DIALOGUE.timekeeper_rewrite || []) : [],
    onEnding: (end) => {
      ui.showEnding(end, () => {
        const save = loadSave();
        ui.menu(CHAPTERS.map((c) => ({
          ...c,
          tagline: (save.completed || []).includes(c.id) ? `${c.tagline} · completed` : c.tagline
        })), startChapter, () => { safeStore.removeItem('his-tree:save:v1'); location.reload(); }, (mode) => setHistoryMode(mode));
        disposeWorld();
        if (player) { scene.remove(player); player = null; }
      });
    }
  });

  window.addEventListener('keydown', journalKey);
  quest.start();

  ask = new Ask({ chapter, ui, player, npcs, quest, input });

  if (chapter.id === 'washington-1865') {
    combat = new Combat({
      scene, player, camera, ui, input, chapter, body: playerBody,
      onEvent: (e) => {
        if (e.type === 'hurt') { ui.flashHurt(); ui.toast('You are hit', 900); }
        else if (e.type === 'kill') ui.toast(`${e.enemy} is down`, 1600);
        else if (e.type === 'pickup') ui.toast(e.kind === 'gun' ? 'You take the pistol' : 'You take the knife', 1400);
        else if (e.type === 'downed') ui.toast('You have fallen — they will carry you out', 2400);
        else if (e.type === 'empty') ui.toast('Empty', 900);
        else if (e.type === 'weapon') ui.toast(e.label, 1000);
        else if (e.type === 'swing') {
          if (e.kind === 'fist') audio.sfx(avatarMode === 'lofi' ? 'thud' : 'punch');
          else if (e.kind === 'kick') audio.sfx('kick');
          else if (e.kind === 'knife') audio.sfx(e.hit ? 'stab' : 'knife');
          else if (e.kind === 'gun') audio.sfx('gun');
          if (e.hit) audio.sfx('punch');
        }
      }
    });
    combat.setSpawn(cfg.spawn);
    combat.enable();
    combat.spawnEnemy({ id: 'assassin-1', x: -9.5, z: -5.5, rot: 0.8, label: 'A man in a cap', health: 64, damage: 9 });
    combat.spawnEnemy({ id: 'assassin-2', x: -13.2, z: -1.0, rot: 1.9, label: 'A man with a knife', health: 70, damage: 11 });
    combat.spawnEnemy({ id: 'assassin-3', x: -6.0, z: -9.0, rot: 0.2, label: 'A man in the passage', health: 58, damage: 8 });
    combat.spawnPickup({ kind: 'knife', x: -13.4, y: 1.05, z: 1.8, label: 'the knife on the porter’s table' });
    combat.spawnPickup({ kind: 'gun', x: 8.4, y: 1.18, z: 12.4, label: 'the pistol left on the bar' });
  }

  if (chapter.cinematic && chapter.cinematic.shots && params.get('cine') !== '0') {
    if (!cine) cine = new Cinematic({ camera, onComplete: () => { if (cine) { try { cine.dispose(); } catch (e) { /* ignore */ } } cine = null; } });
    cine.start({ ...chapter.cinematic, number: chapter.number, title: chapter.title });
  } else if (!input.touch && document.pointerLockElement !== canvas) {
    try { canvas.requestPointerLock(); } catch (e) { /* ignore */ }
  }
  try { audio.start(); } catch (e) { /* needs a gesture on some browsers */ }
  window.addEventListener('pointerdown', () => { try { audio.start(); } catch (e) { /* ignore */ } }, { once: true });
}

window.addEventListener('keydown', (e) => {
  if (!flight || !player) return;
  if (e.code === 'KeyL' && !combat) {
    const a = input.axis();
    const dir = new THREE.Vector3(Math.sin(controller.yaw), 0, Math.cos(controller.yaw));
    if (a.len > 0.1) {
      const fwd = new THREE.Vector3(Math.sin(controller.yaw), 0, Math.cos(controller.yaw));
      const right = new THREE.Vector3(-fwd.z, 0, fwd.x);
      dir.copy(fwd).multiplyScalar(a.y).addScaledVector(right, a.x);
    }
    controller.dash(dir);
    e.preventDefault();
  }
  if (e.code === 'KeyF') { e.preventDefault(); }
  if (e.code === 'KeyG') { e.preventDefault(); }
  if (e.code === 'KeyV') { setAvatar(avatarMode === 'lofi' ? 'default' : 'lofi'); e.preventDefault(); }
  if (e.code === 'KeyR') {
    if (activeMount) { dismount(); }
    else {
      const m = nearestMount();
      if (m) mountUp(m);
      else ui.toast('No mount nearby', 1200);
    }
    e.preventDefault();
  }
});

function journalKey(e) {
  if (e.code === 'KeyC' && quest) {
    if (ui.journal.style.display === 'block') ui.closeJournal();
    else ui.openJournal(quest.entries());
  }
  if (e.code === 'KeyM') {
    const on = audio.toggleMusic();
    ui.toast(on ? 'Music on' : 'Music off', 1400);
  }
}

let paused = false;

function povLabel(on) {
  const btn = document.getElementById('pausePov');
  if (btn) {
    btn.textContent = 'View: ' + (on ? 'Avatar (third person)' : 'First person');
    btn.classList.toggle('is-off', !!on);
  }
  const hud = document.getElementById('btnView');
  if (hud) {
    // the button always names what it will switch to
    hud.textContent = on ? 'AVATAR' : 'POV';
    hud.classList.toggle('is-pov', !!on);
    hud.setAttribute('aria-label', on ? 'Switch to avatar view' : 'Switch to first person view');
    hud.setAttribute('title', on ? 'Avatar view (P)' : 'First person view (P)');
  }
}

/**
 * First person (POV) mode. Works for every avatar, including Lofi the Yeti:
 * the camera moves to the character's eyes and the body turns with the view.
 * The game always starts in avatar (third person) mode, the toggle is explicit.
 */
function setPOV(on) {
  if (!controller) return false;
  const want = !!on;
  controller.setFirstPerson(want);
  if (quality) quality.setScaleLock(want);
  povLabel(want);
  if (ui) ui.toast(want ? 'First person view' : 'Avatar view', 1400);
  return want;
}

function togglePOV() {
  if (!controller) return false;
  return setPOV(!controller.firstPerson);
}

function setPaused(on) {
  paused = !!on;
  const panel = document.getElementById('pause');
  if (panel) {
    panel.classList.toggle('is-open', paused);
    panel.setAttribute('aria-hidden', paused ? 'false' : 'true');
  }
  if (paused && document.pointerLockElement === canvas) document.exitPointerLock();
  if (!paused && !input.touch && document.pointerLockElement !== canvas) {
    try { canvas.requestPointerLock(); } catch (e) { /* ignore */ }
  }
  if (ui) ui.setPaused(paused);
}

function setupPauseMenu() {
  const menuBtn = document.getElementById('btnMenu');
  if (menuBtn) menuBtn.addEventListener('click', () => { audio.sfx('ui'); setPaused(!paused); });
  const resume = document.getElementById('pauseResume');
  if (resume) resume.addEventListener('click', () => { audio.sfx('ui'); setPaused(false); });
  const povBtn = document.getElementById('pausePov');
  if (povBtn) povBtn.addEventListener('click', () => { audio.sfx('ui'); togglePOV(); });
  const viewBtn = document.getElementById('btnView');
  if (viewBtn) viewBtn.addEventListener('click', () => { audio.sfx('ui'); togglePOV(); });
  const chapters = document.getElementById('pauseChapters');
  if (chapters) chapters.addEventListener('click', () => {
    audio.sfx('ui');
    setPaused(false);
    if (avatarPicker) avatarPicker.hide();
    openMap();
  });
  const exit = document.getElementById('pauseExit');
  if (exit) exit.addEventListener('click', () => {
    audio.sfx('ui');
    setPaused(false);
    if (avatarPicker) avatarPicker.hide();
    if (flight && flight.mode !== 'ground') flight.toggleFly();
    if (activeMount) dismount();
    if (player) player.visible = false;
    disposeWorld();
    openMap();
  });
  const restart = document.getElementById('pauseRestart');
  if (restart) restart.addEventListener('click', () => {
    audio.sfx('ui');
    setPaused(false);
    if (activeChapter) startChapter(activeChapter.id);
  });
  const musicBtn = document.getElementById('pauseMusic');
  if (musicBtn) musicBtn.addEventListener('click', () => {
    const on = audio.toggleMusic();
    musicBtn.textContent = 'Music: ' + (on ? 'on' : 'off');
    musicBtn.classList.toggle('is-off', !on);
  });
  const sfxBtn = document.getElementById('pauseSfx');
  if (sfxBtn) sfxBtn.addEventListener('click', () => {
    const on = audio.toggleSfx();
    sfxBtn.textContent = 'Sound effects: ' + (on ? 'on' : 'off');
    sfxBtn.classList.toggle('is-off', !on);
  });
  window.addEventListener('keydown', (e) => {
    if (e.code === 'Escape' && player && !document.getElementById('avatarpicker-root')) {
      e.preventDefault();
      setPaused(!paused);
    }
  });
}

function setHistoryMode(mode) {
  historyMode = mode === 'rewrite' ? 'rewrite' : 'real';
  try { localStorage.setItem(MODE_KEY, historyMode); } catch (e) { /* ignore */ }
  if (ui) ui.setHistoryMode(historyMode);
  updateHistoryBadge();
  return historyMode;
}

function historyBadgeState() {
  const h = activeChapter && activeChapter.history;
  if (historyMode === 'rewrite') {
    return {
      text: historyDivergences ? `REWRITE MODE · ${historyDivergences} divergence${historyDivergences > 1 ? 's' : ''}` : 'REWRITE MODE',
      cls: 'rewrite'
    };
  }
  if (h && h.unrecorded) {
    return {
      text: historyDivergences ? `HISTORY UNRECORDED · ${historyDivergences}` : 'HISTORY UNRECORDED',
      cls: 'unrecorded'
    };
  }
  if (historyDivergences > 0) {
    return { text: `HISTORY REWRITTEN · ${historyDivergences}`, cls: 'rewritten' };
  }
  return { text: 'HISTORY INTACT', cls: 'intact' };
}

function updateHistoryBadge() {
  if (!historyBadgeEl) return;
  const state = historyBadgeState();
  historyBadgeEl.textContent = state.text;
  historyBadgeEl.className = state.cls;
  historyBadgeEl.style.display = 'block';
}

function recordHistoryChoice(opt) {
  const h = activeChapter && activeChapter.history;
  if (!h) return;
  const flags = (opt && opt.flags) || {};
  const matched = !!(h.verifiedKey && (h.verified || []).includes(flags[h.verifiedKey]));
  if (historyMode === 'rewrite' || !matched) historyDivergences += 1;
  updateHistoryBadge();
}

function isPortrait() { return window.innerHeight > window.innerWidth * 1.04; }

function syncOrientation() {
  document.body.classList.toggle('portrait', isPortrait());
}

function syncTouchPowers() {
  const show = avatarMode === 'lofi';
  for (const id of ['btnFloat', 'btnFly']) {
    const el = document.getElementById(id);
    if (el) el.style.display = show && document.body.classList.contains('touch') ? 'flex' : 'none';
  }
  const pov = document.getElementById('btnPov');
  if (pov) pov.style.display = document.body.classList.contains('touch') ? 'flex' : 'none';
}

function setupMobile() {
  setupPauseMenu();
  syncOrientation();
  syncTouchPowers();
  const full = document.getElementById('btnFull');
  if (full) {
    full.addEventListener('click', () => {
      const el = document.documentElement;
      if (!document.fullscreenElement) {
        (el.requestFullscreen ? el.requestFullscreen() : Promise.resolve()).then(() => {
          const lock = screen.orientation && screen.orientation.lock;
          if (lock) lock.call(screen.orientation, 'landscape').catch(() => {});
        }).catch(() => {});
      } else if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    });
  }
  const skip = document.getElementById('rotateSkip');
  if (skip) skip.addEventListener('click', () => document.body.classList.add('no-rotate'));
  window.addEventListener('orientationchange', () => setTimeout(syncOrientation, 120));
}

function stepTarget(st) {
  if (!st) return null;
  if (st.type === 'goto' && st.marker) return { x: st.marker.x, y: 0, z: st.marker.z, label: st.label || 'Go there' };
  if ((st.type === 'talk' || st.type === 'choice') && st.who && npcs[st.who]) {
    return { x: npcs[st.who].position.x, y: npcs[st.who].position.y, z: npcs[st.who].position.z, label: npcs[st.who].label || 'Speak to them' };
  }
  if (st.type === 'inspect' && st.target && props[st.target]) {
    return { x: props[st.target].position.x, y: props[st.target].position.y, z: props[st.target].position.z, label: props[st.target].label || 'Look closer' };
  }
  return null;
}

function objectiveTarget() {
  if (!quest) return null;
  const st = quest.step;
  const direct = stepTarget(st);
  if (direct) {
    lastObjectiveStep = st;
    return direct;
  }
  const steps = quest.mission && quest.mission.steps ? quest.mission.steps : [];
  const idx = typeof quest.stepIndex === 'number' ? quest.stepIndex : 0;
  for (let i = idx + 1; i < steps.length; i += 1) {
    const next = stepTarget(steps[i]);
    if (next) return next;
  }
  const previous = stepTarget(lastObjectiveStep);
  if (previous) return previous;
  return null;
}

function mapChapters() {
  const list = CHAPTERS.map((c) => ({
    ...c,
    continent: CONTINENT_BY_CHAPTER[c.id] || 'Europe',
    playable: true,
    card: CARD_BY_CHAPTER[c.id]
  }));
  return list.concat(EXTRA_CARDS);
}

function openMap() {
  if (!worldMap) {
    worldMap = new WorldMap({
      chapters: mapChapters(),
      onSelect: (chapter) => {
        if (!chapter.playable) return;
        pendingChapterId = chapter.id;
        openPicker();
      }
    });
  }
  worldMap.show();
}

function ensurePreview() {
  if (avatarPreview) return avatarPreview;
  const container = document.getElementById('avatar-preview');
  if (container) avatarPreview = new AvatarPreview(container, loader);
  return avatarPreview;
}

function openPicker() {
  if (!avatarPicker) {
    avatarPicker = new AvatarPicker({
      avatars: AVATARS,
      onSelect: async (a) => {
        if (!a || a.locked) return;
        chosenAvatar = a;
        avatarPicker.hide();
        await applyAvatar(a);
        if (pendingChapterId) startChapter(pendingChapterId);
        pendingChapterId = null;
      },
      onHover: (id) => {
        const a = AVATARS.find((v) => v.id === id);
        if (!a || !avatarPreview) return;
        const token = ++pickerHoverToken;
        if (pickerHoverTimer) window.clearTimeout(pickerHoverTimer);
        pickerHoverTimer = window.setTimeout(() => {
          pickerHoverTimer = 0;
          if (token !== pickerHoverToken) return;
          avatarPreview.load(a.file).catch(() => {});
        }, 160);
      }
    });
  }
  ensurePreview();
  avatarPicker.show();
  const first = AVATARS.find((a) => !a.locked);
  if (first && avatarPreview) avatarPreview.load(first.file).catch(() => {});
}

async function applyAvatar(a) {
  if (!a) return;
  avatarMode = a.id === 'lofi' ? 'lofi' : 'default';
  if (a.id === 'lofi') {
    await ensureLofi();
  } else {
    await ensureAvatar(a.file);
  }
  if (player && rig) setAvatar(avatarMode);
}

window.__setArm = () => false;
window.__openMap = openMap;
window.__openPicker = openPicker;
window.__avatarPreview = () => avatarPreview;
window.__poseUniforms = () => (playerPose ? playerPose.uniforms : null);

setupMobile();

function fitViewport() {
  const canvas = renderer.domElement;
  if (canvas) {
    canvas.style.width = '100%';
    canvas.style.height = '100%';
  }
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  quality.apply();
  if (post) post.resize();
  syncOrientation();
}

window.addEventListener('resize', fitViewport);
window.addEventListener('orientationchange', () => {
  fitViewport();
  setTimeout(fitViewport, 250);
  setTimeout(fitViewport, 700);
});
if (window.visualViewport) window.visualViewport.addEventListener('resize', fitViewport);

let frames = 0;
let fpsTime = 0;
function loop() {
  requestAnimationFrame(loop);
  const rawDt = clock.getDelta();
  const dt = Math.min(0.05, rawDt);
  const t = clock.elapsedTime;
  quality.update(rawDt);

  if (paused) {
    renderer.render(scene, camera);
    return;
  }
  const inCine = !!(cine && cine.active);
  if (inCine) cine.update(rawDt);
  if (player && controller && !inCine) {
    if (flight && !activeMount) flight.update(dt);
    if (playerPose) {
      if (flight && flight.mode === 'fly') playerPose.setPose('fly');
      else if (flight && flight.mode === 'float') playerPose.setPose('float');
      else if (playerPose.uniforms.uPose.value !== 0) playerPose.setPose('idle');
    }
    if (flight) {
      if (input.consume('KeyF')) flight.toggleFloat();
      if (input.consume('KeyG')) flight.toggleFly();
    }
    if (input.consume('KeyP')) togglePOV();
    controller.update(dt);
    if (activeMount) updateRiding(dt, t);
    if (playerPose) playerPose.setWalk(controller.speed, controller.walkPhase);
    if (window.__look) {
      const lk = window.__look;
      camera.position.set(lk.f[0], lk.f[1], lk.f[2]);
      camera.lookAt(lk.a[0], lk.a[1], lk.a[2]);
    } else if (window.__cam) {
      const c = window.__cam;
      camera.position.set(player.position.x + c.p[0], player.position.y + c.p[1], player.position.z + c.p[2]);
      camera.lookAt(player.position.x + (c.l[0] || 0), player.position.y + c.l[1], player.position.z + (c.l[2] || 0));
    } else if (camParam === 'box') { camera.position.set(16.6, 7.9, -2.6); camera.lookAt(22.6, 6.5, -9.0); }
    else if (camParam === 'hall') { camera.position.set(0, 7.5, 15.5); camera.lookAt(0, 4.2, -6); }
    else if (camParam === 'stage') { camera.position.set(-2, 6.0, 6.0); camera.lookAt(4, 3.4, -12); }
    const airborne = flight && flight.mode !== 'ground';
    if (!airborne && world && world.resolveCollisions) world.resolveCollisions(player.position, 0.62);
    if (!airborne && npcs) {
      for (const key of Object.keys(npcs)) {
        const npc = npcs[key];
        if (!npc || !npc.root) continue;
        const dx = player.position.x - npc.root.position.x;
        const dz = player.position.z - npc.root.position.z;
        const distSq = dx * dx + dz * dz;
        const minDist = 0.92;
        if (distSq > minDist * minDist || distSq < 1e-6) continue;
        const dist = Math.sqrt(distSq);
        const push = (minDist - dist);
        const nx = dx / dist;
        const nz = dz / dist;
        player.position.x += nx * push;
        player.position.z += nz * push;
        const closing = Math.abs(controller.speed);
        if (closing > 1.2 && !npc.bumped) {
          npc.bumped = true;
          npc.bump = 0.45;
          setTimeout(() => { npc.bumped = false; }, 420);
          audio.sfx('thud');
          ui.toast(`${npc.label || 'Someone'} feels your shoulder`, 1200);
          controller.speed *= 0.25;
          const knock = new THREE.Vector3(nx, 0, nz).multiplyScalar(0.9);
          player.position.add(knock);
        }
      }
    }
    if (!airborne && world && world.hall) {
      player.position.x = THREE.MathUtils.clamp(player.position.x, -world.hall.W / 2 + 1.2, world.hall.W / 2 - 1.2);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -world.hall.D / 2 + 1.2, world.hall.D / 2 - 1.2);
    }
    if (activeChapter && activeChapter.id === 'mali-1324') {
      sun.target.position.copy(player.position);
      sun.position.set(player.position.x + 58, 74, player.position.z + 42);
    }
  }
  if (waypoint) {
    waypoint.update(dt, {
      camera, player, world, npcs,
      target: inCine ? null : objectiveTarget(),
      yaw: controller ? controller.yaw : 0
    });
  }
  if (world && world.update) world.update(dt, t);
  if (!activeMount) for (const m of mounts) m.update(dt, t, 0);
  Object.values(npcs).forEach((n) => n.update(dt, t, player ? player.position : null));
  if (quest && player && !inCine) quest.update(dt, input);
  if (ask && player && !ui.busy && !inCine) ask.update(dt, input);
  if (combat && player && !ui.busy) {
    combat.update(dt);
    ui.combatStatus({
      health: combat.health,
      maxHealth: combat.maxHealth,
      weapon: combat.weapon,
      weaponLabel: combat.weapon === 'fist' ? 'Fists' : (combat.weapon === 'kick' ? 'Fists' : (combat.weapon === 'knife' ? 'Knife' : 'Pistol')),
      ammo: combat.ammo.gun,
      kills: combat.kills
    });
  }
  if (world && world.lights && activeChapter && activeChapter.id !== 'mali-1324') {
    // practicals handled inside each scene
  }

  if (post) {
    if (post.bokehPass && player) {
      const focusTarget = quest && quest.step && quest.step.type === 'talk' && npcs[quest.step.who]
        ? npcs[quest.step.who].position
        : player.position;
      post.setFocus(camera.position.distanceTo(focusTarget) + 0.8);
    }
    post.render(dt);
  } else {
    renderer.render(scene, camera);
  }
  input.endFrame();

  frames++;
  fpsTime += dt;
  if (fpsTime >= 1) {
    const fps = Math.round(frames / fpsTime);
    frames = 0; fpsTime = 0;
    const pos = player ? player.position : { x: 0, z: 0 };
    statsEl.textContent = `${fps} FPS · ${tier.toUpperCase()} · ${activeChapter ? activeChapter.title : 'HIS-TREE'} · ${Math.round(pos.x)}, ${Math.round(pos.z)}`;
  }
}

requestPersistentStorage();

boot();
