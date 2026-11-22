import json, os, re, collections

ROOT = "/data/home/his-tree"
ASSETS = os.path.join(ROOT, "assets")

# 1) every file under assets/
inventory = []
for base, _dirs, files in os.walk(ASSETS):
    for f in files:
        p = os.path.join(base, f)
        rel = os.path.relpath(p, ROOT)
        size = os.path.getsize(p)
        inventory.append({"path": rel, "bytes": size, "ext": os.path.splitext(f)[1].lower()})

# 2) references in source (literal paths and directory prefixes)
refs = collections.defaultdict(set)
prefix_refs = collections.defaultdict(set)
pattern = re.compile(r"['\"`](?:\./)?(assets/[^'\"`]*)['\"`]")
for base, _dirs, files in os.walk(os.path.join(ROOT, "src")):
    for f in files:
        if not f.endswith((".js", ".html")):
            continue
        rel_file = os.path.relpath(os.path.join(base, f), ROOT)
        src = open(os.path.join(base, f), encoding="utf-8", errors="ignore").read()
        for m in pattern.finditer(src):
            target = m.group(1)
            if target.endswith(("/", ".glb", ".png", ".jpg", ".webp", ".json", ".mp3")):
                refs[target].add(rel_file)
            if target.endswith("/"):
                prefix_refs[target].add(rel_file)

# dynamic model paths: map directory -> chapters that mention them
chapter_refs = collections.defaultdict(set)
for base, _dirs, files in os.walk(os.path.join(ROOT, "src")):
    for f in files:
        if not f.endswith(".js"):
            continue
        path = os.path.relpath(os.path.join(base, f), ROOT)
        src = open(os.path.join(base, f), encoding="utf-8", errors="ignore").read()
        for chapter in ("mali-1324", "washington-1865", "france-1917", "berlin-1989"):
            if chapter in src:
                for m in re.finditer(r"['\"`](?:\./)?(assets/[^'\"`]+)['\"`]", src):
                    chapter_refs[m.group(1)].add(chapter)

for item in inventory:
    key = item["path"]
    direct = set(refs.get(key, []))
    prefix = set()
    for pfx, files in prefix_refs.items():
        if key.startswith(pfx):
            prefix = files
    item["referenced_by"] = sorted(direct | prefix)
    item["chapters"] = sorted(chapter_refs.get(key, []))
    item["used"] = bool(item["referenced_by"])

by_ext = collections.Counter()
bytes_ext = collections.Counter()
for i in inventory:
    by_ext[i["ext"] or "(none)"] += 1
    bytes_ext[i["ext"] or "(none)"] += i["bytes"]

unused = [i for i in inventory if not i["used"]]
report = {
    "root": ROOT,
    "total_files": len(inventory),
    "total_bytes": sum(i["bytes"] for i in inventory),
    "by_extension": {k: {"files": by_ext[k], "bytes": bytes_ext[k]} for k in sorted(by_ext)},
    "unreferenced": {"files": len(unused), "bytes": sum(i["bytes"] for i in unused)},
    "assets": sorted(inventory, key=lambda i: -i["bytes"]),
}
with open("/data/home/luxin/asset-inventory.json", "w") as f:
    json.dump(report, f, indent=1)

lines = []
lines.append("# HIS-TREE asset inventory")
lines.append("")
lines.append(f"Generated from {ROOT}/assets — {report['total_files']} files, "
             f"{report['total_bytes']/1048576:.1f} MiB total.")
lines.append("")
lines.append("| type | files | size |")
lines.append("| --- | --- | --- |")
for k, v in report["by_extension"].items():
    lines.append(f"| {k} | {v['files']} | {v['bytes']/1048576:.1f} MiB |")
lines.append("")
lines.append(f"Unreferenced by any source file: {report['unreferenced']['files']} files, "
             f"{report['unreferenced']['bytes']/1048576:.1f} MiB.")
lines.append("")
lines.append("## Largest assets")
lines.append("")
lines.append("| path | size | chapters | referenced by |")
lines.append("| --- | --- | --- | --- |")
for i in report["assets"][:40]:
    lines.append(f"| {i['path']} | {i['bytes']/1048576:.2f} MiB | "
                 f"{', '.join(i['chapters']) or '-'} | {', '.join(i['referenced_by']) or '(not referenced)'} |")
lines.append("")
lines.append("## Unreferenced files (candidates for removal)")
lines.append("")
for i in sorted(unused, key=lambda x: -x["bytes"])[:40]:
    lines.append(f"- {i['path']} — {i['bytes']/1048576:.2f} MiB")
open("/data/home/luxin/asset-inventory.md", "w").write("\n".join(lines) + "\n")
# 3) optimisation ledger: original archive vs shipped asset
ORIG = "/data/home/his-tree-originals/models"
ledger = []
if os.path.isdir(ORIG):
    for base, _dirs, files in os.walk(ORIG):
        for f in files:
            if not f.endswith(".glb"):
                continue
            rel = os.path.relpath(os.path.join(base, f), ORIG)
            shipped = os.path.join(ASSETS, "models", rel)
            if not os.path.exists(shipped):
                continue
            before = os.path.getsize(os.path.join(base, f))
            after = os.path.getsize(shipped)
            ledger.append({"model": "assets/models/" + rel, "original_bytes": before,
                           "optimised_bytes": after,
                           "saved_bytes": before - after,
                           "reduction_pct": round(100.0 * (before - after) / before, 1) if before else 0.0})
    ledger.sort(key=lambda r: -r["saved_bytes"])
    orig_total = sum(r["original_bytes"] for r in ledger)
    opt_total = sum(r["optimised_bytes"] for r in ledger)
    report["optimisation"] = {
        "models": len(ledger),
        "original_bytes": orig_total,
        "optimised_bytes": opt_total,
        "saved_bytes": orig_total - opt_total,
        "reduction_pct": round(100.0 * (orig_total - opt_total) / orig_total, 1) if orig_total else 0.0,
        "largest_savings": ledger[:25]
    }
    with open("/data/home/luxin/asset-inventory.json", "w") as f:
        json.dump(report, f, indent=1)
    lines.append("")
    lines.append("## Optimisation ledger (meshopt + WebP, originals preserved outside the served tree)")
    lines.append("")
    lines.append(f"- models processed: {len(ledger)}")
    lines.append(f"- original total: {orig_total/1048576:.1f} MiB")
    lines.append(f"- optimised total: {opt_total/1048576:.1f} MiB")
    lines.append(f"- reduction: {report['optimisation']['reduction_pct']:.1f}%")
    lines.append("")
    lines.append("| model | original | optimised | saved |")
    lines.append("| --- | --- | --- | --- |")
    for r in ledger[:25]:
        lines.append(f"| {r['model']} | {r['original_bytes']/1048576:.2f} MiB | "
                     f"{r['optimised_bytes']/1048576:.2f} MiB | {r['reduction_pct']:.1f}% |")
    open("/data/home/luxin/asset-inventory.md", "w").write("\n".join(lines) + "\n")

print(f"files={report['total_files']} bytes={report['total_bytes']} unreferenced={report['unreferenced']['files']}")
