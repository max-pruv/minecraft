---
titre: La lumière devient vraie
puces:
  - Les fenêtres et les lampes brillent la nuit
  - Le soleil se voit dans le ciel
  - Une brume douce au loin et le soir
---
## vNEXT — La lumière se développe : exposition, bloom, ciel qui diffuse

**Pourquoi.** Le jeu dessinait chaque pixel une fois, tel quel : la même
exposition à midi et à minuit, des vitres allumées qui restaient des carrés
blancs sans lueur, un ciel à deux couleurs sans soleil dedans, et un lointain
sans air entre lui et nous. Max veut le plus grand pas de réalisme que le
moteur actuel puisse faire par milliseconde, sans que le vieil iPad paie rien.

**Ce que ça change.** L'image se compose en couleurs étendues puis se
développe comme une photo : l'exposition et la balance suivent l'heure (plus
d'exposition la nuit, une lumière chaude quand le soleil rase, froide la nuit),
les vitres, les lanternes, les feux et les phares débordent d'une lueur la
nuit, le soleil se lit dans la brume du lointain, une brume de hauteur se dépose
dans les vallées au crépuscule, et le ciel porte la diffusion de son soleil et
une bande claire à l'horizon. Le palier décide du post-traitement : rien au
palier bas (le dôme qui diffuse, lui, est à tout palier : un dessin, rien à
payer), un niveau au palier moyen, deux au palier haut ; le rendu logiciel le coupe comme les
ombres. `?postfx=0|1|2` force, `?bloom=`, `?expo=`, `?lueur=`, `?brume=`
règlent pour mesurer, et `?diag=1` dit ce que ça coûte sur l'appareil.

**Ce qui le prouve.** Six témoins dans `parishd.js` : la fiche du palier, la
règle du niveau (logiciel, palier, adresse), aucun programme qui naît à la
nuit tombée ni à l'arrivée dans Paris sous le post-traitement (la chauffe
compile avec la cible posée), le bloom qui ajoute de la lumière la nuit sans en
retirer nulle part (environ 3 % des pixels éclaircis une fois la ville
chargée — 1,8 % à l'arrivée, ce qui a fait rougir le témoin une fois —, zéro
assombri), et la parité de
jour avec l'ancien chemin (luminance à 1 % près) ; et le témoin de la voûte du
ciel (`monte.js`) lit désormais le ciel loin du soleil — à midi, le haut de
l'écran est dans son auréole, qui est justement ce que le dôme ajoute. Revue
d'écran avant et après
sur Paris, la tour Eiffel, la campagne, le vol libre et Manhattan, iPhone et
iPad, jour et nuit, dans la PR.
