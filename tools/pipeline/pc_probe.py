import json, time
from playwright.sync_api import sync_playwright
URL="https://perchance.org/ai-text-to-image-generator"
ev=[]
with sync_playwright() as p:
    br=p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox","--disable-dev-shm-usage"])
    page=br.new_page(viewport={"width":1200,"height":900})
    page.on("response", lambda r: ev.append(f"{r.status} {r.url[:110]}") if any(k in r.url for k in ("image-generation","perchance.org/api","generate")) else None)
    page.on("requestfailed", lambda r: ev.append(f"FAIL {r.failure} {r.url[:110]}"))
    page.goto(URL, wait_until="domcontentloaded", timeout=90000)
    fr=None
    for _ in range(60):
        for f in page.frames:
            try:
                if "ai-text-to-image" in f.url and f.locator('textarea[data-name="description"]').count(): fr=f;break
            except Exception: pass
        if fr: break
        page.wait_for_timeout(1200)
    fr.locator('textarea[data-name="description"]').fill("portrait photograph of a man, soft studio light, grey backdrop")
    fr.get_by_role("button", name="✨ generate").click()
    page.wait_for_timeout(45000)
    for e in ev[-12:]: print(e, flush=True)
    print("count", len(ev))
    br.close()
