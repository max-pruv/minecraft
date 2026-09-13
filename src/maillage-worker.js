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
    monde.edits = new Map(m.edits);
    monde.editTimes = new Map(m.temps || []);
    monde.ctx = m.ctx || 'local';
    monde.chunks.clear();
    monde.tops.clear();
    return;
  }
  if (m.type === 'bloc') {
    // Un bloc posé ou retiré : dans le journal, et dans le morceau s'il est là.
    monde.edits.set(`${m.x},${m.y},${m.z}`, m.id);
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
    for (const { cx, cz } of m.liste) {
      const data = monde.ensureChunk(cx, cz);
      const t = buildChunkTampons(monde, cx, cz);
      // Le fil principal garde les BLOCS pour les collisions et les sondes de
      // sol : on lui en donne une copie, transférée, pas recopiée.
      const copie = data.slice();
      const transfert = [copie.buffer];
      for (const g of [t.solid, t.water, t.lumineux]) {
        if (!g) continue;
        transfert.push(g.positions.buffer, g.normals.buffer, g.uvs.buffer, g.colors.buffer, g.tiles.buffer, g.indices.buffer);
      }
      self.postMessage({ type: 'morceau', cx, cz, generation: m.generation, data: copie,
        top: monde.chunkTop(cx, cz), solid: t.solid, water: t.water, lumineux: t.lumineux, props: t.props }, transfert);
    }
    // et l'on oublie ce qu'on a dépassé, comme le fil principal (v236)
    monde.oublierLoinDe(m.pcx, m.pcz, m.rayon);
  }
};
self.postMessage({ type: 'pret' });
