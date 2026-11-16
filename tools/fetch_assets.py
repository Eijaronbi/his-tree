import json, urllib.request, urllib.parse, os
UA = {"User-Agent": "Mozilla/5.0 Chrome/120"}
def detail(aid):
    u = "https://patch.gg/api/v1/assets/" + urllib.parse.quote(aid, safe="")
    return json.load(urllib.request.urlopen(urllib.request.Request(u, headers=UA), timeout=60))
ids = ["kenney:mini-characters/character-female-c.glb",
       "kenney:mini-characters/character-male-a.glb",
       "kenney:nature-kit/tree_palm.glb",
       "kenney:nature-kit/tree_palmTall.glb",
       "polyfork:camel-base",
       "polyfork:market-stall-94937d"]
os.makedirs("assets/models", exist_ok=True)
out = {}
for aid in ids:
    try:
        a = detail(aid)
        vs = [v for v in a.get("variants", []) if v.get("name") == "web"] or a.get("variants", [])
        v = vs[0]; f = v["files"][0]
        d = urllib.request.urlopen(urllib.request.Request(f["url"], headers=UA), timeout=240).read()
        p = "assets/models/" + f["name"].replace("/", "_")
        open(p, "wb").write(d)
        out[aid] = {"file": p, "bytes": len(d), "license": a["license"]["spdx"],
                    "credit": a.get("credit", ""), "source": a.get("source", {}),
                    "capabilities": a.get("capabilities", [])}
        print("OK", aid, "->", p, len(d), "B", a["license"]["spdx"])
    except Exception as e:
        print("ERR", aid, repr(e))
json.dump(out, open("assets/models/library_assets.json", "w"), indent=1)
print("saved manifest", len(out))
