#!/usr/bin/env python3
"""Free image generation (Pollinations, no login) for HIS-TREE asset sources."""
import json, os, sys, time, urllib.parse, urllib.request

SRC = "/data/home/luxin/src"
BASE = "https://image.pollinations.ai/prompt/"

NEG = ("photorealistic, ultra detailed, natural skin texture, 8k, sharp focus, "
       "professional photograph, no text, no watermark, no logo, no frame")

def url(prompt, w, h, model, seed):
    p = urllib.parse.quote(prompt + ", " + NEG, safe="")
    return f"{BASE}{p}?width={w}&height={h}&model={model}&nologo=true&seed={seed}"

def fetch(prompt, w, h, model, seed, out, tries=6):
    if os.path.exists(out) and os.path.getsize(out) > 20000:
        print("skip", out); return True
    for i in range(tries):
        try:
            req = urllib.request.Request(url(prompt, w, h, model, seed),
                                         headers={"User-Agent": "his-tree/1.0"})
            with urllib.request.urlopen(req, timeout=180) as r:
                data = r.read()
            if len(data) > 20000 and data[:2] == b"\xff\xd8":
                open(out, "wb").write(data)
                print("ok", os.path.basename(out), len(data)); return True
            print("bad", r.status, len(data), data[:120])
        except Exception as e:
            print("retry", i, e)
        time.sleep(12 + i * 8)
    return False

def main():
    manifest = json.load(open(sys.argv[1]))
    only = set(sys.argv[2].split(",")) if len(sys.argv) > 2 else None
    for it in manifest:
        if only and it["id"] not in only: continue
        out = os.path.join(SRC, it["id"] + ".jpg")
        fetch(it["prompt"], it.get("w", 832), it.get("h", 1216),
              it.get("model", "gptimage"), it.get("seed", 7), out)
        time.sleep(6)

main()
