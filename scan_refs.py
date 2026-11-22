import os, re
ROOT = "/data/home/his-tree"
refs, prefixes = set(), set()
pattern = re.compile(r"""['"`](?:\./)?(assets/[^'"`]*)['"`]""")
for base, _d, files in os.walk(os.path.join(ROOT, "src")):
    for f in files:
        if not f.endswith((".js", ".html")):
            continue
        src = open(os.path.join(base, f), encoding="utf-8", errors="ignore").read()
        for m in pattern.finditer(src):
            t = m.group(1)
            if t.endswith("/"):
                prefixes.add(t)
            else:
                refs.add(t)
print("refs", len(refs), "prefixes", len(prefixes))
for needle in ("skins/", "_albedo", "TEX_BASE"):
    hits = []
    for base, _d, files in os.walk(os.path.join(ROOT, "src")):
        for f in files:
            if not f.endswith((".js", ".html")):
                continue
            path = os.path.join(base, f)
            src = open(path, encoding="utf-8", errors="ignore").read()
            for i, line in enumerate(src.splitlines(), 1):
                if needle in line:
                    hits.append((os.path.relpath(path, ROOT), i, line.strip()[:110]))
    print("==", needle, len(hits))
    for h in hits[:8]:
        print("   ", h)
for base, _d, files in os.walk(os.path.join(ROOT, "src")):
    for f in files:
        if not f.endswith((".js", ".html")):
            continue
        path = os.path.join(base, f)
        src = open(path, encoding="utf-8", errors="ignore").read()
        for m in pattern.finditer(src):
            if m.group(1) == "assets/":
                line = src[:m.start()].count(chr(10)) + 1
                print("  BARE assets/ in", os.path.relpath(path, ROOT), "line", line, "->", src.splitlines()[line-1].strip()[:120])
for r in sorted(refs):
    print("  R", r)
for p in sorted(prefixes):
    print("  P", p)
