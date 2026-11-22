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

- [ ] Headless pointer lock fails, so mouse-look is limited in recordings
- [ ] SwiftShader cannot measure real frame rate
- [ ] The VM's `/data` is 84 % full (3.4 GiB free) — clear space before delivering
      large videos (or `instabox resize test --disk <GiB>`)
- [ ] The VM has no `ffmpeg`; mp4 conversion has to happen on the phone
- [ ] `instabox exec` caps each stream at 1 MiB and a command at ~60 s — run long
      jobs with `nohup … &` and read the log, and use `instabox pull` for binaries
