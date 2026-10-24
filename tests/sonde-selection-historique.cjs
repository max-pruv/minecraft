// CE QUE LA SÉLECTION À LA LIGNE AURAIT JOUÉ SUR LES DERNIÈRES LIVRAISONS.
//
// Une estimation, et elle le dit. Pour chaque commit de `origin/main`, on
// prend le changement qu'il a porté (c~1 → c) et l'on demande à la carte de
// couverture quels gardiens exécutent les lignes qu'il touche. La carte décrit
// un commit PLUS RÉCENT : les lignes ajoutées par c se retrouvent dans la carte
// par leur TEXTE (une correspondance unique, sinon le fichier retombe sur la
// table). Les durées sont celles mesurées au portail complet (commentaires de
// `SUITES`). La fumée (≈ 1 min) s'ajoute aux deux côtés.
//
//     node tests/sonde-selection-historique.cjs [nombre de commits]

const { execFileSync } = require('child_process');
const path = require('path');
const T = require('./tout.js');
const C = require('./couverture.js');

const RACINE = path.resolve(__dirname, '..');
const git = (a) => execFileSync('git', a, { cwd: RACINE, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 1 << 28 });
const carte = C.lireCarte();
if (!carte) { console.log('pas de carte : npm run couverture'); process.exit(1); }
const workers = T.fermetureDesWorkers(RACINE);
const n = Number(process.argv[2] || 25);
const commits = git(['log', '--format=%h %s', `-${n}`, carte.commit]).trim().split('\n').slice(1);
const textesCarte = {};
const lignesDeCarte = (f) => {
  if (!textesCarte[f]) {
    const m = new Map();
    git(['show', `${carte.commit}:${f}`]).split('\n').forEach((l, i) => {
      const k = l.trim();
      if (k.length < 12) return;
      m.set(k, m.has(k) ? -1 : i + 1);
    });
    textesCarte[f] = m;
  }
  return textesCarte[f];
};
const duree = (liste) => liste.reduce((t, s) => t + (T.DUREE_MESUREE[s] || 60), 0) / 60;

let totAvant = 0, totApres = 0;
for (const ligne of commits) {
  const [c, ...titre] = ligne.split(' ');
  const fichiers = git(['diff', '--name-only', `${c}~1`, c]).trim().split('\n').filter(Boolean);
  let tout = false;
  const avant = new Set(), apres = new Set(), notes = [];
  for (const f of fichiers) {
    if (['tests/banc.js', 'tests/nuage.js', 'tests/charge.js'].includes(f)) { tout = true; notes.push(`${f}: banc`); continue; }
    if (f === 'tests/tout.js') continue;            // le plus souvent la table seule (gardiens élargis)
    if (f === 'sw.js') continue;
    const suite = f.match(/^tests\/([\w-]+\.js)$/);
    if (suite && T.SUITES.includes(suite[1])) { avant.add(suite[1]); apres.add(suite[1]); continue; }
    const g = T.GARDIENS[f];
    if (!g) continue;
    g.forEach((s) => avant.add(s));
    const fiche = carte.fichiers[f];
    if (workers.has(f) || !fiche) { g.forEach((s) => apres.add(s)); notes.push(`${f}: table`); continue; }
    // lignes ajoutées par c, retrouvées dans la carte par leur texte
    const d = git(['diff', '-U1', '--no-color', `${c}~1`, c, '--', f]);
    const idx = lignesDeCarte(f);
    const touchees = [];
    let perdues = 0;
    for (const l of d.split('\n')) {
      if (!/^[+ ]/.test(l) || l.startsWith('+++')) continue;
      if (l[0] === ' ' ) continue;
      const k = l.slice(1).trim();
      if (k.length < 12) continue;
      const v = idx.get(k);
      if (v > 0) touchees.push(v); else perdues++;
    }
    // un hunk de pur retrait : sa ligne de contexte suivante
    for (const h of d.split(/^@@/m).slice(1)) {
      if (/\n\+/.test(h)) continue;
      const ctx = h.split('\n').find((l) => l.startsWith(' ') && l.trim().length >= 12);
      const v = ctx && idx.get(ctx.slice(1).trim());
      if (v > 0) touchees.push(v); else perdues++;
    }
    if (perdues > touchees.length) { g.forEach((s) => apres.add(s)); notes.push(`${f}: table (${perdues} lignes introuvables)`); continue; }
    const { garde, saute } = T.decider(f, g, touchees, fiche, carte.suites, T.LECTURES_TEXTE, () => d, C);
    garde.forEach((s) => apres.add(s));
    if (saute.length) notes.push(`${f}: −${saute.join(' −')}`);
  }
  const A = tout ? T.SUITES : T.SUITES.filter((s) => avant.has(s));
  const B = tout ? T.SUITES : T.SUITES.filter((s) => apres.has(s));
  totAvant += duree(A) + 1; totApres += duree(B) + 1;
  console.log(`${c} ${titre.join(' ').slice(0, 48).padEnd(48)} ${String(Math.round(duree(A) + 1)).padStart(4)} → ${String(Math.round(duree(B) + 1)).padStart(4)} min`
    + `   ${notes.join(' · ').slice(0, 180)}`);
}
console.log(`\ntotal sur ${commits.length} livraisons : ${Math.round(totAvant)} → ${Math.round(totApres)} min`
  + ` (${Math.round((1 - totApres / totAvant) * 100)} % de moins)`);
