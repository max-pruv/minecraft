# Passer Grand Tour au rendu WebGPU — étude, prototype, plan

Chantier « réalisme » 3 sur 5 (novembre 2026). Décision de Max : un grand saut
de réalisme, repère les jeux en monde ouvert récents, sans rien copier
(invariant 4). Ce document dit **si et comment** le jeu peut quitter le
`WebGLRenderer` de three r160 pour le `WebGPURenderer` de three, ce que le
prototype `?rendu=webgpu` montre, ce qu'il a mesuré, et ce qu'il reste à faire.
Le rendu par défaut ne change pas dans ce chantier.

## Verdict en une phrase

> Faisable, mais ce n'est pas un changement de rendu : c'est une **mise à jour
> de three (r160 → r187)** doublée d'une **réécriture en nœuds (TSL) de tout ce
> que le jeu écrit en GLSL**, et le gain sur l'iPad ne se mesure que sur l'iPad
> — le banc rend en logiciel des deux côtés. Les chiffres sont plus bas.

## 1. Ce qui bloque aujourd'hui — l'inventaire

Relevé sur `main` à la v585 (`grep` dans `src/`, `tests/`). Chaque ligne dit
ce que le rendu WebGPU en fait.

### 1.1 Les greffons `onBeforeCompile` (ignorés en silence sous WebGPU)

| fichier | ce qu'il fait en GLSL | sous WebGPU |
| --- | --- | --- |
| `textures.js` `activerTuilage` | repli des UV d'une face fusionnée dans sa tuile d'atlas (`tuile` = [u0, v0, w, h]) ; `onde` déplace les sommets de l'eau | **porté** en TSL (`rendu-webgpu.js`, `tuilage`) : `colorNode`, `positionNode` |
| `matierehd.js` `materiauHD` | repli avec dérivées (`textureGrad`), rugosité et métal par sommet (`matiere`), lueur des fenêtres (`lueur` × `nuitHD`) | **porté** (`matiereHD`) : `colorNode` avec `.grad()`, `roughnessNode`, `metalnessNode`, `emissiveNode` ; l'uniforme `nuitHD` garde la forme `{ value }` |
| `matierehd.js` `profondeurHD` | le même repli dans le matériau de PROFONDEUR de l'ombre (v572), posé par `customDepthMaterial` | **non porté** : le rendu WebGPU n'a pas `customDepthMaterial` ; l'ombre d'une croisée HD se fait par `castShadowNode` / `shadowNode` du matériau — à écrire |
| `sky.js` `animerEau` | l'onde du lac du château | **porté** (même nœud que `tuilage` avec `onde`) |
| `degats3d.js` `alphaParInstance` | opacité par instance (`aAlpha`) de la fumée et des flammes | **porté** (`opacityNode`) |
| `traces.js` | opacité par instance des traces de pneus | **porté** |
| `manhattan-materiaux.js` | projection triplanaire des photos de façade (position monde, normale), bump, rugosité du texel, émissif triplanaire | **non porté** : à écrire en TSL (`positionWorld`, `normalWorld`, `texture(...)` par axe, `normalNode` pour le bump) ; Manhattan n'est pas dans le prototype |

### 1.2 Les `ShaderMaterial` (un `ShaderMaterial` n'a pas de programme sous WebGPU)

| fichier | rôle | sous WebGPU |
| --- | --- | --- |
| `sky.js` dôme | dégradé horizon → zénith, `uniforms.zenith/horizon` écrits à chaque image | **porté** (`domeDegrade` : `NodeMaterial`, `colorNode`, `uniforms` de même forme) |
| `matierehd.js` `environnementHD` | dôme de la scène d'environnement préfiltrée (PMREM) | **porté** (même `domeDegrade`, avec un sol) |
| `manhattan-materiaux.js` env | idem, pour Manhattan | non porté |
| `manhattan-render.js` `skyDome` | le ciel de Manhattan | non porté |

### 1.3 L'API WebGL du rendu que le jeu appelle

| appel | où | ce que WebGPU offre | état |
| --- | --- | --- | --- |
| `new THREE.WebGLRenderer` | `main.js` (le jeu, et un SECOND contexte pour les portraits) | `WebGPURenderer`, dont `init()` est asynchrone ; `render()` jette avant | cale `creerRenderer` ; **portraits vides** sous WebGPU (rendu synchrone + `toDataURL` impossibles) |
| `renderer.compile(scene, camera, targetScene)` × 17 | la chauffe de l'accueil (`main.js`, `vehicules.js`, `degats3d.js`, `traces.js`, `saisons.js`, `stations.js`) | `compileAsync` seulement | cale : lancé sans attendre, échec avalé — la chauffe dispose ses géométries d'essai dans la foulée, ce qu'une compilation asynchrone peut payer. À refaire en `await compileAsync` dans la chaîne `pas` de la préparation |
| `renderer.info.programs` (liste, `cacheKey`) | la chauffe (`prog`), `?diag=1`, et dix témoins de `monte.js`, `parishd.js`, `degats.js`, `maj.js`, `manhattan.js`, `traces-mesure.js` | `info.memory.programs` (un compte) ; les pipelines vivent dans `renderer._pipelines.caches` | cale : `info.programs` rend les clés de pipelines. Les témoins qui comparent des clés GLSL (`physical`, `shadowMapEnabled`…) devront lire des clés de pipelines |
| `renderer.properties.get(m).programs / currentProgram` | `monte.js:9748`, `parishd.js:1651` | rien d'équivalent | cale vide ; deux témoins à réécrire |
| `renderer.getContext().getParameter(UNMASKED_RENDERER)` | `renduLogiciel()` (coupe ombres, HD, bâti lointain en logiciel) | `navigator.gpu.requestAdapter().info` | `etatRendu().logiciel` (SwiftShader, lavapipe, adaptateur de repli) |
| `renderer.shadowMap.enabled/type` | `main.js`, `manhattan-render.js` | identique (PCF) | rien à faire |
| `renderer.toneMapping`, `toneMappingExposure` | `main.js`, `manhattan-render.js` | identique (ACES) | rien à faire |
| `WebGLCubeRenderTarget` + `CubeCamera` | les reflets de carrosserie (`vehicules.js`), une face par image, couche du décor | `CubeRenderTarget` (le build WebGPU n'exporte pas `WebGLCubeRenderTarget`) | cale d'une ligne ; `CubeCamera.update` fonctionne sur le rendu de nœuds, à vérifier face par face et `setRenderTarget(cible, face)` |
| `PMREMGenerator(renderer).fromScene` | `matierehd.js`, `manhattan-materiaux.js` | existe, exige `init()` fait | identique une fois le rendu initialisé |
| `renderer.xr.enabled` | `vehicules.js` | existe | rien à faire |
| `setViewport/setScissor/setScissorTest` | la minicarte en coin (`main.js`) | existent | rien à faire |
| `r.domElement.toDataURL()` sur `preserveDrawingBuffer` | les portraits | lecture asynchrone seulement (`readRenderTargetPixelsAsync`) | à réécrire en asynchrone, ou rendre les portraits une fois dans une cible |

### 1.4 Le worker de maillage

`maillage-worker.js` et ses 55 modules (`world.js`, `mesher.js`, `tuiles.js`…)
n'importent pas three — c'est la règle de la v251, qu'un contrôle du graphe
d'imports a revérifiée après ce chantier : **zéro module du worker importe
`three`**. Il rend des tampons typés que `main.js` transforme en
`BufferGeometry` : aucun changement. `rendu-webgpu.js` est importé par
`textures.js`, qui n'est pas dans le graphe du worker (`tuiles.js` en est la
part pure).

### 1.5 Ce que la mise à jour de three touche, hors rendu

three r160 → r187 : vingt-sept versions. Le build WebGPU est un SURENSEMBLE du
cœur (`import * as THREE from 'three'` continue de marcher), moins
`WebGLRenderer` et `WebGLCubeRenderTarget`. Les chargeurs de `vendor/`
(`GLTFLoader.js`, `BufferGeometryUtils.js`, `SkeletonUtils.js`, r160)
importent `three` et tournent sur le cœur r187 : le prototype les garde tels
quels. Avant une bascule, on reprend ceux de r187 (le `GLTFLoader` lit les
extensions KTX2 du chantier 4).

## 2. La version WebGPU de three, servie en local et hors ligne

- `vendor/three-webgpu/` : `three.core.min.js`, `three.tsl.min.js`,
  `three.webgpu.min.js`, le build `three@0.187.0` de npm (qui ne livre plus de
  fichiers minifiés : minifiés ici par esbuild 0.25, imports relatifs réécrits
  en `.min.js`), plus la licence MIT. Poids : 396 + 315 + 459 Ko sur le disque,
  **106 + 92 + 125 Ko gzip**, contre 671 Ko (≈ 170 Ko gzip) pour le `three.module.min.js` r160.
- `index.html` écrit l'import map **pendant l'analyse de la page** d'après
  l'adresse : `three` → r160 par défaut ; sous `?rendu=webgpu`, `three` et
  `three/webgpu` → `three.webgpu.min.js`, `three/tsl` → `three.tsl.min.js`.
  Le jeu importe `three` sans rien savoir ; `rendu-webgpu.js` seul importe
  `three/tsl`, dynamiquement, et seulement sous WebGPU.
- `sw.js` : `src/rendu-webgpu.js` est dans `ASSETS` (il est importé par
  `textures.js`, donc toujours) ; `vendor/three-webgpu/` est dans le cache
  IMMUABLE (`isStaticAsset`, la règle des modèles de New York, v565) — téléchargé
  à la première visite sous `?rendu=webgpu`, jamais par une installation
  ordinaire, servi hors ligne ensuite.
- Le chemin de mise à jour du jeu entier (sans drapeau) : remplacer
  `vendor/three.module.min.js` par le `three.module.js` r187 (et son
  `three.core.js`) — le même cœur que le build WebGPU — puis les trois
  chargeurs de `vendor/`. Les deux rendus partagent alors une seule copie du
  cœur.

## 3. Le prototype

Derrière `?rendu=webgpu` seulement. `src/rendu-webgpu.js` :

- `creerRenderer(canvas)` : adaptateur (`navigator.gpu`), appareil,
  `WebGPURenderer`, `await init()`, puis les cales (`compile`, `info.programs`,
  `properties`, `getContext`, `forceContextLoss`). `main.js` n'attend que sous
  WebGPU (`RENDU_WEBGPU ? await … : new THREE.WebGLRenderer(…)`), si bien que
  le chemin par défaut est la ligne d'avant. Sans adaptateur, three retombe sur
  son dos WebGL2 et `etatRendu().dos` le dit : on ne mesure jamais WebGL en
  croyant mesurer WebGPU.
- Les greffons en nœuds : `tuilage` (atlas des blocs, onde de l'eau),
  `matiereHD` (couche HD), `domeDegrade` (ciel, environnement PMREM),
  `alphaParInstance` (fumée, flammes, traces). Chacun est branché par UNE
  condition dans le fichier d'origine, qui garde son GLSL pour le rendu par
  défaut. Le rendu WebGPU convertit un matériau classique en matériau de nœuds
  en recopiant toutes ses propriétés (`NodeLibrary.fromMaterial`) : poser
  `colorNode` sur le `MeshLambertMaterial` du jeu suffit, la référence que
  `main.js` tient ne change pas.
- `?diag=1` porte une ligne de plus : le rendu, la révision de three, le dos
  réel (`webgpu` ou `webgl2`), l'adaptateur (vendor, architecture — c'est ce
  que Max lit sur son iPhone), LOGICIEL si c'en est un, le nombre de pipelines.

## 4. Les mesures

`tests/sonde-rendu-webgpu.cjs mesure` (isolée : aucune suite ne l'importe) ouvre
le jeu six fois, en ordre alterné (WebGL r160, WebGPU, WebGL2-nœuds, WebGL2-nœuds,
WebGPU, WebGL), pose l'enfant au même endroit du Marais (`adresseParis(0.9,
−0.5)`, cap π/2, midi, `rr 6 · hd 3 · reflets`), invoque une voiture de la
flotte devant lui, attend que les morceaux soient là, puis chronomètre
quinze secondes : `renderer.render` enveloppé (le temps du fil principal DANS le
rendu), l'écart entre deux images, les compteurs du rendu, le tas. Le banc
rend en LOGICIEL (SwiftShader, pour les trois) : les durées d'image ne se
transposent pas à l'iPad (v237, v247) ; les appels, les pipelines, les textures
et les octets, si. Deux passages par rendu, les deux chiffres sont donnés.

| grandeur | WebGL (r160) | WebGPU (r187) | WebGL2 (r187, nœuds) |
| --- | --- | --- | --- |
| appels de dessin par image | 677 · 635 | 675 · 654 | 641 · 668 |
| triangles (k) | 340 · 280 | 314 · 340 | 279 · 323 |
| programmes / pipelines | 116 · 104 | 63 · 61 | 59 · 61 |
| fil principal dans `render()` (ms, médiane) | 13,1 · 8,5 | 10,0 · 12,4 | 10,7 · 18,2 |
| idem, 9e décile | 536 · 12,2 | 15,3 · 16,5 | 16,6 · 522 |
| durée d'image (ms, médiane) | 490 · 464 | 573 · 662 | 535 · 565 |
| dont hors du rendu | 477 · 456 | 563 · 650 | 524 · 546 |
| géométries vivantes | 751 · 921 | 909 · 893 | 918 · 728 |
| textures vivantes | 124 · 133 | 92 · 92 | 94 · 85 |
| tas JavaScript (Mo) | 461 · 410 | 390 · 402 | 436 · 376 |
| ouverture de la page (ms) | 11 397 · 10 483 | 8 950 · 8 963 | 11 277 · 10 164 |
| morceaux maillés à la mesure | 48 · 169 | 169 · 169 | 169 · 44 |

Ce qu'on peut en dire, et ce qu'on ne peut pas :

- **Le prototype dessine la même scène** : mêmes appels (≈ 650 par image, ce
  qui gouverne la tablette, v196), mêmes triangles, et les captures côte à côte
  (`docs/webgpu/`) montrent les mêmes immeubles, les mêmes baies HD, la même
  voiture, le même ciel. Les deux passages à 48 et 44 morceaux ont été mesurés
  avant que le disque soit plein (l'attente de la sonde se coupe dès que le
  compte se stabilise une seconde) : leurs appels restent dans la même bande,
  parce que ce qui manque est loin.
- **Le temps de fil principal par rendu est le même** (10 à 13 ms médians sur
  les trois) : sous WebGPU le travail de `render()` est la traversée de la scène
  et la soumission des groupes de liaison, pas moins. Les deux 9e déciles à
  500 ms sont une image de maillage installée dans le rendu (v269), des deux
  côtés, pas un rendu.
- **La durée d'image est celle du rastériseur logiciel** : 450 à 650 ms hors du
  rendu, c'est SwiftShader qui dessine, et `requestAnimationFrame` qui attend la
  présentation. WebGPU y est un peu plus lent (573–662 contre 464–490) : Dawn
  sur Vulkan-SwiftShader, pas la carte graphique de l'iPhone. **Ce chiffre ne
  dit rien de la tablette** ; la ligne de `?diag=1` sous `?rendu=webgpu` est
  faite pour la mesurer là.
- **Ce qui est vraiment différent et se transpose** : moitié moins de
  programmes (61–63 pipelines contre 104–116 programmes GLSL : le rendu de
  nœuds ne dédouble pas chaque matériau en variante opaque/transparente ni en
  variante d'ombre tant qu'on ne les demande pas), un tiers de textures en moins
  (92 contre 124–133 : les cibles intermédiaires du `WebGLRenderer` n'existent
  pas), 10 à 15 % de tas en moins, et une page qui s'ouvre deux secondes plus
  tôt (le cœur r187 s'évalue plus vite que le r160 minifié, sur ce banc).
- **Les compteurs ont dû être calés avant d'être lus** : sous WebGPU
  `info.render.calls` compte les appels à `render()`, `drawCalls` les dessins,
  et la boucle interne de three remet tout à zéro à chaque tick de son propre
  `requestAnimationFrame` (`info.autoReset`), entre notre rendu et la lecture du
  diagnostic. Sans la cale, `?diag=1` affichait « 0 appels · 0k tri » sur une
  scène qui en dessinait 650 — un chiffre qu'on aurait lu sur l'iPhone et cru.

### Ce que la sonde a trouvé en chemin : le canvas figé

Le premier prototype dessinait 700 appels par image, sans erreur, et le canvas
gardait son image de l'accueil dès « Jouer ». La cause : `compile()` était une
cale « lance `compileAsync` sans attendre, avale l'échec ». Or `compileAsync`
pose sur le rendu un état de précompilation (`_beginPreCompile` : la cible
devient le tampon d'image interne, `Mr 640×360`) et le retire à la fin
(`_finishPreCompile`) ; si elle jette entre les deux — une géométrie d'essai
déjà disposée par la chauffe, un matériau refusé — l'état reste, toute image
suivante part dans le tampon interne, et le canvas ne reçoit plus rien. Mesuré
par une sonde qui espionne `setRenderTarget` (`cible-webgpu.cjs`) : la cible
`Mr` posée par `_finishPreCompile < compileAsync`. Remède : les compilations
se font une à la fois, chacune retire son état en sortant (`etatRendu()`
compte les échecs), et le rendu se fait hors de l'état pendant une
compilation en vol. Vérifié : le canvas change à chaque image après « Jouer »
(douze sur douze), le ciel est bleu quand on regarde en l'air et le Marais gris
quand on le regarde, reflets allumés. **Une compilation asynchrone qui se
lance et s'oublie n'est pas une chauffe : c'est l'étape 2 du plan.**

## 5. Le plan de migration

Ce qu'il faudrait pour que `?rendu=webgpu` devienne LE rendu, dans l'ordre où
chaque étape se mesure seule. Le prototype a payé la première et une partie de
la troisième ; les durées sont des estimations de sessions (une session = un
chantier d'une journée avec son portail), pas des promesses.

### 5.1 Les étapes

| # | étape | ce qu'elle livre | ce qui le prouve | estimation |
| --- | --- | --- | --- | --- |
| 1 | **Mettre three à jour (r160 → r187) SANS changer de rendu.** Remplacer `vendor/three.module.min.js` par le cœur r187, reprendre `GLTFLoader`, `BufferGeometryUtils`, `SkeletonUtils` de r187. | un seul cœur pour les deux rendus ; le `GLTFLoader` du chantier 4 | portail complet ; la sonde de signatures (`signaturesDuGlb`) sur toute la flotte ; les captures de la revue d'écran ; l'empreinte des 490 morceaux (le mailleur ne lit pas three, elle ne doit pas bouger) | 2 sessions, dont une de portail |
| 2 | **Compiler en asynchrone, une fois pour toutes.** Réécrire la chaîne `pas` de la préparation (`main.js`) et les quatre chauffes de `vehicules.js`, `degats3d.js`, `traces.js`, `saisons.js`, `stations.js` en `await compileAsync`, une compilation à la fois, sans `render()` entre deux, et sans disposer une géométrie d'essai avant que sa compilation ait rendu. | la chauffe de l'accueil marche sur les deux rendus (le `WebGLRenderer` r187 a aussi `compileAsync`) | le témoin des clés de programme de `maj.js` (« rien ne compile en entrant dans Paris »), lu sur les pipelines sous WebGPU | 1 session |
| 3 | **Porter les greffons restants en TSL.** Manhattan (`manhattan-materiaux.js` : triplanaire, bump, émissif ; `skyDome` ; l'environnement) et l'ombre des façades HD (`profondeurHD` → `castShadowNode` ou `shadowPositionNode` du matériau de nœuds). Tout `onBeforeCompile` du dépôt a alors son jumeau TSL, branché par la même condition `RENDU_WEBGPU`. | New York sous WebGPU ; l'ombre d'une croisée découpée (v572) | la sonde de New York (`sonde-rendu-webgpu.cjs` gagne un lieu) ; le témoin d'ombre HD de `parishd.js` joué sous `?rendu=webgpu` | 2 sessions |
| 4 | **Les témoins qui lisent WebGL.** Dix témoins lisent `renderer.info.programs` par `cacheKey` GLSL ; deux lisent `properties.get(m).programs`. Ils doivent lire les CLÉS DE PIPELINES (`_pipelines.caches`, que la cale `info.programs` rend déjà) et ne plus nommer `physical`, `shadowMapEnabled`, `envMap`. `renduLogiciel()` lit `etatRendu().logiciel`. | un portail qui juge les deux rendus | les douze témoins repointés, rouges désarmés | 1 session |
| 5 | **Les portraits et les lectures de pixels.** `makeCharPortraits` ouvre un SECOND `WebGLRenderer` et lit `toDataURL` ; sous WebGPU la lecture est asynchrone (`readRenderTargetPixelsAsync`) et un second appareil coûte un second contexte. Rendre les huit portraits dans une cible, lire une fois, en asynchrone, pendant la préparation. | des portraits sous WebGPU | le témoin des portraits de `maj.js` | ½ session |
| 6 | **Les reflets de carrosserie.** `CubeRenderTarget` + `CubeCamera.update` face par face (`setRenderTarget(cible, face)`) sur le rendu de nœuds, couche du décor seulement (v245). À mesurer face par face : la cale d'une ligne du prototype n'a pas été éprouvée sur l'iPad. | la laque qui reflète la rue | le témoin « une face par image » de `monte.js` | ½ session |
| 7 | **L'éclairage du chantier 2, écrit en TSL d'emblée.** Voir 5.3. | — | — | compté au chantier 2 |
| 8 | **Le repli et la bascule.** Choisir le rendu au démarrage : WebGPU si `navigator.gpu` donne un adaptateur qui n'est pas un repli logiciel, sinon le dos WebGL2 du MÊME `WebGPURenderer` (`forceWebGL`, éprouvé par `?dos=webgl` : mêmes nœuds, mêmes clés), sinon rien de plus — le `WebGLRenderer` r160 n'existe plus. `?rendu=webgl` garde l'ancien chemin le temps d'une version, puis part. | un seul code de rendu | la revue d'écran sur iPhone et iPad, de jour et de nuit (6 bis) ; le journal de bord qui range le dos réel (`etatRendu().dos`) par appareil | 1 session |

Total : **huit à neuf sessions**, dont deux de portail. Le chemin critique est
1 → 2 → 4 : tant que three n'est pas à jour et que la chauffe n'est pas
asynchrone, rien de ce qui suit ne se mesure sur le portail.

### 5.2 Les risques, chacun avec sa mesure

- **Safari.** WebGPU est dans Safari 26 (iOS 26) ; l'iPhone de Max y est, l'iPad
  de la famille (six ans, v296) n'y sera jamais. Le repli WebGL2 du
  `WebGPURenderer` n'est pas « l'ancien rendu » : c'est le rendu de nœuds sur
  WebGL2, dont le coût sur un vieil iPad n'a PAS été mesuré. Le journal de bord
  (`journal_appareil`) dit quel appareil joue sur quel dos : on lit cette table
  avant de retirer `?rendu=webgl`.
- **`compileAsync` n'est pas `compile`.** Lancée sans attendre, elle laisse le
  rendu dans son tampon interne au premier échec (§4, le canvas figé) ; attendue
  une à la fois, elle étale la chauffe sur plus d'images que la chauffe GLSL
  (une compilation par objet, avec une pause toutes les 8 ms). Le témoin de
  `maj.js` qui borne la préparation (45 s) la mesurera ; si elle tire, c'est le
  nombre de pipelines qu'on réduit (un pipeline par matériau × géométrie × côté),
  pas la borne (v220).
- **Les textures en `NearestFilter` deviennent `textureLoad`.** Le constructeur
  WGSL de r187 classe une texture sans filtrage comme « unfilterable » : l'atlas
  des blocs est lu au texel (`floor(uv × dims)`), sans mip, et `.grad()` est
  ignoré. Le repli des UV de la v287 (qui coupait les dérivées pour tuer le
  quadrillage des mips) n'a donc plus d'objet sous WebGPU — mais une texture qui
  passe en `LinearFilter` pour retrouver ses mips change l'aspect des blocs de
  près. À juger en capture, bloc par bloc.
- **`PCFSoftShadowMap` n'existe plus** (r187 avertit et prend PCF) :
  `manhattan-render.js` le demande. Un pixel près, mesuré par le témoin des
  ombres de New York.
- **Le worker de maillage ne change pas** (zéro import de three), mais ses
  tampons entrent dans des `BufferGeometry` r187 : `attribute('tuile', 'vec4')`
  exige une `BufferAttribute` de quatre composantes, et le mailleur en émet
  bien quatre. Un attribut neuf se déclare au nœud ET au tampon.
- **Les compteurs.** `info.render.calls` compte les appels à `render()` sous
  WebGPU et `drawCalls` les dessins ; `info.reset()` n'est appelé que par
  `setAnimationLoop`. La cale du prototype les rend comparables (§3) ; le jour
  où `main.js` passe à `setAnimationLoop`, la cale part. Un chiffre de
  `?diag=1` se relit à chaque changement de rendu avant d'être cru.
- **Le poids.** Trois fichiers (323 Ko gzip) contre un (170 Ko) ; dans le cache
  immuable, payé une fois. Pas un risque de première visite, un risque de
  mémoire : le `WebGPURenderer` tient ses pipelines et ses groupes de liaison
  (`bindGroups`) en plus des programmes — à relire dans le journal de bord
  (`estimerMemoire`, v426) sur l'iPhone de Max avant la bascule.
- **Les non-mesures.** Le banc rend en logiciel (SwiftShader) des deux côtés :
  ce que §4 compare, ce sont des APPELS, des pipelines, des octets et du temps
  de fil principal — jamais une cadence. La cadence se lit sur l'iPhone avec
  `?rendu=webgpu&diag=1`, et la ligne de diagnostic est faite pour cela.

### 5.3 Ce que l'éclairage du chantier 2 doit devenir

Le chantier 2 (éclairage et post-traitement) s'écrit aujourd'hui pour le
`WebGLRenderer` : lampes, ombres PCF, correspondance tonale ACES, et sans doute
un `EffectComposer`. Pour ne pas être réécrit au chantier 3, il devrait :

- **n'écrire aucun GLSL** : tout effet est un nœud TSL (`three/tsl`), qui
  compile en WGSL sous WebGPU et en GLSL sous le dos WebGL2 du même rendu —
  c'est ce qui rend le repli gratuit ;
- **passer par `PostProcessing` et `pass()`** de three (r187), pas par
  l'`EffectComposer` de `examples/jsm`, qui n'existe que pour le `WebGLRenderer` ;
  le flou de profondeur, le bloom, l'occlusion ambiante (`gtao`) et la
  correspondance tonale y sont des nœuds ;
- **garder quatre lampes ponctuelles** (v248) : la clé d'un pipeline porte le
  nombre de lumières comme la clé d'un programme GLSL, et une lampe de plus
  recompile tout ;
- **écrire ses ombres en `shadowNode`** quand un matériau a besoin d'une ombre
  découpée (les croisées HD, les feuilles) : `customDepthMaterial` n'existe pas
  sur le rendu de nœuds ;
- **se mesurer en pipelines** (`etatRendu().pipelines`) et en dessins, pas en
  programmes GLSL : un effet qui ajoute une passe plein écran ajoute un pipeline
  et un dessin par image, et c'est cela qu'on lit sur l'iPhone.

Un éclairage écrit ainsi tourne sans changement sur les deux dos ; écrit en
GLSL, il est à refaire le jour de la bascule, et c'est le plus gros poste du
plan ci-dessus qui doublerait.

### 5.4 Ce qui reste déclaré (`TASKS.md`)

Les portraits vides sous WebGPU, Manhattan non portée, l'ombre des façades HD
non découpée sous WebGPU, les douze témoins qui lisent WebGL, la cadence jamais
mesurée sur un appareil, et la question du repli pour l'iPad de six ans.
