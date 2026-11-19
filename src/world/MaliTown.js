import * as THREE from 'three';
import { adobeMaterial, sandMaterial, woodMaterial, clothMaterial, thatchMaterial, goldMaterial, contactShadowMaterial, tileObjectUVs, makeRng } from './Materials.js';

const UP = new THREE.Vector3(0, 1, 0);

export class MaliTown {
  constructor(scene, models, palette, options = {}) {
    this.scene = scene;
    this.models = models;
    this.palette = palette;
    this.options = { palms: true, lights: true, ...options };
    this.rng = makeRng(1337);
    this.colliders = [];
    this.animated = [];
    this.lights = [];
    this.group = new THREE.Group();
    scene.add(this.group);
    this._buildGround();
    this._buildMarket();
    this._buildScholarQuarter();
    this._buildCaravanCamp();
    this._buildPalaceGate();
    this._scatterNature();
    this._buildHorizon();
    tileObjectUVs(this.group, 2.4);
  }

  _addCollider(x, z, r, solid = true) {
    this.colliders.push({ x, z, r, solid });
  }

  _buildGround() {
    const geo = new THREE.PlaneGeometry(520, 520, 110, 110);
    geo.rotateX(-Math.PI / 2);
    const pos = geo.attributes.position;
    const rng = makeRng(9);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const dist = Math.hypot(x, z);
      const dune = Math.sin(x * 0.031 + 1.2) * Math.cos(z * 0.027) * 3.4;
      const far = Math.max(0, dist - 120) * 0.055;
      pos.setY(i, dune * Math.min(1, dist / 60) + far + (rng() - 0.5) * 0.22);
    }
    geo.computeVertexNormals();
    const ground = new THREE.Mesh(geo, sandMaterial([70, 70]));
    ground.receiveShadow = true;
    ground.userData.noTileUV = true;
    this.group.add(ground);
  }

  _house({ x, z, w = 7, h = 4.6, d = 7, rot = 0, parapet = true, awning = true, windows = 2 }) {
    const g = new THREE.Group();
    const jitter = 0.88 + this.rng() * 0.20;
    const tint = new THREE.Color(this.palette.adobe).multiplyScalar(jitter);
    const adobe = adobeMaterial(tint.getHex(), Math.floor(this.rng() * 9999));
    const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), adobe);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    if (parapet) {
      const cap = new THREE.Mesh(new THREE.BoxGeometry(w + 0.5, 0.5, d + 0.5), adobe);
      cap.position.y = h + 0.2;
      cap.castShadow = true;
      g.add(cap);
    }

    const wood = woodMaterial();
    const toronGeo = new THREE.CylinderGeometry(0.11, 0.13, 1.5, 7);
    toronGeo.rotateX(Math.PI / 2);
    const rows = Math.max(2, Math.floor(h / 1.6));
    const perRow = Math.max(3, Math.floor(w / 1.5));
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < perRow; c++) {
        const x = -w / 2 + (w / perRow) * (c + 0.5);
        for (const side of [1, -1]) {
          const stick = new THREE.Mesh(toronGeo, wood);
          stick.position.set(x, 0.9 + r * (h / rows), side * (d / 2 + 0.55));
          stick.castShadow = true;
          g.add(stick);
        }
      }
    }

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.5, 2.4, 0.24), new THREE.MeshStandardMaterial({ color: 0x3b2617, roughness: 0.9 }));
    door.position.set(0, 1.2, d / 2 + 0.02);
    g.add(door);

    const dark = new THREE.MeshStandardMaterial({ color: 0x1b120a, roughness: 1 });
    for (let i = 0; i < windows; i++) {
      const wx = (i - (windows - 1) / 2) * (w / (windows + 0.6));
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.0, 0.2), dark);
      win.position.set(wx, h * 0.62, d / 2 + 0.02);
      g.add(win);
    }

    if (awning) {
      const canopy = new THREE.Mesh(new THREE.PlaneGeometry(w * 0.75, 2.2), thatchMaterial());
      canopy.rotation.x = -Math.PI / 2 + 0.18;
      canopy.position.set(0, h * 0.62, d / 2 + 1.15);
      canopy.castShadow = true;
      g.add(canopy);
      for (const sx of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, h * 0.62, 6), wood);
        pole.position.set(sx * w * 0.36, h * 0.31, d / 2 + 1.9);
        pole.castShadow = true;
        g.add(pole);
      }
    }

    const blob = new THREE.Mesh(new THREE.PlaneGeometry(w * 1.9, d * 1.9), contactShadowMaterial());
    blob.rotation.x = -Math.PI / 2;
    blob.position.set(x, 0.02, z);
    blob.userData.noTileUV = true;
    this.group.add(blob);

    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.group.add(g);
    this._addCollider(x, z, Math.max(w, d) * 0.62);
    return g;
  }

  _stall({ x, z, rot = 0, cloth = 0xc08a2e }) {
    const g = new THREE.Group();
    const wood = woodMaterial();
    const canopy = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.4), clothMaterial(cloth));
    canopy.rotation.x = -Math.PI / 2;
    canopy.position.y = 2.5;
    canopy.castShadow = true;
    g.add(canopy);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 2.5, 6), wood);
        pole.position.set(sx * 1.6, 1.25, sz * 1.1);
        pole.castShadow = true;
        g.add(pole);
      }
    }
    const table = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.16, 1.9), wood);
    table.position.y = 1.0;
    table.castShadow = true;
    table.receiveShadow = true;
    g.add(table);
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 5), wood);
        leg.position.set(sx * 1.4, 0.5, sz * 0.8);
        g.add(leg);
      }
    }
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.group.add(g);
    this._addCollider(x, z, 1.5, false);
    return g;
  }

  _basket(x, z, scale = 1) {
    const g = new THREE.Group();
    const mat = new THREE.MeshStandardMaterial({ color: 0xa97b3f, roughness: 0.95 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.42 * scale, 0.32 * scale, 0.55 * scale, 12), mat);
    body.position.y = 0.28 * scale;
    body.castShadow = true;
    g.add(body);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.42 * scale, 0.05 * scale, 6, 14), mat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.55 * scale;
    g.add(rim);
    g.position.set(x, 0, z);
    this.group.add(g);
  }

  _pot(x, z, scale = 1, color = 0x7a3f28) {
    const pts = [];
    for (let i = 0; i <= 12; i++) {
      const t = i / 12;
      const r = (0.16 + Math.sin(t * Math.PI * 0.92) * 0.34) * scale;
      pts.push(new THREE.Vector2(r, t * 0.8 * scale));
    }
    const pot = new THREE.Mesh(new THREE.LatheGeometry(pts, 16), new THREE.MeshStandardMaterial({ color, roughness: 0.78 }));
    pot.castShadow = true;
    pot.position.set(x, 0, z);
    this.group.add(pot);
  }

  _camel(x, z, rot = 0) {
    const model = this.models.camel;
    if (!model) return;
    const clone = model.clone(true);
    clone.position.set(x, 0, z);
    clone.rotation.y = rot;
    clone.scale.setScalar(1.0);
    clone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.group.add(clone);
    this._addCollider(x, z, 1.5, false);
  }

  _donkey(x, z, rot = 0) {
    const grey = new THREE.MeshStandardMaterial({ color: 0x6b6257, roughness: 0.94 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x4a443c, roughness: 0.95 });
    const g = new THREE.Group();
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.62, 1.5), grey);
    body.position.y = 0.92;
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.72, 0.34), grey);
    neck.position.set(0, 1.34, 0.62);
    neck.rotation.x = -0.34;
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.3, 0.56), grey);
    head.position.set(0, 1.52, 0.98);
    head.rotation.x = 0.22;
    const ears = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.34, 6), dark);
    ears.position.set(0.09, 1.82, 0.88);
    const ears2 = ears.clone();
    ears2.position.x = -0.09;
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.42, 6), dark);
    tail.position.set(0, 1.06, -0.78);
    tail.rotation.x = 0.5;
    const legs = [];
    for (const dx of [-0.22, 0.22]) {
      for (const dz of [-0.52, 0.52]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.06, 0.86, 7), dark);
        leg.position.set(dx, 0.43, dz);
        legs.push(leg);
      }
    }
    g.add(body, neck, head, ears, ears2, tail, ...legs);
    g.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    g.position.set(x, 0, z);
    g.rotation.y = rot;
    this.group.add(g);
    this._addCollider(x, z, 0.9, false);
    return g;
  }

  _npc(x, z, rot = 0, name = 'villager') {
    const model = this.models.villager;
    if (!model) return;
    const clone = model.clone(true);
    clone.position.set(x, 0, z);
    clone.rotation.y = rot;
    clone.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    this.group.add(clone);
    this._addCollider(x, z, 0.7, false);
    return clone;
  }

  _lantern(x, z, y = 2.6) {
    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 8, 8),
      new THREE.MeshBasicMaterial({ color: 0xffc978 })
    );
    glow.position.set(x, y, z);
    this.group.add(glow);
    const light = new THREE.PointLight(0xffb45c, 1.1, 9, 2);
    light.position.set(x, y, z);
    if (this.options.lights) this.group.add(light);
    this.lights.push(light);
  }

  _buildMarket() {
    const rows = 5;
    for (let r = 0; r < rows; r++) {
      for (const side of [-1, 1]) {
        const x = side * 11 + (this.rng() - 0.5) * 1.6;
        const z = -22 + r * 11 + (this.rng() - 0.5) * 1.6;
        this._house({
          x, z,
          w: 6 + this.rng() * 3.4,
          h: 3.8 + this.rng() * 2.6,
          d: 6 + this.rng() * 3,
          rot: side > 0 ? -Math.PI / 2 : Math.PI / 2,
          windows: 1 + Math.floor(this.rng() * 3)
        });
      }
    }
    const clothColors = [0xc08a2e, 0x8f2f28, 0x2f4a70, 0x7a6a3a, 0xa8432f];
    for (let i = 0; i < 6; i++) {
      const z = -18 + i * 8 + (this.rng() - 0.5) * 2;
      const side = i % 2 === 0 ? -1 : 1;
      this._stall({ x: side * 5.4, z, rot: side > 0 ? -Math.PI / 2 : Math.PI / 2, cloth: clothColors[i % clothColors.length] });
      this._basket(side * 5.4 + (this.rng() - 0.5) * 2, z + 1.8);
      this._pot(side * 5.4 + (this.rng() - 0.5) * 2.4, z - 1.6, 0.9 + this.rng() * 0.5);
      this._lantern(side * 5.4, z + 2.6);
    }
    this._npc(-4.2, -14, 1.2);
    this._npc(4.6, 2, -0.8);
    this._npc(-4.8, 14, 2.4);
  }

  _buildScholarQuarter() {
    const cx = -66;
    const cz = -30;
    for (let i = 0; i < 7; i++) {
      const angle = (i / 7) * Math.PI * 2;
      const radius = 15 + this.rng() * 7;
      this._house({
        x: cx + Math.cos(angle) * radius,
        z: cz + Math.sin(angle) * radius,
        w: 7 + this.rng() * 4,
        h: 5.4 + this.rng() * 2.6,
        d: 7 + this.rng() * 3,
        rot: -angle + Math.PI / 2,
        windows: 3,
        awning: false
      });
    }
    const manuscript = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.14, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x6a4a22, roughness: 0.9 })
    );
    manuscript.position.set(cx, 1.1, cz);
    this.group.add(manuscript);
    this._stall({ x: cx + 3, z: cz + 2, rot: 0.6, cloth: 0x2f4a70 });
    this._npc(cx + 2.6, cz - 1.4, 2.1);
  }

  _buildCaravanCamp() {
    const cx = 58;
    const cz = -26;
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + 0.4;
      const tent = new THREE.Mesh(
        new THREE.ConeGeometry(2.6, 3.4, 8, 1, true),
        clothMaterial(i % 2 === 0 ? 0xd6c39a : 0xb59a6a, false)
      );
      tent.position.set(cx + Math.cos(angle) * 9, 1.7, cz + Math.sin(angle) * 9);
      tent.castShadow = true;
      this.group.add(tent);
      this._addCollider(tent.position.x, tent.position.z, 1.8);
    }
    this._camel(cx - 5, cz + 1, 0.8);
    this._camel(cx + 3, cz + 5, 2.1);
    this._camel(cx + 7, cz - 3, -1.2);
    this._donkey(cx - 8, cz + 6, 1.4);
    this._donkey(cx + 9, cz + 8, -0.6);
    this._donkey(cx - 2, cz - 9, 2.6);
    this._donkey(-4.6, 22.8, 0.9);
    this._donkey(6.2, 25.6, -1.7);
    for (let i = 0; i < 5; i++) {
      this._basket(cx + (this.rng() - 0.5) * 14, cz + (this.rng() - 0.5) * 14, 0.8 + this.rng() * 0.6);
    }
    this._npc(cx - 1, cz + 3, 0.4);
  }

  _buildPalaceGate() {
    const g = new THREE.Group();
    const adobe = adobeMaterial(this.palette.adobeDark, 4242);
    const wallW = 44;
    const wallH = 7.5;
    const wall = new THREE.Mesh(new THREE.BoxGeometry(wallW, wallH, 2.4), adobe);
    wall.position.set(0, wallH / 2, 0);
    wall.castShadow = true;
    wall.receiveShadow = true;
    g.add(wall);
    for (let i = 0; i < 9; i++) {
      const tower = new THREE.Mesh(new THREE.BoxGeometry(4.2, 6 + (i % 3), 4.2), adobe);
      tower.position.set(-wallW / 2 + 3 + i * ((wallW - 6) / 8), (6 + (i % 3)) / 2, 0);
      tower.castShadow = true;
      g.add(tower);
    }
    const gate = new THREE.Mesh(
      new THREE.BoxGeometry(6, 5.4, 0.6),
      new THREE.MeshStandardMaterial({ color: 0x2a1a0d, roughness: 1 })
    );
    gate.position.set(0, 2.7, 1.25);
    g.add(gate);
    const goldTrim = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.4, 0.8), goldMaterial());
    goldTrim.position.set(0, 5.3, 1.3);
    g.add(goldTrim);
    g.position.set(0, 0, 92);
    this.group.add(g);
    this._addCollider(0, 92, 3.2);
    this._addCollider(-16, 92, 2.4);
    this._addCollider(16, 92, 2.4);
  }

  _buildHorizon() {
    const loader = new THREE.TextureLoader();
    const backdrop = (file, width, height, y, x, z, ry) => {
      const tex = loader.load(file);
      tex.colorSpace = THREE.SRGBColorSpace;
      const mat = new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide, fog: false, depthWrite: false });
      const plane = new THREE.Mesh(new THREE.PlaneGeometry(width, height), mat);
      plane.position.set(x, y, z);
      plane.rotation.y = ry;
      plane.renderOrder = -2;
      this.group.add(plane);
    };
    const desert = './assets/textures/scenery/pano_desert.jpg';
    const city = './assets/textures/scenery/pano_city.jpg';
    backdrop(desert, 760, 380, 78, 0, -330, 0);
    backdrop(desert, 760, 380, 78, 0, 330, Math.PI);
    backdrop(city, 620, 310, 62, -330, 0, Math.PI / 2);
    backdrop(city, 620, 310, 62, 330, 0, -Math.PI / 2);
  }

  _scatterNature() {
    const palms = this.options.palms ? this.models.palm : null;
    if (palms) {
      const spots = [];
      for (let i = 0; i < 46; i++) {
        const angle = this.rng() * Math.PI * 2;
        const radius = 26 + this.rng() * 150;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        if (Math.abs(x) < 9 && z > -26 && z < 26) continue;
        spots.push({ x, z, s: 0.9 + this.rng() * 0.7, r: this.rng() * Math.PI * 2 });
      }
      for (const spot of spots) {
        const palm = palms.clone(true);
        palm.position.set(spot.x, 0, spot.z);
        palm.rotation.y = spot.r;
        palm.scale.setScalar(spot.s);
        palm.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        this.group.add(palm);
      }
    }
  }

  resolveCollisions(position, radius = 0.6) {
    for (const c of this.colliders) {
      if (c.solid === false) continue;
      const dx = position.x - c.x;
      const dz = position.z - c.z;
      const dist = Math.hypot(dx, dz);
      const min = c.r + radius;
      if (dist < min && dist > 0.0001) {
        const push = (min - dist) / dist;
        position.x += dx * push;
        position.z += dz * push;
      }
    }
  }

  update(dt) {
    for (const l of this.lights) {
      l.intensity = 1.0 + Math.sin(performance.now() * 0.003 + l.position.x) * 0.12;
    }
  }
}
