# Livraisons en attente de numéro

Une branche n'écrit **jamais** de numéro de version : ni `CACHE_VERSION` dans
`sw.js`, ni la tête de `CHANGELOG.md`, ni la tête de `src/nouveautes.js`. Elle
dépose ici **un fichier par livraison**, nommé d'après son sujet
(`portieres.md`, `echelle-villes.md`…). Deux branches ajoutent deux fichiers
différents, et leurs fusions ne se gênent plus.

Après la fusion sur `main`, le workflow `Numérotation`
(`.github/workflows/numerotation.yml`, script `scripts/numeroter.mjs`) donne le
numéro suivant, insère les entrées, monte `CACHE_VERSION`, supprime ce fichier
et pousse le tout sur `main`. Vercel déploie ce commit-là.

## Format

```markdown
---
titre: Les portières s'ouvrent
puces:
  - On voit la portière s'ouvrir
  - Le passager monte par la sienne
---
## vNEXT — Les portières s'ouvrent pour de vrai

**Pourquoi.** …

**Ce que ça change.** …

**Ce qui le prouve.** …
```

- **En-tête** : le journal du jeu, pour un enfant de sept ans. Titre de six
  mots au plus, puces de huit mots au plus (les règles de `tests/maj.js`).
- **Texte** : l'entrée du `CHANGELOG.md`, qui commence par `## vNEXT — `.
- **`vNEXT` ailleurs** (`CLAUDE.md`, `TASKS.md`, un commentaire) : il est
  remplacé par le vrai numéro sur les lignes que la même fusion ajoute.
- Vérifier avant de pousser : `node scripts/numeroter.mjs --verifier`.
