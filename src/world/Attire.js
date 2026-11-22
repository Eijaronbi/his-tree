import * as THREE from 'three';

const MAT = {
  indigo: 0x27365c,
  indigoDeep: 0x1d2743,
  white: 0xfaf4e6,
  ochre: 0xb8873a,
  gold: 0xd9a441,
  leather: 0x4a3324,
  red: 0x7d2a24
};

function cloth(color, rough = 0.95) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: rough,
    metalness: 0.0,
    side: THREE.DoubleSide
  });
}

function metal(color) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.32, metalness: 0.85 });
}

function measure(root) {
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3();
  box.getSize(size);
  const h = Math.max(0.6, size.y);
  return {
    h,
    width: size.x,
    depth: size.z,
    minY: box.min.y,
    centerX: (box.min.x + box.max.x) / 2 - root.position.x,
    centerZ: (box.min.z + box.max.z) / 2 - root.position.z
  };
}

function sampleFit(root, baseY, h) {
  const v = new THREE.Vector3();
  let rChest = 0;
  let rHip = 0;
  let rHem = 0;
  let zRatio = 1;
  let zMax = 0;
  const y0 = baseY;
  root.updateMatrixWorld(true);
  const walk = (o) => {
    if (o.isMesh && o.geometry && o.geometry.attributes && o.geometry.attributes.position) {
      const pos = o.geometry.attributes.position;
      const step = Math.max(1, Math.floor(pos.count / 4000));
      for (let i = 0; i < pos.count; i += step) {
        v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
        const dy = v.y - y0;
        if (dy < -0.05) continue;
        const t = dy / h;
        const dx = v.x - root.position.x;
        const dz = v.z - root.position.z;
        if (Math.abs(dx) > Math.max(0.2, h * 0.13)) continue;
        const r = Math.hypot(dx, dz);
        if (t > 0.56 && t < 0.92) {
          if (r > rChest) rChest = r;
          if (Math.abs(dz) > zMax) zMax = Math.abs(dz);
        } else if (t >= 0.4 && t <= 0.56) {
          if (r > rHip) rHip = r;
        } else if (t > 0.1 && t < 0.4) {
          if (r > rHem) rHem = r;
        }
      }
    }
    o.children.forEach(walk);
  };
  root.children.forEach(walk);
  if (rChest > 0.05) zRatio = Math.min(1, Math.max(0.62, zMax / rChest));
  return {
    rChest: Math.max(rChest, 0.12),
    rHip: Math.max(rHip, 0.11),
    rHem: Math.max(rHem, 0.13),
    zRatio
  };
}


function carveTorso(root, attire, cx, cz, r, yMin, yMax) {
  const patch = (mat) => {
    if (!mat || mat.userData.carved) return mat;
    mat.userData.carved = true;
    mat.onBeforeCompile = (shader) => {
      shader.uniforms.uCenter = { value: new THREE.Vector3(cx, 0, cz) };
      shader.uniforms.uR = { value: r };
      shader.uniforms.uYMin = { value: yMin };
      shader.uniforms.uYMax = { value: yMax };
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCarvePos;')
        .replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvCarvePos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vCarvePos;\nuniform vec3 uCenter;\nuniform float uR;\nuniform float uYMin;\nuniform float uYMax;')
        .replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\nif (vCarvePos.y > uYMin && vCarvePos.y < uYMax && distance(vCarvePos.xz, uCenter.xz) < uR) discard;');
    };
    mat.customProgramCacheKey = () => 'histree-carve-v1';
    mat.needsUpdate = true;
    return mat;
  };
  root.traverse((o) => {
    if (!o.isMesh || (attire && attire.getObjectById(o.id))) return;
    const nm = o.name || '';
    if (!/clothes|jacket|coat|shirt|suit|dress|pants|trouser/i.test(nm)) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    o.material = Array.isArray(o.material) ? mats.map((m) => (m && m.clone ? patch(m.clone()) : m)) : patch(o.material.clone ? o.material.clone() : o.material);
  });
}

export function dressAfrican(root, opts = {}) {
  if (!root) return null;
  const m = measure(root);
  const h = m.h;
  const robeA = opts.robe ?? MAT.indigo;
  const robeB = opts.robeAlt ?? MAT.white;
  const head = opts.headwrap ?? MAT.indigoDeep;
  const trim = opts.trim ?? MAT.gold;
  const royal = opts.royal === true;

  const g = new THREE.Group();
  g.name = 'attire';
  const cx = m.centerX;
  const cz = m.centerZ;

  const ankleY = m.minY + h * 0.055;
  const hipY = m.minY + h * 0.52;
  const shoulderY = m.minY + h * 0.815;
  const neckY = m.minY + h * 0.855;
  const headY = m.minY + h * 0.948;
  const headR = Math.max(0.075, h * 0.052);

  const robeTop = neckY + h * 0.012;
  const robeH = robeTop - ankleY;
  const fit = sampleFit(root, m.minY, h);
  const clampR = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const rChest = clampR(fit.rChest * 1.05, 0.17, 0.38);
  const rHip = clampR(Math.max(fit.rHip * 1.03, rChest * 0.94), 0.16, 0.36);
  const rHem = clampR(Math.max(fit.rHem * 1.06, rChest * 1.12), 0.18, 0.44);
  const zr = clampR(fit.zRatio, 0.66, 0.95) * 0.94;
  fit.rChest = rChest;
  const prof = [
    [0.0, rHem], [0.08, rHem * 0.99], [0.22, (rHem + rHip) * 0.5], [0.4, rHip],
    [0.55, rHip * 1.01], [0.68, rChest * 0.99], [0.80, rChest], [0.90, rChest],
    [0.945, rChest * 0.99], [0.975, rChest * 0.62], [1.0, rChest * 0.42]
  ];
  const pts = prof.map(([t, r]) => new THREE.Vector2(r, t * robeH));
  const robe = new THREE.Mesh(new THREE.LatheGeometry(pts, 30), cloth(robeA));
  robe.position.set(cx, ankleY, cz);
  robe.scale.set(1, 1, zr);
  g.add(robe);

  const over = new THREE.Mesh(
    new THREE.CylinderGeometry(rChest * 1.02, rHip * 1.06, (shoulderY - hipY) * 1.02, 22, 1, true,
      Math.PI * 0.46, Math.PI * 0.7),
    cloth(robeB, 0.9)
  );
  over.position.set(cx, hipY + (shoulderY - hipY) * 0.5, cz);
  over.scale.set(1, 1, zr * 1.03);
  over.rotation.y = Math.PI * 0.06;
  g.add(over);

  const hemTrim = new THREE.Mesh(new THREE.TorusGeometry(rHem, h * 0.007, 6, 30), metal(trim));
  hemTrim.rotation.x = Math.PI / 2;
  hemTrim.scale.set(1, zr, 1);
  hemTrim.position.set(cx, ankleY + h * 0.008, cz);
  g.add(hemTrim);

  const collar = new THREE.Mesh(new THREE.TorusGeometry(rChest * 0.42, h * 0.008, 6, 26), metal(trim));
  collar.rotation.x = Math.PI / 2;
  collar.scale.set(1, 0.86, 1);
  collar.position.set(cx, neckY - h * 0.006, cz);
  g.add(collar);

  const sash = new THREE.Mesh(new THREE.BoxGeometry(h * 0.028, (shoulderY - hipY) * 0.9, h * 0.012), cloth(royal ? MAT.gold : MAT.ochre, 0.7));
  sash.position.set(cx + rChest * 0.28, hipY + (shoulderY - hipY) * 0.45, cz + rChest * zr * 0.72);
  sash.rotation.z = 0.22;
  g.add(sash);

  const cap = new THREE.Mesh(new THREE.SphereGeometry(headR * 1.34, 20, 14), cloth(head, 0.92));
  cap.position.set(cx, headY - headR * 0.1, cz);
  cap.scale.set(1.06, 0.98, 1.1);
  g.add(cap);

  const wrap = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.52, headR * 1.38, headR * 0.78, 20, 1, true), cloth(head, 0.92));
  wrap.position.set(cx, headY - headR * 0.42, cz);
  g.add(wrap);

  const wrapTrim = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.48, headR * 0.07, 6, 24), cloth(royal ? MAT.gold : robeB, 0.6));
  wrapTrim.rotation.x = Math.PI / 2;
  wrapTrim.position.set(cx, headY - headR * 0.8, cz);
  g.add(wrapTrim);

  const veil = new THREE.Mesh(new THREE.CylinderGeometry(headR * 1.3, headR * 1.52, headR * 1.7, 16, 1, true, Math.PI * 0.55, Math.PI * 0.9), cloth(head, 0.95));
  veil.position.set(cx, headY - headR * 1.0, cz);
  g.add(veil);

  if (royal) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(headR * 1.12, headR * 0.075, 8, 24), metal(MAT.gold));
    ring.rotation.x = Math.PI / 2;
    ring.position.set(cx, neckY - h * 0.03, cz);
    g.add(ring);
    const armband = new THREE.Mesh(new THREE.TorusGeometry(h * 0.038, h * 0.011, 8, 18), metal(MAT.gold));
    armband.rotation.y = Math.PI / 2;
    armband.position.set(cx + h * 0.155, m.minY + h * 0.66, cz);
    g.add(armband);
  }

  g.traverse((o) => {
    if (o.isMesh) {
      o.castShadow = true;
      o.receiveShadow = true;
      o.frustumCulled = false;
    }
  });
  root.add(g);
  root.userData.attire = g;
  carveTorso(root, g, cx, cz, rHem * 0.99, ankleY, neckY);
  return g;
}

export function dressMaliCourt(root, role = 'noble') {
  const royal = role === 'royal';
  const presets = {
    royal: { robe: MAT.white, robeAlt: MAT.indigoDeep, headwrap: MAT.white, trim: MAT.gold, royal: true },
    noble: { robe: MAT.indigo, robeAlt: MAT.white, headwrap: MAT.indigoDeep, trim: MAT.gold },
    trader: { robe: MAT.ochre, robeAlt: MAT.indigo, headwrap: MAT.indigo, trim: MAT.leather },
    guide: { robe: MAT.white, robeAlt: MAT.leather, headwrap: MAT.ochre, trim: MAT.leather },
    guard: { robe: MAT.leather, robeAlt: MAT.indigoDeep, headwrap: MAT.indigoDeep, trim: MAT.leather }
  };
  const preset = presets[role] || presets.noble;
  return dressAfrican(root, preset);
}
