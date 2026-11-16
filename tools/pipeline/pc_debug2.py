import os, time, json
from playwright.sync_api import sync_playwright
CDP=os.environ.get("CDP","http://127.0.0.1:9336")
URL="https://perchance.org/ai-text-to-image-generator"
logs=[]; reqs=[]
with sync_playwright() as p:
    br=p.chromium.connect_over_cdp(CDP, timeout=120000)
    page=br.contexts[0].new_page(); page.set_default_timeout(90000)
    page.on("console", lambda m: logs.append(m.type+": "+m.text[:200]))
    page.on("request", lambda r: reqs.append(r.url[:160]) if "image-generation" in r.url or "generate" in r.url else None)
    page.on("response", lambda r: logs.append(f"RESP {r.status} {r.url[:120]}") if "image-generation" in r.url else None)
    page.goto(URL, wait_until="domcontentloaded", timeout=120000)
    fr=None
    for _ in range(80):
        for f in page.frames:
            try:
                if "ai-text-to-image" in f.url and f.locator('textarea[data-name="description"]').count(): fr=f;break
            except Exception: pass
        if fr: break
        page.wait_for_timeout(1500)
    fr.locator('textarea[data-name="description"]').fill("portrait photograph of a man, studio light, grey backdrop")
    # try clicking via JS dispatch too
    btn = fr.get_by_role("button", name="✨ generate")
    print("btn visible", btn.is_visible(), flush=True)
    btn.click()
    page.wait_for_timeout(3000)
    fr.evaluate("()=>{const b=[...document.querySelectorAll('button')].find(x=>x.innerText.includes('generate')); if(b) b.click();}")
    page.wait_for_timeout(20000)
    print("LOGS", json.dumps(logs[-15:], indent=1)[:1500], flush=True)
    print("REQS", json.dumps(reqs[-10:], indent=1)[:800], flush=True)
