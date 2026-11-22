import os, shutil, subprocess, json, sys

ROOT = "/data/home/his-tree"
TEX = os.path.join(ROOT, "assets/textures")
ORIG = "/data/home/his-tree-originals/textures"

CONVERT = [
    ("scenery/playbill.png", "scenery/playbill.webp", 95),
    ("scenery/playbill.png", "scenery/playbill.mobile.webp", 92),
    ("scenery/theatre_drop_wide.png", "scenery/theatre_drop_wide.webp", 95),
    ("scenery/theatre_drop_wide.png", "scenery/theatre_drop_wide.mobile.webp", 92),
]

def run(cmd):
    subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

def main():
    if not os.path.isdir(ORIG):
        shutil.copytree(TEX, ORIG)
        print("archived originals ->", ORIG)

    for src_rel, dst_rel, quality in CONVERT:
        src = os.path.join(TEX, src_rel)
        dst = os.path.join(TEX, dst_rel)
        if not os.path.exists(src):
            print("missing", src_rel)
            continue
        size = ""
        if ".mobile." in dst_rel:
            run(["convert", src, "-resize", "512x512>", "-quality", str(quality), dst])
        else:
            run(["convert", src, "-quality", str(quality), dst])
        before = os.path.getsize(src)
        after = os.path.getsize(dst)
        print(f"{src_rel} -> {dst_rel}: {before/1024:.0f} KiB -> {after/1024:.0f} KiB")

    # remove textures that the runtime never references (kept in the archive)
    unused = [
        "scenery/theatre_backdrop.png",
        "scenery/theatre_auditorium.jpg",
        "scenery/sky_storm.jpg",
        "skins/amina_albedo.png", "skins/amina_rough.png",
        "skins/bakary_albedo.png", "skins/bakary_rough.png",
        "skins/lincoln_albedo.png", "skins/lincoln_rough.png",
        "skins/musa_albedo.png", "skins/musa_rough.png",
        "skins/salim_albedo.png", "skins/salim_rough.png",
    ]
    freed = 0
    for rel in unused:
        path = os.path.join(TEX, rel)
        if os.path.exists(path):
            freed += os.path.getsize(path)
            os.remove(path)
    print(f"removed unused textures: {freed/1048576:.1f} MiB")

if __name__ == "__main__":
    main()
