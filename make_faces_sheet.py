import asyncio, base64, os
from playwright.async_api import async_playwright

ROOT = "/data/home/his-tree"
OUT = os.path.join(ROOT, "optwork/faces_sheet.png")
NAMES = ["frock", "officer", "elegant", "simple", "worker", "soldier", "elder-m", "elder-f", "lofi"]

PAGE = """<!doctype html><html><head><meta charset="utf-8"></head><body style="margin:0;background:#17110a">
<script type="module">
window.buildSheet = async (names, cell) => {
  const cols = 3, rows = Math.ceil(names.length / cols);
  const out = document.createElement('canvas');
  out.width = cols * cell; out.height = rows * (cell + 16);
  const ctx = out.getContext('2d');
  ctx.fillStyle = '#17110a'; ctx.fillRect(0, 0, out.width, out.height);
  for (let i = 0; i < names.length; i++) {
    const img = new Image();
    const url = '/thumbs/faces/' + names[i] + '.png?v=5';
    await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
    const x = (i % cols) * cell, y = Math.floor(i / cols) * (cell + 16);
    ctx.drawImage(img, x, y, cell, cell);
    ctx.fillStyle = '#d9a441'; ctx.font = 'bold 13px sans-serif';
    ctx.fillText(names[i], x + 6, y + cell + 13);
  }
  return out.toDataURL('image/png');
};
window.__ready = true;
</script></body></html>"""

async def main():
    with open(os.path.join(ROOT, "faces_sheet.html"), "w") as f:
        f.write(PAGE)
    async with async_playwright() as p:
        b = await p.chromium.launch(executable_path='/usr/bin/chromium', headless=True,
            args=['--use-gl=swiftshader','--enable-unsafe-swiftshader','--no-sandbox'])
        pg = await b.new_page(viewport={'width': 900, 'height': 700})
        errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)[:200]))
        await pg.goto('http://127.0.0.1:8099/faces_sheet.html', wait_until='load', timeout=60000)
        await pg.wait_for_function("() => window.__ready === true", timeout=30000)
        data = await pg.evaluate("async ([names, cell]) => await window.buildSheet(names, cell)", [NAMES, 240])
        raw = base64.b64decode(data.split(',', 1)[1])
        with open(OUT, "wb") as f:
            f.write(raw)
        print("sheet bytes", len(raw))
        try:
            os.remove(os.path.join(ROOT, "faces_sheet.html"))
        except OSError:
            pass
        print("errors", errs[:3])
        await b.close()

asyncio.run(main())
