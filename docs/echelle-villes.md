# L'échelle des villes — ce que Paris mesure, et ce qui était faux (v589)

Max, trois captures d'iPhone à pied dans une rue de Paris : les passants
paraissent grands par rapport aux immeubles — un adulte arrive presque en haut
du rez-de-chaussée, les stores et le haut des vitrines sont juste au-dessus des
têtes, une vitrine fait la hauteur d'un adulte. Sa conclusion : les bâtiments
sont trop petits. **Tout a été mesuré avant d'écrire une ligne**, dans le jeu
rendu, avec deux sondes rejouables :

- `tests/sonde-echelle-paris.mjs` : sous node, le voxel (`batirColonneParis`)
  et la couche HD (les tampons que la tablette dessine, `buildChunkTampons`),
  colonne de façade par colonne de façade, plus le mobilier ;
- `tests/sonde-echelle-captures.cjs` : dans le jeu, à pied, première personne,
  l'œil, les passants, la voiture et la façade devant soi, puis les captures
  (iPhone 430 × 932 et iPad 820 × 1180, jour et nuit, à pied et du ciel).

Les chiffres « avant » sont ceux d'`origin/main` (v587), les « après » ceux de
cette branche, même sonde, même site : une colonne de six niveaux à vitrine et
une à porte cochère au nord du centre de Paris.

## Deux échelles, et c'est voulu

À la VERTICALE un bloc vaut un mètre (depuis la v301 : un étage fait trois
blocs). Au SOL, dans Paris doublé, un bloc vaut environ vingt mètres (48 blocs
par kilomètre, v306) : une rue qui fait cinq blocs de chaussée en vaut cent
mètres sur le plan, et c'est l'entorse assumée de tout le jeu (voir « Deux
échelles dans la même ville » dans `CLAUDE.md`). Ce document ne juge donc que
les HAUTEURS, en mètres, et les largeurs de ce qui est à l'échelle du joueur
(une voiture, une chaise, une porte). Largeurs de rue, de trottoir et d'îlot
sont des longueurs de plan, hors de ce chantier.

## Le tableau

Hauteurs en mètres au-dessus du trottoir. « Réel » est la fourchette de
`REEL` dans `src/echelle-ville.js`, sourcée plus bas. L'écart est pris contre
le bord le plus proche de la fourchette (zéro si dedans).

| Élément | Avant (v587) | Après | Réel | Écart avant | Écart après |
| --- | --- | --- | --- | --- | --- |
| Œil du joueur debout | 1,63 | 1,63 | 1,50–1,70 | 0 % | 0 % |
| Passant adulte | 1,76 (quelques-uns 1,52) | inchangé | 1,60–1,85 | 0 % | 0 % |
| Enfant (Marlon, Alice) | 1,48 | inchangé | 1,15–1,50 | 0 % | 0 % |
| Voiture (Rolls-Royce Ghost) hauteur × longueur | 1,67 × 5,76 | inchangé | 1,57 × 5,55 (fiche constructeur) | +6 % / +4 % | idem |
| Rez-de-chaussée visible (voxel) | 2 (3 rangs dont 1 enterré) | 4 (socle enterré + 4 rangs, enseigne comprise) | 3,5–4,5 | **−43 %** | 0 % |
| Haut du vitrage d'une devanture (HD) | 1,35 | 3,0 | 2,5–3,2 | **−46 %** | 0 % |
| Bandeau d'enseigne (HD) | 1,37 → 1,70 | 3,14 → 3,56 | 3,0–3,8 | **−54 %** | 0 % |
| Attache du store banne (HD) | 1,72 | 3,14 | 2,6–3,3 | **−34 %** | 0 % |
| Porte cochère, haut du bois (HD) | 0,84 | 2,84 | 3,0–4,0 | **−72 %** | −5 % |
| Entresol (voxel) | 2 | 3 | 2,5–3,2 | **−20 %** | 0 % |
| Étage courant (voxel) | 3 | 3 | 2,8–3,5 | 0 % | 0 % |
| Corniche, haut de la pierre lisse (HD, 6 niveaux) | 17,0 | 20,0 | 17,55–20,0 | −3 % | 0 % |
| Faîte du comble (HD, zinc) | 19,75 | 22,75 | 20–26 | −1 % | 0 % |
| Plaque de rue (HD) | 2,5 → 2,86 | 4,5 → 4,86 | ≈ 2,5–3,5 | 0 % | **+29 %** (dette) |
| Réverbère (`props.js`) | ≈ 3,0 | inchangé | 3,5–4,5 | −14 % (dette) | idem |
| Potelet (HD) | 1,0 | inchangé | 0,9–1,2 | 0 % | 0 % |
| Chaise de terrasse, dossier (HD) | 0,96 | inchangé | 0,85–0,95 | +1 % | idem |
| Banc Davioud, dossier (HD) | 1,0 | inchangé | 0,9–1,1 | 0 % | 0 % |
| Colonne Morris (HD) | 2,8 | inchangée | 3,5–4,5 | −20 % (dette) | idem |

Ce que le tableau dit : **les personnages, l'œil, les voitures et le mobilier
étaient à l'échelle ; ce qui était faux, c'est le bâti, et d'un tiers à
trois quarts sur tout ce qu'un passant a devant les yeux.** La cause est
dans la convention du bâtisseur : `poser(dy, id)` écrit à `wy = h + dy − 1`
et le trottoir est à `h`, donc le premier rang de toute façade est ENTERRÉ.
Le rez-de-chaussée « de trois blocs » n'en montrait que deux, et l'enseigne
tombait à 1,4 m. Le remède est une table d'échelle partagée
(`src/echelle-ville.js`) : un socle de pierre au ras du trottoir, puis quatre
rangs de rez-de-chaussée (trois de vitrage, un d'enseigne), trois d'entresol,
trois par étage. Une façade de six niveaux passe de 17 à 20 blocs de
corniche, exactement la règle de 1859.

## Ce que ça coûte

Mesuré sous node sur 49 morceaux autour du centre de Paris, détail fabriqué :
façades HD 42,0 → 45,8 Mo (+9 %), tout compris 49,3 → 53,4 Mo, pire morceau
6,0 → 6,56 Mo, voxel inchangé (3,63 Mo). Sous le budget du palier
(`hdMo` 128, v299 ; `mondeMo` 224, v580). Le relief ne bouge pas (les deux
empreintes de `plafond.js`) ; l'empreinte des 490 morceaux se prouve avec le
bâtisseur désarmé (`reglageEchelleParis.actif = false`) : `ed369fdb…` des
deux côtés.

## Les captures

Dans ce dossier, même site, même cap, même heure : `avant-*` sur `origin/main`,
`apres-*` sur la branche.

| vue | avant | après |
| --- | --- | --- |
| iPhone, à pied, terrasse de côté, jour | `avant-iphone-terrasse.png` | `apres-iphone-terrasse.png` |
| iPhone, terrasse de face | `avant-iphone-terrasse-face.png` | `apres-iphone-terrasse-face.png` |
| iPhone, nuit | `avant-iphone-terrasse-nuit.png` | `apres-iphone-terrasse-nuit.png` |
| iPhone, du ciel | `avant-iphone-aerien.png` | `apres-iphone-aerien.png` |
| iPad, terrasse | `avant-ipad-terrasse.png` | `apres-ipad-terrasse.png` |

Ce qu'on y voit : avant, le haut de la vitrine arrive au dossier des chaises
et l'enseigne à hauteur de tête ; après, la vitrine fait trois mètres
au-dessus des chaises, l'enseigne est au-dessus des têtes, la porte cochère
fait trois mètres. Le store banne n'est pas visible sur la terrasse des
captures (dette ci-dessous).

**Photo de référence** (non recopiée dans le dépôt : Wikimedia Commons
refusait le téléchargement automatisé le jour de la livraison) :
*Terrasse du café, Paris, 30 juillet 2010*, par zoetnet, licence CC BY 2.0,
<https://commons.wikimedia.org/wiki/File:Terrasse_du_caf%C3%A9,_Paris_July_30,_2010.jpg>.
On y lit ce que le tableau mesure : les chaises à mi-hauteur de la vitrine,
le store au-dessus des têtes, l'enseigne au-dessus du store.

## Les sources des dimensions réelles

- Stature : INSEE / ANSES, campagne de mensuration 2006 — 1,76 m pour un
  homme adulte, 1,63 m pour une femme ; un enfant de 7 à 10 ans entre 1,15 et
  1,50 m. Œil debout ≈ stature − 0,12.
- Rez-de-chaussée haussmannien ≈ 4 m, entresol bas (2,5–3,2 m), étage noble
  3,20–3,50 m, étages courants 2,80–3,20 m : « Immeuble haussmannien »,
  Wikipédia (fr).
- Hauteur de façade : 54 pieds (17,55 m) depuis la lettre patente de 1784 ;
  20 m pour les rues de 20 m et plus par le décret du 27 juillet 1859 ;
  « Transformations de Paris sous le Second Empire », Wikipédia (fr).
- Porte cochère : « au moins 3,50 m de hauteur » pour laisser passer une
  voiture attelée (J. J. Storck, cité par « Porte cochère », Wikipédia fr) ;
  3 m est le bas des portes de boutique à deux vantaux.
- Devanture : vitrage de 2,5 à 3,2 m, bandeau d'enseigne au-dessus, store
  banne attaché à 2,6–3,3 m — règlement des devantures de la Ville de Paris
  (« Règlement municipal relatif aux enseignes et devantures »).
- Banc Davioud : 2,25 m de long, dossier à un mètre (« Banc Davioud »,
  Wikipédia fr).
- Colonne Morris : 1868, environ 4 m de haut avec son dôme (« Colonne
  Morris », Wikipédia fr).
- Candélabre parisien : 3,5 à 4,5 m pour une lanterne de rue (mobilier
  d'éclairage de la Ville de Paris, modèles « Haussmann »).
- Rolls-Royce Ghost (2020) : 5,55 m × 1,98 m × 1,57 m, fiche constructeur.

## Les autres villes, mesurées à leur bâtisseur

Même lecture (le rang `dy = 1` est enterré partout), sans correction dans
cette livraison :

| ville | ce que le bâtisseur écrit | RDC visible | étage | à faire |
| --- | --- | --- | --- | --- |
| villes engendrées (Rome, Tokyo…, `villesmonde.js`) | rang 1 enterré (DARKPLANK ou VITRINE), VITRINE, enseigne « Rayures », puis étages × 3 | 2 m | 3 m | un socle et un rang de RDC de plus : +2 m, et une marche de migration (toits) |
| Nice, Lille | étages de DEUX blocs (Uni, ETAGE alternés), 5–6 rangs | 1 m | 2 m | étages 2 → 3, RDC, migration propre à chaque ville |
| San Francisco | 5–6 rangs, étages de 2 m | 1 m | 2 m | idem |
| Washington | maisons de 7 rangs, musées de 15 blocs | 1 m | — | maisons à revoir (une maison de 7 m pour trois niveaux), musées justes |
| Londres | bâti colonne par colonne, mêmes blocs ARCHI | 2 m | 3 m | socle + RDC, migration |
| Manhattan (OSM, v583) | étages de 3 unités, profil mesuré | à mesurer | 3 m | mesurer au rendu (le proche vient de modèles et de façades procédurales) |

Chaque ville dont le bâti grandit a sa marche de migration datée, comme
Paris : une cabane posée sur un toit suit le toit. Tout est déclaré dans
`TASKS.md`.
