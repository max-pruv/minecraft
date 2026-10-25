// UNE VOITURE NE CHANGE PAS DE MODÈLE QUAND ON SE RETOURNE (v545).
//
// Max : « on tourne la tête une seconde, on revient, et c'est un autre
// modèle ». La sonde reproduit le geste : dans une ville qui roule, on relève
// toutes les voitures de la rue en vue — leur NOM de place (`clé#rang`, v305),
// leur modèle de la flotte, leur laque, et l'objet qui les dessine —, on
// tourne le regard d'un demi-tour une à trois secondes, on revient, et l'on
// compare. Elle dit, pour chaque changement, QUEL mécanisme l'a produit :
//
//   - refaite   : même place, objet neuf (rendue puis refabriquée) ;
//   - modele    : même place, autre fichier de la flotte ;
//   - laque     : même place, autre teinte ;
//   - coque     : même place, la coque d'attente puis le modèle (ou l'inverse) ;
//   - relais    : à l'endroit où l'on regardait une voiture, une AUTRE place
//                 (autre convoi ou autre rang) avec un autre modèle.
//
// Lue par `monte.js` (`mesurer`), et jouable seule :
//   node tests/sonde-voitures-persistantes.cjs            (Paris et Rome)
//   VILLES=paris node tests/sonde-voitures-persistantes.cjs
const { Banc, souffler } = require('./banc.js');

// Ce qui se relève dans la page, à chaque échantillon : toutes les voitures de
// la rue visibles, rattachées à leur place par le crochet de la page.
function releverDansLaPage() {
  const g = window.__game, V = window.__vehicules;
  const vues = V.voituresEnVue ? V.voituresEnVue() : null;
  if (vues) return { vues, crochet: true, x: g.player.pos.x, z: g.player.pos.z };
  // Ancien code : pas de crochet. On rattache chaque groupe visible à sa place
  // par la position que `etat()` publie (au dixième de bloc).
  const parPos = new Map();
  for (const c of V.etat()) for (const p of c.places) parPos.set(`${p[0]},${p[1]}`, `${c.cle}#${p[3]}`);
  const out = [];
  for (const o of g.scene.children) {
    if (!o.visible || !o.userData || o.userData.flotte === undefined || !o.userData.membres && !o.userData.roues) continue;
    const k = `${Math.round(o.position.x * 10) / 10},${Math.round(o.position.z * 10) / 10}`;
    const nom = parPos.get(k);
    if (!nom) continue;
    if (!o.userData.__id) o.userData.__id = (window.__idVoiture = (window.__idVoiture || 0) + 1);
    out.push({ nom, id: o.userData.__id, flotte: o.userData.flotte,
      laque: o.userData.peinture ?? null, modele: !!(o.userData.roues && o.userData.roues.length),
      x: o.position.x, z: o.position.z });
  }
  return { vues: out, crochet: false, x: g.player.pos.x, z: g.player.pos.z };
}

// Compare deux relevés : ce qui a changé pour une même place, et ce qui a pris
// la place d'une voiture qu'on regardait.
function comparer(avant, apres) {
  const parNom = new Map(apres.vues.map((v) => [v.nom, v]));
  const ev = { refaite: 0, modele: 0, laque: 0, coque: 0, relais: 0, suivies: 0, exemples: [] };
  for (const a of avant.vues) {
    const b = parNom.get(a.nom);
    if (b) {
      ev.suivies++;
      if (b.flotte !== a.flotte) { ev.modele++; ev.exemples.push(`${a.nom} ${a.flotte} → ${b.flotte}`); }
      if (b.laque !== a.laque) { ev.laque++; ev.exemples.push(`${a.nom} laque ${a.laque} → ${b.laque}`); }
      if (b.id !== a.id) ev.refaite++;
      if (b.modele !== a.modele) ev.coque++;
    }
  }
  return ev;
}

async function mesurer(page, villes = ['paris', 'rome'], { tours = 6 } = {}) {
  const res = {};
  for (const ville of villes) {
    // on se pose au-dessus d'une rue qui roule, dans la ville
    const pose = await page.evaluate(async (ville) => {
      const m = await import('./src/mondes.js'); const P = m.positionDe(ville); const g = window.__game;
      g.player.pos.set(P.x + 4, 70, P.z + 4); g.player.vel.set(0, 0, 0); g.player.flying = true;
      return { x: P.x, z: P.z };
    }, ville);
    // attendre que la circulation naisse et que des voitures soient en vue
    const t0 = Date.now();
    let cible = null;
    while (Date.now() - t0 < 90000) {
      await new Promise((f) => setTimeout(f, 1500));
      cible = await page.evaluate(() => {
        const g = window.__game, V = window.__vehicules;
        const tous = V.etat().filter((c) => c.routier && c.places.length && c.cle);
        let best = null;
        for (const c of tous) for (const p of c.places) {
          const d = Math.hypot(p[0] - g.player.pos.x, p[1] - g.player.pos.z);
          if (!best || d < best.d) best = { d, x: p[0], z: p[1] };
        }
        return best;
      });
      if (cible) break;
    }
    if (!cible) { res[ville] = { erreur: 'aucune voiture en vue', pose }; continue; }
    // on se met à six blocs au-dessus de cette voiture, regard horizontal
    await page.evaluate((c) => { const g = window.__game; g.player.pos.set(c.x, g.player.pos.y > 0 ? 0 : 0, c.z); }, cible);
    await page.evaluate(async (c) => {
      const g = window.__game;
      const w = g.world; let y = 40;
      if (w && w.sommetColonne) { try { y = w.sommetColonne(Math.floor(c.x) + 7, Math.floor(c.z)) + 6; } catch { /* */ } }
      g.player.pos.set(c.x + 7, Math.max(y, 40), c.z); g.player.vel.set(0, 0, 0); g.player.flying = true;
    }, cible);
    await new Promise((f) => setTimeout(f, 3000));
    const total = { refaite: 0, modele: 0, laque: 0, coque: 0, suivies: 0, exemples: [], tours: 0, crochet: null };
    for (let k = 0; k < tours; k++) {
      const yaw0 = await page.evaluate(() => window.__game.player.yaw);
      const avant = await page.evaluate(releverDansLaPage);
      // demi-tour, une à trois secondes, puis retour
      await page.evaluate((y) => { window.__game.player.yaw = y + Math.PI; }, yaw0);
      await new Promise((f) => setTimeout(f, 1000 + (k % 3) * 1000));
      await page.evaluate((y) => { window.__game.player.yaw = y; }, yaw0);
      await new Promise((f) => setTimeout(f, 400));
      const apres = await page.evaluate(releverDansLaPage);
      const ev = comparer(avant, apres);
      total.tours++; total.crochet = avant.crochet;
      for (const c of ['refaite', 'modele', 'laque', 'coque', 'suivies']) total[c] += ev[c];
      total.exemples.push(...ev.exemples.slice(0, 3));
      // le regard tourne, mais la position aussi parfois : on reste en place
    }
    total.exemples = total.exemples.slice(0, 8);
    res[ville] = total;
  }
  return res;
}

// LA COQUE D'ATTENTE. Une voiture de la rue naît en coque sculptée et ne
// prend son modèle de la flotte qu'à l'arrivée du fichier : pendant ce temps,
// l'enfant voit une AUTRE voiture. On compte, image par image, les voitures
// vues en coque PUIS en modèle (« bascules »), combien de temps la coque est
// restée à l'écran, et à quelle distance de l'enfant. On traverse la ville au
// pas d'une voiture, en temps réel : c'est là que les places se fabriquent.
async function mesurerAttente(page, ville, { duree = 30000, vitesse = 14 } = {}) {
  await page.evaluate(async ({ ville, vitesse }) => {
    const m = await import('./src/mondes.js'); const P = m.positionDe(ville); const g = window.__game;
    g.player.pos.set(P.x - 60, 60, P.z); g.player.vel.set(0, 0, 0); g.player.flying = true; g.player.yaw = -Math.PI / 2;
    const vus = new Map();
    const t0 = performance.now(); let tPrec = t0;
    window.__attente = { vus, bascules: [], coqueImages: 0, images: 0, fin: false, attentes: new Map() };
    const pas = () => {
      const A = window.__attente; if (A.fin) return;
      const t = performance.now();
      g.player.pos.x += vitesse * (t - tPrec) / 1000; tPrec = t;
      A.images++;
      for (const o of g.scene.children) {
        if (!o.userData || o.userData.flotte === undefined || !(o.userData.membres || o.userData.roues)) continue;
        if (!o.userData.__id) o.userData.__id = (window.__idVoiture = (window.__idVoiture || 0) + 1);
        const modele = !!(o.userData.roues && o.userData.roues.length);
        // cachée en attendant son modèle (v545) : combien de temps, et si près
        if (o.userData.attente) {
          const dA = Math.hypot(o.position.x - g.player.pos.x, o.position.z - g.player.pos.z);
          let a = A.attentes.get(o.userData.__id);
          if (!a) { a = { t0: t, dMin: dA }; A.attentes.set(o.userData.__id, a); }
          a.t1 = t; if (dA < a.dMin) a.dMin = dA;
        }
        if (!o.visible) continue;
        const d = Math.hypot(o.position.x - g.player.pos.x, o.position.z - g.player.pos.z);
        let e = vus.get(o.userData.__id);
        if (!e) { e = { coque: null, modele: null }; vus.set(o.userData.__id, e); }
        if (!modele) { A.coqueImages++; if (e.coque === null) e.coque = { t, d }; }
        else if (e.modele === null) {
          e.modele = { t, d };
          if (e.coque) A.bascules.push({ ms: Math.round(t - e.coque.t), d: Math.round(e.coque.d), flotte: o.userData.flotte });
        }
      }
      requestAnimationFrame(pas);
    };
    requestAnimationFrame(pas);
  }, { ville, vitesse });
  await new Promise((f) => setTimeout(f, duree));
  return page.evaluate(() => {
    const A = window.__attente; A.fin = true;
    const ms = A.bascules.map((b) => b.ms).sort((a, b) => a - b);
    return { voitures: A.vus.size, bascules: A.bascules.length, coqueImages: A.coqueImages, images: A.images,
      msMediane: ms.length ? ms[ms.length >> 1] : 0, msPire: ms.length ? ms[ms.length - 1] : 0,
      pres: A.bascules.filter((b) => b.d < 30).length, exemples: A.bascules.slice(0, 4),
      cachees: A.attentes.size,
      cacheesMsPire: Math.round(Math.max(0, ...[...A.attentes.values()].map((a) => a.t1 - a.t0))),
      cacheesPres: [...A.attentes.values()].filter((a) => a.dMin < 18).length };
  });
}

module.exports = { mesurer, mesurerAttente, releverDansLaPage, comparer };

if (require.main === module) {
  (async () => {
    const banc = new Banc({ portJeu: 8397, portPairs: 9397 });
    await banc.ouvrir();
    try {
      await souffler();
      const page = await banc.jouerSeul('SondePersist', { rr: 4 });
      const villes = (process.env.VILLES || 'paris,rome').split(',');
      if (process.env.ATTENTE !== '0') for (const v of villes) console.log('attente', v, JSON.stringify(await mesurerAttente(page, v)));
      if (process.env.REGARD !== '0') console.log(JSON.stringify(await mesurer(page, villes), null, 1));
      await page.close();
    } finally { await banc.fermer(); }
    process.exit(0);
  })().catch((e) => { console.error('💥 SONDE PLANTÉE :', e); process.exit(2); });
}
