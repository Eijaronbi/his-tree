import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

function normalize(geometry, matrixWorld) {
  let g = geometry.clone();
  g.applyMatrix4(matrixWorld);
  if (!g.attributes.normal) g.computeVertexNormals();
  if (!g.attributes.uv) {
    const count = g.attributes.position.count;
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(count * 2), 2));
  }
  for (const name of Object.keys(g.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') g.deleteAttribute(name);
  }
  if (g.index) g = g.toNonIndexed();
  g.morphAttributes = {};
  return g;
}

/**
 * Merges static, single-material meshes of a world group into one mesh per
 * material so a town of a few hundred boxes costs a handful of draw calls.
 * The source meshes stay in the graph (hidden) so collision harvesting and
 * interaction queries keep working exactly as before.
 */
export function mergeStaticMeshes(root, { minGroup = 4, cellSize = 26 } = {}) {
  if (!root) return { merged: 0, saved: 0 };
  root.updateMatrixWorld(true);
  const buckets = new Map();
  const center = new THREE.Vector3();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || !o.geometry) return;
    if (o.userData && (o.userData.noMerge || o.userData.dynamic)) return;
    if (!o.material || Array.isArray(o.material)) return;
    if (!o.geometry.attributes || !o.geometry.attributes.position) return;
    if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
    o.geometry.boundingBox.getCenter(center).applyMatrix4(o.matrixWorld);
    const cx = Math.floor(center.x / cellSize);
    const cz = Math.floor(center.z / cellSize);
    const key = `${o.material.uuid}|${o.castShadow ? 1 : 0}|${o.receiveShadow ? 1 : 0}|${cx}|${cz}`;
    if (!buckets.has(key)) {
      buckets.set(key, { material: o.material, cast: o.castShadow, recv: o.receiveShadow, meshes: [] });
    }
    buckets.get(key).meshes.push(o);
  });

  let merged = 0;
  let saved = 0;
  for (const bucket of buckets.values()) {
    if (bucket.meshes.length < minGroup) continue;
    const geometries = [];
    for (const m of bucket.meshes) geometries.push(normalize(m.geometry, m.matrixWorld));
    let combined = null;
    try {
      combined = mergeGeometries(geometries, false);
    } catch (err) {
      void err;
      combined = null;
    }
    for (const g of geometries) g.dispose();
    if (!combined) continue;
    combined.computeBoundingSphere();
    combined.computeBoundingBox();
    const mesh = new THREE.Mesh(combined, bucket.material);
    mesh.castShadow = bucket.cast;
    mesh.receiveShadow = bucket.recv;
    mesh.name = 'merged-static';
    mesh.userData.noCollide = true;
    mesh.userData.ownedGeometry = true;
    mesh.userData.mergedCount = bucket.meshes.length;
    root.add(mesh);
    for (const m of bucket.meshes) {
      m.visible = false;
      m.userData.mergedInto = mesh;
    }
    merged += 1;
    saved += bucket.meshes.length - 1;
  }
  return { merged, saved };
}

/**
 * Replaces cloned copies of a model with GPU instancing. Every mesh of the
 * source model becomes one InstancedMesh, so a grove of palms costs two draw
 * calls instead of one per tree.
 */
export function instanceModel(source, placements, parent, { cast = true, receive = true, cellSize = 44 } = {}) {
  if (!source || !placements.length) return [];
  source.updateMatrixWorld(true);
  const meshes = [];
  source.traverse((o) => { if (o.isMesh && !o.isInstancedMesh) meshes.push(o); });
  const cells = new Map();
  for (const p of placements) {
    const key = `${Math.floor(p.x / cellSize)}|${Math.floor(p.z / cellSize)}`;
    if (!cells.has(key)) cells.set(key, []);
    cells.get(key).push(p);
  }
  const out = [];
  for (const cell of cells.values()) {
    for (const mesh of meshes) {
      const inst = new THREE.InstancedMesh(mesh.geometry, mesh.material, cell.length);
      inst.castShadow = cast;
      inst.receiveShadow = receive;
      inst.name = `inst_${mesh.name || 'model'}`;
      inst.userData.noCollide = true;
      const m = new THREE.Matrix4();
      const q = new THREE.Quaternion();
      const e = new THREE.Euler();
      const pos = new THREE.Vector3();
      const scl = new THREE.Vector3();
      cell.forEach((p, i) => {
        e.set(0, p.r || 0, 0);
        q.setFromEuler(e);
        pos.set(p.x, p.y || 0, p.z);
        const s = p.s || 1;
        scl.set(s, s, s);
        m.compose(pos, q, scl);
        inst.setMatrixAt(i, m);
      });
      inst.instanceMatrix.needsUpdate = true;
      inst.computeBoundingSphere();
      parent.add(inst);
      out.push(inst);
    }
  }
  return out;
}
