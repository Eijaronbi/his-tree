import asyncio, base64, os
from playwright.async_api import async_playwright

ROOT = "/data/home/his-tree"
OUT = "/data/home/his-tree/optwork"

PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style></head>
<body><script type="importmap">
{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
window.renderShot = async (url, yaw) => {
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha: false, antialias: true });
  renderer.setPixelRatio(1); renderer.setSize(512, 512, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x14100c, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26, 1, 0.05, 40);
  scene.add(new THREE.HemisphereLight(0xf6e7cb, 0x2a1d12, 1.0));
  const key = new THREE.DirectionalLight(0xffe9c6, 1.6); key.position.set(1.6, 2.2, 2.0); scene.add(key);
  const fill = new THREE.DirectionalLight(0xffd9b4, 0.6); fill.position.set(-2.0, 1.2, 1.2); scene.add(fill);
  const rim = new THREE.DirectionalLight(0xffc98a, 0.7); rim.position.set(-1.0, 2.2, -2.0); scene.add(rim);
  const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
  const gltf = await loader.loadAsync(url);
  const root = gltf.scene; root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = new THREE.Vector3(); box.getSize(size);
  const center = new THREE.Vector3(); box.getCenter(center);
  const holder = new THREE.Group(); holder.add(root);
  root.position.set(-center.x, -box.min.y, -center.z);
  holder.scale.setScalar(1.72 / Math.max(0.05, size.y));
  holder.rotation.y = yaw;
  scene.add(holder);
  const target = new THREE.Vector3(0, 1.50, 0);
  camera.position.set(target.x, target.y + 0.03, target.z + 1.5);
  camera.lookAt(target.x, target.y - 0.045, target.z);
  renderer.compile(scene, camera);
  renderer.render(scene, camera);
  renderer.render(scene, camera);
  const data = canvas.toDataURL('image/png');
  renderer.dispose();
  return data;
};
window.__ready = true;
</script></body></html>"""

async def main():
    tmp = os.path.join(ROOT, "ab.html")
    with open(tmp, "w") as f:
        f.write(PAGE)
    pairs = [
        ("frock", "/assets/models/characters/audience_lod/char_adult_m_frock.glb", "/optwork/frock_final.glb"),
        ("lofi", "/assets/models/characters/lofi.glb", None),
    ]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        pg = await b.new_page(viewport={'width': 512, 'height': 512})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/ab.html', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => window.__ready === true", timeout=30000)
        for name, orig, opt in pairs:
            if not opt:
                continue
            for tag, url in (("orig", orig), ("opt", opt)):
                data = await pg.evaluate("async ([u]) => await window.renderShot(u, -1.38)", [url])
                raw = base64.b64decode(data.split(',', 1)[1])
                with open(os.path.join(OUT, f"ab_{name}_{tag}.png"), "wb") as f:
                    f.write(raw)
                print(name, tag, len(raw)//1024, "KiB", flush=True)
        await b.close()
        try:
            os.remove(tmp)
        except OSError:
            pass
        print("errors", errs[:3])

asyncio.run(main())
