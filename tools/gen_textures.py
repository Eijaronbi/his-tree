import os, subprocess, sys
import numpy as np

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'textures')
os.makedirs(OUT, exist_ok=True)
N = 1024


def pnoise(px, py, seed):
    rng = np.random.default_rng(seed)
    g = rng.random((py, px))
    ys = np.arange(N) * py / N
    xs = np.arange(N) * px / N
    y0 = np.floor(ys).astype(int) % py
    x0 = np.floor(xs).astype(int) % px
    fy = ys - np.floor(ys); fy = fy * fy * (3 - 2 * fy)
    fx = xs - np.floor(xs); fx = fx * fx * (3 - 2 * fx)
    y1 = (y0 + 1) % py
    x1 = (x0 + 1) % px
    v00 = g[np.ix_(y0, x0)]; v01 = g[np.ix_(y0, x1)]
    v10 = g[np.ix_(y1, x0)]; v11 = g[np.ix_(y1, x1)]
    FX = fx[None, :]; FY = fy[:, None]
    top = v00 * (1 - FX) + v01 * FX
    bot = v10 * (1 - FX) + v11 * FX
    return top * (1 - FY) + bot * FY


def fbm(base, octaves=5, gain=0.5, aniso=1.0, seed=0):
    out = np.zeros((N, N)); amp = 1.0; norm = 0.0; p = base
    for o in range(octaves):
        py = max(2, int(round(p)))
        px = max(2, int(round(p * aniso)))
        out += amp * pnoise(px, py, seed + o * 131)
        norm += amp; amp *= gain; p *= 2
    return out / norm


def norm01(a):
    a = a - a.min()
    m = a.max()
    return a / m if m > 1e-9 else a


def normal_from_height(H, strength):
    gy, gx = np.gradient(H * strength)
    n = np.dstack([-gx, -gy, np.ones_like(H)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    return n * 0.5 + 0.5


def save(arr, name):
    a = np.clip(arr, 0.0, 1.0)
    if a.ndim == 2:
        a = np.dstack([a, a, a])
    b = (a * 255.0 + 0.5).astype(np.uint8)
    b = np.ascontiguousarray(b[:, :, :3])
    raw = os.path.join(OUT, '_' + name + '.raw')
    b.tofile(raw)
    out = os.path.join(OUT, name)
    subprocess.check_call(['convert', '-size', '%dx%d' % (N, N), '-depth', '8',
                           'rgb:' + raw, out])
    os.remove(raw)
    print('  wrote', out, os.path.getsize(out))


def dead_grass(seed):
    return norm01(fbm(3, 4, 0.55, 1.0, seed))


def adobe(seed, tint):
    rng = np.random.default_rng(seed + 900)
    h = 0.55 * norm01(fbm(4, 6, 0.55, 1.0, seed)) + 0.45 * norm01(fbm(13, 4, 0.5, 1.0, seed + 7))
    big = norm01(fbm(2, 3, 0.5, 1.0, seed + 21))
    trowel = norm01(fbm(22, 3, 0.45, 2.2, seed + 33))

    straw = np.zeros((N, N))
    for k, (px, py, thr) in enumerate([(6, 120, 0.70), (120, 6, 0.72), (5, 80, 0.76)]):
        s = 0.6 * pnoise(px, py, seed + 101 + k * 13) + 0.4 * pnoise(px * 2 + 1, py * 2 + 1, seed + 131 + k * 13)
        s = norm01(s)
        straw = np.maximum(straw, (s > thr) * s)

    ridged = 1.0 - np.abs(2.0 * norm01(fbm(7, 4, 0.5, 1.0, seed + 55)) - 1.0)
    crack = np.clip((ridged - 0.72) / 0.28, 0, 1) ** 3

    speck = norm01(fbm(90, 2, 0.5, 1.0, seed + 71))
    dark_spot = np.clip((speck - 0.80) / 0.20, 0, 1)

    tone = 0.80 + 0.34 * h + 0.10 * (trowel - 0.5) * 2.0
    col = np.dstack([tint[0], tint[1], tint[2]]) * tone[..., None]
    col *= (0.96 + 0.08 * big[..., None])
    col += (straw * 0.30)[..., None] * np.array([1.0, 0.90, 0.66])
    col *= (1.0 - 0.42 * crack)[..., None]
    col *= (1.0 - 0.22 * dark_spot)[..., None]
    col += rng.normal(0, 0.013, (N, N, 3))
    col = np.clip(col, 0, 1)

    H = 0.65 * h + 0.30 * straw - 0.85 * crack + 0.18 * trowel
    nrm = normal_from_height(H, 2.6)

    rough = 0.74 + 0.20 * (1.0 - h) + 0.07 * straw + 0.10 * crack
    rough = np.clip(rough, 0.55, 0.99)
    return col, nrm, rough


def wood(seed):
    rng = np.random.default_rng(seed + 500)
    g = norm01(0.6 * pnoise(220, 3, seed) + 0.4 * pnoise(90, 5, seed + 5))
    fine = norm01(0.5 * pnoise(160, 7, seed + 11) + 0.5 * pnoise(70, 9, seed + 17))
    knot = norm01(fbm(5, 3, 0.5, 1.0, seed + 23))

    tone = 0.55 + 0.55 * g + 0.15 * (fine - 0.5) * 2.0
    col = np.dstack([0.36 * np.ones_like(g), 0.235 * np.ones_like(g), 0.135 * np.ones_like(g)]) * tone[..., None]
    col *= (1.0 - 0.35 * np.clip((knot - 0.75) / 0.25, 0, 1))[..., None]
    col += rng.normal(0, 0.010, (N, N, 3))
    col = np.clip(col, 0, 1)

    H = 0.7 * g + 0.3 * fine
    nrm = normal_from_height(H, 2.2)
    rough = np.clip(0.78 + 0.12 * (1.0 - g), 0.6, 0.95)
    return col, nrm, rough




def sand(seed):
    rng = np.random.default_rng(seed + 300)
    ripple = norm01(0.6 * pnoise(6, 160, seed) + 0.4 * pnoise(13, 320, seed + 3))
    grain = norm01(pnoise(600, 600, seed + 9))
    big = norm01(fbm(3, 3, 0.5, 1.0, seed + 17))

    tone = 0.86 + 0.20 * ripple + 0.10 * big
    col = np.dstack([0.88 * np.ones_like(ripple), 0.78 * np.ones_like(ripple), 0.58 * np.ones_like(ripple)]) * tone[..., None]
    col += (grain - 0.5)[..., None] * 0.10
    col += rng.normal(0, 0.010, (N, N, 3))
    col = np.clip(col, 0, 1)

    H = 0.7 * ripple + 0.3 * grain
    nrm = normal_from_height(H, 1.1)
    rough = np.clip(0.88 + 0.08 * (1.0 - ripple), 0.7, 0.99)
    return col, nrm, rough


def plaster(seed):
    rng = np.random.default_rng(seed + 400)
    mott = norm01(fbm(6, 5, 0.55, 1.0, seed))
    fine = norm01(fbm(40, 3, 0.5, 1.0, seed + 11))
    stain = norm01(fbm(2, 3, 0.5, 1.0, seed + 23))
    ridged = 1.0 - np.abs(2.0 * norm01(fbm(9, 4, 0.5, 1.0, seed + 31)) - 1.0)
    crack = np.clip((ridged - 0.80) / 0.20, 0, 1) ** 3

    tone = 0.90 + 0.14 * mott + 0.06 * fine
    col = np.dstack([0.80 * np.ones_like(mott), 0.75 * np.ones_like(mott), 0.66 * np.ones_like(mott)]) * tone[..., None]
    col *= (1.0 - 0.16 * np.clip(stain - 0.55, 0, 1))[..., None]
    col *= (1.0 - 0.35 * crack)[..., None]
    col += rng.normal(0, 0.008, (N, N, 3))
    col = np.clip(col, 0, 1)

    H = 0.6 * mott + 0.25 * fine - 0.7 * crack
    nrm = normal_from_height(H, 1.5)
    rough = np.clip(0.82 + 0.12 * (1.0 - mott), 0.6, 0.98)
    return col, nrm, rough


def velvet(seed, rgb):
    rng = np.random.default_rng(seed + 600)
    pile = norm01(0.55 * pnoise(300, 300, seed) + 0.45 * pnoise(120, 120, seed + 5))
    fold = norm01(fbm(4, 3, 0.5, 1.0, seed + 13))
    tone = 0.72 + 0.45 * pile + 0.25 * (fold - 0.5)
    col = np.dstack([rgb[0] * np.ones_like(pile), rgb[1] * np.ones_like(pile), rgb[2] * np.ones_like(pile)]) * tone[..., None]
    col = np.clip(col, 0, 1)
    H = 0.75 * pile + 0.25 * fold
    nrm = normal_from_height(H, 2.0)
    rough = np.clip(0.62 + 0.30 * (1.0 - pile), 0.4, 0.95)
    return col, nrm, rough


def wool(seed, rgb):
    rng = np.random.default_rng(seed + 700)
    weave = norm01(0.5 * pnoise(420, 420, seed) + 0.5 * pnoise(210, 210, seed + 3))
    weave = 1.0 - np.abs(2.0 * weave - 1.0)
    body_n = norm01(fbm(5, 4, 0.5, 1.0, seed + 7))
    tone = 0.85 + 0.22 * weave + 0.12 * (body_n - 0.5)
    col = np.dstack([rgb[0] * np.ones_like(weave), rgb[1] * np.ones_like(weave), rgb[2] * np.ones_like(weave)]) * tone[..., None]
    col = np.clip(col, 0, 1)
    H = 0.8 * weave + 0.2 * body_n
    nrm = normal_from_height(H, 1.4)
    rough = np.clip(0.80 + 0.10 * (1.0 - weave), 0.65, 0.98)
    return col, nrm, rough

VARIANTS = [
    ('v0', (0.80, 0.615, 0.395)),
    ('v1', (0.755, 0.575, 0.360)),
    ('v2', (0.825, 0.650, 0.430)),
]

print('numpy textures ->', OUT)
for i, (tag, tint) in enumerate(VARIANTS):
    print('adobe', tag)
    c, n, r = adobe(400 + i * 37, tint)
    save(c, 'adobe_%s_albedo.png' % tag)
    save(n, 'adobe_%s_normal.png' % tag)
    save(r, 'adobe_%s_rough.png' % tag)

print('sand')
sc, sn, sr = sand(11)
save(sc, 'sand_albedo.png')
save(sn, 'sand_normal.png')
save(sr, 'sand_rough.png')

print('plaster')
pc, pn, pr = plaster(23)
save(pc, 'plaster_albedo.png')
save(pn, 'plaster_normal.png')
save(pr, 'plaster_rough.png')

print('velvet')
vc, vn, vr = velvet(31, (0.36, 0.075, 0.075))
save(vc, 'velvet_albedo.png')
save(vn, 'velvet_normal.png')
save(vr, 'velvet_rough.png')

print('wool')
oc, on_, orr = wool(41, (0.085, 0.082, 0.075))
save(oc, 'wool_albedo.png')
save(on_, 'wool_normal.png')
save(orr, 'wool_rough.png')

print('wood')
wc, wn, wr = wood(77)
save(wc, 'wood_albedo.png')
save(wn, 'wood_normal.png')
save(wr, 'wood_rough.png')
print('done')
