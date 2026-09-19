# Les deux polices du jeu

`Bricolage Grotesque` (titres) et `Plus Jakarta Sans` (tout le reste), en
variable, **sous-ensemble latin**, au format woff2 tel que Google Fonts le sert.

| fichier | poids | ce qu'il porte |
| --- | --- | --- |
| `bricolage-latin.woff2` | 76 Ko | axes `opsz` 12–96 et `wght` 500–800 |
| `jakarta-latin.woff2` | 27 Ko | axe `wght` 400–700 |

**Pourquoi dans le dépôt et pas chez Google.** Le jeu marche hors ligne : un
`<link>` vers `fonts.googleapis.com` casserait l'accueil dans l'avion, à
l'école ou sur le Wi-Fi d'un hôtel. C'est aussi une requête de moins au
premier chargement, sur le chemin le plus sensible du démarrage.

**Pourquoi le sous-ensemble `latin` suffit pour le français.** Sa plage
contient `U+0152-0153`, donc le « œ » de « cœur » et « nœud » — que le jeu
emploie dans une vingtaine de fichiers — ainsi que les guillemets « » et
l'apostrophe typographique. Sans cette vérification, une lettre sur mille
serait tombée dans une police de secours, et cela se voit.

**Où elles vivent.** Dans le cache IMMUABLE du service worker
(`isStaticAsset`, sw.js), avec le scanner de visages, la flotte et les corps :
elles ne changent jamais, donc elles ne doivent pas se re-télécharger à chaque
livraison. C'est la leçon des 8,2 Mo de corps de la v245.

**Licence.** Les deux sont sous SIL Open Font License 1.1 — texte complet dans
`OFL-BricolageGrotesque.txt` et `OFL-PlusJakartaSans.txt`.
