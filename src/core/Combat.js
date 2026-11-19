import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const loader = new GLTFLoader();

const WEAPONS = {
  fist: { label: 'Fists', range: 1.9, damage: 11, cooldown: 0.42, swing: 0.9 },
  slam: { label: 'Body slam', range: 2.6, damage: 24, cooldown: 0.62, swing: 1.25 },
  kick: { label: 'Kick', range: 2.25, damage: 17, cooldown: 0.72, swing: 1.1 },
  knife: { label: 'Knife', range: 2.0, damage: 28, cooldown: 0.5, swing: 1.0 },
  gun: { label: 'Pistol', range: 26, damage: 46, cooldown: 1.15, swing: 0.7 }
};

function capsule(color = 0x2a2622) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.CapsuleGeometry(0.3, 0.92, 6, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.9 })
  );
  body.position.y = 0.92;
  body.castShadow = true;
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.115, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x7a5942, roughness: 0.7 })
  );
  head.position.y = 1.62;
  head.castShadow = true;
  g.add(body, head);
  return g;
}

function knifeMesh() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(
    new THREE.BoxGeometry(0.035, 0.26, 0.012),
    new THREE.MeshStandardMaterial({ color: 0xc9ced6, roughness: 0.25, metalness: 0.85 })
  );
  blade.position.y = 0.15;
  const grip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.022, 0.026, 0.12, 8),
    new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.8 })
  );
  grip.position.y = -0.03;
  g.add(blade, grip);
  return g;
}

function pistolMesh() {
  const g = new THREE.Group();
  const barrel = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.075, 0.26),
    new THREE.MeshStandardMaterial({ color: 0x30302e, roughness: 0.45, metalness: 0.7 })
  );
  barrel.position.set(0, 0, 0.09);
  const grip = new THREE.Mesh(
    new THREE.BoxGeometry(0.05, 0.15, 0.07),
    new THREE.MeshStandardMaterial({ color: 0x4a3423, roughness: 0.8 })
  );
  grip.position.set(0, -0.1, -0.03);
  grip.rotation.x = 0.28;
  const hammer = new THREE.Mesh(
    new THREE.CylinderGeometry(0.012, 0.012, 0.09, 6),
    new THREE.MeshStandardMaterial({ color: 0x3a3a38, roughness: 0.4, metalness: 0.8 })
  );
  hammer.rotation.x = Math.PI / 2;
  hammer.position.set(0, 0.03, -0.09);
  g.add(barrel, grip, hammer);
  return g;
}

/**
 * Close combat for the 1865 chapter: fists, kicks, dodge, knife and pistol,
 * plus assassin enemies with simple chase/attack AI.
 */
export class Combat {
  constructor({ scene, player, camera, ui, input, chapter, body, onEvent }) {
    this.scene = scene;
    this.player = player;
    this.camera = camera;
    this.ui = ui;
    this.input = input;
    this.chapter = chapter;
    this.onEvent = onEvent || (() => {});
    this.enabled = false;

    this.health = 100;
    this.maxHealth = 100;
    this.weapon = 'fist';
    this.inventory = { knife: false, gun: false };
    this.ammo = { gun: 6 };
    this.enemies = [];
    this.pickups = [];
    this.cooldown = 0;
    this.swing = 0;
    this.swingKind = 'fist';
    this.dodgeTime = 0;
    this.dodgeDir = new THREE.Vector3();
    this.invuln = 0;
    this.lastDamage = 0;
    this.downTimer = 0;
    this.downed = false;
    this.kills = 0;
    this.spawnPoint = new THREE.Vector3();
    this.forward = new THREE.Vector3(0, 0, 1);
    this.body = body || null;
  }

  setSpawn(v) { this.spawnPoint.copy(v); }

  bodyNode() {
    if (this.body) return this.body;
    return this.player.children.find((c) => c !== this.weaponMesh) || null;
  }

  enable() {
    this.enabled = true;
    this.health = this.maxHealth;
    this.downed = false;
    this.downTimer = 0;
  }

  disable() {
    this.enabled = false;
    for (const e of this.enemies) this.scene.remove(e.root);
    this.enemies = [];
    for (const p of this.pickups) this.scene.remove(p.root);
    this.pickups = [];
    this.removeWeapons();
  }

  removeWeapons() {
    if (this.weaponMesh) {
      if (this.weaponMesh && this.weaponMesh.parent) this.weaponMesh.parent.remove(this.weaponMesh);
      this.weaponMesh = null;
    }
  }

  spawnEnemy(spec) {
    const root = new THREE.Group();
    const holder = new THREE.Group();
    root.add(holder);
    const finish = (gltf) => {
      const model = gltf ? gltf.scene : null;
      if (model) {
        model.updateMatrixWorld(true);
        const box = new THREE.Box3().setFromObject(model);
        const c = new THREE.Vector3();
        box.getCenter(c);
        model.position.set(-c.x, -box.min.y, -c.z);
        model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = false; } });
        holder.add(model);
      } else {
        holder.add(capsule(spec.color || 0x241f1b));
      }
    };
    if (spec.file) {
      loader.load(spec.file, (gltf) => finish(gltf), undefined, () => {
        if (spec.fallback) loader.load(spec.fallback, (gltf) => finish(gltf), undefined, () => finish(null));
        else finish(null);
      });
    } else {
      finish(null);
    }
    root.position.set(spec.x || 0, 0, spec.z || 0);
    root.rotation.y = spec.rot || 0;
    this.scene.add(root);
    const enemy = {
      id: spec.id,
      root,
      holder,
      label: spec.label || 'Assassin',
      health: spec.health || 70,
      maxHealth: spec.health || 70,
      damage: spec.damage || 9,
      speed: spec.speed || 2.6,
      aggro: spec.aggro || 13,
      state: 'idle',
      cooldown: 0,
      phase: Math.random() * 6.28,
      lunge: 0,
      dead: false,
      fall: 0
    };
    this.enemies.push(enemy);
    return enemy;
  }

  spawnPickup(spec) {
    const root = new THREE.Group();
    const mesh = spec.kind === 'gun' ? pistolMesh() : knifeMesh();
    mesh.rotation.x = spec.kind === 'gun' ? 0.2 : 1.35;
    mesh.position.y = 0.1;
    root.add(mesh);
    const glow = new THREE.Mesh(
      new THREE.RingGeometry(0.24, 0.34, 24),
      new THREE.MeshBasicMaterial({ color: 0xd9a441, transparent: true, opacity: 0.45, side: THREE.DoubleSide, depthWrite: false })
    );
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.02;
    root.add(glow);
    root.position.set(spec.x || 0, spec.y || 0, spec.z || 0);
    this.scene.add(root);
    const pickup = { kind: spec.kind, root, glow, label: spec.label || (spec.kind === 'gun' ? 'a pistol' : 'a knife') };
    this.pickups.push(pickup);
    return pickup;
  }

  equip(kind) {
    if (kind === 'knife' && !this.inventory.knife) return;
    if (kind === 'gun' && !this.inventory.gun) return;
    this.weapon = kind;
    this.removeWeapons();
    const mesh = kind === 'gun' ? pistolMesh() : kind === 'knife' ? knifeMesh() : null;
    if (mesh) {
      mesh.position.set(0.34, 1.02, 0.26);
      mesh.rotation.set(-0.4, 0, 0.2);
      (this.bodyNode() || this.player).add(mesh);
      this.weaponMesh = mesh;
    }
    this.onEvent({ type: 'weapon', weapon: kind, label: WEAPONS[kind].label });
  }

  pickUp(pickup) {
    if (pickup.kind === 'gun') {
      this.inventory.gun = true;
      this.ammo.gun += 4;
      this.equip('gun');
    } else if (pickup.kind === 'knife') {
      this.inventory.knife = true;
      this.equip('knife');
    }
    this.scene.remove(pickup.root);
    this.pickups = this.pickups.filter((p) => p !== pickup);
    this.onEvent({ type: 'pickup', kind: pickup.kind });
  }

  damagePlayer(amount, from) {
    if (this.downed || this.invuln > 0) return;
    this.health = Math.max(0, this.health - amount);
    this.lastDamage = 0;
    this.onEvent({ type: 'hurt', amount, health: this.health });
    if (from) {
      const dir = new THREE.Vector3().subVectors(this.player.position, from).setY(0).normalize();
      this.player.position.addScaledVector(dir, 0.22);
    }
    if (this.health <= 0) {
      this.downed = true;
      this.downTimer = 3.2;
      this.onEvent({ type: 'downed' });
    }
  }

  bloodAt(position, amount = 1) {
    if (!this.scene) return;
    const count = Math.min(18, 6 + Math.floor(amount));
    const geo = new THREE.SphereGeometry(0.035, 6, 5);
    const mat = new THREE.MeshBasicMaterial({ color: 0x7d0f14, transparent: true, opacity: 0.95 });
    for (let i = 0; i < count; i += 1) {
      const drop = new THREE.Mesh(geo, mat);
      drop.position.copy(position);
      drop.position.x += (Math.random() - 0.5) * 0.35;
      drop.position.y += 0.9 + Math.random() * 0.7;
      drop.position.z += (Math.random() - 0.5) * 0.35;
      drop.userData.vel = new THREE.Vector3((Math.random() - 0.5) * 2.4, Math.random() * 2.2 + 0.6, (Math.random() - 0.5) * 2.4);
      drop.userData.life = 1.1 + Math.random() * 0.5;
      this.scene.add(drop);
      if (!this.blood) this.blood = [];
      this.blood.push(drop);
    }
  }

  _updateBlood(dt) {
    if (!this.blood || !this.blood.length) return;
    for (let i = this.blood.length - 1; i >= 0; i -= 1) {
      const d = this.blood[i];
      d.userData.life -= dt;
      d.userData.vel.y -= 9.4 * dt;
      d.position.addScaledVector(d.userData.vel, dt);
      if (d.position.y < 0.02) { d.position.y = 0.02; d.userData.vel.multiplyScalar(0.2); d.userData.vel.y = 0; }
      d.scale.setScalar(Math.max(0.2, d.userData.life));
      if (d.userData.life <= 0) {
        this.scene.remove(d);
        d.geometry.dispose();
        d.material.dispose();
        this.blood.splice(i, 1);
      }
    }
  }

  damageEnemy(enemy, amount, kind = 'fist') {
    enemy.health -= amount;
    enemy.lunge = 0.18;
    if (kind === 'knife' || kind === 'gun') {
      this.bloodAt(enemy.root.position, kind === 'gun' ? 10 : 14);
    }
    this.onEvent({ type: 'hit', enemy: enemy.label, amount, health: Math.max(0, enemy.health) });
    if (enemy.health <= 0 && !enemy.dead) {
      enemy.dead = true;
      enemy.state = 'dead';
      this.kills++;
      this.onEvent({ type: 'kill', enemy: enemy.label, kills: this.kills, id: enemy.id });
    }
  }

  _tryAttack(kind) {
    if (kind === 'fist' && this.bodyMode === 'slam') kind = 'slam';
    const spec = WEAPONS[kind] || WEAPONS.fist;
    if (!spec) return;
    if (this.cooldown > 0) return;
    if (kind === 'gun' && this.ammo.gun <= 0) {
      this.onEvent({ type: 'empty' });
      this.cooldown = 0.5;
      return;
    }
    this.cooldown = spec.cooldown;
    this.swing = 0.32;
    this.swingKind = kind;
    if (kind === 'gun') this.ammo.gun--;
    const origin = this.player.position;
    const facing = this.forward;
    let hitAny = false;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const to = new THREE.Vector3().subVectors(e.root.position, origin).setY(0);
      const dist = to.length();
      if (dist > spec.range) continue;
      if (to.normalize().dot(facing) < -0.25) continue;
      this.damageEnemy(e, spec.damage, kind);
      hitAny = true;
      e.root.position.addScaledVector(to.normalize(), kind === 'fist' && this.bodyMode === 'slam' ? 0.55 : 0.18);
      break;
    }
    this.onEvent({ type: 'swing', kind: kind === 'slam' ? 'fist' : kind, hit: hitAny, slam: kind === 'slam' });
  }

  _tryDodge() {
    if (this.cooldown > 0 || this.dodgeTime > 0) return;
    this.dodgeTime = 0.42;
    this.invuln = 0.42;
    this.cooldown = 0.6;
    const axis = this.input.axis();
    const yaw = this.player.rotation.y;
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(-forward.z, 0, forward.x);
    const dir = new THREE.Vector3()
      .addScaledVector(forward, axis.y)
      .addScaledVector(right, axis.x);
    if (dir.lengthSq() < 0.02) dir.copy(forward).multiplyScalar(-1);
    this.dodgeDir.copy(dir.normalize());
    this.onEvent({ type: 'dodge' });
  }

  setBodyMode(mode) {
    this.bodyMode = mode;
  }

  update(dt) {
    this._updateBlood(dt);
    if (!this.enabled) return;
    this.cooldown = Math.max(0, this.cooldown - dt);
    this.swing = Math.max(0, this.swing - dt);
    this.invuln = Math.max(0, this.invuln - dt);
    this.lastDamage += dt;

    const p = this.player.position;
    this.forward.set(Math.sin(this.player.rotation.y), 0, Math.cos(this.player.rotation.y));

    if (this.downed) {
      this.downTimer -= dt;
      if (this.downTimer <= 0) {
        this.downed = false;
        this.health = this.maxHealth;
        this.player.position.copy(this.spawnPoint);
        this.onEvent({ type: 'revived' });
      }
      return;
    }

    if (this.dodgeTime > 0) {
      this.dodgeTime -= dt;
      this.player.position.addScaledVector(this.dodgeDir, 7.4 * dt);
    }

    if (this.lastDamage > 6 && this.health < this.maxHealth) {
      this.health = Math.min(this.maxHealth, this.health + dt * 4);
    }

    // input
    if (this.input.pressed('KeyJ') || this.input.mouseAttack) this._tryAttack('fist');
    if (this.input.pressed('KeyK')) this._tryAttack('kick');
    if (this.input.pressed('KeyL') || this.input.pressed('Space')) this._tryDodge();
    if (this.input.pressed('Digit1') && this.inventory.knife) this.equip('knife');
    if (this.input.pressed('Digit2') && this.inventory.gun) this.equip('gun');
    if (this.input.pressed('Digit3')) this.equip('fist');

    // pickups
    for (const pickup of this.pickups) {
      const d = Math.hypot(p.x - pickup.root.position.x, p.z - pickup.root.position.z);
      pickup.glow.material.opacity = 0.28 + Math.sin(performance.now() * 0.003) * 0.14;
      if (d < 2.0) {
        this.ui.hint(`E — take ${pickup.label}`);
        if (this.input.pressed('KeyE')) this.pickUp(pickup);
      }
    }

    // enemies
    for (const e of this.enemies) {
      if (e.dead) {
        if (e.fall < 1) {
          e.fall = Math.min(1, e.fall + dt * 2.4);
          e.holder.rotation.x = -e.fall * Math.PI * 0.48;
          e.root.position.y = -e.fall * 0.06;
          e.holder.traverse((o) => { if (o.isMesh && o.material) { o.material.transparent = true; o.material.opacity = Math.max(0, 1 - e.fall * 0.85); } });
        }
        continue;
      }
      const to = new THREE.Vector3().subVectors(p, e.root.position).setY(0);
      const dist = to.length();
      e.cooldown = Math.max(0, e.cooldown - dt);
      e.lunge = Math.max(0, e.lunge - dt);
      if (e.state === 'idle') {
        if (dist < e.aggro) e.state = 'chase';
        else e.holder.rotation.y = Math.sin(e.phase + performance.now() * 0.0004) * 0.2;
      }
      if (e.state === 'chase') {
        if (dist > 1.35) {
          const dir = to.clone().normalize();
          e.root.position.addScaledVector(dir, e.speed * dt);
          const want = Math.atan2(dir.x, dir.z);
          let diff = want - e.root.rotation.y;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          e.root.rotation.y += diff * Math.min(1, dt * 6);
          e.holder.position.y = Math.abs(Math.sin(performance.now() * 0.006 + e.phase)) * 0.045;
        } else {
          e.state = 'attack';
          e.cooldown = 0.35;
        }
      }
      if (e.state === 'attack') {
        if (e.cooldown <= 0) {
          if (dist < 2.2) {
            this.damagePlayer(e.damage, e.root.position);
            this.onEvent({ type: 'enemy-hit', enemy: e.label });
          }
          e.cooldown = 1.15;
          e.lunge = 0.25;
        }
        if (dist > 3.4) e.state = 'chase';
      }
      if (e.lunge > 0) {
        e.holder.position.z = 0.12 * (e.lunge / 0.25);
      } else {
        e.holder.position.z *= 0.85;
      }
    }

    // swing feedback on the player model
    if (this.swing > 0) {
      const k = this.swing / 0.32;
      const child = this.bodyNode();
      if (child && child.rotation) {
        child.rotation.x = -Math.sin(k * Math.PI) * 0.42;
        child.rotation.y = Math.sin(k * Math.PI) * 0.22;
      }
      if (this.weaponMesh) {
        this.weaponMesh.rotation.x = -0.4 - Math.sin(k * Math.PI) * 1.1;
      }
    } else {
      const child = this.bodyNode();
      if (child && child.rotation) child.rotation.set(0, 0, 0);
    }
  }
}
