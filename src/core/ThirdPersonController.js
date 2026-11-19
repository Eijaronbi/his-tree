import * as THREE from 'three';

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
    this._camPos = new THREE.Vector3();
    this._camInit = false;
    this._lookAt = new THREE.Vector3();
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
    this.velocity.lerp(desired, Math.min(1, dt * accel));

    if (!this.frozen || this.airborne) {
      this.player.position.addScaledVector(this.velocity, dt);
      this.player.position.y = this.groundY;
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

    this.walkPhase += planar * dt * 1.85;
    if (this.mixer) this.mixer.update(dt);

    const target = new THREE.Vector3().copy(this.player.position);
    target.y += this.height;

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
    const follow = 1 - Math.exp(-dt * 9);
    this._camPos.lerp(desiredPos, follow);
    this.camera.position.copy(this._camPos);

    this._lookAt.copy(target).addScaledVector(forward, 0.35);
    this._lookAt.y -= 0.15;
    this.camera.lookAt(this._lookAt);
  }
}
