// Le banc d'essai : deux serveurs et des navigateurs qui jouent pour de vrai.
//
// Rien n'est simulé du côté du jeu — c'est le vrai index.html, le vrai net.js,
// de vraies connexions WebRTC entre de vrais navigateurs. Seul le serveur de
// rendez-vous est local, pour ne dépendre d'aucun service extérieur : le jeu
// accepte `?peerhost=` justement pour cela.

const http = require('http');
const fs = require('fs');
const path = require('path');
const express = require('express');
const { ExpressPeerServer } = require('peer');
const { chromium } = require('playwright-core');

const RACINE = path.resolve(__dirname, '..');

// Où trouver Chromium. On accepte un chemin explicite, sinon on cherche les
// emplacements habituels : le poste d'un développeur et l'image de test ne les
// rangent pas au même endroit.
function trouverChromium() {
  if (process.env.CHROMIUM) return process.env.CHROMIUM;
  const pistes = [];
  const parc = process.env.PLAYWRIGHT_BROWSERS_PATH || '/opt/pw-browsers';
  try {
    for (const d of fs.readdirSync(parc)) {
      if (d.startsWith('chromium')) {
        pistes.push(path.join(parc, d, 'chrome-linux', 'chrome'), path.join(parc, d));
      }
    }
  } catch { /* pas de parc de navigateurs ici */ }
  pistes.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome');
  for (const p of pistes) {
    try { if (fs.statSync(p).isFile()) return p; } catch { /* suivant */ }
  }
  return null;
}

// Le jeu servi tel qu'il est publié.
//
// On s'appuie sur express plutôt que sur un serveur écrit à la main : un
// premier essai maison réinitialisait des connexions sous la charge — trois
// onglets qui réclament la trentaine de fichiers du jeu en même temps — et le
// test échouait pour une raison qui n'avait rien à voir avec le jeu.
function servirLeJeu(port) {
  const app = express();
  // Le journal des requêtes qui ont VRAIMENT atteint le serveur. C'est le seul
  // témoin honnête pour la sonde de version : un service worker peut répondre
  // depuis son cache, et la page croit alors avoir interrogé le réseau.
  const hits = [];
  app.use((req, _res, next) => { hits.push(req.url); next(); });
  app.use(express.static(RACINE, {
    etag: false, lastModified: false, cacheControl: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-store'),
  }));
  const serveur = http.createServer(app);
  serveur.on('clientError', (_e, socket) => socket.destroy());
  serveur.hits = hits;
  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => ok(serveur)));
}

function servirLesPairs(port) {
  const app = express();
  const serveur = http.createServer(app);
  app.use('/', ExpressPeerServer(serveur, { path: '/' }));
  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => ok(serveur)));
}

// Un serveur de rendez-vous qui inscrit bien les pairs mais n'achemine jamais
// les demandes de connexion. PeerJS ne dit alors NI « pair introuvable » NI
// rien du tout : le canal reste muet. C'est ce que font certains relais publics
// sous charge, et c'est le cas qui laissait l'enfant devant un refus sur son
// propre monde vide.
async function relaisSourd(portEcoute, portVrai) {
  const { WebSocketServer, WebSocket } = require('ws');
  const app = express();
  const vrai = http.createServer(app);
  app.use('/', ExpressPeerServer(vrai, { path: '/' }));
  await new Promise((ok) => vrai.listen(portVrai, '127.0.0.1', ok));

  // Le reste du dialogue doit passer normalement — y compris l'attribution
  // d'identifiant, qui se fait en HTTP. Sans cela on n'éprouverait qu'un
  // serveur injoignable, pas celui qui inscrit puis n'achemine rien.
  const devant = http.createServer((q, r) => {
    const amont = http.request(
      { host: '127.0.0.1', port: portVrai, path: q.url, method: q.method, headers: q.headers },
      (rep) => {
        const h = { ...rep.headers };
        delete h['access-control-allow-origin'];   // sinon l'en-tête arrive en double
        r.writeHead(rep.statusCode, { ...h, 'Access-Control-Allow-Origin': '*' });
        rep.pipe(r);
      },
    );
    amont.on('error', () => { r.writeHead(502); r.end(''); });
    q.pipe(amont);
  });
  const wss = new WebSocketServer({ server: devant });
  wss.on('connection', (client, req) => {
    const amont = new WebSocket(`ws://127.0.0.1:${portVrai}${req.url}`);
    const file = [];
    amont.on('open', () => { file.forEach((m) => amont.send(m)); file.length = 0; });
    amont.on('error', () => { /* le relais meurt avec le test */ });
    client.on('message', (m) => {
      const txt = m.toString();
      if (/"type"\s*:\s*"OFFER"/.test(txt)) return;     // avalée : c'est tout l'objet
      if (amont.readyState === 1) amont.send(txt); else file.push(txt);
    });
    amont.on('message', (m) => { if (client.readyState === 1) client.send(m.toString()); });
    amont.on('close', () => { try { client.close(); } catch { /* déjà */ } });
    client.on('close', () => { try { amont.close(); } catch { /* déjà */ } });
  });
  await new Promise((ok) => devant.listen(portEcoute, '127.0.0.1', ok));
  return () => { devant.close(); vrai.close(); };
}

// --- un joueur ---------------------------------------------------------------

// `stay=1` garde la partie ouverte, `cloud=` coupe la sauvegarde en ligne
// (inutile ici et absente en local), `rr=2` réduit la distance d'affichage
// pour que le monde se charge vite.
const adresse = (portJeu, portPairs) =>
  `http://127.0.0.1:${portJeu}/index.html?peerhost=127.0.0.1:${portPairs}&cloud=&stay=1&rr=2`;

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

class Banc {
  constructor(opts = {}) { this.opts = opts; this.pages = []; }

  async ouvrir() {
    const exe = trouverChromium();
    if (!exe) throw new Error('Chromium introuvable — pose son chemin dans la variable CHROMIUM');
    this.portJeu = this.opts.portJeu || 8321;
    this.portPairs = this.opts.portPairs || 9321;
    this.jeu = await servirLeJeu(this.portJeu);
    this.pairs = await servirLesPairs(this.portPairs);
    this.navigateur = await chromium.launch({
      executablePath: exe,
      args: ['--no-sandbox', '--use-gl=angle', '--use-angle=swiftshader'],
    });
  }

  // Un enfant devant sa tablette : contexte isolé, profil déjà rempli, pas de
  // proposition d'alertes qui viendrait masquer l'écran pendant le test.
  async joueur(prenom, opts = {}) {
    // `tactile` reproduit une tablette : c'est ce que la famille a réellement
    // entre les mains, et c'est la seule façon d'éprouver le zoom à deux doigts.
    const ctx = await this.navigateur.newContext({
      viewport: opts.viewport || { width: 420, height: 760 },
      hasTouch: !!opts.tactile,
      isMobile: !!opts.tactile,
    });
    const p = await ctx.newPage();
    p.prenom = prenom;
    p.erreurs = [];
    p.dialogues = [];
    p.on('pageerror', (e) => p.erreurs.push(`${e.message} @ ${String(e.stack).split('\n')[1] || ''}`.trim()));
    // Une promesse rejetée ne remonte pas comme une exception : sans cette
    // capture, une panne pendant l'ouverture du monde passait inaperçue et le
    // test se contentait de constater, plus tard, que la session avait disparu.
    // On garde les fautes du jeu, pas les aléas du réseau local : le serveur de
    // rendez-vous coupe parfois une requête sous la charge, et cela ne dit rien
    // du code qu'on éprouve.
    p.on('console', (m) => {
      if (m.type() !== 'error') return;
      const t = m.text();
      if (/Failed to load resource|ERR_CONNECTION|ERR_NETWORK|net::/.test(t)) return;
      p.erreurs.push(`console: ${t}`);
    });
    await p.addInitScript(() => {
      window.addEventListener('unhandledrejection', (e) => {
        console.error('promesse rejetée : ' + (e.reason && e.reason.message ? e.reason.message : e.reason));
      });
    });
    p.on('dialog', (d) => { p.dialogues.push(d.message().split('\n')[0]); d.accept(); });
    // Le service worker est coupé partout sauf là où c'est LUI qu'on éprouve :
    // il précharge et sert depuis son cache, deux façons de fausser les autres
    // scénarios — mais la sonde de version ne se teste qu'avec lui.
    if (opts.avecSW) await p.addInitScript(() => { window.__gardeSW = true; });
    // Ce qu'un VPN fait au jeu : la signalisation passe — le serveur de
    // rendez-vous répond, il sait qui tient quel monde — mais le canal de
    // données entre les deux tablettes ne s'ouvre jamais, parce que le trafic
    // pair à pair est bloqué ou dérouté. C'est la seule façon de reproduire à
    // la demande ce que la maison a constaté un soir de VPN allumé.
    if (opts.sansPairAPair) {
      await p.addInitScript(() => {
        const Vrai = window.RTCPeerConnection;
        window.RTCPeerConnection = function (...args) {
          const pc = new Vrai(...args);
          // On laisse tout se négocier, et on ne livre aucun candidat : sans
          // chemin, le canal reste à jamais « connecting ».
          pc.addIceCandidate = () => Promise.resolve();
          Object.defineProperty(pc, 'onicecandidate', { get: () => null, set: () => {} });
          return pc;
        };
        window.RTCPeerConnection.prototype = Vrai.prototype;
      });
    }
    // Une présentation qui se perd en route. Le lien est bon, les battements
    // passent, mais les messages « hello » n'arrivent pas pendant un moment —
    // ce que fait un tuyau encombré, et ce qu'on ne peut pas reproduire en
    // secouant le réseau local. On les avale à l'arrivée : l'effet est le même
    // que s'ils s'étaient perdus, et le test peut décider quand ça s'arrête.
    if (opts.helloFragile) {
      await p.addInitScript(() => {
        window.__avalerHelloSecondes = 0;
        window.__avalerHelloDebut = 0;
        window.__avalerHelloComptes = 0;
        // La couture du jeu (net.js) : retenir un « hello », c'est exactement
        // ce que fait un tuyau encombré. Le compteur dit ce qui a vraiment été
        // retenu — un scénario qui n'a rien retenu n'a rien éprouvé.
        window.__filtreMessages = (msg) => {
          if (!msg || msg.t !== 'hello' || !(window.__avalerHelloSecondes > 0)) return true;
          if (!window.__avalerHelloDebut) window.__avalerHelloDebut = Date.now();
          if (Date.now() - window.__avalerHelloDebut < window.__avalerHelloSecondes * 1000) {
            window.__avalerHelloComptes++;
            return false;
          }
          return true;
        };
      });
    }
    await p.addInitScript((prenom) => {
      localStorage.setItem('web-minecraft-profile-v1', JSON.stringify({ name: prenom, lookIdx: 0 }));
      localStorage.setItem('wm-notif-propose', JSON.stringify({ n: 9, t: Date.now() }));
      // Pas de service worker pendant les tests. Il n'a aucun rôle dans le jeu
      // à plusieurs, mais il précharge une trentaine de fichiers dès l'ouverture
      // de chaque onglet, et il sert ensuite depuis son cache : deux bonnes
      // façons de faire échouer un test pour rien, ou pire, d'en faire passer un
      // sur du code qui n'est plus celui du dépôt.
      if (navigator.serviceWorker && !window.__gardeSW) {
        navigator.serviceWorker.register = () => Promise.reject(new Error('désactivé pour les tests'));
      }
    }, prenom);
    await p.goto(adresse(this.portJeu, this.portPairs), { waitUntil: 'load' });
    await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
    this.pages.push(p);
    return p;
  }

  // Un joueur dont le serveur de rendez-vous n'est pas celui du banc : on s'en
  // sert pour éprouver ce qui se passe quand il ne répond pas.
  async joueurVers(prenom, portPairs) {
    const vrai = this.portPairs;
    this.portPairs = portPairs;
    try { return await this.joueur(prenom); } finally { this.portPairs = vrai; }
  }

  // Une partie solo, celle qu'un enfant lance le plus souvent. Le répit de
  // quiz est ouvert par la donnée qui le gouverne — pas en remplaçant une
  // méthode : un test qui débranche le code qu'il traverse ne prouve rien.
  async jouerSeul(prenom, opts = {}) {
    const p = await this.joueur(prenom, opts);
    await p.evaluate(() => {
      window.__game.edu.today().libreJusqua = 86400;
      document.getElementById('play-btn').click();
    });
    await p.waitForFunction(() => window.__game.running, null, { timeout: 30000 });
    await dormir(3500);   // le temps que les morceaux du monde autour arrivent
    return p;
  }

  // Ouvrir la carte comme l'enfant : le bouton, puis la vignette.
  async ouvrirLaCarte(p) {
    await p.evaluate(() => {
      if (document.getElementById('minimap').style.display !== 'block') {
        document.getElementById('map-btn').click();
      }
      document.getElementById('minimap').click();
    });
    await p.waitForFunction(() => window.__carte && window.__carte.ouverte, null, { timeout: 10000 });
    await dormir(600);
  }

  async creerMonde(prenom) {
    const p = await this.joueur(prenom);
    await p.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await p.evaluate(() => document.getElementById('host-btn').click());
    await p.waitForFunction(() => document.getElementById('room-code').textContent.length >= 4, null, { timeout: 40000 });
    const code = await p.evaluate(() => document.getElementById('room-code').textContent.trim());
    await p.evaluate(() => document.getElementById('online-play-btn').click());
    await dormir(1500);
    return { p, code };
  }

  async rejoindre(prenom, code) {
    const p = await this.joueur(prenom);
    await p.evaluate(() => document.getElementById('online-btn').click());
    await dormir(400);
    await p.evaluate((c) => {
      document.getElementById('join-code').value = c;
      document.getElementById('join-btn').click();
    }, code);
    await p.waitForFunction(
      () => !!(window.__game.net && window.__game.net.active && window.__game.net.linkState === 'ok'),
      null, { timeout: 40000 },
    ).catch(() => { /* l'échec est parfois ce qu'on teste */ });
    await dormir(1200);
    await p.evaluate(() => document.getElementById('online-play-btn')?.click());
    await dormir(1800);
    return p;
  }

  // Le vrai geste de l'enfant : « Mes mondes » puis « Jouer » sur le sien.
  // C'est le parcours de la capture d'écran, et celui qui manquait au banc —
  // on éprouvait « taper un code », pas « rouvrir mon monde ».
  async rouvrirSonMonde(p, code) {
    await p.evaluate(() => document.getElementById('online-btn').click());
    await dormir(500);
    const trouve = await p.evaluate((c) => {
      const b = [...document.querySelectorAll('#recent-worlds button')]
        .find((x) => /Jouer/.test(x.textContent) && x.parentElement.textContent.includes(c));
      if (!b) return false;
      b.click();
      return true;
    }, code);
    return trouve;
  }

  async fermer() {
    if (this.navigateur) await this.navigateur.close();
    if (this.jeu) this.jeu.close();
    if (this.pairs) this.pairs.close();
  }
}

// --- observer ce qu'un joueur voit -------------------------------------------

// Ce que dit le compteur, et ce qui est réellement dessiné. Tout l'intérêt est
// de comparer les deux : c'est leur désaccord qui trahissait les pannes.
const vu = (p) => p.evaluate(() => {
  const g = window.__game;
  const n = g.net;
  return {
    compteur: n && n.active ? n.playerCount() : 0,
    lien: n ? n.linkState : null,
    conns: n ? [...n.conns.entries()].map(([id, c]) => ({
      id: id.slice(-6), nom: c.name, pret: !!c.pret, direct: !!c.conn, dodo: !!c.dodo,
    })) : [],
    avatars: [...g.remotePlayers.entries()].map(([id, r]) => ({
      id: id.slice(-6), nom: r.name,
      x: Math.round(r.mesh.position.x), z: Math.round(r.mesh.position.z),
    })),
    bouton: document.getElementById('players-btn')?.textContent || '',
    // ce que le bandeau raconte : c'est souvent la seule chose qu'un enfant lit
    bandeau: document.getElementById('link-banner')?.style.display === 'none'
      ? '' : (document.getElementById('link-banner-txt')?.textContent || ''),
    hote: !!(n && n.isHost),
  };
});

const nomsVus = async (p) => (await vu(p)).avatars.map((a) => a.nom).sort();

// Attendre qu'une chose devienne vraie, plutôt que d'attendre longtemps et
// d'espérer. Un « dors trois secondes » suffit d'ordinaire et rate le jour où
// la machine est chargée : le test devient capricieux, et un test capricieux
// est pire qu'absent — on finit par ne plus le croire quand il a raison. La
// limite reste stricte : si la chose n'arrive jamais, on échoue quand même.
//
// À n'employer que pour ce qui DOIT devenir vrai. Quand on vérifie au contraire
// que rien ne bouge — un joueur endormi qui ne doit pas être éjecté —, il faut
// bel et bien laisser le temps s'écouler.
async function jusqua(condition, limiteMs = 20000, pasMs = 500) {
  const fin = Date.now() + limiteMs;
  for (;;) {
    if (await condition()) return true;
    if (Date.now() > fin) return false;
    await dormir(pasMs);
  }
}

// L'onglet qu'iOS suspend quand l'enfant passe à autre chose.
//
// On reproduit les deux effets, dans l'ordre où ils se produisent : la page se
// déclare cachée — ce qui laisse au jeu le temps de prévenir les autres —, puis
// tout se fige. Plus rien n'est émis ni traité, le lien restant ouvert. C'est
// exactement la situation que le jeu doit savoir traverser, et celle qui
// coupait la partie au bout de vingt secondes.
const endormir = (p) => p.evaluate(() => {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
  document.dispatchEvent(new Event('visibilitychange'));
  const n = window.__game.net;
  n._gele = n.onMessage;
  n.onMessage = () => {};
  clearInterval(n.posTimer); n.posTimer = null;
  clearInterval(n._hb); n._hb = null;
});

// L'enfant revient à l'application : tout redémarre, et le jeu doit se
// rattraper sans qu'on ait rien perdu.
const reveiller = (p) => p.evaluate(() => {
  const n = window.__game.net;
  if (n._gele) { n.onMessage = n._gele; n._gele = null; }
  n.startHeartbeat();
  n.startPosLoop();
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' });
  document.dispatchEvent(new Event('visibilitychange'));
});

// Deux doigts qui s'écartent sur l'écran. Playwright ne sait taper qu'à un
// doigt : le multi-touch passe par le protocole du navigateur.
async function pincer(p, centre, deDistance, aDistance, pas = 8, attente = 30) {
  const cdp = await p.context().newCDPSession(p);
  const points = (d) => [
    { x: centre.x - d / 2, y: centre.y, id: 1 },
    { x: centre.x + d / 2, y: centre.y, id: 2 },
  ];
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(deDistance) });
  for (let i = 1; i <= pas; i++) {
    const d = deDistance + ((aDistance - deDistance) * i) / pas;
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(d) });
    if (attente) await dormir(attente);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await dormir(200);
}

module.exports = { Banc, vu, nomsVus, endormir, reveiller, dormir, jusqua, relaisSourd, pincer,
  // réutilisés par les autres suites, qui montent leur propre décor
  servirLeJeuPour: servirLeJeu, servirLesPairsPour: servirLesPairs, trouverChromium };
