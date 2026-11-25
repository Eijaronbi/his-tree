import asyncio, base64, json, os, sys
from playwright.async_api import async_playwright

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(ROOT, "thumbs/faces")
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
YAW = 0.0  # full front: the witnesses face the camera

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
window.renderPortrait = async (url, yaw) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
  renderer.setPixelRatio(1);
  renderer.setSize(512, 512, false);
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
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const holder = new THREE.Group();
  holder.add(root);
  root.position.set(-center.x, -box.min.y, -center.z);
  const s = 1.72 / Math.max(0.05, size.y);
  holder.scale.setScalar(s);
  holder.rotation.y = yaw;
  holder.updateMatrixWorld(true);
  scene.add(holder);
  const target = new THREE.Vector3(0, 1.525, 0);
  const dist = 1.42;
  camera.position.set(target.x, target.y + 0.035, target.z + dist);
  camera.lookAt(target.x, target.y - 0.035, target.z);
  renderer.render(scene, camera);
  const data = canvas.toDataURL('image/png');
  renderer.dispose();
  return data;
};
window.__ready = true;
</script></body></html>"""

async def main():
    os.makedirs(OUT, exist_ok=True)
    tmp = os.path.join(ROOT, "portrait.html")
    with open(tmp, "w") as f:
        f.write(PAGE)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        pg = await b.new_page(viewport={'width': 512, 'height': 512})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/portrait.html', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => window.__ready === true", timeout=30000)
        for name, path in AVATARS:
            try:
                data = await pg.evaluate("async ([url, yaw]) => await window.renderPortrait(url, yaw)", [path, YAW])
                raw = base64.b64decode(data.split(',', 1)[1])
                with open(os.path.join(OUT, f"{name}.png"), "wb") as f:
                    f.write(raw)
                print(f"{name}: {len(raw)//1024} KiB", flush=True)
            except Exception as e:
                print(f"FAILED {name}: {e}", flush=True)
        await b.close()
        try:
            os.remove(tmp)
        except OSError:
            pass
        print("errors", errs[:3])

asyncio.run(main())
