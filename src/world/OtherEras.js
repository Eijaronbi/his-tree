import * as THREE from 'three';
import { makeGltfLoader } from '../core/GLTF.js';
import { woodMaterial, clothMaterial, plasterMaterial, contactShadowMaterial, metalMaterial, tileObjectUVs, sandMaterial } from './Materials.js';

const propLoader = makeGltfLoader();

function loadRealProp(file, parent, { x = 0, y = 0, z = 0, rot = 0, scale = 1, height = null }) {
  propLoader.load(file, (gltf) => {
    const root = gltf.scene;
    root.traverse((o) => {
      if (o.isMesh) {
        if (o.name === 'Cube' || o.name === 'Cube.001') { o.visible = false; return; }
        o.castShadow = true;
        o.receiveShadow = true;
        o.frustumCulled = false;
      }
    });
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const h = box.max.y - box.min.y;
    const k = height && h > 0.01 ? height / h : scale;
    root.scale.setScalar(k);
    root.rotation.y = rot;
    root.updateMatrixWorld(true);
    const box2 = new THREE.Box3().setFromObject(root);
    root.position.set(x - (box2.min.x + box2.max.x) / 2, y - box2.min.y, z - (box2.min.z + box2.max.z) / 2);
    parent.add(root);
    console.info('[prop]', file, 'height', h.toFixed(2), 'scale', k.toFixed(3), 'pos', root.position.toArray().map((n) => n.toFixed(2)).join(','));
  }, undefined, () => { /* fall back to the procedural trench */ });
}

function shadowBlobs(group, list) {
  for (const [w, d, x, z, op] of list) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(w, d), contactShadowMaterial());
    b.rotation.x = -Math.PI / 2;
    b.position.set(x, 0.015, z);
    b.userData.noTileUV = true;
    if (op) b.material = b.material.clone(), b.material.opacity = op;
    group.add(b);
  }
}

export function buildTrench1917(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const mud = new THREE.Mesh(new THREE.PlaneGeometry(90, 90, 40, 40), sandMaterial([14, 14]));
  mud.material.color = new THREE.Color(0x6f6a58);
  mud.rotation.x = -Math.PI / 2;
  const pos = mud.geometry.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i);
    pos.setZ(i, Math.sin(x * 0.5) * 0.06 + Math.cos(y * 0.4) * 0.05);
  }
  mud.geometry.computeVertexNormals();
  mud.receiveShadow = true;
  group.add(mud);

  const plankMat = woodMaterial();
  for (let i = 0; i < 34; i++) {
    const p = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.34), plankMat);
    p.position.set(0, 0.06, 14 - i * 1.1);
    p.rotation.y = (Math.random() - 0.5) * 0.05;
    p.receiveShadow = true;
    group.add(p);
  }

  const bagMat = clothMaterial(0x6a5f42, false);
  const bagGeo = new THREE.SphereGeometry(0.62, 10, 8);
  for (let side of [-1, 1]) {
    for (let r = 0; r < 3; r++) {
      for (let i = 0; i < 26; i++) {
        const b = new THREE.Mesh(bagGeo, bagMat);
        b.position.set(side * (4.4 + r * 0.35), 0.3 + r * 0.52, 16 - i * 1.25 + (r % 2) * 0.6);
        b.scale.set(1.15, 0.62, 0.95);
        b.castShadow = true;
        group.add(b);
      }
    }
  }

  const postMat = woodMaterial();
  const wireMat = new THREE.LineBasicMaterial({ color: 0x2a2822, transparent: true, opacity: 0.8 });
  for (let i = 0; i < 30; i++) {
    const z = 16 - i * 1.9;
    for (const side of [-1, 1]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 1.7, 6), postMat);
      post.position.set(side * 5.6, 0.85, z);
      post.castShadow = true;
      group.add(post);
      const pts = [
        new THREE.Vector3(side * 5.0, 1.35, z - 1.9),
        new THREE.Vector3(side * 5.5, 1.15, z - 0.9),
        new THREE.Vector3(side * 5.0, 1.35, z)
      ];
      group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), wireMat));
    }
  }

  const lights = [];
  const hemi = new THREE.HemisphereLight(0xa9c2d4, 0x4b4636, 1.35);
  group.add(hemi);
  lights.push(hemi);
  const key = new THREE.PointLight(0xcfd8de, 130, 46, 1.5);
  key.position.set(1.5, 3.4, 0);
  group.add(key);
  lights.push(key);
  const rim = new THREE.DirectionalLight(0xffd9a8, 0.55);
  rim.position.set(-8, 6, -12);
  group.add(rim);
  lights.push(rim);

  // real trench corner generated with Lux3D, set into the line
  loadRealProp('./assets/models/props/trench_corner.glb', group, { x: -3.6, z: -1.5, rot: 0.22, height: 2.2 });
  loadRealProp('./assets/models/props/trench_corner.glb', group, { x: 3.6, z: -9.0, rot: Math.PI + 0.18, height: 2.0 });

  shadowBlobs(group, [[10, 34, 0, 0, 0.55]]);
  tileObjectUVs(group, 2.0);

  return {
    group,
    lights,
    spawn: new THREE.Vector3(0, 0, 15),
    props: {
      papers: { position: new THREE.Vector3(1.4, 1.2, 6), label: 'The order', desc: 'Roneoed sheet, zero five hundred, signed by a captain who has been dead since Tuesday.' },
      logbook: { position: new THREE.Vector3(-22, 1.1, -1), label: 'The signals log', desc: 'Timed entries in four different hands. The message you are looking for is recorded as received at 21:14, not 21:04.' }
    },
    npcPositions: { sergeant: { x: 0, z: 4, rotation: Math.PI } },
    update: (dt, t) => { key.intensity = 82 + Math.sin(t * 9) * 8 + Math.sin(t * 27) * 5; }
  };
}

export function buildArchive1989(scene) {
  const group = new THREE.Group();
  scene.add(group);

  const W = 26, D = 22, H = 4.6;
  const plaster = plasterMaterial();
  plaster.color = new THREE.Color(0x8f8d86);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), new THREE.MeshStandardMaterial({ color: 0x6a6a66, roughness: 0.75, metalness: 0 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  group.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), plaster);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  group.add(ceil);

  for (const [x, z, ry] of [[0, -D / 2, 0], [0, D / 2, 0], [-W / 2, 0, Math.PI / 2], [W / 2, 0, Math.PI / 2]]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(x === 0 ? W : 0.3, H, x === 0 ? 0.3 : D), plaster);
    w.position.set(x, H / 2, z);
    w.rotation.y = ry;
    w.receiveShadow = true;
    group.add(w);
  }

  const cabMat = new THREE.MeshStandardMaterial({ color: 0x5c6258, roughness: 0.55, metalness: 0.35 });
  const cabinets = [];
  for (let i = 0; i < 10; i++) {
    const c = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.1, 0.6), cabMat);
    c.position.set(-10 + (i % 5) * 1.0, 1.05, -8 + Math.floor(i / 5) * 0.65);
    c.castShadow = true;
    group.add(c);
    cabinets.push(c);
  }
  const desk = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.08, 1.6), woodMaterial());
  desk.position.set(4, 0.78, 2);
  group.add(desk);
  const shredder = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.5, 0.5), metalMaterial(0x4a4a48));
  shredder.position.set(3.2, 1.07, 2);
  group.add(shredder);

  const strips = [];
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(
      new THREE.BoxGeometry(3.6, 0.08, 0.3),
      new THREE.MeshStandardMaterial({ color: 0xe8f0e0, emissive: 0xdfe9d8, emissiveIntensity: 1.6 })
    );
    s.position.set(-6 + i * 6, H - 0.12, 0);
    group.add(s);
    strips.push(s);
  }
  const lights = [];
  for (let i = 0; i < 3; i++) {
    const l = new THREE.PointLight(0xd8e6dc, 70, 24, 1.5);
    l.position.set(-6 + i * 6, H - 0.4, 0);
    group.add(l);
    lights.push(l);
  }

  shadowBlobs(group, [[6, 4, -8, -7, 0.5], [4, 3, 4, 2, 0.5]]);
  tileObjectUVs(group, 2.0);

  return {
    group,
    lights,
    spawn: new THREE.Vector3(0, 0, 8),
    hall: { W: 26, D: 34, H: 4.6 },
    props: {
      cabinet: { position: new THREE.Vector3(-8, 1.4, -7.4), label: 'The cabinet', desc: 'Four drawers. Each one labelled with a department that does not appear in any ministry directory.' }
    },
    npcPositions: { miep: { x: 5.2, z: 3.4, rotation: -1.2 } },
    update: (dt, t) => {
      for (let i = 0; i < lights.length; i++) {
        const flick = i === 1 ? (Math.sin(t * 31) > 0.86 ? 0.35 : 1) : 1;
        lights[i].intensity = 66 * flick;
      }
    }
  };
}
