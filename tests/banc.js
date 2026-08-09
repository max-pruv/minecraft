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
  app.use(express.static(RACINE, {
    etag: false, lastModified: false, cacheControl: false,
    setHeaders: (res) => res.setHeader('Cache-Control', 'no-store'),
  }));
  const serveur = http.createServer(app);
  serveur.on('clientError', (_e, socket) => socket.destroy());
  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => ok(serveur)));
}

function servirLesPairs(port) {
  const app = express();
  const serveur = http.createServer(app);
  app.use('/', ExpressPeerServer(serveur, { path: '/' }));
  return new Promise((ok) => serveur.listen(port, '127.0.0.1', () => ok(serveur)));
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
  async joueur(prenom) {
    const ctx = await this.navigateur.newContext({ viewport: { width: 420, height: 760 } });
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
    await p.addInitScript((prenom) => {
      localStorage.setItem('web-minecraft-profile-v1', JSON.stringify({ name: prenom, lookIdx: 0 }));
      localStorage.setItem('wm-notif-propose', JSON.stringify({ n: 9, t: Date.now() }));
      // Pas de service worker pendant les tests. Il n'a aucun rôle dans le jeu
      // à plusieurs, mais il précharge une trentaine de fichiers dès l'ouverture
      // de chaque onglet, et il sert ensuite depuis son cache : deux bonnes
      // façons de faire échouer un test pour rien, ou pire, d'en faire passer un
      // sur du code qui n'est plus celui du dépôt.
      if (navigator.serviceWorker) {
        navigator.serviceWorker.register = () => Promise.reject(new Error('désactivé pour les tests'));
      }
    }, prenom);
    await p.goto(adresse(this.portJeu, this.portPairs), { waitUntil: 'load' });
    await p.waitForFunction(() => window.__game, null, { timeout: 90000 });
    this.pages.push(p);
    return p;
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
  };
});

const nomsVus = async (p) => (await vu(p)).avatars.map((a) => a.nom).sort();

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

module.exports = { Banc, vu, nomsVus, endormir, reveiller, dormir };
