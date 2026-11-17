import * as THREE from 'three';

export class ThirdPersonController {
  constructor(camera, player, mixer, clips, input, groundY = 0) {
    this.camera = camera;
    this.player = player;
    this.mixer = mixer;
    this.input = input;
    this.groundY = groundY;
    this.yaw = Math.PI;
    this.pitch = 0.20;
    this.distance = 4.4;
    this.height = 1.35;
    this.speedWalk = 3.1;
    this.speedRun = 6.2;
    this.velocity = new THREE.Vector3();
    this.state = 'idle';
    this.actions = {};
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

  update(dt) {
    const look = this.input.consumeLook();
    this.yaw += look.x;
    this.pitch = Math.max(-0.15, Math.min(1.15, this.pitch + look.y));
    const axis = this.input.axis();
    const moving = axis.len > 0.05;
    const speed = this.input.run ? this.speedRun : this.speedWalk;

    const forward = new THREE.Vector3(Math.sin(this.yaw), 0, Math.cos(this.yaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const desired = new THREE.Vector3()
      .addScaledVector(forward, axis.y)
      .addScaledVector(right, axis.x);
    if (desired.lengthSq() > 0) desired.normalize().multiplyScalar(speed * axis.len);

    this.velocity.lerp(desired, Math.min(1, dt * 12));
    this.player.position.addScaledVector(this.velocity, dt);
    this.player.position.y = this.groundY;

    if (moving) {
      const target = Math.atan2(this.velocity.x, this.velocity.z);
      const current = this.player.rotation.y;
      let diff = target - current;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.player.rotation.y += diff * Math.min(1, dt * 12);
      this.state = this.input.run ? 'run' : 'walk';
      this._play(this.state === 'run' ? this.runAction : this.walkAction);
    } else {
      this.state = 'idle';
      this._play(this.idleAction);
    }

    this.mixer.update(dt);

    const target = new THREE.Vector3().copy(this.player.position);
    target.y += this.height;
    const offset = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    ).multiplyScalar(this.distance);
    const desiredPos = target.clone().add(offset);
    this.camera.position.lerp(desiredPos, Math.min(1, dt * 6));
    this.camera.lookAt(target);
  }
}
