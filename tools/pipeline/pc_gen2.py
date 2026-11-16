#!/usr/bin/env python3
"""perchance generation via Playwright-launched Chromium (no CDP, no xvfb)."""
import base64, json, os, sys, time
from playwright.sync_api import sync_playwright

SRC = "/data/home/luxin/src"
URL = "https://perchance.org/ai-text-to-image-generator"
CHROME = "/usr/bin/chromium"
STYLE = {"photo": "ref:optionKeyName:Professional Photo",
         "cinematic": "ref:optionKeyName:Cinematic"}


def fetch_b64(frame, src):
    return frame.evaluate("""async (src) => {
      const r = await fetch(src); const b = await r.blob();
      return await new Promise(res => { const fr = new FileReader();
        fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
    }""", src)


def save(frame, src, tag, idx):
    data = fetch_b64(frame, src)
    if not data or "," not in str(data):
        return None
    raw = base64.b64decode(str(data).split(",", 1)[1])
    if len(raw) < 20000:
        return None
    pth = os.path.join(SRC, f"{tag}_{idx:02d}.jpg")
    open(pth, "wb").write(raw)
    return (pth, len(raw))


def run(tag, prompt, count, style, shape, wait_s=300):
    os.makedirs(SRC, exist_ok=True)
    with sync_playwright() as p:
        br = p.chromium.launch(executable_path=CHROME, headless=True,
                               args=["--no-sandbox", "--disable-dev-shm-usage",
                                     "--disable-background-timer-throttling",
                                     "--disable-renderer-backgrounding"])
        page = br.new_page(viewport={"width": 1400, "height": 1000})
        page.set_default_timeout(120000)
        page.goto(URL, wait_until="domcontentloaded", timeout=120000)
        fr = None
        for _ in range(90):
            for f in page.frames:
                try:
                    if "ai-text-to-image" in f.url and f.locator('textarea[data-name="description"]').count():
                        fr = f; break
                except Exception:
                    pass
            if fr: break
            page.wait_for_timeout(1500)
        if not fr:
            print("FRAME_NOT_FOUND", flush=True); return []
        fr.locator('select[data-name="shape"]').evaluate(f"(el)=>{{el.value='{shape}';el.dispatchEvent(new Event('change',{{bubbles:true}}))}}")
        fr.locator('select[data-name="numImages"]').evaluate(f"(el)=>{{el.value='{count}';el.dispatchEvent(new Event('change',{{bubbles:true}}))}}")
        fr.locator('select[data-name="artStyle"]').evaluate(f"(el)=>{{el.value='{STYLE[style]}';el.dispatchEvent(new Event('change',{{bubbles:true}}))}}")
        fr.locator('textarea[data-name="description"]').fill(prompt)
        fr.get_by_role("button", name="✨ generate").click()
        print("clicked", flush=True)

        saved, seen, t0 = [], set(), time.time()
        while time.time() - t0 < wait_s and len(saved) < int(count):
            page.wait_for_timeout(8000)
            try:
                items = fr.locator("img").evaluate_all(
                    "els=>els.map(e=>({src:e.currentSrc||e.src||'',w:e.naturalWidth,h:e.naturalHeight}))"
                    ".filter(x=>x.w>=256 && x.src)")
            except Exception as e:
                print("poll", str(e)[:60], flush=True); continue
            print(f"t={int(time.time()-t0)}s imgs={len(items)} saved={len(saved)}", flush=True)
            for it in items:
                if it["src"] in seen: continue
                seen.add(it["src"])
                try:
                    r = save(fr, it["src"], tag, len(saved))
                    if r:
                        saved.append(r[0]); print("saved", r, flush=True)
                except Exception as e:
                    print("savefail", str(e)[:60], flush=True)
            if saved:
                break
        page.screenshot(path=f"/data/home/luxin/src/{tag}_page.png")
        br.close()
        return saved


if __name__ == "__main__":
    tag, prompt = sys.argv[1], sys.argv[2]
    count = sys.argv[3] if len(sys.argv) > 3 else "2"
    style = sys.argv[4] if len(sys.argv) > 4 else "photo"
    shape = sys.argv[5] if len(sys.argv) > 5 else "512x768"
    s = run(tag, prompt, count, style, shape)
    print("RESULT", json.dumps({"tag": tag, "saved": len(s)}))
