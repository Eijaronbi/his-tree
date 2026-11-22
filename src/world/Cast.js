import * as THREE from 'three';
import { makeGltfLoader } from '../core/GLTF.js';
import { poseCharacter } from './CharacterAnim.js';
import { robustBox } from './frame.js';

const loader = makeGltfLoader();

/**
 * Realistic cast members generated with Lux3D. Each entry is normalised to a
 * human height with the feet on the floor, then posed by placement alone.
 */
export class Cast {
  constructor(parent) {
    this.group = new THREE.Group();
    this.group.name = 'cast';
    parent.add(this.group);
    this.actors = [];
  }

  async add(spec) {
    const root = await new Promise((resolve) => {
      loader.load(spec.file, (gltf) => resolve(gltf.scene), undefined, () => resolve(null));
    });
    if (!root) return null;
    root.traverse((o) => {
      if (o.isMesh) {
        if (o.name === 'Cube' || o.name === 'Cube.001') { o.visible = false; return; }
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
    root.updateMatrixWorld(true);
    const box = robustBox(root);
    const height = box.max.y - box.min.y;
    const target = spec.height || 1.72;
    const k = height > 0.01 ? target / height : 1;
    const holder = new THREE.Group();
    holder.add(root);
    holder.scale.setScalar(k);
    root.updateMatrixWorld(true);
    const box2 = robustBox(holder);
    const cx = (box2.min.x + box2.max.x) / 2;
    const cz = (box2.min.z + box2.max.z) / 2;
    root.position.set(-cx, -box2.min.y, -cz);
    holder.position.set(spec.x || 0, spec.y || 0, spec.z || 0);
    if (spec.rot) holder.rotation.y = spec.rot;
    this.group.add(holder);

    let pose = null;
    if (!spec.noPose) {
      pose = poseCharacter(holder, { armDown: 'auto', legAmp: 0.42, armAmp: 0.34, collarGuard: spec.collarGuard === true });
      if (pose) pose.setIdle();
    }
    const actor = {
      root: holder,
      inner: root,
      spec,
      pose,
      phase: Math.random() * Math.PI * 2,
      home: new THREE.Vector3(spec.x || 0, spec.y || 0, spec.z || 0),
      clap: !!spec.clap
    };
    this.actors.push(actor);
    return actor;
  }

  async loadAll(specs) {
    await Promise.all(specs.map((s) => this.add(s)));
    return this.actors;
  }

  update(dt, t, focus) {
    const clapLevel = this.clapLevel !== undefined ? this.clapLevel : 0;
    for (const a of this.actors) {
      const s = Math.sin(t * 0.6 + a.phase) * 0.012 * (a.spec.sway || 0);
      a.root.rotation.z += (s - a.root.rotation.z) * Math.min(1, dt * 2);
      if (a.spec.stage) {
        const pace = Math.sin(t * 0.42 + a.phase);
        a.root.position.x = a.home.x + pace * 1.15;
        a.root.position.z = a.home.z + Math.cos(t * 0.33 + a.phase) * 0.4;
        const face = pace > 0 ? 0.4 : -1.9;
        a.root.rotation.y += (face - a.root.rotation.y) * Math.min(1, dt * 1.6);
      }
      if (a.pose) {
        if (a.clap && clapLevel > 0.01) {
          const beat = Math.max(0, Math.sin(t * 3.3 + a.phase));
          a.pose.uniforms.uArmAmp.value = 0.34 + beat * beat * clapLevel * 1.5;
        } else if (a.pose) {
          a.pose.uniforms.uArmAmp.value = 0.34;
        }
      }
    }
  }
}

/** Theatre cast: three actors on the stage, the house standing about the aisles. */
export function theatreCast() {
  const L = './assets/models/characters/audience_lod/';
  const stageY = 1.0;
  return [
    { file: L + 'char_actor_m.glb', x: -1.8, y: stageY, z: -14.3, rot: 0.35, height: 1.78, sway: 1, stage: true },
    { file: L + 'char_actor_m2.glb', x: 2.4, y: stageY, z: -14.6, rot: -0.45, height: 1.74, sway: 1, stage: true },
    { file: L + 'char_actor_f.glb', x: 0.5, y: stageY, z: -13.6, rot: -0.1, height: 1.68, sway: 1, stage: true },
    { file: L + 'char_adult_m_officer.glb', x: 5.4, y: stageY, z: -13.4, rot: -1.0, height: 1.76 },
    { file: L + 'char_adult_m_frock.glb', x: -5.0, y: stageY, z: -13.2, rot: 1.1, height: 1.74 },
  ];
}
