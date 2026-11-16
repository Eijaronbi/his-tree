import sys, os, time
from playwright.sync_api import sync_playwright
chapter = sys.argv[1] if len(sys.argv) > 1 else "washington-1865"
outdir = sys.argv[2] if len(sys.argv) > 2 else "/data/home/luxin/shots"
os.makedirs(outdir, exist_ok=True)
marks = [int(x) for x in (sys.argv[3].split(",") if len(sys.argv) > 3 else ["5", "12", "22"])]
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage",
              "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
              "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
              "--autoplay-policy=no-user-gesture-required"])
    ctx = br.new_context(viewport={"width": 1280, "height": 720})
    page = ctx.new_page()
    page.on("console", lambda m: print("CONSOLE", m.type, m.text[:200], flush=True) if m.type in ("error", "warning") else None)
    page.goto(f"http://127.0.0.1:8099/?chapter={chapter}&auto=1", wait_until="load", timeout=180000)
    t0 = time.time()
    for mk in marks:
        wait = mk - (time.time() - t0)
        if wait > 0:
            page.wait_for_timeout(int(wait * 1000))
        fn = os.path.join(outdir, f"{chapter}-{mk}s.png")
        page.screenshot(path=fn)
        print("shot", fn, flush=True)
    ctx.close(); br.close()
