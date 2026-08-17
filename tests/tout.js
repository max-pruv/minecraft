// La porte de sortie unique : toutes les suites, dans l'ordre, avec un verdict
// pour l'ensemble.
//
// Pourquoi ce fichier existe : les suites étaient lancées à la main, une par
// une, et il est arrivé plus d'une fois qu'on publie sur la foi de deux
// suites vertes et d'une troisième « probablement bonne ». Deux régressions
// sont passées comme cela — la visibilité entre invités, cassée deux fois par
// une simplification du banc qui semblait sans risque.
//
// Elles ne tournent JAMAIS en parallèle : le conteneur a quatre cœurs, et
// deux navigateurs qui se les disputent produisent des échecs qui n'existent
// pas dans le jeu. On laisse même la machine souffler entre deux suites, pour
// la même raison.
//
//     cd tests && npm test

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const SUITES = ['reseau.js', 'visio.js', 'parent.js', 'reglages.js', 'carte.js', 'monte.js', 'plafond.js', 'sauvegarde.js'];

// DEUX VOIES, ET C'EST LE CODE MODIFIÉ QUI CHOISIT — PAS CELUI QUI LIVRE.
//
// Le portail est passé de cinq suites à huit, et chaque livraison le payait en
// entier : une heure, même pour ajouter un bâtiment. La cadence est tombée de
// neuf versions par jour à deux ou trois, et la bibliothèque de monuments est
// restée un jour entier dans le dépôt sans être branchée, faute de place dans
// la file. Une heure de portail sur un fichier de décor, c'est une heure qui
// ne protège rien.
//
// La voie rapide (`fumee.js`, cinq minutes) couvre ce qui casse vraiment quand
// on ne touche qu'au contenu : un module qui ne charge pas, une erreur au
// démarrage, un joueur qui traverse le sol, un bâtiment qui ne se pose pas.
//
// Ces fichiers-ci, eux, ne prennent JAMAIS la voie rapide. Ce sont ceux dont un
// défaut ne se voit pas à l'œil et coûte les données d'un enfant : le réseau,
// la sauvegarde, le terrain sous les maisons, l'espace parent, et le banc
// lui-même. La liste est volontairement large — au moindre doute, voie longue.
const DÉLICAT = [
  'src/net.js', 'src/cloud.js', 'src/relaisnuage.js', 'src/sync.js',
  'src/world.js', 'src/player.js', 'src/admin.js', 'src/identity.js',
  'src/education.js', 'src/main.js', 'sw.js', 'index.html',
  'tests/banc.js', 'tests/nuage.js', 'tests/tout.js',
];

// Ce qui a bougé depuis la dernière livraison. Sans réponse de git — dépôt
// absent, historique tronqué — on prend la voie longue : ne pas savoir n'est
// pas une raison d'aller vite.
function fichiersModifies() {
  try {
    const { execSync } = require('child_process');
    const base = path.resolve(__dirname, '..');
    const sorti = execSync('git diff --name-only origin/main...HEAD; git diff --name-only HEAD',
      { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const liste = [...new Set(sorti.split('\n').map((s) => s.trim()).filter(Boolean))];
    return liste.length ? liste : null;
  } catch { return null; }
}

function voieCourteSuffit() {
  const changes = fichiersModifies();
  if (!changes) return { court: false, pourquoi: 'git muet — on ne parie pas' };
  const risque = changes.filter((f) => DÉLICAT.includes(f));
  if (risque.length) return { court: false, pourquoi: `touche ${risque.join(', ')}` };
  return { court: true, pourquoi: `${changes.length} fichier(s), aucun délicat` };
}
const REPOS_MS = 20000;        // le temps que la charge retombe entre deux suites
const CHARGE_MAX = 2.0;        // au-delà, on attend : les faux échecs viennent de là

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// LE PORTAIL SE SOUVIENT DE CE QU'IL A DÉJÀ PROUVÉ.
//
// Sept suites, trois quarts d'heure. Le conteneur de la session, lui, peut
// être recyclé à tout moment — c'est arrivé à la sixième suite sur sept, et
// les six verdicts verts sont partis avec la mémoire du processus. Tout était
// à refaire, à l'identique, pour rien.
//
// Chaque verdict est donc écrit sur le disque dès qu'il tombe, et une reprise
// saute ce qui est déjà vert. Mais SEULEMENT si le code n'a pas bougé d'un
// octet : c'est là tout le danger, et c'est précisément le travers que ce
// fichier existe pour empêcher — publier sur la foi de suites « probablement
// encore bonnes ». L'empreinte couvre src/, tests/, sw.js et index.html ; au
// moindre changement, tous les acquis sont annulés et tout se rejoue.
const MEMOIRE = '/tmp/portail-verdicts-v2.json';
const RACINE = path.join(__dirname, '..');

function empreinteDuDepot() {
  const h = crypto.createHash('sha1');
  for (const dossier of ['src', 'tests']) {
    const chemin = path.join(RACINE, dossier);
    for (const f of fs.readdirSync(chemin).sort()) {
      if (!f.endsWith('.js')) continue;
      h.update(dossier + '/' + f).update(fs.readFileSync(path.join(chemin, f)));
    }
  }
  for (const f of ['sw.js', 'index.html']) {
    try { h.update(f).update(fs.readFileSync(path.join(RACINE, f))); } catch { /* absent */ }
  }
  return h.digest('hex');
}

function acquisLus(empreinte) {
  try {
    const m = JSON.parse(fs.readFileSync(MEMOIRE, 'utf8'));
    if (m.empreinte === empreinte) return m.verts || {};
  } catch { /* première fois, ou mémoire abîmée */ }
  return {};
}

function acquisEcrits(empreinte, verts) {
  try { fs.writeFileSync(MEMOIRE, JSON.stringify({ empreinte, verts }, null, 2)); }
  catch { /* sans mémoire, on rejouera tout : c'est le pire, pas le faux */ }
}

const charge = () => {
  try { return Number(fs.readFileSync('/proc/loadavg', 'utf8').split(' ')[0]); }
  catch { return 0; }          // ailleurs que sous Linux, on ne sait pas : on avance
};

async function attendreLeCalme(limiteMs = 180000) {
  const fin = Date.now() + limiteMs;
  while (charge() > CHARGE_MAX && Date.now() < fin) await dormir(5000);
}

function lancer(fichier) {
  return new Promise((ok) => {
    const p = spawn(process.execPath, [fichier], { stdio: 'inherit', cwd: __dirname });
    p.on('close', (code) => ok(code === 0));
  });
}

(async () => {
  const depuisZero = process.argv.includes('--depuis-zero');

  // `--voie` : on demande au dépôt quelle voie mérite ce changement.
  // `--long` force la voie complète, toujours disponible sans discuter.
  if (process.argv.includes('--voie') && !process.argv.includes('--long')) {
    const { court, pourquoi } = voieCourteSuffit();
    console.log(court
      ? `🏃 voie rapide — ${pourquoi}\n`
      : `🐢 voie complète — ${pourquoi}\n`);
    if (court) {
      const vert = await lancer('fumee.js');
      console.log(vert
        ? '\n✅ voie rapide verte — on peut publier'
        : '\n❌ la voie rapide a échoué — on ne publie pas');
      process.exit(vert ? 0 : 1);
    }
  }

  const empreinte = empreinteDuDepot();
  const verts = depuisZero ? {} : acquisLus(empreinte);
  const dejaVus = Object.keys(verts).filter((s) => verts[s]);
  if (dejaVus.length) {
    console.log(`↩️  reprise : ${dejaVus.length} suite(s) déjà verte(s) sur ce code exact`
      + ` — ${dejaVus.join(', ')}`);
    console.log('   (npm test -- --depuis-zero pour tout rejouer)\n');
  }
  const verdicts = [];
  for (const suite of SUITES) {
    if (verts[suite]) {
      console.log(`\n════════ ${suite} ════════\n⏭️  déjà vert sur ce code, on ne le rejoue pas`);
      verdicts.push([suite, true]);
      continue;
    }
    // LA CHARGE AU MOMENT DU DÉPART, ÉCRITE NOIR SUR BLANC.
    //
    // Trois portails de suite, trois verdicts rouges différents, et chaque
    // suite verte quand on la joue seule. On a soupçonné la charge sans jamais
    // la mesurer à l'instant qui compte : celui où la suite démarre. Deux
    // lignes règlent la question au lieu d'une heure d'hypothèses.
    const avant = charge();
    await attendreLeCalme();
    console.log(`\n════════ ${suite} ════════`);
    console.log(`   charge ${avant.toFixed(2)} avant l'attente, ${charge().toFixed(2)} au départ\n`);
    const vert = await lancer(suite);
    verdicts.push([suite, vert]);
    // Écrit MAINTENANT, pas à la fin : c'est tout l'objet de la manœuvre.
    verts[suite] = vert;
    acquisEcrits(empreinte, verts);
    if (suite !== SUITES[SUITES.length - 1]) await dormir(REPOS_MS);
  }
  console.log('\n════════ verdict ════════');
  for (const [suite, vert] of verdicts) console.log(`${vert ? '✅' : '❌'} ${suite}`);
  const tout = verdicts.every(([, v]) => v);
  console.log(tout
    ? '\n✅ toutes les suites sont vertes — on peut publier'
    : '\n❌ une suite au moins a échoué — on ne publie pas');
  process.exit(tout ? 0 : 1);
})();
