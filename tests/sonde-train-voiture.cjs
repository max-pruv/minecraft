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
  const banc = new Banc({ portJeu: 8472, portPairs: 9472 });
  await banc.ouvrir();
  try {
    for (let k = 0; k < Number(process.env.N || 3); k++) {
      console.log('--- passage ' + k);
      const tab = await banc.jouerSeul('Marlon' + k, { tactile: true });
    // --- le train ne passe pas au travers de la voiture de l'enfant (v304) ---
    //
    // Max, trois captures d'iPhone : sa voiture garée sur la voie ferrée, et
    // le train qui la traverse — l'intérieur noir de la rame plein l'écran
    // quand la caméra se retrouve dedans. Les trains ne cédaient à personne
    // (`routier` faux). Le témoin SE PLACE (v279) : il vide les bêtes, pose une
    // voiture, monte, et se téléporte sur la voie d'un train de SURFACE, trente
    // blocs devant sa motrice ; puis il relève, vingt secondes au plus, si une
    // voiture de la rame touche la sienne (rectangles orientés), et si la rame
    // s'est bien approchée — un train qui n'est jamais venu ne prouve rien.
    await tab.evaluate(() => {
      const g = window.__game;
      for (const a of [...g.animalManager.animals]) g.animalManager.scene.remove(a.mesh);
      g.animalManager.animals.length = 0;
    });
    await poserDevant(tab, 'voiture');
    await dormir(700);
    await tab.evaluate(() => document.getElementById('ride-btn').click());
    await dormir(700);
    const surLaVoie = await tab.evaluate(async () => {
      const g = window.__game, V = window.__vehicules;
      const etat = V.etat();
      // LA HAUTEUR SE DEMANDE AU TRACÉ, PAS À LA PREMIÈRE VOITURE (v306).
      // `etat().y` lit `elements[0]`, qui n'est fabriquée qu'à portée de
      // l'enfant (v235) : le témoin d'avant le laisse à Washington, loin de
      // toute ligne, et chaque train rendait y = 0 — « aucun train de
      // surface » sur un réseau de neuf lignes.
      const ci = etat.findIndex((c, i) => /^train /.test(c.nom) && c.attente === 0
        && (V.point(i, 0) || { y: 0 }).y > 20);
      if (ci < 0) return { err: 'aucun train de surface' };
      // HUIT SECONDES DE VOIE, PAS TRENTE BLOCS (banc-intermittents). La rame
      // roule en temps RÉEL (v305) et l'arrivée d'une téléportation rend des
      // images d'une seconde et plus : à trente blocs, un Eurostar à quinze
      // blocs par seconde était sur la voiture en deux images, avant que la
      // rue ne l'ait vue — et « pas si l'on est déjà dedans » (v245) le
      // laissait passer au travers (12 relevés « dedans »). Le témoin se pose
      // à huit secondes de la motrice, le temps que la page reprenne son
      // souffle, et la fenêtre de relevé suit (trente secondes au plus).
      const vit = Math.max(8, etat[ci].vitesse || 15);
      const avance = Math.round(Math.min(160, Math.max(30, vit * 8)));
      const pt = V.point(ci, avance);
      if (!g.fun.montureConduite || !g.fun.montureConduite()) return { err: 'pas au volant' };
      g.player.flying = false;
      g.player.pos.set(pt.x, pt.y - 1.1 + 0.2, pt.z);
      g.player.vel.set(0, 0, 0);
      g.player.yaw = -pt.cap + Math.PI / 2;           // en travers de la voie, comme sur la capture
      const DL = 3.7, DW = 0.9, dlJ = 2.2, dwJ = 1.13;
      const rect = (x, z, cap, dl, dw) => {
        const ux = Math.sin(cap), uz = Math.cos(cap), vx = uz, vz = -ux;
        return [[x + ux * dl + vx * dw, z + uz * dl + vz * dw], [x + ux * dl - vx * dw, z + uz * dl - vz * dw],
          [x - ux * dl - vx * dw, z - uz * dl - vz * dw], [x - ux * dl + vx * dw, z - uz * dl + vz * dw]];
      };
      const touche = (P, Q) => {
        for (const R of [P, Q]) for (let k = 0; k < 4; k++) {
          const ax = -(R[(k + 1) % 4][1] - R[k][1]), az = R[(k + 1) % 4][0] - R[k][0];
          let p0 = Infinity, p1 = -Infinity, q0 = Infinity, q1 = -Infinity;
          for (let j = 0; j < 4; j++) {
            const a = P[j][0] * ax + P[j][1] * az, b = Q[j][0] * ax + Q[j][1] * az;
            p0 = Math.min(p0, a); p1 = Math.max(p1, a); q0 = Math.min(q0, b); q1 = Math.max(q1, b);
          }
          if (p1 < q0 || q1 < p0) return false;
        }
        return true;
      };
      window.__premierDedans = null; window.__depart = { py: +g.player.pos.y.toFixed(2), ty: +pt.y.toFixed(2) };
      const t0 = performance.now();
      let releves = 0, dedans = 0, bloque = 0, plusPres = Infinity;
      while (performance.now() - t0 < 30000) {
        await new Promise((r) => setTimeout(r, 250));
        const c = V.etat()[ci];
        const p = g.player.pos, moi = rect(p.x, p.z, g.player.yaw + Math.PI, dlJ, dwJ);
        releves++;
        if (c.bloque) bloque++;
        let ici = false;
        for (const [x, z, cap] of c.places) {
          plusPres = Math.min(plusPres, Math.hypot(x - p.x, z - p.z));
          if (touche(rect(x, z, cap, DL, DW), moi)) ici = true;
        }
        if (ici) dedans++;
        if (ici && !window.__premierDedans) {
          const d = V.diagCeder ? V.diagCeder() : [];
          const tete = V.point(ci, 0);
          window.__premierDedans = { py: +p.y.toFixed(2), teteY: tete ? +tete.y.toFixed(2) : null, vol: !!g.player.flying,
            auVolant: !!(g.fun.montureConduite && g.fun.montureConduite()),
            enfantVu: d.filter((a) => a.enfant).map((a) => [a.x, a.z]), trainVeut: d.filter((a) => a.nom && a.nom.startsWith(c.cle)).map((a) => a.veut).slice(0, 3),
            depart: window.__depart };
        }
        if (bloque > 12) break;                       // arrêté devant nous trois secondes : acquis
      }
      return { ci, nom: V.etat()[ci].nom, avance, vitesse: vit, releves, dedans, bloque, plusPres: +plusPres.toFixed(1),
        secondes: +((performance.now() - t0) / 1000).toFixed(1), premier: window.__premierDedans, depart: window.__depart, finY: +g.player.pos.y.toFixed(2) };
    });
    verifier('un train s\'arrête devant la voiture de l\'enfant posée sur sa voie, au lieu de la traverser',
      !surLaVoie.err && surLaVoie.dedans === 0 && surLaVoie.plusPres < 12 && surLaVoie.bloque > 0,
      JSON.stringify(surLaVoie));
      await tab.close();
    }
  } catch (e) { console.log('ERREUR', e.message); } finally { process.exit(0); }
})();
