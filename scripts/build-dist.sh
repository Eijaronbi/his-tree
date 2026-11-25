#!/usr/bin/env bash
# Builds the deployable static site into dist/.
# The repo keeps every original asset; dist/ carries only what the game loads at runtime,
# so the payload stays inside hosting limits (Vercel Hobby: 100 MB static upload).
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUT="$ROOT/dist"

rm -rf "$OUT"
mkdir -p "$OUT/assets/models/characters" "$OUT/assets/models/props" "$OUT/assets/textures"

cp "$ROOT/index.html" "$OUT/"
[ -f "$ROOT/robots.txt" ] && cp "$ROOT/robots.txt" "$OUT/"
cp -R "$ROOT/src" "$OUT/src"
cp -R "$ROOT/thumbs" "$OUT/thumbs"

# Vendored three.js (no CDN). Skip addons/libs (10 MB of DRACO/KTX2 blobs we never load).
mkdir -p "$OUT/vendor/three/addons"
cp "$ROOT/vendor/three/three.module.js" "$OUT/vendor/three/"
cp -R "$ROOT/vendor/three/addons/." "$OUT/vendor/three/addons/"
rm -rf "$OUT/vendor/three/addons/libs"
mkdir -p "$OUT/vendor/three/addons/libs"
cp "$ROOT/vendor/three/addons/libs/meshopt_decoder.module.js" "$OUT/vendor/three/addons/libs/"

# Instanced crowd: LOD and far sets are what Audience.js instantiates.
cp -R "$ROOT/assets/models/characters/audience_lod" "$OUT/assets/models/characters/"
cp -R "$ROOT/assets/models/characters/audience_far" "$OUT/assets/models/characters/"

# Named cast and player avatars actually referenced by the game.
for f in amina bakary booth grant lincoln_bust lofi miep musa parker player_1865 salim sergeant; do
  if [ -f "$ROOT/assets/models/characters/$f.glb" ]; then
    cp "$ROOT/assets/models/characters/$f.glb" "$OUT/assets/models/characters/"
  fi
done

cp "$ROOT"/assets/models/*.glb "$OUT/assets/models/"
cp -R "$ROOT/assets/models/props/." "$OUT/assets/models/props/"
cp -R "$ROOT/assets/textures/." "$OUT/assets/textures/"
[ -d "$ROOT/assets/audio" ] && cp -R "$ROOT/assets/audio/." "$OUT/assets/audio/" 2>/dev/null || true

printf 'dist: %s across %s files\n' "$(du -sh "$OUT" | cut -f1)" "$(find "$OUT" -type f | wc -l)"
