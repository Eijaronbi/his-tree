import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

/**
 * Lofi the Yeti: the time-traveller avatar. Loaded as a game-ready model with
 * the jacket, the fur suit and the LOFI lettering on the back of the jacket.
 */
export async function loadLofi(parent, file = './assets/models/characters/lofi.glb') {
  return new Promise((resolve) => {
    loader.load(file, (gltf) => {
      const root = gltf.scene;
      root.updateMatrixWorld(true);
      const box = new THREE.Box3().setFromObject(root);
      const scale = 1.72 / Math.max(0.2, box.max.y - box.min.y);
      root.scale.setScalar(scale);
      root.updateMatrixWorld(true);
      const box2 = new THREE.Box3().setFromObject(root);
      const c = new THREE.Vector3();
      box2.getCenter(c);
      root.position.set(-c.x, -box2.min.y, -c.z);
      root.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
          o.frustumCulled = false;
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) {
            if (!m) continue;
            m.envMapIntensity = 0.9;
            m.roughness = Math.min(1, (m.roughness ?? 0.8) + 0.05);
          }
        }
      });
      parent.add(root);
      resolve(root);
    }, undefined, () => resolve(null));
  });
}

/**
 * Lofi's powers: float (hover) and fly (superman pose with airplane banking).
 * No jetpack: the lift is part of the character.
 */
export class Flight {
  constructor({ player, controller, camera, scene, ui, input, rig }) {
    this.player = player;
    this.controller = controller;
    this.camera = camera;
    this.scene = scene;
    this.ui = ui;
    this.input = input;
    this.active = false;
    this.mode = 'ground';
    this.floatY = 0;
    this.floatTarget = 0;
    this.vy = 0;
    this.bank = 0;
    this.pitch = 0;
    this.speed = 0;
    this.baseFog = scene && scene.fog ? scene.fog.density : 0.012;
    this.rig = rig || (player && player.children.length ? player.children[0] : player);
  }

  enable(on) {
    this.active = on;
    if (!on) {
      this.mode = 'ground';
      this.vy = 0;
      this.floatY = 0;
      this.bank = 0;
      this.pitch = 0;
      this.speed = 0;
      if (this.rig) { this.rig.rotation.set(0, 0, 0); this.rig.position.y = 0; }
      if (this.ui) this.ui.setPowers([]);
    }
  }

  toggleFloat() {
    if (!this.active) return;
    this.controller.frozen = this.mode !== 'ground';
    if (this.mode === 'float') {
      this.mode = 'ground';
      this.ui.toast('Lofi settles back down', 1400);
    } else {
      this.mode = 'float';
      this.floatY = this.player.position.y;
      this.floatTarget = Math.max(this.floatY, 1.6);
      this.ui.toast('Lofi lifts off — he floats', 1600);
    }
    this.ui.setPowers(this.mode === 'ground'
      ? [{ key: 'F', label: 'Float' }, { key: 'G', label: 'Fly' }]
      : (this.mode === 'float'
        ? [{ key: 'G', label: 'Fly' }, { key: 'S', label: 'Descend' }]
        : [{ key: 'G', label: 'Stop flying' }, { key: 'A/D', label: 'Bank' }, { key: 'W/S', label: 'Up/Down' }]));
  }

  toggleFly() {
    if (!this.active) return;
    if (this.mode === 'fly') {
      this.mode = 'ground';
      this.pitch = 0;
      this.bank = 0;
      this.speed = 0;
      this.ui.toast('Lofi lands', 1400);
    } else {
      this.mode = 'fly';
      this.vy = 0;
      this.ui.toast('Lofi flies — bank with A / D', 1800);
    }
    this.ui.setPowers(this.mode === 'ground'
      ? [{ key: 'F', label: 'Float' }, { key: 'G', label: 'Fly' }]
      : (this.mode === 'float'
        ? [{ key: 'G', label: 'Fly' }, { key: 'S', label: 'Descend' }]
        : [{ key: 'G', label: 'Stop flying' }, { key: 'A/D', label: 'Bank' }, { key: 'W/S', label: 'Up/Down' }]));
  }

  update(dt) {
    if (!this.active) return;
    const input = this.input;
    const axis = input.axis();
    const p = this.player.position;

    this.controller.frozen = this.mode !== 'ground';
    if (this.mode === 'float') {
      const climb = axis.y;
      if (climb !== 0) this.floatTarget = Math.max(0.5, this.floatTarget + climb * 3.4 * dt);
      this.floatY += (this.floatTarget - this.floatY) * Math.min(1, dt * 2.2);
      this.vy = (this.floatY - (this.floatY - this.vy * dt));
      p.y = this.floatY;
      this.controller.groundY = this.floatY;
      this._poseFloat(dt);
    } else if (this.mode === 'fly') {
      const yaw = this.controller.yaw;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new THREE.Vector3(-forward.z, 0, forward.x);
      const climb = axis.y;
      const targetSpeed = 14 + (input.run ? 12 : 0);
      this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 1.6);
      p.addScaledVector(forward, this.speed * dt);
      p.y += climb * 9 * dt;
      if (p.y < 0.5) p.y = 0.5;
      // airplane banking: roll into the turn
      const wantBank = -axis.x * 0.85;
      this.bank += (wantBank - this.bank) * Math.min(1, dt * 3.0);
      this.pitch += (0.32 + climb * 0.25 - this.pitch) * Math.min(1, dt * 2.4);
      this.controller.groundY = p.y;
      this._poseFly(dt, yaw);
    } else {
      this.controller.groundY = 0;
      p.y = 0;
    }

    // sky camera: pull back and open up when high
    const alt = Math.max(0, p.y);
    if (this.mode !== 'ground') {
      const targetDist = this.mode === 'fly' ? 9.5 + alt * 0.05 : 6.2;
      this.controller.distance += (targetDist - this.controller.distance) * Math.min(1, dt * 2.0);
      const targetPitch = this.mode === 'fly' ? Math.max(this.controller.pitch, 0.05) : this.controller.pitch;
      this.controller.pitch += (targetPitch - this.controller.pitch) * Math.min(1, dt * 2.0);
    }
    if (this.scene && this.scene.fog) {
      const wanted = Math.max(this.baseFog * 0.35, this.baseFog - alt * 0.0006);
      this.scene.fog.density += (wanted - this.scene.fog.density) * Math.min(1, dt * 1.5);
    }
  }

  _poseFloat(dt) {
    if (!this.rig) return;
    this.rig.position.y += (0 - this.rig.position.y) * Math.min(1, dt * 4);
    const t = performance.now() * 0.001;
    this.rig.rotation.x += (-0.12 - this.rig.rotation.x) * Math.min(1, dt * 4);
    this.rig.rotation.z += (Math.sin(t * 0.7) * 0.08 - this.rig.rotation.z) * Math.min(1, dt * 4);
    this.rig.rotation.y += (Math.sin(t * 0.45) * 0.12 - this.rig.rotation.y) * Math.min(1, dt * 4);
  }

  _poseFly(dt, yaw) {
    if (!this.rig) return;
    this.player.rotation.y = yaw;
    this.rig.rotation.x += (-Math.PI / 2 + this.pitch - this.rig.rotation.x) * Math.min(1, dt * 4.5);
    this.rig.rotation.z += (this.bank - this.rig.rotation.z) * Math.min(1, dt * 4.5);
    this.rig.rotation.y += (0 - this.rig.rotation.y) * Math.min(1, dt * 4.5);
    // lift the rig as the body tips over, so Lofi flies level with the camera
    const tip = Math.min(1, Math.abs(this.rig.rotation.x) / (Math.PI / 2));
    this.rig.position.y += (0.82 * tip - this.rig.position.y) * Math.min(1, dt * 4);
  }
}
