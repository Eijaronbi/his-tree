# HIS-TREE — verified project status

Last updated: 2026-11-21 23:23 UTC (resumed saved run `c0914530-966e-4114-831f-5e833db33280`; no project restart)

This file separates observed evidence from planned work. Software rendering, emulated mobile viewports and screenshots are not evidence of physical-device performance.

## Current workspace, verified at resume

- Git is on `main` at `f7b9624` (`demo: Iapetus narration...`). The saved tree already contains 181 modified binary assets plus `docs/HIS-TREE-report.pdf`, an untracked `tools/inventory-assets.mjs`, baseline artifacts and context files. These pre-existing changes are preserved; none were reverted or regenerated in this resume.
- The previous static server is still running: `python3 -m http.server 8099 --bind 127.0.0.1` (PID 2406). `GET /index.html` returned HTTP 200 and 14,944 bytes. This server will be reused.
- `node --check` passed for every existing `src/**/*.js` file at resume.
- Node Playwright and `/usr/bin/chromium` are available. The old Python Playwright scripts are not directly runnable with the current Python environment and also contain host-only output paths; they must not be treated as current passing tests.
- `artifacts/baseline/` contains four desktop chapter captures, two emulated-mobile captures, a demo-video still, `runtime.json`, an asset inventory and downloaded research pages. All seven gameplay images were reopened with direct vision inspection.

## Measured baseline, not a hardware benchmark

`artifacts/baseline/runtime.json` recorded all four chapters with a world, player and quest, expected NPCs, and an initial `goto` quest step. The captures used Chromium/SwiftShader at 1280×720 desktop and 844×390 emulated-mobile viewports.

- Mali desktop/mobile, Washington desktop/mobile, France desktop and Berlin desktop captured successfully; no resource failures were listed.
- Automatic pointer lock produced `NotAllowedError` in the two desktop captures where it was attempted. Mouse look is therefore unverified.
- Renderer diagnostic values of one draw call and one triangle are not valid whole-scene measurements with the active post-processing path; this instrumentation must be corrected before claims are made.
- Observed median frame intervals were very slow under software rendering (approximately 333–1567 ms), while the HUD displayed 20–22 FPS. Source inspection found the defect: `src/main.js` computes FPS using simulation delta `dt = min(0.05, rawDt)`, discarding all real frame time above 50 ms and flooring the displayed result near 20 FPS. The displayed baseline FPS is false and must not be quoted as performance.
- These load/capture timings include software-render startup and screenshot work; they are not production loading benchmarks.

## Asset inventory, verified at resume

`node tools/inventory-assets.mjs <output>` reproduced the saved inventory exactly.

- 65 GLBs, 177,381,180 bytes total, no invalid GLB containers.
- Largest entry: `assets/models/generated/mali_house_glb.glb`, 11,338,324 bytes, 1 mesh, 58,440 triangles, no animations.
- Existing inventory records file size, meshes, materials, textures/image dimensions, triangles, animation channel counts and extensions. It does not yet establish per-chapter initial transfer size, decoded GPU memory or visual compression quality.
- No compression or asset replacement was performed in this resume. Original visual identity and user-modified assets remain untouched.

## Directly visible baseline defects

- **All chapters:** the player avatar has an obvious pale shoulder/back patch and bright hand/foot patches; characters remain stylised/low-detail rather than photorealistic.
- **Mali:** empty repetitive stalls, a floating cartoon-like camel/character immediately in front of the player, sparse palms and flat sandy ground; warm low-contrast HUD text is difficult to read. The capture alone does not establish whether the camel is an NPC mount or a gameplay defect.
- **Washington:** strongly orange lighting, repetitive crowd/body placement, flat primitive seating, over-bright footlight area, player material patches. Mobile controls overlap the health/combat strip and waypoint/“FOLLOW THE LIGHT” UI; an NPC is clipped at the right edge.
- **France:** enormous opaque vertical wall/fog-like slabs cross the centre of the view; repetitive rounded sandbags, sparse trench detail, grey flat lighting and low material variation.
- **Berlin:** the gameplay view is nearly completely occluded by a plain brown surface, so the archive environment cannot be visually assessed from this spawn/camera.
- **Demo-video still:** letterboxing/framing is visible, but narration timing, subtitle completeness and handoff require a real playback test rather than inference from a still.

## Work now in progress

1. Add a deterministic regression test for real-time FPS/frame-time instrumentation, then fix it without changing simulation clamping.
2. Build a reusable Node Playwright diagnostic/e2e runner against the existing 8099 server, with workspace-local outputs, actual assertions, raw renderer/frame samples and no claim that SwiftShader represents real GPU speed.
3. Reproduce and isolate the Berlin occlusion and France wall/slab defects, then make small visual fixes with before/after captures.
4. Exercise movement, interaction, dialogue/quest advancement, journal, pause, quality selection, flight/landing and mobile controls with real browser state assertions.

## Unverified / remaining original scope

- Full desktop/mobile completion of every mission, both authentic and clearly labelled alternate-history outcomes, and all endings.
- Physical Android device testing, GPU frame-time validation, thermal behavior and memory growth across repeated transitions.
- Photorealistic face/material improvement, period-accurate lighting/crowd/architecture repairs, locomotion polish beyond what the saved mechanics probes assert.
- Cinematic video/audio narration, subtitles, skip and gameplay handoff in real playback; onboarding usability.
- One researched, playable fifth chapter with sourced authentic and alternate-history branches. Saved HTML research downloads are source material, not a completed dossier or chapter.
- POV/WebXR with capability detection and a tested fallback.
- Measured adaptive quality (rather than only device/heuristic tiers), progressive loading, cache invalidation, asset disposal and visual-quality comparisons.
- Clerk identity and Supabase player history, including secure token handling, guest/local fallback and hosted end-to-end tests. Exact public project configuration/Clerk keys remain unavailable; no service-role secret may be shipped in this static browser app.
- `pch check`, `pch validate`, external publishing, pushes, snapshots and real-device release verification. No external publishing is authorised in this run.

## Evidence conventions

Each subsequent slice must record its command, exit status, output artifact and limits here. Screenshots are stored under `artifacts/`; new tests and outputs stay inside this project. No numerical performance, historical authenticity, hosted integration or completion claim is valid without executed evidence.
