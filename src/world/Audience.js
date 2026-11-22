import * as THREE from 'three';
import { makeGltfLoader } from '../core/GLTF.js';
import { poseCharacter } from './CharacterAnim.js';
import { robustBox } from './frame.js';

const NEAR = './assets/models/characters/audience_lod/';
const FAR = './assets/models/characters/audience_far/';

const TYPES = [
  { file: 'char_adult_m_frock', tier: 'near' },
  { file: 'char_adult_m_officer', tier: 'near' },
  { file: 'char_adult_f_elegant', tier: 'near' },
  { file: 'char_adult_f_simple', tier: 'near' },
  { file: 'char_old_m_top', tier: 'near' },
  { file: 'char_old_f_bonnet', tier: 'near' },
  { file: 'char_worker', tier: 'far' },
  { file: 'char_soldier_blue', tier: 'far' },
  { file: 'char_child_m', tier: 'far' },
  { file: 'char_actor_m', tier: 'far' }
];

const SEAT_ROWS = 9;
const SEAT_COLS = 20;
const SEAT_X0 = -12;
const SEAT_DX = 1.42;
const SEAT_Z0 = -8;
const SEAT_DZ = 1.5;
const AISLE = 1.95;
const HIP_HEIGHT = 0.9;

/**
 * Theatre audience made from real character models, drawn as instanced meshes.
 * Near rows use the light-detail LOD set, the back rows the heavy-detail set.
 * Every figure sits, breathes, turns toward the stage and applauds on cue.
 */
export class Audience {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.name = 'audience';
    parent.add(this.group);
    this.models = [];
    this.instances = [];
    this.acc = 0;
    this.clapLevel = 0;
    this.seats = [];
  }

  seatPositions() {
    if (this.seats.length) return this.seats;
    for (let r = 0; r < SEAT_ROWS; r += 1) {
      for (let c = 0; c < SEAT_COLS; c += 1) {
        const x = SEAT_X0 + c * SEAT_DX;
        if (Math.abs(x) < AISLE) continue;
        this.seats.push({ x, z: SEAT_Z0 + r * SEAT_DZ, row: r });
      }
    }
    return this.seats;
  }

  async load() {
    const loader = makeGltfLoader();
    const seats = this.seatPositions();
    const buckets = new Map();

    for (const spec of TYPES) {
      const dir = spec.tier === 'near' ? NEAR : FAR;
      let gltf = null;
      try {
        gltf = await loader.loadAsync(dir + spec.file + '.glb');
      } catch (e) {
        continue;
      }
      if (!gltf) continue;
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      const box = robustBox(root);
      const height = Math.max(0.2, box.max.y - box.min.y);
      const holder = new THREE.Group();
      holder.add(root);
      holder.scale.setScalar(1.72 / height);
      root.updateMatrixWorld(true);
      const b2 = robustBox(holder);
      const cx = (b2.min.x + b2.max.x) / 2;
      const cz = (b2.min.z + b2.max.z) / 2;
      root.position.set(-cx, -b2.min.y, -cz);
      const pose = poseCharacter(holder, { armDown: 'auto', legAmp: 0.3, armAmp: 0.3 });
      if (pose) pose.setIdle();
      holder.traverse((o) => {
        if (!o.isMesh) return;
        o.castShadow = true;
        o.receiveShadow = false;
        o.frustumCulled = false;
      });
      const meshes = [];
      holder.updateMatrixWorld(true);
      holder.traverse((o) => {
        if (o.isMesh) meshes.push(o);
      });
      this.models.push({ spec, holder, meshes, pose });
      const row = spec.tier === 'near' ? 3 : 6;
      buckets.set(spec.file, { spec, meshes, seats: seats.filter((s) => s.row <= row), pose });
    }

    // assign seats: near tiers fill the front, far tiers fill the back
    const used = new Set();
    let cursor = 0;
    for (const [, bucket] of buckets) {
      for (const seat of bucket.seats) {
        if (used.has(seat)) continue;
        used.add(seat);
        bucket.used = bucket.used || [];
        bucket.used.push(seat);
      }
    }
    for (const [, bucket] of buckets) {
      if (!bucket.used || !bucket.used.length) continue;
      const holder = this.models.find((m) => m.spec.file === bucket.spec.file).holder;
      const matrices = bucket.used.map((seat) => {
        const m = new THREE.Matrix4();
        const facing = Math.PI + (Math.sin((seat.x + seat.z) * 12.9898) * 0.22);
        m.makeRotationY(facing);
        m.setPosition(seat.x, -0.04, seat.z + 0.02);
        return m;
      });
      bucket.matrices = matrices;
      holder.updateMatrixWorld(true);
      const holderInv = new THREE.Matrix4().copy(holder.matrixWorld).invert();
      for (const mesh of bucket.meshes) {
        const local = new THREE.Matrix4().multiplyMatrices(holderInv, mesh.matrixWorld);
        const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, matrices.length);
        inst.castShadow = true;
        inst.receiveShadow = false;
        inst.frustumCulled = false;
        const tmp = new THREE.Matrix4();
        for (let i = 0; i < matrices.length; i += 1) {
          tmp.multiplyMatrices(matrices[i], local);
          inst.setMatrixAt(i, tmp);
        }
        inst.instanceMatrix.needsUpdate = true;
        this.group.add(inst);
        this.instances.push({ inst, bucket, phase: 0 });
      }
      if (bucket.pose) { bucket.pose.setIdle(); bucket.pose.setPose('sit'); }
    }
    return this;
  }

  setClapLevel(level) {
    this.clapLevel = level;
  }

  update(dt, t) {
    this.acc += dt;
    if (this.acc < 0.05) return;
    const step = this.acc;
    this.acc = 0;
    const m = new THREE.Matrix4();
    const p = new THREE.Vector3();
    const q = new THREE.Quaternion();
    const sc = new THREE.Vector3();
    for (const entry of this.instances) {
      const bases = entry.bucket.matrices;
      const phase = entry.bucket.used.map((seat, i) => (seat.x * 3.1 + seat.z * 1.7 + i * 0.37) % 6.283);
      for (let i = 0; i < bases.length; i += 1) {
        const ph = phase[i];
        const breathe = Math.sin(t * 1.1 + ph) * 0.012;
        const sway = Math.sin(t * 0.5 + ph * 1.7) * 0.035;
        const clap = this.clapLevel > 0.01 ? Math.max(0, Math.sin(t * 3.6 + ph)) ** 2 * this.clapLevel : 0;
        m.copy(bases[i]);
        m.decompose(p, q, sc);
        const e = new THREE.Euler().setFromQuaternion(q, 'YXZ');
        e.y += sway;
        e.x += breathe * 0.6 - clap * 0.06;
        e.z += breathe * 0.5;
        q.setFromEuler(e);
        m.compose(p, q, sc);
        entry.inst.setMatrixAt(i, m);
      }
      entry.inst.instanceMatrix.needsUpdate = true;
    }
    for (const model of this.models) {
      if (!model.pose) continue;
      const clap = this.clapLevel > 0.01 ? Math.max(0, Math.sin(t * 3.6)) ** 2 * this.clapLevel : 0;
      model.pose.uniforms.uArmAmp.value = 0.3 + clap * 1.35;
    }
    void step;
  }
}
