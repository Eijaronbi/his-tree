import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        for cid, shot in [('washington-1865','/data/home/his-tree/optwork/tex_wash.png'), ('mali-1324','/data/home/his-tree/optwork/tex_mali.png')]:
            pg = await b.new_page(viewport={'width':844,'height':390})
            errs=[]; fails=[]
            pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
            pg.on('response', lambda r: fails.append((r.status, r.url.split('/')[-1])) if r.status >= 400 else None)
            await pg.goto(f'http://127.0.0.1:8099/?chapter={cid}&auto=1&cine=0&adapt=0', wait_until='load', timeout=240000)
            await pg.wait_for_function("() => !!(window.__game && window.__game.state.world && window.__game.state.player)", timeout=120000)
            await pg.wait_for_timeout(14000)
            await pg.screenshot(path=shot)
            tex = await pg.evaluate("""() => {
              const r = window.__game.renderer;
              let webp = 0, other = 0;
              window.__game.scene.traverse(o => {
                if (!o.isMesh) return;
                const ms = Array.isArray(o.material) ? o.material : [o.material];
                for (const m of ms) {
                  if (!m || !m.map) continue;
                  const src = m.map.userData && m.map.userData.src ? m.map.userData.src : (m.map.name || '');
                  if (/webp/i.test(src) || /webp/i.test(m.map.name)) webp++; else other++;
                }
              });
              return { webp, other, textures: r.info.memory.textures, geometries: r.info.memory.geometries };
            }""")
            print(cid, json.dumps(tex), "failed:", fails[:5], "errors:", errs[:2])
            await pg.close()
        await b.close()
asyncio.run(main())
