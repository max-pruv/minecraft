# Journal des versions

Ce que chaque livraison apporte, et à quoi elle sert. Une entrée par version
publiée, la plus récente en haut.

**Règle de tenue : rien ne part en production sans son entrée ici, écrite dans
la même fusion.** Le numéro de version est celui de `CACHE_VERSION` dans
`sw.js` — c'est lui qui décide si une tablette déjà installée reçoit la mise à
jour, et c'est donc lui qui fait foi.

Chaque entrée dit trois choses, dans cet ordre :

- **Pourquoi** — la panne vécue, ou le manque constaté. Pas la solution.
- **Ce que ça change** — ce que la famille voit ou peut faire.
- **Ce qui le prouve** — le nombre de témoins, et ceux qui comptent.

Le détail technique reste dans `git log` : les messages de commit sont écrits
pour être lus. Les invariants et les décisions d'architecture, eux, vivent dans
`CLAUDE.md`.

---

## v157 — la monoplace freine dans les virages

**Pourquoi.** Max, en essayant de jouer : « je n'arrive pas à monter sur la
formule un parce qu'elle va trop vite ». Elle roulait à dix-sept mètres par
seconde **partout**, épingles comprises — et le bouton d'embarquement ne se
rafraîchissait que quatre fois par seconde. La voiture traversait donc toute la
zone d'embarquement **entre deux clignements**.

**Ce que ça change.**

- **La monoplace regarde devant elle.** Le tracé sait dire de combien il tourne
  dans les seize prochains mètres ; la voiture freine avant le virage et relance
  en ligne droite, avec l'inertie qui rend le geste visible. De **14,5 m/s** en
  ligne droite à **4,5 m/s** en épingle — trois fois plus lente là où on veut la
  rejoindre. Le métro, lui, garde son allure : il roule sur des rails.
- **Le bouton regarde huit fois plus souvent** dès qu'un véhicule s'approche à
  moins de quinze mètres. Il ne propose d'embarquer qu'à quatre mètres — on ne
  monte pas dans une voiture qu'on ne touche pas — mais il ne rate plus le
  passage.

**Ce qui le prouve.** `monte.js` suit **une seule** monoplace pendant seize
secondes : « la monoplace ne roule pas à la même allure partout » (rapport de
3,2), « et elle ralentit assez pour qu'on puisse la rejoindre ». Puis le trajet
réel : l'enfant se poste au bord du circuit et attend — « quand la monoplace
arrive, on a le temps de voir le bouton ».

---

## v156 — l'enfant n'est plus seul dans un monde peuplé

**Pourquoi.** Marlon ne pouvait pas rejoindre le monde de la maison. Le jeu
disait « ce Wi-Fi bloque le jeu à plusieurs » sur un Wi-Fi familial parfaitement
sain. Le journal de production a montré la vérité : l'hôte répondait **en deux
secondes** par le nuage, mais la tentative de Marlon avait déjà fermé sa
connexion — deux millisecondes après l'avoir ouverte.

En cherchant, le banc d'essai en a sorti deux autres, plus graves parce que
muettes. Il reproduit une machine chargée — un iPad de famille un soir de
semaine — et c'est là qu'elles vivaient. J'ai cru trois fois qu'il se trompait
avant d'accepter qu'il avait raison.

**Ce que ça change.**

- **Le lien fantôme.** Quand le lien direct traîne, le nuage prend le relais —
  puis le direct aboutit quand même et le remplace. La boucle de présentation
  tenait encore l'ancien lien : à son réveil elle le trouvait fermé, se
  déclarait terminée, et personne ne la réarmait. L'enfant gardait un lien
  **ouvert, vivant, jamais présenté**. Aucune erreur, aucun message : juste
  invisible pour toujours. La relance ne retient plus qu'une clé de joueur et
  relit à chaque tour le lien du moment.
- **Le monde perdu en silence.** Le journal de blocs ne part qu'une fois, à la
  présentation. S'il tombait sur un canal pas tout à fait prêt — PeerJS le dit
  « ouvert » un instant trop tôt — il disparaissait sans un mot, et l'enfant
  arrivait dans un monde vide de tout ce que les autres avaient bâti. Il se
  renvoie maintenant jusqu'à passer.

- Une session arrêtée ne frappe plus à aucune porte : les minuteries des
  tentatives abandonnées ne réveillent plus le relais.
- **Le phare de l'hôte** : un hôte qui vit par le nuage écrit une ligne toutes
  les quinze secondes. Un invité dont le courtier répond « introuvable »
  l'interroge avant de conclure, et frappe par le nuage si le phare brille.
- **Plus de monde jumeau** : on ne peut plus ouvrir un monde dont le phare
  brille. C'était le pire risque — deux mondes sous le même code, qui divergent
  en silence sans que personne le voie.
- **Le message dit vrai** : quand le relais nous parle mais que personne ne
  répond, le réseau est hors de cause, et on le dit. « Le monde est bien là,
  personne n'y répond à l'instant » remplace l'accusation du Wi-Fi.
- **Le plafond du monde passe de 96 à 160 blocs** — la fondation des monuments
  à l'échelle. Le sol, lui, ne bouge pas d'un bloc : `SOMMET_TERRAIN` est figé
  et découplé du plafond.
- Le vol a un toit : on ne sort plus du monde par le haut.

**Ce qui le prouve.** **277 témoins**, sept suites. `plafond.js` est neuve :
elle vérifie l'empreinte du paysage sur **218 089 colonnes** et qu'une maison
sauvegardée avant le changement repose toujours sur son sol, ni enterrée ni en
l'air. Nouveaux témoins réseau : « un hôte sans courtier est trouvé par un
invité dont le courtier marche », « et il le REJOINT, au lieu d'ouvrir un monde
jumeau ». Et trois témoins qui existaient déjà ont fini par avoir raison contre
moi — « une présentation perdue finit par passer », « le lien muet est coupé
puis rouvert », « les blocs repassent après le retour » : ce sont eux qui
tenaient les deux défauts muets.

---

## v155 — on monte sur les bêtes, et on monte à bord

**Pourquoi.** Monter à cheval existait depuis longtemps et presque personne ne
l'avait jamais fait : il fallait viser l'animal dans un cône d'une vingtaine de
degrés, deviner qu'une touche existait, et tomber sur l'une des trois seules
espèces d'une liste écrite en dur.

**Ce que ça change.** Huit bêtes montables de plus — éléphant, zèbre, âne,
chameau, lama, autruche, sanglier, ours brun. Le bouton apparaît pour la
monture la plus proche devant soi, même de biais. La caméra s'élève à la hauteur
du dos : sur un âne on est à hauteur d'homme, sur un éléphant on domine les
toits. Et le métro et les monoplaces transportent enfin — un bouton apparaît
quand une rame arrive à portée.

**Ce qui le prouve.** 256 témoins. `monte.js` est neuve et suit le trajet
complet, dont « là où l'ancienne visée ne trouvait rien, la monte la voit » —
les deux règles comparées au même instant.

---

## v154 — l'enfant tue ses propres fantômes

**Pourquoi.** « Tu es déjà connecté ailleurs », trois lancements de suite, alors
que personne ne l'était. Chaque relance laissait derrière elle une identité qui
met deux minutes à mourir ; le jeu prenait ce cadavre pour l'enfant.

**Ce que ça change.** Chaque appareil signe son identité en ligne et efface
**ses propres** fantômes en entrant dans un monde — jamais ceux des autres.
C'est le receveur qui cède, pas l'émetteur : le fantôme tourne du vieux code et
ne peut obéir à une règle qu'il ne connaît pas. Et le nuage porte la partie
quand le serveur de rendez-vous se tait — après avoir vérifié qu'il répond
vraiment.

**Ce qui le prouve.** 234 témoins, dont « en arrivant, l'enfant efface ses
propres fantômes » et « et il ne touche pas à ceux des autres ».

---

## Avant v154

L'historique complet est dans `git log origin/main`, une fusion par version,
avec un message écrit pour être lu. Les grandes étapes :

| Version | Ce que ça apportait |
| --- | --- |
| v153 | Le courtier devient facultatif ; l'enfant n'est plus refusé par son propre reflet |
| v152 | Paris : douze registres d'architecture haussmannienne sur les façades |
| v151 | La moitié d'écran restée noire au retour dans l'application |
| v150 | La caméra marche, l'enfant muet retrouve sa voix, l'espace parent dit ce qu'il lit |
| v148 | Le nuage porte la partie quand le Wi-Fi bloque ; l'usine du Père Noël s'anime |
| v144 | La Chine dans la zone morte du nord ; le taux de réussite jour par jour |
| v142 | San Francisco relevée sur documents : Golden Gate, Karl the Fog, Pier 39 |
| v141 | Le hub Éducation filtre par enfant et par période |
| v139 | Nice relevée sur documents : port Lympia, Negresco, chaises bleues |
| v138 | Lille relevée sur documents : gare, deux beffrois, Treille, quai du Wault |
| v136 | Le chantier commun et la flèche vers l'ami |
| v133 | Le quiz revient toutes les dix minutes de jeu, et pas avant |
| v130 | Un VPN ne fait plus croire que le monde est vide |
| v128 | Voir qui est connecté, et l'inviter à venir jouer |
| v127 | Paris : ses îlots, ses cours et sa ligne de corniche |
| v125 | San Francisco : la presqu'île, les treize collines, les deux quadrillages |
| v124 | Le parc d'attractions, bâti d'après un vrai parc |
