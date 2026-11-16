#!/bin/bash
PY=/data/home/.cache/aholo-lux3d-common/environments/bea78a23a432c48de633b79f96628086db39092e1d1fb832308787b277ece438-0843981a5e73439ba5e3544ab31980be/bin/python
cd /data/home/luxin/pipeline
for id in "$@"; do
  if [ -f "/data/home/luxin/glb/$id/mesh/tex_mesh.glb" ]; then echo "skip $id"; continue; fi
  if [ ! -f "/data/home/luxin/src/clean/$id.jpg" ]; then echo "no-src $id"; continue; fi
  echo "=== $id"
  timeout 500 $PY to3d.py /data/home/luxin/src/clean/$id.jpg $id 2>&1 | tail -4
done
