// LES PASSAGES PIÉTONS DE PARIS, MESURÉS SUR TOUT LE DISQUE (vNEXT).
//
// Max : « sur certaines rues, le passage piéton ne couvre pas toute la
// chaussée, il s'arrête parfois à la moitié de la route ». Cette sonde relit
// la RÈGLE, colonne par colonne sur le disque entier : `marquageParis` dit où
// une bande de passage est voulue, `solParis` dit ce que la ville pose là. Un
// passage est entier si toutes ses colonnes sont de la chaussée ; coupé sinon
// — c'est exactement ce que l'enfant voit, puisque le mailleur ne dessine une
// bande que sur un bloc de chaussée (`marquageHD`, mesher.js) : la partie qui
// tombe ailleurs n'existe pas, et le passage s'arrête au milieu de la rue.
//
// Les passages se groupent par connexité (huit voisins — une bande en biais
// se casse en marches diagonales à quatre —, même sens de
// rayures, même nature) ; un passage d'avenue (`m.avenue`, au débouché d'une
// rue de trame sur une avenue nommée) est entier s'il va d'un bord de la
// chaussée de l'avenue à l'autre, mesuré par la distance signée de ses
// colonnes à l'axe de l'avenue (`voieEn`).
//
// Lue par `plafond.js` ; en ligne de commande :
//   node tests/sonde-passages-paris.mjs [chemin de src] [rayon]
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export async function mesurer(src = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../src'), rayon = null) {
  const base = /^file:/.test(src) ? src : pathToFileURL(path.resolve(src)).href;
  const P = await import(base + '/paris.js');
  const V = await import(base + '/voies.js');
  const { ARCHI } = await import(base + '/blocks.js');
  const t0 = Date.now();
  const C = P.PARIS, r = rayon || C.r;
  // les bandes du jeu quand il les publie ; sur l'ancien code, les voies nommées seules
  const BANDES = P.BANDES_PARIS || V.rangerVoies(P.VOIES_PARIS);
  const cle = (x, z) => `${x},${z}`;
  const cols = new Map();
  let colonnes = 0;
  for (let z = C.z - r; z <= C.z + r; z++) for (let x = C.x - r; x <= C.x + r; x++) {
    if ((x - C.x) ** 2 + (z - C.z) ** 2 > r * r) continue;
    colonnes++;
    const m = P.marquageParis(x, z);
    if (!m || m.type !== 'passage') continue;
    cols.set(cle(x, z), { x, z, long: m.long, avenue: !!m.avenue, sol: P.solParis(x, z) });
  }
  // les composantes connexes
  const vus = new Set(), passages = [];
  for (const [k, c0] of cols) {
    if (vus.has(k)) continue;
    const pile = [c0], comp = []; vus.add(k);
    while (pile.length) {
      const c = pile.pop(); comp.push(c);
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const k2 = cle(c.x + dx, c.z + dz), v = cols.get(k2);
        if (v && !vus.has(k2) && v.long === c.long && v.avenue === c.avenue) { vus.add(k2); pile.push(v); }
      }
    }
    passages.push(comp);
  }
  const trame = { n: 0, coupes: 0, colonnesHorsChaussee: 0, exemples: [] };
  const avenues = { n: 0, entiers: 0, courts: 0, horsChaussee: 0, sansRue: 0, exemples: [], exemplesSansRue: [] };
  for (const comp of passages) {
    const hors = comp.filter((c) => c.sol !== ARCHI.PAVE).length;
    const c0 = comp[0];
    if (!c0.avenue) {
      trame.n++;
      if (hors) { trame.coupes++; trame.colonnesHorsChaussee += hors; if (trame.exemples.length < 5) trame.exemples.push([c0.x, c0.z, `${hors}/${comp.length}`]); }
      continue;
    }
    avenues.n++;
    if (hors) { avenues.horsChaussee++; if (avenues.exemples.length < 5) avenues.exemples.push([c0.x, c0.z, 'hors chaussée', `${hors}/${comp.length}`]); continue; }
    // d'un bord de l'avenue à l'autre : la distance signée à l'axe couvre [−l + 1, l − 1]
    const mx = comp.reduce((s, c) => s + c.x, 0) / comp.length, mz = comp.reduce((s, c) => s + c.z, 0) / comp.length;
    const voie = V.voieEn(BANDES, mx - C.x, mz - C.z);
    if (!voie) { avenues.courts++; if (avenues.exemples.length < 5) avenues.exemples.push([c0.x, c0.z, 'sans avenue']); continue; }
    const { seg } = voie;
    let dMin = Infinity, dMax = -Infinity;
    for (const c of comp) {
      const u = c.x - C.x, v = c.z - C.z;
      const d = (u - seg.u0) * (-voie.dv) + (v - seg.v0) * voie.du;
      dMin = Math.min(dMin, d); dMax = Math.max(dMax, d);
    }
    if (dMin <= -(seg.l - 1) && dMax >= seg.l - 1) avenues.entiers++;
    else { avenues.courts++; if (avenues.exemples.length < 5) avenues.exemples.push([c0.x, c0.z, 'court', `${dMin.toFixed(1)}…${dMax.toFixed(1)} pour ±${seg.l}`]); continue; }
    // et il mène à une rue : au-delà du trottoir de l'avenue, d'un côté au moins,
    // la trame pose de la chaussée (sinon c'est un passage vers un jardin ou un socle)
    const au = Math.round(mx - C.x), av = Math.round(mz - C.z), d0 = seg.l + seg.t + 1.5;
    const rue = (k) => P.solParis(C.x + Math.round(au + (-voie.dv) * d0 * k), C.z + Math.round(av + voie.du * d0 * k)) === ARCHI.PAVE;
    if (!rue(1) && !rue(-1)) { avenues.sansRue++; if (avenues.exemplesSansRue.length < 5) avenues.exemplesSansRue.push([c0.x, c0.z]); }
  }
  return { colonnes, passages: passages.length, trame, avenues, secondes: +((Date.now() - t0) / 1000).toFixed(1) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname)) {
  const res = await mesurer(process.argv[2] || undefined, process.argv[3] ? +process.argv[3] : null);
  console.log(JSON.stringify(res));
}
