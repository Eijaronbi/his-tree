"""Remove dark AI-texture blotches from embedded GLB images.

Parses a binary glTF container, filters every embedded image (PNG/WebP) with a
dark-outlier Gaussian blend, and writes a new GLB. Geometry buffers (including the
EXT_meshopt_compression fallback buffer) are copied byte for byte.
"""
import io
import json
import os
import struct
import sys

from PIL import Image, ImageFilter


def read_glb(path):
    with open(path, "rb") as f:
        data = f.read()
    magic, version, length = struct.unpack("<III", data[:12])
    if magic != 0x46546C67:
        raise ValueError("not a GLB: %s" % path)
    offset = 12
    chunks = []
    while offset + 8 <= length:
        clen, ctype = struct.unpack("<II", data[offset:offset + 8])
        body = data[offset + 8:offset + 8 + clen]
        chunks.append((ctype, body))
        offset += 8 + clen + ((4 - clen % 4) % 4 if clen % 4 else 0)
    js = json.loads(chunks[0][1].decode("utf-8"))
    bins = [body for ctype, body in chunks[1:] if ctype == 0x004E4942]
    return js, bins


def write_glb(path, js, bins):
    js_bytes = json.dumps(js, separators=(",", ":")).encode("utf-8")
    js_bytes += b" " * ((4 - len(js_bytes) % 4) % 4)
    padded = [b + b"\x00" * ((4 - len(b) % 4) % 4) for b in bins]
    total = 12 + 8 + len(js_bytes) + sum(8 + len(b) for b in padded)
    with open(path, "wb") as f:
        f.write(struct.pack("<III", 0x46546C67, 2, total))
        f.write(struct.pack("<II", len(js_bytes), 0x4E4F534A))
        f.write(js_bytes)
        for b in padded:
            f.write(struct.pack("<II", len(b), 0x004E4942))
            f.write(b)


def blur_lift(image, radius=9, threshold=45, strength=0.85):
    """Lift dark streaks towards a blurred local neighbourhood."""
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


def despeckle(image, threshold=45, strength=0.85, radius=9):
    """Backward-compatible entry point for the texture cleanup pipeline."""
    return blur_lift(image, radius, threshold, strength)


def clean_glb(src_path, dst_path, threshold=45, strength=0.85, radius=9):
    """Rewrite buffer 0: keep the meshopt payload, replace the embedded images.

    gltf-transform stores the image bytes first and the EXT_meshopt_compression
    payload after them, all inside the single GLB binary chunk. three.js reads
    the meshopt payload at an absolute offset inside that chunk, so the payload
    is copied verbatim to the front and the cleaned images are appended.
    """
    js, bins = read_glb(src_path)
    body = bins[0] if bins else b""
    views = js.get("bufferViews", [])
    images = js.get("images", [])

    keep_from = len(body)
    for view in views:
        ext = (view.get("extensions") or {}).get("EXT_meshopt_compression")
        if ext:
            keep_from = min(keep_from, ext.get("byteOffset", 0))
    tail = body[keep_from:]
    for view in views:
        ext = (view.get("extensions") or {}).get("EXT_meshopt_compression")
        if ext:
            ext["byteOffset"] = ext.get("byteOffset", 0) - keep_from

    parts = [tail]
    cursor = len(tail)
    cursor += (4 - cursor % 4) % 4
    replaced = 0
    for image in images:
        bv_index = image.get("bufferView")
        if bv_index is None:
            continue
        view = views[bv_index]
        start = view.get("byteOffset", 0)
        raw = body[start:start + view["byteLength"]]
        mime = image.get("mimeType", "image/png")
        data = raw
        try:
            pil = Image.open(io.BytesIO(raw))
            pil.load()
            cleaned = despeckle(pil, threshold, strength, radius)
            out = io.BytesIO()
            if mime == "image/webp":
                cleaned.save(out, format="WEBP", quality=92, method=6)
            else:
                cleaned.save(out, format="PNG", optimize=True)
            candidate = out.getvalue()
            if len(candidate) < len(raw):
                data = candidate
                replaced += 1
        except Exception as exc:
            print("  skip image %d (%s): %s" % (bv_index, mime, exc))
        view["byteOffset"] = cursor
        view["byteLength"] = len(data)
        parts.append(data)
        cursor += len(data)
        cursor += (4 - cursor % 4) % 4

    new_body = b"".join(parts)
    if js.get("buffers"):
        js["buffers"][0]["byteLength"] = len(new_body)
    write_glb(dst_path, js, [new_body] + list(bins[1:]))
    return replaced, len(images), len(body), len(new_body)


if __name__ == "__main__":
    src = sys.argv[1]
    dst = sys.argv[2]
    threshold = int(sys.argv[3]) if len(sys.argv) > 3 else 45
    strength = float(sys.argv[4]) if len(sys.argv) > 4 else 0.85
    radius = int(sys.argv[5]) if len(sys.argv) > 5 else 9
    replaced, total, before, after = clean_glb(src, dst, threshold, strength, radius)
    print("%s -> %s images=%d/%d bytes %d -> %d" % (os.path.basename(src), os.path.basename(dst), replaced, total, before, after))
