import asyncio, json, sys
from playwright.async_api import async_playwright

async def run():
    out = []
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        for cid in ['mali-1324','washington-1865','france-1917','berlin-1989']:
            pg = await b.new_page(viewport={'width':844,'height':390})
            errs=[]; fails=[]
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.on('response', lambda r: fails.append((r.status, r.url.split('/')[-1])) if r.status >= 400 else None)
            await pg.goto(f'http://127.0.0.1:8101/?chapter={cid}&px=1&cine=0', wait_until='load', timeout=60000)
            try:
                await pg.wait_for_function("() => !!(window.__game && window.__game.state.world && window.__game.state.player)", timeout=60000)
            except Exception:
                pass
            await pg.wait_for_timeout(14000)
            info = await pg.evaluate("""() => {
              const st = window.__game.state;
              return { npcs: Object.keys(st.npcs).length, mounts: st.mounts.map(m=>m.kind), colliders: st.controller.colliders.length, chapter: st.chapter.id };
            }""")
            out.append({'chapter': cid, 'info': info, 'failed': fails[:6], 'errors': errs[:3]})
            await pg.close()
        await b.close()
    return out

print(json.dumps(asyncio.run(run()), indent=1))
