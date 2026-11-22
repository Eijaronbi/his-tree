---
kind: game
engine: three.js r169 (vendored, no CDN)
---

# HIS-TREE

A time-traveller walks into documented history, meets the people who were there, and either witnesses how it happened — or rewrites it and lives with the consequences.

HIS-TREE is built as a growing library of history, not a fixed set of levels. Each
episode is a self-contained moment — a place, a date, the people in the room and the
decision that hung on it. The first four are playable today; the tree is designed to
keep growing across cultures, centuries and continents.

## Play

- **ModelScope Studio (primary):** https://www.modelscope.ai/studios/Airnomics/his-tree
- **Mirror:** https://eijaronbi.github.io/his-tree/
- **Demo video (75 s, narrated):** `docs/media/his-tree-demo.mp4` · **Project report:** `docs/HIS-TREE-report.pdf`

## What it is

HIS-TREE is a browser 3D game for [Patch](https://patch.gg). The first four episodes, each a real place at human scale:

| # | Chapter | Place | Year |
|---|---------|-------|------|
| 1 | **The Golden Empire** | Timbuktu / Djenné, Mali | 1324 |
| 2 | **Save Lincoln** | Ford's Theatre, Washington D.C. | 14 April 1865 |
| 3 | **The Quiet Mutiny** | Chemin des Dames, Western Front | 1917 |
| 4 | **The File That Doesn't Exist** | Berlin, 9 November 1989 | 1989 |

These four are the opening branches. The same episode format — a reconstructed
place, a sourced cast, a decision with two sides — is what lets HIS-TREE keep adding
events: a burning library, a printing press, a city on a lake, a wrong turn in Sarajevo.

You play the **Timekeeper**, who can move between these moments. Each chapter is a
guided investigation: walk the place, read the objects, talk to the people, then
make a decision that either confirms what history recorded or changes it.

Every journal entry carries a provenance tag — `VERIFIED`, `INTERPRETED`,
`DISPUTED`, `FICTIONAL_CHARACTER`, `FICTIONALISED_DIALOGUE`, `ALTERNATE_HISTORY` —
so the player always knows which parts are sourced and which are the game's own.

## Built with Aholo Lux3D

Every character in HIS-TREE — the four chapter casts, the twelve-variant theatre
crowd, and the player avatars — started as an image→3D generation on
**Aholo Lux3D** (Manycore Tech). The workflow was:

1. Reference stills (period portraits, museum photographs, public-domain plates)
   and a written prompt describing period, class, posture and clothing.
2. Lux3D image→3D generation for the base body, garments and props.
3. Blender cleanup: seam welding, floor alignment, skin-weight repair for
   procedural posing, and two decimation passes (`audience_lod` at 0.14,
   `audience_far` at 0.055) so 180 seated spectators can be instanced in one draw.
4. A per-asset face render (`tools/headshots.html`) to pick the avatar roster.

The iteration record — first generation, failure modes, and the corrected asset —
lives in [docs/PIPELINE.md](docs/PIPELINE.md). No third-party character or
environment models are bundled; the only vendored code is three.js r169.

## How to play

Open the game on Patch. Pick a chapter from the menu. You get a cinematic intro
video that establishes the moment, then control as the Timekeeper.

- **WASD** move · **Shift** run · **Mouse** look (click to capture the pointer)
- **E** or click — talk, inspect, advance dialogue
- **J** — field journal (all entries and their provenance tags)
- **P** — toggle avatar / first-person view. The HUD button (top right) does the
  same; the game always starts in **avatar** (third-person) mode.
- **F** — float/hover · **G** — fly (A/D banked turns, W/S climb) · **G** again — land
- **M** — music on/off · **Esc** — release the pointer

On touch devices an on-screen stick and a **RUN** button appear instead.

## How to run it locally

```bash
cd his-tree
python3 -m http.server 8099
# open http://127.0.0.1:8099/?chapter=washington-1865
```

Useful URL parameters:

| Parameter | Effect |
|-----------|--------|
| `?chapter=<id>` | Boot straight into a chapter (`mali-1324`, `washington-1865`, `france-1917`, `berlin-1989`) |
| `?auto=1` | Auto-advance the opening dialogue |
| `?q=low\|medium\|high` | Force a quality tier (otherwise auto-detected) |
| `?shadow=0`, `?lights=0`, `?post=0`, `?px=1` | Toggle individual rendering features for debugging |
| `?cam=box\|hall\|stage` | Park the camera at a fixed shot |

## Hosting

The game is a static site. Two supported paths:

**ModelScope Studio** (primary host, `sdk: static`) or **Vercel** — import this repository, or run `npx vercel --prod`. `vercel.json`
runs `scripts/build-dist.sh` and serves `dist/` (≈79 MiB, inside Vercel's 100 MB
Hobby static-upload limit) with immutable caching on `assets/`.

```bash
npm run build      # writes dist/
npm run serve      # previews dist/ on :8080
```

`dist/` carries only runtime files: `index.html`, `src/`, `thumbs/`, the vendored
three.js build, and the assets the game actually loads. Repository originals
(`assets/models/characters/audience/`, `assets/models/blender/`,
`assets/models/generated/`) stay in the repo for reproducibility but are not
shipped.

**Any static host** — copy `dist/` behind nginx/Caddy. No server runtime, no API
keys, no environment variables.

## Performance and delivery

The shipped build is deliberately small and cache-friendly:

- **Geometry and texture compression.** All 67 runtime GLBs are deduplicated,
  pruned, resampled, re-encoded (WebP q95) and meshopt-compressed:
  **195.7 MB → 65.2 MB (−66.7 %)** at 45–54 dB PSNR. Loaders use
  `EXT_meshopt_compression` via `src/core/GLTF.js` — a plain `GLTFLoader` cannot
  read these files. Originals live outside the repo; `optimise_assets.sh` rebuilds
  the compressed set.
- **Per-chapter payload.** A chapter streams only what it needs, using versioned
  URLs (`src/core/Assets.js`) and mobile texture variants (`src/core/AssetTiers.js`):
  Mali 15.7 MiB, Washington 20.5 MiB, France 9.5 MiB, Berlin 8.1 MiB.
- **Offline cache.** `sw.js` v4 precaches the shell and keeps fetched assets in
  IndexedDB (~220 MB budget), so a return visit is instant.
- **Adaptive quality.** `src/core/Quality.js` picks low/medium/high from the GPU
  and frame time, with render-scale floors of 0.72 / 0.75 / 0.8. The old 0.55 floor
  is what made the image look soft and "half screen"; first-person is pinned to 1.0.
  Override with `?q=low|medium|high`.
- **Memory.** `src/core/Memory.js` tracks textures and disposables per owner and
  releases a whole chapter world on exit.

`dist/` is ≈79 MiB and boots all four chapters with no failed requests.

## How to build on it

See the docs folder — it is the engineering context for the whole project.

| Document | What it covers |
|----------|----------------|
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Engine layout, module contracts, chapter data model, camera and post-processing |
| [docs/PIPELINE.md](docs/PIPELINE.md) | Every tool used to build the assets, with exact commands, and how to re-run it |
| [docs/REALISM.md](docs/REALISM.md) | The realism bar, how it is measured, and what "utmost realism" still needs |
| [docs/CINEMATICS.md](docs/CINEMATICS.md) | The video-intro system and how to author new intro videos |
| [docs/PRD.md](docs/PRD.md) | Product requirements and the production bible |
| [docs/TODO.md](docs/TODO.md) | Everything still outstanding, in priority order |

The `tools/` folder holds the asset-generation scripts (Lux3D image→3D, MPFB
character generation, Blender optimisation, Playwright capture). They read
credentials from files, never from the repository.

## Pictures

| Chapter | |
|---------|---|
| Timbuktu, 1324 | `preview/mali_house.png` |
| Ford's Theatre, 1865 | `preview/theatre-1865.png` |
| Western Front, 1917 | `preview/trench-1917.png` |
| Berlin, 1989 | `preview/archive-1989.png` |

## Licence

Patch licence. See [LICENSE](LICENSE). Copyright (c) 2026 airnomics.

All bundled assets are original, generated in-house, or public domain
(US Government / Library of Congress / Wikimedia Commons public-domain marks).
Any third-party asset added later must be CC0 or CC-BY-4.0 to stay shippable.
