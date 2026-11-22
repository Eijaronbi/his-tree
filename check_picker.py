import asyncio, json
from playwright.async_api import async_playwright

FILES = {
    "frock": "./assets/models/characters/audience_lod/char_adult_m_frock.glb",
    "officer": "./assets/models/characters/audience_lod/char_adult_m_officer.glb",
    "elegant": "./assets/models/characters/audience_lod/char_adult_f_elegant.glb",
}

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        pg = await b.new_page(viewport={'width': 900, 'height': 900})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/?cine=0', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => !!window.__game", timeout=30000)
        await pg.wait_for_timeout(4000)
        await pg.evaluate("() => window.__openPicker()")
        await pg.wait_for_timeout(2500)
        snap = await pg.evaluate("""() => {
          const p = window.__avatarPreview();
          return {
            children: p.group.children.length,
            currentFile: p.currentFile,
            yaw: p.current ? p.current.rotation.y : null,
            camPos: [p.camera.position.x, p.camera.position.y, p.camera.position.z],
            raf: p.raf, paused: p._paused, cache: p.cache.size,
            canvas: [p.canvas.width, p.canvas.height],
            cards: document.querySelectorAll('.ap-card').length,
            visible: !!p.canvas.offsetParent,
          };
        }""")
        print("OPEN", json.dumps(snap))
        # rapid concurrent loads should leave exactly one character
        await pg.evaluate("""async () => {
          const p = window.__avatarPreview();
          const f = [%s];
          await Promise.all([p.load(f[0]), p.load(f[1]), p.load(f[2])]);
        }""" % ",".join('"%s"' % v for v in FILES.values()))
        snap2 = await pg.evaluate("() => { const p = window.__avatarPreview(); return {children: p.group.children.length, currentFile: p.currentFile, cache: p.cache.size}; }")
        print("RAPID", json.dumps(snap2))
        # cached reload timing
        t = await pg.evaluate("""async () => {
          const p = window.__avatarPreview();
          const a = performance.now();
          await p.load('%s');
          const b = performance.now();
          await p.load('%s');
          const c = performance.now();
          return {first: Math.round(b-a), cached: Math.round(c-b), children: p.group.children.length};
        }""" % (FILES["officer"], FILES["officer"]))
        print("TIMING", json.dumps(t))
        await pg.evaluate("() => window.__avatarPickerHide ? window.__avatarPickerHide() : document.dispatchEvent(new CustomEvent('avatarpicker:hide'))")
        await pg.wait_for_timeout(300)
        snap3 = await pg.evaluate("() => { const p = window.__avatarPreview(); return {raf: p.raf, paused: p._paused}; }")
        print("HIDDEN", json.dumps(snap3))
        print("ERRORS", errs[:5])
        await b.close()

asyncio.run(main())
