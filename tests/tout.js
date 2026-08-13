// La porte de sortie unique : les trois suites, dans l'ordre, avec un verdict
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

const SUITES = ['reseau.js', 'reglages.js', 'carte.js'];
const REPOS_MS = 20000;        // le temps que la charge retombe entre deux suites
const CHARGE_MAX = 2.0;        // au-delà, on attend : les faux échecs viennent de là

const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

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
  const verdicts = [];
  for (const suite of SUITES) {
    await attendreLeCalme();
    console.log(`\n════════ ${suite} ════════\n`);
    const vert = await lancer(suite);
    verdicts.push([suite, vert]);
    if (suite !== SUITES[SUITES.length - 1]) await dormir(REPOS_MS);
  }
  console.log('\n════════ verdict ════════');
  for (const [suite, vert] of verdicts) console.log(`${vert ? '✅' : '❌'} ${suite}`);
  const tout = verdicts.every(([, v]) => v);
  console.log(tout
    ? '\n✅ les trois suites sont vertes — on peut publier'
    : '\n❌ une suite au moins a échoué — on ne publie pas');
  process.exit(tout ? 0 : 1);
})();
