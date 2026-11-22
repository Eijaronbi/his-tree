import asyncio, json
from playwright.async_api import async_playwright

PROBE = """() => {
  const g = window.__game, s = g.state, THREE = g.THREE;
  const player = s.player;
  const cam = g.camera;
  const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
  const size = new THREE.Vector2();
  g.renderer.getDrawingBufferSize(size);
  let lofiMesh = null;
  player.traverse(o => { if (o.isMesh && !lofiMesh) lofiMesh = o; });
  const out = {
    pov: !!s.controller.firstPerson,
    playerVisible: player.visible,
    camToPlayer: +cam.position.distanceTo(player.position).toFixed(2),
    camPos: [cam.position.x, cam.position.y, cam.position.z].map(v => +v.toFixed(2)),
    buffer: [Math.round(size.x), Math.round(size.y)],
    css: [window.innerWidth, window.innerHeight],
    quality: { tier: g.quality.tier, scale: g.quality.scale, dpr: +g.quality.dpr.toFixed(2), fps: Math.round(g.quality.fps) },
    hudBtn: (() => { const b = document.getElementById('btnView'); return b ? b.textContent : null; })(),
    avatarMode: s.avatarMode
  };
  if (s.flight) out.flight = { mode: s.flight.mode, alt: +s.flight.altitude.toFixed(2), speed: +s.flight.speed.toFixed(1) };
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
        print("AVATAR_LOFI", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_avatar.png')
        # fly in avatar mode
        await pg.keyboard.press('KeyG')
        await pg.wait_for_timeout(7000)
        print("AVATAR_FLY", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_avatar_fly.png')
        await pg.keyboard.press('KeyG')
        await pg.wait_for_timeout(2500)
        # toggle POV through the HUD button
        await pg.click('#btnView')
        await pg.wait_for_timeout(2000)
        print("POV", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/lofi_pov.png')
        # toggle back with the button
        await pg.click('#btnView')
        await pg.wait_for_timeout(2000)
        print("BACK_TO_AVATAR", json.dumps(await pg.evaluate(PROBE)))
        print("errors", errs[:3])
        await b.close()
asyncio.run(main())
