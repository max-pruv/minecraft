// Service worker: precaches every asset so the game runs fully offline
// once it has been opened online at least once.
// Bump CACHE_VERSION on every release so clients pick up new files.

const CACHE_VERSION = 'web-minecraft-v62';

// The face scanner (library + models, ~8 MB) lives in its own cache that
// survives version bumps: those files are pinned and never change, so a
// game update must not make a family re-download them. They are also NOT
// precached — they download only the first time a child actually uses the
// scanner, and work offline from then on.
const STATIC_CACHE = 'web-minecraft-static-v1';
const isStaticAsset = (url) =>
  url.includes('/vendor/face-api.js') || url.includes('/vendor/face-models/');

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './src/main.js',
  './src/world.js',
  './src/mesher.js',
  './src/player.js',
  './src/blocks.js',
  './src/textures.js',
  './src/creatures.js',
  './src/marlon.js',
  './src/props.js',
  './src/animals.js',
  './src/education.js',
  './src/net.js',
  './src/cloud.js',
  './src/fun.js',
  './src/identity.js',
  './src/sync.js',
  './vendor/three.module.min.js',
  './vendor/peerjs.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys
        .filter((k) => k !== CACHE_VERSION && k !== STATIC_CACHE)
        .map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// La page affiche le numéro de version : elle le demande ici plutôt que de le
// dupliquer dans son propre code, où les deux finiraient par diverger.
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'version') {
    const reply = { type: 'version', version: CACHE_VERSION };
    // la page répond sur un canal dédié quand elle en fournit un
    if (event.ports && event.ports[0]) event.ports[0].postMessage(reply);
    else event.source?.postMessage(reply);
  }
});

// Stale-while-revalidate: serve from cache instantly (works offline),
// refresh the cache in the background whenever the network is available.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

  // pinned, immutable and big: cache-first, kept across game updates
  if (isStaticAsset(request.url)) {
    event.respondWith(
      caches.open(STATIC_CACHE).then(async (cache) => {
        const hit = await cache.match(request);
        if (hit) return hit;
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      })
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      const network = fetch(request)
        .then((response) => {
          if (response && response.ok) cache.put(request, response.clone());
          return response;
        })
        .catch(() => cached);
      if (cached) return cached;
      const response = await network;
      // offline navigation to an uncached URL falls back to the app shell
      if (!response && request.mode === 'navigate') {
        return cache.match('./index.html');
      }
      return response;
    })
  );
});
