// LA MATRICE DE COUVERTURE, VILLE PAR VILLE (point (f) du kit « monde fidèle »).
//   node tests/sonde-couverture.cjs > docs/monde-fidele/couverture.md
// Tout se LIT dans le code, jamais ne se recopie : la trame et son tissu
// (`typoDe`), les anneaux de circulation (`anneauxDeVille`), les routes du
// registre (`ROUTES`), le ciel des monuments (`CIELS`), le climat de la
// campagne autour (`World.climat`, à r + 40 blocs dans quatre directions).
// Une ligne par ville ; le statut dit « convertie », « exclue » (la vraie
// ville n'a pas ce que la règle pose) ou « bloquée » (une décision de Max).
(async () => {
const R = require('url').pathToFileURL(require('path').join(__dirname, '../src/')).href;
const { positionDe } = await import(R + 'mondes.js');
const V = await import(R + 'villesmonde.js');
const { ROUTES } = await import(R + 'routes.js');
const { CIELS } = await import(R + 'echelle-monuments.js');
const W = await import(R + 'world.js');
const w = new W.World();
const routesDe = (cle) => ROUTES.filter((r) => r.villes.includes(cle)).map((r) => r.nom);
const climatAutour = (x, z, r) => {
  const n = {};
  for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const c = w.climat(x + dx * (r + 40), z + dz * (r + 40)) || 'tempéré';
    n[c] = (n[c] || 0) + 1;
  }
  return Object.entries(n).sort((a, b) => b[1] - a[1]).map(([c]) => c).join(', ');
};
// LES SEPT VILLES BÂTIES À LA MAIN : ce que chaque passe a fait, d'après
// CLAUDE.md (une ville bâtie à la main n'a pas de fiche commune à lire).
const MAIN = {
  paris: { rues: 'convertie (v303, v306)', circulation: '8 circuits', note: 'doublé et déplacé (v306), couche HD' },
  londres: { rues: 'convertie (v339)', circulation: 'circuits mesurés', note: 'ponts sur la Tamise (v208)' },
  ny: { rues: 'exclue (plan de Manhattan)', circulation: 'circuits du plan', note: 'son propre sol' },
  sf: { rues: 'bloquée (passe à part, dette v307)', circulation: 'circuits mesurés', note: '' },
  nice: { rues: 'bloquée (passe à part, dette v307)', circulation: 'circuits mesurés', note: '' },
  lille: { rues: 'bloquée (passe à part, dette v307)', circulation: 'circuits mesurés', note: '' },
  dc: { rues: 'bloquée (passe à part, dette v307)', circulation: 'circuits mesurés', note: '' },
};
const lignes = [];
const compte = { rues: {}, anneaux0: 0, routes: 0, ciel: 0, climats: {} };
for (const c of W.CITIES) {
  const m = MAIN[c.key] || {};
  const routes = routesDe(c.key);
  const climat = climatAutour(c.x, c.z, c.r);
  lignes.push([c.name, 'à la main', '—', m.rues || '?', m.circulation || '?', routes.join(', ') || '—', CIELS[c.name] ? 'oui' : (c.key === 'paris' ? 'oui (v335)' : '—'), climat]);
  if (routes.length) compte.routes++;
  const k = (m.rues || '?').split(' ')[0]; compte.rues[k] = (compte.rues[k] || 0) + 1;
  compte.climats[climat.split(',')[0]] = (compte.climats[climat.split(',')[0]] || 0) + 1;
}
for (const f of V.VILLES_MONDE) {
  const p = positionDe(f.cle);
  const nom = p ? p.nom : f.cle;
  const typo = V.typoDe(f);
  const medina = typo === 'medina' || (f.trame && f.trame.ruelles);
  const rues = !f.trame ? 'exclue (sans trame : un site, pas une ville)'
    : medina ? 'exclue (médina : ruelles)' : 'convertie (v307)';
  const anneaux = V.anneauxDeVille(f).formes;
  const routes = routesDe(f.cle);
  const climat = climatAutour(f.ancre.x, f.ancre.z, f.rayon);
  lignes.push([nom, 'engendrée', typo || '—', rues, `${anneaux.length} anneau(x)`, routes.join(', ') || '—', CIELS[nom] ? 'oui (v342)' : '—', climat]);
  const k = rues.split(' ')[0]; compte.rues[k] = (compte.rues[k] || 0) + 1;
  if (!anneaux.length) compte.anneaux0++;
  if (routes.length) compte.routes++;
  if (CIELS[nom]) compte.ciel++;
  compte.climats[climat.split(',')[0]] = (compte.climats[climat.split(',')[0]] || 0) + 1;
}
const total = lignes.length;
console.log(`# La matrice de couverture, ville par ville

Engendrée par \`node tests/sonde-couverture.cjs\` — tout se lit dans le code
(trame, anneaux, routes, ciel des monuments, climat). On la refait à chaque
livraison qui change une colonne ; on ne la corrige pas à la main.

**${total} villes.** Rues à la règle du kit : ${Object.entries(compte.rues).map(([k, n]) => `${n} ${k}`).join(', ')}.
Sans aucun anneau de circulation : ${compte.anneaux0}. Reliées par une route
interurbaine : ${compte.routes}. Monuments à la hauteur de leur ville (ciel
propre, hors Paris) : ${compte.ciel}. Climat de la campagne autour :
${Object.entries(compte.climats).map(([k, n]) => `${k} ${n}`).join(', ')}.

| Ville | Bâtie | Tissu | Rues au kit | Circulation | Routes | Ciel des monuments | Campagne autour |
| --- | --- | --- | --- | --- | --- | --- | --- |
${lignes.map((l) => '| ' + l.join(' | ') + ' |').join('\n')}
`);
})();
