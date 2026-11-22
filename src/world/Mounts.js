import * as THREE from 'three';
import { makeGltfLoader } from '../core/GLTF.js';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';

const loader = makeGltfLoader();

const SEATS = {
  horse: { x: 0, y: 1.52, z: 0.05, eye: 1.85 },
  donkey: { x: 0, y: 1.16, z: 0.04, eye: 1.48 },
  camel: { x: 0, y: 1.72, z: 0.12, eye: 2.05 }
};

const SPEEDS = {
  horse: { walk: 2.5, run: 5.4 },
  donkey: { walk: 1.9, run: 3.7 },
  camel: { walk: 2.0, run: 4.0 }
};

function pickClip(clips, names) {
  for (const n of names) {
    const found = clips.find((c) => c.name.toLowerCase() === n);
    if (found) return found;
  }
  for (const n of names) {
    const found = clips.find((c) => c.name.toLowerCase().startsWith(n));
    if (found) return found;
  }
  return null;
}

/**
 * A rideable animal: rigged model, walk/idle/run clips, seat transform and
 * collision footprint. The player is parented to the seat while mounted.
 */
export class Mount {
  constructor(root, gltf, kind, spec = {}) {
    this.kind = kind;
    this.spec = spec;
    this.root = root;
    this.seat = SEATS[kind] || SEATS.horse;
    this.speeds = SPEEDS[kind] || SPEEDS.horse;
    this.mixer = new THREE.AnimationMixer(root);
    this.actions = {};
    const clips = gltf.animations || [];
    const pairs = [
      ['idle', pickClip(clips, ['idle', 'stand', 'idle_loop'])],
      ['walk', pickClip(clips, ['walk', 'walk_fwd', 'walking'])],
      ['run', pickClip(clips, ['run', 'trot', 'canter', 'gallop'])]
    ];
    for (const [key, clip] of pairs) {
      if (!clip) continue;
      const action = this.mixer.clipAction(clip);
      action.enabled = true;
      action.setEffectiveWeight(key === 'idle' ? 1 : 0);
      action.play();
      this.actions[key] = action;
    }
    this.current = 'idle';
    this.phase = Math.random() * Math.PI * 2;
    this.rider = null;
    this._seatObj = new THREE.Object3D();
    this._seatObj.position.set(this.seat.x, this.seat.y, this.seat.z);
    root.add(this._seatObj);
  }

  play(name) {
    if (this.current === name) return;
    this.current = name;
    for (const key of Object.keys(this.actions)) {
      const action = this.actions[key];
      if (key === name) {
        action.setEffectiveWeight(1);
        action.fadeIn(0.22);
      } else {
        action.fadeOut(0.22);
        action.setEffectiveWeight(0);
      }
    }
  }

  seatPosition(target = new THREE.Vector3()) {
    this._seatObj.getWorldPosition(target);
    return target;
  }

  get occupied() {
    return !!this.rider;
  }

  attach(rider) {
    this.rider = rider;
    this.play('idle');
  }

  detach() {
    if (!this.rider) return null;
    const rider = this.rider;
    this.rider = null;
    return rider;
  }

  update(dt, t, speedRatio) {
    this.mixer.update(dt);
    const ratio = Math.max(0, Math.min(1, speedRatio || 0));
    if (ratio > 0.72) this.play('run');
    else if (ratio > 0.08) this.play('walk');
    else this.play('idle');
    const head = this.root.getObjectByName('Head');
    if (head) {
      const base = head.userData.baseQuat || null;
      if (!base) {
        head.userData.baseQuat = head.quaternion.clone();
      }
      const q = head.userData.baseQuat;
      const nod = Math.sin(t * 1.1 + this.phase) * 0.05 * (1 - ratio);
      head.quaternion.copy(q);
      head.rotateX(nod);
    }
  }
}

/**
 * Loads a rideable animal by kind. `file` must point at a rigged GLB with
 * Walk/Idle/Run clips (Polyfork base assets).
 */
export function loadMount(kind, file, scene, spec = {}, preloaded = null) {
  return new Promise((resolve) => {
    const start = (gltf) => {
      const root = cloneSkinned(gltf.scene);
      root.position.set(spec.x || 0, spec.y || 0, spec.z || 0);
      root.rotation.y = spec.rot || 0;
      if (spec.scale) root.scale.setScalar(spec.scale);
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.frustumCulled = false;
        }
      });
      scene.add(root);
      resolve(new Mount(root, gltf, kind, spec));
    };
    if (preloaded) {
      start({ scene: preloaded.scene, animations: preloaded.clips || [] });
      return;
    }
    loader.load(file, start, undefined, () => resolve(null));
  });
}
