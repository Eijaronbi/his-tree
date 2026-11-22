import asyncio, json
from playwright.async_api import async_playwright

async def run(url, label):
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':844,'height':390}, is_mobile=True, has_touch=True)
        errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto(url, wait_until='load', timeout=240000)
        await pg.wait_for_function("() => !!window.__game && !!window.__game.quality", timeout=60000)
        await pg.wait_for_timeout(14000)
        st = await pg.evaluate("""() => {
          const q = window.__game.quality;
          return { tier: q.tier, scale: +q.scale.toFixed(3), step: q.step, dpr: +q.dpr.toFixed(2),
                   shadows: q.shadows, fps: +q.fps.toFixed(1),
                   rendererDpr: window.__game.renderer.getPixelRatio(),
                   shadowMap: (()=>{ let s=null; window.__game.scene.traverse(o=>{ if(o.isDirectionalLight && o.shadow) s=o.shadow.mapSize.x; }); return s; })() };
        }""")
        print(label, json.dumps(st))
        if errs: print(label, "errors", errs[:3])
        await b.close()

async def main():
    await run("http://127.0.0.1:8099/?chapter=mali-1324&auto=1&cine=0", "ADAPT-ON")
    await run("http://127.0.0.1:8099/?chapter=mali-1324&auto=1&cine=0&adapt=0", "ADAPT-OFF")

asyncio.run(main())
