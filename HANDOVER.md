# HIS-TREE — OpenCode → Kimi: continue in `claw` (2026-11-22)

**Read this first.** OpenCode has stopped editing HIS-TREE. **Kimi owns the remaining
work from here**, in this workspace copy:
`/data/workspace/claw-workspace/projects/his-tree`.

## 0. State of play (what changed at hand-off)

- This claw copy was an **older, diverged snapshot** (git HEAD `f7b9624`, pre-optimisation
  sources, no `assets/audio`, no `assets/hdri`). It is now **synced from the live tree**
  `/data/home/his-tree`: `src/`, `assets/`, `vendor/`, `thumbs/`, `docs/` and all root
  code/scripts were copied. Verification:
  `diff -rq /data/home/his-tree/src ./src` → only `src/core/FrameMetrics.js` remains
  (claw-only, **unused**, safe to delete). `index.html` / `main.js` / `sw.js` md5s match.
- The live tree is `/data/home/his-tree` (served `:8099`); built dist is
  `/data/home/his-tree/dist` (`:8100`, `:8101`, `:8124`). Previous version worktree:
  `/data/home/his-tree-prev` (`:8105`).
- The claw working tree is **intentionally left uncommitted** (huge diff vs `f7b9624`).
  Make a checkpoint commit before editing: `git add -A && git commit -m "sync: live tree at hand-off"`.
- `/data` is at **84 % (3.4 GiB free)** — delete stale worktrees/logs before bulk ops.

## 1. What is DONE and verified (do not redo)

| Area | Result / evidence |
|---|---|
| **Flight (Lofi)** | Superman pose (`uPose=3`), real altitude (8 m cruise, floor 3.2, max 120), steady banked turns (`FLY_BANK_ANGLE 0.55`, rate-limited), yaw sway removed. Probe `check_turn.py`: rig dead-centre, bank settles −0.548 rad (31°), heading turns steadily, no oscillation. |
| **Flight pose (fixed 2026-11-25)** | The avatar flew **head-down**: `Flight._poseFly` already lays the body flat (`rig.rotation.x = PI/2 + pitch`) and the vertex shader added a *second* pitch (1.45 rad) → ~176°. The shader no longer pitches the body. **Arms:** the Lofi source mesh keeps both hands in the coat pockets (verified on the raw GLB from all sides), so a new `aFlight` attribute marks the shoulder→pocket sleeve tube and the flight block swings it ~169° about the shoulder X axis (position *and* normal, neck guard keeps the collar closed). Measured in-game: arms reach ahead of the head (`z` 1.813 vs the head front 2.118), separated (`x` −0.31/+0.36), legs full and split, no holes; from the front the two sleeves read as solid, separated limbs. The hands themselves stay in the pockets — a rigged mesh (§10.5 of `docs/TODO.md`) is the real fix. |
| **Flight camera** | `ThirdPersonController.targetHeight` (0.2 m in flight) keeps the body centred; chase `5.4 + alt*0.02`, pitch floor 0.1 → body ~79×88 px, horizon visible. |
| **Avatar/POV** | Avatar mode is hot default; `localStorage['his-tree:pov']` cleared on boot; `#btnView` names the **target**; `P` key + pause menu + touch. POV hides body, camera at eyes, render scale locked 1.0. Verified: load `pov=false`, cam≈5.4 m; toggle → `pov=true`, buffer 844×390; toggle back OK. |
| **Faces (front)** | Yaw probe proved **yaw 0 = full front** for all 9. `render_faces.py` (`YAW=0.0`, MeshoptDecoder, new light rig, exposure 1.14) re-rendered all 9 `thumbs/faces/*.png`. `AvatarPreview.js`: `PROFILE_YAW=0`, matching lights, auto-spin ±0.11 rad. |
| **Blotch cause** | `render_faces_cmp.py`: optimized vs original GLBs produce **identical dark streaks** → baked into the source AI textures, **not** compression damage. |
| **Texture cleaner** | `clean_textures.py` parses GLB, despeckles embedded images, rebuilds the buffer while preserving the meshopt payload (elegant 399664→348198 B, lofi 1093092→1050954 B; both load with 0 errors). |
| **§3 compression** | 67 GLBs **195,675,708 → 65,162,448 B (−66.7 %)**, PSNR 45–54 dB. Originals: `/data/home/his-tree-originals/models`. Script `optimise_assets.sh`. |
| **§6/§7 delivery** | `core/Assets.js` (CDN origin + versioned URLs), `core/GLTF.js` meshopt loader at all loader sites, `sw.js` (cache `his-tree-v9`) + IndexedDB asset cache (220 MB), `core/AssetTiers.js`. |
| **§8/§10 quality** | `core/Quality.js` tiers low/med/high, scale floors **0.72/0.75/0.8** (was 0.55 → the "half screen"), POV pinned 1.0; UI graphics select; `__game.quality`. |
| **§11 memory** | `core/Memory.js` (trackTexture/releaseOwner/disposeTree/memorySnapshot), `disposeWorld()`. |
| **dist** | `build_dist.py` fixed; dist **116.7 → 79.5 MiB**; 4 chapters boot with 0 failed requests. |
| **Perf/inventory** | payloads mali 15.67 / washington 20.46 / france 9.45 / berlin 8.05 MiB (`/data/home/luxin/perf-post-opt.txt`); inventory 680 files, 85.8 MiB, 0 unreferenced. |
| **Probes** | `check_shots.py` dismisses the auto-opening `#dialog` (`KeyE` ×4) → `dialogueOpen:false` in all states. `?auto=1` runs the quest to the end card — omit it from probes. |
| **Flight drift** | `ThirdPersonController.update` zeroes velocity and skips integration while `frozen` (Flight owns motion). `check_turn.py` now reports `vel:[0,0,0]` in every state; bank −0.55 rad and heading turn unchanged. |
| **Docs** | `README.md`, `docs/TODO.md` and `AGENTS.md` now cover compression/delivery/quality/memory/flight/POV/portraits (plus a HIS-TREE section in AGENTS). Synced to this workspace. |

## 2. OPEN WORK — do in this order

**Just completed (2026-11-22, before hand-off):** the flight lateral-drift bug is fixed —
`ThirdPersonController.update` now zeroes velocity and skips integration while `frozen`, so
Flight owns the motion. `check_turn.py` reports `vel:[0,0,0]` in every state while the banked
turn still reaches −0.55 rad and the heading turns steadily. Docs are updated
(`README.md`, `docs/TODO.md`, `AGENTS.md` now carry the compression/delivery/quality/memory/
flight/POV/portrait numbers), mirrored to this workspace.

### 2.1 Finish the face texture cleanup (highest value; user-facing)
The 9 portraits are front-facing now but **broad dark streaks remain**. The median filter
in `clean_textures.py` (`despeckle(threshold=26, strength=0.8)`) is too weak.
1. Look at `/data/home/his-tree/optwork/tex_filters.png` (original / median9 / blur5
   lift45 / blur9 lift60, 512² elegant texture).
2. `test_filters.py` already has the stronger candidate:
   `blur_lift(image, radius, threshold, strength)` — Gaussian blur, lift only pixels where
   `blur_luma - luma > threshold`. Pick radius 5–9, threshold 45–60, strength 0.75–0.85.
3. Port the winning filter into `clean_textures.py` (replace/augment `despeckle`), then run
   it over **all 9 roster GLBs** (sources, `assets/models/characters/audience_lod/` +
   `characters/lofi.glb`; list in `render_faces.py`):
   frock, officer, elegant, simple, worker, soldier, elder-f, elder-m, lofi.
4. Validate each output loads (`check_fly_pose.py`-style page load; expect `errors []`),
   then re-render portraits: `python3 render_faces.py` (serves `:8099`; stop the live
   server or edit the port) and rebuild `optwork/faces_sheet.png` with `make_faces_sheet.py`.
5. **Acceptance:** a 3×3 sheet where no face has a dark streak, and each model still loads
   with the meshopt decoder and no console errors.

### 2.2 Clean in-flight beauty shot
`optwork/shot5_fly_closeup.png` / `shot6_fly_bank.png` exist but the close-up camera lerps
back to 5.4 m. The flight **pose** is now correct (body horizontal, head forward, arms
forward — see the table above), so produce one convincing face-forward / arms-forward shot
(freeze the camera distance, keep the horizon in frame) for the README/report. Use the
game's own camera hook for framing: set `window.__cam = {p:[x,y,z], l:[x,y,z]}` (offsets are
relative to the player) and the game applies it every frame.

### 2.3 Refresh perf + report + inventory
`python3 perf_opt.py` → `/data/home/luxin/perf-post-opt.txt`; rebuild with `build_dist.py`;
refresh `docs/ASSET-INVENTORY.md` / `PERF-BASELINE.txt` via `make_inventory.py`. The report is
`docs/HIS-TREE-report.pdf` (no generator script survived — update it by hand if needed).

## 3. Ground truth you will need

- **GLB layout:** each optimized model has **two buffers** in JSON — buffer 0 = the single BIN
  chunk (images at 0 and 99184, then the `EXT_meshopt_compression` payload); buffer 1 = the
  meshopt **fallback** with no `uri` and **no second BIN chunk**. three.js never reads buffer 1
  (`GLTFMeshoptCompression` uses `getDependency('buffer', extensionDef.buffer)` + absolute
  `extensionDef.byteOffset`). `clean_textures.py` keeps the meshopt payload, appends cleaned
  images 4-byte aligned, and shifts `ext.byteOffset -= keep_from`.
- **Loaders must use MeshoptDecoder** (`core/GLTF.js`); a plain `GLTFLoader` fails with
  `Malformed buffer data: -1` / `Invalid typed array length`.
- **Pose:** model forward is local **+Z**; `CharacterAnim.js` `uPose > 2.5` is the flight pose;
  cache key `histree-pose-v6`. In flight the rig maps local **+y → world −z** (head forward)
  and local **+z → world +y** (face up).
- **Keys:** `F` toggleFloat, `G` toggleFly, `P` togglePOV, `#btnView` HUD. Flight HUD reads
  "G LAND", "A/D TURN", "W/S UP/DOWN".
- **Dialogue trap:** `#dialog` auto-opens at spawn and spoils screenshots → press `KeyE`
  (see `dismiss_dialogue()` in `check_shots.py`).
- **`?auto=1`** = quest auto-advance (`_autoTick`) → runs to the ending card; **do not** use in
  probes.
- **Probes hardcode `127.0.0.1:8099`** (`check_shots.py`, `check_turn.py`, `render_faces.py`).
  To serve the claw copy instead, stop the live server or change the port
  (`python3 -m http.server 8098` from the claw root).

## 4. Environment gotchas

- **`rsync` is NOT installed** — use `cp -a src/. dest/src/`.
- `instabox exec test -- '…'` has a ~60 s cap → `nohup … &` and log under
  `/data/home/luxin/logs/`; nested heredocs inside `exec '…'` break → use `python3 -c "…"`.
- `instabox` is flaky (TLS/handshake) — retry `push`/`exec` until "Pushed"/exit 0.
- Pillow on the VM: `python3 -m pip install --user --break-system-packages pillow` (PIL 13.0.0).
- Local editing flow: `/tmp/opencode/w` ↔ VM `src/` (push to `/data/home/his-tree/src/…`);
  there is no local `/data/home` and no local `:8099`.
- **Vision budget is limited**; `cerebras_review.py` is out of quota (HTTP 402). Prefer
  numeric probes (NDC bbox, buffer sizes, request logs).

## 5. Constraints (unchanged)

- Do **not** change the theatre stage actors or seated audience without the human's consent.
- Keep the visual identity; **no graphical regressions**; `amina.glb` is broken → stays off roster.
- Keep the Polyfork credit ("Horse/Donkey/Camel by Polyfork, CC BY 4.0") in the report.
- Avatar mode must stay the default with a working toggle (`pov === false` on load).
- Do **not** message Kimi externally; work only in this workspace.
