import * as THREE from 'three';

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class CameraDirector {
  constructor(camera, opts = {}) {
    this.camera = camera;
    this.shots = new Map();
    this.pos = camera.position.clone();
    this.target = new THREE.Vector3(0, 1.6, 0);
    this.fov = camera.fov;
    this.focus = opts.focus || 6;
    this.from = null;
    this.to = null;
    this.t = 0;
    this.dur = 0;
    this.shakeAmp = 0;
    this.shakeT = 0;
    this.enabled = false;
    this._tmp = new THREE.Vector3();
    this._off = new THREE.Vector3();
  }

  add(name, shot) {
    this.shots.set(name, {
      pos: shot.pos.clone(),
      target: shot.target.clone(),
      fov: shot.fov ?? 32,
      focus: shot.focus ?? null
    });
    return this;
  }

  cut(name) {
    const s = this.shots.get(name);
    if (!s) return;
    this.pos.copy(s.pos);
    this.target.copy(s.target);
    this.fov = s.fov;
    if (s.focus != null) this.focus = s.focus;
    this.dur = 0;
    this.enabled = true;
    this._apply();
  }

  moveTo(name, duration = 1.6) {
    const s = this.shots.get(name);
    if (!s) return;
    this.from = {
      pos: this.pos.clone(), target: this.target.clone(),
      fov: this.fov, focus: this.focus
    };
    this.to = s;
    this.t = 0;
    this.dur = duration;
    this.enabled = true;
  }

  lookAt(point, duration = 1.0) {
    this.to = {
      pos: this.pos.clone(),
      target: point.clone(),
      fov: this.fov,
      focus: this.pos.distanceTo(point)
    };
    this.from = {
      pos: this.pos.clone(), target: this.target.clone(),
      fov: this.fov, focus: this.focus
    };
    this.t = 0;
    this.dur = duration;
    this.enabled = true;
  }

  shake(amp = 0.02, duration = 0.35) {
    this.shakeAmp = amp;
    this.shakeT = duration;
    this._shakeDur = duration;
  }

  portrait(object, opts = {}) {
    const head = new THREE.Vector3();
    object.getWorldPosition(head);
    const height = opts.height ?? 1.75;
    const focusPoint = head.clone();
    focusPoint.y += height * 0.92;

    const dist = opts.distance ?? 2.2;
    const side = opts.side ?? 1;
    const angle = (opts.angle ?? 22) * (Math.PI / 180);

    const pos = new THREE.Vector3(
      focusPoint.x + Math.sin(angle) * dist * side,
      focusPoint.y - height * 0.06,
      focusPoint.z + Math.cos(angle) * dist
    );

    return {
      pos, target: focusPoint, fov: opts.fov ?? 18,
      focus: dist * 0.98
    };
  }

  update(dt) {
    if (this.dur > 0 && this.to) {
      this.t = Math.min(1, this.t + dt / this.dur);
      const k = easeInOut(this.t);
      this.pos.lerpVectors(this.from.pos, this.to.pos, k);
      this.target.lerpVectors(this.from.target, this.to.target, k);
      this.fov = this.from.fov + (this.to.fov - this.from.fov) * k;
      if (this.to.focus != null) {
        this.focus = this.from.focus + (this.to.focus - this.from.focus) * k;
      }
      if (this.t >= 1) { this.dur = 0; this.to = null; }
    }

    if (this.shakeT > 0) {
      this.shakeT = Math.max(0, this.shakeT - dt);
      const a = this.shakeAmp * (this.shakeT / (this._shakeDur || 1));
      this._off.set(
        (Math.random() - 0.5) * a,
        (Math.random() - 0.5) * a,
        (Math.random() - 0.5) * a * 0.5
      );
      this.camera.position.copy(this.pos).add(this._off);
    } else {
      this.camera.position.copy(this.pos);
    }

    this.camera.lookAt(this.target);
    if (Math.abs(this.camera.fov - this.fov) > 0.01) {
      this.camera.fov = this.fov;
      this.camera.updateProjectionMatrix();
    }
  }

  _apply() {
    this.camera.position.copy(this.pos);
    this.camera.lookAt(this.target);
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
  }
}
