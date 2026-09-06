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
