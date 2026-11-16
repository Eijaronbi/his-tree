#!/usr/bin/env python3
"""perchance.org image generation via CDP-driven Chromium."""
import base64, json, os, sys, time
from playwright.sync_api import sync_playwright

CDP = os.environ.get("CDP", "http://127.0.0.1:9334")
SRC = "/data/home/luxin/src"
URL = "https://perchance.org/ai-text-to-image-generator"
STYLE = {"photo": "ref:optionKeyName:Professional Photo",
         "cinematic": "ref:optionKeyName:Cinematic",
         "none": "ref:optionKeyName:𝗡𝗼 𝘀𝘁𝘆𝗹𝗲"}


def fetch_b64(frame, src):
    return frame.evaluate("""async (src) => {
      const r = await fetch(src); const b = await r.blob();
      return await new Promise(res => { const fr = new FileReader();
        fr.onload = () => res(fr.result); fr.readAsDataURL(b); });
    }""", src)


def run(tag, prompt, count, style, shape, timeout=int(os.environ.get("GEN_TIMEOUT","420"))):
    os.makedirs(SRC, exist_ok=True)
    with sync_playwright() as p:
        br = p.chromium.connect_over_cdp(CDP, timeout=120000)
        ctx = br.contexts[0]
        page = ctx.new_page()
        page.set_default_timeout(90000)
        page.goto(URL, wait_until="domcontentloaded", timeout=120000)
        frame = None
        for _ in range(90):
            for fr in page.frames:
                try:
                    if "ai-text-to-image" in fr.url and fr.locator('textarea[data-name="description"]').count():
                        frame = fr; break
                except Exception:
                    pass
            if frame: break
            page.wait_for_timeout(1500)
        if not frame:
            print("FRAME_NOT_FOUND"); return []
        print("frame ready", flush=True)

        frame.locator('select[data-name="shape"]').evaluate(f"(el)=>{{el.value='{shape}';el.dispatchEvent(new Event('change',{{bubbles:true}}))}}")
        frame.locator('select[data-name="numImages"]').evaluate(f"(el)=>{{el.value='{count}';el.dispatchEvent(new Event('change',{{bubbles:true}}))}}")
        frame.locator('select[data-name="artStyle"]').evaluate(f"(el)=>{{el.value='{STYLE[style]}';el.dispatchEvent(new Event('change',{{bubbles:true}}))}}")
        frame.locator('textarea[data-name="description"]').fill(prompt)
        frame.get_by_role("button", name="✨ generate").click()
        print("clicked", flush=True)

        saved, seen = [], set()
        t0 = time.time()
        while time.time() - t0 < timeout and len(saved) < int(count):
            page.wait_for_timeout(6000)
            try:
                items = frame.locator("img").evaluate_all(
                    "els=>els.map(e=>({src:e.currentSrc||e.src||'',w:e.naturalWidth,h:e.naturalHeight}))"
                    ".filter(x=>x.w>=256 && x.src)")
            except Exception as e:
                print("poll err", str(e)[:80], flush=True); continue
            print("imgs", len(items), flush=True)
            for it in items:
                if it["src"] in seen: continue
                seen.add(it["src"])
                try:
                    data = fetch_b64(frame, it["src"])
                    if not data or "," not in str(data): continue
                    raw = base64.b64decode(str(data).split(",", 1)[1])
                    if len(raw) < 20000: continue
                    pth = os.path.join(SRC, f"{tag}_{len(saved):02d}.jpg")
                    open(pth, "wb").write(raw)
                    saved.append(pth)
                    print("saved", pth, len(raw), flush=True)
                except Exception as e:
                    print("savefail", str(e)[:80], flush=True)
        page.close()
        return saved


if __name__ == "__main__":
    tag, prompt = sys.argv[1], sys.argv[2]
    count = sys.argv[3] if len(sys.argv) > 3 else "4"
    style = sys.argv[4] if len(sys.argv) > 4 else "photo"
    shape = sys.argv[5] if len(sys.argv) > 5 else "512x768"
    s = run(tag, prompt, count, style, shape)
    print("RESULT", json.dumps({"tag": tag, "saved": len(s)}))
