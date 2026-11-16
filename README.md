---
kind: game
engine: three.js r169 (vendored, no CDN)
---

# HIS-TREE

A time-traveller walks into documented history, meets the people who were there, and either witnesses how it happened — or rewrites it and lives with the consequences.

## What it is

HIS-TREE is a browser 3D game for [Patch](https://patch.gg). Four chapters, each a real place at human scale:

| # | Chapter | Place | Year |
|---|---------|-------|------|
| 1 | **The Golden Empire** | Timbuktu / Djenné, Mali | 1324 |
| 2 | **Save Lincoln** | Ford's Theatre, Washington D.C. | 14 April 1865 |
| 3 | **The Somme Mud** | A Western Front trench sector | 1917 |
| 4 | **The Wall** | Berlin, 9 November 1989 | 1989 |

You play the **Timekeeper**, who can move between these moments. Each chapter is a
guided investigation: walk the place, read the objects, talk to the people, then
make a decision that either confirms what history recorded or changes it.

Every journal entry carries a provenance tag — `VERIFIED`, `INTERPRETED`,
`DISPUTED`, `FICTIONAL_CHARACTER`, `FICTIONALISED_DIALOGUE`, `ALTERNATE_HISTORY` —
so the player always knows which parts are sourced and which are the game's own.

## How to play

Open the game on Patch. Pick a chapter from the menu. You get a cinematic intro
video that establishes the moment, then control as the Timekeeper.

- **WASD** move · **Shift** run · **Mouse** look (click to capture the pointer)
- **E** or click — talk, inspect, advance dialogue
- **J** — field journal (all entries and their provenance tags)
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
