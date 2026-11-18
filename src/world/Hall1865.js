import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { theatreWoodMaterial, theatrePlasterMaterial, theatreVelvetMaterial, carpetMaterial, goldMaterial, clothMaterial, metalMaterial, contactShadowMaterial, tileObjectUVs } from './Materials.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { Crowd, theatreAudienceSeats, theatreStandingCrowd, stageActors } from './Crowd.js';
import { Cast, theatreCast } from './Cast.js';

export function buildHall1865(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const wood = theatreWoodMaterial();
  const velvet = theatreVelvetMaterial(0x8a3038);
  const plaster = theatrePlasterMaterial();
  const wool = carpetMaterial(0x634c3a);
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


  // painted stage backdrop: a Lux3D generated 1860s scenic drop
  const dropTex = new THREE.TextureLoader().load('./assets/textures/scenery/theatre_drop_wide.png');
  dropTex.colorSpace = THREE.SRGBColorSpace;
  dropTex.anisotropy = 8;
  const drop = new THREE.Mesh(
    new THREE.PlaneGeometry(19.0, 10.4),
    new THREE.MeshStandardMaterial({
      map: dropTex, roughness: 0.95, metalness: 0.0, color: 0xb9ad9c
    })
  );
  drop.position.set(0, 6.1, -D / 2 + 0.42);
  drop.receiveShadow = true;
  drop.userData.noTileUV = true;
  group.add(drop);

  // heavy velvet drapes at the stage opening, with folded geometry
  const curtainMat = theatreVelvetMaterial(0x6b1a22);
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
  const crowdInstances = [];
  const audience = new Crowd(theatreAudienceSeats(), { name: 'audience' });
  const house = new Crowd(theatreStandingCrowd(D), { name: 'house' });
  group.add(audience.group, house.group);
  crowdInstances.push(audience, house);

  // real cast members (Lux3D generated) take the stage and the aisles
  const cast = new Cast(group);
  cast.loadAll(theatreCast());

  const aisle = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.03, D - 4), wool);
  aisle.position.set(0, 0.02, 1);
  aisle.receiveShadow = true;
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

    const key = new THREE.SpotLight(0xffe3bd, 182, 9, 0.6, 0.55, 1.6);
    key.position.set(W / 2 - 3.0, 9.4, -D / 2 + 7.2);
    key.target = bustPivot;
    scene.add(key);
    scene.add(key.target);
    const rim = new THREE.PointLight(0x7fa6cc, 47, 6, 1.9);
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
    const gl = new THREE.PointLight(0xffb066, 26, 7.0, 2.0);
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
  addLight(new THREE.Vector3(0, 9.2, 2), 234, 0xffc98a, 22);
  addLight(new THREE.Vector3(-11, 3.4, -6), 52, 0xffb56a, 13);
  addLight(new THREE.Vector3(11, 3.4, -6), 52, 0xffb56a, 13);
  addLight(new THREE.Vector3(W / 2 - 3.4, 6.4, -D / 2 + 8), 91, 0xffc27a, 12);
  addLight(new THREE.Vector3(0,  6.5, -D / 2 + 6), 182, 0xffcf96, 18);
  addLight(new THREE.Vector3(0, 4.2, 12), 68, 0x6f95a8, 26);

  const stageKey = new THREE.SpotLight(0xffe0b4, 676, 46, 0.60, 0.80, 1.6);
  stageKey.position.set(0, 11.5, -2.0);
  stageKey.target.position.set(0, 1.6, -15.0);
  stageKey.castShadow = true;
  stageKey.shadow.mapSize.set(1024, 1024);
  stageKey.shadow.camera.near = 2;
  stageKey.shadow.camera.far = 46;
  stageKey.shadow.bias = -0.0014;
  stageKey.shadow.normalBias = 0.03;
  group.add(stageKey, stageKey.target);

  const stageRim = new THREE.SpotLight(0x86a8d6, 312, 40, 0.95, 0.85, 1.7);
  stageRim.position.set(-15.0, 9.0, -16.6);
  stageRim.target.position.set(0, 3.4, -12.6);
  group.add(stageRim, stageRim.target);

  const houseFill = new THREE.PointLight(0x39606b, 42, 42, 1.8);
  houseFill.position.set(0, 7.6, 10.0);
  group.add(houseFill);

  // footlights along the stage lip
  const footMat = new THREE.MeshBasicMaterial({ color: 0xffd9a0 });
  const footGeo = new THREE.SphereGeometry(0.06, 8, 6);
  for (let i = 0; i < 16; i++) {
    const x = -W / 2 + 6 + i * ((W - 12) / 15);
    const f = new THREE.Mesh(footGeo, footMat);
    f.position.set(x, 1.02, -D / 2 + 6.9);
    group.add(f);
  }
  addLight(new THREE.Vector3(0, 1.2, -D / 2 + 7.4), 130, 0xffc27a, 11);


  // theatre playbills on the side walls
  const playbillTex = new THREE.TextureLoader().load('./assets/textures/scenery/playbill.png');
  playbillTex.colorSpace = THREE.SRGBColorSpace;
  const playbillMat = new THREE.MeshStandardMaterial({ map: playbillTex, roughness: 0.95 });
  for (const side of [-1, 1]) {
    const bill = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.0), playbillMat);
    bill.position.set(side * (W / 2 - 0.35), 3.1, -2 + side * 3.5);
    bill.rotation.y = side > 0 ? -Math.PI / 2 : Math.PI / 2;
    group.add(bill);
  }

  // stage dressing: parlour table, chairs, candlesticks, rug
  const stageY = 1.0;
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(7.4, 4.6), velvet);
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.4, stageY + 0.012, -14.6);
  rug.receiveShadow = true;
  group.add(rug);

  const tableTop = new THREE.Mesh(new RoundedBoxGeometry(2.6, 0.09, 1.0, 2, 0.03), wood);
  tableTop.position.set(0.4, stageY + 0.78, -14.6);
  tableTop.castShadow = true;
  group.add(tableTop);
  for (const dx of [-1.1, 1.1]) {
    for (const dz of [-0.34, 0.34]) {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.06, 0.74, 8), wood);
      leg.position.set(0.4 + dx, stageY + 0.37, -14.6 + dz);
      leg.castShadow = true;
      group.add(leg);
    }
  }
  const chairProto = new THREE.Group();
  const chairSeat = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.07, 0.44, 2, 0.02), wood);
  chairSeat.position.y = 0.46;
  const chairBack = new THREE.Mesh(new RoundedBoxGeometry(0.46, 0.62, 0.06, 2, 0.02), wood);
  chairBack.position.set(0, 0.8, -0.2);
  const chairLegs = [];
  for (const dx of [-0.18, 0.18]) {
    for (const dz of [-0.17, 0.17]) {
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.035, 0.44, 6), wood);
      l.position.set(dx, 0.22, dz);
      chairLegs.push(l);
    }
  }
  chairProto.add(chairSeat, chairBack, ...chairLegs);
  chairProto.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  for (const [cx, cz, cr] of [[-1.5, -14.2, 0.5], [2.4, -14.9, -0.6], [-0.9, -13.1, 2.4]]) {
    const ch = chairProto.clone(true);
    ch.position.set(cx, stageY, cz);
    ch.rotation.y = cr;
    group.add(ch);
  }
  const candleStickMat = gold;
  for (const [cx, cz] of [[-0.7, -14.5], [0.2, -14.4], [1.1, -14.6]]) {
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.34, 8), candleStickMat);
    stick.position.set(cx, stageY + 0.99, cz);
    const candle = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.26, 8), new THREE.MeshStandardMaterial({ color: 0xe8dcc0, roughness: 0.7, emissive: 0xffb45c, emissiveIntensity: 1.1 }));
    candle.position.set(cx, stageY + 1.28, cz);
    const flame = new THREE.Mesh(new THREE.SphereGeometry(0.045, 7, 5), new THREE.MeshBasicMaterial({ color: 0xffdda6 }));
    flame.scale.set(0.7, 1.7, 0.7);
    flame.position.set(cx, stageY + 1.46, cz);
    group.add(stick, candle, flame);
    const gl = new THREE.PointLight(0xffb066, 14, 4.2, 2.0);
    gl.position.set(cx, stageY + 1.5, cz);
    group.add(gl);
    lights.push(gl);
  }

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
  const update = (dt, t) => {
    for (const c of crowdInstances) c.update(dt, t);
    cast.update(dt, t);
    for (let i = 0; i < lights.length; i++) {
      const l = lights[i];
      if (!l.userData.baseIntensity) l.userData.baseIntensity = l.intensity;
      l.intensity = l.userData.baseIntensity * (0.93 + 0.07 * Math.sin(t * (2.1 + i * 0.31) + i));
    }
  };
  return { group, props, npcPositions, spawn, lights, hall: { W, D, H }, crowds: crowdInstances, cast, update };
}
