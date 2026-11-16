# Photoreal 3D Browser Game — Realism Specification

**Status:** visual QA / research only  
**Reference set:** four local character renders plus three current-build captures  
**Primary comparison target:** `fix_d0.png` (theatre interior)  
**Measurement note:** hex values are approximate sRGB values obtained with ImageMagick region averages and 8-color quantisation. They describe the supplied pixels, not authored source materials.

## 1. Source inventory and visual interpretation

| Asset | Dimensions | What it depicts | Primary value |
|---|---:|---|---|
| `mwds3w38z9prxd.jpeg` | 768×768 | Frontal, chest-up Lincoln character portrait: elderly male, swept dark hair, beard, black bow tie, dark three-piece suit, white shirt; neutral dark studio background. | Cool, hard, editorial character key light and very detailed face/material separation. |
| `mwds3yp5w3fswk.jpeg` | 768×768 | Slightly three-quarter Lincoln portrait; same 19th-century formal costume, dark studio background, body turned slightly toward screen right. | Warm/cool split lighting, near-black cloth rendering, controlled facial rim light. |
| `mwds404gnuu7je (1).jpeg` | 768×768 | Three-quarter Lincoln portrait looking toward screen left, visible ear and sculpted side locks, lapels, waistcoat, cravat/bow, white collar. | Cool side key, blue-grey garment, crisp cloth folds and facial relief. |
| `mwds41dz9axyap (1).jpeg` | 768×768 | Three-quarter Lincoln portrait turned slightly toward screen right, against a softly blurred smoky grey-green environment. | Outdoor/cinematic soft key, broad atmospheric separation, strongest skin/hair/cloth material realism. |
| `fix_d0.png` | 1280×720 | Current third-person theatre interior: warm orange auditorium, rows of red seats, wooden floor and stage, red curtain, dark columns, simplified low-poly characters, UI overlay. | Primary gap-analysis frame. |
| `fix_d2.png` | 1280×720 | Current near-black close view of a vertical wood-textured surface/wall with UI only. | Diagnostic: extreme underexposure and insufficient readable shadow detail. |
| `03-washington-1865-theatre.png` | 1280×720 | Earlier/current alternate theatre view with auditorium, stage, curtain, columns, player and simplified audience figures. | Useful for scene-layout and material comparison, but not one of the four portrait references. |

### Important scope note

All four supplied references are **cinematic 3D/AI-style Lincoln portraits**, not photographs and not theatre interiors. They therefore define a strong **character realism, costume material, portrait-lighting, and image-finish bar**. The theatre screenshots must be evaluated against the transferable parts of that bar: believable light falloff, coherent contact shadows, material roughness variation, controlled contrast, fine-scale edge/detail behavior, and photographic post-processing. A literal transfer of the references’ dark portrait lighting into every gameplay interior would make navigation unusable.

---

## 2. Measured palette

### 2.1 Reference palette

The first three images use an intentionally low-key charcoal studio palette. The fourth opens into a cool, hazy grey-green environment and provides the highest diffuse background luminance.

| Image | Region | Approx. sRGB hex | Note |
|---|---|---:|---|
| R1 `mwds3w38z9prxd.jpeg` | Background / dominant shadow | **#1C2326** | Blue-charcoal, never neutral pure black. |
| R1 | Forehead midtone | **#95948D** | Desaturated warm-grey skin. |
| R1 | Cheek / warm skin | **#D5CBBC** | Broadest facial highlight cluster. |
| R1 | Hair / coat shadow | **#1F2A2D** | Cool black with blue lift. |
| R1 | Coat midtone | **#41403C** | Warm charcoal fabric. |
| R1 | Shirt / cool cloth | **#A0A6A2** | Blue-grey off-white, subdued rather than clipped. |
| R1 | Skin warm accent | **#A08A75** | Muted ochre-brown. |
| R2 `mwds3yp5w3fswk.jpeg` | Background / dominant shadow | **#201F1F** | Neutral charcoal. |
| R2 | Forehead / warm key | **#6D5049** | Warm brown skin in shadowed key region. |
| R2 | Hair / coat shadow | **#343330** | Near-black with restrained value lift. |
| R2 | Face highlight | **#D4C8B2** | Warm cream highlight. |
| R2 | Skin midtone | **#A88E71** | Tan-brown. |
| R2 | Coat / vest shadow | **#141516** | Very dark but not crushed. |
| R2 | Shirt / cloth highlight | **#728486** | Cool grey cloth. |
| R3 `mwds404gnuu7je (1).jpeg` | Background | **#1D2122** | Charcoal with green-blue bias. |
| R3 | Forehead light | **#AB A0 90** | `#ABA090` | Neutral warm skin highlight. |
| R3 | Face midtone | **#8D8472** | Warm grey-tan. |
| R3 | Hair | **#182328** | Blue-black. |
| R3 | Coat highlight | **#525852** | Desaturated cool cloth. |
| R3 | Coat / skin shadow | **#3C413C** | Soft charcoal with hue separation. |
| R3 | Shirt | **#7B8580** | Green-grey white. |
| R3 | Cool edge accent | **#34494E** | Subtle cyan-grey rim/scene reflection. |
| R4 `mwds41dz9axyap (1).jpeg` | Background | **#788984** | Soft grey-green atmosphere. |
| R4 | Bright background | **#9BA397** | Milky cool highlight. |
| R4 | Background midtone | **#5D625C** | Muted environmental green-grey. |
| R4 | Hair / deepest shadow | **#1B1F21** | Black with cool lift. |
| R4 | Forehead / skin | **#5D554B** | Low-contrast warm-grey skin. |
| R4 | Face midtone | **#3F423F** | Cool-neutral shadow. |
| R4 | Warm skin accent | **#8D8472** | Muted ochre. |
| R4 | Shirt / cloth | **#788984** | Cool grey-green textile. |
| R4 | Highlight cream | **#D8CEBA** | Highest diffuse highlight; not clipped white. |

**Palette rules derived from references**

- Backgrounds and garments occupy a narrow cool-charcoal family: approximately **#1B1F21–#343330**, rather than RGB 0 black.
- Skin remains warm against cool surroundings: approximately **#8D8472–#D8CEBA**, with the brightest reference skin tones below white.
- White cloth is never paper-white; it resolves to **#728486–#A0A6A2** under illumination.
- Blue-grey/cyan edge accents are subtle, around **#34494E–#73888E**.
- Reference luminance statistics (8-bit grayscale): R1 mean 47 / SD 39; R2 mean 42 / SD 36; R3 mean 58 / SD 45; R4 mean 88 / SD 55. These are low-key portrait distributions, not acceptable gameplay-wide means.

### 2.2 Current build palette

| Capture / region | Approx. sRGB hex | Note |
|---|---:|---|
| `fix_d0.png` global mean | **#8A411C** | Very warm/orange average. |
| Seat upholstery | **#7A110A** | Saturated dark red. |
| Floor | **#C4320F** | Highly saturated orange-red. |
| Wall | **#913510** | Strong orange cast. |
| Column | **#44230E** | Brown-black, but mostly texture/noise. |
| Player skin/hat area | **#5D4C2D** | Muddy yellow-brown. |
| `fix_d0.png` dominant colors | **#5F270D**, **#A4531F**, **#D75426**, **#EB9C51**, **#F7CD91** | Almost the entire frame belongs to one warm family. |
| `fix_d2.png` global mean | **#040200** | Near-total underexposure. |
| `fix_d2.png` grayscale | mean 3 / SD 5 | Almost no recoverable spatial information. |

---

## 3. Reference-by-reference realism breakdown

### R1 — `mwds3w38z9prxd.jpeg`

**Depiction and composition.** Perfectly frontal Lincoln bust, symmetric and filling roughly 80% of frame height. The face is the focal point; shoulders and formal clothing form a stable triangular base. Background is an unobtrusive dark blue-charcoal studio field.

- **Lighting direction:** Dominant key from upper camera-left/front, visible in the brighter left forehead and cheek planes. A weaker cool fill arrives from screen right. Hair and shoulders retain narrow rim separation. Contrast is studio-like but not flat.
- **Softness/shadows:** Broad facial falloff with soft-edged eye sockets, under-nose and under-lip shadows. Hairline and jaw contact shadows are denser than cheek shading. No hard theatrical shadow edges.
- **Palette:** Cool charcoal environment **#1C2326**; warm-neutral skin from **#8A7562** through **#D5CBBC**; cool-black hair **#1C2326/#1F2A2D**; coat **#41403C**; shirt **#A0A6A2**.
- **Materials:** Skin has a matte/waxy dielectric response, not glossy plastic; pores, wrinkles, and warm subsurface-looking redness are visible. Hair is strand-grouped with soft anisotropic highlights and dark root-to-tip variation. Suit cloth is matte, slightly fuzzy, with broad wrinkles and no sharp plastic specular. Shirt is smooth but not metallic.
- **Edges/silhouette:** Clean silhouette with anti-aliased hair flyaways. The hair rim is softer than the ears and jaw, creating depth. No haloing or double edges.
- **DOF/bokeh:** Face and near costume are sharp; background has no distracting detail and appears uniformly soft. Very shallow subject isolation without obvious bokeh discs.
- **Grain/noise:** Fine, low-amplitude texture; face detail remains clean. Grain is subordinate to material microdetail.
- **Lens/FOV:** Portrait-like 70–100 mm equivalent: minimal perspective distortion, nose/ears remain close in scale, shallow depth.
- **Contrast curve:** Filmic shoulder on skin highlights; toe lifted so shadows retain blue-grey detail. No clipped facial highlights.
- **Ambient occlusion:** Localized in ear/jaw/hairline and folds; absent as a global dirty tint.
- **Specular:** Skin has broad, weak highlights on forehead, nose, and cheekbones; no wet spots. Hair has restrained directional sheen. Cloth has almost no sharp specular.

### R2 — `mwds3yp5w3fswk.jpeg`

**Depiction and composition.** Slightly three-quarter Lincoln portrait with the face turned just off-axis. The body remains frontal enough to read the layered waistcoat, coat, bow tie, and shirt. Background is neutral charcoal.

- **Lighting direction:** Warm key from upper screen-left/front, visible in golden forehead planes and the lit edge of the screen-left cheek. Cooler rim/fill from screen right traces hair, ear, and shoulder.
- **Softness/shadows:** Medium-soft key; deeper occlusion under brows, nose, chin, collar, and lapels. Warm-to-cool shadow transition helps facial form read without becoming harsh.
- **Palette:** Background **#201F1F**; skin **#45372E**, **#8E7056**, **#A88E71**, **#D4C8B2**; hair **#343330**; coat **#141516**; shirt **#728486**.
- **Materials:** Strong age/material separation: leathery matte skin, deep wrinkles with warm inner tones, coarse beard clumps, dense dark wool. Coat lapel edges remain readable against the vest even at very low luminance.
- **Edges/silhouette:** Hair outline includes fine separated strands; ear contour is clean. Beard edge breaks into irregular clumps rather than a uniform polygon edge.
- **DOF/bokeh:** Face, bow tie, and near lapel are sharp; far shoulder and background soften slightly. Smooth cinematic bokeh/background blur, no distracting circles.
- **Grain/noise:** Fine film-like grain, especially in the dark background; no digital color noise.
- **Lens/FOV:** Roughly 85–100 mm equivalent portrait compression; restrained perspective.
- **Contrast curve:** Deep cinematic blacks lifted to charcoal, warm highlight roll-off, preserved eye catchlights.
- **Ambient occlusion:** Strong, believable in ear canal, nostrils, beard roots, collar gaps, and lapel overlaps.
- **Specular:** Forehead/nose have broad soft sheen; cloth is low-specular. Hair has narrow, soft anisotropic streaks.

### R3 — `mwds404gnuu7je (1).jpeg`

**Depiction and composition.** Three-quarter Lincoln portrait looking toward screen left. The turned head exposes cheekbone, nose profile, ear, sideburn, and layered jacket/waistcoat construction against a dark studio background.

- **Lighting direction:** Cool key from upper screen-right/front with a dimmer neutral fill from opposite side. The lit forehead, nose ridge, cheek, and shirt collar contrast against a blue-grey jacket.
- **Softness/shadows:** Broad soft-edged modeling on face; the shadow side falls to **#3C413C**, not black. Hairline, under-chin, collar, and lapel contacts are locally denser.
- **Palette:** Background **#1D2122**; forehead **#ABA090**; face **#8D8472**; hair **#182328**; coat **#525852/#3C413C**; shirt **#7B8580**; cool accent **#34494E**.
- **Materials:** Skin shows fine wrinkles, pores, subtle redness, and soft roughness variation. Hair is sculpted in directional clumps with distinct strand highlights. Jacket is thick matte cloth with soft nap and rounded folds; shirt is cooler and smoother.
- **Edges/silhouette:** Excellent three-quarter readability; bright forehead and nose edge remain distinct from background. Hair contour has small natural flyaways and irregular locks.
- **DOF/bokeh:** Face and near lapel sharp; far side of coat and background soften. Subject-background separation is created by both light and focus.
- **Grain/noise:** Subtle fine grain; no obvious banding in the background gradient.
- **Lens/FOV:** Medium telephoto portrait, approximately 75–90 mm equivalent.
- **Contrast curve:** Moderate overall contrast with luminous skin highlights, dark-but-open shadows, and a cool shoulder/coat shoulder roll-off.
- **Ambient occlusion:** Explicit in ear, eye sockets, nostril, beard boundary, neck/collar, and overlapping coat edges.
- **Specular:** Skin mostly matte with localized soft forehead/nose sheen; beard and wool scatter light; no clearcoat highlights.

### R4 — `mwds41dz9axyap (1).jpeg`

**Depiction and composition.** Three-quarter Lincoln portrait turned slightly toward screen right in a smoky, softly lit outdoor or atmospheric environment. Face is offset from center and framed against a cool grey-green haze.

- **Lighting direction:** Large soft source from upper screen-right/front, inferred from bright forehead, screen-right eye, nose bridge, and cheek. Cooler ambient fill from left/background. A dim backlight separates hair from atmosphere.
- **Softness/shadows:** Very soft wrap on facial planes; eye sockets, nostrils, and beard roots retain readable density. The shadow under the jaw is gentle rather than hard.
- **Palette:** Background **#5D625C**, **#77827A**, **#9BA397**; hair **#1B1F21/#181B1E**; skin **#3F423F**, **#5D554B**, **#8D8472**; warm accent **#8D8472**; shirt **#788984**; highlight **#D8CEBA**.
- **Materials:** Best material separation in the set. Skin has mottled warm/cool coloration, fine surface detail, and soft SSS-like edge translucency. Hair uses dense clumps with cool rim light. Wool coat absorbs light, while shirt catches a dull cool highlight.
- **Edges/silhouette:** Hair-to-background transition is natural but crisp; individual strands break the outline. Face contour remains clean without haloing.
- **DOF/bokeh:** Background strongly blurred into broad tonal shapes; shallow depth isolates the head. No obvious geometric background detail.
- **Grain/noise:** Moderate fine film grain integrated with atmospheric haze; no hard digital noise.
- **Lens/FOV:** Approximately 70–90 mm equivalent; compressed, natural head proportions.
- **Contrast curve:** Highest-key reference. Highlights roll off into cream rather than white; blacks remain charcoal and atmospheric.
- **Ambient occlusion:** Localized, subtle; the environment does not look globally dirtied.
- **Specular:** Diffuse-dominant skin with one or two broad highlights. Hair rim is slightly stronger. Clothing remains matte.

### Cross-reference rendering model

1. **Skin:** layered albedo (warm base + red/pink variation + cool desaturated shadows), roughness variation, restrained broad specular, and a subtle warm transmission/SSS approximation at ear/nose/cheek edges.
2. **Hair:** strand/clump geometry, root-to-tip albedo variation, anisotropic broad highlight, soft rim, non-solid outline.
3. **Cloth:** high roughness, low specular, micro-normal/fuzz, broad deformation wrinkles, no vinyl highlights.
4. **Lighting:** large soft key, weaker fill, cool ambient/backlight, physically plausible local bounce, no uniform ambient wash.
5. **Imaging:** tonal shoulder, lifted cool toe, restrained saturation, fine grain, subtle chromatic aberration only at frame edges, and shallow-focus portrait isolation.

---

## 4. Reference bar: measurable 3D game targets

These are acceptance criteria, not subjective notes. Where “floor” means the darkest deliberately visible surface in a lit scene, exclude UI, letterboxing, or intentional black transitions.

| ID | Verifiable realism target |
|---|---|
| **RB-01** | **Shadow floor:** in normally lit interiors, no visible material shadow falls below **sRGB (12,16,22)** unless it is an intentional blackout; preserve hue rather than lifting to neutral grey. |
| **RB-02** | **Neutral palette:** no single hue family may occupy more than **65%** of an interior frame. The current theatre frame should include at least **5 distinguishable local albedos** (warm timber, desaturated red upholstery, cream plaster, black-brown wood, and cool metal) under the same light. |
| **RB-03** | **Material albedo separation:** adjacent wood, plaster, cloth, and metal must differ by at least **8/255 average RGB distance** before lighting; avoid “one tint applied to everything.” |
| **RB-04** | **Shadow density:** eyes, under-chin, seat/floor contacts, and prop contacts show local darkening of at least **1.15×** relative to adjacent lit surfaces, but remain above the RB-01 floor. |
| **RB-05** | **Penumbra variation:** character/floor shadow penumbra visibly widens with distance from the contact point; no hard-edged blob shadows except from explicitly small light sources. |
| **RB-06** | **Skin response:** character skin uses at least two warm/cool layers, roughness variation, and a broad low-intensity highlight; it must not appear uniformly Lambertian or glossy plastic. |
| **RB-07** | **Skin edge treatment:** ears, nose, and cheek silhouette show a subtle warm/red transmission tint of at least **3–6 RGB levels** against adjacent shadow, approximating SSS without orange halos. |
| **RB-08** | **Cloth specular:** upholstery and suit cloth have no white pinpoints; maximum visible highlight remains below **90% luminance** and spreads over a broad, rough lobe. |
| **RB-09** | **Wood detail:** timber must show grain direction, edge wear, and roughness variation at inspection distance; no repeated plank pattern repeats within a **3 m** viewing span. |
| **RB-10** | **Texture tiling:** no repeated texture tile is recognizable at **>1.5 m** viewing distance or within a **20° field of view**; use albedo, normal, and roughness decorrelation. |
| **RB-11** | **Geometry edges:** chair, column, curtain, and character silhouettes show no stair-step aliasing at 1280×720; use MSAA/TAA and normal-based AA. No halo/double edge on backlit geometry. |
| **RB-12** | **Depth of field:** gameplay keeps the active interaction and nearby characters sharp; distant scenery receives measurable blur, but HUD remains perfectly sharp. Avoid indiscriminate cinematic blur in navigation. |
| **RB-13** | **Grain:** final image has fine monochrome grain at roughly **0.5–1.5/255 RMS** in midtones, with less than **1 RGB level** visible color noise; grain must not erase small facial/fabric detail. |
| **RB-14** | **Tonal curve:** facial/cloth highlights retain texture up to about **95% luminance**, with no clipped white fields larger than a small specular highlight. Interior midtones must remain within a display-referred **18–75%** range. |
| **RB-15** | **Dynamic range:** a single exposed frame retains detail in both a lamp-lit area and a dark wall; `fix_d2` must reach at least **8-bit grayscale mean 18** and **SD 25** in a readable wall view, not mean 3 / SD 5. |
| **RB-16** | **Warm/cool balance:** direct stage light may be warm, but the scene must include cool ambient fill sufficient to create at least **6 RGB levels** of blue lift in neutral shadows. |
| **RB-17** | **Bounce light:** nearby floor/wall bounce is visible as a secondary warm lift, modeled or faked; no fully self-shadowed character side may fall more than **20 RGB levels** below the adjacent key-lit surface. |
| **RB-18** | **Contact accuracy:** objects sit on the floor with tight contact shadows and no visible floating gap; seat feet, character feet, and props have local AO/contact shadow at their exact contact regions. |
| **RB-19** | **Curtain behavior:** fabric has broad vertical folds, self-occlusion at fold overlaps, varied roughness, and irregular lower edge; it must not read as a flat red polygon or uniformly striped plane. |
| **RB-20** | **Camera language:** portrait/conversation views use approximately **70–100 mm equivalent** FOV and restrained perspective; normal gameplay may use **55–75 mm equivalent**, avoiding wide-angle nose/ear enlargement. |
| **RB-21** | **Facial readability:** at 1 m, eyes must have catchlights, eyelid/eye-socket occlusion, and visible brow geometry; at 10 m the silhouette should still separate from the background. |
| **RB-22** | **Color saturation:** no large architectural area exceeds **65% HSV saturation**; current dominant oranges should be reduced and broken by neutral plaster, cool ambient, and material-specific hues. |
| **RB-23** | **Anti-aliasing:** high-frequency hair, beard, fabric edges, and railings remain stable during camera motion; no visible temporal shimmer or crawling over at least **30 seconds**. |
| **RB-24** | **No procedural noise masquerading as material:** wood, plaster, and walls may use subtle procedural breakup, but mid-distance surfaces must retain coherent large-scale lighting and normal behavior; no noisy black wall like `fix_d2`. |

---

## 5. Gap analysis: current build `fix_d0.png` versus reference bar

### Top 12 visual deficiencies, highest leverage first

| Rank | Deficiency | Evidence in `fix_d0.png` | Specific fix direction |
|---:|---|---|---|
| **1** | **Extreme monochrome orange lighting** | Dominant palette is **#5F270D, #A4531F, #D75426, #EB9C51, #F7CD91**; floor, walls, columns, seats, characters, and stage all collapse into one warm family. | Replace a single global amber light with a warm stage key plus cool/neutral ambient fill, reduce lamp saturation, and restore material-specific albedo. Target ≤65% of pixels in one hue family and visible blue lift in shadows. |
| **2** | **Facial and character geometry is toy-like** | Player and NPCs use rounded primitives, blank dark eye slits, smooth featureless skin, and oversized/simple silhouettes; no reference-equivalent wrinkles, eyelids, beard, or hair strands. | Replace/augment face assets with high-resolution sculpted head meshes, separate eyelids/eyes/lips, facial normal detail, beard/hair cards or clumps, and restrained skin roughness variation. Establish a separate close-up character-quality gate. |
| **3** | **Skin is flat, muddy, and uniformly matte** | Sampled player area is roughly **#5D4C2D**; faces show no warm/cool layering, catchlights, lip/eye moisture, or localized roughness. | Use layered skin albedo (base, redness, age spots), procedural micro-normal, roughness map, subtle subsurface/transmission approximation, and a weak broad specular lobe. Target 3–6 RGB levels of warm edge transmission. |
| **4** | **Materials are saturated vertex-style color blocks** | Seats, floor, walls, and curtain have almost no roughness breakup; upholstery is uniformly **#7A110A** and floor uniformly **#C4320F**. | Author PBR sets for timber, wool/velvet upholstery, plaster, painted metal, and curtain fabric. Break saturation with neutral/cool albedo and rough, broad highlights. |
| **5** | **Missing/incorrect ambient occlusion** | Feet and chair bases appear weakly connected; columns and stage transitions lack darkening; many objects float visually despite warm light. | Add accurate contact shadows, SSAO/GTAO, cavity/curvature masks, and localized shadow terminators around intersections. Verify contact darkness ≥1.15× adjacent lit floor without crushing below RB-01. |
| **6** | **Shadow structure is either absent or excessively dense** | Warm scene has broad smooth light with little convincing occlusion; `fix_d2` reaches mean **3**, SD **5**, showing the opposite failure—black crush with no readable material. | Establish a minimum ambient/fill level, raise shadow toe, add a low-intensity shadow luminance floor, and use soft shadow filtering rather than binary darkness. Target wall-view mean ≥18 / SD ≥25. |
| **7** | **Low geometric detail and simplified architecture** | Chairs are blocky boxes; columns are rectangular prisms; auditorium geometry is clean and empty, unlike a dense theatrical interior. | Add profile curvature to columns, bevels, seat frames, armrests, aisle hardware, balcony edges, moldings, and varied seat construction. Use normal/roughness detail even if silhouette geometry remains economical. |
| **8** | **Curtain is a flat, uniform red plane** | The stage curtain shows broad flat color with minimal visible nap, fold self-shadowing, or irregular hem; it reads as a red wall. | Use a high-frequency vertical fold displacement/normal map, darker fold valleys, varied roughness, broad cloth sheen, and irregular lower edge. Avoid stripe-like uniform displacement. |
| **9** | **Wood texture is over-noisy but under-detailed** | Floor has stretched orange streaking; the dark column/wall in `fix_d2` contains high-frequency noise with no legible grain direction or form. | Replace noise-heavy albedo with coherent plank/grain direction, lower-frequency variation, localized wear, and matching normal/roughness. Scale detail so planks remain unique beyond a 3 m span. |
| **10** | **No photographic post-process** | Highlights reach **#F7CD91/#EB9C51** across broad areas, blacks are crushed elsewhere, colors are oversaturated, and there is no tonal shoulder or fine grain. | Use exposure + filmic tonemap, highlight roll-off, saturation reduction, subtle local contrast, fine monochrome grain, and mild vignette. Target no clipped fields and 18–75% interior midtones. |
| **11** | **Depth cues and lens behavior are weak** | Wide-angle game camera compresses the auditorium into a stage set; no intentional focus falloff, atmospheric depth, or portrait-like framing. | Use a 55–75 mm gameplay FOV, keep the active subject sharp, blur only distant scenery, and add subtle atmospheric depth/fog with a cool value shift. Do not blur the HUD. |
| **12** | **Composition and scale read as a toy diorama** | Repeated seat rows and primitive audience forms have no scale variation or visual hierarchy; the UI occupies a large flat overlay and the world uses centered, unobstructed exposure. | Add focal hierarchy: hero-lit characters, dimmer background crowd, seat/aisle variation, cropped foreground framing, and local contrast around the active objective. Preserve navigable exposure while making the scene feel observed rather than rendered. |

### Additional observations from `fix_d2.png`

- It is not merely “dark”: it is functionally unreadable. Mean grayscale is **3**, standard deviation **5**, versus a viable readability target of mean **18**, SD **25**.
- The visible wall shows noisy vertical streaks but no coherent lighting gradient or material response. This suggests albedo/noise and lighting balance are more fundamental than exposure alone.
- A black-wall close-up can remain moody, but it must retain grain structure, material roughness, edge lighting, and tonal separation rather than becoming a near-solid field.

### Additional observations from `03-washington-1865-theatre.png`

- The alternate theatre frame confirms a coherent layout and readable stage, but remains dominated by amber/orange wood and lacks the references’ cool-neutral counter-light.
- Audience rows are simplified rounded silhouettes; they need darker, less saturated clothing, varied scale, and less uniform repetition.
- The large central column blocks a major portion of the frame and has a nearly black vertical face with no visible material shading.
- The player character occupies the visual center at close range and exposes the largest gap from the portrait references: primitive anatomy, blank facial features, hard costume blocks, and no cloth drape.

---

## 6. Recommended verification protocol

1. Capture identical 1280×720 frames at the player’s default view, a 1 m character close-up, a stage-facing view, and a deliberately dark wall view.
2. Disable UI for image-analysis captures.
3. Measure per-frame mean/SD, 8-color palette, darkest non-black material, clipped-highlight percentage, and warm/cool axis balance with ImageMagick.
4. Review at 25%, 50%, and 100% scale for aliasing, repeated textures, facial features, shadow contacts, and material breakup.
5. Add a 10–15 second camera-motion capture to verify temporal shimmer, texture swim, and contact-shadow stability.
6. Accept a scene only when it meets RB-01 through RB-24; character close-ups additionally require RB-06, RB-07, RB-11, RB-14, RB-20, RB-21, and RB-23.

## 7. Priority order for production

**P0 — exposure and light balance:** fix the global amber cast, black crush, highlight clipping, and unreadable dark surfaces.  
**P1 — character fidelity:** sculpt/readable faces, hair/beard, skin shading, cloth drape, and contact anatomy.  
**P2 — material system:** introduce coherent PBR textures and lighting-specific albedo/roughness/normal variation for wood, plaster, cloth, upholstery, and metal.  
**P3 — spatial realism:** soften/complete shadows, improve AO/contact, add curtain/fold and architectural detail.  
**P4 — camera and finish:** medium-telephoto framing, selective focus, filmic tonemap, grain, saturation control, and atmosphere.
