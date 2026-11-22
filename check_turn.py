import asyncio, json
from playwright.async_api import async_playwright

SAMPLE = """() => {
  const g = window.__game, s = g.state, THREE = g.THREE;
  const cam = g.camera, player = s.player;
  const rig = s.flight && s.flight.rig;
  const out = {};
  out.player = [ +player.position.x.toFixed(2), +player.position.y.toFixed(2), +player.position.z.toFixed(2) ];
  out.cam = [ +cam.position.x.toFixed(2), +cam.position.y.toFixed(2), +cam.position.z.toFixed(2) ];
  if (rig) {
    rig.updateMatrixWorld(true);
    const wp = new THREE.Vector3();
    rig.getWorldPosition(wp);
    out.rigWorld = [ +wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2) ];
    out.rigVisible = rig.visible;
    out.rigScale = [ +rig.scale.x.toFixed(2), +rig.scale.y.toFixed(2), +rig.scale.z.toFixed(2) ];
    out.rigRot = [ +rig.rotation.x.toFixed(3), +rig.rotation.y.toFixed(3), +rig.rotation.z.toFixed(3) ];
    const box = new THREE.Box3().setFromObject(rig);
    out.rigBox = { min: [ +box.min.x.toFixed(2), +box.min.y.toFixed(2), +box.min.z.toFixed(2) ], max: [ +box.max.x.toFixed(2), +box.max.y.toFixed(2), +box.max.z.toFixed(2) ] };
    const centre = box.getCenter(new THREE.Vector3());
    const proj = centre.clone().project(cam);
    out.rigCentreScreen = [ Math.round((proj.x*0.5+0.5)*window.innerWidth), Math.round((-proj.y*0.5+0.5)*window.innerHeight), +proj.z.toFixed(3) ];
    const dir = centre.clone().sub(cam.position).normalize();
    const camDir = new THREE.Vector3(); cam.getWorldDirection(camDir);
    out.dot = +dir.dot(camDir).toFixed(3);
    out.dist = +centre.distanceTo(cam.position).toFixed(2);
  }
  out.vel = s.controller.velocity ? [ +s.controller.velocity.x.toFixed(2), +s.controller.velocity.y.toFixed(2), +s.controller.velocity.z.toFixed(2) ] : null;
  out.yaw = +s.controller.yaw.toFixed(3);
  out.pitch = +s.controller.pitch.toFixed(3);
  out.distC = +s.controller.distance.toFixed(2);
  if (s.flight) out.flight = { mode: s.flight.mode, alt: +s.flight.altitude.toFixed(2), bank: +s.flight.bank.toFixed(3), turn: +(s.flight.turn||0).toFixed(3) };
  return out;
}"""

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':844,'height':390})
        await pg.goto('http://127.0.0.1:8099/?chapter=mali-1324&cine=0&avatar=lofi', wait_until='load', timeout=240000)
        await pg.wait_for_function("() => !!(window.__game && window.__game.state.world && window.__game.state.player)", timeout=150000)
        await pg.wait_for_timeout(14000)
        for _ in range(4):
            open_state = await pg.evaluate("() => { const d = document.getElementById('dialog'); return d ? d.style.display !== 'none' : false; }")
            if not open_state: break
            await pg.keyboard.press('KeyE'); await pg.wait_for_timeout(600)
        await pg.keyboard.press('KeyG')
        await pg.wait_for_timeout(9000)
        print("STEADY", json.dumps(await pg.evaluate(SAMPLE)))
        await pg.keyboard.down('KeyD')
        for i in range(6):
            await pg.wait_for_timeout(700)
            print("TURN%d" % i, json.dumps(await pg.evaluate(SAMPLE)))
        await pg.keyboard.up('KeyD')
        await pg.wait_for_timeout(1200)
        print("AFTER", json.dumps(await pg.evaluate(SAMPLE)))
        await pg.screenshot(path='/data/home/his-tree/optwork/shot6_fly_bank.png')
        await b.close()
asyncio.run(main())
