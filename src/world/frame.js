import * as THREE from 'three';

/** Trimmed (0.5–99.5 percentile) world-space bounds, immune to stray verts. */
export function robustBox(root) {
  root.updateMatrixWorld(true);
  const xs = [];
  const ys = [];
  const zs = [];
  const v = new THREE.Vector3();
  root.traverse((o) => {
    const pos = o.isMesh && o.geometry && o.geometry.attributes ? o.geometry.attributes.position : null;
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 3000));
    for (let i = 0; i < pos.count; i += step) {
      v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
      xs.push(v.x);
      ys.push(v.y);
      zs.push(v.z);
    }
  });
  if (!ys.length) return new THREE.Box3(new THREE.Vector3(-0.3, 0, -0.3), new THREE.Vector3(0.3, 1.7, 0.3));
  const q = (a, p) => {
    a.sort((m, n) => m - n);
    return a[Math.min(a.length - 1, Math.max(0, Math.floor(p * a.length)))];
  };
  return new THREE.Box3(
    new THREE.Vector3(q(xs, 0.005), q(ys, 0.005), q(zs, 0.005)),
    new THREE.Vector3(q(xs, 0.995), q(ys, 0.995), q(zs, 0.995))
  );
}
