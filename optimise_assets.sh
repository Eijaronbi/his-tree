#!/bin/bash
set -u
export PATH=/data/home/node24/bin:/data/home/his-tree/tools/node_modules/.bin:$PATH
ROOT=/data/home/his-tree
SRCC=$ROOT/assets/models_original
DST=$ROOT/assets/models
WORK=$ROOT/optwork/run
mkdir -p "$WORK"
LOG=$ROOT/optimise.log
QUALITY=${QUALITY:-95}
: > "$LOG"

if [ ! -d "$SRCC" ]; then
  cp -a "$DST" "$SRCC"
  echo "backup created" >> "$LOG"
fi

START_BYTES=$(du -sb "$SRCC" | cut -f1)
echo "START $START_BYTES" >> "$LOG"
N=0
cd "$SRCC"
find . -name '*.glb' | sort | while read -r rel; do
  src="$SRCC/$rel"; dst="$DST/$rel"
  mkdir -p "$(dirname "$dst")"
  t1="$WORK/t1.glb"; t2="$WORK/t2.glb"; t3="$WORK/t3.glb"; t4="$WORK/t4.glb"; tout="$WORK/tout.glb"
  before=$(stat -c%s "$src")
  ok=0
  if gltf-transform dedup "$src" "$t1" >> "$LOG" 2>&1 \
     && gltf-transform prune "$t1" "$t2" >> "$LOG" 2>&1 \
     && gltf-transform resample "$t2" "$t3" >> "$LOG" 2>&1 \
     && gltf-transform webp "$t3" "$t4" --formats png --quality $QUALITY --effort 80 >> "$LOG" 2>&1 \
     && gltf-transform meshopt "$t4" "$tout" --level high --quantize-position 14 --quantize-normal 10 --quantize-texcoord 12 >> "$LOG" 2>&1; then
    after=$(stat -c%s "$tout")
    if [ "$after" -lt "$before" ] && gltf-transform validate "$tout" >> "$LOG" 2>&1; then
      cp "$tout" "$dst"; ok=1
      echo "OK $rel $before -> $after" >> "$LOG"
    else
      echo "KEEP $rel $before -> $after" >> "$LOG"
    fi
  else
    echo "FAILPIPE $rel" >> "$LOG"
  fi
  if [ "$ok" -eq 0 ]; then cp "$src" "$dst"; fi
done
END_BYTES=$(du -sb "$DST" | cut -f1)
echo "END $END_BYTES" >> "$LOG"
echo DONE >> "$LOG"
