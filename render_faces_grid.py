import asyncio, base64, os
from playwright.async_api import async_playwright

ROOT = "/data/home/his-tree"
OUT = os.path.join(ROOT, "optwork/face_yaw_grid.png")
AVATARS = [
    ("frock", "./assets/models/characters/audience_lod/char_adult_m_frock.glb"),
    ("officer", "./assets/models/characters/audience_lod/char_adult_m_officer.glb"),
    ("elegant", "./assets/models/characters/audience_lod/char_adult_f_elegant.glb"),
    ("simple", "./assets/models/characters/audience_lod/char_adult_f_simple.glb"),
    ("worker", "./assets/models/characters/audience_lod/char_worker.glb"),
    ("soldier", "./assets/models/characters/audience_lod/char_soldier_blue.glb"),
    ("elder-m", "./assets/models/characters/audience_lod/char_old_m_top.glb"),
    ("elder-f", "./assets/models/characters/audience_lod/char_old_f_bonnet.glb"),
    ("lofi", "./assets/models/characters/lofi.glb"),
]
YAWS = [0.0, 3.14159]
CELL = 170
LABEL_H = 18

PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent}</style></head>
<body><script type="importmap">
{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
await MeshoptDecoder.ready;
const cache = new Map();
async function getModel(url) {
  if (!cache.has(url)) {
    const gltf = await loader.loadAsync(url);
    cache.set(url, gltf.scene);
  }
  return cache.get(url);
}
window.renderCell = async (url, yaw) => {
  const size = 170;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 40);
  scene.add(new THREE.HemisphereLight(0xf6e7cb, 0x2a1d12, 1.0));
  const key = new THREE.DirectionalLight(0xffe9c6, 1.6); key.position.set(1.6, 2.2, 2.0); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd9b4, 0.6); fill.position.set(-2.0, 1.2, 1.2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc98a, 0.7); rim.position.set(-1.0, 2.2, -2.0); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xfff1dd, 0.30));
  const root = await getModel(url);
  const box = new THREE.Box3().setFromObject(root);
  const bsize = new THREE.Vector3(); box.getSize(bsize);
  const center = new THREE.Vector3(); box.getCenter(center);
  const holder = new THREE.Group();
  holder.add(root);
  root.position.set(-center.x, -box.min.y, -center.z);
  const s = 1.72 / Math.max(0.05, bsize.y);
  holder.scale.setScalar(s);
  holder.rotation.y = yaw;
  holder.updateMatrixWorld(true);
  scene.add(holder);
  const target = new THREE.Vector3(0, 1.50, 0);
  camera.position.set(0, 1.53, 1.50);
  camera.lookAt(0, 1.455, 0);
  renderer.render(scene, camera);
  const data = canvas.toDataURL('image/png');
  renderer.dispose();
  return data;
};
window.renderGrid = async (rows, yaws, cell, labelH) => {
  const w = yaws.length * cell;
  const h = rows.length * (cell + labelH);
  const out = document.createElement('canvas');
  out.width = w; out.height = h;
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#17110a'; ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = '#e8d3ae'; ctx.font = 'bold 13px sans-serif';
  for (let c = 0; c < yaws.length; c++) ctx.fillText('yaw ' + yaws[c].toFixed(2), c * cell + 6, 14);
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < yaws.length; c++) {
      const data = await window.renderCell(rows[r][1], yaws[c]);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = data; });
      ctx.drawImage(img, c * cell, r * (cell + labelH) + labelH);
      ctx.fillStyle = '#d9a441'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(rows[r][0], c * cell + 6, r * (cell + labelH) + labelH + 13);
    }
  }
  return out.toDataURL('image/png');
};
window.__ready = true;
</script></body></html>"""

async def main():
    with open(os.path.join(ROOT, "portrait_grid.html"), "w") as f:
        f.write(PAGE)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        pg = await b.new_page(viewport={'width': 512, 'height': 512})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/portrait_grid.html', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => window.__ready === true", timeout=30000)
        data = await pg.evaluate("async ([rows, yaws, cell, labelH]) => await window.renderGrid(rows, yaws, cell, labelH)",
                                 [AVATARS, YAWS, CELL, LABEL_H])
        raw = base64.b64decode(data.split(',', 1)[1])
        with open(OUT, "wb") as f:
            f.write(raw)
        print("grid bytes", len(raw))
        try:
            os.remove(os.path.join(ROOT, "portrait_grid.html"))
        except OSError:
            pass
        print("errors", errs[:3])
        await b.close()

asyncio.run(main())
