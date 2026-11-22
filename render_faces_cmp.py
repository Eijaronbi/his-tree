import asyncio, base64, os
from playwright.async_api import async_playwright

ROOT = "/data/home/his-tree"
OUT = os.path.join(ROOT, "optwork/faces_cmp2.png")
PAIRS = [
    ("officer", "./assets/models/characters/audience_lod/char_adult_m_officer.glb",
     "./optwork/orig/char_adult_m_officer.glb"),
    ("elegant", "./assets/models/characters/audience_lod/char_adult_f_elegant.glb",
     "./optwork/clean/elegant.glb"),
    ("worker", "./assets/models/characters/audience_lod/char_worker.glb",
     "./optwork/orig/char_worker.glb"),
    ("lofi", "./assets/models/characters/lofi.glb",
     "./optwork/clean/lofi.glb"),
]
CELL = 210
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
window.renderCell = async (url, yaw) => {
  const size = 210;
  const canvas = document.createElement('canvas');
  canvas.width = size; canvas.height = size;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(size, size, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.14;
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 40);
  scene.add(new THREE.HemisphereLight(0xf6e7cb, 0x2a1d12, 1.05));
  const key = new THREE.DirectionalLight(0xffe9c6, 1.45); key.position.set(0.9, 1.7, 2.4); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd9b4, 0.55); fill.position.set(-1.8, 1.0, 1.6); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc98a, 0.5); rim.position.set(-1.0, 2.0, -1.6); scene.add(rim);
  scene.add(new THREE.AmbientLight(0xfff1dd, 0.38));
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene;
  root.updateMatrixWorld(true);
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
  const target = new THREE.Vector3(0, 1.525, 0);
  camera.position.set(0, 1.56, 1.42);
  camera.lookAt(0, 1.49, 0);
  renderer.render(scene, camera);
  const data = canvas.toDataURL('image/png');
  renderer.dispose();
  return data;
};
window.renderGrid = async (rows, cell, labelH) => {
  const out = document.createElement('canvas');
  out.width = rows[0].length * cell; out.height = rows.length * (cell + labelH);
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#17110a'; ctx.fillRect(0, 0, out.width, out.height);
  for (let r = 0; r < rows.length; r++) {
    for (let c = 0; c < rows[r].length; c++) {
      const data = await window.renderCell(rows[r][c], 0);
      const img = new Image();
      await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = data; });
      ctx.drawImage(img, c * cell, r * (cell + labelH) + labelH);
      ctx.fillStyle = '#d9a441'; ctx.font = 'bold 12px sans-serif';
      ctx.fillText(c === 0 ? rows[r][0] + ' BEFORE' : rows[r][0] + ' CLEANED', c * cell + 6, r * (cell + labelH) + labelH + 13);
    }
  }
  return out.toDataURL('image/png');
};
window.__ready = true;
</script></body></html>"""

async def main():
    with open(os.path.join(ROOT, "faces_cmp.html"), "w") as f:
        f.write(PAGE)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width': 512, 'height': 512})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/faces_cmp.html', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => window.__ready === true", timeout=30000)
        rows = [[opt, orig] for _, opt, orig in PAIRS]
        data = await pg.evaluate("async ([rows, cell, labelH]) => await window.renderGrid(rows, cell, labelH)", [rows, CELL, LABEL_H])
        raw = base64.b64decode(data.split(',', 1)[1])
        with open(OUT, "wb") as f:
            f.write(raw)
        print("cmp bytes", len(raw))
        try:
            os.remove(os.path.join(ROOT, "faces_cmp.html"))
        except OSError:
            pass
        print("errors", errs[:3])
        await b.close()

asyncio.run(main())
