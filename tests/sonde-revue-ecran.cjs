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
//     cd tests && node sonde-revue-ecran.cjs [dossier] [--etats=a,b] [--vues=iphone,ipad] [--sans-nuit|--sans-jour] [--en-ligne] [--rr=12] [--params=&loin=10240]
//
// Le dossier par défaut est HORS du dépôt. La grille de lecture des captures
// est dans docs/revue-ecran.md, et CLAUDE.md dit quand la jouer.
const { Banc, dormir } = require('./banc.js');
const path = require('path');
const fs = require('fs');
const os = require('os');

const args = process.argv.slice(2);
const opt = (n) => { const a = args.find((x) => x.startsWith(`--${n}=`)); return a ? a.slice(n.length + 3).split(',') : null; };
const dossier = args.find((a) => !a.startsWith('--')) || path.join(os.tmpdir(), 'revue-ecran');
fs.mkdirSync(dossier, { recursive: true });

const VUES = {
  iphone: { width: 430, height: 932 },
  ipad: { width: 820, height: 1180 },
  banc: { width: 420, height: 760 },
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
  // la minicarte est toujours là en jeu (v530) : on ne la ferme plus
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

// la police jusqu'à la poursuite (`controle` faux) ou jusqu'au contrôle :
// une voiture, une vraie bêtise (`betise`, le geste que le jeu attend), des
// cercles sur la dalle pendant que la police arrive, puis l'arrêt
async function policeJusqua(tab, controle) {
  const { dalle } = require('./sonde-police.cjs');
  const y0 = await dalle(tab, 47000, 47000, 130);
  return tab.evaluate(async ([y0, controle]) => {
    const g = window.__game, P = g.player, am = g.animalManager, pat = window.__patrouille;
    const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
    if (!pat) return { err: 'pas de patrouille' };
    pat.remiseAZero();
    P.flying = false; P.yaw = 0; P.pos.set(47000.5, y0 + 1.2, 47040.5); P.vel.set(0, 0, 0);
    await dodo(800);
    const a = am.invoquer('voiture', P.pos.x, P.pos.z - 3, false, { flotte: 'lucid-gravity.glb' });
    a.yaw = Math.PI; await dodo(400);
    for (let i = 0; i < 6 && !(g.fun.montureConduite && g.fun.montureConduite()); i++) { document.getElementById('ride-btn').click(); await dodo(600); }
    P.touchMove.f = 0.8; P.touchMove.s = -1;
    await dodo(2000);
    pat.betise('voiture');
    const t0 = performance.now();
    while (performance.now() - t0 < 25000 && !pat.etat().unites.some((u) => u.ecart < 22)) await dodo(250);
    await dodo(1500);
    if (!controle) { P.touchMove.s = -0.6; await dodo(800); return { etat: pat.etat() }; }
    P.touchMove.f = 0; P.touchMove.s = 0;
    const t1 = performance.now();
    while (performance.now() - t1 < 40000 && !(pat.etat().controle && pat.etat().controle.etape === 'parle')) await dodo(250);
    await dodo(1500);
    return { etat: pat.etat() };
  }, [y0, controle]);
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
  // La forêt (v541) : les vrais arbres, à pied puis en vol, là où Max s'est
  // téléporté (la forêt tempérée dense près de (−1 500, −2 500), le site de
  // `sonde-captures-vrais-arbres.cjs`). Hors des villes et hors du
  // couloir du témoin : c'est le seul état où l'on voit des arbres.
  { nom: 'foret', async prep(tab) {
    const s = await poserEt(tab, { x: -1560, z: -2488, yaw: 0.8, pitch: 0.12 });
    return { monde: s + ' s', ...(await tab.evaluate(() => ({ arbres: window.__game.world.arbres, hd: window.__game.RAYON_HD }))) };
  } },
  { nom: 'foret-vol', async prep(tab) {
    const s = await poserEt(tab, { x: -1560, z: -2470, yaw: 0.2, pitch: -0.55, vol: true });
    await tab.evaluate(() => { const g = window.__game; if (!g.player.flying) g.player.toggleFly(); g.player.pos.y = g.world.terrainHeight(-1560, -2470) + 22; });
    await dormir(2500);
    return { monde: s + ' s', ...(await tab.evaluate(() => ({ vole: window.__game.player.flying }))) };
  } },
  // La forêt vue de haut (v553) : le paysage lointain au-delà des morceaux
  // maillés — ses arbres instanciés, et le bord du disque maillé où la revue
  // de la v532 avait vu un trou de ciel (relevé n° 19).
  { nom: 'foret-loin', async prep(tab) {
    const s = await poserEt(tab, { x: -1176, z: -1648, yaw: 0, pitch: -0.3, vol: true });
    await tab.evaluate(() => { const g = window.__game; if (!g.player.flying) g.player.toggleFly(); g.player.pos.y = g.world.terrainHeight(-1176, -1648) + 110; });
    await dormir(6000);
    return { monde: s + ' s', ...(await tab.evaluate(() => ({ vole: window.__game.player.flying, arbresLoin: window.__game.horizon.arb ? window.__game.horizon.arb.count : 0 }))) };
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
  // La tour Eiffel depuis le Champ-de-Mars (v575) : de nuit, le fer doré, le
  // phare et le scintillement (minuit, 0,75, tombe au début d'une heure du jeu).
  { nom: 'tour-eiffel', async prep(tab) {
    const p = await tab.evaluate(async () => {
      const { REPERES } = await import('./src/world.js');
      const lm = REPERES.find((l) => l.name === 'Tour Eiffel');
      return { x: lm.x, z: lm.z };
    });
    const s = await poserEt(tab, { x: p.x + 0.5, z: p.z + 70.5, yaw: 0, pitch: 0.42 });
    return { monde: s + ' s', ...(await tab.evaluate(() => (window.__nuitEiffel ? { ...window.__nuitEiffel.etat } : {}))) };
  } },
  // Et au pied, où le modèle en relief (la lueur du fer) prend le relais du squelette.
  { nom: 'tour-eiffel-pied', async prep(tab) {
    const p = await tab.evaluate(async () => {
      const { REPERES } = await import('./src/world.js');
      const lm = REPERES.find((l) => l.name === 'Tour Eiffel');
      return { x: lm.x, z: lm.z };
    });
    const s = await poserEt(tab, { x: p.x + 0.5, z: p.z + 12.5, yaw: 0, pitch: 0.95 });
    return { monde: s + ' s', ...(await tab.evaluate(() => (window.__nuitEiffel ? { ...window.__nuitEiffel.etat } : {}))) };
  } },
  // Les villes à bordures : une rue de Rome le long d'un circuit, depuis la
  // voie (le mobilier contre les façades), l'hôtel de ville de Los Angeles vu
  // de la rue, et la place de Shanghai vue du ciel (l'anneau qui la traverse).
  { nom: 'rome-rue', async prep(tab) {
    const p = await tab.evaluate(async () => {
      const VM = await import('./src/villesmonde.js');
      const t = VM.tracesCirculation(() => 33).find((q) => q.cle === 'rome');
      const a = t.pts[0], b = t.pts[1];
      const L = Math.hypot(b.x - a.x, b.z - a.z), m = Math.min(12, L / 3);
      return { x: a.x + (b.x - a.x) * m / L, z: a.z + (b.z - a.z) * m / L, yaw: Math.atan2(-(b.x - a.x), -(b.z - a.z)) };
    });
    const s = await poserEt(tab, { x: p.x - 0.5, z: p.z - 0.5, yaw: p.yaw, pitch: 0.0 });
    return { monde: s + ' s' };
  } },
  { nom: 'la-mairie', async prep(tab) {
    const p = await tab.evaluate(async () => {
      const VM = await import('./src/villesmonde.js');
      const f = VM.VILLES_MONDE.find((v) => v.cle === 'losangeles');
      const [du, dv] = f.local(34.0537, -118.2427);
      return { x: f.ancre.x + du, z: f.ancre.z + dv };
    });
    const s = await poserEt(tab, { x: p.x - 26, z: p.z + 18, yaw: Math.atan2(-26, 18), pitch: 0.42 });
    return { monde: s + ' s' };
  } },
  { nom: 'shanghai-place', async prep(tab) {
    const p = await tab.evaluate(async () => {
      const VM = await import('./src/villesmonde.js');
      const f = VM.VILLES_MONDE.find((v) => v.cle === 'shanghai');
      return { x: f.ancre.x, z: f.ancre.z, y: window.__game.world.terrainHeight(Math.floor(f.ancre.x), Math.floor(f.ancre.z)) + 45 };
    });
    const s = await poserEt(tab, { x: p.x, y: p.y, z: p.z + 40, yaw: 0, pitch: -0.9, vol: true });
    return { monde: s + ' s' };
  } },
  // Un guide au pied de son monument (v538) : Capucine sous la tour Eiffel,
  // vue à cinq blocs, face à elle — le corps, le fanion, ce qui l'entoure.
  { nom: 'guide', async prep(tab) {
    const { visiter } = require('./sonde-guides-villes.cjs');
    const r = await visiter(tab, 'eiffel');
    await tab.evaluate(() => {
      const g = window.__game, gd = window.__guidesVilles().nes.get('eiffel');
      // un poste D'OÙ L'ON VOIT (v292) : la ligne de vue jusqu'au guide est
      // libre à hauteur d'yeux, ni arbre ni mobilier entre les deux
      const libre = (x0, z0) => {
        for (let k = 0; k <= 20; k++) {
          const x = x0 + (gd.pos.x - x0) * k / 20, z = z0 + (gd.pos.z - z0) * k / 20;
          for (const dy of [0.5, 1.6, 2.6]) {
            if (g.world.getBlock(Math.floor(x), Math.floor(gd.pos.y + dy), Math.floor(z))) return false;
          }
        }
        return true;
      };
      let x = gd.pos.x + 5, z = gd.pos.z;
      for (let i = 0; i < 32; i++) {
        const a = i * Math.PI / 16, r = 4 + (i % 3);
        const cx = gd.pos.x + Math.cos(a) * r, cz = gd.pos.z + Math.sin(a) * r;
        if (libre(cx, cz)) { x = cx; z = cz; break; }
      }
      g.player.pos.set(x, gd.pos.y + 0.2, z);
      g.player.yaw = Math.atan2(-(gd.pos.x - x), -(gd.pos.z - z));
      g.player.pitch = 0.05;
    });
    // la présence (v241) le fait apparaître en fondu, au rythme des images :
    // on capture une fois pleinement là, borné, et l'on dit ce qu'on a lu
    const t0 = Date.now();
    let presence = 0;
    while (Date.now() - t0 < 30000) {
      presence = await tab.evaluate(() => window.__guidesVilles().nes.get('eiffel').presence?.valeur ?? 1);
      if (presence >= 0.999) break;
      await dormir(500);
    }
    await dormir(1500);
    return { ne: r.ne, regard: r.regard, visible: r.visible, presence, msPresence: Date.now() - t0 };
  } },
  { nom: 'minicarte', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    // toujours là depuis la v530 : on ne l'ouvre pas, on la regarde
    await dormir(2500);
    return tab.evaluate(() => ({ affichee: document.getElementById('minimap').style.display }));
  } },
  { nom: 'carte-monde', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    await tab.evaluate(() => {
      document.getElementById('minimap').click();
    });
    await tab.waitForFunction(() => window.__carte && window.__carte.ouverte, null, { timeout: 30000 });
    await dormir(4000);
    return { ouverte: true };
  } },
  // LE MOBILIER TOMBÉ (v536) : un réverbère et un feu de Paris renversés
  // comme une voiture lancée les renverse, vus du trottoir — la nuit, la
  // lanterne couchée ne doit plus éclairer la rue
  // LA POLICE ET LA MOTO (v562), sur la dalle de `sonde-police.cjs` : la
  // poursuite (une bêtise, la voiture de police dans le rétroviseur de la
  // caméra, la pilule des étoiles), puis le contrôle (la police garée DEVANT,
  // le policier à la portière), puis la moto penchée dans un virage.
  { nom: 'police-poursuite', async prep(tab) { return policeJusqua(tab, false); } },
  { nom: 'police-controle', async prep(tab) { return policeJusqua(tab, true); } },
  { nom: 'moto', async prep(tab) {
    const { dalle } = require('./sonde-police.cjs');
    // la dalle de la sonde (130) : sur 60, trois secondes de moto la faisaient
    // sortir de la dalle, et la capture était prise sous l'eau
    const y0 = await dalle(tab, 47000, 47000, 130);
    return tab.evaluate(async (y0) => {
      const g = window.__game, P = g.player, am = g.animalManager;
      const dodo = (ms) => new Promise((r) => setTimeout(r, ms));
      P.flying = false; P.yaw = 0; P.pos.set(47000.5, y0 + 1.2, 47040.5); P.vel.set(0, 0, 0);
      await dodo(800);
      const m = am.invoquer('moto', P.pos.x, P.pos.z - 2.5); m.yaw = Math.PI;
      const t0 = performance.now();
      while (performance.now() - t0 < 20000 && !m.mesh.userData.modele) await dodo(200);
      for (let i = 0; i < 6 && !(g.fun.montureConduite && g.fun.montureConduite()); i++) { document.getElementById('ride-btn').click(); await dodo(600); }
      P.touchMove.f = 1; await dodo(1500); P.touchMove.s = -1; await dodo(1600);
      return { enSelle: !!(g.fun.montureConduite && g.fun.montureConduite()), modele: !!m.mesh.userData.modele,
        surLaDalle: Math.abs(P.pos.x - 47000) < 128 && Math.abs(P.pos.z - 47000) < 128 && P.pos.y > y0,
        pos: [+P.pos.x.toFixed(1), +P.pos.y.toFixed(1), +P.pos.z.toFixed(1)], y0 };
    }, y0);
  } },
  { nom: 'mobilier-tombe', async prep(tab) {
    const p = await tab.evaluate(async () => {
      const { adresseParis } = await import('./src/paris.js');
      const [x, z] = adresseParis(-0.8, -0.9);
      return { x, z };
    });
    await poserEt(tab, { x: p.x, z: p.z });
    const r = await tab.evaluate(async (p) => {
      const g = window.__game, w = g.world;
      const { RUE } = await import('./src/blocks.js');
      const pieces = [];
      for (let d = 0; d < 50 && pieces.length < 2; d++) for (let dx = -d; dx <= d; dx++) for (let dz = -d; dz <= d; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== d) continue;
        const x = p.x + dx, z = p.z + dz, y = w.sommetColonne(x, z) + 1;
        const id = w.getBlock(x, y, z);
        if ((id === RUE.REVERBERE && !pieces.some((q) => q.id === id)) || (id === RUE.FEUX && !pieces.some((q) => q.id === id))) {
          const cle = `${x},${y},${z}`;
          if (!w.edits.has(cle) && g.mobilierCasse.piece(cle)) pieces.push({ x, y, z, id, cle });
        }
      }
      if (!pieces.length) return { pieces: 0 };
      for (const q of pieces) g.mobilierCasse.casses.casser(q.cle, { t: performance.now() - 2000, x: q.x + 0.5, z: q.z + 0.5, dx: 1, dz: 0, facon: 'tombe' });
      const q = pieces[0];
      g.player.pos.set(q.x - 4.5, w.sommetColonne(q.x - 5, q.z + 4) + 1.01, q.z + 4.5);
      g.player.yaw = Math.atan2(-(q.x + 1 - g.player.pos.x), -(q.z + 0.5 - g.player.pos.z));
      g.player.pitch = -0.25;
      return { pieces: pieces.map((q) => q.id === RUE.FEUX ? 'feu' : 'réverbère') };
    }, p);
    await attendreMonde(tab);
    return r;
  } },
  // Une voiture garée vue de trois quarts avant, à six blocs (v545) : avec
  // `--params=&voiture=911` c'est la 911, et `&asset=0` rend l'ancienne.
  { nom: 'voiture-trois-quarts', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw, pitch: -0.12 });
    return tab.evaluate(async () => {
      const g = window.__game;
      const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
      const y = g.player.yaw;
      const a = g.animalManager.invoquer('voiture', g.player.pos.x - Math.sin(y) * 6, g.player.pos.z - Math.cos(y) * 6);
      const t0 = performance.now();
      while (performance.now() - t0 < 20000 && !(a && a.mesh.userData.modele)) await tenir(0.3);
      if (a) a.yaw = y + 0.75;   // le nez vers la caméra, de trois quarts
      await tenir(1);
      return { modele: a && a.mesh.userData.flotte };
    });
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
  // Au volant dans une rue de Paris (les rues à la GTA) : la chaussée vue de la
  // place du conducteur, là où la voiture devait tenir dans sa voie.
  // LA VOITURE TOMBE DANS L'EAU (v560) : un port fabriqué au-dessus du relief
  // (le même que le témoin de monte.js), pleins gaz vers le bassin. On capture
  // la voiture dans l'eau (« voiture-plonge »), puis l'enfant remonté à la
  // surface, la voiture au fond (« voiture-coulee »).
  { nom: 'voiture-plonge', prep: (tab) => portEtPlongee(tab, false),
    apres: (tab) => tab.evaluate(() => window.__game.player.keys.clear()) },
  { nom: 'voiture-coulee', prep: (tab) => portEtPlongee(tab, true),
    apres: (tab) => tab.evaluate(() => window.__game.player.keys.clear()) },
  { nom: 'volant-ville', async prep(tab) {
    const p = await tab.evaluate(async () => {
      const { adresseParis } = await import('./src/paris.js');
      const [x, z] = adresseParis(-0.8, -0.9);
      return { x, z };
    });
    await poserEt(tab, { x: p.x, z: p.z, yaw: Math.PI / 2, pitch: 0.02 });
    return monterEnVoiture(tab);
  } },
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
  { nom: 'voiture-projetee', async prep(tab) {
    // LA VRAIE PHYSIQUE (v567) : dans Paris, au volant, on se pose douze blocs
    // derrière une voiture de la rue, dans son axe, et l'on fonce dedans à 25
    // blocs/s. Elle sort de la rue, projetée ; la capture la montre devant
    // nous, la file derrière elle arrêtée.
    const p = await tab.evaluate(async () => {
      const { adresseParis } = await import('./src/paris.js');
      const [x, z] = adresseParis(-0.8, -0.9); return { x, z };
    });
    await poserEt(tab, { x: p.x, z: p.z, yaw: Math.PI / 2 });
    const r = await monterEnVoiture(tab);
    await dormir(4000);
    const choc = await tab.evaluate(async () => {
      const g = window.__game, P = g.player, v = g.vehicules;
      const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
      // LA VOITURE VISÉE SE RELÈVE, ELLE NE SE DEVINE PAS : son cap publié
      // suit la convention du maillage, et une rue tourne — se poser « douze
      // blocs derrière » en ligne droite tombait dans la cour du Louvre. On la
      // suit une seconde, puis l'on se pose là où ELLE ÉTAIT (sur la chaussée
      // par construction), dans le sens où elle roule, et l'on fonce dedans.
      // UNE VOITURE ARRÊTÉE (un feu, une file), comme le témoin de monte.js :
      // sur le banc la rue roule en temps RÉEL et la nôtre en temps de JEU, à
      // quelques images par seconde — une voiture qui roule ne se rattrape
      // pas (v397). Son cap publié (rotation − π) est celui de son nez dans
      // la convention du joueur : on se pose dix blocs derrière, dans son
      // axe, et l'on fonce. Trois essais au plus, la plus proche d'abord.
      const releve = () => {
        const m = new Map();
        v.etat().forEach((c, ci) => {
          if (!c.routier || c.nom !== 'voiture') return;
          for (const q of c.places) m.set(ci + '#' + q[3], q);
        });
        return m;
      };
      const r0 = releve();
      await tenir(1.2);
      const r1 = releve();
      // Il n'y en a souvent aucune à l'arrêt : on PROVOQUE l'arrêt. La rue
      // attend sans limite devant l'enfant (v245) : on se pose, immobile, sur
      // le trajet d'une voiture qui roule — vingt blocs devant elle, dans
      // l'axe de son déplacement relevé, face à elle. Elle s'arrête devant
      // nous ; alors on fonce dedans.
      const roulent = [];
      for (const [k, q0] of r0) {
        const q1 = r1.get(k); if (!q1) continue;
        const dx = q1[0] - q0[0], dz = q1[1] - q0[1], l = Math.hypot(dx, dz);
        const d = Math.hypot(q1[0] - P.pos.x, q1[1] - P.pos.z);
        if (l > 4 && l < 30 && d < 150) roulent.push({ k, q: q1, ux: dx / l, uz: dz / l, d });
      }
      roulent.sort((a, b) => a.d - b.d);
      if (!roulent.length) return { err: 'aucune voiture de la rue ne roule en vue', vues: r0.size };
      const a = g.fun.montureConduite();
      const n0 = g.fun.projetees();
      let essais = 0, dm = 0, arret = null; const trace = [];
      const t0 = performance.now();
      for (const { k, q, ux, uz } of roulent.slice(0, 3)) {
        essais++;
        a.pos.set(q[0] + ux * 20, a.pos.y, q[1] + uz * 20); a.mesh.position.copy(a.pos);
        P.pos.copy(a.pos); P.yaw = Math.atan2(ux, uz); P.pitch = -0.08; P.vitesseVoiture = 0; P.vel.set(0, 0, 0);
        // elle s'arrête devant nous (huit secondes au plus)
        let prec = null; arret = null;
        const ta = performance.now();
        while (performance.now() - ta < 8000) {
          await tenir(0.3);
          const qn = releve().get(k); if (!qn) break;
          if (prec && Math.hypot(qn[0] - prec[0], qn[1] - prec[1]) < 0.05) { arret = qn; break; }
          prec = qn;
        }
        if (!arret) continue;
        dm = Math.hypot(arret[0] - P.pos.x, arret[1] - P.pos.z);
        P.vitesseVoiture = 22; P.vel.set(-Math.sin(P.yaw) * 22, 0, -Math.cos(P.yaw) * 22); P.touchMove.f = 1;
        const x1 = P.pos.x, z1 = P.pos.z, c1 = P.chocs || 0;
        const t1 = performance.now();
        while (performance.now() - t1 < 20000 && g.fun.projetees() === n0) await tenir(0.05);
        P.touchMove.f = 0;
        trace.push({ arret: +dm.toFixed(1), roule: +Math.hypot(P.pos.x - x1, P.pos.z - z1).toFixed(1), chocs: (P.chocs || 0) - c1,
          contact: P.contact && P.contact.famille, force: P.choc && +(P.choc.force || 0).toFixed(2), v: +(P.vitesseVoiture || 0).toFixed(1) });
        if (g.fun.projetees() > n0) break;
      }
      await tenir(0.6);
      return { a: +dm.toFixed(1), essais, trace, projetees: g.fun.projetees() - n0, ms: Math.round(performance.now() - t0) };
    });
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
  // v582 : l'avion à son toit (1 500 en « Loin », ~380 en « Normal ») — ce
  // que le brouillard laisse voir du sol, et le bout du paysage lointain caché
  { nom: 'avion-haut', async prep(tab, ctx) {
    await poserEt(tab, { x: ctx.depart.x, z: ctx.depart.z, yaw: ctx.depart.yaw });
    const r = await monterEnAvion(tab);
    const toit = await tab.evaluate(() => {
      const P = window.__game.player;
      P.pos.y = (P.plafondAvion || 158) - 5; P.vitesseAvion = P.pilote ? P.pilote.max * 0.8 : 0;
      P.avionEnVol = true; P.avionEtat = 'vol'; P.trainVoulu = false; P.pitch = -0.35;
      return Math.round(P.plafondAvion || 158);
    });
    await attendreMonde(tab, 15000);
    return { ...r, toit, brouillard: await tab.evaluate(() => [Math.round(window.__game.scene.fog.near), Math.round(window.__game.scene.fog.far)]) };
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
    // Orly est un aéroport de ville : son poste porte le jet privé (v565)
    const r = await monterEnAvion(tab, 'avionligne', { variante: 'jet' });
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

// Un quai de pierre puis un bassin, la berline au bord, l'enfant au volant,
// pleins gaz vers l'eau. `jusquAuBout` : on attend que l'enfant soit sorti et
// remonté (la voiture au fond) ; sinon, que la voiture soit dans l'eau.
async function portEtPlongee(tab, jusquAuBout) {
  return tab.evaluate(async (fin) => {
    const g = window.__game;
    const { BLOCK } = await import('./src/blocks.js');
    const tenir = (n) => new Promise((f) => setTimeout(f, n));
    const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
    for (let e = 0; e < 6 && auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(400); }
    for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
    g.animalManager.animals.length = 0;
    g.player.keys.clear(); g.player.flying = false; g.player.pilote = null;
    const x0 = 31200, z0 = 31500, W = 10, QUAI = 12;
    let y0 = 0;
    for (let d = -8; d <= 44; d += 4) for (let w = -W; w <= W; w += 4) y0 = Math.max(y0, g.world.terrainHeight(x0 + d, z0 + w));
    y0 += 2;
    const surface = y0 - 1, fond = y0 - 5;
    for (let d = -8; d <= 44; d++) for (let w = -W; w <= W; w++) {
      if (d <= QUAI) for (let y = fond; y <= y0; y++) g.world.setBlock(x0 + d, y, z0 + w, BLOCK.STONE);
      else {
        g.world.setBlock(x0 + d, fond, z0 + w, BLOCK.STONE);
        for (let y = fond + 1; y <= surface; y++) g.world.setBlock(x0 + d, y, z0 + w, BLOCK.WATER);
        g.world.setBlock(x0 + d, y0, z0 + w, 0);
      }
      for (let h = 1; h <= 8; h++) if (g.world.getBlock(x0 + d, y0 + h, z0 + w) !== 0) g.world.setBlock(x0 + d, y0 + h, z0 + w, 0);
    }
    g.player.yaw = -Math.PI / 2; g.player.pitch = -0.1;
    g.player.pos.set(x0, y0 + 1.01, z0 + 0.5); g.player.vel.set(0, 0, 0);
    await tenir(1500);
    g.animalManager.invoquer('voiture', x0 + 3, z0, false, { flotte: 'berline-citadine' });
    await tenir(1000);
    for (let e = 0; e < 8 && !auVolant(); e++) { document.getElementById('ride-btn').click(); await tenir(500); }
    if (!auVolant()) return { err: 'pas monté' };
    g.player.keys.add('KeyW');
    const t0 = performance.now();
    if (!fin) {
      while (performance.now() - t0 < 40000 && !(g.player.pos.x - x0 > QUAI + 3 && g.player.pos.y < y0)) await tenir(100);
      return { d: +(g.player.pos.x - x0).toFixed(1), y: +g.player.pos.y.toFixed(1), surface, ms: Math.round(performance.now() - t0) };
    }
    while (performance.now() - t0 < 60000 && auVolant()) await tenir(200);
    g.player.keys.clear();
    const t1 = performance.now();
    while (performance.now() - t1 < 20000 && g.player.pos.y < surface - 1.2) await tenir(200);
    await tenir(1500);
    g.player.pitch = -0.35;
    return { auVolant: auVolant(), y: +g.player.pos.y.toFixed(1), surface, ms: Math.round(performance.now() - t0) };
  }, jusquAuBout);
}

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

async function monterEnAvion(tab, espece = 'avionligne', voeu = null) {
  return tab.evaluate(async ({ espece, voeu }) => {
    const g = window.__game;
    const tenir = (n) => new Promise((f) => setTimeout(f, n * 1000));
    for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
    g.animalManager.animals.length = 0;
    const d = { x: -Math.sin(g.player.yaw), z: -Math.cos(g.player.yaw) };
    g.animalManager.invoquer(espece, Math.round(g.player.pos.x + d.x * 3), Math.round(g.player.pos.z + d.z * 3), false, voeu);
    for (let e = 0; e < 8 && !g.player.pilote; e++) { document.getElementById('ride-btn').click(); await tenir(0.6); }
    await tenir(1.5);
    return { pilote: !!g.player.pilote };
  }, { espece, voeu });
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
      // `--params=&loin=10240` ajoute des paramètres d'adresse ; `--rr=12` change la
      // distance d'affichage (v532 : « Normal » contre « Loin », même page).
      const params = '&ombres=1&hd=3' + ((opt('params') || []).join(','));
      const rr = Number((opt('rr') || [])[0]) || 9;
      // l'accueil se capture AVANT « Jouer » : une page à elle
      if (!filtreEtats || filtreEtats.includes('accueil')) {
        const p0 = await banc.joueur('Accueil' + vue, { tactile: true, viewport, rr, params, prep: 1 });
        await dormir(12000);
        await prendre(p0, `${vue}-accueil`);
        await p0.close().catch(() => {});
      }
      const tab = await banc.jouerSeul('Revue' + vue, { tactile: true, viewport, rr, params, pret: true });
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
          // Ce que la scène porte au loin (v532) : brouillard, plan lointain, couronnes.
          const loin = await tab.evaluate(() => {
            const g = window.__game;
            return { brouillard: Math.round(g.scene.fog.far), planLointain: Math.round(g.camera.far),
              couronnes: ['horizon-loin', 'horizon-tres-loin'].filter((n) => g.scene.getObjectByName(n)) };
          }).catch(() => null);
          noter(`  loin ${JSON.stringify(loin)}`);
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
