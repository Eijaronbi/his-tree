#!/usr/bin/env python3
"""Scan the HIS-TREE repo and emit a live asset/property browser.

Output:
  collection/index.html  - static page served by the game server
  collection/data.json   - machine readable asset + character manifest

Run from anywhere:  python3 tools/collection_scan.py
"""
import json
import os
import re
import struct
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "collection")
CHAR_MANIFEST = os.path.join(ROOT, "tools", "characters.json")


def human_size(n):
    if n < 1024:
        return "%d B" % n
    if n < 1024 * 1024:
        return "%.1f KB" % (n / 1024.0)
    return "%.2f MB" % (n / 1048576.0)


def glb_info(path):
    info = {"vertices": 0, "triangles": 0, "meshes": 0, "materials": 0, "animations": 0, "skins": 0}
    try:
        with open(path, "rb") as f:
            head = f.read(12)
            if len(head) < 12 or head[:4] != b"glTF":
                return None
            total = struct.unpack("<I", head[8:12])[0]
            blob = head + f.read(total - 12)
        off = 12
        js = None
        while off + 8 <= len(blob):
            clen, ctype = struct.unpack("<II", blob[off:off + 8])
            body = blob[off + 8:off + 8 + clen]
            if ctype == 0x4E4F534A:
                js = json.loads(body.decode("utf-8", "replace"))
            off += 8 + clen + ((4 - clen % 4) % 4 if clen % 4 else 0)
        if not js:
            return None
        info["meshes"] = len(js.get("meshes", []))
        info["materials"] = len(js.get("materials", []))
        info["animations"] = len(js.get("animations", []))
        info["skins"] = len(js.get("skins", []))
        accessors = js.get("accessors", [])
        tris = 0
        verts = 0
        for mesh in js.get("meshes", []):
            for prim in mesh.get("primitives", []):
                pos = prim.get("attributes", {}).get("POSITION")
                if pos is not None and pos < len(accessors):
                    verts += accessors[pos].get("count", 0)
                idx = prim.get("indices")
                if idx is not None and idx < len(accessors):
                    tris += accessors[idx].get("count", 0) // 3
        info["vertices"] = verts
        info["triangles"] = tris
        info["textures"] = len(js.get("textures", []))
        info["images"] = [im.get("uri", im.get("name", "buffer")) for im in js.get("images", [])][:8]
        return info
    except Exception:
        return None


def image_size(path):
    try:
        with open(path, "rb") as f:
            head = f.read(32)
            if head[:8] == b"\x89PNG\r\n\x1a\n":
                w, h = struct.unpack(">II", head[16:24])
                return w, h, "PNG"
            if head[:4] == b"RIFF" and head[8:12] == b"WEBP":
                kind = head[12:16]
                if kind == b"VP8 ":
                    w = struct.unpack("<H", head[26:28])[0] & 0x3FFF
                    h = struct.unpack("<H", head[28:30])[0] & 0x3FFF
                    return w, h, "WebP"
                if kind == b"VP8L":
                    bits = struct.unpack("<I", head[21:25])[0]
                    return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1, "WebP"
                if kind == b"VP8X":
                    w = int.from_bytes(head[24:27], "little") + 1
                    h = int.from_bytes(head[27:30], "little") + 1
                    return w, h, "WebP"
            if head[:2] == b"\xff\xd8":
                f.seek(2)
                while True:
                    b = f.read(1)
                    while b and b != b"\xff":
                        b = f.read(1)
                    marker = f.read(1)
                    while marker == b"\xff":
                        marker = f.read(1)
                    if not marker:
                        break
                    if marker[0] in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                                     0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                        f.read(3)
                        h, w = struct.unpack(">HH", f.read(4))
                        return w, h, "JPEG"
                    ln = struct.unpack(">H", f.read(2))[0]
                    f.seek(ln - 2, 1)
    except Exception:
        pass
    return None


def walk(base, exts, skip=()):
    out = []
    for dirpath, dirnames, filenames in os.walk(base):
        dirnames[:] = [d for d in dirnames if d not in (".git", "node_modules", "collection", "gallery")]
        for fn in filenames:
            if fn.lower().endswith(tuple(exts)):
                p = os.path.join(dirpath, fn)
                rel = os.path.relpath(p, ROOT)
                if any(s in rel for s in skip):
                    continue
                out.append((rel, os.path.getsize(p)))
    return sorted(out)


def story_chapters():
    path = os.path.join(ROOT, "src", "data", "story.js")
    out = []
    if not os.path.exists(path):
        return out
    txt = open(path, encoding="utf-8", errors="replace").read()
    for m in re.finditer(r"id:\s*'([^']+)'", txt):
        chunk = txt[m.start():m.start() + 600]
        title = re.search(r"title:\s*'([^']*)'", chunk)
        place = re.search(r"place:\s*'([^']*)'", chunk)
        year = re.search(r"year:\s*'([^']*)'", chunk)
        out.append({
            "id": m.group(1),
            "title": title.group(1) if title else "",
            "place": place.group(1) if place else "",
            "year": year.group(1) if year else "",
        })
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    chars = []
    if os.path.exists(CHAR_MANIFEST):
        chars = json.load(open(CHAR_MANIFEST, encoding="utf-8"))

    char_rows = []
    for c in chars:
        glb = os.path.join(ROOT, "assets", "models", "characters", c["id"] + ".glb")
        info = glb_info(glb) if os.path.exists(glb) else None
        row = dict(c)
        row["file"] = "assets/models/characters/%s.glb" % c["id"]
        row["size"] = os.path.getsize(glb) if os.path.exists(glb) else 0
        row["glb"] = info or {}
        char_rows.append(row)

    models = []
    for rel, size in walk(os.path.join(ROOT, "assets", "models"), (".glb", ".gltf", ".obj", ".zip")):
        info = glb_info(os.path.join(ROOT, rel)) if rel.endswith(".glb") else None
        models.append({"file": rel, "size": size, "glb": info or {}})

    textures = []
    for rel, size in walk(os.path.join(ROOT, "assets", "textures"), (".png", ".webp", ".jpg", ".jpeg", ".exr")):
        dim = image_size(os.path.join(ROOT, rel))
        textures.append({
            "file": rel,
            "size": size,
            "w": dim[0] if dim else None,
            "h": dim[1] if dim else None,
            "fmt": dim[2] if dim else os.path.splitext(rel)[1].lstrip("."),
        })

    source = []
    for rel, size in walk(os.path.join(ROOT, "src"), (".js", ".json", ".html", ".css")):
        lines = 0
        try:
            lines = sum(1 for _ in open(os.path.join(ROOT, rel), encoding="utf-8", errors="replace"))
        except Exception:
            pass
        source.append({"file": rel, "size": size, "lines": lines})

    data = {
        "generated": time.strftime("%Y-%m-%d %H:%M:%S"),
        "characters": char_rows,
        "models": models,
        "textures": textures,
        "source": source,
        "chapters": story_chapters(),
        "counts": {
            "characters": len(char_rows),
            "models": len(models),
            "textures": len(textures),
            "source": len(source),
            "chapters": len(story_chapters()),
        },
    }
    with open(os.path.join(OUT, "data.json"), "w", encoding="utf-8") as f:
        json.dump(data, f, indent=1)

    c = data["counts"]
    rows = []
    for r in char_rows:
        g = r["glb"]
        rows.append(
            "<tr><td><b>%s</b></td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (
                r["id"], r.get("macro", ""), r.get("sex", ""), r.get("build", ""),
                "%.2f m" % r.get("height", 0), os.path.basename(r.get("skin", "") or ""),
                os.path.basename(r.get("hair", "") or ""), r.get("clothes", ""),
                human_size(r["size"]), "%s v / %s tri" % (g.get("vertices", "-"), g.get("triangles", "-"))))
    for m in models:
        if m["file"].startswith("assets/models/characters/"):
            continue
        g = m["glb"]
        rows.append(
            "<tr><td colspan='10' style='color:#8f929c'>model</td><td>%s</td><td>%s</td><td>%s v / %s tri</td><td>%s</td></tr>" % (
                m["file"], human_size(m["size"]), g.get("vertices", "-"), g.get("triangles", "-"),
                "%s mats" % g.get("materials", 0)))
    tex_rows = "".join(
        "<tr><td>%s</td><td>%s</td><td>%s</td><td>%s</td><td>%s</td></tr>" % (
            t["file"], human_size(t["size"]), "%sx%s" % (t["w"], t["h"]) if t["w"] else "-", t["fmt"], "")
        for t in textures)
    src_rows = "".join(
        "<tr><td>%s</td><td>%d lines</td><td>%s</td></tr>" % (s["file"], s["lines"], human_size(s["size"]))
        for s in source)
    chap_rows = "".join(
        "<tr><td><b>%s</b></td><td>%s</td><td>%s</td><td>%s</td></tr>" % (
            ch["id"], ch["title"], ch["place"], ch["year"]) for ch in data["chapters"])

    html_tpl = """<!doctype html><html><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>HIS-TREE Collection</title>
<style>
body{background:#0b0c0f;color:#e9e7e2;font-family:-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:18px}
h1{font-size:24px;margin:0 0 4px}h2{font-size:15px;color:#c9a76a;border-bottom:1px solid #242730;padding-bottom:6px;margin:26px 0 10px}
.sub{color:#8f929c;font-size:12px;margin-bottom:10px}
.cards{display:flex;flex-wrap:wrap;gap:10px;margin:12px 0}
.card{background:#14161b;border:1px solid #242730;border-radius:9px;padding:10px 14px;min-width:110px}
.card b{font-size:22px;display:block;color:#c9a76a}.card span{font-size:11px;color:#8f929c}
table{width:100%;border-collapse:collapse;font-size:12px}
th,td{text-align:left;padding:6px 8px;border-bottom:1px solid #1d2027;vertical-align:top}
th{color:#8f929c;font-weight:500;font-size:11px;text-transform:uppercase;letter-spacing:.4px}
tr:hover td{background:#14161b}
.scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
a{color:#c9a76a}
</style></head><body>
<h1>HIS-TREE Collection</h1>
<div class="sub">asset + property browser &middot; generated %s &middot; <a href="../">open the game</a></div>
<div class="cards">
<div class="card"><b>%d</b><span>characters</span></div>
<div class="card"><b>%d</b><span>models</span></div>
<div class="card"><b>%d</b><span>textures</span></div>
<div class="card"><b>%d</b><span>source files</span></div>
<div class="card"><b>%d</b><span>chapters</span></div>
</div>
<h2>Characters</h2><div class="scroll"><table>
<tr><th>id</th><th>macro</th><th>sex</th><th>build</th><th>height</th><th>skin</th><th>hair</th><th>garment</th><th>size</th><th>geometry</th></tr>
%s</table></div>
<h2>Chapters</h2><div class="scroll"><table>
<tr><th>id</th><th>title</th><th>place</th><th>year</th></tr>%s</table></div>
<h2>Models</h2><div class="scroll"><table>
<tr><th>file</th><th>size</th><th>geometry</th><th>materials</th></tr>%s</table></div>
<h2>Textures</h2><div class="scroll"><table>
<tr><th>file</th><th>size</th><th>resolution</th><th>format</th><th>source</th></tr>%s</table></div>
<h2>Source</h2><div class="scroll"><table>
<tr><th>file</th><th>lines</th><th>size</th></tr>%s</table></div>
<script>fetch('data.json').then(r=>r.json()).then(d=>{document.title='HIS-TREE Collection ('+d.counts.characters+' chars)';});</script>
</body></html>"""
    html = (html_tpl
            .replace("__GENERATED__", data["generated"])
            .replace("__N_CHARS__", str(c["characters"]))
            .replace("__N_MODELS__", str(c["models"]))
            .replace("__N_TEX__", str(c["textures"]))
            .replace("__N_SRC__", str(c["source"]))
            .replace("__N_CHAP__", str(c["chapters"]))
            .replace("__CHAR_ROWS__", "".join(rows))
            .replace("__CHAP_ROWS__", chap_rows)
            .replace("__MODEL_ROWS__", "".join(
                "<tr><td>%s</td><td>%s</td><td>%s v / %s tri</td><td>%s</td></tr>" % (
                    m["file"], human_size(m["size"]), m["glb"].get("vertices", "-"),
                    m["glb"].get("triangles", "-"), m["glb"].get("materials", 0))
                for m in models if not m["file"].startswith("assets/models/characters/")))
            .replace("__TEX_ROWS__", tex_rows)
            .replace("__SRC_ROWS__", src_rows))
    with open(os.path.join(OUT, "index.html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("collection written:", c)


if __name__ == "__main__":
    main()
