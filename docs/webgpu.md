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

(à compléter)

## 5. Le plan de migration

(à compléter)
