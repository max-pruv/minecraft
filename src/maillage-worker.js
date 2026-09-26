// LE MAILLAGE HORS DU FIL PRINCIPAL (v251).
//
// Max, sur l'iPad : « en avion le lag est fort ; en voiture, lag, et la
// définition des bâtiments s'affiche trop tard ». Engendrer et mailler un
// morceau de Paris coûte 24 ms, et cela se faisait DANS l'image, sur le fil
// qui anime et dessine : le budget de maillage (720 ms par seconde) prenait
// aux images tout ce qu'il pouvait, et il ne suffisait pas à suivre une
// voiture (27 morceaux par seconde pour 30 réclamés). Ici, un monde jumeau
// — le même générateur, les mêmes blocs de l'enfant — engendre et maille sur
// son propre fil, et rend au fil principal des tampons prêts à envoyer à la
// carte graphique, plus les blocs pour les collisions.
//
// Ce worker ne connaît que `World` : Manhattan (`TerreUrbaine`, ses façades
// et ses journaux importés) reste maillée par le fil principal — c'est
// `maillageLocal(cx, cz)` qui tranche, dans la classe du monde.
import { World, CHUNK } from './world.js';
import { buildChunkTampons } from './mesher.js';

const monde = new World();

self.onmessage = (e) => {
  const m = e.data;
  if (m.type === 'edits') {
    // Resynchronisation COMPLÈTE : changement de monde, fusion du nuage,
    // premier lancement. Les morceaux engendrés sont jetés : ils portaient
    // les anciens blocs.
    // Par l'API du monde, pas en écrivant les deux cartes : c'est elle qui
    // refait l'index des monuments touchés (v292). Un journal installé à la
    // main laisserait le worker dessiner un monument qu'un enfant a creusé.
    monde.hd = m.hd || 0;
    monde.installerEdits(m.edits, m.temps, m.ctx || 'local');
    return;
  }
  if (m.type === 'bloc') {
    // Un bloc posé ou retiré : dans le journal, et dans le morceau s'il est là.
    monde.edits.set(`${m.x},${m.y},${m.z}`, m.id);
    monde.noterMonumentTouche(m.x, m.z);
    const cx = Math.floor(m.x / CHUNK), cz = Math.floor(m.z / CHUNK);
    const cle = World.key(cx, cz);
    const data = monde.chunks.get(cle);
    if (data) {
      data[World.index(m.x - cx * CHUNK, m.y, m.z - cz * CHUNK)] = m.id;
      monde.tops.delete(cle);
    }
    return;
  }
  if (m.type === 'mailler') {
    for (const { cx, cz, detail } of m.liste) {
      // CE QUE COÛTE UN MORCEAU, MESURÉ LÀ OÙ IL SE PAIE (v284). Le fil
      // principal ne peut pas le savoir : il reçoit des tampons déjà prêts. Et
      // c'est ce coût-là qui dit ce que l'APPAREIL peut porter — combien de
      // monde peut exister devant l'enfant. Ce n'est PAS la file adaptative de
      // la v265, écrite puis retirée après mesure : on ne suit pas le coût de
      // chaque morceau au fil du jeu, on mesure une fois la vitesse de la
      // machine et l'on en déduit un palier qui ne bouge plus.
      const t0 = performance.now();
      const data = monde.ensureChunk(cx, cz);
      // ON FABRIQUE CE QU'ON MONTRE (v296) : le fil principal dit, morceau
      // par morceau, s'il veut les façades détaillées — à portée de RAYON_HD
      // seulement. Un message sans le drapeau (ancien format) reçoit tout.
      const t = buildChunkTampons(monde, cx, cz, { detail: detail !== false });
      const ms = performance.now() - t0;
      // Le fil principal garde les BLOCS pour les collisions et les sondes de
      // sol : on lui en donne une copie, transférée, pas recopiée.
      const copie = data.slice();
      const transfert = [copie.buffer];
      for (const g of [t.solid, t.water, t.lumineux, t.plat, t.platLumineux, t.sol, t.facades]) {
        if (!g) continue;
        transfert.push(g.positions.buffer, g.normals.buffer, g.uvs.buffer, g.colors.buffer, g.tiles.buffer, g.indices.buffer);
        if (g.matiere) transfert.push(g.matiere.buffer, g.lueur.buffer);
      }
      self.postMessage({ type: 'morceau', cx, cz, generation: m.generation, data: copie, ms,
        top: monde.chunkTop(cx, cz), solid: t.solid, water: t.water, lumineux: t.lumineux, props: t.props,
        sol: t.sol, facades: t.facades, plat: t.plat, platLumineux: t.platLumineux, hd: t.hd, detail: t.detail }, transfert);
    }
    // et l'on oublie ce qu'on a dépassé, comme le fil principal (v236)
    monde.oublierLoinDe(m.pcx, m.pcz, m.rayon);
  }
};
self.postMessage({ type: 'pret' });
