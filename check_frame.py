import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        pg = await b.new_page(viewport={'width': 900, 'height': 900})
        await pg.goto('http://127.0.0.1:8099/?cine=0', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => !!window.__game", timeout=30000)
        await pg.wait_for_timeout(3500)
        await pg.evaluate("() => window.__openPicker()")
        await pg.wait_for_timeout(2500)
        out = await pg.evaluate("""() => {
          const p = window.__avatarPreview();
          const THREE = window.__game.THREE;
          const cam = p.camera;
          const holder = p.current;
          holder.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(holder);
          const size = new THREE.Vector3(); box.getSize(size);
          const headTop = box.max.y;
          const headBot = headTop - size.y * 0.15;
          let hmin = [1e9,1e9,1e9], hmax = [-1e9,-1e9,-1e9];
          const v = new THREE.Vector3();
          holder.traverse(o => {
            if (!o.isMesh || !o.geometry) return;
            const pos = o.geometry.attributes.position;
            if (!pos) return;
            for (let i = 0; i < pos.count; i += 3) {
              v.fromBufferAttribute(pos, i).applyMatrix4(o.matrixWorld);
              if (v.y >= headBot) {
                hmin = [Math.min(hmin[0],v.x),Math.min(hmin[1],v.y),Math.min(hmin[2],v.z)];
                hmax = [Math.max(hmax[0],v.x),Math.max(hmax[1],v.y),Math.max(hmax[2],v.z)];
              }
            }
          });
          const proj = (x,y,z) => { const q = new THREE.Vector3(x,y,z).project(cam); return [q.x,q.y]; };
          const hc = [(hmin[0]+hmax[0])/2,(hmin[1]+hmax[1])/2,(hmin[2]+hmax[2])/2];
          const ndc = proj(hc[0],hc[1],hc[2]);
          const full = [proj(box.min.x,box.max.y,box.min.z), proj(box.max.x,box.min.y,box.max.z)];
          return {
            height: size.y, headCenterNDC: ndc, headWidthM: hmax[0]-hmin[0],
            fullTopNDC: full[0], fullBotNDC: full[1],
            holderYawDeg: holder.rotation.y*180/Math.PI,
            groupYawDeg: p.group.rotation.y*180/Math.PI,
            aspect: cam.aspect,
          };
        }""")
        print(json.dumps(out, indent=1))
        await b.close()

asyncio.run(main())
