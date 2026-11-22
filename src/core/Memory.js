import * as THREE from 'three';

const textureRegistry = new Map();
const renderTargetRegistry = new Set();

export function trackTexture(texture, owner = 'global') {
  if (!texture || !texture.isTexture) return texture;
  if (!textureRegistry.has(texture)) {
    textureRegistry.set(texture, { owner, refs: 0 });
  }
  return texture;
}

export function trackRenderTarget(target, owner = 'global') {
  if (!target) return target;
  renderTargetRegistry.set(target, owner);
  return target;
}

export function releaseOwner(owner) {
  let textures = 0;
  for (const [texture, info] of textureRegistry) {
    if (info.owner !== owner) continue;
    texture.dispose();
    textureRegistry.delete(texture);
    textures += 1;
  }
  let targets = 0;
  for (const [target, targetOwner] of renderTargetRegistry) {
    if (targetOwner !== owner) continue;
    target.dispose();
    renderTargetRegistry.delete(target);
    targets += 1;
  }
  return { textures, targets };
}

export function disposeTree(root, { textures = true, materials = true, geometries = true, keepShared = true } = {}) {
  if (!root) return;
  const seenGeo = new Set();
  const seenMat = new Set();
  const seenTex = new Set();
  root.traverse((o) => {
    if (!o.isMesh && !o.isPoints && !o.isLine) return;
    if (geometries && o.geometry && !seenGeo.has(o.geometry)) {
      if (!keepShared || o.geometry.userData.shared !== true) {
        seenGeo.add(o.geometry);
        o.geometry.dispose();
      }
    }
    if (!materials) return;
    const list = Array.isArray(o.material) ? o.material : [o.material];
    for (const m of list) {
      if (!m || seenMat.has(m)) continue;
      seenMat.add(m);
      for (const key of Object.keys(m)) {
        const value = m[key];
        if (!value || !value.isTexture || seenTex.has(value)) continue;
        if (!keepShared || value.userData.shared !== true) {
          seenTex.add(value);
          if (textures) {
            textureRegistry.delete(value);
            value.dispose();
          }
        }
      }
      m.dispose();
    }
  });
}

export function memorySnapshot(renderer) {
  const info = renderer && renderer.info ? renderer.info : null;
  return {
    geometries: info ? info.memory.geometries : null,
    textures: info ? info.memory.textures : null,
    programs: info && info.programs ? info.programs.length : null,
    trackedTextures: textureRegistry.size,
    trackedTargets: renderTargetRegistry.size
  };
}

export function disposeRenderTargets(renderer) {
  let count = 0;
  for (const target of Array.from(renderTargetRegistry.keys())) {
    target.dispose();
    renderTargetRegistry.delete(target);
    count += 1;
  }
  if (renderer && renderer.info && renderer.info.memory) {
    renderer.info.reset();
  }
  return count;
}

export function clearTextureCache() {
  for (const [texture] of textureRegistry) texture.dispose();
  textureRegistry.clear();
}
