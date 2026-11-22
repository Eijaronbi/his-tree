import asyncio, json, os
from playwright.async_api import async_playwright
ROOT="/data/home/his-tree"

PAGE = """<!doctype html><html><head><meta charset="utf-8"></head><body>
<script type="importmap">
{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
window.loadOne = async (url) => {
  const t0 = performance.now();
  try {
    const g = await loader.loadAsync(url);
    const dt = performance.now() - t0;
    let meshes = 0, verts = 0, mats = 0, tex = 0, anims = g.animations.length;
    const seenM = new Set();
    g.scene.traverse(o => {
      if (!o.isMesh) return;
      meshes++;
      if (o.geometry && o.geometry.attributes.position) verts += o.geometry.attributes.position.count;
      const list = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of list) {
        if (!m || seenM.has(m.uuid)) continue;
        seenM.add(m.uuid); mats++;
        for (const k of ['map','normalMap','roughnessMap','metalnessMap','emissiveMap','aoMap','specularMap']) {
          if (m[k] && m[k].image) tex++;
        }
      }
    });
    const sz = new THREE.Vector3(); new THREE.Box3().setFromObject(g.scene).getSize(sz);
    return {ok:true, ms:Math.round(dt), meshes, verts, mats, tex, anims, y:+sz.y.toFixed(3)};
  } catch (e) {
    return {ok:false, err:String(e).slice(0,220)};
  }
};
window.__ready = true;
</script></body></html>"""

async def main():
    tmp = ROOT + "/glbcheck.html"
    open(tmp,"w").write(PAGE)
    items = [l.strip() for l in open(ROOT + "/optwork/glb_list.txt") if l.strip()]
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':640,'height':480})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/glbcheck.html', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => window.__ready===true", timeout=30000)
        results = []
        for rel in items:
            url = "/assets/models/" + rel
            r = await pg.evaluate("u=>window.loadOne(u)", url)
            r['file'] = rel
            results.append(r)
            if not r.get('ok'):
                print("FAIL", rel, r.get('err'))
        ok = [r for r in results if r.get('ok')]
        bad = [r for r in results if not r.get('ok')]
        print("TOTAL", len(results), "OK", len(ok), "BAD", len(bad))
        print("meshes", sum(r['meshes'] for r in ok), "verts", sum(r['verts'] for r in ok),
              "tex", sum(r['tex'] for r in ok), "anims", sum(r['anims'] for r in ok))
        slow = sorted(ok, key=lambda r: -r['ms'])[:5]
        print("slowest", [(r['file'], r['ms']) for r in slow])
        json.dump(results, open(ROOT + "/optwork/glbcheck.json","w"), indent=1)
        print("errors", errs[:3])
        await b.close()
    try: os.remove(tmp)
    except OSError: pass

asyncio.run(main())
