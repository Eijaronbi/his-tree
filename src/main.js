import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { Input } from './core/Input.js';
import { ThirdPersonController } from './core/ThirdPersonController.js';
import { loadLofi, Flight } from './core/Flight.js';
import { AudioManager } from './core/AudioManager.js';
import { PostFX } from './core/PostFX.js';
import { CameraDirector } from './core/CameraDirector.js';
import { MaliTown } from './world/MaliTown.js';
import { skyDome } from './world/Materials.js';
import { exteriorEnvironment, interiorEnvironment, applyEnvironment } from './world/Environment.js';
import { loadCharacters } from './world/Characters.js';
import { buildHall1865 } from './world/Hall1865.js';
import { buildTrench1917, buildArchive1989 } from './world/OtherEras.js';
import { Quest, loadSave } from './core/Quest.js';
import { Ask } from './core/Ask.js';
import { Combat } from './core/Combat.js';
import { Crowd, maliTownsfolk } from './world/Crowd.js';
import { UI } from './ui/UI.js';
import { CHAPTERS } from './data/story.js';

const canvas = document.getElementById('scene');
const loadingBar = document.getElementById('loading');
const title = document.getElementById('title');
const statsEl = document.getElementById('stats');
const params = new URLSearchParams(location.search);
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
  const saved = localStorage.getItem('his-tree:quality');
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

const tier = detectTier();
renderer.setPixelRatio(flags.px ? 1 : Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
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
const loader = new GLTFLoader();
const director = new CameraDirector(camera);
const ui = new UI();

let post = null;
let controller = null;
let player = null;
let mixer = null;
let world = null;
let npcs = {};
let props = {};
let quest = null;
let cfg = null;
let activeChapter = null;
let sky = null;
let ask = null;
let combat = null;
let streetCrowd = null;
let flight = null;
let lofiRoot = null;
let lofiHolder = null;
let avatarMode = 'default';
let clock = new THREE.Clock();

const baseModels = {};

function loadModel(key, file) {
  return new Promise((resolve) => {
    loader.load(file, (gltf) => { baseModels[key] = gltf.scene; resolve(true); }, undefined, () => resolve(false));
  });
}

async function boot() {
  const jobs = [
    ['player', './assets/models/characters/player_1865.glb'],
    ['villager', './assets/models/character-male-a.glb'],
    ['palm', './assets/models/tree_palm.glb'],
    ['camel', './assets/models/camel-base.glb']
  ];
  let done = 0;
  await Promise.all(jobs.map(async ([k, f]) => {
    await loadModel(k, f);
    done++;
    loadingBar.style.width = `${Math.round((done / jobs.length) * 100)}%`;
  }));
  setTimeout(() => { loadingBar.style.width = '0%'; }, 400);

  if (flags.post) post = new PostFX(renderer, scene, camera, tier, 'mali');

  if (avatarParam === 'lofi') avatarMode = 'lofi';
  const save = loadSave();
  if (autostartParam) startChapter(autostartParam);
  else ui.menu(CHAPTERS.map((c) => ({
    ...c,
    tagline: (save.completed || []).includes(c.id) ? `${c.tagline} · completed` : c.tagline
  })), startChapter, () => {
    localStorage.removeItem('his-tree:save:v1');
    location.reload();
  });

  window.__game = { scene, camera, renderer, get state() { return { world, npcs, props, quest, player, post, chapter: activeChapter }; }, THREE };
  loop();
}

function disposeWorld() {
  if (combat) { combat.disable(); combat = null; }
  if (streetCrowd) { scene.remove(streetCrowd.group); streetCrowd = null; }
  ask = null;
  if (world && world.group) {
    world.group.traverse((o) => {
      if (o.isMesh && o.userData.ownedGeometry) o.geometry.dispose();
    });
    scene.remove(world.group);
  }
  Object.values(npcs).forEach((n) => { scene.remove(n.root); });
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
  for (const child of [...pivot.children]) {
    if (child !== lofiRoot || kind !== 'default') pivot.remove(child);
  }
  avatarMode = kind;
  let model = null;
  let height = 1.8;
  if (kind === 'lofi' && lofiRoot) {
    model = lofiRoot;
    height = 1.72;
    pivot.add(model);
  } else if (baseModels.player) {
    model = buildAvatarModel('default');
    height = model.userData.height || 1.8;
    pivot.add(model);
  }
  mixer = new THREE.AnimationMixer(model || pivot);
  controller.mixer = mixer;
  controller.actions = {};
  controller.walkAction = null;
  controller.runAction = null;
  controller.idleAction = null;
  controller.height = height * 0.84;
  controller.groundY = 0;
  if (flight) {
    flight.model = model;
    flight.enable(kind === 'lofi');
  }
  ui.setPowers(kind === 'lofi'
    ? [{ key: 'F', label: 'Float' }, { key: 'G', label: 'Fly' }, { key: 'V', label: 'Change avatar' }]
    : []);
  ui.toast(kind === 'lofi' ? 'You are Lofi the Yeti' : 'Back to your own body', 1800);
}

function buildAvatarModel(kind) {
  if (kind === 'lofi' && lofiRoot) {
    lofiRoot.updateMatrixWorld(true);
    return lofiRoot;
  }
  const src = baseModels.player;
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

function makePlayer(chapter) {
  const pivot = new THREE.Group();
  let model = null;
  let height = 1.8;
  if (avatarMode === 'lofi' && lofiRoot) {
    model = lofiRoot;
    height = 1.72;
    pivot.add(model);
  } else if (baseModels.player && chapter.playerFile !== null) {
    model = buildAvatarModel('default');
    height = model.userData.height || 1.8;
    pivot.add(model);
  } else {
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 1.0, 6, 12), new THREE.MeshStandardMaterial({ color: 0x8a5a35, roughness: 0.85 }));
    body.position.y = 0.9;
    body.castShadow = true;
    pivot.add(body);
  }
  pivot.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
  scene.add(pivot);
  mixer = new THREE.AnimationMixer(model || pivot);
  const clips = [];
  controller = new ThirdPersonController(camera, pivot, mixer, clips, input, 0);
  controller.height = height * 0.84;
  flight = new Flight({ player: pivot, controller, camera, scene, ui, input });
  flight.enable(avatarMode === 'lofi');
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
    scene.fog = new THREE.FogExp2(0xd8bf94, 0.0055);
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
    scene.fog = new THREE.FogExp2(chapter.palette.haze, chapter.id === 'france-1917' ? 0.022 : 0.012);
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

async function startChapter(id) {
  const chapter = CHAPTERS.find((c) => c.id === id);
  if (!chapter) return;
  ui.removeMenu();
  disposeWorld();
  if (player) { scene.remove(player); player = null; }
  setAtmosphere(chapter);
  activeChapter = chapter;
  overlayObjective(chapter);

  if (chapter.id === 'mali-1324') {
    world = new MaliTown(scene, baseModels, chapter.palette, { palms: true, lights: flags.lights });
    streetCrowd = new Crowd(maliTownsfolk(), { name: 'townsfolk' });
    scene.add(streetCrowd.group);
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
  player = makePlayer(chapter);
  player.position.copy(cfg.spawn);
  player.rotation.y = Math.PI;
  camera.position.set(cfg.spawn.x, 4.2, cfg.spawn.z + 5.4);

  npcs = await loadCharacters(cfg.npcs, scene, cfg.positions);
  quest = new Quest({
    chapter, scene, ui, player, npcs, props, world, save: loadSave(),
    auto: autoParam,
    onEnding: (end) => {
      ui.showEnding(end, () => {
        const save = loadSave();
        ui.menu(CHAPTERS.map((c) => ({
          ...c,
          tagline: (save.completed || []).includes(c.id) ? `${c.tagline} · completed` : c.tagline
        })), startChapter, () => { localStorage.removeItem('his-tree:save:v1'); location.reload(); });
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
      scene, player, camera, ui, input, chapter,
      onEvent: (e) => {
        if (e.type === 'hurt') { ui.flashHurt(); ui.toast('You are hit', 900); }
        else if (e.type === 'kill') ui.toast(`${e.enemy} is down`, 1600);
        else if (e.type === 'pickup') ui.toast(e.kind === 'gun' ? 'You take the pistol' : 'You take the knife', 1400);
        else if (e.type === 'downed') ui.toast('You have fallen — they will carry you out', 2400);
        else if (e.type === 'empty') ui.toast('Empty', 900);
        else if (e.type === 'weapon') ui.toast(e.label, 1000);
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

  if (!input.touch && document.pointerLockElement !== canvas) {
    try { canvas.requestPointerLock(); } catch (e) { /* ignore */ }
  }
  try { audio.start(); } catch (e) { /* needs a gesture on some browsers */ }
  window.addEventListener('pointerdown', () => { try { audio.start(); } catch (e) { /* ignore */ } }, { once: true });
}

window.addEventListener('keydown', (e) => {
  if (!flight || !player) return;
  if (e.code === 'KeyF') { flight.toggleFloat(); e.preventDefault(); }
  if (e.code === 'KeyG') { flight.toggleFly(); e.preventDefault(); }
  if (e.code === 'KeyV') { setAvatar(avatarMode === 'lofi' ? 'default' : 'lofi'); e.preventDefault(); }
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

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  if (post) post.resize();
});

let frames = 0;
let fpsTime = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  if (player && controller) {
    if (flight) flight.update(dt);
    controller.update(dt);
    if (camParam === 'box') { camera.position.set(16.6, 7.9, -2.6); camera.lookAt(22.6, 6.5, -9.0); }
    else if (camParam === 'hall') { camera.position.set(0, 7.5, 15.5); camera.lookAt(0, 4.2, -6); }
    else if (camParam === 'stage') { camera.position.set(-2, 6.0, 6.0); camera.lookAt(4, 3.4, -12); }
    const airborne = flight && flight.mode !== 'ground';
    if (!airborne && world && world.resolveCollisions) world.resolveCollisions(player.position, 0.62);
    if (!airborne && world && world.hall) {
      player.position.x = THREE.MathUtils.clamp(player.position.x, -world.hall.W / 2 + 1.2, world.hall.W / 2 - 1.2);
      player.position.z = THREE.MathUtils.clamp(player.position.z, -world.hall.D / 2 + 1.2, world.hall.D / 2 - 1.2);
    }
    if (activeChapter && activeChapter.id === 'mali-1324') {
      sun.target.position.copy(player.position);
      sun.position.set(player.position.x + 58, 74, player.position.z + 42);
    }
  }
  if (world && world.update) world.update(dt, t);
  if (streetCrowd) streetCrowd.update(dt, t);
  Object.values(npcs).forEach((n) => n.update(dt, t, player ? player.position : null));
  if (quest && player) quest.update(dt, input);
  if (ask && player && !ui.busy) ask.update(dt, input);
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

boot();
