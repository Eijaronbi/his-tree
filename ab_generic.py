import asyncio, base64, os
from playwright.async_api import async_playwright
ROOT="/data/home/his-tree"; OUT=ROOT+"/optwork"

PAIRS=[
 ("lofi", "/assets/models_original/characters/lofi.glb", "/assets/models/characters/lofi.glb", 1.4),
 ("house", "/assets/models_original/generated/mali_house_glb.glb", "/assets/models/generated/mali_house_glb.glb", 1.8),
 ("lincoln", "/assets/models_original/characters/lincoln_color.glb", "/assets/models/characters/lincoln_color.glb", 1.4),
 ("trench", "/assets/models_original/props/trench_corner.glb", "/assets/models/props/trench_corner.glb", 1.6),
 ("horse", "/assets/models_original/horse-base.glb", "/assets/models/horse-base.glb", 1.6),
]

PAGE = """<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:#000}</style></head>
<body><script type="importmap">
{"imports":{"three":"/vendor/three/three.module.js","three/addons/":"/vendor/three/addons/"}}
</script>
<script type="module">
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
const canvas = document.createElement('canvas'); canvas.width=512; canvas.height=512;
const renderer = new THREE.WebGLRenderer({ canvas, alpha:false, antialias:true });
renderer.setPixelRatio(1); renderer.setSize(512,512,false);
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.setClearColor(0x17120d,1);
const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xf6e7cb,0x2a1d12,1.05));
const key=new THREE.DirectionalLight(0xffe9c6,1.7); key.position.set(2.2,3.2,2.6); scene.add(key);
const fill=new THREE.DirectionalLight(0xffd9b4,0.65); fill.position.set(-2.4,1.4,1.8); scene.add(fill);
const rim=new THREE.DirectionalLight(0xffc98a,0.8); rim.position.set(-1.2,2.6,-2.4); scene.add(rim);
const camera = new THREE.PerspectiveCamera(30,1,0.05,200);
const loader = new GLTFLoader(); loader.setMeshoptDecoder(MeshoptDecoder);
window.renderShot = async (url, zoom) => {
  const g = await loader.loadAsync(url);
  const root=g.scene; root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(root);
  const size=new THREE.Vector3(); box.getSize(size);
  const center=new THREE.Vector3(); box.getCenter(center);
  const holder=new THREE.Group(); holder.add(root);
  root.position.set(-center.x,-center.y,-center.z);
  scene.add(holder);
  const maxd=Math.max(size.x,size.y,size.z);
  camera.position.set(maxd*zoom*0.55, maxd*zoom*0.30, maxd*zoom*0.95);
  camera.lookAt(0,0,0);
  renderer.compile(scene,camera);
  renderer.render(scene,camera);
  renderer.render(scene,camera);
  const d=canvas.toDataURL('image/png');
  scene.remove(holder);
  holder.traverse(o=>{ if(o.isMesh){ o.geometry.dispose(); const ms=Array.isArray(o.material)?o.material:[o.material]; ms.forEach(m=>m&&m.dispose()); }});
  return d;
};
window.__ready = true;
</script></body></html>"""

async def main():
    tmp=ROOT+"/abgen.html"; open(tmp,"w").write(PAGE)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg=await b.new_page(viewport={'width':512,'height':512})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/abgen.html', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => window.__ready===true", timeout=30000)
        for name, orig, opt, zoom in PAIRS:
            for tag, url in (("orig",orig),("opt",opt)):
                try:
                    data=await pg.evaluate("async ([u,z])=>await window.renderShot(u,z)", [url, zoom])
                    raw=base64.b64decode(data.split(',',1)[1])
                    open(os.path.join(OUT,f"abg_{name}_{tag}.png"),"wb").write(raw)
                    print(name,tag,len(raw)//1024,"KiB",flush=True)
                except Exception as e:
                    print(name,tag,"ERR",str(e)[:200],flush=True)
        print("errors", errs[:3])
        await b.close()
    try: os.remove(tmp)
    except OSError: pass
asyncio.run(main())
