import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { poseCharacter } from './CharacterAnim.js';

const loader = new GLTFLoader();

function ringMaterial(color = 0xd9a441) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.55, depthWrite: false });
}

export class Character {
  constructor(root, spec) {
    this.root = root;
    this.spec = spec;
    this.label = spec.label;
    this.phase = Math.random() * Math.PI * 2;
    this.bones = {};
    root.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
        const mats = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of mats) {
          if (!m) continue;
          m.envMapIntensity = spec.envIntensity ?? 1.0;
          if (m.name && m.name.startsWith('skin')) {
            m.roughness = 0.62;
            m.metalness = 0;
          }
        }
      }
      if (o.isBone) this.bones[o.name] = o;
    });
    this.height = new THREE.Box3().setFromObject(root).max.y;
    this.pose = root.userData.noPose ? null : poseCharacter(root, { armDown: 'auto', legAmp: 0.4 });
    if (this.pose) this.pose.setIdle();

    const ring = new THREE.Mesh(new THREE.RingGeometry(0.52, 0.62, 40), ringMaterial());
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.02;
    ring.visible = false;
    root.add(ring);
    this.ring = ring;

    if (this.bones.head) this.baseHead = this.bones.head.quaternion.clone();
    if (this.bones.spine03) this.baseSpine = this.bones.spine03.quaternion.clone();
  }

  get position() { return this.root.position; }

  highlight(on) { this.ring.visible = !!on; }

  faceTo(point, dt) {
    const dx = point.x - this.root.position.x;
    const dz = point.z - this.root.position.z;
    const want = Math.atan2(dx, dz);
    let cur = this.root.rotation.y;
    let diff = ((want - cur + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
    this.root.rotation.y = cur + diff * Math.min(1, dt * 3.2);
  }

  update(dt, t, focus) {
    const breathe = Math.sin(t * 1.15 + this.phase) * 0.012;
    if (this.bones.spine03) {
      this.bones.spine03.rotation.x = breathe;
      this.bones.spine03.rotation.z = Math.sin(t * 0.7 + this.phase) * 0.01;
    }
    if (this.bones.head) {
      this.bones.head.rotation.z = Math.sin(t * 0.53 + this.phase) * 0.02;
      this.bones.head.rotation.x = -breathe * 0.5;
    }
    if (focus && this.root.position.distanceTo(focus) < 8) this.faceTo(focus, dt);
  }
}

function mount(spec, gltf, parent, positions, out, resolve) {
  const root = gltf.scene;
  const p = positions[spec.id] || spec.position || { x: 0, z: 0 };
  if (p.rotation || spec.rotation) root.rotation.y = p.rotation ?? spec.rotation;
  root.scale.setScalar(spec.scale || 1);
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const c = new THREE.Vector3();
  box.getCenter(c);
  root.position.set((p.x || 0) - c.x, (p.y || 0) - box.min.y, (p.z || 0) - c.z);
  parent.add(root);
  out[spec.id] = new Character(root, spec);
  resolve();
}

export async function loadCharacters(specs, parent, positions = {}) {
  const out = {};
  await Promise.all(specs.map((spec) => new Promise((resolve) => {
    loader.load(spec.file, (gltf) => mount(spec, gltf, parent, positions, out, resolve), undefined, () => {
      if (spec.fallback && spec.fallback !== spec.file) {
        loader.load(spec.fallback, (gltf) => mount(spec, gltf, parent, positions, out, resolve), undefined, () => capsule(spec, parent, positions, out, resolve));
        return;
      }
      capsule(spec, parent, positions, out, resolve);
    });
  })));
  return out;
}

function capsule(spec, parent, positions, out, resolve) {
      const g = new THREE.Group();
      const body = new THREE.Mesh(
        new THREE.CapsuleGeometry(0.32, 1.0, 6, 12),
        new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 0.8 })
      );
      body.position.y = 0.9;
      body.castShadow = true;
      g.add(body);
      const p = positions[spec.id] || spec.position || { x: 0, z: 0 };
      g.position.set(p.x || 0, 0, p.z || 0);
      parent.add(g);
      out[spec.id] = new Character(g, spec);
      resolve();
}
