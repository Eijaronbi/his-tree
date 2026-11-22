import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { poseCharacter } from '../world/CharacterAnim.js';
import { robustBox } from '../world/frame.js';

const PROFILE_YAW = 0;
const CACHE_MAX = 3;

export class AvatarPreview {
  constructor(canvas, loader) {
    this.canvas = canvas;
    this.loader = loader;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'low-power' });
    this.renderer.setPixelRatio(Math.min(1.5, window.devicePixelRatio || 1));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.14;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(26, 1, 0.05, 30);
    this.camera.position.set(0, 1.56, 1.42);
    this.camera.lookAt(0, 1.525, 0);
    this.scene.add(new THREE.HemisphereLight(0xf7e8cb, 0x2b1e11, 1.05));
    const key = new THREE.DirectionalLight(0xffe9c6, 1.45);
    key.position.set(0.9, 1.7, 2.4);
    this.scene.add(key);
    const fill = new THREE.DirectionalLight(0xffd9b4, 0.55);
    fill.position.set(-1.8, 1.0, 1.6);
    this.scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffc98a, 0.5);
    rim.position.set(-1.0, 2.0, -1.6);
    this.scene.add(rim);
    this.scene.add(new THREE.AmbientLight(0xfff1dd, 0.38));
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
    this.currentFile = null;
    this.cache = new Map();
    this.raf = 0;
    this.spin = 0;
    this.dragging = false;
    this.autoSpin = true;
    this._paused = false;
    this._loadId = 0;
    this._onShow = () => { this._paused = false; this.start(); };
    this._onHide = () => { this._paused = true; this.stop(); };
    document.addEventListener('avatarpicker:show', this._onShow);
    document.addEventListener('avatarpicker:hide', this._onHide);
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

  _disposeTree(root) {
    root.traverse((o) => {
      if (!o.isMesh) return;
      if (o.geometry) o.geometry.dispose();
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => {
        if (!m) return;
        for (const key of Object.keys(m)) {
          const v = m[key];
          if (v && v.isTexture) v.dispose();
        }
        m.dispose();
      });
    });
  }

  _touch(file) {
    const gltf = this.cache.get(file);
    if (!gltf) return null;
    this.cache.delete(file);
    this.cache.set(file, gltf);
    return gltf;
  }

  _evict() {
    while (this.cache.size > CACHE_MAX) {
      let victim = null;
      for (const key of this.cache.keys()) {
        if (key !== this.currentFile) { victim = key; break; }
      }
      if (!victim) break;
      const gltf = this.cache.get(victim);
      this.cache.delete(victim);
      if (gltf && gltf.scene) this._disposeTree(gltf.scene);
    }
  }

  async load(file) {
    const token = ++this._loadId;
    let gltf = this._touch(file);
    if (!gltf) {
      gltf = await this.loader.loadAsync(file);
      if (token !== this._loadId) return false;
      this.cache.set(file, gltf);
    }
    if (token !== this._loadId) return false;
    this._clearCurrent();
    const model = cloneSkinned(gltf.scene);
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
    holder.rotation.y = PROFILE_YAW;
    if (!/lofi/.test(file)) {
      const pose = poseCharacter(holder, { armDown: 'auto', legAmp: 0.55, armAmp: 0.46 });
      if (pose) pose.setIdle();
    }
    holder.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = false;
      o.receiveShadow = false;
      o.frustumCulled = false;
      o.material = Array.isArray(o.material) ? o.material.map((m) => (m ? m.clone() : m)) : (o.material ? o.material.clone() : o.material);
    });
    this.group.add(holder);
    this.current = holder;
    this.currentFile = file;
    this.group.rotation.y = 0;
    this.canvas.dataset.ready = 'true';
    this.canvas.dispatchEvent(new CustomEvent('avatarpreview:ready'));
    this._evict();
    if (!this._paused) this.start();
    return true;
  }

  _clearCurrent() {
    if (!this.current) return;
    this.group.remove(this.current);
    this.current.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      mats.forEach((m) => m && m.dispose());
    });
    this.current = null;
    this.currentFile = null;
  }

  clear() {
    this.stop();
    this._clearCurrent();
    delete this.canvas.dataset.ready;
  }

  start() {
    if (this.raf || this._paused) return;
    if (this.canvas.offsetParent === null) return;
    const clock = new THREE.Clock();
    const tick = () => {
      if (this._paused || document.hidden || this.canvas.offsetParent === null) {
        this.raf = 0;
        return;
      }
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.06, clock.getDelta());
      this._t = (this._t || 0) + dt;
      if (this.autoSpin && !this.dragging) this.group.rotation.y = Math.sin(this._t * 0.32) * 0.11;
      this.renderer.render(this.scene, this.camera);
    };
    tick();
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  pause() {
    this._paused = true;
    this.stop();
  }

  resume() {
    this._paused = false;
    if (this.current) this.start();
  }

  dispose() {
    this.stop();
    document.removeEventListener('avatarpicker:show', this._onShow);
    document.removeEventListener('avatarpicker:hide', this._onHide);
    this._loadId += 1;
    this.clear();
    for (const gltf of this.cache.values()) {
      if (gltf && gltf.scene) this._disposeTree(gltf.scene);
    }
    this.cache.clear();
    this.ro.disconnect();
    this.renderer.dispose();
  }
}
