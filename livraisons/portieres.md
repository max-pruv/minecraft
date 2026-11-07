---
titre: Les portières s'ouvrent
puces:
  - Toutes les voitures ouvrent leur portière
  - On s'assied vraiment, au volant
  - Des sièges et un volant à l'intérieur
  - La Revuelto lève ses portes vers le ciel
---
## vNEXT — Les portières s'ouvrent pour de vrai

**Pourquoi.** Max : « il y a des voitures qui n'ouvrent pas proprement la
porte… on voit la personne qui rentre et qui disparaît là-dedans ». Mesuré
sur toute la flotte : 33 modèles sur 41 refusaient leur portière (`portiere:
false`, les taxis fabriqués, la MC12) ; l'enfant marchait au travers de la
tôle. Et les refus n'étaient pas des découpes ratées : la découpe réussit
partout, mais derrière l'ouverture de douze modèles il n'y avait rien — ni
siège ni planche — et l'on aurait vu la rue au travers de la voiture.

**Ce que ça change.** Toutes les voitures ouvrent leur portière : elle pivote
vers l'extérieur, et la Revuelto et la MC12 lèvent leurs portes en élytre.
Derrière, un habitacle : plancher, sièges et banquette, console, planche et
volant, panneaux de flanc et panneau de porte, fabriqués dans la matière des
personnages et placés DANS la carrosserie mesurée de chaque modèle — seulement
ce que le modèle n'a pas. L'enfant s'accroupit devant l'ouverture, s'y glisse
de côté, la tête sous le cadre, s'assied au volant ; la portière se referme.
En descendant, l'inverse.

**Ce qui le prouve.** Trois témoins neufs, rouges sur `origin/main` :
- `degats.js` : les 41 modèles ont une portière qui s'ouvre vers l'extérieur
  ou en élytre (33 sans sur `origin/main`) ;
- `degats.js` : par l'ouverture, chaque modèle montre un siège et une planche
  (douze seraient vides sans la garniture), qui n'emploie que le matériau des
  corps sculptés — aucun programme neuf ;
- `monte.js` : sur le SUV générique, la séquence par le bouton ouvre la
  portière (60°) et l'avatar traverse le flanc dans l'ouverture, la tête sous
  le cadre, à chaque image (aucune portière sur `origin/main`).
Trois témoins de `monte.js` lisent désormais les élytres de la Revuelto et de
la MC12 et la portière de la SF90. Planches de captures avant/après de la
séquence, modèle par modèle, dans la PR.
