import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--no-sandbox'])
        pg = await b.new_page(viewport={'width': 900, 'height': 900})
        await pg.goto('http://127.0.0.1:8099/?cine=0', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => !!window.__game", timeout=30000)
        await pg.wait_for_timeout(3500)
        await pg.evaluate("() => window.__openPicker()")
        await pg.wait_for_timeout(3000)
        stage = await pg.query_selector('.ap-stage')
        if stage:
            await stage.screenshot(path='/data/home/his-tree/picker_stage.png')
        await pg.screenshot(path='/data/home/his-tree/picker_full.png')
        # profile card + one hover for a second character
        await pg.evaluate("() => { const p=window.__avatarPreview(); return p.load('./assets/models/characters/audience_lod/char_adult_f_elegant.glb'); }")
        await pg.wait_for_timeout(1500)
        if stage:
            await stage.screenshot(path='/data/home/his-tree/picker_stage2.png')
        await b.close()
        print("shots done")

asyncio.run(main())
