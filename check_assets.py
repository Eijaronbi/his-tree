import asyncio, json
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        ctx = await b.new_context(viewport={'width':844,'height':390}, is_mobile=True, has_touch=True)
        pg = await ctx.new_page()
        reqs = []
        pg.on('request', lambda r: reqs.append(r.url))
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/?chapter=mali-1324&auto=1&cine=0&adapt=0', wait_until='load', timeout=240000)
        await pg.wait_for_function("() => !!window.__game && !!window.__game.state.world", timeout=120000)
        await pg.wait_for_timeout(14000)
        versioned = [u for u in reqs if '/assets/' in u and 'v=v2' in u]
        unversioned = [u for u in reqs if '/assets/' in u and 'v=v2' not in u]
        print("assets requests:", len([u for u in reqs if '/assets/' in u]),
              "versioned:", len(versioned), "unversioned:", len(unversioned))
        print("sample:", versioned[0] if versioned else "none")
        if unversioned: print("UNVERSIONED sample:", unversioned[:3])
        failed = [u for u in reqs if '/assets/' in u and u.endswith('?v=v2')]
        reg = await pg.evaluate("""async () => {
          const regs = await navigator.serviceWorker.getRegistrations();
          const keys = await caches.keys();
          let cached = 0;
          for (const k of keys) { const c = await caches.open(k); cached += (await c.keys()).length; }
          const dbs = indexedDB.databases ? await indexedDB.databases() : [];
          return { regs: regs.length, scope: regs[0] ? regs[0].scope : null, cacheKeys: keys, cachedEntries: cached, dbs: dbs.map(d=>d.name) };
        }""")
        print("sw:", json.dumps(reg))
        # ask SW for idb status
        status = await pg.evaluate("""async () => {
          return await new Promise((resolve) => {
            const sw = navigator.serviceWorker.controller;
            if (!sw) { resolve({no:'controller'}); return; }
            const ch = new MessageChannel();
            ch.port1.onmessage = (e) => resolve(e.data);
            sw.postMessage({type:'his-tree:cache-status'}, [ch.port2]);
            setTimeout(() => resolve({timeout:true}), 5000);
          });
        }""")
        print("idb status:", json.dumps(status))
        print("errors:", errs[:3])
        await b.close()

asyncio.run(main())
