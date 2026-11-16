#!/usr/bin/env python3
"""HIS-TREE: image -> 3D via Lux3D (1 credit per conversion)."""
import json, os, subprocess, sys, time, zipfile, glob, shutil, urllib.request

S = "/data/home/.opencode/skills/aholo-lux3d"
RT = S + "/core/runtime"
WORK = "/data/home/luxin/pipeline"
JOURNAL = "/data/home/luxin/logs/collection.sqlite"
OUT_RAW = "/data/home/luxin/glb"
PLUGIN = "plugin_9040000b9e414302b88fb0fb436cdc29"

sys.path.insert(0, RT)
os.environ.setdefault("LUX3D_GLOBAL_API_KEY", open("/data/home/.config/lux3d/api_key").read().strip())
import lux3d_client as L


def py():
    for c in glob.glob("/data/home/.cache/aholo-lux3d-common/environments/*/bin/python"):
        try:
            subprocess.run([c, "-c", "import requests"], check=True, capture_output=True)
            return c
        except Exception:
            continue
    raise SystemExit("no python env with requests")


def upload(path):
    out = os.path.join(WORK, f"upload_{os.path.basename(path)}.json")
    env = dict(os.environ)
    env["LUX3D_GLOBAL_API_KEY"] = open("/data/home/.config/lux3d/api_key").read().strip()
    r = subprocess.run([py(), RT + "/asset_uploader.py", "upload", path,
                        "--region", "international", "--json-output", out],
                       capture_output=True, text=True, env=env)
    if r.returncode != 0:
        raise SystemExit(r.stdout[-500:] + r.stderr[-800:])
    return json.load(open(out))["url"]


def quote(img_url, version, label):
    d = os.path.join(WORK, "q_" + label); os.makedirs(d, exist_ok=True)
    items = {"1": {"endpoint": {"method": "POST", "path": "/lux3d/v1/generate/img-to-3d/task/create"},
                   "parameters": {"body": {"img": img_url, "version": version}}}}
    review = {"pluginTaskId": PLUGIN, "planVersion": 3,
              "plan": f"Convert one reference image ({label}) into a game-ready 3D model with Lux3D {version}.",
              "userInputs": ["Only use Lux3D to convert images to 3D.",
                             "Realistic, not cartoon, assets for HIS-TREE."],
              "attachments": [{"name": label + ".jpg", "kind": "image", "publicUrl": img_url}]}
    json.dump(items, open(d + "/items.json", "w")); json.dump(review, open(d + "/review.json", "w"))
    env = dict(os.environ)
    env["LUX3D_GLOBAL_API_KEY"] = open("/data/home/.config/lux3d/api_key").read().strip()
    r = subprocess.run([py(), S + "/scripts/commerce.py", "quote", "--host-name", "opencode",
                        "--region", "international", "--journal", JOURNAL,
                        "--items", d + "/items.json", "--review", d + "/review.json"],
                       capture_output=True, text=True, env=env)
    if r.returncode != 0:
        raise SystemExit(r.stdout[-600:] + r.stderr[-600:])
    data = json.loads(r.stdout[r.stdout.find("{"):])
    q = data.get("quote") or {}
    if "quote" in q and isinstance(q["quote"], dict):
        q = q["quote"]
    if "quoteId" not in q:
        raise SystemExit("quote parse failed: " + json.dumps(data)[:600])
    return q["quoteId"], q.get("estimatedCreditsTotal")


def convert(img_url, label, version="G1-Turbo", timeout=900):
    qid, cost = quote(img_url, version, label)
    print("quote", qid, cost, flush=True)
    tid = L.create_image_to_3d_task(img=img_url, version=version, region="international", content_id=qid)
    tid = tid if isinstance(tid, (str, int)) else (tid.get("id") or tid.get("taskId"))
    print("task", tid, flush=True)
    t0 = time.time()
    while time.time() - t0 < timeout:
        time.sleep(10)
        t = L.get_task(tid, region="international")
        st = str(t.get("status"))
        print("status", st, flush=True)
        if st == "3":
            urls = [o.get("content") for o in t.get("outputs", []) if o.get("content")]
            os.makedirs(OUT_RAW, exist_ok=True)
            glb = None
            for u in urls:
                if u.endswith(".glb"):
                    glb = u
                elif u.endswith(".zip"):
                    zp = os.path.join(OUT_RAW, label + ".zip")
                    urllib.request.urlretrieve(u, zp)
                    with zipfile.ZipFile(zp) as z:
                        z.extractall(os.path.join(OUT_RAW, label))
                    cands = glob.glob(os.path.join(OUT_RAW, label, "**", "*.glb"), recursive=True)
                    if cands:
                        cands.sort(key=os.path.getsize, reverse=True)
                        glb = cands[0]
            json.dump(t, open(os.path.join(OUT_RAW, label + ".task.json"), "w"), indent=1)
            if glb and glb.startswith("http"):
                p = os.path.join(OUT_RAW, label + ".glb"); urllib.request.urlretrieve(glb, p); glb = p
            print("GLB", glb, flush=True)
            return glb
        if st in ("4", "5", "6"):
            print(json.dumps(t)[-800:]); return None
    return None


if __name__ == "__main__":
    src, label = sys.argv[1], sys.argv[2]
    version = sys.argv[3] if len(sys.argv) > 3 else "G1-Turbo"
    url = src if src.startswith("http") else upload(src)
    print("url", url, flush=True)
    g = convert(url, label, version)
    print("DONE", g)
