// Service worker: precaches every asset so the game runs fully offline
// once it has been opened online at least once.
// Bump CACHE_VERSION on every release so clients pick up new files.

const CACHE_VERSION = 'web-minecraft-v124';

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
  './src/carte.js',
  './src/manhattan.js',
  './src/pole.js',
  './src/paris.js',
  './src/voies.js',
  './src/parc.js',
  './src/effects.js',
  './src/sky.js',
  './src/siege.js',
  './src/villandry.js',
  './src/aeroport.js',
  './src/gaulois.js',
  './src/espace.js',
  './src/ville.js',
  './src/circuit.js',
  './src/vehicules.js',
  './src/modeles.js',
  './src/personnages.js',
  './src/betes.js',
  './src/vie.js',
  './src/face-worker.js',
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
  './src/admin.js',
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

// Une notification touchée doit ramener dans le jeu, pas ouvrir un second
// onglet par-dessus la partie en cours. On cherche d'abord une fenêtre déjà
// ouverte ; on n'en ouvre une que s'il n'y en a aucune.
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of clients) {
      if ('focus' in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow('./');
    return null;
  })());
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

  // La page elle-même passe par le réseau d'abord, avec repli sur le cache.
  //
  // En servant la copie en cache, on lançait l'ancien index.html — donc
  // l'ancienne logique de mise à jour — et la nouvelle version n'arrivait
  // qu'au démarrage suivant. Une application installée pouvait ainsi rester
  // en retard indéfiniment : c'est ce qui faisait qu'un correctif publié
  // n'atteignait pas l'iPad.
  //
  // Le repli garde le mode hors-ligne intact, et le délai court évite qu'un
  // réseau capricieux ne retarde le lancement.
  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        const response = await Promise.race([
          fetch(request),
          new Promise((_, rej) => setTimeout(() => rej(new Error('lent')), 3000)),
        ]);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return (await cache.match(request, { ignoreSearch: true }))
          || (await cache.match('./index.html'))
          || Response.error();
      }
    })());
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
