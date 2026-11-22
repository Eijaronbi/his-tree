import json
import time
from playwright.sync_api import sync_playwright

CHAPTERS = ["mali-1324", "washington-1865", "france-1917", "berlin-1989"]
OUT = "/data/home/luxin/perf-post-opt.txt"
lines = []

lines.append("HIS-TREE performance baseline (post-optimisation (meshopt+webp))")
lines.append("captured: " + time.strftime("%Y-%m-%d %H:%M:%S"))
lines.append("environment: headless chromium + swiftshader (software rasteriser), viewport 844x390, mobile emulation")
lines.append("note: absolute FPS here is software-rendered and NOT representative of a real GPU.")
lines.append("      Draw calls / triangles / memory / payload are the meaningful numbers.")
lines.append("")

with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage", "--use-gl=angle",
              "--use-angle=swiftshader", "--enable-unsafe-swiftshader"])
    for ch in CHAPTERS:
        ctx = br.new_context(viewport={"width": 844, "height": 390}, is_mobile=True, has_touch=True)
        pg = ctx.new_page()
        reqs = []
        pg.on("response", lambda r: reqs.append((r.status, r.url.split('/')[-1], int(r.headers.get('content-length') or 0))))
        errors = []
        pg.on("pageerror", lambda e: errors.append(str(e)[:160]))
        try:
            pg.goto(f"http://127.0.0.1:8099/?chapter={ch}&auto=1&cine=0&adapt=0", wait_until="load", timeout=240000)
            pg.wait_for_timeout(26000)
            res = pg.evaluate("""() => {
              const g = window.__game, s = g.state, r = g.renderer, i = r.info;
              let meshes = 0, tris = 0;
              g.scene.traverse(o => {
                if (!o.isMesh) return;
                meshes++;
                const idx = o.geometry && o.geometry.index ? o.geometry.index.count : (o.geometry && o.geometry.attributes && o.geometry.attributes.position ? o.geometry.attributes.position.count : 0);
                tris += (idx / 3) * (o.isInstancedMesh ? o.count : 1);
              });
              return {
                calls: i.render.calls, drawnTris: i.render.triangles,
                geometries: i.memory.geometries, textures: i.memory.textures,
                programs: i.programs ? i.programs.length : null,
                dpr: r.getPixelRatio(), sceneMeshes: meshes, sceneTris: Math.round(tris),
                npcs: Object.keys(s.npcs || {}).length,
                mounts: (s.mounts || []).length,
                drawCalls: r.info.render.calls,
                colliders: s.controller ? s.controller.colliders.length : 0,
                mergedMeshes: (() => { let n = 0; s.world.group.traverse(o => { if (o.isMesh && o.name === 'merged-static') n++; }); return n; })(),
                instancedMeshes: (() => { let n = 0; s.world.group.traverse(o => { if (o.isInstancedMesh) n++; }); return n; })()
              };
            }""")
            pg.evaluate("() => { const r = window.__game.renderer; r.info.autoReset = false; r.info.reset(); }")
            pg.wait_for_timeout(2000)
            perframe = pg.evaluate("""() => {
              const i = window.__game.renderer.info;
              const f = Math.max(1, i.render.frame);
              return { calls: Math.round(i.render.calls / f), tris: Math.round(i.render.triangles / f), frames: f };
            }""")
            pg.evaluate("() => { window.__game.renderer.info.autoReset = true; }")
            fps = pg.evaluate("""async () => {
              let n = 0; const t0 = performance.now();
              await new Promise(res => { function f() { n++; if (performance.now() - t0 < 6000) requestAnimationFrame(f); else res(); } requestAnimationFrame(f); });
              return +(n / ((performance.now() - t0) / 1000)).toFixed(1);
            }""")
            bytes = sum(x[2] for x in reqs)
            failed = [x for x in reqs if x[0] >= 400]
            lines.append(f"chapter: {ch}")
            lines.append("  fps(swiftshader): " + str(fps))
            lines.append("  draw calls/frame:  " + str(perframe["calls"]))
            lines.append("  triangles/frame:  " + str(perframe["tris"]))
            lines.append("  frames sampled:   " + str(perframe["frames"]))
            lines.append("  scene meshes:     " + str(res["sceneMeshes"]))
            lines.append("  scene triangles:  " + str(res["sceneTris"]))
            lines.append("  geometries:       " + str(res["geometries"]))
            lines.append("  textures:         " + str(res["textures"]))
            lines.append("  programs:         " + str(res["programs"]))
            lines.append("  npcs / mounts:    " + str(res["npcs"]) + " / " + str(res["mounts"]))
            lines.append("  requests:         " + str(len(reqs)) + "  bytes: " + str(bytes) + " (" + str(round(bytes / 1048576.0, 2)) + " MiB)")
            lines.append("  failed requests:  " + str(len(failed)) + ((" -> " + ", ".join(f[1] for f in failed[:6])) if failed else ""))
            lines.append("  page errors:      " + str(len(errors)) + ((" -> " + errors[0]) if errors else ""))
            lines.append("")
        except Exception as e:
            lines.append(f"chapter: {ch}\n  ERROR: {str(e)[:300]}\n")
        ctx.close()
    br.close()

with open(OUT, "w") as f:
    f.write("\n".join(lines) + "\n")
print("\n".join(lines))
