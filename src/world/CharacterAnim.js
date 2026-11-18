import * as THREE from 'three';

const VERT_PATCH = `
  float side = transformed.x >= 0.0 ? 1.0 : -1.0;
  if (aArm > 0.001) {
    float sw = sin(uPhase + (side > 0.0 ? 3.14159265 : 0.0)) * uAmt * uArmAmp * aArm;
    float dy = transformed.y - uShoulderY;
    float dz = transformed.z;
    transformed.y = uShoulderY + dy * cos(sw) - dz * sin(sw);
    transformed.z = dz * cos(sw) + dy * sin(sw);
  }
  if (aLeg > 0.001) {
    float sc = sin(uPhase + (side > 0.0 ? 0.0 : 3.14159265));
    float swl = sc * uAmt * uLegAmp * aLeg;
    float ldy = transformed.y - uHipY;
    float ldz = transformed.z;
    transformed.y = uHipY + ldy * cos(swl) - ldz * sin(swl) * 0.30;
    transformed.z = ldz * cos(swl) + ldy * sin(swl) * 0.90;
    transformed.y += max(0.0, sc) * uAmt * 0.04 * uHeight * aLeg;
  }
`;

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
}

export function poseCharacter(root, opts = {}) {
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const worldBox = new THREE.Box3().setFromObject(root);
  const box = worldBox.clone().applyMatrix4(rootInv);
  const h = box.max.y - box.min.y;
  const info = { meshes: 0, verts: 0, height: h, baked: false, armMeasured: null, armDown: null };
  if (!(h > 0.05)) return null;

  const minY = box.min.y;
  const hipY = minY + h * 0.50;
  const shoulderY = minY + h * 0.855;
  const armX = h * 0.155;

  const meshes = [];
  root.traverse((o) => { if (o.isMesh && !o.isSkinnedMesh) meshes.push(o); });

  if (opts.armDown === 'auto' || opts.armDown == null) {
    const tips = [];
    for (const m of meshes) {
      const rel = new THREE.Matrix4().multiplyMatrices(rootInv, m.matrixWorld);
      const p = m.geometry.attributes.position;
      const v = new THREE.Vector3();
      for (let i = 0; i < p.count; i += 2) {
        v.fromBufferAttribute(p, i).applyMatrix4(rel);
        const ax = Math.abs(v.x) - armX;
        if (ax > h * 0.03 && v.y > hipY - h * 0.25 && v.y < shoulderY + h * 0.04) tips.push(ax);
      }
    }
    let measured = 0;
    if (tips.length > 8) {
      tips.sort((a, b) => b - a);
      const cut = tips[Math.max(0, Math.floor(tips.length * 0.1))];
      let sum = 0;
      let n = 0;
      for (const m of meshes) {
        const rel = new THREE.Matrix4().multiplyMatrices(rootInv, m.matrixWorld);
        const p = m.geometry.attributes.position;
        const v = new THREE.Vector3();
        for (let i = 0; i < p.count; i += 2) {
          v.fromBufferAttribute(p, i).applyMatrix4(rel);
          const ax = Math.abs(v.x) - armX;
          if (ax >= cut && v.y > hipY - h * 0.3 && v.y < shoulderY + h * 0.05) {
            sum += Math.atan2(shoulderY - v.y, Math.max(0.01, ax));
            n++;
          }
        }
      }
      measured = n ? sum / n : 0;
    }
    opts = { ...opts, armDown: Math.max(0, Math.min(1.5, 1.42 - measured)) };
    info.armMeasured = measured;
    info.armDown = opts.armDown;
  }

  const armDown = typeof opts.armDown === 'number' && Number.isFinite(opts.armDown)
    ? opts.armDown
    : (info.armDown ?? 0.9);

  const BANDS = 18;
  const armTop = shoulderY;
  const armBot = hipY - h * 0.14;
  const bandMax = new Array(BANDS).fill(0);
  {
    const v = new THREE.Vector3();
    for (const m of meshes) {
      const rel = new THREE.Matrix4().multiplyMatrices(rootInv, m.matrixWorld);
      const p = m.geometry.attributes.position;
      for (let i = 0; i < p.count; i += 2) {
        v.fromBufferAttribute(p, i).applyMatrix4(rel);
        if (v.y < armBot || v.y > armTop) continue;
        const b = Math.min(BANDS - 1, Math.max(0, Math.floor(((v.y - armBot) / (armTop - armBot)) * BANDS)));
        const ax = Math.abs(v.x);
        if (ax > bandMax[b]) bandMax[b] = ax;
      }
    }
  }
  const bandAt = (y) => {
    const t = (y - armBot) / (armTop - armBot);
    if (t < 0 || t > 1) return 0;
    return bandMax[Math.min(BANDS - 1, Math.max(0, Math.floor(t * BANDS)))];
  };

  for (const mesh of meshes) {
    const geo = mesh.geometry.clone();
    const rel = new THREE.Matrix4().multiplyMatrices(rootInv, mesh.matrixWorld);
    geo.applyMatrix4(rel);

    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    let nanAfterMatrix = 0;
    for (let i = 0; i < pos.count; i++) if (!Number.isFinite(pos.getX(i)) || !Number.isFinite(pos.getY(i))) nanAfterMatrix++;
    const armAttr = new Float32Array(pos.count);
    const legAttr = new Float32Array(pos.count);

    for (let i = 0; i < pos.count; i++) {
      let x = pos.getX(i);
      let y = pos.getY(i);
      let z = pos.getZ(i);

      const mw = bandAt(y);
      const armW = (mw > 0 ? smoothstep(mw * 0.68, mw * 0.94, Math.abs(x)) : 0)
                 * smoothstep(armBot, armBot + h * 0.06, y);
      armAttr[i] = armW;
      if (armW > 0.001) {
        const side = x >= 0 ? 1 : -1;
        const ang = -side * armDown * armW;
        const px = side * Math.max(armX * 0.55, mw * 0.72);
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const dx = x - px;
        const dy = y - shoulderY;
        x = px + dx * ca - dy * sa;
        y = shoulderY + dx * sa + dy * ca;
        if (!Number.isFinite(x) || !Number.isFinite(y)) {
          x = pos.getX(i);
          y = pos.getY(i);
          armAttr[i] = 0;
        } else if (nor) {
          const nx = nor.getX(i);
          const ny = nor.getY(i);
          nor.setXYZ(i, nx * ca - ny * sa, nx * sa + ny * ca, nor.getZ(i));
        }
      }

      const legW = smoothstep(hipY + h * 0.02, hipY - h * 0.12, y);
      legAttr[i] = legW * (opts.legScale ?? 1);
      pos.setXYZ(i, x, y, z);
      info.verts++;
    }

    if (nanAfterMatrix > 0) { info.nanAfterMatrix = (info.nanAfterMatrix || 0) + nanAfterMatrix; info.nanMesh = info.nanMesh || []; info.nanMesh.push(mesh.name + ':' + nanAfterMatrix); }
    if (nor) nor.needsUpdate = true;
    pos.needsUpdate = true;
    geo.setAttribute('aArm', new THREE.BufferAttribute(armAttr, 1));
    geo.setAttribute('aLeg', new THREE.BufferAttribute(legAttr, 1));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    mesh.geometry = geo;
    mesh.position.set(0, 0, 0);
    mesh.quaternion.identity();
    mesh.scale.set(1, 1, 1);
    if (mesh.parent !== root) root.add(mesh);
    info.meshes++;
  }
  info.baked = true;

  const shared = {
    uPhase: { value: 0 },
    uAmt: { value: 0 },
    uHipY: { value: hipY },
    uShoulderY: { value: shoulderY },
    uHeight: { value: h },
    uArmAmp: { value: opts.armAmp ?? 0.42 },
    uLegAmp: { value: opts.legAmp ?? 0.55 }
  };

  root.traverse((o) => {
    if (!o.isMesh) return;
    const mats = Array.isArray(o.material) ? o.material : [o.material];
    const patched = mats.map((src) => {
      const mat = src.clone();
      mat.onBeforeCompile = (shader) => {
        Object.assign(shader.uniforms, shared);
        shader.vertexShader = shader.vertexShader
          .replace(
            '#include <common>',
            '#include <common>\nattribute float aArm;\nattribute float aLeg;\nuniform float uPhase;\nuniform float uAmt;\nuniform float uHipY;\nuniform float uShoulderY;\nuniform float uHeight;\nuniform float uArmAmp;\nuniform float uLegAmp;'
          )
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_PATCH);
      };
      mat.customProgramCacheKey = () => 'histree-pose-v2';
      mat.needsUpdate = true;
      return mat;
    });
    o.material = Array.isArray(o.material) ? patched : patched[0];
  });

  return {
    uniforms: shared,
    info,
    setWalk(speed, phase) {
      shared.uPhase.value = phase;
      shared.uAmt.value = Math.min(1, Math.max(0, speed / 4.0));
    },
    setIdle() { shared.uAmt.value = 0; }
  };
}
