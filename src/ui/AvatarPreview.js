import * as THREE from 'three';
import { poseCharacter } from '../world/CharacterAnim.js';
import { robustBox } from '../world/frame.js';

export class AvatarPreview {
  constructor(canvas, loader) {
    this.canvas = canvas;
    this.loader = loader;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(30, 1, 0.1, 40);
    this.camera.position.set(0, 1.15, 3.4);
    this.camera.lookAt(0, 0.98, 0);
    this.scene.add(new THREE.HemisphereLight(0xf2dfbc, 0x2a1d10, 1.5));
    const key = new THREE.DirectionalLight(0xffe6bd, 2.4);
    key.position.set(1.6, 2.6, 2.2);
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fc4e8, 1.5);
    rim.position.set(-2.0, 1.6, -1.8);
    this.scene.add(rim);
    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(1.5, 48),
      new THREE.MeshBasicMaterial({ color: 0x1a120a, transparent: true, opacity: 0.9 })
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.002;
    this.scene.add(floor);
    this.group = new THREE.Group();
    this.scene.add(this.group);
    this.current = null;
    this.raf = 0;
    this.spin = 0;
    this.dragging = false;
    this.autoSpin = true;
    this._bindDrag();
    this.resize();
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
  }

  _bindDrag() {
    let last = 0;
    const start = (e) => {
      this.dragging = true;
      last = e.clientX;
      this.autoSpin = false;
      if (e.pointerId !== undefined && this.canvas.setPointerCapture) {
        try { this.canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
    };
    const move = (e) => {
      if (!this.dragging) return;
      this.group.rotation.y += (e.clientX - last) * 0.012;
      last = e.clientX;
    };
    const end = () => { this.dragging = false; };
    this.canvas.addEventListener('pointerdown', start);
    this.canvas.addEventListener('pointermove', move);
    this.canvas.addEventListener('pointerup', end);
    this.canvas.addEventListener('pointercancel', end);
  }

  resize() {
    const w = Math.max(1, this.canvas.clientWidth);
    const h = Math.max(1, this.canvas.clientHeight);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  async load(file) {
    this.clear();
    const gltf = await this.loader.loadAsync(file);
    const model = gltf.scene;
    model.updateMatrixWorld(true);
    const box = robustBox(model);
    const size = new THREE.Vector3();
    box.getSize(size);
    const center = new THREE.Vector3();
    box.getCenter(center);
    const s = 1.72 / Math.max(0.001, size.y);
    const holder = new THREE.Group();
    holder.add(model);
    model.position.set(-center.x, -box.min.y, -center.z);
    holder.scale.setScalar(s);
    if (!/lofi/.test(file)) {
      const pose = poseCharacter(holder, { armDown: 'auto', legAmp: 0.55, armAmp: 0.46 });
      if (pose) pose.setIdle();
    }
    holder.traverse((o) => {
      if (o.isMesh) {
        o.castShadow = false;
        o.receiveShadow = false;
        o.frustumCulled = false;
      }
    });
    this.group.add(holder);
    this.current = holder;
    this.canvas.dataset.ready = 'true';
    this.canvas.dispatchEvent(new CustomEvent('avatarpreview:ready'));
    this.start();
    return true;
  }

  clear() {
    this.stop();
    if (this.current) {
      this.group.remove(this.current);
      this.current.traverse((o) => {
        if (o.isMesh) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          mats.forEach((m) => m && m.dispose());
        }
      });
      this.current = null;
    }
    delete this.canvas.dataset.ready;
  }

  start() {
    if (this.raf) return;
    const clock = new THREE.Clock();
    const tick = () => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.06, clock.getDelta());
      if (this.autoSpin && !this.dragging) this.group.rotation.y += dt * 0.55;
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  dispose() {
    this.stop();
    this.clear();
    this.ro.disconnect();
    this.renderer.dispose();
  }
}
