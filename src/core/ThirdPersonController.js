import * as THREE from 'three';

const tmpMatrix = new THREE.Matrix4();

export class ThirdPersonController {
  constructor(camera, player, mixer, clips, input, groundY = 0) {
    this.camera = camera;
    this.player = player;
    this.mixer = mixer;
    this.input = input;
    this.groundY = groundY;
    this.yaw = Math.PI;
    this.pitch = 0.22;
    this.distance = 4.6;
    this.height = 1.35;
    this.targetHeight = null;
    this.speedWalk = 3.1;
    this.speedRun = 6.4;
    this.velocity = new THREE.Vector3();
    this.state = 'idle';
    this.frozen = false;
    this.airborne = false;
    this.actions = {};
    this.walkPhase = 0;
    this.speed = 0;
    this.dashTime = 0;
    this.dashCooldown = 0;
    this.dashDir = new THREE.Vector3();
    this.colliders = [];
    this.radius = 0.36;
    this.resolveWorld = null;
    this.groundHeightFn = null;
    this._camPos = new THREE.Vector3();
    this._camInit = false;
    this._lookAt = new THREE.Vector3();
    this.firstPerson = false;
    this.cameraFollow = 9;
    this.eyeHeight = 1.62;
    this.povForward = 0.22;
    if (clips) {
      for (const clip of clips) {
        const key = clip.name.toLowerCase().replace(/[^a-z]+/g, '_');
        const action = this.mixer.clipAction(clip);
        action.enabled = true;
        action.setEffectiveWeight(0);
        action.play();
        this.actions[key] = action;
      }
    }
    this.walkAction = this._pick(['walk', 'walk_fwd_loop', 'walking', 'run']);
    this.runAction = this._pick(['sprint', 'run', 'jog_fwd_loop', 'walk']);
    this.idleAction = this._pick(['idle', 'idle_loop', 'standing']);
  }

  setColliders(boxes) { this.colliders = boxes || []; }

  setCollisionResolver(fn) { this.resolveWorld = fn; }

  setGroundHeight(fn) { this.groundHeightFn = fn; }

  /** Switch between the third person camera and the first person (POV) camera. */
  setFirstPerson(on) {
    this.firstPerson = !!on;
    this.player.visible = !this.firstPerson;
    return this.firstPerson;
  }

  _resolveCollisions() {
    if (this.frozen) return;
    const p = this.player.position;
    const r = this.radius;
    for (let i = 0; i < this.colliders.length; i += 1) {
      const c = this.colliders[i];
      if (c.maxY < 0.34 || c.minY > p.y + 1.75) continue;
      const cx = p.x < c.minX ? c.minX : (p.x > c.maxX ? c.maxX : p.x);
      const cz = p.z < c.minZ ? c.minZ : (p.z > c.maxZ ? c.maxZ : p.z);
      const dx = p.x - cx;
      const dz = p.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 > r * r) continue;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2);
        const push = (r - d) / d;
        p.x += dx * push;
        p.z += dz * push;
      } else {
        const px = Math.min(p.x - c.minX, c.maxX - p.x);
        const pz = Math.min(p.z - c.minZ, c.maxZ - p.z);
        if (px < pz) p.x += (p.x - (c.minX + c.maxX) * 0.5 > 0 ? 1 : -1) * (px + r);
        else p.z += (p.z - (c.minZ + c.maxZ) * 0.5 > 0 ? 1 : -1) * (pz + r);
      }
      this.velocity.x = 0;
      this.velocity.z = 0;
    }
    if (this.resolveWorld) this.resolveWorld(p, 0.62);
  }

  _pick(names) {
    for (const n of names) {
      for (const key of Object.keys(this.actions)) {
        if (key === n || key.startsWith(n + '_')) return this.actions[key];
      }
    }
    return null;
  }

  _play(action, weight = 1) {
    if (!action) return;
    for (const key of Object.keys(this.actions)) {
      if (this.actions[key] !== action) this.actions[key].setEffectiveWeight(0);
    }
    action.setEffectiveWeight(weight);
    action.fadeIn(0.18);
  }

  dash(direction = null) {
    if (this.dashCooldown > 0 || this.dashTime > 0 || this.frozen) return false;
    const dir = direction ? direction.clone() : new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    if (dir.lengthSq() < 0.001) return false;
    this.dashDir.copy(dir.normalize());
    this.dashTime = 0.34;
    this.dashCooldown = 0.9;
    return true;
  }

  update(dt) {
    const look = this.input.consumeLook();
    this.yaw += look.x;
    this.pitch = Math.max(-0.32, Math.min(1.05, this.pitch + look.y));

    const axis = this.input.axis();
    const moving = !this.frozen && axis.len > 0.05;
    const speedCap = this.input.run ? this.speedRun : this.speedWalk;

    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const desired = new THREE.Vector3()
      .addScaledVector(forward, axis.y)
      .addScaledVector(right, axis.x);
    if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(speedCap * axis.len);

    const accel = moving ? 14 : 18;
    if (this.frozen) {
      // flight drives the player; the controller must not integrate input or
      // velocity here or A/D would slide the avatar sideways in flight
      this.velocity.set(0, 0, 0);
    } else {
      this.velocity.lerp(desired, Math.min(1, dt * accel));
      this.player.position.addScaledVector(this.velocity, dt);
      if (this.groundHeightFn && !this.airborne) {
        this.player.position.y = this.groundHeightFn(this.player.position.x, this.player.position.z);
      } else {
        this.player.position.y = this.groundY;
      }
      this._resolveCollisions();
    }

    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.dashTime > 0) {
      this.dashTime -= dt;
      const burst = Math.max(0, this.dashTime) / 0.34;
      this.player.position.addScaledVector(this.dashDir, 9.5 * burst * dt * 3);
      this.velocity.copy(this.dashDir).multiplyScalar(this.speedRun);
    }

    const planar = Math.hypot(this.velocity.x, this.velocity.z);
    this.speed = planar;

    if (moving || planar > 0.4) {
      const target = Math.atan2(this.velocity.x, this.velocity.z);
      const current = this.player.rotation.y;
      let diff = target - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.rotation.y += diff * Math.min(1, dt * 14);
      this.state = planar > this.speedWalk * 1.15 ? 'run' : 'walk';
      if (this.actions && Object.keys(this.actions).length) {
        this._play(this.state === 'run' ? this.runAction : this.walkAction);
      }
    } else {
      this.state = 'idle';
      if (this.actions && Object.keys(this.actions).length) this._play(this.idleAction);
    }

    if (this.firstPerson) {
      // in POV the body always faces where the camera looks
      let diff = this.yaw - this.player.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.rotation.y += diff * Math.min(1, dt * 12);
    }

    this.walkPhase += planar * dt * 1.85;
    if (this.mixer) this.mixer.update(dt);

    if (this.firstPerson) {
      // POV: the camera sits at the character's eyes and looks the same way the
      // third person camera does, so toggling never changes the view direction.
      const eye = new THREE.Vector3().copy(this.player.position);
      eye.y += this.eyeHeight;
      eye.addScaledVector(forward, this.povForward);
      this.camera.position.copy(eye);
      const view = new THREE.Vector3(
        Math.sin(this.yaw) * Math.cos(this.pitch),
        -Math.sin(this.pitch),
        Math.cos(this.yaw) * Math.cos(this.pitch)
      );
      this._lookAt.copy(eye).add(view);
      this.camera.lookAt(this._lookAt);
      return;
    }

    const target = new THREE.Vector3().copy(this.player.position);
    target.y += this.targetHeight == null ? this.height : this.targetHeight;

    const offset = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).multiplyScalar(this.distance);
    const desiredPos = target.clone().add(offset);
    desiredPos.y += 0.55;

    if (!this._camInit) {
      this._camPos.copy(desiredPos);
      this._camInit = true;
    }
    const follow = 1 - Math.exp(-dt * this.cameraFollow);
    // the camera stays locked behind the player horizontally (no drift at speed),
    // only the height eases so bumps do not jolt the view
    this._camPos.x = desiredPos.x;
    this._camPos.z = desiredPos.z;
    this._camPos.y += (desiredPos.y - this._camPos.y) * follow;
    this.camera.position.copy(this._camPos);

    this._lookAt.copy(target).addScaledVector(forward, 0.35);
    this._lookAt.y -= 0.15;
    this.camera.lookAt(this._lookAt);
  }
}

/**
 * Builds axis-aligned collision boxes from a world group so the player cannot
 * walk through walls, furniture or props. Instanced meshes (seats, sandbags)
 * contribute one box per instance; flat decoration is ignored.
 */
export function collectColliders(root, options = {}) {
  const minHeight = options.minHeight ?? 0.3;
  const maxBoxes = options.maxBoxes ?? 2200;
  const boxes = [];
  if (!root) return boxes;
  const tmp = new THREE.Box3();
  const v = new THREE.Vector3();

  const push = (minX, minY, minZ, maxX, maxY, maxZ) => {
    if (maxY - minY < minHeight) return;
    if (maxX - minX > 90 && maxZ - minZ > 90) return;
    boxes.push({ minX, minY, minZ, maxX, maxY, maxZ });
  };

  root.updateMatrixWorld(true);
  root.traverse((o) => {
    if (!o.isMesh || boxes.length >= maxBoxes) return;
    if (o.userData && o.userData.noCollide) return;
    if (!o.geometry) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    const gb = o.geometry.boundingBox;
    if (!gb || !Number.isFinite(gb.min.x)) return;
    if (o.isInstancedMesh) {
      const count = Math.min(o.count, 900);
      for (let i = 0; i < count && boxes.length < maxBoxes; i += 1) {
        o.getMatrixAt(i, tmpMatrix);
        tmpMatrix.premultiply(o.matrixWorld);
        tmp.makeEmpty();
        for (let c = 0; c < 8; c += 1) {
          v.set(c & 1 ? gb.max.x : gb.min.x, c & 2 ? gb.max.y : gb.min.y, c & 4 ? gb.max.z : gb.min.z);
          v.applyMatrix4(tmpMatrix);
          tmp.expandByPoint(v);
        }
        push(tmp.min.x, tmp.min.y, tmp.min.z, tmp.max.x, tmp.max.y, tmp.max.z);
      }
      return;
    }
    tmp.copy(gb).applyMatrix4(o.matrixWorld);
    push(tmp.min.x, tmp.min.y, tmp.min.z, tmp.max.x, tmp.max.y, tmp.max.z);
  });
  return boxes;
}
