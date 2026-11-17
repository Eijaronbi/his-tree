import sys, os, json
from playwright.sync_api import sync_playwright

outdir = "/data/home/luxin/shots/verify"
os.makedirs(outdir, exist_ok=True)

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage",
              "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    ctx = br.new_context(viewport={"width": 1280, "height": 720})
    page = ctx.new_page()
    page.goto("http://127.0.0.1:8099/?chapter=washington-1865&auto=1", wait_until="load", timeout=180000)
    page.wait_for_timeout(9000)

    def snap(tag):
        return page.evaluate("""() => {
            const g = window.__game, s = g.state;
            const THREE = g.THREE;
            const box = new THREE.Box3().setFromObject(s.player);
            const c = new THREE.Vector3();
            box.getCenter(c);
            return {
                feetY: Math.round(box.min.y*100)/100,
                headY: Math.round(box.max.y*100)/100,
                pos: [Math.round(s.player.position.x*10)/10, Math.round(s.player.position.z*10)/10],
                rotY: Math.round(s.player.rotation.y*100)/100,
                cam: [Math.round(g.camera.position.x*10)/10, Math.round(g.camera.position.y*10)/10, Math.round(g.camera.position.z*10)/10]
            };
        }""")

    print("START", json.dumps(snap("start")), flush=True)
    page.screenshot(path=os.path.join(outdir, "v0_stand.png"))

    # strafe right (D) - should move toward screen-right and turn right
    page.keyboard.down("d"); page.wait_for_timeout(1300); page.keyboard.up("d")
    page.wait_for_timeout(500)
    print("STRAFE_D", json.dumps(snap("d")), flush=True)
    page.screenshot(path=os.path.join(outdir, "v1_strafe_d.png"))

    # strafe left (A)
    page.keyboard.down("a"); page.wait_for_timeout(1300); page.keyboard.up("a")
    page.wait_for_timeout(500)
    print("STRAFE_A", json.dumps(snap("a")), flush=True)

    # walk forward (W) - should move toward the stage (-Z), camera behind (+Z)
    page.keyboard.down("w"); page.wait_for_timeout(1300); page.keyboard.up("w")
    page.wait_for_timeout(500)
    print("WALK_W", json.dumps(snap("w")), flush=True)
    page.screenshot(path=os.path.join(outdir, "v2_walk.png"))

    # run
    page.keyboard.down("Shift"); page.keyboard.down("w")
    page.wait_for_timeout(1600)
    page.keyboard.up("w"); page.keyboard.up("Shift")
    page.wait_for_timeout(500)
    print("RUN", json.dumps(snap("run")), flush=True)
    page.screenshot(path=os.path.join(outdir, "v3_run.png"))

    ctx.close(); br.close()
