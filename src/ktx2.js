// LE CHARGEUR DES MODÈLES DÉPOSÉS, AVEC LEURS TEXTURES KTX2 (mémoire, v587).
//
// Une image JPEG ou PNG se décode en RGBA dans la carte graphique : quatre
// octets par pixel, un tiers de plus pour les mipmaps. Une texture KTX2
// (Basis Universal) se TRANSCODE vers ce que la carte lit sans la
// décompresser — ETC2 ou ASTC sur l'iPhone et l'iPad, un demi-octet à un
// octet par pixel. iOS ferme la page vers 500 Mo de géométrie et de textures
// (v580) : c'est la place que l'on rend.
//
// Le transcodeur est celui de three r160 (`vendor/basis/`, la version de
// `three.module.min.js`), servi depuis le dépôt et mis en cache par le service
// worker : rien ne part chez un tiers, et tout marche hors ligne.
//
// Il se branche sur le RENDERER (il demande à la carte quels formats elle lit),
// donc `main.js` l'appelle juste après l'avoir créé, avant tout modèle. Tant
// qu'il n'est pas branché — sous node, dans un témoin qui charge un fichier à
// la main — tout se charge comme avant, fichiers d'origine compris.
// `?ktx2=0` rejoue l'ancien chargement, pour comparer sur la tablette.
import { GLTFLoader } from '../vendor/GLTFLoader.js';
import { KTX2Loader } from '../vendor/basis/KTX2Loader.js';
import { urlKTX2 } from './ktx2-liste.js';

const ADRESSE = typeof location !== 'undefined' ? new URLSearchParams(location.search) : null;
export const SANS_KTX2 = !!ADRESSE && ADRESSE.get('ktx2') === '0';

let chargeur = null;
export function brancherKTX2(renderer) {
  if (chargeur || SANS_KTX2 || !renderer) return chargeur;
  try {
    // deux fils de transcodage : chacun porte son tas wasm, et l'iPad n'a
    // pas de mémoire à donner à quatre
    chargeur = new KTX2Loader().setTranscoderPath('./vendor/basis/').setWorkerLimit(2).detectSupport(renderer);
  } catch (e) {
    console.warn('KTX2 indisponible, textures d\'origine', e);
    chargeur = null;
  }
  return chargeur;
}
export const ktx2Branche = () => !!chargeur;

// L'URL que le jeu charge pour un modèle : sa version KTX2 si elle existe et
// que le transcodeur est branché, sinon l'URL d'origine, telle quelle.
export function urlModele(url) {
  return (chargeur && urlKTX2(url)) || url;
}

// Un GLTFLoader prêt pour les deux sortes de fichiers. Les extensions passées
// ici passent AVANT celles du chargeur (`KHR_texture_basisu` comprise) : le
// partage des textures de la flotte (v413) doit voir une texture KTX2 avant
// que le chargeur ne la décode pour son seul fichier.
export function chargeurModeles(...avant) {
  const l = new GLTFLoader();
  if (chargeur) l.setKTX2Loader(chargeur);
  for (const p of avant.reverse()) l.pluginCallbacks.unshift(p);
  return l;
}
