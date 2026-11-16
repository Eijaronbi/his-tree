import sys, os
from playwright.sync_api import sync_playwright
chapter = sys.argv[1] if len(sys.argv) > 1 else "washington-1865"
secs = int(sys.argv[2]) if len(sys.argv) > 2 else 75
outdir = f"/data/home/luxin/video/{chapter}"
os.makedirs(outdir, exist_ok=True)
with sync_playwright() as p:
    br = p.chromium.launch(executable_path="/usr/bin/chromium", headless=True,
        args=["--no-sandbox","--disable-dev-shm-usage",
              "--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader",
              "--disable-background-timer-throttling","--disable-renderer-backgrounding",
              "--autoplay-policy=no-user-gesture-required"])
    ctx = br.new_context(viewport={"width":1280,"height":720},
                         record_video_dir=outdir,
                         record_video_size={"width":1280,"height":720})
    page = ctx.new_page()
    page.goto(f"http://127.0.0.1:8099/?chapter={chapter}&auto=1", wait_until="load", timeout=180000)
    page.wait_for_timeout(secs*1000)
    print("video", page.video.path(), flush=True)
    ctx.close(); br.close()
