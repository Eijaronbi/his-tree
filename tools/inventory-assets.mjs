import fs from 'node:fs';
import path from 'node:path';

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (
    entry.isDirectory() ? walk(path.join(dir, entry.name)) : path.join(dir, entry.name)
  ));
}

function imageSize(buffer, mimeType) {
  if (mimeType === 'image/png' && buffer.length >= 24) {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (mimeType === 'image/webp' && buffer.length >= 30 && buffer.toString('ascii', 0, 4) === 'RIFF') {
    const format = buffer.toString('ascii', 8, 12);
    if (format === 'VP8X') return { width: 1 + buffer.readUIntLE(24, 3), height: 1 + buffer.readUIntLE(27, 3) };
    if (format === 'VP8 ') return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff };
    if (format === 'VP8L') {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
  }
  if (mimeType === 'image/jpeg') {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) break;
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + length;
    }
  }
  return { width: null, height: null };
}

export function inventoryModels(root = 'assets/models') {
  return walk(root).filter((file) => file.endsWith('.glb')).map((file) => {
    const bytes = fs.readFileSync(file);
    if (bytes.readUInt32LE(0) !== 0x46546c67) return { file, bytes: bytes.length, error: 'Not a GLB container' };
    const jsonLength = bytes.readUInt32LE(12);
    const jsonOffset = 20;
    const document = JSON.parse(bytes.subarray(jsonOffset, jsonOffset + jsonLength).toString());
    const binaryOffset = jsonOffset + jsonLength + 8;
    let triangles = 0;
    for (const mesh of document.meshes || []) {
      for (const primitive of mesh.primitives || []) {
        if (primitive.mode !== undefined && primitive.mode !== 4) continue;
        const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
        const accessor = document.accessors?.[accessorIndex];
        triangles += (accessor?.count || 0) / 3;
      }
    }
    const images = (document.images || []).map((image) => {
      let size = { width: null, height: null };
      if (image.bufferView !== undefined) {
        const view = document.bufferViews[image.bufferView];
        const start = binaryOffset + (view.byteOffset || 0);
        size = imageSize(bytes.subarray(start, start + view.byteLength), image.mimeType);
      }
      return { mimeType: image.mimeType || null, ...size };
    });
    return {
      file,
      bytes: bytes.length,
      nodes: document.nodes?.length || 0,
      meshes: document.meshes?.length || 0,
      materials: document.materials?.length || 0,
      textures: document.textures?.length || 0,
      images,
      animations: (document.animations || []).map((animation) => ({ name: animation.name || null, channels: animation.channels?.length || 0 })),
      triangles,
      extensions: document.extensionsUsed || []
    };
  }).sort((a, b) => b.bytes - a.bytes);
}

if (process.argv[1] && import.meta.url === new URL(`file://${path.resolve(process.argv[1])}`).href) {
  const output = process.argv[2] || 'artifacts/assets.json';
  const rows = inventoryModels();
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify(rows, null, 2));
  console.log(JSON.stringify({
    models: rows.length,
    totalBytes: rows.reduce((sum, row) => sum + row.bytes, 0),
    invalid: rows.filter((row) => row.error),
    largest: rows.slice(0, 15).map(({ file, bytes, meshes, triangles, animations }) => ({ file, bytes, meshes, triangles, animations: animations?.length }))
  }, null, 2));
}
