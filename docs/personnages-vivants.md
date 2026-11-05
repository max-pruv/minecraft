# Les personnages vivants — capture de mouvement réelle

Chantier « réalisme » 5 sur 5. Les passants, les habitants des villages et
l'avatar à pied jouent désormais des mouvements CAPTURÉS sur de vraies
personnes, à la place de la marche dessinée de la v241.

## La chaîne

1. **Les prises** viennent de la CMU Graphics Lab Motion Capture Database
   (mocap.cs.cmu.edu), fichiers ASF/AMC, téléchargeables sans compte.
   Conditions et crédit : `vendor/humains/LICENSE.md`.
2. **`scripts/convertir-mouvements.mjs`** les lit hors ligne (squelette ASF,
   mouvements AMC, axes et ordre d'Euler du format), choisit la bonne fenêtre
   (une foulée complète pour la marche et la course, la fenêtre la plus
   immobile pour une attente), ramène le cap de la personne à +Z, et range,
   pour chaque prise et chaque os, la rotation dans le MONDE comme un écart à
   la pose de repos de la capture. Il se rejoue :

   ```
   cd scripts && node convertir-mouvements.mjs <dossier des .asf/.amc> ../vendor/humains/mouvements-v1.bin
   ```

   Les commandes de téléchargement sont en tête du script. `DIAG=1` imprime
   l'inclinaison de la tête, du cou et du thorax, l'écart des bras et des
   cuisses : c'est ce qui a fait écarter trois prises avant même la vitrine.
3. **`src/mouvements.js`** recible au chargement, UNE FOIS PAR CORPS : les
   neuf squelettes Rocketbox n'ont pas la même pose de repos (jusqu'à onze
   degrés entre les mains de deux modèles), donc on ne recopie jamais des
   rotations locales. W_os(t) = H·D(t)·H⁻¹ · A · T_os ; A n'aligne que les
   membres ; le tronc, le cou et la tête gardent la courbure du corps. Le pied
   le plus bas est remis à sa hauteur de repos par la cinématique des jambes,
   sur la racine (le nœud parent du bassin). Le résultat est un
   `AnimationClip` par corps et par prise, partagé par toutes les personnes.
4. **`src/humains.js`** joue la capture : un `AnimationMixer` par personne,
   la prise choisie par l'allure (`priseDAllure` : marche lente, marche,
   course, ou l'attitude au repos), un fondu de 0,3 s, une cadence qui suit
   l'allure sans la rattraper tout à fait. L'attitude au repos se tire de
   l'identifiant de la personne (`attitudeDe`) : la même personne attend
   toujours de la même façon. Une posture tenue (assis au volant, le sursaut)
   reprend la main ; la marche dessinée reste le repli tant que le fichier
   n'est pas là, ou avec `reglageCapture.actif = false`.

## Les prises retenues

| prise | source CMU | ce que c'est |
| --- | --- | --- |
| marche | 16_15 | marche ordinaire, 1,11 m/s |
| marcheLente | 16_33 | flânerie, 0,41 m/s |
| course | 16_35 | course, 2,82 m/s (et le pas de côté pressé) |
| attente | 82_08 | debout, bras le long du corps |
| attente2 | 111_28 | debout, mains aux hanches |

**Écartées après capture dans la vitrine** (le fichier ne les porte plus) :
40_10 « regarder autour » (tronc rejeté en arrière, bras écartés), 79_36
« téléphone » et 18_08 « parler » (bras levés, corps penchés), 18_12 « assis »
(pas de siège pour la jouer). Leurs traitements restent dans le script.
Une description de la base ne dit pas la pose : le sujet 77, « looking
around », est accroupi (thorax à 54°), 137_28 « normal wait » a les poings sur
les hanches. **Une prise se juge en capture, dans le moteur, jamais sur son
titre.**

## Ce que ça coûte

Mesuré dans une rue de Paris (`tests/sonde-cout-capture.cjs`, ordre alterné,
62 personnes, 20 visibles) : 17 µs par appel d'animation avec la capture,
11 µs avec la marche dessinée, soit environ 1 ms de fil principal par
seconde. La cadence d'animation baisse déjà avec la distance (`main.js` :
chaque image sous 35 blocs, 15 Hz sous 80, 10 Hz au-delà, rien au-delà de
140 ni pour un personnage invisible, `presence.js`). Le fichier pèse 52 Ko et
vit dans le cache immuable (`sw.js`, `HUMAINS`) ; une nouvelle version prend
un nom neuf (`mouvements-v2.bin`). Aucun programme de rendu neuf : les corps
étaient déjà des maillages à squelette.

## Inventaire : des corps plus réalistes que Max pourrait déposer

Rien n'a été téléchargé pour cet inventaire ; les licences sont à relire sur
la page de chaque source au moment du dépôt.

| source | ce qu'on y trouve | licence | compte | remarque |
| --- | --- | --- | --- | --- |
| Microsoft Rocketbox (GitHub) | ~115 corps adultes et enfants, même squelette que les nôtres | MIT | non | le plus simple : plus de variété sans rien changer au code ni au reciblage |
| MakeHuman / MPFB (Blender) | corps paramétrables, squelettes standard | sorties en CC0 | non | demande un export et une conversion GLB hors ligne |
| Sketchfab (« scanned people », CC-BY) | personnes scannées photoréalistes | variable (souvent CC-BY 4.0) | oui | chaque modèle a sa licence ; souvent lourds (> 50 k triangles) |
| Mixamo (Adobe) | corps et mouvements prêts à l'emploi | libre d'usage dans un jeu, pas en redistribution brute | oui (Adobe) | les fichiers d'un jeu web sont lisibles : à vérifier |
| RenderPeople (échantillons gratuits) | scans photoréalistes | licence d'usage, redistribution limitée | oui | même réserve que Mixamo |
| 100STYLE (jeu de données) | marches de cent styles | CC BY 4.0 | non | pour varier les démarches, pas les corps |
| CMU (déjà utilisée) | ~2 600 prises | libre d'usage, pas de revente | non | d'autres attentes à essayer en vitrine |

À éviter : MetaHuman (licence liée à Unreal Engine), les jeux de données en
CC BY-NC (usage non commercial) ou ND (pas d'œuvre dérivée — un reciblage en
est une).

## Ce qui reste (déclaré dans `TASKS.md`)

- Téléphoner, parler, regarder autour, s'asseoir : à refaire avec de
  meilleures prises, ou d'autres sources.
- Les pieds glissent légèrement quand l'allure s'écarte de celle de la prise
  (la cadence ne suit qu'à la puissance 0,75).
- Le rendu de la peau, des yeux et des cheveux n'a pas été changé dans cette
  livraison.
