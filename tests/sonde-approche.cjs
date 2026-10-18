// Sonde de l'approche assistée (v452) — sous node, sans navigateur :
//   node tests/sonde-approche.cjs src
// Rejoue guiderApproche (src/approche.js) sur chaque piste du monde, trois
// appareils, quatre départs, et dit où l'avion touche et s'arrête.
// `mesurer(src, { piste, k, dep })` est lue par `monte.js` (v480) : un témoin
// rejoue les cas qui comptent avec la même règle de contact que la sonde.
async function mesurer(SRCarg, filtre = {}, bavard = false) {
// Simule l'approche assistée sous node, pour chaque piste du monde, depuis
// plusieurs départs : l'avion se pose-t-il sur la piste, à quelle vitesse
// verticale, et où s'arrête-t-il ?
const SRC = require("path").resolve(SRCarg);
const { World } = await import(require('url').pathToFileURL(SRC + '/world.js').href);
const Ap = await import(require('url').pathToFileURL(SRC + '/approche.js').href);
// `node tests/sonde-approche.cjs src <piste> <appareil> <départ>` rejoue UN
// essai dans un monde neuf (et imprime sa fin de trajectoire) : c'est ce qui
// sépare « l'approche est fausse » de « le monde déjà engendré change le sol
// que l'approche lit ».
const { piste: SEUL_PISTE, k: SEUL_K, dep: SEUL_DEP } = filtre;
const w = new World();
const FICHES = { avionligne: { max: 95, poussee: 18, decrochage: 30, virage: 0.55, rotation: 42, approche: 45, frein: 30 },
  concorde: { max: 120, poussee: 34, decrochage: 55, virage: 0.40, rotation: 62, approche: 62, frein: 45 },
  chasseur: { max: 120, poussee: 90, decrochage: 40, virage: 1.30, rotation: 48, approche: 50, frein: 60 } };
const solA = (x, z) => w.sommetColonne(Math.floor(x), Math.floor(z));
const angle = Ap.angle;
const resultats = [];
const pistes = Ap.pistesDuMonde();
for (const [k, f] of Object.entries(FICHES)) {
  if (SEUL_K && k !== SEUL_K) continue;
  for (const p of pistes) {
    if (SEUL_PISTE && p.cle !== SEUL_PISTE) continue;
    if (k !== 'chasseur' && p.cle.startsWith('bas-')) continue;
    for (const dep of [[0, 900, 0], [700, -600, 1.2], [-900, 0, 2.5], [1500, 1500, -2]]) {
      if (SEUL_DEP && dep.join('/') !== SEUL_DEP.replace('/vise', '')) continue;
      const trace = [];
      const pos = { x: (p.x0 + p.x1) / 2 + dep[0], y: p.sol + 80, z: p.z + dep[1] };
      pos.y = Math.max(pos.y, solA(pos.x, pos.z) + 40);
      let yaw = dep[2], v = f.max * 0.9;
      // LE CHOIX EST CELUI DU JEU (v502) : la piste qu'on vise, devant le nez
      // (`pisteVisee`), et la plus proche seulement s'il n'y en a aucune. Un
      // départ dont le nez pointe vers un autre aérodrome se rejoue cap sur
      // CETTE piste (`dep` suivi de `/vise`) : chaque piste reste éprouvée.
      const choisir = (y) => (Ap.pisteVisee ? Ap.pisteVisee(pos.x, pos.z, y, f) : Ap.pisteLaPlusProche(pos.x, pos.z, y, Ap.PORTEE_PISTE, f));
      let choix = choisir(yaw), tag = dep.join('/');
      if (choix && choix.piste !== p && Ap.pisteVisee) {
        yaw = Math.atan2(-((p.x0 + p.x1) / 2 - pos.x), -(p.z - pos.z));
        choix = choisir(yaw); tag += '/vise';
      }
      if (!choix || choix.piste !== p) continue;
      const ap = { piste: choix.piste, sens: choix.sens, seuil: choix.seuil, phase: 'ralliement' };
      const dt = 1 / 20;
      let finale = p, t = 0, issue = null, vyTouche = 0, sTouche = 0, latTouche = 0;
      let vy = 0;
      while (t < 200) {
        const g = Ap.guiderApproche(ap, pos, yaw, v, f, solA, { dt }, (x, y, z) => w.isSolid(Math.floor(x), y, Math.floor(z)));
        const e = angle(g.capVise - yaw);
        yaw += Math.sign(e) * Math.min(Math.abs(e), f.virage * dt);
        v += Math.sign(g.vitesse - v) * Math.min(Math.abs(g.vitesse - v), f.poussee * dt);
        vy = g.vy;
        pos.x += -Math.sin(yaw) * v * dt; pos.z += -Math.cos(yaw) * v * dt; pos.y += vy * dt;
        // CE QUI ARRÊTE L'AVION EST DANS SA BOÎTE, PAS AU SOMMET DE LA COLONNE
        // (v480) : une couronne flottante au-dessus d'une piste a son sommet
        // à dix blocs, et l'on vole dessous. Le sol, c'est le premier bloc
        // plein SOUS l'avion ; un heurt, un bloc plein dans sa hauteur
        // (celle du joueur, 1,8 — `sweepAxis` de player.js).
        const bx = Math.floor(pos.x), bz = Math.floor(pos.z);
        // un bloc dont le dessus reste sous les roues + 0,6 est le sol (la
        // marche que l'avion franchit), au-dessus c'est un heurt.
        let heurt = false;
        for (let y = Math.floor(pos.y - 1); y <= Math.floor(pos.y + 1.8); y++) if (w.isSolid(bx, y, bz) && y + 1 > pos.y + 0.6) heurt = true;
        let sb = Math.min(Math.floor(pos.y - 0.4), solA(pos.x, pos.z));
        while (sb > 0 && !w.isSolid(bx, sb, bz)) sb--;
        const sol = heurt ? Infinity : sb + 1;
        if (bavard) trace.push([+t.toFixed(2), g.phase, Math.round(g.s), Math.round(g.lat), +angle(yaw - Ap.capDuSens(ap.sens)).toFixed(2), ap.loin ? 'L' : '-', +pos.y.toFixed(1), heurt ? 'heurt' : sol, +vy.toFixed(1), +v.toFixed(0)]);
        if (pos.y <= sol) {
          const r = Ap.repereDePiste(ap, pos.x, pos.z);
          vyTouche = vy; sTouche = r.s; latTouche = r.lat;
          const q = ap.piste; const surPiste = Math.abs(pos.z - q.z) <= q.demi && pos.x >= q.x0 && pos.x <= q.x1; finale = q;
          issue = heurt ? 'heurt' : surPiste ? 'piste' : 'hors';
          break;
        }
        t += dt;
      }
      // freinage : approche²/(2 frein) depuis le toucher
      const arret = sTouche + v * v / (2 * f.frein);
      const longueur = finale.x1 - finale.x0; const arretOk = (ap.sens > 0 ? finale.x0 + arret <= finale.x1 : finale.x1 - arret >= finale.x0);
      if (bavard) for (const l of trace.slice(-(+process.env.TRACE || 30))) console.log(JSON.stringify(l));
      resultats.push({ arretOk, change: finale.cle + finale.z, tours: ap.tours || 0, k, cle: p.cle, z: p.z, dep: tag, devant: !!choix.devant, issue: issue || 'temps', t: +t.toFixed(1), vy: +vyTouche.toFixed(1),
        sTouche: Math.round(sTouche), lat: +latTouche.toFixed(1), arret: Math.round(arret), longueur });
    }
  }
}
const mal = resultats.filter((r) => r.issue !== 'piste' || !r.arretOk || r.vy < -3);
if (!bavard) return { resultats, mal };
console.log('essais', resultats.length, 'en faute', mal.length);
for (const r of mal.slice(0, 30)) console.log(JSON.stringify(r));
const bons = resultats.filter((r) => r.issue === 'piste');
console.log('toucher s min/max', Math.min(...bons.map((r) => r.sTouche)), Math.max(...bons.map((r) => r.sTouche)), 'arrêt max', Math.max(...bons.map((r) => r.arret)), 'vy min', Math.min(...bons.map((r) => r.vy)), 't max', Math.max(...bons.map((r) => r.t)));
for (const k of Object.keys(FICHES)) {
  const b = resultats.filter((r) => r.k === k && r.issue === 'piste' && !r.tours);
  console.log(k, 'toucher s', Math.min(...b.map((r) => r.sTouche)), '…', Math.max(...b.map((r) => r.sTouche)), 'n', b.length, 'remises', resultats.filter((r) => r.k === k && r.tours).length);
}
return { resultats, mal };
}
module.exports = { mesurer };
if (require.main === module) {
  const [, , src = 'src', piste, k, dep] = process.argv;
  mesurer(src, { piste, k, dep }, true);
}
