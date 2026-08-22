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

const SUITES = ['reseau.js', 'visio.js', 'parent.js', 'reglages.js', 'carte.js', 'monte.js', 'washington.js', 'plafond.js', 'sauvegarde.js', 'maj.js', 'metro.js', 'carteMonde.js', 'hote.js'];

// QUELLE SUITE PROTÈGE QUOI.
//
// Le portail est passé de cinq suites à huit, et chaque livraison le payait en
// entier : une heure, même pour ajouter un bâtiment. La cadence est tombée de
// neuf versions par jour à deux ou trois, et la bibliothèque de monuments est
// restée un jour entier dans le dépôt sans être branchée, faute de place dans
// la file.
//
// Première version de cet aiguillage : deux voies, rapide ou complète. Mesurée
// sur les douze dernières livraisons, elle aurait pris la voie complète DOUZE
// fois sur douze — donc elle ne servait à rien. Deux raisons : `sw.js` change à
// chaque livraison puisqu'il faut monter CACHE_VERSION, et `main.js` change
// presque toujours puisque c'est là que tout se branche.
//
// Le bon découpage n'est pas « rapide ou tout », c'est « ce qui protège la zone
// touchée ». Toucher au réseau lance les deux suites qui l'éprouvent, pas les
// huit. La couverture ne baisse pas : elle cesse seulement de rejouer ce que le
// changement ne peut pas casser.
//
// Un fichier absent de cette table est du contenu — décor, villes, monuments,
// créatures : la voie rapide suffit. Tout ce qui peut coûter les données d'un
// enfant est ici, et la table doit grandir avec le code.
const GARDIENS = {
  'src/net.js': ['reseau.js', 'visio.js', 'hote.js'],
  'src/cloud.js': ['reseau.js', 'reglages.js'],
  'src/relaisnuage.js': ['reseau.js'],
  'src/sync.js': ['sauvegarde.js', 'reglages.js'],
  'src/world.js': ['plafond.js', 'carte.js', 'washington.js', 'metro.js', 'carteMonde.js'],
  // Le registre des mondes décide OÙ sont les villes : y toucher les déplace
  // toutes, donc tout ce qui les dessine se rejoue.
  'src/mondes.js': ['carteMonde.js', 'carte.js', 'plafond.js', 'washington.js', 'metro.js'],
  // La capitale : son relief, son métro et ses bâtiments ouverts. Elle touche
  // au sol de la carte, donc le témoin du plafond la surveille aussi.
  'src/washington.js': ['washington.js', 'plafond.js'],
  'src/dcmonuments.js': ['washington.js'],
  // La ville : c'est elle qui bâtit le métro de Paris, la caserne et le
  // commissariat.
  'src/ville.js': ['metro.js', 'carte.js'],
  'src/player.js': ['plafond.js', 'monte.js'],
  'src/admin.js': ['parent.js', 'reglages.js'],
  'src/identity.js': ['reglages.js', 'parent.js'],
  'src/education.js': ['reglages.js', 'parent.js'],
  'src/vehicules.js': ['monte.js', 'washington.js', 'metro.js'],
  'src/animals.js': ['monte.js'],
  'src/montures.js': ['monte.js'],
  'src/fun.js': ['monte.js', 'carte.js'],
  // Le hub : presque toute livraison y passe. Deux suites larges le couvrent —
  // la carte traverse l'interface entière, la monte traverse la boucle de jeu.
  'src/main.js': ['carte.js', 'monte.js', 'washington.js'],
  'index.html': ['carte.js', 'reglages.js', 'maj.js'],
};

// Le banc lui-même : s'il bouge, plus rien de ce qu'il dit n'est acquis.
const BANC = ['tests/banc.js', 'tests/nuage.js', 'tests/tout.js'];

// `sw.js` SE JUGE SUR CE QUI A CHANGÉ, PAS SUR LE FAIT QU'IL A CHANGÉ.
//
// Monter CACHE_VERSION et ajouter un fichier à la liste du cache, c'est la
// procédure de publication elle-même : cela arrive à CHAQUE livraison et ne
// risque rien. Une vraie modification de sa logique, en revanche, touche à ce
// que toutes les tablettes téléchargent — et là, tout se rejoue.
function swAnodin(base) {
  try {
    const { execSync } = require('child_process');
    const d = execSync('git diff origin/main...HEAD -- sw.js; git diff HEAD -- sw.js',
      { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const lignes = d.split('\n')
      .filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
    if (!lignes.length) return true;
    return lignes.every((l) => /CACHE_VERSION/.test(l) || /^[+-]\s*'\.\/[\w./-]+',?\s*$/.test(l));
  } catch { return false; }
}

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

// Ce qu'il faut rejouer pour ce changement-ci. Rend la liste des suites, dans
// l'ordre du portail, et la raison — qui s'affiche : un choix d'essais qu'on ne
// peut pas relire est un choix qu'on ne peut pas contester.
function suitesNecessaires() {
  const base = path.resolve(__dirname, '..');
  const changes = fichiersModifies();
  if (!changes) return { suites: SUITES, pourquoi: 'git muet — on ne parie pas' };

  const besoin = new Set();
  const raisons = [];
  let tout = false;
  for (const f of changes) {
    if (BANC.includes(f)) { tout = true; raisons.push(`${f} (le banc)`); continue; }
    if (GARDIENS[f]) { GARDIENS[f].forEach((s) => besoin.add(s)); raisons.push(f); continue; }
    if (f === 'sw.js') {
      if (swAnodin(base)) { raisons.push('sw.js (version + cache seulement)'); continue; }
      tout = true; raisons.push('sw.js (logique modifiée)'); continue;
    }
    // Une suite d'essai qu'on modifie se rejoue elle-même, et rien d'autre :
    // elle ne peut pas casser le jeu, seulement se tromper sur lui. Sans cette
    // règle, retoucher un témoin relançait les huit suites — et le gain de
    // l'aiguillage disparaissait dès qu'on améliorait un essai.
    const suite = f.match(/^tests\/([\w-]+\.js)$/);
    if (suite && SUITES.includes(suite[1])) { besoin.add(suite[1]); raisons.push(f); continue; }
    if (suite && suite[1] === 'fumee.js') { raisons.push(f); continue; }
    // Contenu : décor, villes, monuments, créatures, journaux. Le témoin de
    // fumée les couvre — il charge le jeu, le joue et pose un bâtiment.
    if (/^src\/[\w-]+\.js$/.test(f) || /\.(md|png|webmanifest)$/.test(f)) continue;
    // Tout le reste : on ne sait pas, donc on ne parie pas.
    tout = true; raisons.push(`${f} (inconnu)`);
  }
  if (tout) return { suites: SUITES, pourquoi: raisons.join(', ') };
  const liste = SUITES.filter((s) => besoin.has(s));
  return {
    suites: liste,
    pourquoi: raisons.length ? raisons.join(', ') : `${changes.length} fichier(s) de contenu`,
  };
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

  // `--voie` : on demande au dépôt ce qu'il faut rejouer pour ce changement.
  // `--long` force les huit suites, toujours disponible sans discuter.
  let aJouer = SUITES;
  if (process.argv.includes('--voie') && !process.argv.includes('--long')) {
    const { suites, pourquoi } = suitesNecessaires();
    aJouer = suites;
    console.log(`🎯 ${suites.length === SUITES.length ? 'tout le portail' : `${suites.length + 1} suite(s)`}`
      + ` — ${pourquoi}`);
    console.log(`   fumee.js${suites.length ? ' + ' + suites.join(', ') : ' seul'}\n`);
    // Le témoin de fumée passe TOUJOURS en premier : trois minutes qui
    // attrapent un module qui ne charge pas, avant d'en dépenser cinquante.
    if (!await lancer('fumee.js')) {
      console.log('\n❌ la fumée a échoué — on ne publie pas');
      process.exit(1);
    }
    if (!suites.length) {
      console.log('\n✅ voie rapide verte — on peut publier');
      process.exit(0);
    }
    await dormir(REPOS_MS);
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
  for (const suite of aJouer) {
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
    if (suite !== aJouer[aJouer.length - 1]) await dormir(REPOS_MS);
  }
  console.log('\n════════ verdict ════════');
  for (const [suite, vert] of verdicts) console.log(`${vert ? '✅' : '❌'} ${suite}`);
  const tout = verdicts.every(([, v]) => v);
  console.log(tout
    ? '\n✅ toutes les suites sont vertes — on peut publier'
    : '\n❌ une suite au moins a échoué — on ne publie pas');
  process.exit(tout ? 0 : 1);
})();
