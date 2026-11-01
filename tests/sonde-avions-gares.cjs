// UN AVION GARÉ EST UN OBSTACLE (v577) — isolée : aucune suite ne l'importe.
//     cd tests && node sonde-avions-gares.cjs [chemin/vers/src]
// 1. En page, on mesure la silhouette au sol (`emprise-avion.js`) des six
//    modèles d'avion — sculptés et déposés — et on l'écrit dans /tmp.
// 2. Sous node, on rejoue ✈️ depuis chaque poste de chaque aérodrome avec le
//    vrai joueur (la sonde de la v530), l'appareil de la rangée posé tout
//    autour comme le fait l'aéroportiste, et l'on compte :
//      · combien de départs ont fait entrer l'aile dans un voisin garé ;
//      · combien de départs sont encore partis (décollés).
// Lancée sur un arbre où le crochet `obstacleAvion` (player.js) n'existe pas, la seconde
// étape mesure le défaut (le joueur traverse) ; sur la branche, le remède.
const path = require('path');
const fs = require('fs');
const { pathToFileURL } = require('url');
const { register } = require('node:module');
const SRC = path.resolve(process.argv[2] || path.resolve(__dirname, '../src'));
const TABLE = '/tmp/emprises-avions.json';

// Les silhouettes, mesurées dans une page du jeu : le sculpté de chaque
// espèce, et chaque variante déposée (fichier attendu). Une variante dont le
// fichier n'a pas pu se charger n'est pas mesurée sous le nom d'un autre.
async function mesurerEmprises(page) {
  const r = await page.evaluate(async () => {
    const A = await import('./src/avions.js');
    const E = await import('./src/emprise-avion.js');
    if (A.chargerAvionsDeposes) await A.chargerAvionsDeposes();
    const out = {};
    const garder = (cle, g) => { const e = E.mesurerEmprise(g); out[cle] = { ...e, cases: Array.from(e.cases), points: Array.from(e.points) }; };
    garder('avionligne', A.avionDeLigneSculpte());
    garder('concorde', A.concorde());
    garder('chasseur', A.avionDeChasseSculpte());
    for (const [v, def] of Object.entries(A.AVIONS_GLB || {})) {
      const g = A.MODELES_AVION[def.espece]({ variante: v });
      if (g.userData.variante === v) garder(v, g);
    }
    return out;
  });
  for (const e of Object.values(r)) { e.cases = Uint8Array.from(e.cases); e.points = Float32Array.from(e.points); }
  return r;
}

async function mesurerEnPage() {
  const { Banc } = require('./banc.js');
  const banc = new Banc({ portJeu: 8507, portPairs: 9507 });
  await banc.ouvrir();
  try {
    const tab = await banc.jouerSeul('Emprises', { rr: 2, pret: true });
    const r = await mesurerEmprises(tab);
    fs.writeFileSync(TABLE, JSON.stringify(r, (k, v) => (v instanceof Uint8Array || v instanceof Float32Array ? Array.from(v) : v)));
    for (const [k, e] of Object.entries(r)) console.log(k, `x ${e.x0.toFixed(1)}..${e.x1.toFixed(1)} z ${e.z0.toFixed(1)}..${e.z1.toFixed(1)} cases ${e.points.length / 2}`);
  } finally { await banc.fermer().catch(() => {}); }
}

async function rejouer(src = SRC, table = null) {
  const trois = pathToFileURL(path.resolve(__dirname, '../vendor/three.module.min.js')).href;
  register('data:text/javascript,' + encodeURIComponent(`export async function resolve(s, c, n) { return s === 'three' ? { url: ${JSON.stringify(trois)}, shortCircuit: true } : n(s, c); }`));
  const U = pathToFileURL(src).href;
  const { Player } = await import(U + '/player.js');
  const W = await import(U + '/world.js');
  const { MONTURES } = await import(U + '/montures.js');
  const A = await import(U + '/aeroport.js');
  const E = await import(pathToFileURL(path.resolve(__dirname, '../src/emprise-avion.js')).href);
  let T = table;
  if (!T) {
    T = JSON.parse(fs.readFileSync(TABLE, 'utf8'));
    for (const e of Object.values(T)) { e.cases = Uint8Array.from(e.cases); e.points = Float32Array.from(e.points); }
  }
  // une variante absente de la table (fichier non chargé) prend le sculpté
  const cleDe = (q) => (q.variante && T[q.variante] ? q.variante : q.espece);
  const w = new W.World();
  const cam = { position: { copy() {} }, rotation: { set() {} } };
  let departs = 0, decolles = 0, traverses = 0, bloques = 0;
  const fautes = [], pires = [];
  for (const a of A.AEROPORTS) {
    const postes = A.postesAerodrome ? A.postesAerodrome(a) : A.postesAvion(a.profil, a.r);
    const gares = postes.map((q) => ({ q, x: a.x + q.du, z: a.z + q.dv, theta: q.cap + Math.PI, e: T[cleDe(q)] }));
    for (const [n, moi] of gares.entries()) {
      const fiche = MONTURES.find((m) => m.key === moi.q.espece);
      const p = new Player(cam, w);
      p.pilote = fiche.pilote; p.prendreGabarit(fiche.gabarit);
      const x = moi.x + 0.5, z = moi.z + 0.5;
      const y = w.sommetColonne(Math.floor(x), Math.floor(z)) + 1;
      p.pos.set(x, y + 1e-3, z); p.onGround = true;
      p.yaw = moi.q.cap + Math.PI; p.avionEtat = 'sol'; p.avionEnVol = false;
      // le crochet que main.js branche, avec les voisins de ce poste
      const voisins = gares.filter((g, k) => k !== n);
      // le crochet que main.js branche (`player.obstacleAvion`), avec les
      // voisins de ce poste : sur un arbre qui ne le lit pas, il ne sert à rien
      // et la sonde mesure le défaut ; sur la branche, il arrête l'appareil
      p.obstacleAvion = (x1, z1, yaw1, x0, z0, yaw0) => voisins.some((g) =>
        E.sEnfonceDansAvion(g.e, g.x, g.z, g.theta, E.pointsDAvion(moi.e, x0, z0, yaw0), E.pointsDAvion(moi.e, x1, z1, yaw1)));
      p.decollerOuSePoser();
      let pire = 0, t = 0, arret = 0, ancien = { x, z };
      const dans0 = voisins.map((g) => E.pointsDans(g.e, g.x, g.z, g.theta, E.pointsDAvion(moi.e, p.pos.x, p.pos.z, p.yaw)));
      for (; t < 30; t += 1 / 30) {
        p.update(1 / 30);
        if (p.avionEtat === 'vol' || p.pos.y - y > 18 || p.avionEtat === 'epave') break;
        if (p.pos.y - y < 3) {
          const pts0 = E.pointsDAvion(moi.e, p.pos.x, p.pos.z, p.yaw);
          // MARGE=m : la silhouette grossie de m blocs (chaque point essayé décalé)
          const m = Number(process.env.MARGE || 0), pts = m ? [] : pts0;
          if (m) for (let i = 0; i < pts0.length; i += 2) for (const [ox, oz] of [[0, 0], [m, 0], [-m, 0], [0, m], [0, -m]]) pts.push(pts0[i] + ox, pts0[i + 1] + oz);
          voisins.forEach((g, k) => { pire = Math.max(pire, E.pointsDans(g.e, g.x, g.z, g.theta, pts) - dans0[k]); });
        }
        const d = Math.hypot(p.pos.x - ancien.x, p.pos.z - ancien.z); ancien = { x: p.pos.x, z: p.pos.z };
        if (d < 0.02 && t > 1) { if (++arret > 45) break; } else arret = 0;
      }
      const decolle = p.avionEtat === 'vol' || p.pos.y - y > 18;
      departs++; if (decolle) decolles++; else bloques++;
      if (pire > 0) { traverses++; pires.push(pire); if (fautes.length < 12) fautes.push(`${a.cle} ${moi.q.espece}@${moi.q.du},${moi.q.dv} +${pire}`); }
      if (!decolle && fautes.length < 24) fautes.push(`${a.cle} ${moi.q.espece}@${moi.q.du},${moi.q.dv} arrêté (${p.avionEtat})`);
    }
  }
  pires.sort((u, v) => v - u);
  return { departs, decolles, bloques, traverses, pires: pires.slice(0, 20), fautes };
}
module.exports = { rejouer, mesurerEmprises };
if (require.main === module) (async () => {
  if (!fs.existsSync(TABLE) || process.env.REMESURER) await mesurerEnPage();
  const r = await rejouer();
  console.log(JSON.stringify(r, null, 1));
  process.exit(0);
})();
