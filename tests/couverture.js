// LA CARTE DE COUVERTURE : QUELLE SUITE EXÉCUTE QUELLE LIGNE DU JEU.
//
// Pourquoi ce fichier existe. L'aiguillage du portail (`tout.js`) décide
// FICHIER par fichier : toucher `src/main.js` relançait ses six gardiens —
// `monte.js`, `manhattan.js`, `reglages.js`… trois quarts d'heure — et
// `main.js` change à presque chaque livraison. Or la plupart des changements
// ne touchent qu'une FONCTION, et une suite qui n'a jamais exécuté une
// fonction ne peut pas voir qu'elle a changé : si aucune ligne qu'une suite
// exécute n'a bougé, elle exécute exactement le même code qu'avant, donc elle
// rend le même verdict. C'est tout le raisonnement, et il ne parie sur rien
// d'autre que le déterminisme du chemin (voir « ce qui reste prudent » plus
// bas).
//
// Trois usages, un fichier :
//
//   1. CHARGÉ PAR `-r` (variable COUVERTURE_DIR posée par `tout.js
//      --couverture`) : il instrumente la suite qui tourne. Côté navigateur,
//      chaque page reçoit une session CDP et un relevé de couverture BINAIRE
//      par fonction (`callCount: false` — le moins cher que V8 sache faire),
//      pris toutes les trois secondes et avant chaque navigation, fermeture ou
//      rechargement. Côté node, la même chose par l'inspecteur du processus.
//   2. `node couverture.js --carte <dossier>` : il fond les relevés en
//      `carte-couverture.json`, une liste de plages de lignes par fichier et
//      par suite.
//   3. `require('./couverture.js').lignesTouchees(...)` : `tout.js` lui
//      demande, pour un changement donné, quelles suites exécutent les lignes
//      qui ont bougé.
//
// CE QUI RESTE PRUDENT, et c'est volontaire :
//   - la granularité est la FONCTION, jamais le bloc : une branche rare d'une
//     fonction exécutée compte comme exécutée, quel que soit le tirage ;
//   - une fonction que V8 n'a pas compilée n'est pas rapportée, donc ses
//     lignes héritent de la fonction qui l'entoure — exécutée, donc gardées ;
//   - les lignes de bord d'une fonction jamais appelée (sa déclaration, sa
//     dernière accolade) restent attribuées à ce qui l'entoure ;
//   - plusieurs relevés se fondent par UNION : une suite qui a exécuté une
//     ligne une seule fois la garde pour toujours, jusqu'au prochain relevé
//     complet ;
//   - les fichiers lus par un worker (le mailleur, le scanner de visages) ne
//     se jugent PAS ici : la couverture du navigateur ne voit pas les
//     workers. `tout.js` les rend à la table des gardiens.

const fs = require('fs');
const path = require('path');

const RACINE = path.resolve(__dirname, '..');

// Une adresse de script → un chemin du dépôt (`src/main.js`), ou null pour ce
// qui n'est pas du jeu (vendor, scripts inline, bibliothèques du banc).
function cheminDuDepot(url) {
  if (!url) return null;
  let p = url;
  try {
    if (/^file:/.test(url)) p = require('url').fileURLToPath(url.split('?')[0]);
    else if (/^https?:/.test(url)) p = path.join(RACINE, decodeURIComponent(new URL(url).pathname));
    else return null;
  } catch { return null; }
  const rel = path.relative(RACINE, p.split('?')[0]).split(path.sep).join('/');
  return /^src\/[\w.-]+\.js$/.test(rel) ? rel : null;
}

// Les décalages de V8 sont en caractères UTF-16, comme les indices d'une
// chaîne JavaScript : on découpe la source lue en utf8 en lignes et l'on
// cumule leurs longueurs.
function debutsDeLignes(source) {
  const d = [0];
  for (let i = 0; i < source.length; i++) if (source.charCodeAt(i) === 10) d.push(i + 1);
  return d;
}
function ligneDe(debuts, off) {
  let a = 0, b = debuts.length - 1;
  while (a < b) { const m = (a + b + 1) >> 1; if (debuts[m] <= off) a = m; else b = m - 1; }
  return a + 1;   // lignes numérotées à partir de 1, comme git
}

// Les fonctions d'un relevé V8 → l'ensemble des lignes EXÉCUTÉES. Les plus
// grandes d'abord, pour que la plus intérieure ait le dernier mot ; une
// fonction jamais appelée n'éteint que ses lignes STRICTEMENT intérieures.
function lignesExecutees(source, fonctions) {
  const debuts = debutsDeLignes(source);
  const n = debuts.length;
  const lignes = new Uint8Array(n + 2);
  const f = fonctions
    .filter((x) => x.ranges && x.ranges.length)
    .map((x) => ({ s: x.ranges[0].startOffset, e: x.ranges[0].endOffset, c: x.ranges[0].count }))
    .sort((a, b) => (b.e - b.s) - (a.e - a.s));
  for (const { s, e, c } of f) {
    const l0 = ligneDe(debuts, s), l1 = ligneDe(debuts, Math.max(s, e - 1));
    if (c > 0) for (let l = l0; l <= l1; l++) lignes[l] = 1;
    else for (let l = l0 + 1; l < l1; l++) lignes[l] = 0;
  }
  return { lignes, n };
}

// Plages compactes « 1-40,52-60 » ↔ ensemble de lignes.
function enPlages(lignes) {
  const out = [];
  let a = -1;
  for (let l = 1; l < lignes.length; l++) {
    if (lignes[l] && a < 0) a = l;
    if (!lignes[l] && a >= 0) { out.push(a === l - 1 ? `${a}` : `${a}-${l - 1}`); a = -1; }
  }
  if (a >= 0) out.push(a === lignes.length - 1 ? `${a}` : `${a}-${lignes.length - 1}`);
  return out.join(',');
}
function dePlages(texte) {
  if (!texte) return [];
  return texte.split(',').map((p) => { const [a, b] = p.split('-').map(Number); return [a, b || a]; });
}
function dansPlages(plages, l) {
  let a = 0, b = plages.length - 1;
  while (a <= b) {
    const m = (a + b) >> 1;
    if (l < plages[m][0]) b = m - 1; else if (l > plages[m][1]) a = m + 1; else return true;
  }
  return false;
}

// ───────────────────────── 1. l'instrumentation ─────────────────────────

function instrumenter(dir, suite) {
  fs.mkdirSync(dir, { recursive: true });
  const releves = new Map();          // chemin → Uint8Array des lignes (union)
  const sources = new Map();          // chemin → source lue sur le disque
  let ecrit = 0;
  const source = (f) => {
    if (!sources.has(f)) {
      try { sources.set(f, fs.readFileSync(path.join(RACINE, f), 'utf8')); } catch { sources.set(f, null); }
    }
    return sources.get(f);
  };
  function fondre(resultat) {
    for (const r of resultat || []) {
      const f = cheminDuDepot(r.url);
      if (!f) continue;
      const src = source(f);
      if (src == null) continue;
      const { lignes } = lignesExecutees(src, r.functions);
      const acc = releves.get(f);
      if (!acc) releves.set(f, lignes);
      else for (let i = 0; i < lignes.length && i < acc.length; i++) acc[i] |= lignes[i];
    }
  }
  function ecrire() {
    const sortie = {};
    for (const [f, l] of releves) sortie[f] = enPlages(l);
    try {
      fs.writeFileSync(path.join(dir, `${suite}.${process.pid}.json`), JSON.stringify({ suite, fichiers: sortie }));
      ecrit++;
    } catch { /* un relevé perdu rend la carte plus pauvre, jamais fausse : la suite y manque, donc elle se rejoue */ }
  }

  // — node : l'inspecteur du processus lui-même. Les appels sont synchrones
  // sur une session du même fil, ce qui permet de relever jusque dans
  // `process.exit`.
  try {
    const inspector = require('inspector');
    const s = new inspector.Session();
    s.connect();
    const post = (m, p) => { let r; s.post(m, p || {}, (e, v) => { r = v; }); return r; };
    post('Profiler.enable');
    post('Profiler.startPreciseCoverage', { callCount: false, detailed: false });
    const prendre = () => { try { const r = post('Profiler.takePreciseCoverage'); if (r) fondre(r.result); } catch {} };
    setInterval(prendre, 5000).unref();
    process.on('exit', () => { prendre(); ecrire(); });
  } catch { /* sans inspecteur, seule la couverture du navigateur compte */ }

  // — le navigateur : on enveloppe `chromium.launch`, et chaque page reçoit sa
  // session CDP au moment où elle naît, AVANT sa première navigation.
  let pw;
  try { pw = require('playwright-core'); } catch { return; }
  const lancerOrig = pw.chromium.launch.bind(pw.chromium);
  pw.chromium.launch = async (...a) => {
    const nav = await lancerOrig(...a);
    const pages = new Set();
    const prendre = async (p) => {
      if (!p._cov) return;
      try { const r = await p._cov.send('Profiler.takePreciseCoverage'); fondre(r.result); } catch {}
    };
    const toutPrendre = async () => { await Promise.all([...pages].map(prendre)); ecrire(); };
    const suivre = async (p) => {
      try {
        const cdp = await p.context().newCDPSession(p);
        await cdp.send('Profiler.enable');
        await cdp.send('Profiler.startPreciseCoverage', { callCount: false, detailed: false });
        p._cov = cdp;
        pages.add(p);
        const t = setInterval(() => prendre(p), 3000);
        t.unref();
        p.on('close', () => { clearInterval(t); pages.delete(p); });
        for (const m of ['goto', 'reload', 'close', 'goBack', 'goForward']) {
          const orig = p[m].bind(p);
          p[m] = async (...x) => { await prendre(p); return orig(...x); };
        }
        // une navigation que le JEU déclenche (un rechargement après mise à
        // jour) : on relève dès que le nouveau document est là, et le relevé
        // périodique a pris l'ancien
        p.on('framenavigated', (fr) => { if (fr === p.mainFrame()) prendre(p); });
      } catch { /* une page non relevée laisse la suite absente de la carte pour ce fichier : prudent */ }
    };
    const envelopperContexte = (ctx) => {
      const np = ctx.newPage.bind(ctx);
      ctx.newPage = async (...x) => { const p = await np(...x); await suivre(p); return p; };
      ctx.on('page', (p) => { if (!p._cov && !pages.has(p)) suivre(p); });
      const cl = ctx.close.bind(ctx);
      ctx.close = async (...x) => { await Promise.all(ctx.pages().map(prendre)); ecrire(); return cl(...x); };
    };
    const nc = nav.newContext.bind(nav);
    nav.newContext = async (...x) => { const c = await nc(...x); envelopperContexte(c); return c; };
    const npB = nav.newPage.bind(nav);
    nav.newPage = async (...x) => { const p = await npB(...x); envelopperContexte(p.context()); await suivre(p); return p; };
    const fermer = nav.close.bind(nav);
    nav.close = async (...x) => { await toutPrendre(); return fermer(...x); };
    return nav;
  };
}

if (process.env.COUVERTURE_DIR && require.main !== module) {
  instrumenter(process.env.COUVERTURE_DIR, process.env.COUVERTURE_SUITE || path.basename(process.argv[1] || 'inconnu'));
}

// ───────────────────────── 2. la carte ─────────────────────────

const CARTE = path.join(__dirname, 'carte-couverture.json');

function git(args, opts = {}) {
  const { execFileSync } = require('child_process');
  return execFileSync('git', args, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], ...opts });
}

// Les relevés d'un ou plusieurs passages → la carte. Les relevés d'une même
// suite s'unissent ; la carte précédente, si elle est du MÊME commit, aussi
// (deux passages valent mieux qu'un). Chaque fichier retient le blob git de
// son contenu relevé : c'est ce qui permet, plus tard, de dire quelles lignes
// ont bougé depuis.
function fabriquerCarte(dossiers, sortie = CARTE) {
  // La carte décrit un commit de `origin/main` : c'est le seul qui reste un
  // ancêtre de toutes les branches à venir (une fusion par squash recrée le
  // commit de la branche). Elle se relève donc sur `origin/main`, ou sur une
  // branche dont `src/` est IDENTIQUE à `origin/main` — celle d'une livraison
  // qui ne touche que le banc, par exemple.
  const propre = !git(['status', '--porcelain', '--', 'src']).trim();
  if (!propre) throw new Error('src/ a des modifications non commitées : la carte doit décrire un commit');
  let commit = git(['rev-parse', 'HEAD']).trim();
  try {
    const main = git(['rev-parse', 'origin/main']).trim();
    if (commit !== main) {
      git(['diff', '--quiet', main, 'HEAD', '--', 'src']);   // jette si src/ diffère
      commit = main;
    }
  } catch { throw new Error('src/ diffère de origin/main : la carte ne décrirait aucun commit durable'); }
  let ancienne = null;
  try { ancienne = JSON.parse(fs.readFileSync(sortie, 'utf8')); } catch {}
  // Une carte d'un AUTRE commit garde ses relevés pour les fichiers dont le
  // contenu n'a pas bougé : c'est le même code, et l'union de deux passages
  // vaut mieux qu'un (un chemin rare vu une fois reste vu). Les fichiers qui
  // ont changé repartent de zéro.
  if (ancienne && ancienne.commit !== commit) {
    for (const [f, d] of Object.entries(ancienne.fichiers)) {
      let b = null;
      try { b = git(['rev-parse', `${commit}:${f}`]).trim(); } catch {}
      if (b !== d.blob) delete ancienne.fichiers[f];
    }
  }
  const fichiers = {};
  const suites = new Set(ancienne ? ancienne.suites : []);
  const unir = (f, suite, plages) => {
    if (!fichiers[f]) {
      const src = fs.readFileSync(path.join(RACINE, f), 'utf8');
      fichiers[f] = { blob: git(['rev-parse', `${commit}:${f}`]).trim(), lignes: debutsDeLignes(src).length, suites: {} };
    }
    const n = fichiers[f].lignes + 2;
    const acc = fichiers[f].suites[suite] || new Uint8Array(n);
    for (const [a, b] of dePlages(plages)) for (let l = a; l <= b && l < n; l++) acc[l] = 1;
    fichiers[f].suites[suite] = acc;
  };
  if (ancienne) {
    for (const [f, d] of Object.entries(ancienne.fichiers)) for (const [s, p] of Object.entries(d.suites)) unir(f, s, p);
  }
  for (const d of dossiers) {
    for (const nom of fs.readdirSync(d)) {
      if (!nom.endsWith('.json')) continue;
      let r; try { r = JSON.parse(fs.readFileSync(path.join(d, nom), 'utf8')); } catch { continue; }
      suites.add(r.suite);
      for (const [f, p] of Object.entries(r.fichiers)) unir(f, r.suite, p);
    }
  }
  for (const d of Object.values(fichiers)) for (const s of Object.keys(d.suites)) d.suites[s] = enPlages(d.suites[s]);
  const carte = {
    // ce que la carte décrit, et quand elle a été relevée
    commit, date: new Date().toISOString(),
    passages: (ancienne ? ancienne.passages : 0) + 1,
    suites: [...suites].sort(),
    fichiers,
  };
  fs.writeFileSync(sortie, JSON.stringify(carte, null, 0) + '\n');
  return carte;
}

// ───────────────────────── 3. la question de `tout.js` ─────────────────────────

// Les lignes du fichier, TELLES QU'ELLES ÉTAIENT AU COMMIT DE LA CARTE, que le
// changement courant touche. Une ligne modifiée ou retirée se compte ; une
// insertion compte les deux lignes qui l'encadrent. Rend null si git ne peut
// pas répondre — et null veut dire « on ne sait pas », jamais « rien ».
// `vers` : un commit ; sans lui, l'arbre de travail.
function lignesTouchees(commit, f, vers = null) {
  let d;
  try { d = git(['diff', '-U0', '--no-color', commit, ...(vers ? [vers] : []), '--', f]); } catch { return null; }
  const out = [];
  for (const m of d.matchAll(/^@@ -(\d+)(?:,(\d+))? \+\d+(?:,\d+)? @@/gm)) {
    const a = Number(m[1]), n = m[2] === undefined ? 1 : Number(m[2]);
    if (n === 0) out.push(a, a + 1);
    else for (let l = a; l < a + n; l++) out.push(l);
  }
  return out;
}

function lireCarte(fichier = CARTE) {
  try { return JSON.parse(fs.readFileSync(fichier, 'utf8')); } catch { return null; }
}

module.exports = { lignesExecutees, enPlages, dePlages, dansPlages, cheminDuDepot, fabriquerCarte, lignesTouchees, lireCarte, CARTE, git };

if (require.main === module) {
  const i = process.argv.indexOf('--carte');
  if (i >= 0) {
    const dossiers = process.argv.slice(i + 1);
    const c = fabriquerCarte(dossiers);
    const nf = Object.keys(c.fichiers).length;
    console.log(`🗺️  carte de couverture : ${c.suites.length} suite(s), ${nf} fichier(s), commit ${c.commit.slice(0, 7)}, passage ${c.passages}`);
  }
}
