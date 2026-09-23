// LE BANDEAU DU JEU — le petit message qui passe en bas de l'écran.
//
// Il vivait dans `creatures.js`, comme méthode de `CreatureManager`, et c'est
// pour cela qu'on lisait `creatureManager.toast('🌊 Une voiture ne roule pas
// dans l'eau…')` à plus de quarante endroits qui n'ont jamais eu affaire à une
// créature : l'atterrissage, la sauvegarde allégée, les invitations, le parent
// qui change un réglage. Retirer le mode d'attrape (v285) l'a mis au jour.
//
// C'EST LA VOIX DU JEU, PAS CELLE D'UNE FONCTIONNALITÉ. Elle a donc son fichier,
// et ce fichier ne sait rien d'autre que le message qu'on lui donne. Aucun
// import : ni three — la couleur se convertit en six lignes —, ni quoi que ce
// soit du jeu. C'est ce qui permet à n'importe quel module de parler à l'enfant
// sans dépendre du module d'à côté.
//
// ET LE MESSAGE DIT QUOI FAIRE (règle de la maison) : « fais demi-tour », pas
// « erreur ». Ce fichier ne l'impose pas, il le rend possible en étant à la
// portée de tout le monde.

// Un entier 0xRRGGBB → « #rrggbb ». `THREE.Color` faisait ce travail et
// obligeait tout le fichier à importer three ; ici l'entier suffit.
function enHexa(couleur) {
  return '#' + (couleur & 0xffffff).toString(16).padStart(6, '0');
}

let minuteur = null;

// LA DURÉE EST EN TEMPS RÉEL, et elle doit le rester : un bandeau ne doit pas
// s'attarder trois fois plus longtemps parce que la tablette rame (piège de
// `dt`, v226). `setTimeout` compte en millisecondes de vraie vie — c'est déjà
// la bonne horloge, et l'on ne la remplace pas par un minuteur en `dt`.
export const DUREE_MS = 2600;

export function toast(msg, couleur = 0xffffff, duree = DUREE_MS) {
  const el = document.getElementById('toast');
  if (!el) return;                    // une page d'essai peut ne pas l'avoir
  el.textContent = msg;
  el.style.color = enHexa(couleur);
  el.style.opacity = '1';
  clearTimeout(minuteur);
  minuteur = setTimeout(() => { el.style.opacity = '0'; }, duree);
}
