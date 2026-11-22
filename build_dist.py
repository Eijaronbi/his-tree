import json, os, shutil, re, collections, time

ROOT = "/data/home/his-tree"
DIST = os.path.join(ROOT, "dist")

# --- reference scan (same logic as the inventory) ---
refs, prefixes = set(), set()
# directories loaded through runtime-built paths (not literal filenames)
DYNAMIC_PREFIXES = {
    "assets/models/characters/audience_lod/",
    "assets/models/characters/audience_far/",
    "assets/models/characters/audience/",
    "assets/audio/narration/",
    "assets/textures/",
}
# a bare 'assets/' literal is not a usable prefix (it would match every file)
IGNORE_PREFIXES = {"assets/"}
pattern = re.compile(r"['\"`](?:\./)?(assets/[^'\"`]*)['\"`]")
for base, _dirs, files in os.walk(os.path.join(ROOT, "src")):
    for f in files:
        if not f.endswith((".js", ".html")):
            continue
        src = open(os.path.join(base, f), encoding="utf-8", errors="ignore").read()
        for m in pattern.finditer(src):
            t = m.group(1)
            if t.endswith("/"):
                if t in IGNORE_PREFIXES:
                    continue
                prefixes.add(t)
            else:
                refs.add(t)
prefixes |= DYNAMIC_PREFIXES

def used(rel):
    if rel in refs:
        return True
    return any(rel.startswith(p) for p in prefixes)

# also keep files the runtime loads by convention (e.g. narration clips from the manifest)
keep_extra = set()
manifest = os.path.join(ROOT, "assets/audio/narration/manifest.json")
if os.path.exists(manifest):
    data = json.load(open(manifest))
    for entries in data.get("clips", {}).values():
        for path in entries.values():
            keep_extra.add(path)

# --- build ---
if os.path.exists(DIST):
    shutil.rmtree(DIST)
os.makedirs(DIST)

copied = 0
skipped = 0
copied_bytes = 0
skipped_bytes = 0
for base, _dirs, files in os.walk(os.path.join(ROOT, "assets")):
    for f in files:
        src = os.path.join(base, f)
        rel = os.path.relpath(src, ROOT)
        size = os.path.getsize(src)
        if used(rel) or rel in keep_extra:
            dst = os.path.join(DIST, rel)
            os.makedirs(os.path.dirname(dst), exist_ok=True)
            shutil.copy2(src, dst)
            copied += 1
            copied_bytes += size
        else:
            skipped += 1
            skipped_bytes += size

for name in ("src", "vendor", "thumbs"):
    s = os.path.join(ROOT, name)
    if os.path.isdir(s):
        shutil.copytree(s, os.path.join(DIST, name))
shutil.copy2(os.path.join(ROOT, "index.html"), os.path.join(DIST, "index.html"))
for extra_file in ("sw.js",):
    src = os.path.join(ROOT, extra_file)
    if os.path.exists(src):
        shutil.copy2(src, os.path.join(DIST, extra_file))

def du(path):
    total = 0
    count = 0
    for base, _dirs, files in os.walk(path):
        for f in files:
            total += os.path.getsize(os.path.join(base, f))
            count += 1
    return count, total

missing = [r for r in sorted(refs) if not os.path.exists(os.path.join(ROOT, r))]
if missing:
    print("WARNING missing referenced assets:", len(missing))
    for m in missing[:10]:
        print("  ", m)

count, total = du(DIST)
print(f"dist: {count} files, {total/1048576:.1f} MiB")
print(f"assets copied: {copied} files ({copied_bytes/1048576:.1f} MiB)")
print(f"assets skipped: {skipped} files ({skipped_bytes/1048576:.1f} MiB)")
skipped_names = []
skipped_dirs = {}
for base, _dirs, files in os.walk(os.path.join(ROOT, "assets")):
    for f in files:
        rel = os.path.relpath(os.path.join(base, f), ROOT)
        if not (used(rel) or rel in keep_extra):
            skipped_names.append(rel)
            key = os.path.dirname(rel)
            skipped_dirs.setdefault(key, [0, 0])
            skipped_dirs[key][0] += 1
            skipped_dirs[key][1] += os.path.getsize(os.path.join(base, f))
for n in sorted(skipped_names):
    print("  -", n)
for k in sorted(skipped_dirs):
    print(f"  skipped {k}: {skipped_dirs[k][0]} files, {skipped_dirs[k][1]/1048576:.1f} MiB")
print(f"built: {time.strftime('%Y-%m-%d %H:%M:%S')}")
