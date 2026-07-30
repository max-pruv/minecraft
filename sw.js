// Service worker: precaches every asset so the game runs fully offline
// once it has been opened online at least once.
// Bump CACHE_VERSION on every release so clients pick up new files.

const CACHE_VERSION = 'web-minecraft-v20';

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
  './vendor/three.module.min.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Stale-while-revalidate: serve from cache instantly (works offline),
// refresh the cache in the background whenever the network is available.
self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.location.origin)) return;

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
