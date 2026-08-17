#!/bin/bash
# Ce que le conteneur oublie à chaque recyclage, et qu'il faut lui rendre.
#
# POURQUOI CE CROCHET EXISTE. Le conteneur de session a été recréé SEPT fois en
# deux jours, chaque fois sur un vieux commit (v138), pendant que la production
# servait v158. Sans lui, chaque session commence sur un dépôt vieux de vingt
# versions : on lit du code qui n'existe plus, on « corrige » des défauts déjà
# corrigés, et il faut s'en apercevoir avant de faire des dégâts. Deux fois,
# cela s'est vu au bout de plusieurs minutes de travail perdu.
#
# Il rend donc deux choses : la bonne révision, et les dépendances du banc.
set -uo pipefail

DEPOT="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
cd "$DEPOT" || exit 0
BRANCHE="claude/web-minecraft-replica-f0wk4b"

echo "→ dépôt : $(git log --oneline -1 2>/dev/null)"

# ---- 1. la bonne révision ---------------------------------------------------
#
# Trois garde-fous, dans cet ordre. Aucun n'est optionnel : ce crochet tourne
# sans personne pour le regarder, et il ne doit JAMAIS détruire du travail.
if ! git fetch --quiet origin main 2>/dev/null; then
  echo "⚠️  git fetch a échoué — on ne touche à rien"
else
  LOCAL="$(git rev-parse HEAD)"
  DISTANT="$(git rev-parse origin/main)"
  SALE="$(git status --porcelain 2>/dev/null)"
  DEVANT="$(git log --oneline "origin/main..HEAD" 2>/dev/null)"

  if [ "$LOCAL" = "$DISTANT" ] && [ -z "$SALE" ]; then
    echo "✅ déjà sur la dernière version"
  elif [ -n "$DEVANT" ]; then
    # La branche porte des commits que main n'a pas : c'est du travail en
    # cours, pas un conteneur périmé. On n'y touche sous aucun prétexte.
    echo "⚠️  la branche a $(echo "$DEVANT" | wc -l) commit(s) non fusionné(s) — on n'y touche pas"
  elif [ "$LOCAL" = "$DISTANT" ]; then
    echo "✅ à jour (des fichiers sont modifiés, ils restent tels quels)"
  else
    # ON NE DÉTRUIT RIEN, MAIS ON NE SE LAISSE PAS BLOQUER NON PLUS.
    #
    # Le conteneur périmé revient systématiquement avec un fichier modifié —
    # `src/nice.js`, les deux fois observées. Un garde-fou qui refuse d'agir
    # dès qu'un fichier a bougé ne se déclencherait donc JAMAIS dans le seul
    # cas qui compte. Ces modifications-là sont posées sur une base vieille de
    # vingt versions : elles ne valent presque sûrement rien.
    #
    # « Presque sûrement » ne suffit pas pour effacer. On les range donc dans
    # une remise datée : `git stash list` les retrouve, rien n'est perdu, et la
    # session démarre quand même sur le bon code.
    if [ -n "$SALE" ]; then
      git stash push -u -q -m "résidu de conteneur $(date -u +%Y-%m-%dT%H:%M)" 2>/dev/null \
        && echo "📦 modifications mises de côté (git stash list pour les revoir)"
    fi
    git checkout -q -B "$BRANCHE" origin/main \
      && echo "🔄 conteneur périmé : récupéré sur $(git log --oneline -1)"
  fi
fi

# ---- 2. les dépendances du banc ---------------------------------------------
#
# Sans elles, `npm test` échoue sur un message d'import et non sur un défaut du
# jeu — le genre d'échec qu'on met dix minutes à ne pas comprendre.
if [ -d tests ] && [ ! -d tests/node_modules ]; then
  echo "→ installation des dépendances du banc d'essai…"
  (cd tests && npm install --no-audit --no-fund 2>&1 | tail -2)
fi

# ---- 3. ce qui était en cours ------------------------------------------------
#
# La liste des tâches vit dans le conteneur : elle part avec lui. TASKS.md, lui,
# est dans le dépôt et survit.
[ -f TASKS.md ] && echo "→ en cours : $(grep -c '^- \[ \]' TASKS.md 2>/dev/null || echo 0) tâche(s) ouverte(s) dans TASKS.md"

exit 0
