import asyncio, json, os
from playwright.async_api import async_playwright

PROBE = """() => {
  const g = window.__game, s = g.state, THREE = g.THREE;
  const cam = g.camera, player = s.player;
  const dir = new THREE.Vector3(); cam.getWorldDirection(dir);
  let body = null; player.traverse(o => { if (o.isMesh && !body) body = o; });
  const out = {
    pov: !!s.controller.firstPerson,
    playerVisible: player.visible,
    camBehind: +cam.position.distanceTo(player.position).toFixed(2),
    camDir: [dir.x, dir.y, dir.z].map(v => +v.toFixed(2)),
    hudBtn: document.getElementById('btnView') ? document.getElementById('btnView').textContent : null,
    staleFlag: localStorage.getItem('his-tree:pov'),
    avatarMode: s.avatarMode
  };
  if (body) {
    const box = new THREE.Box3().setFromObject(body);
    out.bodyBox = [box.min.toArray().map(v=>+v.toFixed(2)), box.max.toArray().map(v=>+v.toFixed(2))];
  }
  return out;
}"""

async def main():
    async with async_playwright() as p:
        # persistent profile, seeded with the stale POV flag the old build saved
        ctx = await p.chromium.launch_persistent_context('/tmp/opencode/povprofile', executable_path='/usr/bin/chromium',
            headless=True, viewport={'width':844,'height':390},
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = ctx.pages[0] if ctx.pages else await ctx.new_page()
        await pg.goto('http://127.0.0.1:8101/', wait_until='domcontentloaded', timeout=120000)
        await pg.evaluate("() => localStorage.setItem('his-tree:pov','1')")
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8101/?chapter=mali-1324&auto=1&cine=0&avatar=lofi', wait_until='load', timeout=240000)
        await pg.wait_for_function("() => !!(window.__game && window.__game.state.world && window.__game.state.player)", timeout=150000)
        await pg.wait_for_timeout(15000)
        print("START", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/verify_avatar_start.png')
        await pg.click('#btnView')
        await pg.wait_for_timeout(2500)
        print("AFTER_CLICK_POV", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/verify_pov.png')
        await pg.click('#btnView')
        await pg.wait_for_timeout(2500)
        print("BACK_TO_AVATAR", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/verify_avatar_back.png')
        # fly in avatar mode
        await pg.keyboard.press('KeyG')
        await pg.wait_for_timeout(7000)
        print("AVATAR_FLY", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/verify_avatar_fly.png')
        print("errors", errs[:3])
        await ctx.close()
asyncio.run(main())
