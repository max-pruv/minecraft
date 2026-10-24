// L'AIGUILLAGE SE PROUVE AVANT DE CHOISIR.
//
// `tout.js` peut désormais sauter un gardien déclaré quand la carte de
// couverture dit qu'il n'exécute aucune ligne touchée. Un aiguillage faux ne
// se verrait nulle part : le portail serait vert, plus court, et aveugle. Ces
// témoins tournent sous node, en une seconde, AVANT la fumée, à chaque
// `npm test` : un rouge ici arrête le portail comme un rouge de fumée.
//
//     cd tests && node aiguillage.js

const fs = require('fs');
const os = require('os');
const path = require('path');
const C = require('./couverture.js');
const T = require('./tout.js');

const echecs = [];
function verifier(nom, ok, detail = '') {
  console.log(`${ok ? '✅' : '❌'} ${nom}${detail ? ` — ${detail}` : ''}`);
  if (!ok) echecs.push(nom);
}

(async () => {
  // 1. LA SÉMANTIQUE DE V8, MESURÉE ET NON SUPPOSÉE. Un module fabriqué : une
  // fonction appelée, une jamais appelée, une branche rare dans la fonction
  // appelée. On le relève avec l'instrument même du portail (l'inspecteur,
  // couverture binaire par fonction) et l'on exige : la fonction jamais
  // appelée est hors des lignes exécutées (sauf ses lignes de bord), la
  // branche rare est DEDANS (granularité de la fonction, pas du bloc), et le
  // haut du module aussi.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiguillage-'));
  const mod = path.join(dir, 'm.mjs');
  fs.writeFileSync(mod, [
    'export function appelee(x) {',        // 1
    '  if (x > 1e9) {',                    // 2
    '    return "rare";',                  // 3  branche jamais prise
    '  }',                                 // 4
    '  return x + 1;',                     // 5
    '}',                                   // 6
    'export function jamais() {',          // 7
    '  const a = 1;',                      // 8  intérieur jamais exécuté
    '  return a * 2;',                     // 9  intérieur jamais exécuté
    '}',                                   // 10
    'export const v = appelee(2);',        // 11
    '',
  ].join('\n'));
  const inspector = require('inspector');
  const s = new inspector.Session();
  s.connect();
  const post = (m, p) => new Promise((ok, ko) => s.post(m, p || {}, (e, r) => (e ? ko(e) : ok(r))));
  await post('Profiler.enable');
  await post('Profiler.startPreciseCoverage', { callCount: false, detailed: false });
  await import(require('url').pathToFileURL(mod).href);
  const r = await post('Profiler.takePreciseCoverage');
  s.disconnect();
  const e = r.result.find((x) => x.url.endsWith('/m.mjs'));
  const src = fs.readFileSync(mod, 'utf8');
  const { lignes } = C.lignesExecutees(src, e ? e.functions : []);
  const ex = (l) => !!lignes[l];
  verifier('la couverture voit la fonction appelée, sa branche rare comprise, et le haut du module',
    ex(1) && ex(3) && ex(5) && ex(11), C.enPlages(lignes));
  verifier('l\'intérieur d\'une fonction jamais appelée est hors des lignes exécutées',
    !ex(8) && !ex(9), C.enPlages(lignes));
  verifier('les plages se relisent à l\'identique',
    C.enPlages(lignes) === C.enPlages((() => { const u = new Uint8Array(lignes.length); for (const [a, b] of C.dePlages(C.enPlages(lignes))) for (let l = a; l <= b; l++) u[l] = 1; return u; })()));

  // 2. LA DÉCISION EST UNE INTERSECTION, ET ELLE GARDE TOUT CE QU'ELLE NE
  // SAIT PAS. Cas fabriqués, rejoués sur `decider` tel que `tout.js`
  // l'appelle.
  const fiche = { suites: { 'monte.js': '1-50', 'carte.js': '60-80' } };
  const sansDiff = () => '';
  const d1 = T.decider('src/x.js', ['monte.js', 'carte.js', 'reseau.js'], [70], fiche,
    ['monte.js', 'carte.js'], {}, sansDiff, C);
  verifier('une ligne touchée garde ses seules suites, et une suite absente de la carte est gardée',
    d1.garde.join() === 'carte.js,reseau.js' && d1.saute.join() === 'monte.js', JSON.stringify(d1));
  const d2 = T.decider('src/x.js', ['monte.js'], [55], fiche, ['monte.js'], {}, sansDiff, C);
  verifier('une ligne qu\'aucune suite n\'exécute ne garde personne', !d2.garde.length && d2.saute.join() === 'monte.js');
  const d3 = T.decider('src/x.js', ['carte.js'], [5], fiche, ['carte.js'],
    { 'carte.js': { fichiers: ['src/x.js'] } }, sansDiff, C);
  verifier('une suite qui lit le fichier en texte est gardée, même sans l\'exécuter', d3.garde.join() === 'carte.js');
  const d4 = T.decider('src/x.js', ['maj.js'], [5], { suites: {} }, ['maj.js'],
    { 'maj.js': { tout: true, motif: /web-minecraft-/ } }, () => "+const K = 'web-minecraft-neuf-v1';", C);
  const d5 = T.decider('src/x.js', ['maj.js'], [5], { suites: {} }, ['maj.js'],
    { 'maj.js': { tout: true, motif: /web-minecraft-/ } }, () => '+const a = 2;', C);
  verifier('une lecture à motif ne garde la suite que si le diff touche le motif', d4.garde.join() === 'maj.js' && !d5.garde.length);
  const d6 = T.decider('src/x.js', ['maj.js'], [5], { suites: {} }, ['maj.js'],
    { 'maj.js': { tout: true, motif: /web-minecraft-/ } }, () => false, C);
  verifier('un diff illisible garde la suite', d6.garde.join() === 'maj.js');

  // 3. LES GARDE-FOUS SE DÉSARMENT TOUT SEULS, ET ILS PEUVENT ROUGIR.
  const base = path.resolve(__dirname, '..');
  verifier('toutes les lectures de source des suites sont déclarées', T.lecturesDeclarees(base) === null,
    String(T.lecturesDeclarees(base)));
  const amputee = { ...T.LECTURES_TEXTE };
  delete amputee['reglages.js'];
  verifier('…et une lecture non déclarée désarme la sélection à la ligne', /reglages\.js/.test(String(T.lecturesDeclarees(base, amputee))),
    String(T.lecturesDeclarees(base, amputee)));
  const w = T.fermetureDesWorkers(base);
  verifier('les fichiers du mailleur sont rendus à la table, ceux du fil principal non',
    w && w.has('src/world.js') && w.has('src/mesher.js') && w.has('src/maillage-worker.js')
      && !w.has('src/main.js') && !w.has('src/vehicules.js') && !w.has('src/net.js'),
    w ? `${w.size} fichiers` : 'illisible');

  // 4. LA CARTE, SI ELLE EST LÀ, DÉCRIT CE QU'ELLE PRÉTEND.
  const carte = C.lireCarte();
  if (carte) {
    let blobsJustes = 0, blobsFaux = [];
    for (const [f, d] of Object.entries(carte.fichiers)) {
      let b = null;
      try { b = C.git(['rev-parse', `${carte.commit}:${f}`]).trim(); } catch {}
      if (b === d.blob) blobsJustes++; else blobsFaux.push(f);
    }
    verifier('chaque fichier de la carte porte le blob de son commit', !blobsFaux.length,
      `${blobsJustes} justes, faux : ${blobsFaux.slice(0, 5).join(', ')}`);
    const manquantes = T.SUITES.filter((s) => !carte.suites.includes(s));
    verifier('la carte a relevé les dix-sept suites', !manquantes.length, manquantes.join(', '));
    const main = carte.fichiers['src/main.js'];
    verifier('chaque suite de navigateur exécute le haut de main.js (une carte vide ne prouve rien)',
      main && ['monte.js', 'carte.js', 'reseau.js'].every((s) => main.suites[s] && C.dansPlages(C.dePlages(main.suites[s]), 1)),
      main ? Object.keys(main.suites).join(',') : 'main.js absent');
  } else {
    console.log('ℹ️  pas de carte de couverture : la sélection reste celle de la table');
  }

  fs.rmSync(dir, { recursive: true, force: true });
  console.log(echecs.length ? `\n❌ ${echecs.length} témoin(s) de l'aiguillage rouge(s)` : '\n✅ l\'aiguillage est sûr');
  process.exit(echecs.length ? 1 : 0);
})().catch((e) => { console.error('💥', e); process.exit(2); });
