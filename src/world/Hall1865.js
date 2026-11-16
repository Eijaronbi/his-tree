import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { theatreWoodMaterial, theatrePlasterMaterial, theatreVelvetMaterial, carpetMaterial, goldMaterial, clothMaterial, metalMaterial, contactShadowMaterial, tileObjectUVs } from './Materials.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';

export function buildHall1865(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const wood = theatreWoodMaterial();
  const velvet = theatreVelvetMaterial(0xffffff);
  const plaster = theatrePlasterMaterial();
  const wool = carpetMaterial(0x8a6a52);
  const cloth = clothMaterial(0x8f2f28, false);
  const gold = goldMaterial();

  const W = 52, D = 36, H = 13;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), wood);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), plaster);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  group.add(ceil);

  const wallN = new THREE.Mesh(new THREE.BoxGeometry(W, H, 0.4), plaster);
  wallN.position.set(0, H / 2, -D / 2);
  const wallS = wallN.clone(); wallS.position.z = D / 2;
  const wallW = new THREE.Mesh(new THREE.BoxGeometry(0.4, H, D), plaster);
  wallW.position.set(-W / 2, H / 2, 0);
  const wallE = wallW.clone(); wallE.position.x = W / 2;
  [wallN, wallS, wallW, wallE].forEach((w) => { w.receiveShadow = true; w.castShadow = true; group.add(w); });

  // stage
  const stage = new THREE.Mesh(new THREE.BoxGeometry(W - 4, 1.0, 7), wood);
  stage.position.set(0, 0.5, -D / 2 + 4.5);
  stage.receiveShadow = true;
  group.add(stage);

  const backdropTex = (() => {
    const cv = document.createElement('canvas');
    cv.width = 1024; cv.height = 512;
    const g = cv.getContext('2d');
    const sky = g.createLinearGradient(0, 0, 0, 512);
    sky.addColorStop(0, '#24324d');
    sky.addColorStop(0.5, '#8d6e52');
    sky.addColorStop(1, '#2a2017');
    g.fillStyle = sky; g.fillRect(0, 0, 1024, 512);
    g.fillStyle = 'rgba(60,52,38,0.85)';
    g.beginPath(); g.moveTo(0, 380);
    for (let x = 0; x <= 1024; x += 32) g.lineTo(x, 350 + Math.sin(x * 0.006) * 40 + Math.sin(x * 0.017) * 14);
    g.lineTo(1024, 512); g.lineTo(0, 512); g.closePath(); g.fill();
    g.fillStyle = 'rgba(32,27,20,0.9)';
    g.fillRect(360, 300, 120, 90);
    g.beginPath(); g.moveTo(340, 300); g.lineTo(420, 240); g.lineTo(500, 300); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,214,150,0.55)';
    g.fillRect(400, 330, 18, 22);
    for (let i = 0; i < 180; i++) {
      g.fillStyle = `rgba(0,0,0,${0.03 + Math.random() * 0.05})`;
      g.fillRect(Math.random() * 1024, Math.random() * 512, 2, 2);
    }
    const t = new THREE.CanvasTexture(cv);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  })();
  const backdrop = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 6, 6.5),
    new THREE.MeshStandardMaterial({ map: backdropTex, roughness: 1, metalness: 0 })
  );
  backdrop.position.set(0, 4.4, -D / 2 + 1.1);
  backdrop.userData.noTileUV = true;
  group.add(backdrop);

  // heavy velvet drapes at the stage opening, with folded geometry
  const curtainMat = theatreVelvetMaterial(0x8a2028);
  const makeCurtain = (w, h, folds, amp) => {
    const g = new THREE.PlaneGeometry(w, h, 64, 10);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const u = (pos.getX(i) / w + 0.5) * folds * Math.PI * 2;
      const v = pos.getY(i) / h + 0.5;
      pos.setZ(i, Math.sin(u) * amp + Math.sin(u * 0.5) * amp * 0.55 - v * 0.12);
    }
    g.computeVertexNormals();
    const m = new THREE.Mesh(g, curtainMat);
    m.userData.noTileUV = true;
    return m;
  };
  const drapeL = makeCurtain(5.6, 10.2, 5, 0.16);
  drapeL.position.set(-W / 2 + 4.0, 5.9, -D / 2 + 3.7);
  drapeL.rotation.y = 0.22;
  const drapeR = makeCurtain(5.6, 10.2, 5, 0.16);
  drapeR.position.set(W / 2 - 4.0, 5.9, -D / 2 + 3.7);
  drapeR.rotation.y = -0.22;
  const valance = makeCurtain(W - 9, 1.5, 11, 0.12);
  valance.position.set(0, 9.55, -D / 2 + 3.5);
  group.add(drapeL, drapeR, valance);

  // proscenium pilasters
  for (const sx of [-1, 1]) {
    const pil = new THREE.Mesh(new THREE.BoxGeometry(1.0, 8.8, 1.0), plaster);
    pil.position.set(sx * (W / 2 - 2.4), 4.7, -D / 2 + 4.3);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.32, 1.35), gold);
    cap.position.set(sx * (W / 2 - 2.4), 9.2, -D / 2 + 4.3);
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.4, 1.3), gold);
    base.position.set(sx * (W / 2 - 2.4), 0.2, -D / 2 + 4.3);
    group.add(pil, cap, base);
  }

  const proscArch = new THREE.Mesh(new THREE.BoxGeometry(W - 4, 0.9, 1.2), gold);
  proscArch.position.set(0, 7.7, -D / 2 + 4.6);
  group.add(proscArch);

  // bunting across the hall
  const bunt = [];
  for (let i = 0; i < 46; i++) {
    const strip = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 1.6), i % 2 ? cloth : clothMaterial(0xe8e2d0, false));
    strip.position.set(-W / 2 + 1 + i * ((W - 2) / 45), 10.4 - Math.sin((i / 45) * Math.PI) * 1.5, -2);
    strip.rotation.x = Math.PI / 2.2;
    group.add(strip);
    bunt.push(strip);
  }

  // seats: rounded cushions, curved backs, wooden frames (instanced)
  const COLS = 20, ROWS = 9;
  const cushionGeo = new RoundedBoxGeometry(0.66, 0.16, 0.6, 3, 0.05);
  const backGeo = new RoundedBoxGeometry(0.66, 0.72, 0.14, 3, 0.06);
  const baseGeo = new RoundedBoxGeometry(0.66, 0.42, 0.58, 2, 0.04);
  const armGeo = new RoundedBoxGeometry(0.07, 0.2, 0.58, 2, 0.03);
  const seatCount = COLS * ROWS;
  const cushions = new THREE.InstancedMesh(cushionGeo, velvet, seatCount);
  const backs = new THREE.InstancedMesh(backGeo, velvet, seatCount);
  const bases = new THREE.InstancedMesh(baseGeo, wood, seatCount);
  const arms = new THREE.InstancedMesh(armGeo, wood, seatCount * 2);
  const dummy = new THREE.Object3D();
  let si = 0, ai = 0;
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const x = -12 + c * 1.42;
      const z = -8 + r * 1.5;
      dummy.rotation.set(0, 0, 0);
      dummy.position.set(x, 0.62, z + 0.03);
      dummy.updateMatrix(); cushions.setMatrixAt(si, dummy.matrix);
      dummy.position.set(x, 0.28, z + 0.03);
      dummy.updateMatrix(); bases.setMatrixAt(si, dummy.matrix);
      dummy.position.set(x, 0.98, z + 0.31);
      dummy.rotation.x = -0.12;
      dummy.updateMatrix(); backs.setMatrixAt(si, dummy.matrix);
      dummy.rotation.x = 0;
      for (const sx of [-1, 1]) {
        dummy.position.set(x + sx * 0.355, 0.72, z + 0.05);
        dummy.updateMatrix(); arms.setMatrixAt(ai++, dummy.matrix);
      }
      si++;
    }
  }
  for (const m of [cushions, backs, bases, arms]) {
    m.castShadow = true; m.receiveShadow = true;
    m.instanceMatrix.needsUpdate = true;
    group.add(m);
  }
  const crowdMats = [0x241f1b, 0x2e2721, 0x1e1b18].map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.94, metalness: 0 }));
  const skinMat = new THREE.MeshStandardMaterial({ color: 0x9a7b62, roughness: 0.72 });
  const torsoGeo = new RoundedBoxGeometry(0.48, 0.6, 0.34, 2, 0.09);
  const shoulderGeo = new RoundedBoxGeometry(0.6, 0.16, 0.36, 2, 0.07);
  const headGeo = new THREE.SphereGeometry(0.115, 10, 8);
  const hatGeo = new THREE.CylinderGeometry(0.1, 0.13, 0.12, 10);
  let seatIndex = 0;
  for (let r = 0; r < 9; r++) {
    for (let c = 0; c < 20; c++) {
      const x = -12 + c * 1.42;
      if (Math.abs(x) < 1.6) continue;
      seatIndex++;
      if (seatIndex % 7 === 0) continue;
      const z = -8 + r * 1.5;
      const mat = crowdMats[seatIndex % crowdMats.length];
      const t = new THREE.Mesh(torsoGeo, mat);
      t.position.set(x, 1.0, z + 0.06); t.rotation.x = -0.06; t.castShadow = true;
      const sh = new THREE.Mesh(shoulderGeo, mat);
      sh.position.set(x, 1.27, z + 0.04);
      const h = new THREE.Mesh(headGeo, skinMat);
      h.position.set(x, 1.43, z + 0.03);
      group.add(t, sh, h);
      if (seatIndex % 3 === 0) {
        const hat = new THREE.Mesh(hatGeo, mat);
        hat.position.set(x, 1.53, z + 0.02);
        group.add(hat);
      }
    }
  }
  const standGeo = new RoundedBoxGeometry(0.5, 1.15, 0.34, 2, 0.08);
  for (let i = 0; i < 12; i++) {
    const x = -18 + i * 3.3;
    if (Math.abs(x) < 2) continue;
    const mat = crowdMats[i % crowdMats.length];
    const b = new THREE.Mesh(standGeo, mat);
    b.position.set(x, 0.95, D / 2 - 2.4); b.castShadow = true;
    const h = new THREE.Mesh(headGeo, skinMat);
    h.position.set(x, 1.66, D / 2 - 2.4);
    group.add(b, h);
  }

  const aisle = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, D - 4), wool);
  aisle.rotation.x = -Math.PI / 2;
  aisle.position.set(0, 0.02, 1);
  group.add(aisle);

  // presidential box (right side, elevated)
  const boxFloor = new THREE.Mesh(new THREE.BoxGeometry(7, 0.35, 5.2), wood);
  boxFloor.position.set(W / 2 - 3.4, 5.1, -D / 2 + 9);
  group.add(boxFloor);
  const boxFront = new THREE.Mesh(new THREE.BoxGeometry(7, 1.2, 0.25), velvet);
  boxFront.position.set(W / 2 - 3.4, 5.8, -D / 2 + 6.5);
  group.add(boxFront);
  for (const s of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.BoxGeometry(0.25, 1.2, 5.2), velvet);
    side.position.set(W / 2 - 3.4 + s * 3.4, 5.8, -D / 2 + 9);
    group.add(side);
  }
  const chair = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.6, 1.1), velvet);
  chair.position.set(W / 2 - 3.2, 6.1, -D / 2 + 8.4);
  chair.visible = false;
  group.add(chair);

  // Color bust of Lincoln (Lux3D, from the photoreal colorised 1863 plate)
  const bustPivot = new THREE.Group();
  bustPivot.position.set(W / 2 - 3.0, 5.3, -D / 2 + 8.55);
  bustPivot.rotation.y = 2.35;
  group.add(bustPivot);
  new GLTFLoader().load('./assets/models/characters/lincoln_bust.glb', (gltf) => {
    const bust = gltf.scene;
    const box = new THREE.Box3().setFromObject(bust);
    const size = new THREE.Vector3(); box.getSize(size);
    const s = 0.62 / size.y;
    bust.scale.setScalar(s);
    box.setFromObject(bust);
    const c = new THREE.Vector3(); box.getCenter(c);
    bust.position.sub(c);
    bust.position.y += (size.y * s) / 2 - 0.06;
    bust.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    bustPivot.add(bust);

    const key = new THREE.SpotLight(0xffe3bd, 90, 9, 0.6, 0.55, 1.6);
    key.position.set(W / 2 - 3.0, 9.4, -D / 2 + 7.2);
    key.target = bustPivot;
    scene.add(key);
    scene.add(key.target);
    const rim = new THREE.PointLight(0xffb070, 26, 6, 1.8);
    rim.position.set(W / 2 - 5.0, 7.0, -D / 2 + 10.6);
    scene.add(rim);
  }, undefined, (e) => console.warn('bust load failed', e));

  const lights = [];
  const sconce = new THREE.Group();
  for (let i = 0; i < 10; i++) {
    const x = -W / 2 + 3 + i * ((W - 6) / 9);
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.5, 2.4, 0.35), plaster);
    wall.position.set(x, 3.4, -D / 2 + 0.5);
    group.add(wall);
    const bowl = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.07, 0.24, 10), gold);
    bowl.position.set(x, 4.7, -D / 2 + 0.72);
    group.add(bowl);
    const flame = new THREE.Mesh(
      new THREE.SphereGeometry(0.09, 8, 6),
      new THREE.MeshBasicMaterial({ color: 0xffd08a })
    );
    flame.scale.set(0.7, 1.5, 0.7);
    flame.position.set(x, 4.9, -D / 2 + 0.72);
    group.add(flame);
    const gl = new THREE.PointLight(0xffb066, 26, 13, 1.6);
    gl.position.set(x, 4.9, -D / 2 + 1.1);
    group.add(gl);
    lights.push(gl);
  }

  // chandelier
  const chand = new THREE.Group();
  const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 3.6, 10), gold);
  stem.position.y = 1.9;
  chand.add(stem);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.055, 10, 48), gold);
  ring.rotation.x = Math.PI / 2;
  chand.add(ring);
  const innerRing = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 32), gold);
  innerRing.rotation.x = Math.PI / 2;
  innerRing.position.y = 0.16;
  chand.add(innerRing);
  const candleMat = new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7, emissive: 0xffb45c, emissiveIntensity: 0.9 });
  const flameMat = new THREE.MeshBasicMaterial({ color: 0xffdda6 });
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.5, 8), i % 2 ? candleMat : gold);
    candle.position.set(Math.cos(a) * 1.15, 0.22, Math.sin(a) * 1.15);
    chand.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 4), flameMat);
    flame.scale.set(0.7, 1.6, 0.7);
    flame.position.set(candle.position.x, 0.52, candle.position.z);
    chand.add(flame);
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.42, 8), candleMat);
    candle.position.set(Math.cos(a) * 0.62, 0.38, Math.sin(a) * 0.62);
    chand.add(candle);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), flameMat);
    flame.scale.set(0.7, 1.6, 0.7);
    flame.position.set(candle.position.x, 0.64, candle.position.z);
    chand.add(flame);
  }
  chand.position.set(0, 9.2, 2);
  group.add(chand);

  // practical lights
  const addLight = (pos, intensity, color = 0xffb56a, dist = 26) => {
    const l = new THREE.PointLight(color, intensity, dist, 1.6);
    l.position.copy(pos);
    l.castShadow = false;
    group.add(l);
    lights.push(l);
    return l;
  };
  addLight(new THREE.Vector3(0, 9.2, 2), 320, 0xffb56a, 44);
  addLight(new THREE.Vector3(-11, 3.4, -6), 120, 0xffb56a, 26);
  addLight(new THREE.Vector3(11, 3.4, -6), 120, 0xffb56a, 26);
  addLight(new THREE.Vector3(W / 2 - 3.4, 6.4, -D / 2 + 8), 110, 0xffc27a, 18);
  addLight(new THREE.Vector3(0, 6.5, -D / 2 + 6), 200, 0xffcf96, 30);
  addLight(new THREE.Vector3(0, 4.2, 12), 90, 0xffb56a, 26);

  // footlights along the stage lip
  const footMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const footGeo = new THREE.SphereGeometry(0.06, 8, 6);
  for (let i = 0; i < 16; i++) {
    const x = -W / 2 + 6 + i * ((W - 12) / 15);
    const f = new THREE.Mesh(footGeo, footMat);
    f.position.set(x, 1.02, -D / 2 + 6.9);
    group.add(f);
  }
  addLight(new THREE.Vector3(0, 1.2, -D / 2 + 7.4), 70, 0xffc27a, 12);

  // shallow steps up to the stage
  for (let i = 0; i < 2; i++) {
    const step = new THREE.Mesh(new THREE.BoxGeometry(7 - i * 1.4, 0.16, 0.55), wood);
    step.position.set(0, 0.2 + i * 0.2, -D / 2 + 8.1 + i * 0.55);
    step.receiveShadow = true;
    group.add(step);
  }

  // ceiling beams
  for (let i = 0; i < 8; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(W, 0.22, 0.28), wood);
    beam.position.set(0, H - 0.14, -D / 2 + 3 + i * ((D - 6) / 7));
    group.add(beam);
  }

  // wainscot and chair rail
  const wainH = 1.25;
  const wainN = new THREE.Mesh(new THREE.BoxGeometry(W, wainH, 0.12), wood);
  wainN.position.set(0, wainH / 2, -D / 2 + 0.28);
  const wainS = wainN.clone(); wainS.position.z = D / 2 - 0.28;
  const wainW = new THREE.Mesh(new THREE.BoxGeometry(0.12, wainH, D), wood);
  wainW.position.set(-W / 2 + 0.28, wainH / 2, 0);
  const wainE = wainW.clone(); wainE.position.x = W / 2 - 0.28;
  const railN = new THREE.Mesh(new THREE.BoxGeometry(W, 0.09, 0.16), gold);
  railN.position.set(0, wainH + 0.03, -D / 2 + 0.28);
  const railS = railN.clone(); railS.position.z = D / 2 - 0.28;
  const railW = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.09, D), gold);
  railW.position.set(-W / 2 + 0.28, wainH + 0.03, 0);
  const railE = railW.clone(); railE.position.x = W / 2 - 0.28;
  group.add(wainN, wainS, wainW, wainE, railN, railS, railW, railE);

  // west balcony
  const balc = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.22, D - 9), wood);
  balc.position.set(-W / 2 + 1.5, 5.4, 0);
  const balcRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, D - 9), gold);
  balcRail.position.set(-W / 2 + 0.4, 5.86, 0);
  group.add(balc, balcRail);
  for (let i = 0; i < 7; i++) {
    const post = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.7, 0.08), gold);
    post.position.set(-W / 2 + 0.4, 5.86, -D / 2 + 4 + i * ((D - 8) / 6));
    group.add(post);
  }

  // real prop geometry that matches the interactables
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(2.6, 4.2, 0.3), wood);
  doorFrame.position.set(-14, 2.1, -D / 2 + 0.6);
  group.add(doorFrame);
  const doorLeaf = new THREE.Mesh(new THREE.BoxGeometry(2.2, 4.0, 0.12), wood);
  doorLeaf.position.set(-14, 2.0, -D / 2 + 0.95);
  doorLeaf.rotation.y = 0.18;
  group.add(doorLeaf);

  const barCounter = new THREE.Mesh(new THREE.BoxGeometry(5.2, 1.1, 0.9), wood);
  barCounter.position.set(9, 0.55, 13);
  group.add(barCounter);
  const bottles = new THREE.MeshStandardMaterial({ color: 0x3a2a18, roughness: 0.25, metalness: 0.1 });
  for (let i = 0; i < 9; i++) {
    const b = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.32, 8), bottles);
    b.position.set(7.2 + i * 0.45, 1.26, 13);
    group.add(b);
  }

  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.2), new THREE.MeshStandardMaterial({ color: 0xd8c9a4, roughness: 0.9 }));
  poster.position.set(-6, 2.6, D / 2 - 0.35);
  poster.rotation.y = Math.PI;
  group.add(poster);

  const spur = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 12), metalMaterial(0xb08d4a));
  spur.rotation.x = Math.PI / 2;
  spur.position.set(-11, 0.03, -1);
  group.add(spur);

  // dust / atmosphere volume hint
  const dust = new THREE.Mesh(
    new THREE.PlaneGeometry(W - 4, 8),
    new THREE.MeshBasicMaterial({ color: 0xffd9a0, transparent: true, opacity: 0.03, depthWrite: false })
  );
  dust.position.set(0, 5, -D / 2 + 8);
  group.add(dust);

  const blob = (w, d, x, z, op = 0.8) => {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, d), contactShadowMaterial());
    b.rotation.x = -Math.PI / 2;
    b.position.set(x, 0.015, z);
    b.userData.noTileUV = true;
    group.add(b);
  };
  blob(9, 8, 0, -D / 2 + 4.5, 0.9);
  blob(12, 12, 0, 1, 0.5);

  tileObjectUVs(group, 2.0);

  const props = {
    playbill: { position: new THREE.Vector3(-6, 1.4, 12), label: 'A playbill', desc: '“Our American Cousin”, a comedy in three acts. This evening. The President is expected.' },
    door: { position: new THREE.Vector3(-14, 2.0, 2), label: 'The corridor door', desc: 'The door opens inward and does not lock from the outside. A chair has been placed behind it, then moved aside.' },
    box: { position: new THREE.Vector3(12, 5.4, -5), label: 'The state box', desc: 'Two flags, a rocking chair, four seats. The Grants were expected. Two of the seats are empty.' },
    bar: { position: new THREE.Vector3(9, 1.2, 13), label: 'The saloon bar', desc: 'Whisky, water, and a barman who remembers an actor drinking alone at six.' },
    spur: { position: new THREE.Vector3(-11, 0.1, -1), label: 'Something on the floor', desc: 'A boot spur, still buckled. The leather is new.' }
  };

  const npcPositions = {
    parker: { x: 4, z: 10, rotation: Math.PI },
    grant: { x: -10, z: 6, rotation: 0.6 },
    booth: { x: -12.5, z: -1.5, rotation: 1.9 }
  };

  const spawn = new THREE.Vector3(0, 0, 9);
  return { group, props, npcPositions, spawn, lights, hall: { W, D, H }, update: () => {} };
}
