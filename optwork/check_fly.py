import asyncio, json
from playwright.async_api import async_playwright

PROBE = """() => {
  const g = window.__game, s = g.state, THREE = g.THREE;
  const player = s.player;
  const cam = g.camera;
  const rig = (() => { let r = null; player.traverse(o => { if (o.userData && o.userData.poseRig) r = o; }); return r; })();
  let body = null; player.traverse(o => { if (o.isMesh && !body) body = o; });
  const out = { camToPlayer: +cam.position.distanceTo(player.position).toFixed(2) };
  // where is the character on screen?
  const chest = player.position.clone(); chest.y += 0.9;
  const ndc = chest.clone().project(cam);
  out.ndc = [ +ndc.x.toFixed(2), +ndc.y.toFixed(2) ];
  out.pixelOffset = [ Math.round((ndc.x*0.5+0.5)*window.innerWidth - window.innerWidth/2), Math.round((-ndc.y*0.5+0.5)*window.innerHeight - window.innerHeight/2) ];
  if (rig) out.rigRot = [rig.rotation.x, rig.rotation.y, rig.rotation.z].map(v => +v.toFixed(3));
  if (body) {
    body.updateMatrixWorld(true);
    const q = body.getWorldQuaternion(new THREE.Quaternion());
    const fwd = new THREE.Vector3(0,0,1).applyQuaternion(q);
    const up = new THREE.Vector3(0,1,0).applyQuaternion(q);
    out.modelFwd = [fwd.x, fwd.y, fwd.z].map(v => +v.toFixed(2));
    out.modelUp = [up.x, up.y, up.z].map(v => +v.toFixed(2));
    const box = new THREE.Box3().setFromObject(body);
    const centre = box.getCenter(new THREE.Vector3());
    let top = null, low = null;
    const pos = body.geometry.attributes.position; const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 5) {
      v.fromBufferAttribute(pos, i).applyMatrix4(body.matrixWorld);
      if (!top || v.y > top.y) top = v.clone();
      if (!low || v.y < low.y) low = v.clone();
    }
    out.headAboveCentre = top ? +(top.y - centre.y).toFixed(2) : null;
    out.bodyLen = +Math.max(box.max.x-box.min.x, box.max.z-box.min.z).toFixed(2);
    out.bodyHeight = +(box.max.y-box.min.y).toFixed(2);
    out.headVsFeet = (top && low) ? +(top.y - low.y).toFixed(2) : null;
  }
  if (s.flight) out.flight = { mode: s.flight.mode, alt: +s.flight.altitude.toFixed(2), speed: +s.flight.speed.toFixed(1), bank: +s.flight.bank.toFixed(2) };
  out.playerY = +player.position.y.toFixed(2);
  return out;
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':844,'height':390})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/?chapter=mali-1324&auto=1&cine=0&avatar=lofi', wait_until='load', timeout=240000)
        await pg.wait_for_function("() => !!(window.__game && window.__game.state.world && window.__game.state.player)", timeout=120000)
        await pg.wait_for_timeout(14000)
        print("GROUND", json.dumps(await pg.evaluate(PROBE)))
        await pg.keyboard.press('KeyG')
        await pg.wait_for_timeout(4000)
        print("FLY", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_fly2.png')
        await pg.wait_for_timeout(3000)
        print("FLY2", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_fly3.png')
        await pg.keyboard.down('KeyD')
        await pg.wait_for_timeout(2500)
        await pg.keyboard.up('KeyD')
        print("BANK", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_bank2.png')
        print("errors", errs[:3])
        await b.close()
asyncio.run(main())
