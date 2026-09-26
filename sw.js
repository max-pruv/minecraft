// Service worker: precaches every asset so the game runs fully offline
// once it has been opened online at least once.
// Bump CACHE_VERSION on every release so clients pick up new files.

const CACHE_VERSION = 'web-minecraft-v294';

// The face scanner (library + models, ~8 MB) lives in its own cache that
// survives version bumps: those files are pinned and never change, so a
// game update must not make a family re-download them. They are also NOT
// precached — they download only the first time a child actually uses the
// scanner, and work offline from then on.
const STATIC_CACHE = 'web-minecraft-static-v1';
// La flotte de voitures suit le même canal que les modèles du scanner :
// 83 Mo re-téléchargés à chaque livraison auraient tué la cadence — chaque
// voiture se télécharge à sa PREMIÈRE rencontre, une fois par appareil.
// Et les corps réalistes des personnages (v245) : 8,2 Mo immuables, qui se
// re-téléchargeaient à CHAQUE livraison — c'est-à-dire tous les jours — parce
// qu'ils étaient dans la liste des ASSETS. Ils vivent ici, une fois par
// appareil ; l'installation les y met s'ils manquent, sans bloquer le reste.
// Et les deux polices (v276) : 104 Ko qui ne changeront jamais. Elles sont
// dans le dépôt et non chez Google parce que le jeu marche HORS LIGNE — un
// `<link>` vers fonts.googleapis.com casserait l'accueil dans l'avion, à
// l'école ou sur le Wi-Fi d'un hôtel.
const isStaticAsset = (url) =>
  url.includes('/vendor/face-api.js') || url.includes('/vendor/face-models/')
  || url.includes('/vendor/voitures/') || url.includes('/vendor/humains/')
  || url.includes('/vendor/polices/');
const HUMAINS = ['homme-denim', 'homme-costume', 'femme-tailleur', 'homme-chemise', 'homme-veste',
  'femme-chemise', 'femme-manteau', 'garcon', 'fille'].map((n) => `./vendor/humains/${n}.glb`);
const POLICES = ['bricolage-latin', 'jakarta-latin'].map((n) => `./vendor/polices/${n}.woff2`);

const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icone.svg',
  './icon-192.png',
  './icon-512.png',
  './apple-touch-icon.png',
  './src/main.js',
  './src/world.js',
  './src/mesher.js',
  './src/facadeshd.js',
  './src/matierehd.js',
  './src/tuiles.js',
  './src/maillage-worker.js',
  './src/carte.js',
  './src/horizon.js',
  './src/bandeau.js',
  './src/palier.js',
  './src/liberer.js',
  './src/couches.js',
  './src/signatures.js',
  './src/manhattan.js',
  './src/manhattan-plan.js',
  './src/manhattan-world.js',
  './src/manhattan-materiaux.js',
  './src/manhattan-render.js',
  './src/pole.js',
  './src/paris.js',
  './src/paris-monuments-hd.js',
  './src/voies.js',
  './src/parc.js',
  './src/sanfrancisco.js',
  './src/nice.js',
  './src/lille.js',
  './src/washington.js',
  './src/dcmonuments.js',
  './src/chine.js',
  './src/partage.js',
  './src/visio.js',
  './src/relaisnuage.js',
  './src/effects.js',
  './src/sky.js',
  './src/siege.js',
  './src/sons.js',
  './src/villandry.js',
  './src/aeroport.js',
  './src/cadence.js',
  './src/cap.js',
  './src/feux.js',
  './src/gaulois.js',
  './src/espace.js',
  './src/ville.js',
  './src/circuit.js',
  './src/vehicules.js',
  './src/presence.js', './src/humains.js', './vendor/SkeletonUtils.js',
  './src/taxis.js',
  './src/modeles.js',
  './src/personnages.js',
  './src/betes.js',
  './src/vie.js',
  './src/face-worker.js',
  './src/player.js',
  './src/blocks.js',
  './src/textures.js',
  './src/marlon.js',
  './src/props.js',
  './src/animals.js',
  './src/montures.js',
  './src/avions.js',
  './src/mondes.js',
  './src/capitales.js',
  './src/terre.js',
  './src/londres.js',
  './src/villesmonde.js',
  './src/villes200.js',
  './src/usine.js',
  './src/passants.js',
  './src/poissons.js',
  './src/trains.js',
  './src/batiments.js',
  './src/monuments.js',
  './src/garages.js',
  './src/education.js',
  './src/net.js',
  './src/nouveautes.js',
  './src/cloud.js',
  './src/fun.js',
  './src/identity.js',
  './src/sync.js',
  './src/admin.js',
  './vendor/three.module.min.js',
  './vendor/peerjs.min.js',
  './vendor/qrcode.module.js',
  // La vraie voiture (réalisme v2) : le chargeur glTF et le modèle d'artiste.
  './vendor/GLTFLoader.js',
  './vendor/BufferGeometryUtils.js',
  './vendor/voiture.glb',
];

// L'INSTALLATION DIT OÙ ELLE EN EST (v257). Max, sur l'iPad : « le jeu reste
// quasiment bloqué une ou deux minutes sur l'accueil après chaque mise à
// jour » — et « s'il y a une installation nécessaire qui prend une minute,
// mets un loader ». `cache.addAll` prenait les soixante-dix-huit fichiers en
// silence : la page ne pouvait dire à l'enfant qu'un texte fixe. Chaque
// fichier rangé est annoncé aux pages ouvertes (`installation`, fait / total),
// six à la fois pour ne pas être plus lent qu'`addAll`, et une réponse qui
// n'est pas `ok` fait échouer l'installation exactement comme avant.
async function installer() {
  const cache = await caches.open(CACHE_VERSION);
  const total = ASSETS.length;
  let fait = 0;
  const dire = async () => {
    const pages = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    for (const p of pages) p.postMessage({ type: 'installation', fait, total, version: CACHE_VERSION });
  };
  await dire();
  const file = [...ASSETS];
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (file.length) {
      const u = file.shift();
      const r = await fetch(u);
      if (!r || !r.ok) throw new Error(`${u} : HTTP ${r && r.status}`);
      await cache.put(u, r);
      fait++;
      if (fait % 3 === 0 || fait === total) await dire();
    }
  }));
  await self.skipWaiting();
}

self.addEventListener('install', (event) => {
  event.waitUntil(installer());
  // Les corps réalistes : dans le cache immuable, seulement ceux qui manquent,
  // et EN ARRIÈRE-PLAN — ni un échec ni leur lenteur ne retiennent la version.
  // Le chemin de lecture ci-dessous les met de toute façon en cache à la
  // première demande.
  caches.open(STATIC_CACHE).then(async (cache) => {
    // Les polices d'abord : l'accueil les attend, les corps non (v245).
    for (const u of [...POLICES, ...HUMAINS]) {
      if (await cache.match(u)) continue;
      await cache.add(u).catch(() => {});
    }
  }).catch(() => {});
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

  // La sonde de version doit toucher le RÉSEAU. sw.js est dans le cache des
  // ASSETS : la page qui demandait « quelle est la dernière version publiée ? »
  // recevait sa propre copie, et l'accueil affichait « à jour » pour toujours —
  // il comparait la version avec elle-même. (Le navigateur, lui, n'est pas
  // affecté : la mise à jour du service worker contourne ce gestionnaire ;
  // seul l'affichage mentait.)
  if (new URL(request.url).pathname.endsWith('/sw.js')) {
    event.respondWith(fetch(request).catch(() => caches.match(request)));
    return;
  }

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

  // UNE VERSION NE CHANGE JAMAIS : SON CACHE SE SERT SANS REVALIDATION (v257).
  //
  // C'était du « stale-while-revalidate » : chaque fichier servi depuis le
  // cache repartait AUSSI au réseau, à chaque démarrage — soixante-dix-huit
  // requêtes pour rien, et surtout pendant la mise à jour, en concurrence
  // avec le service worker neuf qui télécharge les mêmes soixante-dix-huit.
  // Or `CACHE_VERSION` monte à chaque livraison : ce qu'un cache versionné
  // contient est exact pour toujours. Cache d'abord, réseau seulement pour ce
  // qui manque. `index.html` (réseau d'abord, plus haut) et `sw.js` (réseau)
  // gardent leur chemin : ce sont eux qui découvrent une version neuve.
  event.respondWith(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const cached = await cache.match(request, { ignoreSearch: true });
      if (cached) return cached;
      try {
        const response = await fetch(request);
        if (response && response.ok) cache.put(request, response.clone());
        return response;
      } catch {
        return Response.error();
      }
    })
  );
});
