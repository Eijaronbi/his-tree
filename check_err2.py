import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width':844,'height':390})
        errs=[]; logs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)[:400]))
        pg.on('console', lambda m: logs.append(m.type+': '+m.text[:200]))
        await pg.goto('http://127.0.0.1:8099/?chapter=mali-1324&auto=1&cine=0&adapt=0', wait_until='load', timeout=120000)
        await pg.wait_for_timeout(15000)
        print("game?", await pg.evaluate("() => !!(window.__game && window.__game.state.world)"))
        print("errors:")
        for e in errs[:6]: print("  ", e)
        print("console:")
        for l in logs[:10]: print("  ", l)
        await b.close()
asyncio.run(main())
