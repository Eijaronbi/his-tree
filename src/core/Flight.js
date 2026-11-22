import * as THREE from 'three';
import { makeGltfLoader } from './GLTF.js';

const loader = makeGltfLoader();

const FLY_CRUISE_ALTITUDE = 8.0;
const FLY_MIN_ALTITUDE = 3.2;
const FLY_MAX_ALTITUDE = 120;
const FLY_TURN_RATE = 1.05;
const FLY_BANK_ANGLE = 0.55;
const FLY_BANK_RATE = 1.6;
const FLY_NOSE_UP = 0.06;
const FLOAT_ALTITUDE = 2.2;

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
 * Lofi's powers: float (hover) and fly.
 *
 * The flight follows the classic Superman look: a streamlined horizontal body,
 * arms stretched forward, legs together, and a steady banking roll into turns
 * the way Christopher Reeve flew it as a glider pilot. The flight path never
 * yaws on its own, so the character holds a clean line instead of weaving.
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
    this.altitude = 0;
    this.altitudeTarget = FLY_CRUISE_ALTITUDE;
    this.turn = 0;
    this.vy = 0;
    this.bank = 0;
    this.pitch = 0;
    this.speed = 0;
    this.baseFog = scene && scene.fog ? scene.fog.density : 0.012;
    this.baseEye = controller && controller.eyeHeight ? controller.eyeHeight : 1.62;
    this.rig = rig || (player && player.children.length ? player.children[0] : player);
  }

  enable(on) {
    this.active = on;
    if (!on) {
      this.mode = 'ground';
      this.vy = 0;
      this.floatY = 0;
      this.altitude = 0;
      this.altitudeTarget = FLY_CRUISE_ALTITUDE;
      this.turn = 0;
      this.bank = 0;
      this.pitch = 0;
      this.speed = 0;
      if (this.rig) { this.rig.rotation.set(0, 0, 0); this.rig.position.y = 0; }
      if (this.ui) this.ui.setPowers([]);
    }
  }

  _groundAt(x, z) {
    const fn = this.controller && this.controller.groundHeightFn;
    if (!fn) return 0;
    const y = fn(x, z);
    return Number.isFinite(y) ? y : 0;
  }

  _powers() {
    this.ui.setPowers(this.mode === 'ground'
      ? [{ key: 'F', label: 'Float' }, { key: 'G', label: 'Fly' }]
      : (this.mode === 'float'
        ? [{ key: 'F', label: 'Land' }, { key: 'G', label: 'Fly' }]
        : [{ key: 'G', label: 'Land' }, { key: 'A/D', label: 'Turn' }, { key: 'W/S', label: 'Up/Down' }]));
  }

  toggleFloat() {
    if (!this.active) return;
    this.controller.frozen = this.mode === 'fly';
    this.controller.airborne = this.mode !== 'ground';
    if (this.mode === 'float') {
      this.mode = 'ground';
      this.floatY = 0;
      this.ui.toast('Lofi settles back down', 1400);
    } else {
      this.mode = 'float';
      const ground = this._groundAt(this.player.position.x, this.player.position.z);
      this.floatY = Math.max(this.player.position.y, ground + FLOAT_ALTITUDE);
      this.floatTarget = this.floatY;
      this.ui.toast('Lofi lifts off — he floats', 1600);
    }
    this._powers();
  }

  toggleFly() {
    if (!this.active) return;
    if (this.mode === 'fly') {
      this.mode = 'ground';
      this.pitch = 0;
      this.bank = 0;
      this.speed = 0;
      this.turn = 0;
      this.altitude = 0;
      this.ui.toast('Lofi lands', 1400);
    } else {
      this.mode = 'fly';
      this.vy = 0;
      const ground = this._groundAt(this.player.position.x, this.player.position.z);
      this.altitude = Math.max(0.6, this.player.position.y - ground);
      this.altitudeTarget = FLY_CRUISE_ALTITUDE;
      this.ui.toast('Lofi flies — A / D turn, W / S climb', 1800);
    }
    this._powers();
  }

  update(dt) {
    if (!this.active) return;
    const input = this.input;
    const axis = input.axis();
    const p = this.player.position;

    this.controller.frozen = this.mode === 'fly';
    this.controller.airborne = this.mode !== 'ground';

    if (this.mode === 'float') {
      const ground = this._groundAt(p.x, p.z);
      this.floatTarget = ground + FLOAT_ALTITUDE;
      this.floatY += (this.floatTarget - this.floatY) * Math.min(1, dt * 2.2);
      this.vy = 0;
      this.controller.groundY = this.floatY;
      this._poseFloat(dt);
    } else if (this.mode === 'fly') {
      // Steering: A/D roll into a steady turn, the mouse look turns the same way.
      const wantTurn = axis.x;
      this.turn += (wantTurn - this.turn) * Math.min(1, dt * 5);
      this.controller.yaw -= this.turn * FLY_TURN_RATE * dt;

      const yaw = this.controller.yaw;
      const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));

      const climb = axis.y;
      this.altitudeTarget += climb * 5 * dt;
      this.altitudeTarget = Math.max(FLY_MIN_ALTITUDE, Math.min(FLY_MAX_ALTITUDE, this.altitudeTarget));
      this.altitude += (this.altitudeTarget - this.altitude) * Math.min(1, dt * 0.8);
      this.altitude = Math.max(0.4, this.altitude);

      const targetSpeed = 14 + (input.run ? 12 : 0);
      this.speed += (targetSpeed - this.speed) * Math.min(1, dt * 2.2);
      p.addScaledVector(forward, this.speed * dt);
      const ground = this._groundAt(p.x, p.z);
      p.y = ground + this.altitude;

      // Airplane banking: roll into the turn and hold it steady.
      const wantBank = -this.turn * FLY_BANK_ANGLE;
      const step = FLY_BANK_RATE * dt;
      this.bank += Math.max(-step, Math.min(step, wantBank - this.bank));
      this.pitch = FLY_NOSE_UP;

      this.controller.velocity.set(0, 0, 0);
      this.controller.groundY = p.y;
      this._poseFly(dt, yaw);
    } else {
      this.controller.groundY = 0;
    }

    // sky camera: pull back and open up when high
    const alt = Math.max(0, p.y);
    if (this.controller) {
      // in POV the camera sits at the head of the flying body
      const flying = this.mode === 'fly';
      this.controller.eyeHeight = flying ? 0.5 : this.baseEye;
      this.controller.povForward = flying ? 0.85 : 0.22;
      // keep Lofi framed while he is moving fast
      this.controller.cameraFollow = flying ? 16 : 9;
      // the flying body lies flat at the pivot height, so the camera must not
      // aim a full standing height above it or the horizon leaves the frame
      this.controller.targetHeight = flying ? 0.2 : null;
    }
    if (this.mode !== 'ground') {
      const targetDist = this.mode === 'fly' ? 5.4 + alt * 0.02 : 6.2;
      this.controller.distance += (targetDist - this.controller.distance) * Math.min(1, dt * 2.0);
      const targetPitch = this.mode === 'fly' ? Math.max(this.controller.pitch, 0.1) : this.controller.pitch;
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
    this.rig.rotation.x += (-0.12 - this.rig.rotation.x) * Math.min(1, dt * 4);
    this.rig.rotation.z += (0 - this.rig.rotation.z) * Math.min(1, dt * 4);
    this.rig.rotation.y += (0 - this.rig.rotation.y) * Math.min(1, dt * 4);
  }

  _poseFly(dt, yaw) {
    if (!this.rig) return;
    this.player.rotation.y = yaw;
    this.rig.rotation.x += (Math.PI / 2 + this.pitch - this.rig.rotation.x) * Math.min(1, dt * 4.5);
    this.rig.rotation.z += (this.bank - this.rig.rotation.z) * Math.min(1, dt * 6);
    this.rig.rotation.y += (0 - this.rig.rotation.y) * Math.min(1, dt * 4.5);
    this.rig.position.y += (0 - this.rig.position.y) * Math.min(1, dt * 4);
  }
}
