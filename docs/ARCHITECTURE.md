# ARCHITECTURE

How HIS-TREE is put together. Read this before changing anything.

## Shape

```
index.html            shell: canvas, HUD, title card, loading bar, touch controls
src/main.js           boot, chapter lifecycle, render loop, lighting, atmosphere
src/core/             engine services (no game-specific knowledge)
src/world/            one builder per place; each returns { group, spawn, npcPositions, props }
src/data/story.js     CHAPTERS + DIALOGUE + the field-journal entries, all prose
src/ui/UI.js          panels, dialogue, journal, menu, ending card
src/npc/              NPC behaviour
assets/               models, textures, hdri, audio
vendor/three/         three.js r169 + addons, vendored (Patch serves from one origin only)
tools/                asset pipeline scripts
```

## Boot sequence

`boot()` → load four base models (`player`, `villager`, `palm`, `camel`) in
parallel → build `PostFX` → either show the chapter menu or, if `?chapter=` is
present, call `startChapter(id)` → start the render loop.

`startChapter(id)` is the single entry point for a chapter:

1. `disposeWorld()` — tears down the previous world, NPCs, props and quest
2. `setAtmosphere(chapter)` — sky, fog, environment probe, sun/hemi/ambient levels, post preset
3. build the world and the chapter config (spawn, NPCs, positions)
4. `makePlayer()` → place at spawn → place the camera behind the player
5. `loadCharacters()` — load and ground each NPC
6. construct `Quest` and `quest.start()` — plays the opening dialogue

## Chapter config

Each chapter branch in `startChapter` builds a `cfg`:

```js
cfg = {
  spawn: Vector3,          // where the Timekeeper starts
  npcs: [{ id, file, fallback, label }],
  positions: { [id]: { x, z, rotation? } }
}
```

`props` come from the world builder and are `{ position, label, desc }` triples —
the `desc` is what the journal shows when you inspect the object.

## Camera

Two systems share one camera.

**ThirdPersonController** (`src/core/ThirdPersonController.js`) — the gameplay
camera. Player-relative, collision-free (it never raycasts; the world clamps the
player instead).

- `yaw`, `pitch`, `distance = 6.4`, `height = 2.5`
- Forward vector: `(sin yaw, 0, cos yaw)`
- Camera offset: `(-sin yaw·cos pitch, sin pitch, -cos yaw·cos pitch) × distance`

The horizontal offset is **negated** on purpose: the camera must sit *behind*
the player relative to the direction of travel. (An earlier version had it
positive, which put the camera in front of the player — pressing W drove the
player into the camera and through the south wall.)

`yaw = Math.PI` at start means forward is `-Z`, i.e. facing the stage in
Ford's Theatre.

**CameraDirector** (`src/core/CameraDirector.js`) — scripted shots for the
quest beats: `add()`, `cut()`, `moveTo()`, `lookAt()`, with easing, FOV changes
and focus pulls. It drives the camera only while a shot is active; the gameplay
controller owns it otherwise.

## Rendering

`PostFX` (`src/core/PostFX.js`) builds an `EffectComposer`:

```
RenderPass → GTAOPass → BokehPass → UnrealBloomPass → OutputPass → GradeShader
```

- `GTAOPass` — ambient occlusion, so objects sit in the room instead of floating
- `BokehPass` — depth of field, focus pulled to whatever you are looking at
- `UnrealBloomPass` — practical light bloom
- `OutputPass` — tone mapping + colour space
- `GradeShader` — custom pass: chromatic aberration, lift/gain/tint, contrast,
  saturation, film grain, vignette

Presets: `mali`, `lincoln`, `mud`, `cold`, `hub`. One per chapter mood.
Quality tiers (`high` / `medium` / `low`) switch off AO, bloom and DoF and drop
device pixel ratio.

Renderer: `ACESFilmicToneMapping`, `SRGBColorSpace`, `PCFSoftShadowMap`,
antialias on unless `?px=1`.

## Worlds

Each builder is a function that takes the scene and returns a plain object.
`Hall1865.js` is the most developed; `MaliTown.js` and `OtherEras.js` hold the
other three.

**Ford's Theatre** (`Hall1865.js`) — auditorium `W=52 D=36 H=13`, south wall at
`z=18`, stage at `z=-D/2+4.5`, backdrop at `z=-D/2+1.1`, 20×9 instanced seats in
`z∈[-8,4]`, proscenium arch, drapes, valance, pilasters, chandelier, footlights,
wainscot, west balcony. Materials come from `Materials.js`; `tileObjectUVs(group,
scale)` maps world-space UVs onto merged geometry, and `userData.noTileUV`
opts an object out.

## Quests

`Quest` (`src/core/Quest.js`) walks a chapter's `missions`, each with `steps`:
`goto` (reach a marker), `inspect` (look at a prop), `talk` (speak to an NPC).
The `auto` flag advances steps automatically for testing. Dialogue and journal
text live in `story.js` so the writing is all in one place.

## Data

`src/data/story.js` holds:

- `CHARACTERS` — name, role, birth, bio, provenance
- `CHAPTERS` — id, number, title, era, year, place, tagline, palette, post
  preset, lighting mode, `intro` dialogue, `missions`
- `DIALOGUE` — keyed by dialogue id, used by `talk` steps

Palettes are per-chapter colour sets (adobe, sand, wood, cloth hues) so the
atmosphere code stays generic.

## Conventions

- No comments in code unless asked for.
- Modules are ES modules with `import * as THREE from 'three'`; the import map
  in `index.html` resolves `three` and `three/addons/` to `vendor/three/`.
- Geometry created at runtime is marked `userData.ownedGeometry = true` so
  `disposeWorld()` can free it.
- New assets go in `assets/models/characters/` and are loaded by path from the
  chapter config.
