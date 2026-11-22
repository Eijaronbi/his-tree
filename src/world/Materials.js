import * as THREE from 'three';
import { texturePath } from '../core/AssetTiers.js';
import { assetTextureLoader } from '../core/Assets.js';

export function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const TEX_BASE = './assets/textures/';
const texCache = new Map();

export function loadTexture(file, { srgb = false, repeat = null } = {}) {
  const key = `${file}|${srgb ? 's' : 'l'}|${repeat ? repeat.join('x') : '-'}`;
  if (texCache.has(key)) return texCache.get(key);
  const tex = assetTextureLoader().load(texturePath(file));
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  tex.anisotropy = 8;
  if (repeat) tex.repeat.set(repeat[0], repeat[1]);
  texCache.set(key, tex);
  return tex;
}

export function tileBoxUV(geometry, w, h, d, tile = 2) {
  const uv = geometry.attributes.uv;
  if (!uv) return geometry;
  const faces = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) {
    const [su, sv] = faces[f];
    for (let i = 0; i < 4; i++) {
      const idx = f * 4 + i;
      if (idx >= uv.count) break;
      uv.setXY(idx, uv.getX(idx) * (su / tile), uv.getY(idx) * (sv / tile));
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

export function tileObjectUVs(root, tile = 2) {
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry || o.userData.noTileUV) return;
    const p = o.geometry.parameters;
    if (o.geometry.type === 'BoxGeometry' && p) {
      tileBoxUV(o.geometry, p.width, p.height, p.depth, tile);
    } else if (o.geometry.type === 'CylinderGeometry' && p) {
      const uv = o.geometry.attributes.uv;
      const circ = Math.PI * (p.radiusTop + p.radiusBottom) / 2.4;
      if (uv) {
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(i, uv.getX(i) * Math.max(1, circ), uv.getY(i) * Math.max(1, p.height / 2.4));
        }
        uv.needsUpdate = true;
      }
    } else if (o.geometry.type === 'PlaneGeometry' && p) {
      const uv = o.geometry.attributes.uv;
      if (uv) {
        for (let i = 0; i < uv.count; i++) {
          uv.setXY(i, uv.getX(i) * (p.width / tile), uv.getY(i) * (p.height / tile));
        }
        uv.needsUpdate = true;
      }
    }
  });
}

function pbrMat({ set, repeat = null, color = 0xffffff, normalScale = 0.9, roughness = 1, metalness = 0, extra = {} }) {
  const map = loadTexture(`${set}_albedo.webp`, { srgb: true, repeat });
  const normalMap = loadTexture(`${set}_normal.webp`, { repeat });
  const roughnessMap = loadTexture(`${set}_rough.webp`, { repeat });
  return new THREE.MeshStandardMaterial({
    map, normalMap, roughnessMap,
    normalScale: new THREE.Vector2(normalScale, normalScale),
    color, roughness, metalness,
    envMapIntensity: 0.75,
    ...extra
  });
}

export function adobeMaterial(color = 0xffffff, seed = 7) {
  const variant = ['v0', 'v1', 'v2'][Math.abs(seed | 0) % 3];
  return pbrMat({ set: `adobe_${variant}`, color: 0xffffff, normalScale: 0.95, roughness: 1 });
}

export function sandMaterial(repeat = [1, 1]) {
  return pbrMat({ set: 'sand', repeat, normalScale: 0.55, roughness: 1 });
}

export function woodMaterial() {
  return pbrMat({ set: 'wood', normalScale: 1.0, roughness: 1, color: 0xffffff });
}

export function plasterMaterial() {
  return pbrMat({ set: 'plaster', normalScale: 0.8, roughness: 1 });
}

export function velvetMaterial(color = 0x6e2b2a) {
  const m = pbrMat({ set: 'velvet', normalScale: 1.2, roughness: 1 });
  m.color = new THREE.Color(color);
  m.sheen = 1.0;
  m.sheenRoughness = 0.42;
  m.sheenColor = new THREE.Color(0xd89494);
  return m;
}


export function theatreWoodMaterial() {
  const m = pbrMat({ set: 'wood_floor', normalScale: 1.15, roughness: 1, color: 0x9c7d5e });
  return m;
}

export function theatrePlasterMaterial() {
  const m = pbrMat({ set: 'worn_plaster_wall', normalScale: 0.9, roughness: 1, color: 0x8d7d68 });
  return m;
}

export function theatreVelvetMaterial(color = 0x7d2a33) {
  const m = pbrMat({ set: 'velour_velvet', normalScale: 1.0, roughness: 1 });
  m.color = new THREE.Color(color);
  m.sheen = 0.85;
  m.sheenRoughness = 0.62;
  m.sheenColor = new THREE.Color(0xa9575c);
  return m;
}

export function carpetMaterial(color = 0xffffff) {
  const m = pbrMat({ set: 'dirty_carpet', normalScale: 0.9, roughness: 1 });
  m.color = new THREE.Color(color);
  return m;
}

export function woolMaterial(color = 0x1b1b18) {
  const m = pbrMat({ set: 'wool', normalScale: 1.1, roughness: 1 });
  m.color = new THREE.Color(color);
  m.sheen = 0.35;
  m.sheenRoughness = 0.75;
  m.sheenColor = new THREE.Color(0x8a8a86);
  return m;
}

export function clothMaterial(color, stripe = true) {
  const rng = makeRng(51);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const c = new THREE.Color(color);
  ctx.fillStyle = `#${c.getHexString()}`;
  ctx.fillRect(0, 0, 256, 256);
  if (stripe) {
    for (let i = 0; i < 256; i += 32) {
      ctx.fillStyle = 'rgba(240,225,190,0.35)';
      ctx.fillRect(i, 0, 9, 256);
      ctx.fillStyle = 'rgba(30,18,8,0.22)';
      ctx.fillRect(i + 16, 0, 5, 256);
    }
  }
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = rng() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.06)';
    ctx.fillRect(rng() * 256, rng() * 256, 2, 2);
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = 8;
  const mat = new THREE.MeshStandardMaterial({
    map,
    normalMap: loadTexture('velvet_normal.webp'),
    normalScale: new THREE.Vector2(0.35, 0.35),
    roughness: 0.96,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.6
  });
  mat.sheen = 0.6;
  mat.sheenRoughness = 0.7;
  mat.sheenColor = new THREE.Color(0xffe9c9);
  return mat;
}

export function thatchMaterial() {
  const rng = makeRng(77);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#a87c3f';
  ctx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 2600; i++) {
    const g = 0.6 + rng() * 0.8;
    ctx.strokeStyle = `rgba(${Math.floor(178 * g)},${Math.floor(132 * g)},${Math.floor(66 * g)},0.65)`;
    ctx.lineWidth = 1 + rng() * 2;
    const x = rng() * 256;
    const y = rng() * 256;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rng() - 0.5) * 6, y + 8 + rng() * 22);
    ctx.stroke();
  }
  const map = new THREE.CanvasTexture(canvas);
  map.wrapS = map.wrapT = THREE.RepeatWrapping;
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(3, 3);
  map.anisotropy = 8;
  return new THREE.MeshStandardMaterial({
    map,
    normalMap: loadTexture('wood_normal.webp'),
    normalScale: new THREE.Vector2(0.5, 0.5),
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
    envMapIntensity: 0.5
  });
}

export function metalMaterial(color = 0x8a6a2f) {
  return new THREE.MeshStandardMaterial({
    color,
    roughness: 0.36,
    metalness: 0.92,
    envMapIntensity: 1.25,
    normalMap: loadTexture('wood_normal.webp'),
    normalScale: new THREE.Vector2(0.15, 0.15)
  });
}

export function goldMaterial() {
  return new THREE.MeshStandardMaterial({
    color: 0xd9a537,
    roughness: 0.28,
    metalness: 1.0,
    envMapIntensity: 1.5
  });
}

let blobMat = null;
export function contactShadowMaterial() {
  if (blobMat) return blobMat;
  const size = 128;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d');
  const g = ctx.createRadialGradient(size / 2, size / 2, 2, size / 2, size / 2, size / 2);
  g.addColorStop(0.0, 'rgba(0,0,0,0.55)');
  g.addColorStop(0.45, 'rgba(0,0,0,0.34)');
  g.addColorStop(0.75, 'rgba(0,0,0,0.12)');
  g.addColorStop(1.0, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  const map = new THREE.CanvasTexture(canvas);
  map.colorSpace = THREE.SRGBColorSpace;
  blobMat = new THREE.MeshBasicMaterial({
    map, transparent: true, depthWrite: false, opacity: 0.85,
    color: 0x2a1c0e, blending: THREE.NormalBlending
  });
  blobMat.polygonOffset = true;
  blobMat.polygonOffsetFactor = -2;
  return blobMat;
}

export function skyDome() {
  const geo = new THREE.SphereGeometry(620, 32, 20);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x2f6fb4) },
      midColor: { value: new THREE.Color(0x84b4dd) },
      horizonColor: { value: new THREE.Color(0xead2a6) },
      groundColor: { value: new THREE.Color(0xbe9663) },
      sunDir: { value: new THREE.Vector3(0.55, 0.62, 0.42).normalize() },
      sunColor: { value: new THREE.Color(0xfff3d6) }
    },
    vertexShader: `
      varying vec3 vWorld;
      void main() {
        vec4 wp = modelMatrix * vec4(position, 1.0);
        vWorld = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 midColor;
      uniform vec3 horizonColor;
      uniform vec3 groundColor;
      uniform vec3 sunColor;
      uniform vec3 sunDir;
      varying vec3 vWorld;
      void main() {
        vec3 dir = normalize(vWorld);
        float h = dir.y;
        vec3 col = mix(horizonColor, midColor, smoothstep(0.0, 0.20, h));
        col = mix(col, topColor, smoothstep(0.16, 0.72, h));
        col = mix(groundColor, col, smoothstep(-0.10, 0.015, h));
        float sd = max(dot(dir, normalize(sunDir)), 0.0);
        col += sunColor * pow(sd, 1400.0) * 3.0;
        col += sunColor * pow(sd, 24.0) * 0.10;
        gl_FragColor = vec4(col, 1.0);
      }
    `
  });
  const dome = new THREE.Mesh(geo, mat);
  dome.frustumCulled = false;
  return dome;
}
