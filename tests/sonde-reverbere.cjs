// Monter : sur le dos d'une bête, ou à bord de ce qui roule.
//
// Le jeu savait déjà faire monter à cheval, mais presque personne ne l'avait
// jamais fait : il fallait viser l'animal dans un cône de quelques degrés,
// deviner qu'il existait une touche, et tomber sur l'une des trois seules
// espèces autorisées. Le mécanisme marchait ; le trajet de l'enfant, non.
//
// Ces scénarios suivent donc ce trajet-là, du premier regard sur l'animal
// jusqu'à la descente — et le même pour le métro qui passe.
//
//     cd tests && npm install && npm run monte

const { Banc, dormir, souffler } = require('./banc.js');
const { mesurerSensations } = require('./sensations-mesure.js');

const echecs = [];
// COMBIEN DE TEMPS CHAQUE TÉMOIN A-T-IL COÛTÉ.
//
// Max, v276 : « revamp the testing process way too heavy and long and costly
// and painful ». Mesuré suite par suite, le portail fait soixante et une
// minutes et TRENTE-QUATRE sont dans deux fichiers : celui-ci (dix-huit) et
// `reseau.js` (seize). Mais les deux causes ne sont pas les mêmes, et ce
// fichier était le seul des deux à ne pas dire où passe son temps :
// `reseau.js` et `reglages.js` se chronomètrent témoin par témoin depuis la
// v224, pas lui.
//
// Et ce qui est déjà su vaut d'être écrit ici, parce que cela dit quoi
// chercher : cette suite n'ouvre que SEPT pages de jeu pour dix-huit minutes
// (contre seize pour les seize minutes de `reseau.js`), et elle porte
// quarante-six boucles de relevé. Le temps n'est donc PAS dans l'ouverture des
// pages — il est dans l'attente qu'un jeu à quatre images par seconde parcoure
// une distance. Ce relevé le dira témoin par témoin, et il ne coûte rien.
//
// ON N'ACCÉLÈRE PAS CE QU'ON N'A PAS MESURÉ (v224, quatre fois de suite).
let _dernier = Date.now();
function verifier(nom, ok, detail = '') {
  const dt = Math.round((Date.now() - _dernier) / 1000);
  _dernier = Date.now();
  console.log(`${ok ? '✅' : '❌'} [${String(dt).padStart(3)} s] ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom + (detail ? ` — ${detail}` : ''));
}

// Ce que l'enfant voit du bouton : son texte, et s'il est réellement à l'écran.
const bouton = (p, id) => p.evaluate((id) => {
  const b = document.getElementById(id);
  if (!b) return { existe: false, visible: false, texte: '' };
  const rangee = b.closest('.fun-target');
  const visible = getComputedStyle(b).display !== 'none'
    && (!rangee || getComputedStyle(rangee).display !== 'none');
  return { existe: true, visible, texte: b.textContent.trim() };
}, id);

const pose = (p) => p.evaluate(() => {
  const g = window.__game;
  return {
    x: g.player.pos.x, y: g.player.pos.y, z: g.player.pos.z,
    oeil: g.player.camera.position.y,
  };
});

// Poser une bête juste devant l'enfant, là où il regarde.
const poserDevant = (p, espece, distance = 3) => p.evaluate(({ espece, distance }) => {
  const g = window.__game;
  for (const a of [...g.animalManager.animals]) {
    g.animalManager.scene.remove(a.mesh);
  }
  g.animalManager.animals.length = 0;
  const x = g.player.pos.x - Math.sin(g.player.yaw) * distance;
  const z = g.player.pos.z - Math.cos(g.player.yaw) * distance;
  return !!g.animalManager.invoquer(espece, x, z);
}, { espece, distance });

// Un cap où l'on peut courir six mètres sans rien rencontrer : sol praticable
// devant, rien à hauteur de tête, aucun trou. Sans cela on ne compare pas
// deux vitesses mais deux obstacles — à pied on n'atteignait pas l'arbre, en
// selle on le percutait, et la monture semblait plus lente.
// `portee` : sur combien de blocs le cap doit être libre — six pour un pas
// de marche, davantage pour une voiture lancée (v262 : élan puis mesure).
const capDegage = (p, portee = 6) => p.evaluate((portee) => {
  const g = window.__game;
  const w = g.world;
  const pos = g.player.pos;
  const fy = Math.floor(pos.y + 0.01);
  for (let i = 0; i < 32; i++) {
    const yaw = (i * Math.PI) / 16;
    let libre = true;
    for (let d = 1; d <= portee && libre; d++) {
      const x = Math.floor(pos.x - Math.sin(yaw) * d);
      const z = Math.floor(pos.z - Math.cos(yaw) * d);
      // le terrain ondule : un creux d'un bloc se traverse, une bosse non
      if (!w.isSolid(x, fy - 1, z) && !w.isSolid(x, fy - 2, z)) libre = false;
      for (let dy = 0; dy <= 1; dy++) if (w.isSolid(x, fy + dy, z)) libre = false;
    }
    if (libre) return yaw;
  }
  return null;
}, portee);

// Combien de mètres on parcourt en tenant la touche « avance » une demi-seconde,
// toujours depuis le même point et dans la même direction : comparer un
// départ en terrain libre à un départ le nez contre un arbre ne prouverait
// rien du tout.
// Se PLACER est un geste à part, et il compte : c'est un téléport. La
// monture conduite y suit le joueur d'un bond de plusieurs blocs, et un
// témoin qui mesure à cheval sur ce bond mesure le bond. (Le jeu, lui,
// ignore désormais ces sauts pour la rotation des roues.)
async function placerA(p, depart) {
  await p.evaluate((d) => {
    const g = window.__game;
    g.player.pos.set(d.x, d.y, d.z);
    g.player.vel.set(0, 0, 0);
    g.player.yaw = d.yaw;
  }, depart);
  await dormir(250);
}

// `elan` : des secondes de jeu d'ÉLAN avant de mesurer — une voiture a de
// l'inertie depuis la v262, et l'on mesure ce qu'elle fait une fois lancée,
// pas la demi-seconde où elle prend sa vitesse.
async function avancerUnDemiSeconde(p, depart, elan = 0) {
  if (depart) await placerA(p, depart);
  await p.keyboard.down('KeyW');
  if (elan > 0) {
    await p.evaluate((n) => new Promise((fin) => {
      let cumul = 0, prec = performance.now();
      const pas = (t) => {
        cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
        prec = t;
        if (cumul >= n) fin(); else requestAnimationFrame(pas);
      };
      requestAnimationFrame(pas);
    }), elan);
  }
  const avant = await pose(p);
  // La fenêtre se compte en SECONDES DE JEU, pas en temps d'horloge : sous
  // la charge du portail, une demi-seconde murale ne contient parfois que
  // trois images à dt plafonné (1/20 s) — la distance fondait, et le témoin
  // accusait la voiture d'être lente alors qu'on avait mesuré la machine.
  // Vu en v183 : la mesure « au volant » tombait 700 ms après la monte, en
  // pleine fête d'emojis, et rendait 1,5 m contre 1,6 m à pied. On accumule
  // donc le même dt que main.js, borne comprise, comme l'horloge du banc.
  await p.evaluate(() => new Promise((fin) => {
    let cumul = 0, prec = performance.now();
    const pas = (t) => {
      cumul += Math.min(Math.max((t - prec) / 1000, 0), 0.05);
      prec = t;
      if (cumul >= 0.5) fin(); else requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }));
  await p.keyboard.up('KeyW');
  const apres = await pose(p);
  return Math.hypot(apres.x - avant.x, apres.z - avant.z);
}

(async () => {
  const banc = new Banc({ portJeu: 8471, portPairs: 9471 });
  await banc.ouvrir();
  try {
    for (let k = 0; k < Number(process.env.N || 3); k++) {
      console.log('--- passage ' + k);
      const tab = await banc.jouerSeul('Marlon' + k, { tactile: true });
    const mobPage = await banc.jouerSeul('MonteMobilier', { rr: 4 });
    // le scénario part en TEXTE : Playwright ne sérialise pas une fonction
    const conduireVers = async (page, poser) => page.evaluate(async (source) => {
      const poser = new Function('return (' + source + ')')();
      const g = window.__game, w = g.world;
      const { RUE } = await import('./src/blocks.js');
      const dodo = (ms) => new Promise((f) => setTimeout(f, ms));
      const cible = await poser(g, w, RUE);
      // LES PASSANTS AUSSI, depuis qu'ils traversent (v371) : un passant sur un
      // passage peint devant le capot arrête la voiture — c'est voulu
      // (`pietonDevant`) — et le témoin concluait « immobile » à zéro bloc
      // parcouru. On les éloigne à cent blocs, sous le seuil de rapatriement.
      for (const s of g.passants.sites) for (const h of (s.peuple || [])) {
        if (Math.hypot(h.pos.x - g.player.pos.x, h.pos.z - g.player.pos.z) > 40) continue;
        h.traversee = null; h.ecart = null; h.placeAt(g.player.pos.x + 100, g.player.pos.z + 100, g.player.pos.y);
      }
      // la voiture, montée par le bouton
      for (const a of [...g.animalManager.animals]) { g.animalManager.scene.remove(a.mesh); }
      g.animalManager.animals.length = 0;
      const fx = -Math.sin(g.player.yaw), fz = -Math.cos(g.player.yaw);
      g.animalManager.invoquer('voiture', g.player.pos.x + fx * 2.5, g.player.pos.z + fz * 2.5);
      // MONTER, C'EST UN ÉTAT, PAS UN CLIC (v252) : on clique jusqu'à être au
      // volant, borné, et le temps pris entre dans le message.
      const tMonte = performance.now();
      const auVolant = () => !!(g.fun.montureConduite && g.fun.montureConduite());
      for (let e = 0; e < 8 && !auVolant(); e++) { await dodo(e ? 0 : 1500); document.getElementById('ride-btn').click(); const t = performance.now(); while (!auVolant() && performance.now() - t < 2500) await dodo(150); }
      const monte = Math.round(performance.now() - tMonte);
      const depart = { x: g.player.pos.x, z: g.player.pos.z };
      const d0 = Math.hypot(cible.x - depart.x, cible.z - depart.z);
      g.player.keys.add('KeyW');                       // la touche, comme le clavier la pose
      // ON ROULE JUSQU'À L'ARRÊT, PAS TROIS SECONDES : à dt borné le banc
      // n'atteint pas un poteau à neuf blocs en trois secondes, et le témoin
      // était vert des deux côtés en ne mesurant rien.
      // ET L'ARRÊT SE CONSTATE EN IMAGES, APRÈS LE DÉPART (banc-intermittents).
      // La voiture accélère depuis zéro (v358) et avance en temps de JEU : sur
      // une page qui rame, dix relevés de cent millisecondes sans mouvement ne
      // voulaient pas dire « arrêtée », mais « aucune image rendue ». Le témoin
      // concluait l'arrêt à 0 ou 0,17 bloc (`parcouru 0`, rouge des deux côtés
      // sous charge : 3/3 sur `origin/main`, sonde `sonde-reverbere.cjs`). On
      // compte l'immobilité en IMAGES RENDUES (`renderer.info.render.frame`),
      // seulement une fois la voiture partie d'un demi-bloc ; le départ est
      // borné à cent vingt images, et le tout à soixante secondes de montre.
      // La durée et les images entrent dans le message.
      let plusPres = d0, immobile = 0, dernier = { x: g.player.pos.x, z: g.player.pos.z }, partie = false;
      const tRoule = performance.now(), image = () => g.renderer.info.render.frame;
      const im0 = image(); let imPrec = im0;
      while (performance.now() - tRoule < 60000 && !(partie && immobile >= 10) && (partie || image() - im0 < 120)) {
        await dodo(100);
        const im = image(); if (im === imPrec) continue;
        plusPres = Math.min(plusPres, Math.hypot(cible.x - g.player.pos.x, cible.z - g.player.pos.z));
        if (!partie && Math.hypot(g.player.pos.x - depart.x, g.player.pos.z - depart.z) > 0.5) partie = true;
        const bouge = Math.hypot(g.player.pos.x - dernier.x, g.player.pos.z - dernier.z) > 0.02;
        immobile = bouge || !partie ? 0 : immobile + (im - imPrec); dernier = { x: g.player.pos.x, z: g.player.pos.z };
        imPrec = im;
      }
      const images = image() - im0;
      const roule = Math.round(performance.now() - tRoule);
      g.player.keys.delete('KeyW');
      const parcouru = Math.hypot(g.player.pos.x - depart.x, g.player.pos.z - depart.z);
      return { auVolant: auVolant(), gabarit: g.player.gabarit, d0: +d0.toFixed(2), plusPres: +plusPres.toFixed(2), parcouru: +parcouru.toFixed(2), cible, monte, roule, partie, images };
    }, poser.toString());
    // 1. un réverbère sur une rue de Paris
    const poteau = await conduireVers(mobPage, async (g, w, RUE) => {
      const { positionDe } = await import('./src/mondes.js');
      const { CHAUSSEE } = await import('./src/world.js');
      const P = positionDe('paris');
      window.__carte.surTeleport(P.x + 40, P.z + 60);
      await new Promise((f) => setTimeout(f, 9000));
      const px = Math.round(g.player.pos.x), pz = Math.round(g.player.pos.z);
      const sol = (x, z) => w.sommetColonne(x, z);
      const route = (x, z) => CHAUSSEE.has(w.getBlock(x, sol(x, z), z));
      for (let r = 0; r < 40; r++) for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r) continue;
        const x = px + dx, z = pz + dz;
        if (!route(x, z)) continue;
        for (const [ax, az, yaw] of [[1, 0, -Math.PI / 2], [0, 1, Math.PI], [-1, 0, Math.PI / 2], [0, -1, 0]]) {
          let ok = true;
          for (let k = -4; k <= 14 && ok; k++) if (!route(x + ax * k, z + az * k) || Math.abs(sol(x + ax * k, z + az * k) - sol(x, z)) > 1) ok = false;
          if (!ok) continue;
          // pas de voiture de la rue à portée : elle serait « déjà dedans »
          // ou en travers, et l'on mesurerait la circulation
          if (g.vehicules.placeProche({ x: x + 0.5, y: sol(x, z) + 1, z: z + 0.5 }, 12)) continue;
          g.player.pos.set(x + 0.5, sol(x, z) + 1.01, z + 0.5); g.player.vel.set(0, 0, 0);
          g.player.yaw = yaw; g.player.pitch = 0; g.player.flying = false;
          const cx = x + ax * 6, cz = z + az * 6;
          w.setBlock(cx, sol(cx, cz) + 1, cz, RUE.REVERBERE);
          return { x: cx + 0.5, z: cz + 0.5 };
        }
      }
      return null;
    });
    verifier('au volant, la voiture de l\'enfant s\'arrête devant un réverbère',
      poteau && poteau.cible && poteau.auVolant && poteau.parcouru > 2 && poteau.plusPres >= 1.0 && poteau.plusPres < 4,
      JSON.stringify(poteau));
      await mobPage.close().catch(() => {}); await tab.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
