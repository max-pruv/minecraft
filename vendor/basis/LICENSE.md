# Chargeur et transcodeur KTX2 (v587)

Recopiés sans modification de **three.js r160** (`examples/jsm/`), la version de
`vendor/three.module.min.js`. Seuls les chemins d'import de `KTX2Loader.js` ont
été réécrits pour pointer vers ce dossier.

| Fichier | Origine | Licence |
| --- | --- | --- |
| `KTX2Loader.js`, `WorkerPool.js` | three.js r160, `examples/jsm/loaders/`, `examples/jsm/utils/` | MIT (voir `../THREE_LICENSE`) |
| `basis_transcoder.js`, `basis_transcoder.wasm` | Basis Universal (Binomial LLC), distribué par three.js r160, `examples/jsm/libs/basis/` | Apache 2.0 |
| `ktx-parse.module.js` | ktx-parse (Don McCurdy), distribué par three.js r160 | MIT |
| `zstddec.module.js` | zstddec (Don McCurdy) et Zstandard (Meta) | MIT et BSD |

Les fichiers `*-ktx2.glb` de `vendor/voitures`, `vendor/avions` et
`vendor/newyork` sont produits par `scripts/compresser-textures-ktx2.mjs` à
partir des modèles d'origine ; ils gardent la licence et le crédit de leur
modèle (voir le `LICENSE.md` de chaque dossier).
