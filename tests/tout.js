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
  // La Terre elle-même : ses côtes et son relief décident du sol partout.
  'src/terre.js': ['carteMonde.js', 'plafond.js', 'carte.js'],
  // Londres, ville entière du tour du monde.
  'src/londres.js': ['carte.js', 'carteMonde.js', 'plafond.js'],
  // La machine à villes : les cinquante grandes du tour du monde.
  'src/villesmonde.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  // Les deux cents villes : des données pures, jugées par les mêmes témoins
  // que la machine qui les lit.
  'src/villes200.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  // Les trains intervilles : les voies touchent le terrain et la carte, les
  // rames se prouvent dans monte.js.
  'src/trains.js': ['carteMonde.js', 'carte.js', 'plafond.js', 'monte.js'],
  // Le tour du monde : neuf sites, dix monuments. Ils aplanissent leur parvis
  // (donc le témoin du relief) et s'ajoutent aux destinations de la carte.
  'src/capitales.js': ['carteMonde.js', 'plafond.js', 'carte.js'],
  'src/monuments.js': ['carteMonde.js'],
  // Les familles de bâtiments : la bibliothèque de l'inventaire se prouve
  // dans monte.js (onglet, vignettes, pose).
  'src/batiments.js': ['monte.js'],
  'src/nice.js': ['carte.js', 'carteMonde.js', 'plafond.js'],
  'src/carte.js': ['carte.js', 'carteMonde.js'],
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
  // La Giga-usine : son site touche le terrain (plafond), la carte, le tour
  // du monde — et sa chaîne comme sa voiture à conduire vivent dans monte.js.
  'src/usine.js': ['carteMonde.js', 'carte.js', 'plafond.js', 'monte.js'],
  // Les passants des villes : la vie des rues se prouve dans monte.js.
  'src/passants.js': ['monte.js'],
  // Les poissons : la vie de la mer se prouve au même endroit.
  'src/poissons.js': ['monte.js'],
  'src/animals.js': ['monte.js'],
  'src/montures.js': ['monte.js'],
  'src/fun.js': ['monte.js', 'carte.js'],
  // Le hub : presque toute livraison y passe. Deux suites larges le couvrent —
  // la carte traverse l'interface entière, la monte traverse la boucle de jeu.
  'src/main.js': ['carte.js', 'monte.js', 'washington.js'],
  'index.html': ['carte.js', 'reglages.js', 'maj.js'],

  // --- v195 : TRENTE FICHIERS MANQUAIENT, et deux d'entre eux étaient des
  // trous, pas des oublis de confort. `src/visio.js` ne lançait pas
  // `visio.js` ; `src/garages.js`, qui écrit dans le profil de l'enfant à
  // côté de ses blocs, ne lançait pas `sauvegarde.js`. Le fichier disait
  // déjà « la table doit grandir avec le code » — elle n'avait pas grandi.
  //
  // Les villes bâties à la main : elles dessinent leur relief et leurs
  // destinations, exactement comme Nice et Londres, déjà listées.
  'src/paris.js': ['carte.js', 'carteMonde.js', 'plafond.js', 'metro.js'],
  'src/manhattan.js': ['carte.js', 'carteMonde.js', 'plafond.js'],
  'src/sanfrancisco.js': ['carte.js', 'carteMonde.js', 'plafond.js'],
  'src/lille.js': ['carte.js', 'carteMonde.js', 'plafond.js'],
  // Les régions et les sites du tour du monde : ils aplanissent leur parvis,
  // donc le témoin du relief, et s'ajoutent aux destinations de la carte.
  'src/chine.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/pole.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/espace.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/gaulois.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/villandry.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/parc.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/aeroport.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  'src/circuit.js': ['carteMonde.js', 'carte.js', 'plafond.js'],
  // Les voies nommées : elles portent les circuits de voitures de toutes les
  // villes bâties à la main.
  'src/voies.js': ['carte.js', 'monte.js'],
  // Le garage écrit dans le profil de l'enfant, à côté de ses blocs : c'est
  // de la sauvegarde, et cela doit se prouver comme telle.
  'src/garages.js': ['sauvegarde.js', 'monte.js'],
  'src/visio.js': ['visio.js', 'reseau.js'],
  'src/partage.js': ['reseau.js', 'parent.js'],
  'src/siege.js': ['monte.js', 'washington.js'],
  // Le socle du rendu : un registre de blocs, un atlas ou un mailleur faux
  // n'abîme pas une ville, il les abîme toutes.
  'src/blocks.js': SUITES,
  'src/mesher.js': SUITES,
  'src/textures.js': SUITES,
  'src/sky.js': ['carte.js', 'monte.js'],
  'src/effects.js': ['monte.js', 'carte.js'],
  'src/props.js': ['monte.js', 'carte.js'],
  'src/modeles.js': ['monte.js'],
  'src/betes.js': ['monte.js'],
  'src/creatures.js': ['monte.js'],
  'src/personnages.js': ['monte.js'],
  'src/vie.js': ['monte.js'],
  'src/marlon.js': ['monte.js'],
  'src/face-worker.js': ['parent.js'],
};

// Le banc lui-même : s'il bouge, plus rien de ce qu'il dit n'est acquis.
const BANC = ['tests/banc.js', 'tests/nuage.js', 'tests/tout.js'];

// SAUF QUAND CE QUI BOUGE EST UN DÉLAI OU UN COMMENTAIRE.
//
// Même raisonnement que `swAnodin`, et pour la même raison mesurée : porter
// UNE limite d'attente de dix à trente secondes dans `banc.js` a relancé les
// treize suites — trois quarts d'heure — alors que le changement ne pouvait
// rien casser. C'est ce qui a fait dire à Max, à juste titre, « je ne vois pas
// pourquoi on vient tester réseau quand on change la carte ».
//
// Est anodin : un commentaire, une ligne vide, ou une ligne dont la SEULE
// différence est un nombre — une temporisation, une borne. Tout le reste — une
// signature, un appel, une structure — reste du banc qui bouge.
function bancAnodin(base, fichier) {
  try {
    const { execSync } = require('child_process');
    const d = execSync(`git diff origin/main...HEAD -- ${fichier}; git diff HEAD -- ${fichier}`,
      { cwd: base, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    const bouge = d.split('\n').filter((l) => /^[+-]/.test(l) && !/^(\+\+\+|---)/.test(l));
    if (!bouge.length) return true;
    // Un commentaire ou une ligne vide ne change rien à ce que le banc fait.
    const utile = (l) => l.slice(1).trim() && !/^\s*(\/\/|\*|\/\*)/.test(l.slice(1));
    // Une ligne de code, effacée de ses nombres : c'est sa FORME. Si chaque
    // ligne ajoutée a une jumelle retirée de même forme, seuls des nombres ont
    // bougé — des délais, des bornes.
    const forme = (l) => l.slice(1).replace(/\d+/g, '#').trim();
    const ajoutees = bouge.filter((l) => l[0] === '+' && utile(l)).map(forme);
    const retirees = bouge.filter((l) => l[0] === '-' && utile(l)).map(forme);
    if (ajoutees.length !== retirees.length) return false;
    const reste = [...retirees];
    for (const a of ajoutees) {
      const k = reste.indexOf(a);
      if (k === -1) return false;
      reste.splice(k, 1);
    }
    return true;
  } catch { return false; }
}

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
    if (BANC.includes(f)) {
      if (bancAnodin(base, f)) { raisons.push(`${f} (délais seulement)`); continue; }
      tout = true; raisons.push(`${f} (le banc)`); continue;
    }
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
// v195 : L'EMPREINTE EST DÉSORMAIS PAR SUITE, ET C'EST LE PLUS GROS LEVIER
// SUR L'ITÉRATION.
//
// Une empreinte unique sur tout `src/` et tout `tests/` annulait TOUS les
// acquis au moindre octet — donc dès qu'on corrigeait le rouge qu'on venait de
// trouver, les douze suites vertes se rejouaient pour rien. Mesuré sur la
// session de la v195 : trois passages de `carte.js`, trois quarts d'heure, là
// où un seul suffisait.
//
// Le verdict d'une suite reste valable tant qu'aucun fichier qui la GARDE n'a
// bougé. Ses gardiens, c'est exactement la table ci-dessus, lue à l'envers —
// plus son propre fichier, le banc, `sw.js` et `index.html`. Et, par prudence,
// tout fichier de `src/` que la table ne connaît PAS encore : un module neuf
// n'a pas de gardien déclaré, et ne pas savoir n'est pas une raison de garder
// un acquis.
const MEMOIRE = '/tmp/portail-verdicts-v3.json';
const RACINE = path.join(__dirname, '..');

function listeSrc() {
  try { return fs.readdirSync(path.join(RACINE, 'src')).filter((f) => f.endsWith('.js')).sort(); }
  catch { return []; }
}

function gardiensDe(suite) {
  const fichiers = new Set([`tests/${suite}`, ...BANC, 'sw.js', 'index.html']);
  for (const [f, suites] of Object.entries(GARDIENS)) {
    if (suites.includes(suite)) fichiers.add(f);
  }
  for (const f of listeSrc()) if (!GARDIENS[`src/${f}`]) fichiers.add(`src/${f}`);
  return [...fichiers].sort();
}

function empreinteDe(fichiers) {
  const h = crypto.createHash('sha1');
  for (const f of fichiers) {
    try { h.update(f).update(fs.readFileSync(path.join(RACINE, f))); }
    catch { h.update(f).update('absent'); }
  }
  return h.digest('hex');
}

function acquisLus() {
  let m;
  try { m = JSON.parse(fs.readFileSync(MEMOIRE, 'utf8')); } catch { return {}; }
  const verts = {};
  for (const [suite, note] of Object.entries(m.verts || {})) {
    if (note && note.empreinte === empreinteDe(gardiensDe(suite))) verts[suite] = true;
  }
  return verts;
}

function acquisEcrits(_ignore, verts) {
  const note = {};
  for (const suite of Object.keys(verts)) {
    if (verts[suite]) note[suite] = { empreinte: empreinteDe(gardiensDe(suite)) };
  }
  try { fs.writeFileSync(MEMOIRE, JSON.stringify({ verts: note }, null, 2)); }
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

  const empreinte = null;      // l'empreinte est désormais tenue par suite
  const verts = depuisZero ? {} : acquisLus();
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
