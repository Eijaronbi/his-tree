# Tooling Research — Zero-Cost, CPU-Only Realistic Asset Pipeline for a three.js Browser Game

**Date:** 2026-11-13
**Target hardware:** headless Debian 13 VM, 4 vCPU, 8 GB RAM, **no GPU**
**Scope:** research only — no game repo changes, no packages installed.
**License requirement:** everything shipped must be CC0 or CC-BY-4.0 (commercial-safe).

---

## 0. Executive summary

There is **no fully automated, zero-cost, CPU-only pipeline** that takes a historical photograph and produces a photoreal game-ready 3D asset at broadcast quality. The 2026 state of the art in image→3D (TRELLIS.2, Pixal3D, SF3D, InstantMesh) all assume a CUDA GPU with 8–24+ GB VRAM. On a 4-core, 8 GB, GPU-less VM the only image→3D path that is even theoretically runnable is **TripoSR** (MIT, 1.56 GB checkpoint), and its CPU output is a low-resolution (128–256 mesh, 1024² texture) approximation, not a hero asset.

The realistic quality strategy for this hardware is therefore **not** "generate the hero assets from photos." It is:

1. Use **archival photographs as texture references and detail maps**, not as geometry.
2. Build geometry from **CC0 scanned/authored asset libraries** (Smithsonian Open Access, Poly Haven, ambientCG, Quaternius, Kenney, Poly Pizza), cleaned headlessly in Blender.
3. Spend the (free) compute budget on **image restoration for the 2D/background/poster layers** and on **rendering quality in three.js**, where CPU-only cost is irrelevant at runtime (the user's browser has a GPU).
4. Use **TripoSR only for small props, set dressing, and placeholder blocking** — never for hero architecture.

This is the pipeline recommended in §7.

---

## 1. Area 1 — Image cleanup, restoration, colorization, and background removal

### 1.1 Comparison table

| Tool | Cost | License (code / weights) | CPU / GPU feasibility on this VM | Exact command | Download size | Quality verdict |
|---|---|---|---|---|---|---|
| **rembg** (`u2net`) | Free | MIT code / **Apache-2.0** weights | **Fully CPU-viable.** ~176 MB model, ~2.1 GB peak RSS, ~0.12 s/img on 6 cores | `pip install "rembg[cpu,cli]"` → `rembg i -m u2net -a input.jpg output.png` | 176 MB (`u2net.onnx`) | **Recommended default.** Blocky edges, but license-clean and tiny |
| **rembg** (`isnet-general-use`) | Free | MIT code / **Apache-2.0** weights | CPU-viable. ~170 MB model, ~2.8 GB peak RSS, ~0.33 s/img | `rembg i -m isnet-general-use -a input.jpg output.png` | 170.4 MB | Better edges than u2net, still safe commercially |
| **rembg** (`birefnet-general-lite` / `birefnet-general`) | Free | MIT code / **MIT** weights | **Risky:** BiRefNet runs at fixed 1024² and was OOM-killed above ~6.6 GB RSS in independent testing. On an 8 GB box, only the *lite* variant has a chance | `rembg i -m birefnet-general-lite -a input.jpg output.png` | 213.6 MB (lite) / 927.6 MB (full) | Best masks but **memory-risky**; use lite only, with `OMP_NUM_THREADS=2` |
| **rembg** (`bria-rmbg`, default) | Free download, **not free to ship commercially** | MIT code / **CC BY-NC 4.0** weights — BRIA agreement required for commercial use | Runs at 1024²; OOM-killed above 6.9 GB RSS in testing | `rembg i -m bria-rmbg -a input.jpg output.png` | 976.9 MB | **TRAP — do not use.** Default model is non-commercial |
| **rembg** with alpha matting (`-vm`) | Free | MIT code / Apache-2.0 weights + MIT ViTMatte code | CPU-viable but ~25 min / 1000 photos | `rembg i -m u2net -vm input.jpg output.png` | + ~176 MB ViTMatte | Best hair/edge quality of the *safe* options |
| **Real-ESRGAN** (`RealESRGAN_x4plus.pth`) | Free | **BSD-3-Clause** (code + weights) | **CPU-viable.** BasicSR/Torch CPU; slow at 4× on 4 cores | `pip install basicsr facexlib gfpgan` then `python inference_realesrgan.py -n RealESRGAN_x4plus -i in.png -o out --scale 4` | **63.8 MB** (weight) + ~1.6 GB CPU torch deps | **Recommended upscaler.** Best bang-for-bytes; 4× upscale then downscale for 2× clean-up |
| **GFPGAN** | Free | **Apache-2.0** | CPU-viable, very slow | `python inference_gfpgan.py -i in.png -o out -v 1.4 -s 2` | ~350 MB | Face restoration only — useful for **portraits** (Timbuktu faces), not architecture |
| **SAM 2** | Free | **Apache-2.0** | CPU-possible but heavy (torch ≥2.5.1, large weights) | Meta SAM 2 repo, `sam2.1_hiera_large.pt` | ~900 MB (large tier) | Interactive masks for compositing. **Optional**; rembg covers 90% of cases |
| **DDColor** (full) | Free | **Apache-2.0** | CPU-viable but slow; ~1.4 GB RAM | `python scripts/infer.py --model_path ./modelscope/damo/cv_ddcolor_image-colorization/pytorch_model.pt --input ./assets/test_images` | **869 MB** (`pytorch_model.bin`) | Good colorization quality; the reference implementation |
| **DDColor** (tiny) | Free | Apache-2.0 | **Best CPU choice.** Much smaller/faster | same command, `piddnad/ddcolor_paper_tiny` | **210 MB** (`pytorch_model.bin`) | **Recommended for VM.** ~80% of quality, ~25% of the size |
| **mini-unet-colorizer** (ONNX) | Free | MIT (typical) | **Best speed.** Pure ONNX Runtime, 256×256 | `python -m pip install onnxruntime opencv-python` → `colorizer.onnx` (256×256 input) | ~64 MB (approx.; not independently measured) | Very fast but coarse; good for bulk tinting, not hero plates |
| **DeOldify** | Free | MIT | **TRAP** — archived repo, ~4 GB+ of weights, effectively GPU-oriented, Linux-only | n/a | ~4 GB+ | **Do not use.** Dead project; DDColor supersedes it |

### 1.2 Notes and verified facts

- rembg model sizes are from the official **v0.0.0 GitHub release assets** (exact byte counts retrieved): `u2net.onnx` 175,997,641 B; `isnet-general-use.onnx` 170.4 MB; `birefnet-general-lite` 213.6 MB; `birefnet-general` 927.6 MB; `bria-rmbg-2.0.onnx` 976.9 MB; `u2netp.onnx` 4.4 MB; `silueta.onnx` 42.1 MB.
- rembg's own README warns: *"This image requires ~11GB of disk space (CPU version is ~1.6GB)."*
- rembg models cache to `~/.rembg/models/<model>/<model>.onnx`; set `U2NET_HOME` to relocate.
- **License risk is per-model, not per-tool.** rembg being MIT does not make the default `bria-rmbg` weights commercial-safe.
- Independent 2026 testing (creativeainews.com, 2026-10-01) on a 6-core container with ~6.9 GB free RAM: `u2net` 2.1 GB peak RSS / 0.12 s per image; `isnet-general-use` 2.8 GB / 0.33 s; all BiRefNet variants and `bria-rmbg` were OOM-killed at 1024². **On an 8 GB VM, prefer `u2net` or `isnet-general-use`.**
- Recommended ordering: `Real-ESRGAN` (restore) → `DDColor-tiny` (colorize if grayscale) → `rembg` (cut out) → `GFPGAN` (face-only repair).

---

## 2. Area 2 — Image → 3D

### 2.1 Comparison table

| Tool | Cost | License | CPU / GPU feasibility on this VM | Exact command | Download size | Quality verdict |
|---|---|---|---|---|---|---|
| **TripoSR** | Free | **MIT** (code + weights) | **Only real candidate.** Repo runs CPU (torch), but VRAM-tuned defaults; `~6 GB VRAM` target. CPU fallback works at reduced speed/resolution | `pip install -r requirements.txt && python run.py examples/chair.png --output-dir output/ --bake-texture` | **1.56 GB** (`model.ckpt`, exact 1,677,246,742 B) + torch CPU stack (~2.5 GB) | **Recommended** for props/placing only. 128–256 tris mesh, 1024² baked texture, blocky; **documented CUDA-build errors for `torchmcubes`** (pure-Python fallback is slow) |
| **InstantMesh** | Free | Repo MIT-ish (TencentARC) | **TRAP on CPU** — requires CUDA ≥ 12.1, PyTorch 2.1.0 + `xformers==0.0.22.post7` | `python run.py --input images/owl.png --output_dir outputs --use_stable_mesh` | `instant_mesh_large.ckpt` **1.41 GB** (1,514,818,077 B) + `diffusion_pytorch_model.bin` **1.61 GB** (1,732,056,502 B) | Excellent topology/UV; **unusable here** |
| **TRELLIS (1)** | Free | **MIT** | **Infeasible** — ~16 GB VRAM minimum | `python run.py --output_dir output --seed 42 --input_image input.png` | multi-GB | High quality, wrong hardware |
| **TRELLIS.2** | Free | MIT | **Infeasible** — ≥ 24 GB VRAM | same family | multi-GB | SOTA open 3D; wrong hardware |
| **Pixal3D** (TencentARC, SIGGRAPH 2026) | Free | Repo license; model weights per upstream | **Infeasible** — GPU-oriented (has `--low_vram`, still GPU) | `python inference.py --image input.png --output ./output.glb [--low_vram]` | multi-GB | Best open 3D quality; wrong hardware |
| **SF3D** (Stability AI) | Free | **Gated HuggingFace**; `stabilityai-ai-community` license (non-commercial restrictions apply) | **Infeasible** — custom CUDA/Metal texture-baker kernels, needs GPU | `python run.py --image_file input.png --output_dir output` | multi-GB | Excellent UV-unwrapped textured GLB; gated + GPU-only |
| **Hunyuan3D-2** | Free | Tencent community license (has commercial terms; verify) | GPU-oriented | `python3 -m hy3dshape --image_path ...` | multi-GB | Good; not CPU-viable |
| **Blender (headless) procedural conversion** | Free | **GPL** (Blender) | **Fully CPU-viable**, 4 cores OK | `blender --background --python script.py -- in_dir --blend --decimate 0.25` then `bpy.ops.export_scene.gltf(filepath='out.glb', export_format='GLB')` | **~360 MB** tarball (Blender 4.5.9 linux-x64; 377,929,956 B) | **The actual workhorse.** Decimate → remesh → UV → GLB, deterministic and license-clean |
| **Manual / photo-derived displacement** | Free | N/A | CPU-viable | Build a coarse mesh in Blender, use the archival photo as a **displacement + albedo texture** | negligible | **Highest quality-per-effort** for architecture (Ford's Theatre, Berlin Wall, trench) |

### 2.2 Notes and verified facts

- TripoSR checkpoint size was read directly from the HuggingFace API: `model.ckpt` = **1,677,246,742 bytes**.
- TripoSR's README documents `--bake-texture` and `--texture-resolution`; it also documents that `torchmcubes` needs a custom CUDA build and that the Python fallback is slow — a CPU-only install should expect a long first run.
- SF3D is **gated** on Hugging Face (requires accepting Stability's community license) and its texture baker uses custom CUDA/Metal kernels, so it cannot run on this VM even with a CPU attempt.
- TRELLIS/TRELLIS.2/Pixal3D VRAM floors (16 GB / 24 GB / GPU-oriented respectively) put them out of scope regardless of licensing.
- **Design conclusion:** for the four target settings (Ford's Theatre 1865, WWI trench, Timbuktu 1324, Berlin 1989), image→3D generation is the wrong tool. A low-poly **hand-built / photo-textured** mesh will look dramatically better than a 128-tri TripoSR guess, and it is free.

---

## 3. Area 3 — PBR textures and materials

### 3.1 Comparison table

| Tool / source | Cost | License | CPU / GPU feasibility | Exact command | Download size | Quality verdict |
|---|---|---|---|---|---|---|
| **Poly Haven** | Free | **CC0** (all textures & HDRIs) | Download only | `curl -O https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/<slug>_diff_1k.jpg` | 1k ≈ 1–2 MB; **2k HDR ≈ 6 MB; 4k ≈ 24 MB; 8k ≈ 94 MB** | **Recommended.** Best-consistent photoreal PBR sets, zero attribution needed |
| **ambientCG** | Free | **CC0** | Download only | `curl "https://ambientcg.com/api/v2/full_json?method=PBRPhotogrammetry&type=Material&sort=Popular"` then download `*_Color.jpg`, `*_Normal.jpg`, `*_Roughness.jpg`, `*_AO.jpg`, `*_Displacement.jpg` | typically 1–20 MB per 2k material | **Recommended**, especially for ground/terrain (mud, sand, rubble) |
| **Poly Haven API** | Free | CC0 | — | `https://api.polyhaven.com/assets?type=textures`, `/info/<slug>`, `/files/<slug>`, `/search?q=...&t=textures` | — | Verified live endpoints; use them to script asset selection |
| **Poly Haven HDRIs** | Free | CC0 | — | `https://api.polyhaven.com/types`, `https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/<slug>.hdr` | 1k ≈ 6 MB, 4k ≈ 24 MB, 8k ≈ 94 MB | Use for IBL; **do not exceed 2k on an 8 GB VM** |
| **Substance / Designer** | Paid | Proprietary | Desktop GPU | — | multi-GB | Out of scope (paid) |
| **Blender procedural materials** | Free | GPL | CPU-viable | Node-based Noise/Wave/Voronoi + Displacement → baked PNG | negligible | Good for stylised/tiling filler; use ambientCG for hero surfaces |
| **Patch.gg** | Free tier | **TRAP** — host-specific license, historically non-commercial and attribution-heavy | Download only | — | small | **Do not use.** Verify each pack's license; default to CC0 sources instead |

### 3.2 Notes

- All Poly Haven and ambientCG assets are **CC0** — the safest possible license for a commercial game.
- Material channel convention for both: **BaseColor / Normal / Roughness / AO / Displacement** at matching resolutions. 2k is the quality sweet spot for an 8 GB, 4-core VM and for in-browser memory.
- Displacement maps are for **background/close-up hero surfaces only**; use normal maps for everything else.

---

## 4. Area 4 — three.js photorealistic rendering (browser-side)

The browser is the user's GPU, so rendering cost on the VM is irrelevant; only *asset* generation cost is constrained. All addon paths below were verified to exist in three.js **r187** (`https://raw.githubusercontent.com/mrdoob/three.js/r187/examples/jsm/...`, all HTTP 200).

### 4.1 Comparison table

| Feature / addon | Path | Cost | CPU/GPU note | Exact usage | Quality verdict |
|---|---|---|---|---|---|
| **EffectComposer** | `three/addons/postprocessing/EffectComposer.js` | Free | Runs on client GPU | `new EffectComposer(renderer)` | **Required** for any post stack |
| **RenderPass** | `.../RenderPass.js` | Free | — | `composer.addPass(new RenderPass(scene, camera))` | Base pass |
| **GTAOPass** | `.../GTAOPass.js` | Free | **More expensive than SSAO**; default internal 512×512, `pdSamples` 16, `pdRings` 2, `blendIntensity` 1 | `gtaoPass.output = GTAOPass.OUTPUT.Denoise` | **Recommended AO** — ground-contact shadows are the single biggest realism cue |
| **SSAOPass** | `.../SSAOPass.js` | Free | Cheaper than GTAO | `new SSAOPass(scene, camera, width, height)` | Good fallback for low-end clients |
| **SAOPass** | `.../SAOPass.js` | Free | Moderate | `new SAOPass(scene, camera)` | Alternative; less robust than GTAO |
| **SMAAPass** | `.../SMAAPass.js` | Free | Cheap | `new SMAAPass(width, height)` | Cheap edge AA; use if MSAA off |
| **BokehPass** | `.../BokehPass.js` | Free | Moderate | `new BokehPass(scene, camera, {focus, aperture, maxblur})` | **DOF sells photorealism** for close-up props |
| **UnrealBloomPass** | `.../UnrealBloomPass.js` | Free | Moderate | `new UnrealBloomPass(resolution, strength, radius, threshold)` | Subtle threshold (≈0.9+) only; otherwise it looks cheap |
| **OutputPass** | `.../OutputPass.js` | Free | — | `composer.addPass(new OutputPass())` | Correct tone-map + color-space output in r152+ pipelines |
| **RectAreaLight** + `RectAreaLightUniformsLib` | `three/addons/lights/RectAreaLightUniformsLib.js` | Free | Client GPU | `RectAreaLightUniformsLib.init()` **(mandatory)** | **Recommended.** Soft window/skybox light — the other biggest realism cue |
| **PMREMGenerator** | core (`THREE.PMREMGenerator`) | Free | Client GPU | `pmrem.fromEquirectangular(hdrTexture)` | Correct IBL prefiltering from HDRIs |
| **Tone mapping** | core | Free | n/a | `NeutralToneMapping` / `AgXToneMapping` / `ACESFilmicToneMapping` | **Use `NeutralToneMapping`** (Khronos PBR Neutral) — colors closest to authored. AgX = muted filmic; ACES = shifts hues (and is the R3F default) |

### 4.2 Notes and verified facts

- three.js npm latest at time of writing: **0.187.0**, unpacked size **21,030,536 bytes** (~21 MB), 1,277 files.
- `PMREMGenerator` is **core** (`THREE.PMREMGenerator`), not an addon — the addon path 404s.
- Six built-in tone-mapping curves exist: `LinearToneMapping`, `ReinhardToneMapping`, `CineonToneMapping`, `ACESFilmicToneMapping`, `AgXToneMapping`, `NeutralToneMapping`.
- `RectAreaLightUniformsLib.init()` is required before any `RectAreaLight` — verified in the r187 source docblock.
- `GTAOPass.output = GTAOPass.OUTPUT.Denoise` is the documented path for the denoised variant.
- Practical realism stack order: `RenderPass` → `GTAOPass` → `BokehPass` → `UnrealBloomPass` (subtle) → `SMAAPass` → `OutputPass`.

---

## 5. Area 5 — Scene assets and archival imagery

### 5.1 Comparison table

| Source | Cost | License | CPU/GPU | Exact command / API | Download size | Quality verdict |
|---|---|---|---|---|---|---|
| **Smithsonian 3D** | Free | **CC0 / Open Access** | Download | `curl "https://3d-api.si.edu/api/v1.0/content/file/search?q=<term>&model_type=3d&file_type=glb"` | varies, typically MB–100 MB | **Recommended.** Real museum scans; best "found object" realism. Supports `file_type=glb`, `file_size` range, `gltf_orientation_compliant`, `draco_compressed` filters |
| **Poly Haven** | Free | **CC0** | Download | see §3 | 1k–8k | **Recommended.** HDRI + PBR |
| **ambientCG** | Free | **CC0** | Download | see §3 | 1–20 MB | **Recommended.** PBR materials |
| **Quaternius** (Furniture Pack) | Free | **CC0** (verify per pack) | Download | per-pack `FBX/OBJ/Blend` or glTF | small–medium | **Recommended.** Clean, consistent, stylised-realistic furniture for interiors |
| **Kenney** | Free | **CC0** | Download | asset packs | 1–50 MB | **Recommended.** Low-poly props, no attribution required |
| **Poly Pizza** | Free | **Per-model** license (must filter) | Download | web UI + per-model download | small | Usable; **check the license badge on every model** |
| **OpenGameArt** | Free | **Per-asset** license | Download | web UI | varies | Usable; license varies per asset |
| **Sketchfab** | Free tier | **Per-model** CC license (filterable) | Download | `GET https://api.sketchfab.com/v3/models/{UID}/download` with `Authorization: Bearer <token>` | varies | Download endpoint serves **glTF/GLB/USDZ only — no FBX/OBJ**. **End-user OAuth required**, so browser-side auth is impractical; use server-side with a token. Always apply the CC license filter |
| **Library of Congress** | Free | Mostly **public domain / no known restrictions** (verify per item) | Download | `https://www.loc.gov/photos/?q=<term>&dates=1800/1899&fo=json&c=100&at=results,pagination` → `image_url[-1]` (usually the largest) | 0.1–5 MB per image | **Recommended for historical photo references.** Good for Ford's Theatre (1865), WWI trench imagery, Berlin 1989 |
| **Image archives (Europeana, Rijksmuseum, NYPL, Smithsonian 2D)** | Free | Varies; often public domain | Download | JSON APIs | varies | Good photo sources; license must be checked per item |
| **patch.gg** | Free tier | **TRAP** — restrictive host license | Download | — | small | **Do not use** without a license audit |
| **Copyrighted film/game screenshots** | Free to download | **Illegal** | — | — | — | **Never** use in a shipped build |

### 5.2 Notes and verified facts

- Smithsonian API filters confirmed available: `q`, `model_url`, `file_type` (`jpg|glb|ply|zip`), `file_size` min/max, `file_quality`, `model_type`, `gltf_orientation_compliant`, `draco_compressed`. Smithsonian Open Access is CC0.
- LoC API confirmed: base `https://www.loc.gov/{endpoint}/?fo=json`; `c=100`, `at=results,pagination`; facets via `fa=`; `image_url` array where the **last** entry is generally the largest public JPEG (e.g. `..._v.jpg` 1024px). PPOC has its own JSON API at `https://www.loc.gov/pictures/api`.
- Sketchfab download API path and format restriction confirmed; OAuth end-user token required.
- Kenney = CC0, no attribution required. Quaternius = **per-pack** license; Furniture Pack is CC0.

---

## 6. "Do not use" / traps list

| Trap | Why | Safe alternative |
|---|---|---|
| **CodeFormer** | NTU S-Lab **non-commercial** research license | Real-ESRGAN (BSD-3) + GFPGAN (Apache-2.0) |
| **rembg default `bria-rmbg`** | Weights are **CC BY-NC 4.0**; commercial use needs a paid BRIA agreement | `u2net` or `isnet-general-use` (Apache-2.0) |
| **InstantMesh** | Requires CUDA ≥12.1 + pinned `xformers` — install fails on CPU-only VM | TripoSR, or hand-built meshes |
| **TRELLIS / TRELLIS.2 / Pixal3D / SF3D** | 16–24+ GB VRAM; SF3D also gated and needs custom CUDA/Metal texture baker | Photo-textured Blender meshes |
| **DeOldify** | Archived, ~4 GB weights, GPU-oriented, Linux-only | DDColor (Apache-2.0), tiny or full |
| **patch.gg packs** | Host-specific, often non-commercial/restrictive | Poly Haven, ambientCG, Quaternius, Kenney (CC0) |
| **Sketchfab / OpenGameArt / Poly Pizza without a license check** | License is **per asset**, not per site | Filter to CC0 / CC-BY-4.0 explicitly |
| **TripoSR as a hero-asset generator** | 128–256 tri output with baked 1024² texture reads as AI mush up close | Use it for props, debris, dressing only |
| **8k textures / 8k HDRIs** | 94 MB+ each; OOM risk in an 8 GB VM and in low-end browsers | Cap at 2k, use 1k for distant surfaces |
| **BiRefNet full models** | Fixed 1024² inference; OOM-killed above ~6.6–6.9 GB RSS | `birefnet-general-lite` at 213 MB, or `u2net` |
| **`ACESFilmicToneMapping` as the default** | Shifts hues and desaturates; it is the React-Three-Fiber default and causes the classic "why do my colors look wrong" bug | `NeutralToneMapping` (Khronos PBR Neutral) |
| **Using `RealESRGAN_x4plus` then not downscaling** | 4× output of a 1024px source = 4096px, ~4× memory for no visible benefit at game scale | Upscale 4×, then Lanczos-downscale to 1×–2× |
| **`RectAreaLight` without `RectAreaLightUniformsLib.init()`** | Silently renders wrong/unlit | Call `.init()` once at startup |
| **Shipping downloaded photographs without checking rights** | Publicly downloadable ≠ commercially usable | Prefer LoC public-domain items, and record the item URL + license per asset |

---

## 7. RECOMMENDED PIPELINE

**Strategy:** spend compute on 2D restoration and rendering fidelity; take geometry from CC0 libraries and build the four historical settings as photo-textured low-poly meshes.

### 7.1 Exact end-to-end command sequence (Debian 13, 4 vCPU, 8 GB RAM, no GPU)

```bash
# ── 0. Base tools (apt; ~360 MB Blender is the largest single download)
sudo apt update
sudo apt install -y python3-venv python3-pip ffmpeg blender git curl jq
# If Blender is not in Debian 13 repos:
# curl -L -o blender.tar.xz https://download.blender.org/release/Blender4.5/blender-4.5.9-linux-x64.tar.xz
# tar -xf blender.tar.xz && sudo mv blender-4.5.9-linux-x64 /opt/blender && sudo ln -s /opt/blender/blender /usr/local/bin/blender

# ── 1. Python image stack (CPU-only; ~1.6 GB deps, ~2.5 GB with torch CPU)
python3 -m venv /opt/assets-venv
source /opt/assets-venv/bin/activate
pip install --upgrade pip
pip install "rembg[cpu,cli]" basicsr facexlib gfpgan onnxruntime opencv-python torch torchvision --index-url https://download.pytorch.org/whl/cpu
# DDColor (Apache-2.0) in its own venv (older torch pin):
# git clone https://github.com/piddnad/DDColor.git && cd DDColor
# pip install -r requirements.txt && python scripts/infer.py \
#   --model_path ./modelscope/damo/cv_ddcolor_image-colorization/pytorch_model.pt \
#   --input ./assets/test_images --outdir ./out

# ── 2. Fetch source photographs (public domain; record item URLs for the asset ledger)
curl -s "https://www.loc.gov/photos/?q=Ford%27s%20Theatre%201865&fo=json&c=100&at=results,pagination" \
  | jq -r '.results[] | select(.image_url) | .image_url[-1]' > urls.txt
mkdir -p raw && cd raw && xargs -n1 -P4 curl -sO < ../urls.txt && cd ..

# ── 3. Restore (upscale + clean) — BSD-3, CPU-safe
python inference_realesrgan.py -n RealESRGAN_x4plus -i raw/photo.jpg -o work/photo_x4.png --scale 4
# then downscale back to 1x-2x with ffmpeg or PIL Lanczos

# ── 4. Colorize grayscale only (Apache-2.0)
python scripts/infer.py --model_path ./modelscope/damo/cv_ddcolor_image-colorization/pytorch_model.pt \
  --input ./assets/test_images --outdir ./work/colored

# ── 5. Cut out (Apache-2.0 weights; NOT the bria-rmbg default)
rembg i -m u2net -a -ae 10 work/photo_x4.png work/photo_cutout.png
# higher-edge alternative (still Apache-2.0, ~1.5 GB RAM):
rembg i -m isnet-general-use -a work/photo_x4.png work/photo_cutout.png
# hair/edge matte variant: rembg i -m u2net -vm work/photo_x4.png work/photo_cutout.png

# ── 6. Face-only restoration for portraits (Apache-2.0)
python inference_gfpgan.py -i work/portrait.png -o work/portrait_fixed.png -v 1.4 -s 2

# ── 7. Image → 3D (MIT) — PROPS AND DRESSING ONLY, never hero architecture
git clone https://github.com/VAST-AI-Research/TripoSR.git && cd TripoSR
pip install -r requirements.txt
python run.py ../work/photo_cutout.png --output_dir ../out/triposr --bake-texture --texture-resolution 1024
# Expect a long first run on 4 CPU cores; torchmcubes may need the pure-Python fallback.

# ── 8. Build hero meshes from CC0 scans + photo-textured low-poly bases
curl "https://3d-api.si.edu/api/v1.0/content/file/search?q=<object>&model_type=3d&file_type=glb&file_quality=3" \
  | jq -r '.response.rows[]? | .content.descriptiveNonRepeating.web.resources.content[]? | select(.fileType=="glb") | .url'
# then clean headlessly:
blender --background --python cleanup.py -- in_dir --blend --decimate 0.25
# cleanup.py must end with:
#   bpy.ops.export_scene.gltf(filepath="out.glb", export_format="GLB")

# ── 9. Pull CC0 PBR materials + HDRIs (Poly Haven / ambientCG)
curl "https://api.polyhaven.com/assets?type=textures" -o ph_textures.json
curl "https://ambientcg.com/api/v2/full_json?method=PBRPhotogrammetry&type=Material&sort=Popular" -o acg.json
# cap every material at 2k; download matching BaseColor/Normal/Roughness/AO/Displacement
# HDRI: 1k-2k only (2k ~= 6 MB, 8k ~= 94 MB)

# ── 10. Validate licenses before shipping
# Every asset needs: source URL, license string (CC0 or CC-BY-4.0), attribution text if CC-BY.
```

### 7.2 three.js runtime stack (client-side; no VM cost)

```js
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass }      from 'three/addons/postprocessing/GTAOPass.js';
import { BokehPass }     from 'three/addons/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass }      from 'three/addons/postprocessing/SMAAPass.js';
import { OutputPass }    from 'three/addons/postprocessing/OutputPass.js';
import { RectAreaLightUniformsLib } from 'three/addons/lights/RectAreaLightUniformsLib.js';

RectAreaLightUniformsLib.init();
renderer.toneMapping = THREE.NeutralToneMapping;   // Khronos PBR Neutral
renderer.toneMappingExposure = 1.0;

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const gtao = new GTAOPass(scene, camera, width, height);
gtao.output = GTAOPass.OUTPUT.Denoise;
composer.addPass(gtao);

composer.addPass(new BokehPass(scene, camera, { focus: 10, aperture: 0.0001, maxblur: 0.01 }));
const bloom = new UnrealBloomPass(new THREE.Vector2(width, height), 0.25, 0.5, 0.9);
composer.addPass(bloom);
composer.addPass(new SMAAPass(width * pixelRatio, height * pixelRatio));
composer.addPass(new OutputPass());
```

Use `PMREMGenerator.fromEquirectangular(hdr)` for IBL from the Poly Haven HDRI.

### 7.3 Per-setting guidance

| Setting | Geometry | Texturing | Key realism moves |
|---|---|---|---|
| **Ford's Theatre, 1865** | Low-poly facade + interior from scratch in Blender (or Quaternius/Poly Pizza props) | LoC public-domain photo as albedo + displacement | warm practical candle/footlight `RectAreaLight`; high AO in box seats; grain + slight bloom on the gas lamps |
| **WWI trench** | Blender-built modular trench segments | ambientCG mud/rubble PBR, normal + roughness driven | overcast HDR; heavy `GTAOPass`; wet-mud roughness variation; volumetric fog is cheap in three.js and hides low-poly edges |
| **Timbuktu, 1324** | Hand-built mud-brick blocks | Mud/clay material; photo reference for albedo only | harsh desert sun (`RectAreaLight` + strong directional), dust particles, warm bounce fill |
| **Berlin, 1989** | Wall segments + street props from CC0 libraries | Concrete PBR from ambientCG; archival photo as decal/prop texture | late-afternoon low sun, long shadows, sodium-vapour practicals for the contrast |

---

## 8. Confidence and gaps

### Verified live during this session
- Exact byte sizes: TripoSR `model.ckpt` 1,677,246,742; DDColor full 911,914,869; DDColor tiny 220,372,845; InstantMesh `instant_mesh_large.ckpt` 1,514,818,077 + `diffusion_pytorch_model.bin` 1,732,056,502; Real-ESRGAN `RealESRGAN_x4plus.pth` 67,040,989; rembg `u2net.onnx` 175,997,641; Blender 4.5.9 linux-x64 377,929,956; three npm 0.187.0 unpacked 21,030,536.
- rembg release asset table (all ONNX model sizes) and model-license breakdown.
- three.js r187 addon paths — `EffectComposer`, `RenderPass`, `ShaderPass`, `SAOPass`, `BokehPass`, `SMAAPass`, `OutputPass`, `UnrealBloomPass`, `GTAOPass`, `SSAOPass`, `RectAreaLightUniformsLib` all HTTP 200. `PMREMGenerator` confirmed **core**, not an addon (addon path 404s).
- API endpoint shapes for Poly Haven, ambientCG, Smithsonian 3D, Sketchfab download, and LoC JSON/PPOC.
- Independent 2026 rembg memory/time benchmark on a 6-core container (~6.9 GB free RAM).

### Explicitly unverified / estimates
- **CPU wall-clock time** for TripoSR, DDColor, Real-ESRGAN on this exact 4-vCPU Debian 13 VM — not measured. Order-of-magnitude expectation from published CPU baselines only; treat as *indicative*, not guaranteed.
- **Exact byte size** of `mini-unet-colorizer`'s `colorizer.onnx` — approximate.
- **Peak RAM** for DDColor and Real-ESRGAN on this VM — not measured; both should fit in 8 GB but were not profiled.
- Whether Debian 13's `apt` ships a Blender ≥ 4.0; the direct download fallback is provided.
- **Skill reference files missing:** `/root/.opencode/skills/agent-reach/references/search.md` and `/root/.opencode/skills/agent-reach/references/web.md` are referenced by `SKILL.md` but **do not exist** on this machine. Only `SKILL.md` is present, and its routing commands were used instead. This is a gap in the installed agent-reach package.
- `mcporter call 'exa.web_search_exa(...)'` failed intermittently with `ChildProcess.kill`; worked around with single retries.

### Licensing caveat
Licenses for DDColor (Apache-2.0), Real-ESRGAN (BSD-3), GFPGAN (Apache-2.0), TripoSR (MIT), rembg code (MIT), Quaternius Furniture Pack (CC0), Kenney (CC0), Poly Haven (CC0), ambientCG (CC0), Smithsonian Open Access (CC0) were confirmed from project pages during research. **Always re-check the exact weight/file you ship**, and prefer CC0 for game output to avoid attribution obligations. SF3D, Pixal3D, Hunyuan3D-2, and InstantMesh carry upstream/community licenses that require individual review and were **not** treated as CC0.

---

## 9. Bottom line

1. **Restoration/colorization** is genuinely free and CPU-viable: Real-ESRGAN (63.8 MB, BSD-3) + DDColor-tiny (210 MB, Apache-2.0) + rembg with `u2net`/`isnet-general-use` (Apache-2.0).
2. **Image→3D is the weak link.** Only TripoSR (MIT, 1.56 GB) runs here, and its output is prop-grade. Do not build hero assets with it.
3. **Geometry should come from CC0 libraries** (Smithsonian Open Access GLBs, Quaternius, Kenney) and be cleaned with headless Blender.
4. **PBR and lighting come free from Poly Haven + ambientCG (CC0)** and from three.js r187 addons (GTAOPass, RectAreaLight, PMREM, `NeutralToneMapping`).
5. **The license traps are the default rembg model (`bria-rmbg`, CC BY-NC), CodeFormer (non-commercial), and any unvetted patch.gg / Sketchfab / OpenGameArt / Poly Pizza asset.**
