# HIS-TREE — Product Requirements Document & Production Bible

Version 1.0 · 2026-11-12 · Owner: @airnomics · Target: patch.gg (browser), later Reddit Devvit

> Experience History. Rewrite Destiny.

---

## 1. One-line pitch

A time-traveller walks into documented history, meets the people who were there, and either witnesses how it happened — or rewrites it and lives with the consequences.

## 2. Product pillars

| # | Pillar | What it means in build terms |
|---|--------|------------------------------|
| P1 | **History you can walk into** | Every episode is a real 3D place at human scale, not a text page or a quiz. |
| P2 | **Truth is labelled** | Every fact in the journal carries a provenance tag: VERIFIED / INTERPRETED / DISPUTED / FICTIONAL / ALTERNATE. |
| P3 | **Two modes, one world** | Historical Mode replays what happened. Rewrite History Mode is explicitly fiction and shows its consequences. |
| P4 | **Cinematic realism** | The screen must look like a film still, not a browser demo: real light, real materials, real lens. |
| P5 | **Consequences you can feel** | Decisions persist in localStorage and change dialogue, endings and later episodes. |

## 3. Non-goals (v1)

- No combat-first design. Mechanics serve each era.
- No multiplayer, no accounts, no backend.
- No open-world; each episode is a compact 120 m × 100 m stage (P1 spec).
- No claim that fictional dialogue is a verified quotation.
- No glorification of atrocities (WWII scenario, if ever built, is labelled alternate history strategy).

## 4. The realism bar — what "exactly like the reference" means

**Reference:** `Game images/lincoln.jpg` — a cinematic still of Lincoln seated in a red velvet chair, US flag bunting in the foreground, warm gaslight hall behind, shallow depth of field, film grain, warm film LUT.

Forensic breakdown (from vision analysis) and how each element is produced in three.js:

| Reference quality | Cause | Our implementation |
|---|---|---|
| Reads as film, not render | Warm LUT, lifted-but-rich blacks, fine grain, soft vignette, subtle bloom | Custom post chain: `RenderPass → SSAO/contact → UnrealBloom (0.35) → BokehPass (f/2 equiv) → output grade (LUT 3D texture) + grain + vignette` |
| Creamy bokeh background | 85–135 mm equiv, wide aperture | Perspective camera FOV ~28°, near 0.1, DOF focus tracked to subject 1.6–2.5 m |
| Form-sculpting light | Large warm key front-right + cool ambient fill + bounce | 1 warm key (2700 K, area) + hemisphere bounce + HDRI dim ambient + baked AO |
| Soft, detailed shadows | Large source + GI | PCSS/PCFSoft 2048–4096 shadow map, shadow radius tied to source size; baked AO map on all static meshes |
| Skin that is not waxy | Subsurface + roughness variation | `MeshPhysicalMaterial` skin with thickness/attenuation approximation + SSS-ish light wrap shader; 4K albedo/roughness/normal with pore detail |
| Velvet with directional sheen | Anisotropy / velvet BRDF | `sheen`, `sheenRoughness`, `sheenColor` on chair + curtains; normal-mapped tufting |
| Wool suit with weight | Fine weave normal + low spec | 2K weave normals, roughness .78, subtle fuzz rim |
| Fabric folds, not flat cards | Real geometry + normal detail | Cloth modelled in Blender (profiled folds), 512–1K normal maps, no intersecting planes |
| Everything slightly imperfect | Dirt, edge wear, colour break-up | Weathering pass: grunge masks, edge wear decals, base-of-wall grime, per-object hue jitter |
| Camera has a point of view | Eye-level, slight up-angle, rule-of-thirds, lead room | `CameraDirector` presets per beat: `portrait`, `over_shoulder`, `wide_establish`, `detail` |
| Foreground/mid/back separation | Layered composition + haze | Physical fog with height falloff, foreground props within 0.8 m of lens |

**Acceptance test (M-lincoln):** a blind A/B — our render next to `lincoln.jpg` — must be judged by the vision model as "same visual language: cinematic photoreal with shallow DOF, warm grade, film grain" even if subject/era differ. Numeric proxies: mean luminance 90–130, shadow clip < 2 % of pixels, top-decile highlight < 250, grain σ 1.5–3.5 in mid-tones.

**Honest constraint:** a browser cannot ship UE5/Lumen. We reach the *photographic language* with baked GI + post + hero assets + strict framing. Distant background stays impressionistic (fog, bokeh, silhouettes) exactly as the reference does.

## 5. Art direction per era (no universal look)

Each episode carries its own palette, light, materials, music and props. No "one look for all of history".

| Episode | Palette | Light | Materials | Sound |
|---|---|---|---|---|
| E1 Mali 1324 | ochre `#C8A26A`, banco `#C99D6B`, sky `#8FC0E8`, gold `#D9A537`, indigo `#2E3F6E` | hard high sun, warm bounce off sand, dusty aerial haze | banco mud (rough .9), straw-flecked, toron timber, dyed cotton, hammered gold, leather | kora/ngoni-inspired strings, balafon, dunun, market crowd, wind, camels |
| E2 Lincoln 1865 | gaslight amber `#D4B17B`, burgundy `#6E2B2A`, suit black `#1B1B18`, flag blue `#4F5D73` | warm interior practicals, no daylight, theatrical | wool, velvet, aged brass, plaster, cotton bunting | strings/piano parlour, crowd murmur, footfalls, clock |

## 6. Episode 1 — THE GOLDEN EMPIRE (Mali, 1324)

**Premise.** The player arrives in a trading town of the Mali Empire in the year Mansa Musa passes through on his way to Mecca. The empire is the richest in the world; its wealth is salt, gold and books. The player has 24 hours of game time to help a caravan leave, and learns that the real treasure being carried is knowledge.

**World (120 × 100 m):** market square, merchant stalls, residential compound, caravan yard, scholar's courtyard, royal audience pavilion, desert viewpoint, connecting lanes.

**Characters.**
| Name | Type | Role | Function |
|---|---|---|---|
| **Amina** | fictional | caravan guide, 30s, Tuareg-Malian | tutorial, caravan mission, gives the player the "you are not from here" hook |
| **Sundiata the Younger** (in-game name: *Bakary*) | fictional composite | salt merchant | market mission, teaches gold–salt exchange |
| **Al-Hajj Salim** | fictional scholar | teacher at the courtyard | scholarship mission, books as cargo |
| **Mansa Musa** | historical | emperor | audience mission; dialogue is clearly marked FICTIONALISED |
| **The Timekeeper** | fictional | hub NPC | frames modes, meta-narrative |

**Missions (Historical Mode).**
1. **Arrival** — learn movement/interaction; meet Amina. Objective: reach the market.
2. **The Marketplace** — inspect goods, learn the salt/gold exchange rate, get the caravan manifest stamped.
3. **Preparing the Caravan** — collect 3 loads (salt slabs, dyed cloth, books), load the camels, balance weight vs water.
4. **The Emperor** — reach the audience pavilion; answer three questions about what Musa's pilgrimage means.
5. **The Discovery** — assemble the journal entry that closes the episode: why Timbuktu/Djenné matter.

**Rewrite History Mode (small but real).**
- Choice A: divert caravan funds to the scholar's library (→ ending: "The Library Endures").
- Choice B: buy extra water instead (→ "The Desert Crossed").
- Choice C: invest in a new well on the trade road (→ "The Road Remembers").
Each produces a distinct epilogue card, journal entry tagged ALTERNATE HISTORY, and a persisted flag.

## 7. Episode 2 — SAVE LINCOLN (Washington, 14 April 1865)

**Why it exists:** it is the flagship proof of the Rewrite History pillar and the realism benchmark.

**Structure.**
- **Cold open cinematic** (hand-authored, reference-matched): seated Lincoln in the velvet chair, bunting foreground, warm hall, 85 mm, f/2. 25–40 s, no interaction, `ESC` skips.
- **Investigation act:** Ford's Theatre exterior/interior + boarding house, 3 evidence objects, 2 witnesses (fictional composites), a timeline the player must assemble.
- **Intervention act:** timed sequence at the theatre door; three intervention points; success/failure matrix.
- **Historical Mode:** the documented outcome is preserved; the player cannot prevent it, only understand it.
- **Rewrite History Mode:** prevention possible; epilogue states clearly this is fictional and what really happened.

**Characters:** Lincoln (historical, modelled, not AI-image substitute), Mary Todd Lincoln (historical), John Wilkes Booth (historical, antagonist), fictional usher and fictional seamstress as witnesses.

**Realism requirement:** this chapter ships at "Cinematic" quality tier by default; it is the showcase.

## 8. Systems

- **Provenance journal** — every entry object: `{id, title, body, tag, sources[], unlockedBy}` with tag ∈ VERIFIED / INTERPRETED / DISPUTED / FICTIONAL_CHARACTER / FICTIONALISED_DIALOGUE / ALTERNATE_HISTORY.
- **Dialogue** — data-driven nodes: `{id, speaker, lines[], choices[{text, next, flag, requires}]}`. No branching explosion; 2–3 choices per beat.
- **Consequences** — `flags` in localStorage; read by dialogue conditions, mission availability, and epilogue selection.
- **Modes** — global `mode: 'historical' | 'rewrite'`; changes objective sets and epilogue, never changes factual journal text.
- **Save** — `his-tree:save:v1` with episode, mission index, flags, journal ids, settings.
- **Camera director** — named shots; gameplay is third-person, dialogue/cinematics cut to authored shots.
- **Quality tiers** — Cinematic / Balanced / Performance, auto-detected from GPU + user toggle.

## 9. Technical architecture

```
index.html            importmap + boot
src/main.js           app shell, mode routing
src/core/             Input, ThirdPersonController, CameraDirector, Audio, PostFX, Quality
src/world/            Materials (PBR library), MaliTown, LincolnHall, Props, Weather/FX
src/game/             MissionSystem, DialogueSystem, Journal, Consequences, Save
src/data/             episodes.js, story.js (dialogue), journal.js, characters.js
assets/models/        blender/ (kit), chars/, library/, generated/
assets/textures/      pbr sets, decals, LUTs
vendor/three/         three r169 + addons (Postprocessing, GLTFLoader, DRACO)
```

Budgets (Cinematic tier): ≤ 450k triangles visible, ≤ 220 draw calls, ≤ 180 MB GPU textures, 1080p ≥ 45 fps on integrated GPU, ≤ 25 MB initial download.

## 10. Asset production pipeline

| Tier | Source | Method | Used for |
|---|---|---|---|
| Hero props / architecture | Blender kit scripts (`tools/mali_arch.py`, `lincoln_hall.py`) | parametric mesh + 1–2K PBR maps + baked AO | houses, hall, chair, bunting |
| Characters | MPFB2 base mesh in Blender → sculpt tweak → rig → GLB, or Lux3D mesh + auto-rig where acceptable | 4K skin, hair cards, cloth | player, NPCs, Lincoln |
| Small props | patch.gg library CC0/CC-BY | fetch + optimise | stalls, palms, baskets |
| Textures | numpy generator (`tools/gen_textures.py`) | tileable albedo/normal/rough/AO | banco, timber, sand, cloth, velvet |
| LUT + grain | generated (numpy/ImageMagick) | 3D LUT 32³ applied in post | era grades |

**AI disclosure:** Lux3D output is AI-assisted; disclosed in CREDITS and README. AI images are not used as substitutes for rigged characters or playable environments (per brief).

## 11. Milestones & acceptance

| ID | Deliverable | Done when |
|---|---|---|
| M0 | This PRD + story/character bible | committed |
| M1 | Realism pipeline | post chain + IBL + LUT + DOF presets live; A/B vision check passes on a still |
| M2 | Mali environment rebuilt | reference-style still of market at golden hour; 45+ fps |
| M3 | Characters | player + 4 NPCs rigged, idle/walk/talk; dialogue camera works |
| M4 | Mali episode complete | 5 missions + rewrite branch + journal + epilogues playable end-to-end |
| M5 | Lincoln chapter | cold open matches reference language; investigation + intervention complete |
| M6 | Shell & polish | hub, menus, save, audio, credits, perf pass, `pch check` clean, pushed to patch.gg |

## 12. Risks

1. **Character quality** is the single biggest realism risk → MPFB2 eval first; fallback = Lux3D mesh + manual rig + cinematic framing.
2. **Perf vs post FX** → tiered quality; SSAO/DOF off on Performance.
3. **Historical accuracy** → every journal claim cites a source; disputed items tagged; dialogue marked fictionalised.
4. **Scope** → Mali must be complete before Lincoln starts; Lincoln ships as a focused chapter, not a city.
5. **Platform** → devvit port deferred; keep assets web-light.
