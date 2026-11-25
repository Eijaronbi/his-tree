# TODO

Everything outstanding, in the order it should be done. The brief from the
person who owns this project:

> Ultra/hyper realism only. The Lincoln reference portrait is the bar. Every
> reference image must be clean and clear before it is converted. Scenarios
> must be painstakingly period-accurate. Do the research before building.
> The game opens with a video that tells the story, then the avatar takes over.

---

## Where it stands (2026-11-22)

Done and verified — `HANDOVER.md` has the evidence and file map:

- **Asset weight:** 67 runtime GLBs **195.7 MB → 65.2 MB (−66.7 %)** (PSNR 45–54 dB)
  via dedup → prune → resample → WebP q95 → meshopt; originals kept outside the repo.
  Built dist **116.7 → 79.1 MiB**; all four chapters boot with zero failed requests.
  Per-chapter payloads: Mali 15.7 / Washington 20.5 / France 9.5 / Berlin 8.1 MiB.
- **Delivery:** versioned asset URLs (`core/Assets.js`), meshopt loaders
  (`core/GLTF.js`), service worker v4 with an IndexedDB asset cache (~220 MB),
  mobile texture tiers (`core/AssetTiers.js`).
- **Quality:** adaptive low/medium/high tiers; render-scale floors raised
  0.55 → 0.72/0.75/0.8 (this was the "half screen / soft" image); POV pinned to 1.0;
  UI graphics selector.
- **Memory:** per-owner texture/disposable tracking and chapter-world disposal.
- **Flight:** Superman-style — head-up pose, 8 m cruise, steady banked turns, no yaw
  wobble, closer chase camera that keeps Lofi framed.
- **View modes:** avatar (third person) is the default; POV toggles with `P`/HUD,
  hides the body and renders at full scale.
- **Portraits:** all nine avatar portraits are full-front (`YAW = 0`), matching the
  selection preview's camera and light rig.
- **Turn stability:** `check_turn.py` shows the rig dead-centre (422,206), bank
  −0.55 rad held steady, heading turning steadily; the controller no longer
  integrates lateral velocity while flight is frozen.

### Next

- [ ] Finish face texture cleanup — the source AI textures still carry broad dark
      streaks. `clean_textures.py` (GLB image despeckle + buffer rebuild) works; tune
      the filter with `test_filters.py` (`optwork/tex_filters.png`) and re-render the
      nine portraits.
- [ ] Refresh perf/report and the asset inventory after the texture changes.
- [ ] Keep this file and `README.md` current — they were the last two behind the work.

---

## 0. Safety net — do first

- [ ] **Push the repo** to `git.patch.gg` so the work exists outside the VM
- [ ] **Mirror to GitHub** as a second copy (needs a fine-grained token)
- [ ] **Snapshot the VM** — blocked: the API key in use lacks `images:write`
      (needed by `instabox snapshot save`). Create a key with that scope.
- [ ] Free-plan check: the sandbox has run since 2026-10-19 with no 1-month
      cut-off, but the plan's billing cycle ends on the 16th. Keep the git
      remote and the GitHub mirror current so nothing is only on the VM.

## 1. Cinematics — the video intro

- [ ] `src/ui/Cinematic.js` — video overlay: letterbox, title card, skip,
      fade-to-black, handoff into gameplay
- [ ] Per-chapter `cinematic` config in `src/data/story.js` (video, title,
      subtitle, shot list)
- [ ] Wire into `src/main.js` `startChapter()` — the Timekeeper appears only
      after the intro
- [ ] `?cine=1` cinematic capture mode (HUD off, player hidden, input off,
      camera driven by the shot list)
- [ ] Capture and encode all four chapter intros (`ffmpeg` on the host)
- [ ] Fallback path: a chapter with no video starts gameplay immediately

## 2. Characters — the largest realism gap

- [x] Full-front selection portraits (were rendered in profile; now `YAW = 0` in
      `render_faces.py` and `PROFILE_YAW = 0` in `src/ui/AvatarPreview.js`)
- [ ] Remove the dark streaks baked into the source AI face textures before shipping
      (`clean_textures.py` + `test_filters.py`)
- [ ] Switch the player avatar off the MPFB `toon01` skin to a realistic skin
- [ ] Regenerate every NPC with realistic MPFB skins, eyes and hair
- [ ] Model era-correct garments: 1324 boubou/tagelmust, 1865 frock coat and
      stovepipe hat, 1917 M1917 uniform and Brodie/Stahlhelm, 1989 Stasi
      service dress and peaked cap
- [ ] Hair and beard for the 1865 cast (Lincoln's beard, Booth's hair)
- [ ] Replace the remaining Lux3D prop-busts used as characters with rigged humans

## 3. Lighting and materials — the second-largest gap

- [ ] Replace the theatre's dozen orange `PointLight`s with a key / cool fill /
      rim setup, and let the key cast shadows
- [ ] `RectAreaLight` for the gas chandeliers, footlights and lamps
- [ ] Strengthen GTAO so every object has a contact shadow
- [ ] Desaturate and darken the seat velvet; add `sheen` to
      `MeshPhysicalMaterial` for velvet, wool and satin
- [ ] Verify PMREM environment probes are actually applied per chapter
- [ ] Move from ACES to Neutral/AgX tone mapping to kill the orange crush
- [ ] Per-chapter grade LUT instead of global lift/gain/tint
- [ ] Bevel the primitive geometry (seats, balcony, pilasters)
- [ ] Fix the floating crowd heads — seat the crowd or use silhouettes
- [ ] Fix the west balcony slab and the bright wall gap on the right of frame
- [ ] Give the painted backdrop depth instead of a flat panel

## 4. Historical research

- [ ] `docs/DOSSIER_1865_1917.md` — Ford's Theatre architecture in 1865, the
      play and the exact line, PD character photographs with direct high-res
      URLs, 1917 trench construction, weapons with modelable measurements,
      uniforms, environment refs, scenario beats
- [ ] `docs/DOSSIER_MALI_BERLIN.md` — Timbuktu 1324 and the mosque geometry,
      every surviving depiction of Mansa Musa with clarity ratings, Berlin 9
      Nov 1989 timeline, Stasi uniforms, props, scenario beats
- [ ] Verify at least 80% of the URLs in both dossiers resolve
- [ ] Record the Mansa Musa "no photograph exists" limitation and the
      colourisation plan in the journal as `INTERPRETED`

## 5. Scenario writing

- [ ] Rewrite all four chapters' missions against the dossiers — no invented
      rooms, no anachronistic props, no wrong dates
- [ ] Ensure every journal entry carries the right provenance tag
- [ ] Verify the 1865 assassination beats: the play, the line, Booth's escape
      route, the guard's post
- [ ] Verify the 1917 beats against real dates (US entry 6 Apr 1917, first US
      troops 26 May 1917, Messines 7 Jun 1917, Passchendaele, Cambrai)
- [ ] Verify the 1989 beats: Schabowski ~18:57, announcement 19:01,
      Bornholmer Straße 23:30

## 6. Chapter completeness

- [ ] **WWI 1917** — full war setting: trench geometry, duckboards, sandbags,
      timber revetment, periscopes, wire, mud, a ruined village, and soldiers
      with weapons (Springfield/M1917, Lee-Enfield, Gewehr 98, Lewis gun,
      Vickers, Mills bomb, Stokes mortar)
- [ ] **Berlin 1989** — the wall itself, a gate, the Stasi officer, the Trabant,
      the file cabinets; wire the `stasi` NPC into the Berlin chapter
- [ ] **Mali 1324** — Djinguereber with its toron pattern and banco beams, the
      market, the caravan, the scholar
- [ ] **Lincoln 1865** — the theatre's boxes, the presidential box, the corridor
      and the Star Saloon

## 7. Image pipeline (VM installs)

- [ ] Real-ESRGAN (upscaler / cleaner)
- [ ] DDColor-tiny (colouriser)
- [ ] rembg with `u2net` / `isnet-general-use` (not the non-commercial default)
- [ ] TripoSR, if a local CPU image→3D is wanted alongside Lux3D
- [ ] ambientCG CC0 material pulls for mud, concrete, rusted metal, wool
- [ ] Wire the pipeline into `tools/` so the whole chain is one script

## 8. Polish and delivery

- [ ] Record all four chapters and all four endings
- [ ] Record the intro cinematics
- [ ] Deliver the final videos to the airdrop folder
- [ ] `pch check` — run the game in Patch's headless browser and read the report
- [ ] `pch validate` — check `patch.json` and the files
- [x] Budget check: runtime assets 65.2 MB, dist 79.1 MiB — well under 500 MB; no CDN;
      every asset CC0/CC-BY-4.0 (keep the Polyfork credit)
- [ ] `pch publish` from a Windows PC with Patch Desktop — **only when the
      person asks**

## 9. Known issues

- [x] **Fixed: headless/legless avatar.** `poseCharacter` baked float positions into the
      cloned `position` attribute; the meshopt-optimised GLBs store positions as
      normalised int8 (`KHR_mesh_quantization`), so every baked vertex truncated and the
      torso/head collapsed while the untouched legs survived. It now always writes a
      fresh `Float32Array` (position + normal), so the 1.1 MB quantised `lofi.glb` renders
      correctly again — and the quantised NPC/audience models are no longer mangled.
      Asset version bumped to `v4`, SW `his-tree-v7`, so clients pick up the fix.
- [x] **Fixed: flight pose head-down.** `Flight._poseFly` already lays the body flat
      (`rig.rotation.x = PI/2`), and the vertex shader added a *second* pitch (1.45 rad),
      so the avatar tipped ~176° head-down. The shader no longer pitches the body; it only
      poses limbs. Verified: body now horizontal, head forward, legs full and splayed.
- [x] **Flight arms extended forward (vertex approximation).** The Lofi source mesh
      (checked on the raw, unposed GLB from front/side/back) is symmetric with both hands
      tucked inside the coat pockets — there is no extended arm to reuse, so the old
      T-pose detector latched onto the coat's *back* panel (z<0) and rotating it did
      nothing visible. A new `aFlight` attribute marks a shoulder→pocket sleeve tube
      (radius-limited, symmetric, ~6.6k selected verts) and the flight block swings that
      tube ~169° about the shoulder X axis (position *and* normal) so both sleeves point
      ahead of the head once the rig lies the body flat. A neck guard keeps the collar
      closed (wider radii tore a hole there). Verified from directly above: two separated
      arms reach forward alongside the head, legs trail behind with both blue shoes
      intact, silhouette symmetric, no holes. Asset version `v4`, SW `his-tree-v9`.
      This is still a vertex approximation, not real arm articulation; the proper fix is
      a rigged mesh (§10.5 — cloud Blender armature + auto-weights + retargeted clips).
- [ ] Headless pointer lock fails, so mouse-look is limited in recordings
- [ ] SwiftShader cannot measure real frame rate
- [ ] The VM's `/data` is 84 % full (3.4 GiB free) — clear space before delivering
      large videos (or `instabox resize test --disk <GiB>`)
- [ ] The VM has no `ffmpeg`; mp4 conversion has to happen on the phone
- [ ] `instabox exec` caps each stream at 1 MiB and a command at ~60 s — run long
      jobs with `nohup … &` and read the log, and use `instabox pull` for binaries

## 10. Realism pipeline (free / near-free)

Reference points: **A: Alice, the Gathering** (UE 5.8, 3 people, 4 days, $22.97 actual
spend — witnesstodark.itch.io/a + /a-devlog) and the Patch stack (patch.gg/blender,
`@patchgg/cli`). Goal: more realistic scenery, characters and play **without** leaving
the three.js build.

### 10.1 Free asset sources (all CC0 / CC-BY, no paid tiers needed)

- [ ] **Poly Haven** (CC0): HDRI skies for each era + AO/GTAO maps → PMREM environment
      lighting instead of flat ambient light
- [ ] **ambientCG** (CC0): PBR sets (sand, mud, timber, plaster, rusted iron) → replace
      our flat-colour materials with normal/roughness/AO maps
- [ ] **Kenney** / **Quaternius** / **OpenGameArt** / **Sketchfab (CC0 filter)**:
      crates, barrels, baskets, rugs, awnings, 1865 theatre props, street clutter
- [ ] **BlenderKit** / **Fab free tier** (Epic account): high-res scans; keep the
      Polyfork (Horse/Donkey/Camel, CC BY 4.0) credit line
- [ ] **AI 3D generators, free tiers** (Tripo AI, Hunyuan3D, Rodin): one-off props
      (pots, statues, market goods, furniture) → retopo, UV, bake, export GLB
- [ ] Track every import: keep `docs/CREDITS.md` with source + licence per asset

### 10.2 Patch stack (cloud Blender + agent pipelines)

- [ ] Install the Patch CLI: `npm i -g @patchgg/cli` → `pch login` → **500 starter
      credits** ($0.01/credit, ~50 credits/hour → ~10 free cloud-Blender hours)
- [ ] `patch-gg/cloud-blender-skills` — 29 Blender skills (modeling, UVs, materials,
      baking, rigging, animation, clothing, hair, environments, weather, export, QA);
      run in Patch's cloud Blender with `--cloud`; GPU renders on L40S;
      `cloud.py fork --count N` runs N takes in parallel; files sync both ways
- [ ] `patch-gg/trompe` — paints a whole level from a gray blockout: plan cameras →
      FLUX paints each view → project + bake → textured `.glb`.
      `node scripts/texture.mjs --level <blockout.glb> --views 90 --atlas 8192 --style "..."`.
      Best for buildings seen from a few metres (Mali market, 1865 theatre); not for
      ground under the player's feet. ~1–4¢ per view (≈$4 for 90 views)
- [ ] `patch-gg/anymove` — motion capture for any creature from one AI video →
      fitted rig + GLB animation (NPC walk/talk, Lofi idle/flight)
- [ ] `patch-gg/crowdbricks` — batched motion for hundreds of characters (theatre
      audience, market crowd)

### 10.3 Engine realism (three.js — no rewrite)

- [ ] IBL per era: HDRI → `PMREMGenerator`, sun + sky colour matched to the time of day
- [ ] PBR everywhere: normal/roughness/AO maps, correct metalness, no flat colours
- [ ] Contact shadows / GTAO / SSAO; verify PostFX pass order (grade → bloom → bokeh →
      GTAO → output) and that shadows are on for the low tier too
- [ ] LODs + GPU instancing for props/crowd (cloud Blender batch does 3 LODs × 64 chars)
- [ ] Atmosphere: per-era sky, dust motes, heat haze, wind on awnings/banners
- [ ] Audio: footsteps per surface, market/harbour ambience beds (Freesound CC0),
      per-space reverb
- [ ] Characters: authored idle/walk/fly clips (anymove), no "hands in pocket" silhouette

### 10.5 Character realism — which tool fixes what

The cast looks "AI-made" for three separate reasons; each has a different tool.

| Problem we see | Tool that fixes it | Cost |
| --- | --- | --- |
| Face/skin blotches, streaks, baked-in noise in the texture (Lofi's speckled face, the streak on the 1865 portraits) | **Our own pipeline** first (`clean_textures.py` despeckle → `blur_lift` in `test_filters.py`, threshold 45–60, strength 0.75–0.85), then repaint only what is still broken with an **image model** and re-bake through **cloud-blender-skills** (materials + baking skills) | free on our side; cloud credits for the bake |
| Silhouette / proportions / clothing that reads as a costume rather than a person | **cloud-blender-skills** — modeling, clothing, hair, retopology skills on one live cloud scene; fork the session for variants and keep the best | ~1 cloud hour per character |
| Stiff, weightless motion (and the flight pose) | **`patch-gg/anymove`** — mocap any creature from one AI video, rig fitted in both views, GLB out; use it for walk / talk / carry / turn, then drive our `poseCharacter` shader from those clips | free (fal/credits for the video) |
| Crowd of identical stiff spectators | **`patch-gg/crowdbricks`** — batched motion for hundreds of characters | free tier |
| Unusable topology for animation (needs bone deformation) | **cloud-blender-skills** retopology + armature + automatic weights, then export a game-ready GLB with 3 LODs (cloud Blender does the LOD batch for a whole folder) | ~1 cloud hour per character |
| Flat materials on clothes (no fabric response) | **ambientCG** fabric/leather/wool PBR sets + **Poly Haven** AO, applied in the cloud Blender material skills and baked | free (CC0) |
| A face that is simply not a face | **AI 3D generators** (Tripo / Hunyuan3D / Rodin free tiers) to generate a *replacement* head for the 1865 characters, then blend it into the existing head in cloud Blender | free tier, ~5–10 min |

Order of work: (1) texture cleanup on the current cast, (2) anymove clips for Lofi and the
NPCs, (3) cloud-Blender retopo/rig/LOD pass per hero character, (4) replace the weakest
faces with generated heads. Keep the existing models until a replacement beats them in a
side-by-side render (`render_faces.py` + `AvatarPreview.js`).

### 10.4 Unreal Engine 5 — can we move HIS-TREE there without rebuilding?

- [x] **Answer:** the *assets* move almost 1:1 (our GLBs import through UE's Interchange
      glTF/GLB pipeline, PBR textures included), but the *gameplay code* does not — the
      three.js/JS layer has to be re-authored in Blueprints or C++. There is no
      three.js → UE compiler.
- [ ] Practical constraints here: the UE editor needs ~80–100 GB and a desktop GPU;
      our sandbox/VM cannot run it — the Windows PC would need Epic Games (free tier,
      GitHub-linked). A remake also means re-authoring quest logic, flight, dialogue,
      UI and save state.
- [ ] **Recommendation:** keep shipping the three.js build now (1.1 MB quantised GLBs,
      86 MB dist, runs on the phone) and spend the free Patch credits on the asset
      pipeline above. Revisit UE5 only for a remake with new content, not as a port.

## 11. Gameplay fixes

- [x] **Exit to chapters** — pause menu button that returns to the episode picker (`#pauseExit` → `openMap()`)
- [x] **Flight pose** — body horizontal, head forward, arms stretched forward and separated,
      legs full and spaced (was upright, arms at the sides, legs collapsed into one thin column)
- [ ] **Idle hands** — hands clear of the coat (they still read as being in the pockets; the
      idle push is a small `uArmOut` nudge, a rigged mesh is the real fix — §10.5)
- [x] **Objective arrow always on** during gameplay — falls back to the next quest step
      (`stepTarget`) or the last known target (`lastObjectiveStep`) when the current step
      has no world position
- [x] **Rotation fix** — the canvas kept its load-time inline pixel size after an
      orientation change, so the game filled only half the screen and the rest stayed
      dark; the canvas is now styled 100% and the viewport refits on resize /
      orientationchange / visualViewport resize
