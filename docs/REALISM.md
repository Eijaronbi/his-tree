# REALISM

The visual target, how it is measured, and what is still missing for the
"utmost realistic" version.

## The bar

The reference is the Lincoln portrait in the project's Lincoln folder:
`/mnt/sdcard/airdrop and work/Lincoln/mwds404gnuu7je (1).jpeg`.

It is **not** GTA 5 photorealism — GTA 5 depends on scanned human heads,
motion-captured actors, a deferred renderer and a studio-scale art budget, none
of which fit in a browser download served from one origin. What the reference
actually is: a **studio-lit cinematic bust render**. Three-point lighting, a cool
rim separating the subject from a dark background, sculpted skin and hair,
physical sheen on wool and satin, shallow depth of field, filmic grain and
vignette.

That tier is reachable, and it is the tier every chapter must hit.

## Measurable targets

From `docs/REALISM_SPEC.md` (24 targets). The load-bearing ones:

| Target | Value |
|--------|-------|
| Shadow floor (no crushed black) | RGB ≥ (12, 16, 22) |
| Single-hue frame occupancy | ≤ 65% of the frame |
| Texture repeat visibility | no visible tiling beyond 1.5 m |
| Skin | subsurface-warm in shadow, no flat diffuse |
| Wool / velvet | visible sheen, roughness 0.65–0.9 |
| Mid-frame exposure | grayscale mean ≈ 18, SD ≈ 25 in shadow passages |
| Grain | present but below the noise floor of a compressed video |
| FOV | 40–55° gameplay, 28–35° for dramatic shots |

The reference frame palette measured by ImageMagick:
`#5F270D, #A4531F, #D75426, #EB9C51, #F7CD91`.

## Where the build stands

Measured on the current theatre build: the frame is a single amber wash — one
hue across nearly the whole image. The specific gaps, in order of visual
leverage:

1. **One flat orange light.** A dozen orange `PointLight`s at intensity up to
   320 with no shadows. Nothing has a key, a fill or a rim, so nothing has form.
   *Fix:* one shadow-casting key, one cool fill, one rim; kill the rest.
2. **No contact shadows.** Objects sit on the floor without touching it.
   *Fix:* GTAO is already in the composer — verify it runs and is strong enough;
   add shadow-casting to the practicals.
3. **The player avatar is a cartoon.** `assets/models/character-female-c.glb`
   is an MPFB model wearing the `toon01` skin. *Fix:* regenerate with a
   realistic MPFB skin (see PIPELINE.md).
4. **Materials read as plastic.** Seats are bright saturated red with no sheen
   variation. *Fix:* desaturate, add `sheen` to `MeshPhysicalMaterial` for
   velvet and wool, use the bundled PBR sets properly.
5. **Geometry is primitive.** Box seats, flat backdrop, a slab balcony.
   *Fix:* bevels, edge wear, more subdivision where the silhouette matters.
6. **Crowd heads float.** Heads are placed above seats with no necks or bodies
   visible from the gameplay camera. *Fix:* seat the crowd properly or replace
   with shadowed silhouettes.

## Everything needed for the utmost realistic version

### 1. Characters — MPFB, not image→3D

MPFB (MakeHuman for Blender) is installed in the VM and already ships realistic
skin, eye, hair and garment assets:

- skins: `young` / `middleage` / `old` × `caucasian` / `african` / `asian` ×
  `male` / `female`, plus `toon01` (the cartoon look currently in use)
- clothes: `male_elegantsuit01`, `male_casualsuit01–06`, `female_casualsuit01–02`,
  `female_elegantsuit01`, `shoes01–06`, `fedora01`, `fedora_cocked`
- hair: `afro01`, `bob01`, `bob02`, `braid01`, `long01`, `ponytail01`, `short01–04`
- eyes: `high`, `low`

`tools/gen_characters.py` drives MPFB's `HumanService` and `TargetService`,
applies targets (age, stature, build) and assigns the skin material.

Lux3D image→3D is right for **props** and for the single hero bust. It is wrong
for the human cast: a photo-derived mesh has no rig worth walking and no
anatomy under clothing.

Per chapter the cast needs era-correct garments, which do not exist in the MPFB
set and must be modelled or textured:

| Chapter | Garments needed |
|---------|-----------------|
| 1324 Mali | boubou / kaftan, tagelmust turban, indigo cloth |
| 1865 | frock coat, waistcoat, cravat, stovepipe hat |
| 1917 | M1917 olive drab, campaign hat, puttees, Brodie helmet, Stahlhelm |
| 1989 | Stasi service dress, green peaked cap, Trabant-era civilian |

### 2. Image restoration and colourisation

For historical photographs that must become texture sources. Full comparison
tables and install commands are in `docs/TOOLING_RESEARCH.md`; the short version:

- **Real-ESRGAN** (BSD-3, 63.8 MB) — upscale and clean
- **DDColor-tiny** (Apache-2.0, 210 MB) — colourise greyscale
- **rembg** with `u2net` / `isnet-general-use` (Apache-2.0) — cut out.
  **Do not** use the default `bria-rmbg` weights: they are CC BY-NC and would
  make the build non-commercial.
- **CodeFormer** is non-commercial — excluded.

### 3. Image → 3D for props

- **Lux3D** (already in use) — 1 credit per model, API based, works for props
  and hero busts.
- **TripoSR** (MIT, 1.56 GB) — the only CPU-runnable local alternative; prop
  grade only.
- TRELLIS, TRELLIS.2, SF3D, InstantMesh, Pixal3D all need a GPU. The VM has
  none.

### 4. Environment and materials

- **Poly Haven** (CC0) — PBR sets and HDRIs. Already used for the theatre.
- **ambientCG** (CC0) — the gap for mud, concrete, rusted metal, wool.
- **Smithsonian Open Access / Library of Congress** — public-domain photographs
  and 3D scans for period props.
- Build the four settings as photo-textured low-poly geometry rather than
  hero scanned meshes: that is what fits a browser download.

### 5. Lighting and post

Already built, not yet tuned to the bar:

- PMREM environment probes for image-based lighting (`Environment.js`)
- `RectAreaLight` for the gas chandeliers and lamps — area sources, not points
- Neutral or AgX tone mapping instead of ACES for less orange crush
- One shadow-casting key light per scene; practicals cast shadows too
- Strengthen GTAO so every object has a contact shadow
- Per-chapter grade LUT rather than global lift/gain/tint

### 6. Cinematics

The intro videos are part of the realism budget: they set the visual
expectation before the player takes control. See `docs/CINEMATICS.md`.

## Licensing constraint

Everything shipped must be **CC0 or CC-BY-4.0** (Patch terms; commercial use).
Public-domain photographs from the Library of Congress, US National Archives
and Wikimedia Commons PD marks are fine. Lux3D output is licensed for
commercial use. Pollinations output was used for early concept images only.

## Known historical limitation

**There is no photograph of Mansa Musa.** He died in 1337, before photography.
The available depictions are manuscript illustrations — the Catalan Atlas (1370)
panel, the Buci manuscript, the Turin Pictorial Atlas, and the text of al-Idrisi
(1154). The Mali chapter's Mansa Musa is therefore an *interpreted* character
and must be labelled `INTERPRETED` in the journal, with the colourisation plan
recorded (gold leaf, indigo, madder red). This is a documented limitation, not
an oversight.
