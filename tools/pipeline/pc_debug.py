import os, time, json
from playwright.sync_api import sync_playwright
CDP=os.environ.get("CDP","http://127.0.0.1:9335")
URL="https://perchance.org/ai-text-to-image-generator"
with sync_playwright() as p:
    br=p.chromium.connect_over_cdp(CDP, timeout=120000)
    page=br.contexts[0].new_page(); page.set_default_timeout(90000)
    page.goto(URL, wait_until="domcontentloaded", timeout=120000)
    fr=None
    for _ in range(80):
        for f in page.frames:
            try:
                if "ai-text-to-image" in f.url and f.locator('textarea[data-name="description"]').count(): fr=f;break
            except Exception: pass
        if fr: break
        page.wait_for_timeout(1500)
    print("frame", bool(fr), flush=True)
    fr.locator('select[data-name="numImages"]').evaluate("(el)=>{el.value='2';el.dispatchEvent(new Event('change',{bubbles:true}))}")
    fr.locator('textarea[data-name="description"]').fill("a photorealistic portrait photograph of a 40-year-old man in a blue robe, studio light, grey background")
    fr.get_by_role("button", name="✨ generate").click()
    print("clicked", flush=True)
    for i in range(12):
        page.wait_for_timeout(8000)
        info = fr.evaluate("""() => {
          const imgs=[...document.querySelectorAll('img')].map(e=>({w:e.naturalWidth,h:e.naturalHeight,src:(e.currentSrc||e.src||'').slice(0,60)}));
          const bgs=[...document.querySelectorAll('div,span,a')].map(e=>getComputedStyle(e).backgroundImage).filter(s=>s&&s!=='none'&&s.includes('url')).slice(0,5);
          return {imgs:imgs.filter(x=>x.w>100).length, total:imgs.length, sample:imgs.slice(0,4), bgs, tail:document.body.innerText.slice(-200)};
        }""")
        print(i, json.dumps(info)[:500], flush=True)
