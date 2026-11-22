import asyncio, json
from playwright.async_api import async_playwright

PROBE = """() => {
  const g = window.__game, s = g.state, THREE = g.THREE;
  const cam = g.camera, player = s.player;
  let body = null; player.traverse(o => { if (o.isMesh && !body) body = o; });
  const out = {
    pov: !!s.controller.firstPerson,
    playerVisible: player.visible,
    hudBtn: document.getElementById('btnView') ? document.getElementById('btnView').textContent : null,
    dialogueOpen: (() => { const d = document.getElementById('dialog'); return d ? d.style.display !== 'none' : false; })(),
    camDist: +cam.position.distanceTo(player.position).toFixed(2)
  };
  if (body) {
    const box = new THREE.Box3().setFromObject(body);
    const pts = [];
    for (const x of [box.min.x, box.max.x]) for (const y of [box.min.y, box.max.y]) for (const z of [box.min.z, box.max.z]) {
      const p = new THREE.Vector3(x,y,z).project(cam);
      pts.push([(p.x*0.5+0.5)*window.innerWidth, (-p.y*0.5+0.5)*window.innerHeight]);
    }
    const xs = pts.map(p=>p[0]), ys = pts.map(p=>p[1]);
    out.screenBox = { x: Math.round(Math.min(...xs)), y: Math.round(Math.min(...ys)), w: Math.round(Math.max(...xs)-Math.min(...xs)), h: Math.round(Math.max(...ys)-Math.min(...ys)) };
    out.onScreen = out.screenBox.w > 30 && out.screenBox.h > 30 && out.screenBox.x > -out.screenBox.w && out.screenBox.x < window.innerWidth && out.screenBox.y > -out.screenBox.h && out.screenBox.y < window.innerHeight;
  }
  if (s.flight) out.flight = { mode: s.flight.mode, alt: +s.flight.altitude.toFixed(2), speed: +s.flight.speed.toFixed(1), bank: +s.flight.bank.toFixed(2) };
  const sz = new THREE.Vector2(); g.renderer.getDrawingBufferSize(sz);
  out.buffer = [Math.round(sz.x), Math.round(sz.y)];
  return out;
}"""

async def dismiss_dialogue(pg):
    for _ in range(4):
        open_state = await pg.evaluate("() => { const d = document.getElementById('dialog'); return d ? d.style.display !== 'none' : false; }")
        if not open_state:
            return False
        await pg.keyboard.press('KeyE')
        await pg.wait_for_timeout(700)
    return True

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':844,'height':390})
        errs=[]; pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/?chapter=mali-1324&cine=0&avatar=lofi', wait_until='load', timeout=240000)
        await pg.wait_for_function("() => !!(window.__game && window.__game.state.world && window.__game.state.player)", timeout=150000)
        await pg.wait_for_timeout(15000)
        await dismiss_dialogue(pg)
        await pg.wait_for_timeout(1200)
        print("A_GROUND_AVATAR", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/shot1_ground_avatar.png')
        await pg.keyboard.press('KeyG')
        await pg.wait_for_timeout(11000)
        print("B_FLY_AVATAR", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/shot2_fly_avatar.png')
        await pg.click('#btnView')
        await pg.wait_for_timeout(3500)
        print("C_FLY_POV", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/shot3_fly_pov.png')
        await pg.click('#btnView')
        await pg.wait_for_timeout(3500)
        print("D_FLY_AVATAR_AGAIN", json.dumps(await pg.evaluate(PROBE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/shot4_fly_avatar_again.png')
        print("errors", errs[:3])
        await b.close()
asyncio.run(main())
