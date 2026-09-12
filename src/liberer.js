// Rendre la mémoire graphique de ce qu'on retire de la scène.
//
// LA PANNE (v238). Max : « le jeu lague de plus en plus depuis un moment. »
// Mesuré au banc, joueur IMMOBILE dans Paris, monde entièrement figé — cent
// soixante-neuf morceaux maillés, plus une seule libération après la trentième
// seconde :
//
//     t          30 s   60 s   90 s   120 s
//     géométries  398    474    509    543
//     objets     5100   5328   5517   5718
//     libérées    205    205    205    205
//
// Rien ne bouge dans le monde et la carte graphique enfle quand même. La cause
// n'est pas le nombre de bêtes — les créatures sont plafonnées à seize et
// disparaissent à soixante-dix blocs — c'est leur RENOUVELLEMENT : une naît
// toutes les 1,2 s, celle qui s'éloigne sort de la scène, et `scene.remove()`
// ne rend RIEN au pilote graphique. Sur un iPad, dont la mémoire graphique est
// partagée avec le système, c'est le figement d'une seconde toutes les
// secondes que Max décrit, et il empire avec la durée de la partie.
//
// C'EST LA FUITE DE LA v236 PAR L'AUTRE BOUT. Là, `world.chunks` gardait les
// blocs en mémoire vive et `oublierLoinDe` l'a réglé ; la règle « ce qui
// s'engendre s'oublie » n'avait simplement jamais été cherchée ailleurs que
// dans le monde. Une fois de plus, c'est la PORTÉE du remède qui manquait et
// non la règle — et le bon remède était déjà écrit dans le fichier d'à côté :
// `poissons.js` libère ses poissons correctement depuis toujours.
//
// UNE RESSOURCE PARTAGÉE NE SE LIBÈRE PAS, ET C'EST TOUT LE PIÈGE. Les
// personnages humains de `modeles.js` partagent DEUX matériaux pour tout le
// jeu (`matiereVivante`, `matiereVerre`) ; le mobilier de rue de `props.js`
// clone un modèle unique, donc partage sa géométrie. Un `dispose()` aveugle
// sur un passant qui s'en va n'aurait pas fait fuir le jeu : il aurait fait
// DISPARAÎTRE tous les personnages du monde d'un coup, et le décor avec. La
// règle vit donc dans la ressource elle-même (`userData.partagee`), à côté de
// `montable`, `nourrissable` et `vole` — jamais dans une liste écrite ici.
export function partager(ressource) {
  if (ressource) ressource.userData.partagee = true;
  return ressource;
}

// Marque partagée tout ce qu'un objet porte : sa géométrie, ses matériaux, et
// ceux de ses enfants. Pour un modèle qu'on va cloner.
export function partagerTout(objet) {
  if (!objet) return objet;
  objet.traverse((o) => {
    if (o.geometry) partager(o.geometry);
    const m = o.material;
    if (Array.isArray(m)) m.forEach(partager); else if (m) partager(m);
  });
  return objet;
}

// Rend au pilote graphique tout ce que cet objet possède EN PROPRE. Ne retire
// pas l'objet de la scène : l'appelant l'a déjà fait, et c'est lui qui sait
// s'il le remettra. Rend le nombre de ressources libérées — les témoins s'en
// servent, et un compte nul sur un objet qu'on jette est un défaut.
export function liberer(objet) {
  if (!objet) return 0;
  let rendues = 0;
  const squelettes = new Set();
  objet.traverse((o) => {
    if(o.isSkinnedMesh && o.skeleton && !squelettes.has(o.skeleton)){squelettes.add(o.skeleton);o.skeleton.dispose();}
    const g = o.geometry;
    if (g && !g.userData.partagee) { g.dispose(); rendues++; }
    const m = o.material;
    const un = (mat) => {
      if (!mat || mat.userData.partagee) return;
      // une texture posée sur un matériau d'instance part avec lui
      for (const k of ['map', 'alphaMap', 'emissiveMap', 'normalMap']) {
        if (mat[k] && !mat[k].userData.partagee) mat[k].dispose();
      }
      mat.dispose(); rendues++;
    };
    if (Array.isArray(m)) m.forEach(un); else un(m);
  });
  return rendues;
}
