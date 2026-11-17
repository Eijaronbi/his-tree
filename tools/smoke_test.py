import sys, os, time, json
from playwright.sync_api import sync_playwright

CHAPTERS = ["mali-1324", "washington-1865", "france-1917", "berlin-1989"]
outdir = "/data/home/luxin/shots/smoke"
os.makedirs(outdir, exist_ok=True)

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage",
              "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
              "--disable-background-timer-throttling", "--disable-renderer-backgrounding"])
    ctx = br.new_context(viewport={"width": 1280, "height": 720})
    page = ctx.new_page()
    errors = []
    page.on("console", lambda m: errors.append(f"{m.type}: {m.text[:160]}") if m.type == "error" else None)
    page.on("pageerror", lambda e: errors.append(f"PAGEERROR: {str(e)[:160]}"))

    for ch in CHAPTERS:
        errors.clear()
        page.goto(f"http://127.0.0.1:8099/?chapter={ch}&auto=1", wait_until="load", timeout=180000)
        page.wait_for_timeout(9000)
        state = page.evaluate("""() => {
            const g = window.__game;
            if (!g) return {ok:false, why:'no __game'};
            const s = g.state;
            return {
                ok: !!s.world && !!s.player,
                world: !!s.world,
                player: !!s.player,
                npcs: Object.keys(s.npcs || {}).length,
                quest: !!s.quest,
                chapter: s.chapter ? s.chapter.id : null,
                playerPos: s.player ? [Math.round(s.player.position.x*10)/10, Math.round(s.player.position.y*10)/10, Math.round(s.player.position.z*10)/10] : null,
                camPos: [Math.round(g.camera.position.x*10)/10, Math.round(g.camera.position.y*10)/10, Math.round(g.camera.position.z*10)/10],
                drawCalls: g.renderer.info.render.calls,
                triangles: g.renderer.info.render.triangles,
                textures: g.renderer.info.memory.textures,
                geometries: g.renderer.info.memory.geometries,
                programs: g.renderer.info.programs ? g.renderer.info.programs.length : -1
            };
        }""")
        page.screenshot(path=os.path.join(outdir, f"{ch}.png"))
        # exercise movement + interaction
        page.keyboard.press("e"); page.wait_for_timeout(500)
        page.keyboard.down("w"); page.wait_for_timeout(1400); page.keyboard.up("w")
        page.wait_for_timeout(600)
        moved = page.evaluate("() => { const s=window.__game.state; return s.player ? [Math.round(s.player.position.x*10)/10, Math.round(s.player.position.z*10)/10] : null; }")
        real = [e for e in errors if "favicon" not in e.lower()]
        print(json.dumps({
            "chapter": ch, "state": state, "afterMove": moved,
            "errors": real[:4], "errorCount": len(real)
        }), flush=True)
    ctx.close(); br.close()
