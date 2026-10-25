// LES AMIS BOUGENT-ILS EN TEMPS RÉEL ? (amis-fluides)
//
// Max : « Tu le vois bouger de manière saccadée, toutes les secondes il a
// avancé… c'est pas très real time. » On fait rouler le conducteur en TEMPS
// RÉEL (sa position est une fonction de la montre, sa physique suspendue : on
// mesure le réseau et le rendu de l'ami, pas la cadence du banc), et chez
// l'autre tablette on relève, image par image, la position où l'ami est
// DESSINÉ. La grandeur est la vitesse apparente d'une image à l'autre,
// rapportée à la vraie : 1 partout pour un mouvement fluide ; un relevé qui
// arrive d'un coup la fait bondir, une attente la fait tomber à zéro.
//
// `mesurerFluidite` est lue telle quelle par `reseau.js` (une copie de sonde
// finit par diverger du témoin, v400). Lancée seule, la sonde rejoue les trois
// chemins : direct, relayé par l'hôte (`rpos`) et par le nuage.

const { Banc, nomsVus, dormir, jusqua } = require('./banc.js');

// Monte au volant d'une voiture invoquée, puis roule en ligne droite à `v`
// blocs par seconde, position fonction du temps réel, pendant `ms`.
async function rouler(page, v, ms) {
  return page.evaluate(async ({ v, ms }) => {
    const g = window.__game; const dodo = (t) => new Promise((f) => setTimeout(f, t));
    // déjà au volant, on garde sa voiture : c'est une bête de l'animalerie,
    // et vider l'animalerie la retirerait sous le conducteur
    if (!(g.fun.montureConduite && g.fun.montureConduite())) {
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
      g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5);
      await dodo(1500);
      document.getElementById('ride-btn').click();
      await dodo(800);
    }
    const auVolant = !!(g.fun.montureConduite && g.fun.montureConduite());
    const maj = g.player.update;
    g.player.update = function () {};
    const yaw0 = g.player.yaw;
    g.player.yaw = -Math.PI / 2;            // cap +x
    const x0 = g.player.pos.x, t0 = performance.now();
    const pas = () => { g.player.pos.x = x0 + v * (performance.now() - t0) / 1000; };
    const it = setInterval(pas, 10);
    await dodo(ms);
    clearInterval(it);
    const parcouru = g.player.pos.x - x0;
    await dodo(500);                         // l'observateur a fini de relever
    // on revient d'où l'on est parti : un témoin d'une suite rend la place
    // telle qu'il l'a trouvée (le suivant se place par rapport à elle)
    g.player.pos.x = x0; g.player.yaw = yaw0;
    g.player.update = maj;
    return { auVolant, parcouru };
  }, { v, ms });
}

// Chez l'observateur : relève image par image la position DESSINÉE de l'ami
// `nom` pendant `ms`, et rend la distribution de sa vitesse apparente.
async function releverChez(page, nom, v, ms) {
  return page.evaluate(({ nom, v, ms }) => new Promise((fin) => {
    const g = window.__game; const rel = [];
    const t0 = performance.now();
    const tour = () => {
      let rp = null;
      for (const r of g.remotePlayers.values()) if (r.name === nom) rp = r;
      if (rp) rel.push([performance.now(), rp.pos.x, rp.pos.z, !!rp.vehicule, rp.suivi ? Math.round(rp.suivi.retard) : null, rp.suivi ? rp.suivi.recus : null]);
      else rel.push([performance.now(), null, null, false, null, null]);
      if (performance.now() - t0 < ms) requestAnimationFrame(tour);
      else fin(rel);
    };
    requestAnimationFrame(tour);
  }), { nom, v, ms });
}

function juger(tout, v) {
  const manquants = tout.filter((r) => r[1] == null).length;
  const rel = tout.filter((r) => r[1] != null);
  const vit = [];
  let sautMax = 0, arrets = 0, voiture = 0;
  for (let i = 1; i < rel.length; i++) {
    const dt = (rel[i][0] - rel[i - 1][0]) / 1000;
    if (dt <= 0) continue;
    if (rel[i][3]) voiture++;
    const d = Math.hypot(rel[i][1] - rel[i - 1][1], rel[i][2] - rel[i - 1][2]);
    const s = d / dt / v;
    vit.push(s);
    sautMax = Math.max(sautMax, d - v * dt);
    if (s < 0.2) arrets++;
  }
  vit.sort((a, b) => a - b);
  const q = (f) => vit.length ? +vit[Math.min(vit.length - 1, Math.floor(f * vit.length))].toFixed(2) : null;
  return {
    images: vit.length, voiture, manquants,
    retard: rel.length ? rel[rel.length - 1][4] : null,
    recus: rel.length ? rel[rel.length - 1][5] - rel[0][5] : null,
    // le pire écart à la vraie vitesse, en fraction : 0 = parfait
    pire: vit.length ? +Math.max(...vit.map((s) => Math.abs(s - 1))).toFixed(2) : null,
    p10: q(0.1), med: q(0.5), p90: q(0.9),
    // la part des images où l'ami avance à la vraie vitesse, à 35 % près
    partJuste: vit.length ? +(vit.filter((x) => Math.abs(x - 1) <= 0.35).length / vit.length).toFixed(2) : null,
    arrets, partArrets: vit.length ? +(arrets / vit.length).toFixed(2) : null,
    sautMax: +sautMax.toFixed(2),
  };
}

// Le conducteur roule pendant que l'observateur relève : on jette les deux
// premières secondes (l'ami monte en vitesse chez l'autre, quel que soit le
// code) et l'on juge le régime établi.
// Une page qui vient d'entrer charge son monde et ne rend parfois pas une
// image en dix secondes : on attend qu'elle rende (au moins six images en deux
// secondes, une minute au plus), sinon on mesurerait son chargement.
async function attendreQuElleRende(page, maxMs = 60000) {
  const t0 = Date.now(); let ips = 0;
  while (Date.now() - t0 < maxMs) {
    ips = await page.evaluate(() => new Promise((fin) => {
      let n = 0; const t = performance.now();
      const tour = () => { n++; if (performance.now() - t < 2000) requestAnimationFrame(tour); else fin(n / 2); };
      requestAnimationFrame(tour);
    }));
    if (ips >= 3) break;
  }
  return { ips, ms: Date.now() - t0 };
}

async function mesurerFluidite(conducteur, observateur, nom, { v = 30, ms = 9000 } = {}) {
  const rendu = await attendreQuElleRende(observateur);
  const [roule, rel] = await Promise.all([rouler(conducteur, v, ms + 2500), releverChez(observateur, nom, v, ms + 2500)]);
  const t0 = rel.length ? rel[0][0] : 0;
  return { roule, rendu, ...juger(rel.filter((r) => r[0] - t0 > 2500), v) };
}

module.exports = { mesurerFluidite, rouler, releverChez, juger };

if (require.main === module) {
  (async () => {
    const { servirLeNuage } = require('./nuage.js');
    const banc = new Banc();
    await banc.ouvrir();
    const nuage = await servirLeNuage(9721);
    const CH = (process.env.CHEMINS || 'direct,relaye,nuage').split(',');
    try {
      if (CH.includes('direct') || CH.includes('relaye')) {
      const { p: hote, code } = await banc.creerMonde('Marlon');
      const alice = await banc.rejoindre('Alice', code);
      await jusqua(async () => (await nomsVus(alice)).includes('Marlon'), 30000);
      console.log('direct (Marlon vu par Alice)', JSON.stringify(await mesurerFluidite(hote, alice, 'Marlon')));
      const nina = await banc.rejoindre('Nina', code);
      await jusqua(async () => (await nomsVus(nina)).includes('Alice'), 30000);
      // l'hôte ne fait que relayer : mis de côté, il ne prend plus quatre
      // cœurs à Nina (v440), dont la page rendait trois images en neuf secondes
      await hote.evaluate(() => { const n = window.__game.net; const r = n.relay.bind(n); window.__relais = 0; n.relay = (...a) => { window.__relais++; return r(...a); }; });
      if (!process.env.SANS_COTE) await banc.mettreDeCote(hote);
      console.log('relayé (Alice vue par Nina)', JSON.stringify(await mesurerFluidite(alice, nina, 'Alice')));
      console.log('relais faits par l\'hôte', await hote.evaluate(() => ({ relais: window.__relais, running: window.__game.running, conns: window.__game.net.conns.size })));
      await banc.ramener(hote);
      await nina.close(); await alice.close(); await hote.close();
      }
      if (CH.includes('nuage')) {
      const AVEC_NUAGE = { portNuage: 9721 };
      const sacha = await banc.joueurVers('Sacha', 9798, AVEC_NUAGE);
      await sacha.evaluate(() => document.getElementById('online-btn').click());
      await dormir(400);
      await sacha.evaluate(() => document.getElementById('host-btn').click());
      await jusqua(async () => sacha.evaluate(() => !!(window.__game.net && window.__game.net.bus)), 60000);
      const c2 = await sacha.evaluate(() => document.getElementById('room-code').textContent.trim());
      const alba = await banc.joueurVers('Alba', 9798, AVEC_NUAGE);
      await alba.evaluate(() => document.getElementById('online-btn').click());
      await dormir(400);
      await alba.evaluate((c) => { document.getElementById('join-code').value = c; document.getElementById('join-btn').click(); }, c2);
      await dormir(2000);
      await alba.evaluate(() => document.getElementById('online-play-btn')?.click());
      await sacha.evaluate(() => document.getElementById('online-play-btn')?.click());
      await jusqua(async () => (await nomsVus(alba)).includes('Sacha'), 120000);
      console.log('nuage (Sacha vu par Alba)', JSON.stringify(await mesurerFluidite(sacha, alba, 'Sacha')));
      }
    } catch (e) { console.log('ERREUR', e && e.stack || e); }
    await banc.fermer().catch(() => {});
    if (nuage && nuage.close) nuage.close();
    process.exit(0);
  })();
}
