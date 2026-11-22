import asyncio
from playwright.async_api import async_playwright
ROOT="/data/home/his-tree"
PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style></head>
<body><script type="importmap">
{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
window.probe = async (url) => {
  const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder);
  const g = await l.loadAsync(url);
  const sz = new THREE.Vector3(); new THREE.Box3().setFromObject(g.scene).getSize(sz);
  let meshes=0, skinned=0, mats=[];
  g.scene.traverse(o=>{ if(o.isMesh){meshes++; if(o.isSkinnedMesh) skinned++; const m=o.material; mats.push([m.type, !!(m.map&&m.map.image), m.map?m.map.image.width+'x'+m.map.image.height:'no', m.color?m.color.getHexString():'']);} });
  return {meshes, skinned, size:[+sz.x.toFixed(3),+sz.y.toFixed(3),+sz.z.toFixed(3)], mats};
};
window.shot = async (url) => {
  const canvas = document.createElement('canvas'); canvas.width=256; canvas.height=256;
  const renderer = new THREE.WebGLRenderer({ canvas, alpha:false, antialias:true });
  renderer.setPixelRatio(1); renderer.setSize(256,256,false);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x14100c,1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(26,1,0.05,40);
  scene.add(new THREE.HemisphereLight(0xf6e7cb,0x2a1d12,1.0));
  const l = new GLTFLoader(); l.setMeshoptDecoder(MeshoptDecoder);
  const g = await l.loadAsync(url);
  const root=g.scene; root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root); const size=new THREE.Vector3(); box.getSize(size);
  const center=new THREE.Vector3(); box.getCenter(center);
  const holder=new THREE.Group(); holder.add(root);
  root.position.set(-center.x,-box.min.y,-center.z);
  holder.scale.setScalar(1.72/Math.max(0.05,size.y)); holder.rotation.y=-1.38; scene.add(holder);
  camera.position.set(0,1.53,1.5); camera.lookAt(0,1.455,0);
  renderer.render(scene,camera);
  const d=canvas.toDataURL('image/png'); renderer.dispose(); return d.length;
};
window.__ready = true;
</script></body></html>"""

async def main():
    tmp=ROOT+"/abdbg.html"
    open(tmp,"w").write(PAGE)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':256,'height':256})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:300]))
        pg.on('console', lambda m: errs.append('console:'+m.text[:200]))
        await pg.goto('http://127.0.0.1:8099/abdbg.html', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => window.__ready===true", timeout=30000)
        for url in ["/assets/models/characters/audience_lod/char_adult_m_frock.glb","/optwork/frock_final.glb"]:
            try:
                print(url, await pg.evaluate("u=>window.probe(u)", url))
                print("  shotlen", await pg.evaluate("u=>window.shot(u)", url))
            except Exception as e:
                print(url, "ERR", str(e)[:300])
        print("errs", errs[:6])
        await b.close()
    import os
    os.remove(tmp)
asyncio.run(main())
