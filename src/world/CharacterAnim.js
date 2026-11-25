import * as THREE from 'three';

const VERT_PATCH = `
  float side = transformed.x >= 0.0 ? 1.0 : -1.0;
  if (uPose > 2.5) {
    // The rig itself lays the body flat for flight (rig.rotation.x ~= PI/2),
    // so the shader must NOT pitch the body a second time -- doing so tipped
    // the avatar head-down. Pose only the limbs here.
    if (aFlight > 0.001) {
      // Lofi's source mesh keeps its hands in the coat pockets, so there is no
      // extended arm to reuse: aFlight marks the sleeve tube from shoulder to
      // pocket and we swing it up over the head. Once the rig lies the body
      // flat that points the arms ahead of the chest (superman).
      float ady = transformed.y - uShoulderY;
      float adz = transformed.z;
      float ang = 2.95 * aFlight;
      float ca = cos(ang);
      float sa = sin(ang);
      transformed.y = uShoulderY + ady * ca - adz * sa;
      transformed.z = ady * sa + adz * ca;
      // the normal has to follow the same rotation, otherwise the sleeve is
      // lit as if it were still hanging down and reads as torn black shards
      objectNormal = vec3(
        objectNormal.x,
        objectNormal.y * ca - objectNormal.z * sa,
        objectNormal.y * sa + objectNormal.z * ca);
    }
    if (aLeg > 0.001) {
      transformed.x += side * uHeight * 0.022 * aLeg;
    }
  } else {
  if (uArmOut > 0.0001 && uPose < 0.5 && aArm > 0.001) {
    // keep the hands clear of the coat so they do not read as tucked away
    transformed.x += side * uArmOut * uHeight * aArm;
  }
  if (uPose > 0.001 && aArm > 0.001) {
    float pa = uPose * 1.5;
    float pdy = transformed.y - uShoulderY;
    float pdz = transformed.z;
    float pca = cos(pa);
    float psa = sin(pa);
    transformed.y = uShoulderY + pdy * pca + pdz * psa;
    transformed.z = pdz * pca - pdy * psa;
    transformed.x = mix(transformed.x, side * uShoulderX, 0.22 * uPose);
  }
  if (aArm > 0.001) {
    float sw = sin(uPhase + (side > 0.0 ? 3.14159265 : 0.0)) * uAmt * uArmAmp * aArm;
    float dy = transformed.y - uShoulderY;
    float dz = transformed.z;
    transformed.y = uShoulderY + dy * cos(sw) - dz * sin(sw);
    transformed.z = dz * cos(sw) + dy * sin(sw);
  }
  if (uPose > 1.5 && aLeg > 0.001) {
    float sa = -(uPose - 1.0) * 1.15;
    float sca = cos(sa);
    float ssa = sin(sa);
    float sdy = transformed.y - uHipY;
    float sdz = transformed.z;
    transformed.y = uHipY + sdy * sca - sdz * ssa;
    transformed.z = sdz * sca + sdy * ssa;
  }
  if (aLeg > 0.001 && uPose < 1.5) {
    float sideSign = side > 0.0 ? 1.0 : -1.0;
    float th = sideSign * sin(uPhase) * uAmt * uLegAmp;
    float cth = cos(th);
    float sth = sin(th);
    float ldy = transformed.y - uHipY;
    float ldz = transformed.z;
    float ry = uHipY + ldy * cth - ldz * sth;
    float rz = ldz * cth + ldy * sth;
    float kneeY = uHipY - uHeight * 0.17;
    float lower = smoothstep(kneeY + uHeight * 0.05, kneeY - uHeight * 0.05, transformed.y);
    float flex = max(0.0, -sin(th)) * 0.30 * uAmt * lower;
    float cfl = cos(flex);
    float sfl = sin(flex);
    float kdy = ry - kneeY;
    float kdz = rz;
    float ky = kneeY + kdy * cfl - kdz * sfl;
    float kz = kdz * cfl + kdy * sfl;
    float foot = smoothstep(kneeY, uHipY - uHeight * 0.30, transformed.y);
    ky = max(ky, uGroundY + 0.004 * foot);
    transformed.y = ky;
    transformed.z = kz;
  }
  if (aLeg < 0.35 && uAmt > 0.001 && uPose < 1.5) {
    transformed.y -= uAmt * uHeight * 0.008 * (0.5 + 0.5 * cos(uPhase * 2.0));
  }
  }
  if (uIdle > 0.001 && uPose < 2.5) {
    float above = clamp((transformed.y - uHipY) / max(0.001, uHeight * 0.5), 0.0, 1.0);
    float sway = sin(uPhase) * uIdle * uHeight * 0.010 * above;
    float bob = sin(uPhase * 2.0) * uIdle * uHeight * 0.005;
    float lean = sin(uPhase * 0.7 + 1.57) * uIdle * uHeight * 0.006 * above;
    transformed.x += sway;
    transformed.z += lean;
    transformed.y += bob * (0.35 + 0.65 * above);
  }
`;

function smoothstep(a, b, x) {
  const t = Math.max(0, Math.min(1, (x - a) / (b - a || 1e-6)));
  return t * t * (3 - 2 * t);
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(p * sorted.length)))];
}

/** Collect mesh geometry in root space plus a vertex adjacency list. */
function collectMeshes(root, rootInv) {
  const out = [];
  root.traverse((o) => {
    if (!o.isMesh || o.isSkinnedMesh) return;
    const attr = o.geometry && o.geometry.attributes ? o.geometry.attributes.position : null;
    if (!attr) return;
    const rel = new THREE.Matrix4().multiplyMatrices(rootInv, o.matrixWorld);
    const count = attr.count;
    const pos = new Float32Array(count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < count; i += 1) {
      v.fromBufferAttribute(attr, i).applyMatrix4(rel);
      pos[i * 3] = v.x;
      pos[i * 3 + 1] = v.y;
      pos[i * 3 + 2] = v.z;
    }
    const index = o.geometry.index ? o.geometry.index.array : null;
    const triCount = index ? index.length / 3 : count / 3;
    const adjHead = new Int32Array(count).fill(-1);
    const adjNext = [];
    const adjTo = [];
    for (let t = 0; t < triCount; t += 1) {
      const a = index ? index[t * 3] : t * 3;
      const b = index ? index[t * 3 + 1] : t * 3 + 1;
      const c = index ? index[t * 3 + 2] : t * 3 + 2;
      const tri = [a, b, c];
      for (let e = 0; e < 3; e += 1) {
        const from = tri[e];
        const to = tri[(e + 1) % 3];
        adjTo.push(to);
        adjNext.push(adjHead[from]);
        adjHead[from] = adjTo.length - 1;
      }
    }
    out.push({ mesh: o, pos, count, adjHead, adjNext, adjTo });
  });
  return out;
}

export function poseCharacter(root, opts = {}) {
  root.updateMatrixWorld(true);
  const rootInv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const worldBox = new THREE.Box3().setFromObject(root);
  const box = worldBox.clone().applyMatrix4(rootInv);
  const h = box.max.y - box.min.y;
  const info = { meshes: 0, verts: 0, height: h, baked: false, armMeasured: null, armDown: null, armVerts: 0 };
  if (!(h > 0.05)) return null;

  const minY = box.min.y;
  const hipY = minY + h * 0.5;
  const shoulderY = minY + h * 0.855;

  const meshes = collectMeshes(root, rootInv);
  if (!meshes.length) return null;

  const xsAll = [];
  for (const m of meshes) {
    for (let i = 0; i < m.count; i += 1) xsAll.push(Math.abs(m.pos[i * 3]));
  }
  const maxX = Math.max(percentile(xsAll, 0.999), h * 0.12);

  const torsoSamples = [];
  for (const m of meshes) {
    for (let i = 0; i < m.count; i += 1) {
      const y = m.pos[i * 3 + 1];
      const z = m.pos[i * 3 + 2];
      if (y < minY + h * 0.55 || y > minY + h * 0.78) continue;
      if (Math.abs(z) > h * 0.08) continue;
      torsoSamples.push(Math.abs(m.pos[i * 3]));
    }
  }
  const torsoHalf = Math.max(h * 0.045, Math.min(h * 0.24, percentile(torsoSamples, 0.72) || h * 0.11));
  info.torsoHalf = torsoHalf;

  const seedGate = (m, i) => {
    const x = m.pos[i * 3];
    const y = m.pos[i * 3 + 1];
    const z = m.pos[i * 3 + 2];
    if (Math.abs(x) < torsoHalf * 1.28) return false;
    if (y < shoulderY - h * 0.24 || y > shoulderY + h * 0.05) return false;
    if (Math.abs(z) > h * 0.2) return false;
    return true;
  };

  const armSeedX = [];
  for (const m of meshes) {
    for (let i = 0; i < m.count; i += 1) {
      if (seedGate(m, i)) armSeedX.push(Math.abs(m.pos[i * 3]));
    }
  }
  const armSpan = armSeedX.length ? percentile(armSeedX, 0.95) : 0;
  const hasTPose = armSpan > torsoHalf + h * 0.06;

  const armGate = (m, i) => {
    const x = m.pos[i * 3];
    const y = m.pos[i * 3 + 1];
    const z = m.pos[i * 3 + 2];
    if (Math.abs(x) < torsoHalf * 1.03) return false;
    if (y < shoulderY - h * 0.46) return false;
    if (y > shoulderY + h * (opts.collarGuard ? 0.02 : 0.12)) return false;
    if (Math.abs(z) > h * 0.24) return false;
    return true;
  };

  const armWeights = new Map();
  let armVertCount = 0;
  if (hasTPose) {
    for (const m of meshes) {
      const weights = new Float32Array(m.count);
      const queue = [];
      for (let i = 0; i < m.count; i += 1) {
        if (seedGate(m, i) && armGate(m, i)) {
          weights[i] = 1;
          queue.push(i);
        }
      }
      let head = 0;
      while (head < queue.length) {
        const cur = queue[head++];
        for (let e = m.adjHead[cur]; e !== -1; e = m.adjNext[e]) {
          const nb = m.adjTo[e];
          if (weights[nb] > 0) continue;
          if (!armGate(m, nb)) continue;
          if (opts.collarGuard && Math.abs(m.pos[nb * 3]) < torsoHalf * 1.12) continue;
          weights[nb] = 1;
          queue.push(nb);
        }
      }
      if (queue.length) {
        // soften the boundary so the shoulder seam stretches instead of tearing
        const rings = [0.62, 0.36, 0.18];
        let frontier = queue.slice();
        for (let r = 0; r < rings.length; r += 1) {
          const next = [];
          for (const cur of frontier) {
            for (let e = m.adjHead[cur]; e !== -1; e = m.adjNext[e]) {
              const nb = m.adjTo[e];
              if (weights[nb] > 0) continue;
              weights[nb] = rings[r];
              next.push(nb);
            }
          }
          frontier = next;
        }
        armWeights.set(m, weights);
        armVertCount += queue.length;
      }
    }
  }
  info.armVerts = armVertCount;

  let armDown = typeof opts.armDown === 'number' && Number.isFinite(opts.armDown) ? opts.armDown : 0;
  let measured = 0;
  if (!armDown && hasTPose && armVertCount > 0) {
    const angles = [];
    const pivotX = torsoHalf * 0.98;
    for (const [m, weights] of armWeights) {
      for (let i = 0; i < m.count; i += 1) {
        if (!weights[i]) continue;
        const x = m.pos[i * 3];
        const y = m.pos[i * 3 + 1];
        if (Math.abs(x) < pivotX + h * 0.04) continue;
        angles.push(Math.atan2(shoulderY - y, Math.abs(x) - pivotX));
      }
    }
    measured = angles.length ? angles.reduce((a, b) => a + b, 0) / angles.length : 0;
    armDown = Math.max(0, Math.min(opts.collarGuard ? 1.05 : 1.5, (opts.collarGuard ? 1.18 : 1.32) - measured));
  }
  info.armMeasured = measured;
  info.armDown = armDown;

  for (const m of meshes) {
    const geo = m.mesh.geometry.clone();
    const pos = geo.attributes.position;
    const nor = geo.attributes.normal;
    const armAttr = new Float32Array(pos.count);
    const legAttr = new Float32Array(pos.count);
    // Always bake into fresh float arrays: quantized (int8/int16) source
    // attributes would truncate the float positions written below, collapsing
    // every mesh that was optimized with KHR_mesh_quantization.
    const pArr = new Float32Array(pos.count * 3);
    const nArr = nor ? new Float32Array(nor.count * 3) : null;
    const weights = armWeights.get(m) || null;

    for (let i = 0; i < pos.count; i += 1) {
      let x = m.pos[i * 3];
      let y = m.pos[i * 3 + 1];
      const z = m.pos[i * 3 + 2];
      const w = weights ? weights[i] : 0;
      armAttr[i] = w;
      let nx = 0;
      let ny = 0;
      let nz = 0;
      if (nor) {
        nx = nor.getX(i);
        ny = nor.getY(i);
        nz = nor.getZ(i);
      }
      if (w > 0.001 && armDown > 0.001) {
        const side = x >= 0 ? 1 : -1;
        const pivotX = side * torsoHalf * 0.98;
        const ang = -side * armDown * w;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const dx = x - pivotX;
        const dy = y - shoulderY;
        const nxp = pivotX + dx * ca - dy * sa;
        const nyp = shoulderY + dx * sa + dy * ca;
        if (Number.isFinite(nxp) && Number.isFinite(nyp)) {
          x = nxp;
          y = nyp;
          if (nArr) {
            const rx = nx * ca - ny * sa;
            const ry = nx * sa + ny * ca;
            nx = rx;
            ny = ry;
          }
        }
      }
      const legW = smoothstep(hipY + h * 0.02, hipY - h * 0.12, y);
      legAttr[i] = legW * (opts.legScale ?? 1);
      pArr[i * 3] = x;
      pArr[i * 3 + 1] = y;
      pArr[i * 3 + 2] = z;
      if (nArr) {
        nArr[i * 3] = nx;
        nArr[i * 3 + 1] = ny;
        nArr[i * 3 + 2] = nz;
      }
      info.verts += 1;
    }

    // Flight-arm weight: a tube from the shoulder down to the pocket, built
    // from the *baked* positions so it matches what the shader sees. The
    // weight is a pure distance field with a wide falloff and no hard gates:
    // a clipped field tears the surface into shredded slivers because
    // neighbouring vertices end up with very different rotations.
    // Kept separate from aArm so the walk/idle swing stays untouched.
    const flightAttr = new Float32Array(pos.count);
    {
      const R0 = h * 0.035;
      const R1 = h * 0.085;
      const shoulderX = torsoHalf * 1.02;
      const handX = torsoHalf * 0.72;
      const handY = hipY + h * 0.02;
      const handZ = h * 0.06;
      for (let i = 0; i < pos.count; i += 1) {
        const x = pArr[i * 3];
        const y = pArr[i * 3 + 1];
        const z = pArr[i * 3 + 2];
        // keep the neck and head out of the swing: the tube's shoulder end
        // reaches them, and rotating them tore the collar open
        const neckGuard = smoothstep(shoulderY + h * 0.05, shoulderY - h * 0.01, y);
        if (neckGuard <= 0.001) continue;
        const s = x >= 0 ? 1 : -1;
        const ax = s * shoulderX;
        const bx = s * handX;
        const dx = bx - ax;
        const dy = handY - shoulderY;
        const dz = handZ;
        const len2 = dx * dx + dy * dy + dz * dz || 1e-6;
        let t = ((x - ax) * dx + (y - shoulderY) * dy + z * dz) / len2;
        t = Math.max(0, Math.min(1, t));
        const qx = ax + dx * t;
        const qy = shoulderY + dy * t;
        const qz = dz * t;
        const d = Math.hypot(x - qx, y - qy, z - qz);
        const w = (1 - smoothstep(R0, R1, d)) * neckGuard;
        if (w > 0.001) flightAttr[i] = w;
      }
    }

    geo.setAttribute('position', new THREE.BufferAttribute(pArr, 3));
    if (nArr) geo.setAttribute('normal', new THREE.BufferAttribute(nArr, 3));

    geo.setAttribute('aArm', new THREE.BufferAttribute(armAttr, 1));
    geo.setAttribute('aLeg', new THREE.BufferAttribute(legAttr, 1));
    geo.setAttribute('aFlight', new THREE.BufferAttribute(flightAttr, 1));
    geo.computeBoundingBox();
    geo.computeBoundingSphere();

    m.mesh.geometry = geo;
    m.mesh.position.set(0, 0, 0);
    m.mesh.quaternion.identity();
    m.mesh.scale.set(1, 1, 1);
    if (m.mesh.parent !== root) root.add(m.mesh);
    info.meshes += 1;
  }
  info.baked = true;

  const shared = {
    uPhase: { value: 0 },
    uAmt: { value: 0 },
    uHipY: { value: hipY },
    uShoulderY: { value: shoulderY },
    uHeight: { value: h },
    uArmAmp: { value: opts.armAmp ?? 0.42 },
    uLegAmp: { value: opts.legAmp ?? 0.55 },
    uPose: { value: 0 },
    uShoulderX: { value: torsoHalf },
    uIdle: { value: 0 },
    uGroundY: { value: minY },
    uArmOut: { value: opts.armOut ?? 0 }
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
            '#include <common>\nattribute float aArm;\nattribute float aLeg;\nattribute float aFlight;\nuniform float uPhase;\nuniform float uAmt;\nuniform float uHipY;\nuniform float uShoulderY;\nuniform float uHeight;\nuniform float uArmAmp;\nuniform float uLegAmp;\nuniform float uPose;\nuniform float uShoulderX;\nuniform float uIdle;\nuniform float uGroundY;\nuniform float uArmOut;'
          )
          .replace('#include <begin_vertex>', '#include <begin_vertex>\n' + VERT_PATCH);
      };
      mat.customProgramCacheKey = () => 'histree-pose-v6';
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
    setIdle() { shared.uAmt.value = 0; },
    setIdleAmp(amount) { shared.uIdle.value = Math.max(0, Number(amount) || 0); },
    setPose(name) {
      if (name === 'fly') shared.uPose.value = 3;
      else if (name === 'superman') shared.uPose.value = 1;
      else if (name === 'slam') shared.uPose.value = 0.35;
      else if (name === 'sit') shared.uPose.value = 2;
      else shared.uPose.value = 0;
    }
  };
}
