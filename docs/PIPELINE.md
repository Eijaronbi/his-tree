# PIPELINE

Every tool used to build HIS-TREE's assets, and how to re-run it.

All of this runs in the **InstaBox VM `test`** (Debian 13, 4 vCPU, 8 GB RAM, no
GPU), not on the phone. The repo's `tools/` folder holds the scripts; they read
credentials from files, never from the repository.

```bash
instabox exec --timeout 600 test -- bash -lc '<command>'
```

Long jobs: `setsid nohup <cmd> > log 2>&1 &`.

## Environment

| Tool | Where | Note |
|------|-------|------|
| Blender | `/usr/bin/blender` (4.3.2) | headless; `--background --python script.py` |
| MPFB | `~/.config/blender/4.3/extensions/user_default/mpfb` | MakeHuman for Blender, already installed |
| MPFB assets | `/data/home/mp/sys_assets.zip` (280 MB) | skins, clothes, hair, eyes |
| ImageMagick | `/usr/bin/convert` | present on VM **and** host |
| ffmpeg | **host only** | the VM has none; convert webm → mp4 on the host |
| Playwright | `/data/home/venv-img/bin/python` | the system `python3` has no playwright |
| Lux3D key | `/data/home/.config/lux3d/api_key` | read at runtime, never committed |

Playwright runs Chromium with SwiftShader:

```
--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader
```

Headless pointer lock fails (`The root document of this element is not valid for
pointer lock`), so mouse-look is limited in recordings.

## 1. Source images

Two routes.

**Real photographs (preferred).** Public-domain material from the Library of
Congress (`loc.gov`), US National Archives, and Wikimedia Commons PD marks.
Historical reference URLs are collected in the dossier documents.

**Colourising / restoring.** For greyscale originals:

```bash
# restore + upscale (Real-ESRGAN, BSD-3)
python3 realesrgan-ncnn-vulkan -i photo.jpg -o photo_x4.png -n realesrgan-x4plus
# colourise greyscale (DDColor-tiny, Apache-2.0)
python3 scripts/infer.py --model_path <ddcolor-tiny.pth> --input in/ --outdir out/
# cut out the subject (rembg, Apache-2.0 weights)
rembg i -m u2net -vm photo_x4.png photo_cutout.png
```

Never use `bria-rmbg` (CC BY-NC) or CodeFormer (non-commercial).

## 2. Characters — MPFB

`tools/gen_characters.py` is the generator. It loads the MPFB addon, creates a
human, applies shape targets, assigns the skin material, adds eyes and hair,
and exports a GLB.

The pipeline that produced the current cast:

1. `tools/gen_characters.py` → MPFB human per character, per-chapter parameters
2. Blender texture bake + decimate → `tools/optimize_batch.py`
3. Output lands in `assets/models/characters/<id>.glb`
4. `assets/models/characters/<id>.glb` is referenced by the chapter config in
   `src/main.js`

The current cast still uses MPFB's `toon01` skin. Switching to the realistic
skins is the single highest-leverage character change — see `docs/REALISM.md`.

## 3. Props and hero busts — Lux3D

`tools/to3d.py` posts a source image to Lux3D's image→3D endpoint (G1-Turbo,
1 credit per model), polls for the result, downloads the GLB.

```bash
python3 tools/to3d.py --image /data/home/luxin/lincoln_lux.png --out /data/home/his-tree/assets/models/characters/lincoln_color.glb
```

`tools/pc_gen.py` and `tools/pc_probe.py` are the download/verification helpers
used alongside it.

## 4. Blender optimisation

`tools/optimize_batch.py` and `tools/render_opt.py`:

- bake textures to 1024 px JPEG
- decimate to roughly 150k triangles
- export GLB with `bpy.ops.export_scene.gltf(filepath=..., export_format="GLB")`
- render turntable previews for review

`tools/render_chars.py` produces the front / three-quarter contact sheets in
`visuals/characters-3d/`.

## 5. Textures

`tools/gen_textures.py` and `tools/mali_arch.py` generate procedural texture
sets and architecture. `tools/textures/` holds the generated albedo / normal /
roughness sets.

Downloaded CC0 PBR sets live in `assets/textures/` (Poly Haven: wood floor,
velour velvet, worn plaster wall, dirty carpet).

## 6. Capturing the game

```bash
# screenshot the running game
/data/home/venv-img/bin/python tools/diag_game.py washington-1865

# record a video (writes .webm)
/data/home/venv-img/bin/python tools/record_game.py washington-1865 75

# convert to mp4 — on the HOST, the VM has no ffmpeg
ffmpeg -i page@*.webm -c:v libx264 -pix_fmt yuv420p -crf 24 out.mp4
```

Serve the game first:

```bash
cd /data/home/his-tree && python3 -m http.server 8099
```

## 7. Moving files between the phone and the VM

`instabox exec` truncates stdout around 768 KB and prints a warning line, so
base64 through it corrupts binaries. Use a port forward instead:

```bash
# on the VM
cd /data/home && python3 -m http.server 8199 --directory /data/home &
# on the phone
instabox port-forward test --remote 8199 --local 8199 &
curl -o file.png http://127.0.0.1:8199/path/to/file.png
```

## 8. Deploying to Patch

```bash
pch whoami          # confirm the account
pch push            # push to git.patch.gg at any size (plain git caps at 100 MB)
pch publish         # release: uploads, tests in Patch Desktop, review, go live
```

`pch publish` needs Patch Desktop on a Windows PC. Until the game is finished,
push the repo but do not publish.

The repository uses **Git LFS** for every binary (`.glb`, `.png`, `.jpg`, `.mp4`,
`.zip`, …) via `.gitattributes`. Patch keeps the LFS objects.
