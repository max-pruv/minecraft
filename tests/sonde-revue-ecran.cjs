// LA REVUE D'ÉCRAN (v506) — ce que l'enfant voit, avant que Max ne le voie.
//
// Pourquoi elle existe. En une matinée, Max a signalé lui-même, depuis son
// iPhone, sept défauts qu'une capture montrait au premier regard : monter et
// descendre inversés en vol, une coche illisible pour sortir de la
// construction, une roue qu'on ne reconnaît pas, des cubes orange dans le ciel,
// des feux de détresse en boules qui flottent, la minicarte décalée, et aucun
// mot pour dire vers quelle ville on atterrit. Le portail était vert à chaque
// fois : UN PORTAIL VERT NE PROUVE PAS QU'UN ÉCRAN EST CLAIR.
//
// Elle met le jeu dans chaque état que l'enfant traverse, à la taille de
// l'iPhone de Max (430 × 932) et de l'iPad (820 × 1180), en tactile, de jour et
// de nuit, avec la couche HD et les ombres forcées (sinon le banc rend ce
// qu'aucune tablette ne voit, v287, v247) et une vraie distance d'affichage
// (`rr=9` : à `rr=2` tout est dans le brouillard, v203). Elle n'est importée
// par aucune suite : elle reste isolée (`sondeIsolee`).
//
// Chaque état se prépare SEUL et rend la page à pied ensuite ; un état qui
// échoue NOMME son échec et la sonde passe au suivant (v288 : une sonde qui
// avale ses erreurs prend trois vues sur cinq et se dit verte).
//
//     cd tests && node sonde-revue-ecran.cjs [dossier] [--etats=a,b] [--vues=iphone,ipad] [--sans-nuit|--sans-jour] [--en-ligne]
//
// Le dossier par défaut est HORS du dépôt. La grille de lecture des captures
// est dans docs/revue-ecran.md, et CLAUDE.md dit quand la jouer.
const { Banc, dormir } = require('./banc.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const args = process.argv.slice(2);
const opt = (n) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.split('=')[1].split(',') : null; };
const dossier = args.find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), 'revue-ecran');
fs.mkdirSync(dossier, { recursive: true });

const VUES = {
  iphone: { width: 430, height: 932 },
  ipad: { width: 820, height: 1180 },
};
// 0,75 est minuit (0,0 est le lever du soleil : un ciel rose et des façades en
// plein jour — c'est la première passe de cette sonde qui l'a montré).
const HEURES = [['jour', 0.42], ['nuit', 0.75]]
  .filter(([n]) => !(n === 'nuit' && args.includes('--sans-nuit')) && !(n === 'jour' && args.includes('--sans-jour')));

// ——— les gestes, dans la page ———————————————————————————————————————————————

// Rend la page à pied, menus fermés, rien en main : le point de départ de chaque état.
const aPied = (tab) => tab.evaluate(async () => {
  const g = window.__game, C = window.__commandes;
  const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
  try { if (window.__carte && window.__carte.ouverte) document.getElementById('map-modal-close').click(); } catch {}
  try { if (C && C.estOuvert && C.estOuvert()) document.getElementById('menu-reprendre').click(); } catch {}
  try { if (C && C.enConstruction && C.enConstruction()) C.construire(false); } catch {}
  try { if (g.fun.bordDe && g.fun.bordDe()) document.getElementById('board-btn').click(); } catch {}
  for (let e = 0; e < 6 && g.fun.montureConduite && g.fun.montureConduite(); e++) {
    document.getElementById('ride-btn').click(); await tenir(0.5);
  }
  g.player.pilote = null; g.player.avionEtat = undefined; g.player.avionEnVol = false; g.player.approche = null;
  for (const k of ['KeyW', 'KeyA', 'KeyD']) g.player.keys.delete(k);
  g.player.touchMove = { f: 0, s: 0 };
  if (g.player.flying) g.player.toggleFly();
  const mini = document.getElementById('minimap');
  if (mini && mini.style.display === 'block') document.getElementById('map-btn').click();
  g.running = true;
});

// Pose l'enfant et attend que le monde autour soit maillé (borné, la durée dans le journal).
async function poserEt(tab, { x, y, z, yaw = 0, pitch = -0.05, vol = false }) {
  await tab.evaluate(({ x, y, z, yaw, pitch, vol }) => {
    const g = window.__game;
    const sol = y == null ? g.world.terrainHeight(Math.floor(x), Math.floor(z)) + 1.01 : y;
    g.player.flying = !!vol;
    g.player.pos.set(x + 0.5, sol, z + 0.5); g.player.vel.set(0, 0, 0);
    g.player.yaw = yaw; g.player.pitch = pitch;
  }, { x, y, z, yaw, pitch, vol });
  return attendreMonde(tab);
}

async function attendreMonde(tab, maxMs = 30000) {
  const t0 = Date.now();
  let avant = -1, stables = 0;
  await dormir(3000);
  while (Date.now() - t0 < maxMs) {
    const n = await tab.evaluate(() => window.__game.chunkMeshes.size).catch(() => -1);
    stables = n === avant ? stables + 1 : 0; avant = n;
    if (stables >= 3) break;
    await dormir(1500);
  }
  return Math.round((Date.now() - t0) / 1000);
}

// ——— les états ————————————————————————————————————————————————————————————————
// Chacun prépare la page et rend un petit relevé (ce qu'il a obtenu), ou jette.

const ETATS = [
  { nom: 'accueil', avantJouer: true },
  { nom: 'menu', async prep(tab) {
    await tab.evaluate(() => document.getElementById('menu-btn').click());
    await dormir(800);
    return tab.evaluate(() => ({ ouvert: window.__commandes.estOuvert() }));
  } },
  { nom: 'campagne', async prep(tab, ctx) {
    const s = await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    return { monde: s + ' s' };
  } },
  { nom: 'paris', async prep(tab) {
    const p = await tab.evaluate(async () => {
      const { adresseParis } = await import('./src/paris.js');
      const [x, z] = adresseParis(-0.8, -0.9);
      return { x, z };
    });
    const s = await poserEt(tab, { x: p.x, z: p.z, yaw: Math.PI / 2, pitch: 0.02 });
    return { monde: s + ' s' };
  } },
  { nom: 'minicarte', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    await tab.evaluate(() => document.getElementById('map-btn').click());
    await dormir(2500);
    return tab.evaluate(() => ({ affichee: document.getElementById('minimap').style.display }));
  } },
  { nom: 'carte-monde', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    await tab.evaluate(() => {
      if (document.getElementById('minimap').style.display !== 'block') document.getElementById('map-btn').click();
      document.getElementById('minimap').click();
    });
    await tab.waitForFunction(() => window.__carte && window.__carte.ouverte, null, { timeout: 30000 });
    await dormir(4000);
    return { ouverte: true };
  } },
  { nom: 'volant-arret', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    return monterEnVoiture(tab);
  } },
  { nom: 'volant-roule', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    const r = await monterEnVoiture(tab);
    await tab.evaluate(() => window.__game.player.keys.add('KeyW'));
    await dormir(3500);
    return { ...r, v: await tab.evaluate(() => +(window.__game.player.vitesseVoiture || 0).toFixed(1)) };
  }, apres: (tab) => tab.evaluate(() => window.__game.player.keys.delete('KeyW')) },
  { nom: 'voiture-rue-percutee', async prep(tab) {
    // Dans Paris : on va au volant à côté d'une voiture de la rue et l'on publie
    // le choc comme la physique le ferait (degats.js, v363).
    const p = await tab.evaluate(async () => {
      const { adresseParis } = await import('./src/paris.js');
      const [x, z] = adresseParis(-0.8, -0.9); return { x, z };
    });
    await poserEt(tab, { x: p.x, z: p.z, yaw: Math.PI / 2 });
    const r = await monterEnVoiture(tab);
    await dormir(4000);
    const choc = await tab.evaluate(async () => {
      const g = window.__game, P = g.player;
      const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
      let m = null, dm = Infinity;
      g.scene.traverse((o) => {
        if (!o.userData || !o.userData.roues || !o.visible || !o.parent) return;
        const a = g.fun.montureConduite && g.fun.montureConduite();
        if (a && o === a.mesh) return;
        const d = o.position.distanceTo(P.pos);
        if (d < dm) { dm = d; m = o; }
      });
      if (!m) return { err: 'aucune voiture de la rue en vue' };
      const a = g.fun.montureConduite();
      a.pos.set(m.position.x + 3, m.position.y, m.position.z); a.mesh.position.copy(a.pos);
      P.pos.copy(a.pos); P.yaw = Math.PI / 2;
      await tenir(0.3);
      P.choc = { force: 0.8, t: performance.now(), x: m.position.x, z: m.position.z };
      await tenir(0.5);
      P.choc = null;
      // la caméra recule et regarde la voiture heurtée
      P.yaw = Math.atan2(-(m.position.x - P.pos.x), -(m.position.z - P.pos.z));
      return { a: +dm.toFixed(1) };
    });
    await dormir(2000);
    return { ...r, ...choc };
  } },
  { nom: 'vol-libre', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    await tab.evaluate(() => {
      const g = window.__game;
      if (!g.player.flying) g.player.toggleFly();
      g.player.pos.y += 18; g.player.pitch = -0.25;
    });
    await dormir(2500);
    return tab.evaluate(() => ({ vole: window.__game.player.flying }));
  } },
  { nom: 'avion-sol', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    return monterEnAvion(tab);
  } },
  { nom: 'avion-vol', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    const r = await monterEnAvion(tab);
    await tab.evaluate(() => {
      const P = window.__game.player;
      P.pos.y += 60; P.vitesseAvion = P.pilote ? P.pilote.max * 0.8 : 0;
      P.avionEnVol = true; P.avionEtat = 'vol'; P.trainVoulu = false;
    });
    await attendreMonde(tab, 15000);
    return { ...r, etat: await tab.evaluate(() => window.__game.player.avionEtat) };
  } },
  { nom: 'avion-approche', async prep(tab) {
    // La règle de monte.js (v452) : un aérodrome générique, départ décalé, ✈️ en vol.
    const a = await tab.evaluate(async () => {
      const { AEROPORTS } = await import('./src/aeroport.js');
      const q = AEROPORTS.find((x) => x.cle === 'orly') || AEROPORTS[0];
      return { x: q.x - 520, z: q.z + 160, sol: q.sol || 35 };
    });
    await poserEt(tab, { x: a.x, z: a.z, yaw: -Math.PI / 4 });
    const r = await monterEnAvion(tab);
    await tab.evaluate((a) => {
      const g = window.__game, P = g.player;
      P.pos.y = Math.max(a.sol + 70, g.world.sommetColonne(Math.floor(a.x), Math.floor(a.z)) + 50);
      P.avionEtat = 'vol'; P.avionEnVol = true; P.vitesseAvion = P.pilote ? P.pilote.max * 0.8 : 0; P.yaw = -Math.PI / 4;
      P.touchMove = { f: 0, s: 0 };
      document.getElementById('fly-btn').dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    }, a);
    await attendreMonde(tab, 15000);
    return { ...r, approche: await tab.evaluate(() => {
      const P = window.__game.player;
      return P.approche ? (P.guideApproche && P.guideApproche.phase) || P.approche.phase : 'aucune';
    }) };
  } },
  // L'AÉROPORT (v530) : au poste, aux commandes, ✈️ appuyé — l'appareil roule
  // vers la piste élargie (« Roulage vers la piste ») ; puis Orly vu du ciel.
  { nom: 'aeroport-roulage', async prep(tab) {
    const q = await tab.evaluate(async () => {
      const A = await import('./src/aeroport.js');
      const a = A.AEROPORTS.find((x) => x.cle === 'orly');
      const p = A.postesAvion(a.profil, a.r).find((u) => u.espece === 'avionligne');
      return { x: a.x + p.du, z: a.z + p.dv - 3, sol: a.sol };
    });
    await poserEt(tab, { x: q.x, z: q.z, y: q.sol + 1.05, yaw: Math.PI });
    const r = await monterEnAvion(tab);
    await tab.evaluate(() => {
      const P = window.__game.player;
      P.yaw = -Math.PI / 2; P.pitch = -0.1;
      P.avionEtat = 'sol'; P.avionEnVol = false; P.vitesseAvion = 0;
      document.getElementById('fly-btn').dispatchEvent(new TouchEvent('touchstart', { cancelable: true, bubbles: true }));
    });
    await dormir(5000);
    return { ...r, roulage: await tab.evaluate(() => !!window.__game.player.roulage) };
  } },
  { nom: 'aeroport-ciel', async prep(tab) {
    const a = await tab.evaluate(async () => {
      const { AEROPORTS } = await import('./src/aeroport.js');
      const q = AEROPORTS.find((x) => x.cle === 'orly');
      return { x: q.x, z: q.z - 70, y: q.sol + 70 };
    });
    await poserEt(tab, { x: a.x, z: a.z, y: a.y, yaw: Math.PI, pitch: -0.75, vol: true });
    return { vole: await tab.evaluate(() => window.__game.player.flying) };
  } },
  { nom: 'construction', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    await tab.evaluate(() => { const C = window.__commandes; C.construire(true); C.outil(true); });
    await dormir(1500);
    return tab.evaluate(() => ({ construction: window.__commandes.enConstruction() }));
  } },
  { nom: 'metro', async prep(tab) {
    // Washington, quai de Smithsonian (washington.js) : on attend la rame et l'on monte.
    const q = await tab.evaluate(async () => {
      const D = await import('./src/washington.js');
      const P = D.WASHINGTON, quai = D.QUAIS_METRO.find((x) => x.nom === 'Smithsonian') || D.QUAIS_METRO[0];
      return { x: P.x + quai.u, y: quai.y + 2, z: P.z + quai.v };
    });
    await poserEt(tab, { x: q.x, y: q.y, z: q.z, yaw: 0 });
    let monte = false;
    for (let t = 0; t < 60 && !monte; t++) {
      monte = await tab.evaluate(() => {
        const b = document.getElementById('board-btn');
        if (b && b.offsetParent !== null && getComputedStyle(b).display !== 'none') { b.click(); return true; }
        return false;
      });
      if (!monte) await dormir(1000);
    }
    await dormir(4000);
    return tab.evaluate(() => ({ aBord: !!(window.__game.fun.bordDe && window.__game.fun.bordDe()) }));
  } },
];

async function monterEnVoiture(tab) {
  return tab.evaluate(async () => {
    const g = window.__game;
    const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
    for (const a of [...g.animalManager.animals]) { g.animalManager.scene.remove(a.mesh); }
    g.animalManager.animals.length = 0;
    const x = g.player.pos.x, z = g.player.pos.z;
    const a = g.animalManager.invoquer('voiture', x - Math.sin(g.player.yaw) * 3, z - Math.cos(g.player.yaw) * 3);
    const t0 = performance.now();
    while (performance.now() - t0 < 20000 && !(a && a.mesh.userData.roues)) await tenir(0.3);
    for (let e = 0; e < 8 && !(g.fun.montureConduite && g.fun.montureConduite()); e++) {
      document.getElementById('ride-btn').click(); await tenir(0.6);
    }
    await tenir(1.5);
    return { auVolant: !!(g.fun.montureConduite && g.fun.montureConduite()) };
  });
}

async function monterEnAvion(tab, espece = 'avionligne') {
  return tab.evaluate(async (espece) => {
    const g = window.__game;
    const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
    for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
    g.animalManager.animals.length = 0;
    const d = { x: -Math.sin(g.player.yaw), z: -Math.cos(g.player.yaw) };
    g.animalManager.invoquer(espece, Math.round(g.player.pos.x + d.x * 3), Math.round(g.player.pos.z + d.z * 3));
    for (let e = 0; e < 8 && !g.player.pilote; e++) { document.getElementById('ride-btn').click(); await tenir(0.6); }
    await tenir(1.5);
    return { pilote: !!g.player.pilote };
  }, espece);
}

// ——— la boucle ————————————————————————————————————————————————————————————————

(async () => {
  const filtreEtats = opt('etats'), filtreVues = opt('vues');
  const banc = new Banc({ portJeu: 8505, portPairs: 9505 });
  await banc.ouvrir();
  const journal = [];
  const noter = (l) => { console.log(l); journal.push(l); };
  const prendre = async (tab, nom) => {
    const f = path.join(dossier, nom + '.png');
    try { await tab.screenshot({ path: f, timeout: 120000 }); noter('📸 ' + nom); }
    catch (e) { noter(`❌ ${nom} : capture impossible (${String(e.message).split('\n')[0]})`); }
  };
  try {
    for (const [vue, viewport] of Object.entries(VUES)) {
      if (filtreVues && !filtreVues.includes(vue)) continue;
      const params = '&ombres=1&hd=3';
      // l'accueil se capture AVANT « Jouer » : une page à elle
      if (!filtreEtats || filtreEtats.includes('accueil')) {
        const p0 = await banc.joueur('Accueil' + vue, { tactile: true, viewport, rr: 9, params, prep: 1 });
        await dormir(12000);
        await prendre(p0, `${vue}-accueil`);
        await p0.close().catch(() => {});
      }
      const tab = await banc.jouerSeul('Revue' + vue, { tactile: true, viewport, rr: 9, params, pret: true });
      const depart = await tab.evaluate(() => {
        const P = window.__game.player.pos; return { x: Math.floor(P.x), z: Math.floor(P.z), yaw: window.__game.player.yaw };
      });
      for (const e of ETATS) {
        if (e.avantJouer) continue;
        if (filtreEtats && !filtreEtats.includes(e.nom)) continue;
        try {
          await aPied(tab);
          const t0 = Date.now();
          const r = await e.prep(tab, { depart });
          noter(`· ${vue} ${e.nom} prêt en ${Math.round((Date.now() - t0) / 1000)} s ${JSON.stringify(r || {})}`);
          for (const [nomH, h] of HEURES) {
            await tab.evaluate((h) => window.__setDayTime(h), h);
            await dormir(2500);   // le ciel tourne à l'image suivante (v291)
            await prendre(tab, `${vue}-${e.nom}-${nomH}`);
          }
          if (e.apres) await e.apres(tab);
        } catch (err) {
          noter(`❌ ${vue} ${e.nom} : ${String(err.message).split('\n')[0]}`);
        }
      }
      await tab.close().catch(() => {});
    }
    // deux tablettes en ligne : la vue de l'invité, l'hôte à côté de lui
    if (args.includes('--en-ligne')) {
      try {
        const viewport = VUES.iphone;
        const { p: hote, code } = await banc.creerMonde('Hote', { tactile: true, viewport, rr: 9, params: '&ombres=1&hd=3' });
        const invite = await banc.rejoindre('Invite', code, { tactile: true, viewport, rr: 9, params: '&ombres=1&hd=3' });
        const pos = await hote.evaluate(() => { const P = window.__game.player.pos; return { x: P.x, y: P.y, z: P.z }; });
        await invite.evaluate((p) => {
          const g = window.__game; g.player.pos.set(p.x + 4, p.y, p.z + 4);
          g.player.yaw = Math.atan2(4, 4);
        }, pos);
        await dormir(8000);
        await prendre(invite, 'iphone-en-ligne-invite');
        await prendre(hote, 'iphone-en-ligne-hote');
      } catch (err) { noter(`❌ en ligne : ${String(err.message).split('\n')[0]}`); }
    }
  } finally {
    fs.writeFileSync(path.join(dossier, 'journal.txt'), journal.join('\n') + '\n');
    console.log('→', dossier);
    await banc.fermer();
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(2); });
