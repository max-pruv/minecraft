#!/usr/bin/env node
// LE NUMÉRO DE VERSION SE DONNE APRÈS LA FUSION, PAS AVANT.
//
// Plusieurs sessions travaillent en même temps. Tant que chacune écrivait son
// numéro (`CACHE_VERSION` de sw.js, la tête de CHANGELOG.md, la tête de
// src/nouveautes.js), deux branches parties de la v590 écrivaient toutes deux
// v591 aux trois mêmes endroits : conflit à chaque fusion, et la seconde
// devait tout renuméroter à la main.
//
// Désormais une branche ne touche à AUCUN de ces trois endroits. Elle dépose
// un fichier dans `livraisons/` (voir livraisons/README.md) : le titre et les
// puces du journal du jeu, puis l'entrée du CHANGELOG, avec `vNEXT` à la place
// du numéro. Deux branches déposent deux fichiers différents : aucun conflit.
//
// Après la fusion, le workflow `numerotation.yml` lance ce script sur `main` :
// chaque livraison en attente reçoit le numéro suivant (dans l'ordre où elles
// sont arrivées sur main), son entrée est insérée en tête de CHANGELOG.md et de
// src/nouveautes.js, `CACHE_VERSION` monte, `vNEXT` est remplacé dans les
// lignes que la même fusion a ajoutées (CLAUDE.md, TASKS.md…), et le fichier
// de livraison disparaît.
//
//   node scripts/numeroter.mjs --verifier   lit et valide, n'écrit rien
//   node scripts/numeroter.mjs --appliquer  numérote (utilisé par le workflow)
//
// Sans dépendance : node seul.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RACINE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DOSSIER = path.join(RACINE, 'livraisons');
const JETON = 'vNEXT';

const lire = (f) => fs.readFileSync(path.join(RACINE, f), 'utf8');
const ecrire = (f, t) => fs.writeFileSync(path.join(RACINE, f), t);
const git = (...a) => {
  try { return execFileSync('git', a, { cwd: RACINE, encoding: 'utf8' }).trim(); }
  catch { return ''; }
};
const mots = (s) => s.trim().split(/\s+/).filter(Boolean).length;

// Une livraison : un en-tête (titre et puces du journal du jeu), puis le texte
// du CHANGELOG, qui commence par `## vNEXT — …`.
export function lireLivraison(texte, nom = '?') {
  const erreurs = [];
  const m = texte.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!m) return { erreurs: [`${nom} : en-tête « --- … --- » introuvable en tête du fichier`] };
  let titre = null;
  const puces = [];
  let dansPuces = false;
  for (const ligne of m[1].split('\n')) {
    if (!ligne.trim() || ligne.trim().startsWith('#')) continue;
    const t = ligne.match(/^titre:\s*(.+)$/);
    if (t) { titre = t[1].trim().replace(/^["']|["']$/g, ''); dansPuces = false; continue; }
    if (/^puces:\s*$/.test(ligne)) { dansPuces = true; continue; }
    const p = ligne.match(/^\s+-\s+(.+)$/);
    if (p && dansPuces) { puces.push(p[1].trim().replace(/^["']|["']$/g, '')); continue; }
    erreurs.push(`${nom} : ligne d'en-tête non comprise : « ${ligne} »`);
  }
  const corps = m[2].replace(/^\n+/, '').replace(/\s*$/, '\n');
  // Les règles que tests/maj.js applique au journal du jeu.
  if (!titre) erreurs.push(`${nom} : « titre: » manquant`);
  else if (mots(titre) > 6) erreurs.push(`${nom} : titre de ${mots(titre)} mots (six au plus)`);
  if (!puces.length) erreurs.push(`${nom} : aucune puce`);
  for (const p of puces) if (mots(p) > 8) erreurs.push(`${nom} : puce de ${mots(p)} mots (huit au plus) : « ${p} »`);
  if (!corps.startsWith(`## ${JETON} — `)) erreurs.push(`${nom} : le texte doit commencer par « ## ${JETON} — <titre> »`);
  if (/^## v\d+/m.test(corps)) erreurs.push(`${nom} : un numéro écrit à la main (« ## vNNN ») — écris ${JETON}`);
  return { titre, puces, corps, erreurs };
}

function livraisonsEnAttente() {
  if (!fs.existsSync(DOSSIER)) return [];
  return fs.readdirSync(DOSSIER)
    .filter((f) => f.endsWith('.md') && f.toLowerCase() !== 'readme.md')
    .map((f) => {
      const rel = `livraisons/${f}`;
      // Le commit qui a ajouté la livraison : c'est la fusion de sa PR (squash).
      const sha = git('log', '--diff-filter=A', '--format=%H', '-1', '--', rel);
      const quand = +git('log', '--diff-filter=A', '--format=%ct', '-1', '--', rel)
        || fs.statSync(path.join(DOSSIER, f)).mtimeMs / 1000;
      return { fichier: rel, sha, quand };
    })
    .sort((a, b) => a.quand - b.quand || a.fichier.localeCompare(b.fichier));
}

// `vNEXT` dans les autres fichiers (CLAUDE.md, TASKS.md, un commentaire…) se
// remplace seulement sur les lignes que LA MÊME fusion a ajoutées : deux
// livraisons en attente ne se volent pas leurs numéros.
function remplacerJetons(sha, n) {
  if (!sha) return [];
  const touches = [];
  const fichiers = git('show', '--format=', '--name-only', sha).split('\n').filter(Boolean)
    .filter((f) => !f.startsWith('livraisons/') && fs.existsSync(path.join(RACINE, f)));
  for (const f of fichiers) {
    const diff = git('show', '--format=', '--unified=0', sha, '--', f);
    const ajoutees = diff.split('\n')
      .filter((l) => l.startsWith('+') && !l.startsWith('+++') && l.includes(JETON))
      .map((l) => l.slice(1));
    if (!ajoutees.length) continue;
    const lignes = lire(f).split('\n');
    let change = false;
    for (const a of ajoutees) {
      const i = lignes.indexOf(a);
      if (i < 0) continue;
      lignes[i] = lignes[i].replaceAll(JETON, `v${n}`);
      change = true;
    }
    if (change) { ecrire(f, lignes.join('\n')); touches.push(f); }
  }
  return touches;
}

function versionActuelle() {
  const m = lire('sw.js').match(/CACHE_VERSION = 'web-minecraft-v(\d+)'/);
  if (!m) throw new Error('CACHE_VERSION introuvable dans sw.js');
  return +m[1];
}

function main() {
  const mode = process.argv[2];
  if (mode !== '--verifier' && mode !== '--appliquer') {
    console.error('usage : node scripts/numeroter.mjs --verifier | --appliquer');
    process.exit(2);
  }
  const attente = livraisonsEnAttente();
  const lues = attente.map((l) => ({ ...l, ...lireLivraison(lire(l.fichier), l.fichier) }));
  const erreurs = lues.flatMap((l) => l.erreurs);
  if (erreurs.length) {
    for (const e of erreurs) console.error(`❌ ${e}`);
    process.exit(1);
  }
  if (!lues.length) { console.log('Aucune livraison en attente.'); return; }

  let n = versionActuelle();
  if (mode === '--verifier') {
    for (const l of lues) console.log(`✅ ${l.fichier} → recevra v${++n} : ${l.titre}`);
    return;
  }

  let changelog = lire('CHANGELOG.md');
  let journal = lire('src/nouveautes.js');
  const faites = [];
  for (const l of lues) {
    n += 1;
    const entree = l.corps.replaceAll(JETON, `v${n}`);
    const tete = changelog.search(/^## v\d+/m);
    changelog = tete < 0 ? `${changelog.trimEnd()}\n\n${entree}` : `${changelog.slice(0, tete)}${entree}\n${changelog.slice(tete)}`;
    const ouverture = 'export const NOUVEAUTES = [\n';
    const i = journal.indexOf(ouverture);
    if (i < 0) throw new Error('src/nouveautes.js : « export const NOUVEAUTES = [ » introuvable');
    const bloc = `  {\n    v: ${n},\n    titre: ${JSON.stringify(l.titre)},\n    puces: [\n${l.puces.map((p) => `      ${JSON.stringify(p)},`).join('\n')}\n    ],\n  },\n`;
    journal = journal.slice(0, i + ouverture.length) + bloc + journal.slice(i + ouverture.length);
    const autres = remplacerJetons(l.sha, n);
    fs.unlinkSync(path.join(RACINE, l.fichier));
    faites.push({ n, titre: l.titre, fichier: l.fichier, autres });
  }
  ecrire('CHANGELOG.md', changelog);
  ecrire('src/nouveautes.js', journal);
  ecrire('sw.js', lire('sw.js').replace(/CACHE_VERSION = 'web-minecraft-v\d+'/, `CACHE_VERSION = 'web-minecraft-v${n}'`));
  for (const f of faites) {
    console.log(`v${f.n} — ${f.titre} (${f.fichier}${f.autres.length ? ` ; ${JETON} remplacé dans ${f.autres.join(', ')}` : ''})`);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
