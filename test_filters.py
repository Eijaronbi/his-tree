"""Compare candidate texture-cleanup filters on one embedded GLB image."""
import io
import os
import sys

from PIL import Image, ImageFilter, ImageDraw

sys.path.insert(0, "/data/home/his-tree")
from clean_textures import read_glb

SRC = "/data/home/his-tree/assets/models/characters/audience_lod/char_adult_f_elegant.glb"
OUT = "/data/home/his-tree/optwork/tex_filters.png"


def blur_lift(image, radius, threshold, strength):
    rgb = image.convert("RGB")
    blurred = rgb.filter(ImageFilter.GaussianBlur(radius))
    src = rgb.load()
    base = blurred.load()
    w, h = rgb.size
    out = Image.new("RGB", (w, h))
    dst = out.load()
    for y in range(h):
        for x in range(w):
            r, g, b = src[x, y]
            mr, mg, mb = base[x, y]
            luma = 0.299 * r + 0.587 * g + 0.114 * b
            mluma = 0.299 * mr + 0.587 * mg + 0.114 * mb
            gap = mluma - luma
            if gap <= threshold:
                dst[x, y] = (r, g, b)
                continue
            amount = min(1.0, gap / (threshold * 2.0)) * strength
            dst[x, y] = (
                int(r + (mr - r) * amount),
                int(g + (mg - g) * amount),
                int(b + (mb - b) * amount),
            )
    return out


def main():
    js, bins = read_glb(SRC)
    body = bins[0]
    views = js["bufferViews"]
    images = js["images"]
    view = views[images[0]["bufferView"]]
    start = view.get("byteOffset", 0)
    raw = body[start:start + view["byteLength"]]
    base = Image.open(io.BytesIO(raw)).convert("RGB")
    print("texture", base.size)

    variants = [
        ("original", base),
        ("median9", base.filter(ImageFilter.MedianFilter(9))),
        ("blur5 lift45", blur_lift(base, 5, 45, 0.75)),
        ("blur9 lift60", blur_lift(base, 9, 60, 0.85)),
    ]
    cell = 320
    sheet = Image.new("RGB", (cell * 2, cell * 2), (23, 17, 10))
    draw = ImageDraw.Draw(sheet)
    for i, (label, img) in enumerate(variants):
        x = (i % 2) * cell
        y = (i // 2) * cell
        thumb = img.copy()
        thumb.thumbnail((cell - 8, cell - 26))
        sheet.paste(thumb, (x + 4, y + 22))
        draw.text((x + 6, y + 6), label, fill=(217, 164, 65))
    sheet.save(OUT)
    print("wrote", OUT, sheet.size)


main()
