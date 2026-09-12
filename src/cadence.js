// UN MINUTEUR DE MÉNAGE COMPTE EN TEMPS RÉEL, PAS EN `dt`.
//
// CE QUI L'A DÉCLENCHÉ. Max, deux fois : « clairement pas de piétons, pas de
// vie dans les villes », et « it took a while to see cars in paris ». Le
// témoin de fumée le disait aussi, en rouge et en production : au milieu d'une
// traversée de Paris, trois passants dans les soixante-deux blocs au lieu de
// dix-huit.
//
// LA CAUSE, MESURÉE. `main.js` borne `dt` à un vingtième de seconde — c'est
// juste, et c'est écrit depuis Washington : sans cette borne, une chute de
// cadence fait traverser les murs. Mais un minuteur écrit `minuteur -= dt`
// hérite alors de la borne : quand la cadence s'effondre, il ralentit
// exactement dans la même proportion. Relevé en traversant Paris, arrêt par
// arrêt :
//
//   arrêt   cadence   tours de rapatriement   passants à moins de 62 blocs
//     1     6,9 im/s          18                        18
//     3     2,7               0                          7
//     4     2,8               0                          3
//     5     3,0              18                         18
//     7     6,0              18                         18
//
// À 2,75 images par seconde, deux secondes de minuteur réclament quarante
// images, soit QUATORZE SECONDES réelles. Le tour ne vient jamais. Et la
// cadence s'effondre précisément quand l'enfant ARRIVE quelque part et que les
// morceaux de monde se chargent — c'est-à-dire au moment exact où il regarde.
// La ville est donc vide quand on la découvre, et pleine dès qu'on n'y fait
// plus attention.
//
// CE QUI DOIT COMPTER EN `dt`, ET CE QUI NE DOIT PAS. Une ANIMATION suit le
// temps du jeu : une bête qui fuit, une balle qui rebondit, une flamme qui
// s'éteint ralentissent avec le reste, et c'est cohérent. Une cadence de
// MÉNAGE — repeupler, faire naître une voiture, regarnir un poste de
// stationnement — décide si le monde EXISTE autour de l'enfant ; elle ne doit
// rien devoir à la vitesse d'affichage.
//
// `dabord: false` sert quand la première visite doit attendre son tour plutôt
// que de partir au premier appel.
const maintenant = () => (typeof performance !== 'undefined' && performance.now
  ? performance.now() : Date.now());

export function cadence(periodeMs, dabord = true) {
  let prochain = dabord ? 0 : maintenant() + periodeMs;
  return () => {
    const t = maintenant();
    if (t < prochain) return false;
    prochain = t + periodeMs;
    return true;
  };
}

// LE TEMPS RÉEL ÉCOULÉ, BORNÉ — pour ce qui se compte en secondes de la vraie
// vie, pas en secondes de jeu (v234).
//
// `main.js` borne `dt` à un vingtième de seconde, et c'est juste pour la
// physique. Mais le TEMPS D'ÉCRAN d'un enfant est du temps réel : un parent
// qui règle « quarante-cinq minutes par jour » parle de minutes de pendule,
// pas de minutes pondérées par la cadence d'affichage. Mesuré au banc, sur
// douze secondes réelles : à 24 images par seconde le compteur en retient 11 ;
// à 5, il n'en retient que **3**. Une tablette qui rame multipliait donc par
// quatre la journée d'un enfant.
//
// ET LE PLAFOND N'EST PAS UNE PRÉCAUTION, C'EST LE CŒUR DE LA CHOSE. Quand
// l'onglet passe à l'arrière-plan ou que l'appareil s'endort, le navigateur
// cesse d'appeler la boucle : au réveil, l'écart réel vaut des minutes, voire
// des heures. Sans borne, elles compteraient toutes comme du jeu. C'est le
// plafond de `dt` qui protégeait de cela par accident ; ici il le fait
// exprès. Deux secondes laissent passer en entier l'image la plus lente qu'on
// ait mesurée (2 im/s en pleine arrivée dans Paris) et coupent net tout ce qui
// ressemble à une absence.
export function chronoReel(plafondS = 2) {
  let precedent = null;
  return () => {
    const t = maintenant();
    if (precedent === null) { precedent = t; return 0; }
    const ecart = (t - precedent) / 1000;
    precedent = t;
    return Math.min(Math.max(ecart, 0), plafondS);
  };
}
