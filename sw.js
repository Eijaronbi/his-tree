const VERSION = 'his-tree-v9';
const DB_NAME = 'his-tree-assets';
const DB_VERSION = 1;
const STORE = 'files';
const MAX_IDB_BYTES = 220 * 1024 * 1024;
const SHELL = [
  './',
  './index.html',
  './src/main.js',
  './src/core/Assets.js',
  './src/core/GLTF.js',
  './src/core/Narrator.js',
  './src/core/Quality.js',
  './src/core/ThirdPersonController.js',
  './src/core/Quest.js',
  './src/core/Input.js',
  './src/core/Flight.js',
  './src/core/PostFX.js',
  './src/core/AudioManager.js',
  './src/ui/UI.js',
  './src/ui/AvatarPicker.js',
  './src/ui/AvatarPreview.js',
  './src/data/story.js',
  './src/world/MaliTown.js',
  './src/world/Hall1865.js',
  './src/world/OtherEras.js',
  './src/world/Characters.js',
  './src/world/Cast.js',
  './src/world/Audience.js',
  './src/world/Crowd.js',
  './src/world/Mounts.js',
  './src/world/Merge.js',
  './src/world/Materials.js',
  './src/world/Attire.js',
  './src/world/Environment.js',
  './src/world/CharacterAnim.js',
  './assets/audio/narration/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'url' });
        store.createIndex('storedAt', 'storedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbGet(url) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).get(url);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    void err;
    return null;
  }
}

async function idbPut(url, blob, meta) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).put(Object.assign({ url, blob, storedAt: Date.now() }, meta || {}));
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    void err;
    return false;
  }
}

async function idbBytes() {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = () => {
        let total = 0;
        for (const row of req.result || []) total += row.blob ? row.blob.size : 0;
        resolve(total);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    void err;
    return 0;
  }
}

async function idbTrim(limit) {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.getAll();
      req.onsuccess = async () => {
        const rows = (req.result || []).sort((a, b) => (a.storedAt || 0) - (b.storedAt || 0));
        let total = rows.reduce((sum, r) => sum + (r.blob ? r.blob.size : 0), 0);
        for (const row of rows) {
          if (total <= limit) break;
          store.delete(row.url);
          total -= row.blob ? row.blob.size : 0;
        }
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    void err;
    return false;
  }
}

function isCode(url) {
  return /\.(js|mjs|css|html?)(\?|$)/i.test(url.pathname);
}

function isAsset(url) {
  return url.pathname.startsWith('/assets/');
}

function hasVersion(url) {
  return url.searchParams.has('v');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (isCode(url)) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => undefined);
          return res;
        })
        .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
    );
    return;
  }

  if (req.headers.has('range')) {
    event.respondWith(fetch(req).catch(() => new Response('range unavailable', { status: 504 })));
    return;
  }

  if (isAsset(url)) {
    event.respondWith(assetResponse(req, url));
    return;
  }

  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy)).catch(() => undefined);
        }
        return res;
      }).catch(() => hit);
    })
  );
});

async function assetResponse(req, url) {
  const cache = await caches.open(VERSION);
  const hit = await cache.match(req);
  if (hit) return hit;

  if (hasVersion(url)) {
    const row = await idbGet(url.pathname + url.search);
    if (row && row.blob && row.blob.size > 0) {
      const headers = new Headers();
      headers.set('Content-Type', row.type || 'application/octet-stream');
      headers.set('Content-Length', String(row.blob.size));
      headers.set('X-HIS-TREE-Cache', 'idb');
      return new Response(row.blob, { status: 200, headers });
    }
  }

  try {
    const res = await fetch(req);
    if (res && res.status === 200 && res.type === 'basic') {
      const copy = res.clone();
      cache.put(req, copy.clone()).catch(() => undefined);
      const declared = Number(res.headers.get('content-length') || 0);
      if (declared > 0) {
        copy.clone().arrayBuffer().then((buf) => {
          if (buf.byteLength !== declared) cache.delete(req).catch(() => undefined);
        }).catch(() => undefined);
      }
      if (hasVersion(url)) {
        res.clone().blob().then((blob) => {
          idbBytes().then((bytes) => {
            if (bytes + blob.size > MAX_IDB_BYTES) {
              idbTrim(MAX_IDB_BYTES * 0.8).then(() => {
                idbPut(url.pathname + url.search, blob, { type: res.headers.get('content-type') });
              });
            } else {
              idbPut(url.pathname + url.search, blob, { type: res.headers.get('content-type') });
            }
          });
        }).catch(() => undefined);
      }
    }
    return res;
  } catch (err) {
    void err;
    return new Response('asset unavailable', { status: 504, statusText: 'Offline' });
  }
}

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'his-tree:cache-status') {
    event.waitUntil((async () => {
      const bytes = await idbBytes();
      const quota = await navigator.storage ? navigator.storage.estimate() : null;
      const payload = {
        type: 'his-tree:cache-status',
        idbBytes: bytes,
        quota: quota ? quota.quota : null,
        usage: quota ? quota.usage : null
      };
      if (event.ports && event.ports[0]) event.ports[0].postMessage(payload);
      else if (event.source) event.source.postMessage(payload);
    })());
  }
  if (data.type === 'his-tree:cache-clear') {
    event.waitUntil((async () => {
      const db = await openDb();
      await new Promise((resolve) => {
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).clear();
        tx.oncomplete = resolve;
      });
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
      const payload = { type: 'his-tree:cache-cleared' };
      if (event.ports && event.ports[0]) event.ports[0].postMessage(payload);
      else if (event.source) event.source.postMessage(payload);
    })());
  }
});
