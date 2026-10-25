# Poids des voitures : compaction sans perte

## Porsche 911 approuvée

| Format mesuré | Octets | Mo décimaux | Gain face au fichier initial |
| --- | ---: | ---: | ---: |
| GLB initial approuvé | 11 602 448 | 11,60 | — |
| GLB compact, directement lisible par le jeu | 7 736 576 | 7,74 | 33,32 % |
| Même GLB compressé en gzip | 3 453 103 | 3,45 | 70,24 % |
| Même GLB compressé en Brotli | 1 846 624 | 1,85 | 84,08 % |

Le modèle conserve ses 362 868 triangles, ses 40 maillages et ses quatre textures.
Aucune décimation, quantification des positions/normales ou réduction d'image.
Le script retire les sommets inutilisés, fusionne les sommets identiques bit à
bit, supprime les UV des matériaux sans texture et emploie des index 16 bits
lorsque le nombre de sommets le permet. Les textures sont copiées octet pour octet.

Chaque triangle conserve ses positions, normales et UV utilisés exactement.
Le rendu de contrôle trois-quarts avant est identique pixel pour pixel à celui
approuvé (même moteur, caméra et éclairage ; zéro pixel différent).
La compaction réduit aussi les tampons de géométrie chargés. Elle ne réduit pas
le nombre de triangles à dessiner : le coût GPU en circulation doit être mesuré.

## Livraison et transfert : deux métriques différentes

L'intégration préparée charge `porsche-911-gt3-rs-hd-v2-compact.glb` sans ajouter
de décodeur, d'extension glTF ou de changement serveur. Ce fichier fait 7,74 Mo.

Le `.glb.br` fourni fait 1,85 Mo ; le `.glb.gz` fait 3,45 Mo. Il se décompresse vers
le GLB compact exact. Il ne faut PAS le donner tel quel à GLTFLoader. Pour en
faire le poids de téléchargement réel, le serveur/CDN doit servir la compression
HTTP avec `Content-Encoding: br` (Brotli) ou `Content-Encoding: gzip` et le bon type MIME, ou l'application doit
explicitement décompresser avant `parseAsync`. Cette activation n'est pas faite
par ce paquet et doit être vérifiée sur l'URL déployée (en-têtes et octets reçus).

La mémoire du modèle décodé et des textures n'est ni 1,85 ni 3,45 Mo. Éviter de comparer
un poids de transfert compressé avec un poids de fichier brut ou une mesure GPU.
Pour viser beaucoup moins de triangles, prévoir une optimisation perceptuelle/
LOD séparée avec comparaison des vues approuvées ; ce ne serait plus une
transformation strictement sans perte.

## Ce que le dépôt livre, et le transfert mesuré (v545)

Le dépôt livre le GLB compact seul. Les `.br` et `.gz` ne sont pas versionnés :
Vercel compresse déjà les fichiers à la volée (`content-encoding: br`, vérifié
sur l'ancienne 911 : 1 025 406 octets reçus pour 1 558 664), à un niveau proche
de Brotli q4. À ce niveau, le compact se compresse MOINS bien que l'original,
puisque la compaction retire justement les doublons que le compresseur
exploitait : 3,25 Mo (q4) contre 2,74 Mo pour le fichier de 11,6 Mo. Le
1,85 Mo ci-dessus suppose un Brotli maximal précompressé et servi avec ses
en-têtes, ce qui n'est pas en place. À mesurer sur l'URL déployée :

```bash
curl -s -o /dev/null -w '%{size_download}\n' -H 'Accept-Encoding: br' https://minecraft-fam.vercel.app/vendor/voitures/porsche-911-gt3-rs-hd-v2-compact.glb
```

## Reproduction

```bash
python3 scripts/porsche911-v2.py
python3 scripts/optimiser-glb.py vendor/voitures/porsche-911-gt3-rs-hd-v2.glb vendor/voitures/porsche-911-gt3-rs-hd-v2-compact.glb
cd tests && node degats.js   # les témoins de tests/porsche-911.mjs, compaction comprise
```

Le rapport de compaction (empreintes des primitives de la source approuvée) est
`docs/porsche-911-compaction.json` ; le témoin le recalcule sur le fichier livré.
