import sys, os, time, json
from playwright.sync_api import sync_playwright
chapter = sys.argv[1] if len(sys.argv) > 1 else "washington-1865"
outdir = "/data/home/luxin/shots"
os.makedirs(outdir, exist_ok=True)
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox", "--disable-dev-shm-usage",
              "--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader",
              "--disable-background-timer-throttling", "--disable-renderer-backgrounding",
              "--autoplay-policy=no-user-gesture-required"])
    ctx = br.new_context(viewport={"width": 1280, "height": 720})
    page = ctx.new_page()
    page.on("response", lambda r: print("HTTP", r.status, r.url, flush=True) if r.status >= 400 else None)
    page.on("console", lambda m: print("CONSOLE", m.type, m.text[:300], flush=True) if m.type == "error" else None)
    page.on("pageerror", lambda e: print("PAGEERROR", str(e)[:300], flush=True))
    page.goto(f"http://127.0.0.1:8099/?chapter={chapter}&auto=1", wait_until="load", timeout=180000)
    page.wait_for_timeout(6000)
    page.screenshot(path=os.path.join(outdir, "d0.png"))
    print("d0 done", flush=True)
    # dismiss intro
    for i in range(4):
        page.keyboard.press("e")
        page.wait_for_timeout(700)
    page.screenshot(path=os.path.join(outdir, "d1.png"))
    print("d1 done", flush=True)
    # walk forward
    page.keyboard.down("w")
    page.wait_for_timeout(2500)
    page.keyboard.up("w")
    page.wait_for_timeout(800)
    page.screenshot(path=os.path.join(outdir, "d2.png"))
    print("d2 done", flush=True)
    # look around a bit (mouse drag)
    page.mouse.move(640, 360)
    page.mouse.down()
    page.mouse.move(400, 360, steps=10)
    page.mouse.up()
    page.wait_for_timeout(600)
    page.screenshot(path=os.path.join(outdir, "d3.png"))
    print("d3 done", flush=True)
    ctx.close(); br.close()
