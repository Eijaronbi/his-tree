import * as THREE from 'three';

const params = new URLSearchParams(window.location.search);
const meta = document.querySelector('meta[name="his-tree-cdn"]');

function resolveOrigin() {
  const raw = (window.HIS_TREE_CDN
    || (meta ? meta.getAttribute('content') : '')
    || params.get('cdn')
    || '').trim();
  if (!raw) return '';
  return raw.replace(/\/+$/, '');
}

export const ASSET_ORIGIN = resolveOrigin();
export const ASSET_VERSION = 'v4';

function withVersion(url) {
  if (!url) return url;
  const hash = url.indexOf('#');
  const base = hash >= 0 ? url.slice(0, hash) : url;
  const suffix = hash >= 0 ? url.slice(hash) : '';
  const sep = base.indexOf('?') >= 0 ? '&' : '?';
  return `${base}${sep}v=${ASSET_VERSION}${suffix}`;
}

export function rewriteAssetUrl(url) {
  if (!url) return url;
  if (/^(data|blob):/i.test(url)) return url;
  if (/^(https?:)?\/\//i.test(url)) {
    let parsed;
    try {
      parsed = new URL(url, window.location.origin);
    } catch (err) {
      void err;
      return url;
    }
    const sameOrigin = parsed.origin === window.location.origin;
    if (!sameOrigin && parsed.origin !== ASSET_ORIGIN) return url;
    if (!parsed.pathname.startsWith('/assets/')) return url;
    if (ASSET_ORIGIN) return withVersion(`${ASSET_ORIGIN}${parsed.pathname}${parsed.search}`);
    return withVersion(url);
  }
  const rel = url.replace(/^\.\//, '');
  if (!rel.startsWith('assets/')) return url;
  const origin = ASSET_ORIGIN ? `${ASSET_ORIGIN}/` : './';
  return withVersion(`${origin}${rel}`);
}

export function assetUrl(path) {
  return rewriteAssetUrl(path);
}

export function installUrlModifier(manager) {
  if (!manager || typeof manager.setURLModifier !== 'function') return;
  manager.setURLModifier((url) => rewriteAssetUrl(url));
}

export const manager = new THREE.LoadingManager();
installUrlModifier(manager);

let textureLoader = null;

export function assetTextureLoader() {
  if (!textureLoader) textureLoader = new THREE.TextureLoader(manager);
  return textureLoader;
}

export async function requestPersistentStorage() {
  try {
    if (!navigator.storage || !navigator.storage.persist) return false;
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch (err) {
    void err;
    return false;
  }
}

export async function storageEstimate() {
  try {
    if (!navigator.storage || !navigator.storage.estimate) return null;
    return await navigator.storage.estimate();
  } catch (err) {
    void err;
    return null;
  }
}
