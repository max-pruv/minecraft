---
titre: Les passants bougent pour de vrai
puces:
  - Une vraie marche, filmée sur des gens
  - Ils courent, flânent et attendent
  - Chacun garde sa façon d'attendre
---
## vNEXT — Les passants bougent comme de vraies personnes

**Pourquoi.** Chantier « réalisme » 5 sur 5. Depuis la v241 les passants ont
des corps réalistes (Rocketbox), mais leur marche était dessinée à la main : un
balancier de bras et de jambes, raide, le même pour tout le monde, qui faisait
reconnaître un jeu au premier regard. Max, sur la vitrine : bras et pieds à
reprendre.

**Ce que ça change.** Les passants, les habitants et l'avatar à pied jouent des
mouvements capturés sur de vraies personnes (base CMU de Carnegie Mellon,
crédit dans `vendor/humains/LICENSE.md`) : marche, marche lente, course et deux
attentes. Chacun garde son attitude (tirée de sa graine), on passe d'une prise à
l'autre en fondu, et les pieds restent au sol. Un seul fichier immuable de
53 Ko (`vendor/humains/mouvements-v1.bin`), produit hors ligne par
`scripts/convertir-mouvements.mjs`. Les mouvements sont reciblés au chargement,
une fois par corps, jamais pendant une image. La taille des corps ne change pas
(sommet du crâne 1,73 à 1,75 m debout contre 1,76 en marche dessinée, la
posture réelle). La marche dessinée reste le repli tant que le fichier n'est
pas arrivé.

**Ce qui le prouve.** Six témoins dans `tests/realisme.js` : capture jouée
(marche et attente), clips partagés par corps, pieds au sol en marchant, en
courant et à l'arrêt, attitudes variées dans la rue, aucun programme neuf,
moins de 0,3 ms par personne (177 µs mesuré). `manhattan.js` est corrigé au
passage : ses trois entrées en jeu attendent la chauffe de New York et appuient
par le document (le blocage du clic se produisait aussi sur `main`). Captures
validées par Max (planche de la vitrine). La sonde `tests/sonde-cout-capture.cjs`
mesure le coût dans une rue de Paris.
