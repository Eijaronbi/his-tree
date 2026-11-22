import asyncio, json
from playwright.async_api import async_playwright

PROBE = """() => {
  const g = window.__game, s = g.state, THREE = g.THREE;
  const player = s.player;
  const cam = g.camera;
  const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
  const out = {
    pov: !!s.controller.firstPerson,
    playerVisible: player.visible,
    playerY: +player.position.y.toFixed(3),
    camPos: [cam.position.x, cam.position.y, cam.position.z].map(v => +v.toFixed(3)),
    camDir: [dir.x, dir.y, dir.z].map(v => +v.toFixed(3)),
    camToPlayer: +cam.position.distanceTo(player.position).toFixed(3),
    eyeHeight: +s.controller.eyeHeight.toFixed(3),
    yaw: +s.controller.yaw.toFixed(3),
    playerRotY: +player.rotation.y.toFixed(3),
    avatarMode: s.avatarMode
  };
  if (s.flight) out.flight = { mode: s.flight.mode, alt: +s.flight.altitude.toFixed(2), bank: +s.flight.bank.toFixed(3) };
  return out;
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':844,'height':390})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/?chapter=mali-1324&auto=1&cine=0&adapt=0', wait_until='load', timeout=240000)
        await pg.wait_for_function("() => !!(window.__game && window.__game.state.world && window.__game.state.player)", timeout=120000)
        await pg.wait_for_timeout(12000)
        print("THIRD", json.dumps(await pg.evaluate(PROBE)))
        await pg.keyboard.press('KeyP')
        await pg.wait_for_timeout(1500)
        print("POV", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/pov_char.png')
        # walk forward in POV
        await pg.keyboard.down('KeyW')
        await pg.wait_for_timeout(2500)
        await pg.keyboard.up('KeyW')
        await pg.wait_for_timeout(800)
        print("POV_WALK", json.dumps(await pg.evaluate(PROBE)))
        # switch to Lofi, keep POV
        await pg.keyboard.press('KeyV')
        await pg.wait_for_timeout(9000)
        print("POV_LOFI", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/pov_lofi.png')
        # fly in POV
        await pg.keyboard.press('KeyG')
        await pg.wait_for_timeout(6000)
        print("POV_FLY", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/pov_lofi_fly.png')
        # back to third person
        await pg.keyboard.press('KeyP')
        await pg.wait_for_timeout(1500)
        print("THIRD_FLY", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/third_lofi_fly.png')
        print("errors", errs[:3])
        await b.close()
asyncio.run(main())
