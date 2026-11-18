import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

const SKIN_TONES = [0x8d6a52, 0x7a5942, 0x9a7a5f, 0x6b4d39, 0xa28568];
const COAT_TONES = [0x2a2622, 0x38302a, 0x1f1c19, 0x463a2e, 0x2f3338, 0x4a3a30, 0x554636];
const TROUSER_TONES = [0x272521, 0x322b24, 0x1d1c1a, 0x3b342a];
const HAT_TONES = [0x1b1917, 0x2a2520, 0x4c4438, 0x6b5b45];

function pick(arr, seed) {
  return arr[Math.abs(seed * 1103515245 + 12345) % arr.length];
}

class PartBank {
  constructor() {
    this.parts = new Map();
  }
  add(key, geometry, matrix) {
    if (!this.parts.has(key)) this.parts.set(key, { geometry, matrices: [] });
    this.parts.get(key).matrices.push(matrix.clone());
  }
  build(parent, materials, opts = {}) {
    const out = [];
    for (const [key, entry] of this.parts) {
      const count = entry.matrices.length;
      const mat = materials[key];
      const mesh = new THREE.InstancedMesh(entry.geometry, mat, count);
      mesh.castShadow = opts.castShadow !== false;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      mesh.userData.base = entry.matrices.map((m) => m.clone());
      mesh.userData.key = key;
      for (let i = 0; i < count; i++) mesh.setMatrixAt(i, entry.matrices[i]);
      mesh.instanceMatrix.needsUpdate = true;
      parent.add(mesh);
      out.push(mesh);
    }
    return out;
  }
}

function partMatrix(x, y, z, rx, ry, rz, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz));
  m.compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(sx, sy, sz));
  return m;
}

function localToWorld(m, x, y, z, ry) {
  const v = new THREE.Vector3(x, y, z).applyMatrix4(m);
  return v;
}

/**
 * Period crowd: instanced figures for theatre audiences, actors and street folk.
 * Each figure = coat torso, two arms, two legs, head, optional hat.
 * Everything is merged into a handful of InstancedMeshes (one draw call per material).
 */
export class Crowd {
  constructor(specs = [], opts = {}) {
    this.group = new THREE.Group();
    this.group.name = opts.name || 'crowd';
    this.figures = [];
    this.meshes = [];
    this.time = 0;

    const torsoGeo = new RoundedBoxGeometry(0.44, 0.6, 0.3, 2, 0.08);
    const armGeo = new RoundedBoxGeometry(0.115, 0.56, 0.135, 2, 0.05);
    const legGeo = new RoundedBoxGeometry(0.145, 0.78, 0.16, 2, 0.05);
    const thighGeo = new RoundedBoxGeometry(0.145, 0.34, 0.42, 2, 0.05);
    const headGeo = new THREE.SphereGeometry(0.098, 10, 8);
    const hatGeo = new THREE.CylinderGeometry(0.1, 0.125, 0.14, 10);
    const brimGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.018, 12);

    const bank = new PartBank();
    const materials = {
      coat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.92, metalness: 0 }),
      trouser: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.94, metalness: 0 }),
      skin: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.68, metalness: 0 }),
      hat: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.9, metalness: 0 })
    };
    const coatKeys = new Map();
    const trouserKeys = new Map();
    const skinKeys = new Map();
    const hatKeys = new Map();
    const matFor = (map, color, base) => {
      const key = base + color;
      if (!map.has(key)) {
        map.set(key, new THREE.MeshStandardMaterial({ color, roughness: base === 'skin' ? 0.68 : 0.92, metalness: 0 }));
      }
      return key;
    };

    specs.forEach((spec, idx) => {
      const pose = spec.pose || 'stand';
      const s = spec.scale || (0.94 + ((idx * 37) % 13) / 100);
      const coat = spec.coat !== undefined ? spec.coat : pick(COAT_TONES, idx);
      const trouser = spec.trouser !== undefined ? spec.trouser : pick(TROUSER_TONES, idx + 5);
      const skin = spec.skin !== undefined ? spec.skin : pick(SKIN_TONES, idx + 11);
      const hat = spec.hat || ((idx % 4 === 0) ? 'top' : (idx % 7 === 0 ? 'brim' : 'none'));
      const coatKey = matFor(coatKeys, coat, 'coat');
      const trouserKey = matFor(trouserKeys, trouser, 'trouser');
      const skinKey = matFor(skinKeys, skin, 'skin');
      const hatKey = matFor(hatKeys, spec.hatColor !== undefined ? spec.hatColor : pick(HAT_TONES, idx + 3), 'hat');

      const yaw = spec.rot || 0;
      const base = new THREE.Matrix4().makeRotationY(yaw).setPosition(spec.x, spec.y || 0, spec.z);
      const local = (x, y, z, rx = 0, ry = 0, rz = 0) => {
        const m = partMatrix(x, y, z, rx, ry, rz, s, s, s);
        const out = new THREE.Matrix4().multiplyMatrices(base, m);
        return out;
      };

      if (pose === 'sit') {
        const hipY = 0.74;
        bank.add(coatKey, torsoGeo, local(0, hipY + 0.28, 0.02, -0.1));
        bank.add(coatKey, armGeo, local(-0.26, hipY + 0.16, 0.1, 0.95, 0, 0.12));
        bank.add(coatKey, armGeo, local(0.26, hipY + 0.16, 0.1, 0.95, 0, -0.12));
        bank.add(trouserKey, thighGeo, local(-0.11, hipY - 0.06, 0.24, 1.5));
        bank.add(trouserKey, thighGeo, local(0.11, hipY - 0.06, 0.24, 1.5));
        bank.add(trouserKey, legGeo, local(-0.11, 0.34, 0.44));
        bank.add(trouserKey, legGeo, local(0.11, 0.34, 0.44));
        bank.add(skinKey, headGeo, local(0, hipY + 0.72, 0.04));
      } else {
        bank.add(coatKey, torsoGeo, local(0, 1.16, 0));
        bank.add(coatKey, armGeo, local(-0.27, 1.12, 0.02, 0, 0, 0.08));
        bank.add(coatKey, armGeo, local(0.27, 1.12, 0.02, 0, 0, -0.08));
        bank.add(trouserKey, legGeo, local(-0.11, 0.42, 0));
        bank.add(trouserKey, legGeo, local(0.11, 0.42, 0));
        bank.add(skinKey, headGeo, local(0, 1.6, 0));
      }

      if (hat === 'top') {
        bank.add(hatKey, hatGeo, local(0, pose === 'sit' ? 1.52 : 1.78, 0));
        bank.add(hatKey, brimGeo, local(0, pose === 'sit' ? 1.45 : 1.71, 0));
      } else if (hat === 'brim') {
        bank.add(hatKey, hatGeo, local(0, pose === 'sit' ? 1.5 : 1.76, 0));
        bank.add(hatKey, brimGeo, local(0, pose === 'sit' ? 1.46 : 1.72, 0));
      } else if (hat === 'turban') {
        bank.add(hatKey, hatGeo, local(0, pose === 'sit' ? 1.54 : 1.8, 0, 0, 0, 0, 1.25));
      } else if (hat === 'kepi') {
        bank.add(hatKey, hatGeo, local(0, pose === 'sit' ? 1.53 : 1.79, 0.01, 0, 0, 0, 0.75));
        bank.add(hatKey, brimGeo, local(0, pose === 'sit' ? 1.5 : 1.76, 0.05, 0.16));
      }

      this.figures.push({ phase: (idx * 1.7) % (Math.PI * 2), pose, key: coatKey });
    });

    for (const [key, mat] of coatKeys) materials[key] = mat;
    for (const [key, mat] of trouserKeys) materials[key] = mat;
    for (const [key, mat] of skinKeys) materials[key] = mat;
    for (const [key, mat] of hatKeys) materials[key] = mat;

    this.meshes = bank.build(this.group, materials);
    this.headMeshes = this.meshes.filter((m) => m.userData.key && skinKeys.has(m.userData.key));
  }

  update(dt, t) {
    this.time = t;
    const m = new THREE.Matrix4();
    for (const mesh of this.headMeshes) {
      const bases = mesh.userData.base;
      for (let i = 0; i < bases.length; i++) {
        const fig = this.figures[i];
        if (!fig) continue;
        const sway = Math.sin(t * 0.7 + fig.phase) * 0.055;
        const nod = Math.sin(t * 0.45 + fig.phase * 1.7) * 0.03;
        m.copy(bases[i]);
        const p = new THREE.Vector3();
        const q = new THREE.Quaternion();
        const sc = new THREE.Vector3();
        m.decompose(p, q, sc);
        const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        e.y += sway;
        e.x += nod;
        q.setFromEuler(e);
        m.compose(p, q, sc);
        mesh.setMatrixAt(i, m);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  }
}

/** Theatre audience: fills every seat, leaving the centre aisle clear. */
export function theatreAudienceSeats() {
  const specs = [];
  const COLS = 20, ROWS = 9;
  let idx = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = -12 + c * 1.42;
      if (Math.abs(x) < 1.9) continue;
      idx++;
      const z = -8 + r * 1.5;
      const hat = idx % 5 === 0 ? 'top' : (idx % 8 === 0 ? 'brim' : (idx % 11 === 0 ? 'kepi' : 'none'));
      specs.push({
        x, z: z + 0.02, y: -0.03, rot: Math.PI + (Math.sin(idx * 12.9898) * 0.16),
        pose: 'sit', hat,
        coat: COAT_TONES[idx % COAT_TONES.length],
        trouser: TROUSER_TONES[(idx + 3) % TROUSER_TONES.length],
        skin: SKIN_TONES[(idx + 5) % SKIN_TONES.length]
      });
    }
  }
  return specs;
}

/** Theatre crowd standing at the back of the house and in the aisles. */
export function theatreStandingCrowd(D) {
  const specs = [];
  for (let i = 0; i < 16; i++) {
    const x = -18 + i * 2.4;
    if (Math.abs(x) < 2.2) continue;
    specs.push({ x, z: D / 2 - 2.4, rot: Math.PI, pose: 'stand', hat: i % 3 === 0 ? 'top' : 'none' });
  }
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      specs.push({ x: side * (13.2 + i * 0.5), z: -6 + i * 3.4, rot: side > 0 ? -Math.PI / 2 : Math.PI / 2, pose: 'stand' });
    }
  }
  return specs;
}

/** Actors on the stage: a small ensemble in period dress (stage floor is 1.0 up). */
export function stageActors() {
  const Y = 1.0;
  return [
    { x: -2.6, z: -14.4, y: Y, rot: 0.4, pose: 'stand', coat: 0x1d1b19, trouser: 0x22201d, hat: 'none', skin: 0x9a7a5f },
    { x: 0.4, z: -14.9, y: Y, rot: -0.2, pose: 'stand', coat: 0x3a2f2a, trouser: 0x272521, hat: 'none', skin: 0x8d6a52 },
    { x: 3.1, z: -14.2, y: Y, rot: -0.5, pose: 'stand', coat: 0x554636, trouser: 0x322b24, hat: 'none', skin: 0x7a5942 },
    { x: 5.6, z: -13.6, y: Y, rot: -0.9, pose: 'stand', coat: 0x2f3338, trouser: 0x1d1c1a, hat: 'none', skin: 0xa28568 },
    { x: -4.4, z: -13.2, y: Y, rot: 1.1, pose: 'stand', coat: 0x463a2e, trouser: 0x3b342a, hat: 'none', skin: 0x9a7a5f },
    { x: 2.0, z: -13.4, y: Y, rot: 0.1, pose: 'stand', coat: 0x2a2622, trouser: 0x272521, hat: 'none', skin: 0x8d6a52 }
  ];
}

/** Mali street and desert: scattered townsfolk, guides, porters. */
export function maliTownsfolk() {
  const specs = [];
  const street = [
    [-7.5, 17.2, 1.4], [6.8, 14.6, -1.1], [-11.2, 11.0, 2.2], [9.4, 9.2, -2.0],
    [-4.4, 8.0, 0.6], [3.6, 19.5, 2.8], [-14.5, 18.4, -1.6], [12.6, 17.8, 1.9],
    [-18.0, 8.6, 2.6], [16.5, 6.2, -0.8], [-2.2, 25.0, 3.0], [8.0, 27.5, -2.4]
  ];
  street.forEach(([x, z, rot], i) => {
    specs.push({
      x, z, rot, pose: 'stand',
      coat: [0x8d6a3f, 0x6d5334, 0x9c7b4a, 0x5b4630, 0xa8895a][i % 5],
      trouser: [0x6d5334, 0x5b4630, 0x7a6142][i % 3],
      skin: [0x6b4d39, 0x7a5942, 0x5d422f][i % 3],
      hat: i % 3 === 0 ? 'turban' : 'none'
    });
  });
  const seated = [[-6.2, 21.0, 1.2], [5.4, 22.4, -0.9], [-12.8, 14.4, 2.4], [11.2, 12.6, -2.2]];
  seated.forEach(([x, z, rot], i) => {
    specs.push({
      x, z, rot, pose: 'sit',
      coat: [0x9c7b4a, 0x6d5334][i % 2],
      trouser: 0x5b4630,
      skin: 0x6b4d39,
      hat: i % 2 === 0 ? 'turban' : 'none'
    });
  });
  const desert = [
    [-26, -12, 0.9], [-31, -18, 2.1], [-19, -25, -0.6], [-37, -6, 1.4],
    [22, -14, -1.2], [29, -22, 2.4], [17, -30, 0.2], [35, -9, -1.8]
  ];
  desert.forEach(([x, z, rot], i) => {
    specs.push({
      x, z, rot, pose: 'stand',
      coat: [0xa8895a, 0x8d6a3f, 0xb59a6a][i % 3],
      trouser: 0x6d5334,
      skin: 0x5d422f,
      hat: i % 2 === 0 ? 'turban' : 'none'
    });
  });
  return specs;
}
