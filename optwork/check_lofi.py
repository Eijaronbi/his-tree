import asyncio, json
from playwright.async_api import async_playwright

PROBE = """() => {
  const g = window.__game, s = g.state, THREE = g.THREE;
  const player = s.player;
  const rig = (() => { let r = null; player.traverse(o => { if (o.userData && o.userData.poseRig) r = o; }); return r; })();
  const body = (() => { let b = null; player.traverse(o => { if (o.isMesh) b = o; }); return b; })();
  const out = { playerY: +player.position.y.toFixed(3), playerRotY: +player.rotation.y.toFixed(3) };
  const gh = s.controller && s.controller.groundHeightFn ? s.controller.groundHeightFn(player.position.x, player.position.z) : 0;
  out.groundY = +gh.toFixed(3);
  out.altAboveGround = +(player.position.y - gh).toFixed(3);
  if (rig) out.rigRot = [rig.rotation.x, rig.rotation.y, rig.rotation.z].map(v => +v.toFixed(3));
  if (body) {
    body.updateMatrixWorld(true);
    const q = body.getWorldQuaternion(new THREE.Quaternion());
    const fwd = new THREE.Vector3(0,0,1).applyQuaternion(q);
    const up = new THREE.Vector3(0,1,0).applyQuaternion(q);
    out.modelFwd = [fwd.x, fwd.y, fwd.z].map(v => +v.toFixed(3));
    out.modelUp = [up.x, up.y, up.z].map(v => +v.toFixed(3));
    const box = new THREE.Box3().setFromObject(body);
    const centre = box.getCenter(new THREE.Vector3());
    let top = null;
    const pos = body.geometry.attributes.position;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i += 7) {
      v.fromBufferAttribute(pos, i).applyMatrix4(body.matrixWorld);
      if (!top || v.y > top.y) top = v.clone();
    }
    out.headWorld = top ? [top.x, top.y, top.z].map(v => +v.toFixed(3)) : null;
    if (top) {
      const dir = top.clone().sub(centre).normalize();
      out.headDir = [dir.x, dir.y, dir.z].map(v => +v.toFixed(3));
      out.headUpDot = +dir.y.toFixed(3);
    }
    out.boxSize = [box.max.x-box.min.x, box.max.y-box.min.y, box.max.z-box.min.z].map(v => +v.toFixed(3));
  }
  out.flight = s.flight ? { mode: s.flight.mode, speed: +s.flight.speed.toFixed(2), bank: +s.flight.bank.toFixed(3), pitch: +s.flight.pitch.toFixed(3), alt: +s.flight.altitude.toFixed(2), turn: +s.flight.turn.toFixed(3), floatY: +s.flight.floatY.toFixed(2) } : null;
  out.pose = s.playerPose ? { uPose: s.playerPose.uniforms.uPose.value } : null;
  return out;
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':844,'height':390})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/?chapter=mali-1324&auto=1&cine=0&adapt=0&avatar=lofi', wait_until='load', timeout=240000)
        await pg.wait_for_function("() => !!(window.__game && window.__game.state.world && window.__game.state.player)", timeout=120000)
        await pg.wait_for_timeout(12000)
        print("GROUND", json.dumps(await pg.evaluate(PROBE)))
        await pg.keyboard.press('KeyG')
        await pg.wait_for_timeout(3500)
        print("FLY", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_fly.png')
        # steady right turn
        await pg.keyboard.down('KeyD')
        await pg.wait_for_timeout(2000)
        print("TURN_D", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_fly_bank.png')
        await pg.keyboard.up('KeyD')
        await pg.wait_for_timeout(1500)
        print("RELEASE", json.dumps(await pg.evaluate(PROBE)))
        # climb
        await pg.keyboard.down('KeyW')
        await pg.wait_for_timeout(2000)
        await pg.keyboard.up('KeyW')
        print("CLIMB", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_fly_climb.png')
        # land and float
        await pg.keyboard.press('KeyG')
        await pg.wait_for_timeout(2000)
        await pg.keyboard.press('KeyF')
        await pg.wait_for_timeout(3000)
        print("FLOAT", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_float.png')
        print("errors", errs[:3])
        await b.close()
asyncio.run(main())
